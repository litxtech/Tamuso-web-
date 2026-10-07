import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { LiveKitBaglantiYoneticisi } from '../livekit/baglanti/LiveKitBaglantiYoneticisi';
import {
  KameraOnizlemeBirakildi,
  KameraOnizlemeTutuldu,
} from '../livekit/kamera/KameraOnizlemeKilidi';
import { canliMuzikDevam } from '../canli-yayin/bilesenler/CanliMuzikDinle';
import { KESIT_MAX_SANIYE, kesitSaniyeNormalize } from './canliKesitDogrulama';

export type KesitKameraDosya = {
  uri: string;
  mime: string;
  bayt: number;
  width: number;
  height: number;
  saniye: number;
};

export type KesitKameraTutu = {
  durdur: () => void;
};

let sahip = 0;

function kamerayiYayinaGeriVer() {
  const bekle = Platform.OS === 'android' ? 700 : 450;
  setTimeout(() => {
    KameraOnizlemeBirakildi();
    void (async () => {
      let ok = await LiveKitBaglantiYoneticisi.kameraAcVeBekle(8_000);
      if (!ok) {
        await new Promise((r) => setTimeout(r, 600));
        ok = await LiveKitBaglantiYoneticisi.kameraAcVeBekle(6_000);
      }
      canliMuzikDevam();
    })();
  }, bekle);
}

/** Kayıt açılmadan hata olursa yayını geri açar. Ses oturumuna dokunmaz. */
export function kesitKamerayiGeriVer(): void {
  kamerayiYayinaGeriVer();
}

type Props = {
  onBasladi?: () => void;
  onDone: (dosya: KesitKameraDosya) => void;
  onError: () => void;
};

/**
 * Yayındaki kamerayı kısa süre devralır. Mikrofonu açmaz; oda müziği çalmaya devam eder.
 * Kayıt kullanıcı durdurana kadar sürer, en fazla 30 sn. Bırakınca kamera yayına döner.
 */
export const CanliKesitKamera = forwardRef<KesitKameraTutu, Props>(function CanliKesitKamera(
  { onBasladi, onDone, onError },
  ref,
) {
  const cam = useRef<CameraView>(null);
  const bitti = useRef(false);
  const baslangic = useRef(0);
  const hazirZaman = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBasladiRef = useRef(onBasladi);
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  onBasladiRef.current = onBasladi;
  onDoneRef.current = onDone;
  onErrorRef.current = onError;
  const [, izinIste] = useCameraPermissions();
  const izinIsteRef = useRef(izinIste);
  izinIsteRef.current = izinIste;
  const [acik, setAcik] = useState(false);
  const facing =
    LiveKitBaglantiYoneticisi.kameraFacingAl() === 'environment' ? 'back' : 'front';

  useImperativeHandle(ref, () => ({
    durdur() {
      try {
        cam.current?.stopRecording();
      } catch {
        /* kayıt henüz başlamamış olabilir */
      }
    },
  }));

  useEffect(() => {
    const ben = ++sahip;
    let iptal = false;
    let zamanlayici: ReturnType<typeof setTimeout> | null = null;
    hazirZaman.current = null;
    const lp = LiveKitBaglantiYoneticisi.oda()?.localParticipant;
    void (async () => {
      try {
        await lp?.setCameraEnabled(false);
      } catch {
        /* kamera zaten kapalı olabilir */
      }
      await new Promise((r) => setTimeout(r, Platform.OS === 'android' ? 420 : 360));
      if (iptal) return;
      const mevcut = await izinIsteRef.current();
      if (iptal) return;
      if (!mevcut.granted) {
        bitti.current = true;
        onErrorRef.current();
        return;
      }
      KameraOnizlemeTutuldu();
      setAcik(true);
      hazirZaman.current = zamanlayici = setTimeout(() => {
        if (bitti.current) return;
        bitti.current = true;
        try {
          cam.current?.stopRecording();
        } catch {
          /* henüz başlamamış olabilir */
        }
        onErrorRef.current();
      }, 8_000);
    })();
    return () => {
      iptal = true;
      if (zamanlayici) clearTimeout(zamanlayici);
      if (hazirZaman.current) {
        clearTimeout(hazirZaman.current);
        hazirZaman.current = null;
      }
      bitti.current = true;
      try {
        cam.current?.stopRecording();
      } catch {
        /* kayıt bitmiş olabilir */
      }
      if (ben !== sahip) return;
      kamerayiYayinaGeriVer();
    };
  }, []);

  async function kaydet() {
    const view = cam.current;
    if (!view || bitti.current) return;
    if (hazirZaman.current) {
      clearTimeout(hazirZaman.current);
      hazirZaman.current = null;
    }
    try {
      baslangic.current = Date.now();
      onBasladiRef.current?.();
      setTimeout(() => canliMuzikDevam(), 280);
      const cek = (codec: boolean) =>
        view.recordAsync(
          codec && Platform.OS === 'ios'
            ? { maxDuration: KESIT_MAX_SANIYE, codec: 'avc1' }
            : { maxDuration: KESIT_MAX_SANIYE },
        );
      let sonuc: { uri: string } | undefined;
      try {
        sonuc = await cek(true);
      } catch {
        await new Promise((r) => setTimeout(r, 450));
        if (bitti.current) return;
        baslangic.current = Date.now();
        sonuc = await cek(false);
      }
      if (bitti.current) return;
      const uri = sonuc?.uri;
      if (!uri) {
        bitti.current = true;
        onErrorRef.current();
        return;
      }
      const bilgi = await FileSystem.getInfoAsync(uri);
      const bayt = bilgi.exists && 'size' in bilgi ? Number(bilgi.size) || 0 : 0;
      const saniye = kesitSaniyeNormalize((Date.now() - baslangic.current) / 1000);
      bitti.current = true;
      onDoneRef.current({
        uri,
        mime: 'video/mp4',
        bayt,
        width: 720,
        height: 1280,
        saniye,
      });
    } catch {
      if (bitti.current) return;
      bitti.current = true;
      onErrorRef.current();
    }
  }

  if (!acik) return <View style={styles.cam} />;

  return (
    <CameraView
      ref={cam}
      style={styles.cam}
      facing={facing}
      mode="video"
      mute
      videoQuality="720p"
      videoBitrate={1_400_000}
      animateShutter={false}
      mirror={facing === 'front'}
      onCameraReady={() => {
        void kaydet();
      }}
    />
  );
});

const styles = StyleSheet.create({
  cam: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
});
