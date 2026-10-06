import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraType,
  type FlashMode,
} from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { VIDEO_KAMERA_MAX_SN } from '../../../ortak/medya/VideoPaylasimSabitleri';
import type { HikayeMedyaTuru } from '../tipler';

export type HikayeKameraCekim = {
  uri: string;
  mediaType: Exclude<HikayeMedyaTuru, 'text'>;
  durationMs?: number;
  mime?: string;
};

type Props = {
  onCekim: (cek: HikayeKameraCekim) => void;
  onGaleri: () => void;
  onGaleriVideo: () => void;
  onKapat: () => void;
};

const ZOOM_MAX = 1;
const MIN_VIDEO_MS = 500;
const HOLD_MS = 220;

function zoomEtiket(z: number): string {
  const x = 1 + z * 4;
  return `${x >= 10 ? x.toFixed(0) : x.toFixed(1)}×`;
}

function sureYazi(ms: number): string {
  const sn = Math.floor(Math.max(0, ms) / 1000);
  const d = Math.floor(sn / 60);
  const s = sn % 60;
  return `${d}:${s.toString().padStart(2, '0')}`;
}

/**
 * Hikaye kamerası — dokun: foto, basılı tut: video (iPhone tarzı süre + bırakınca önizleme).
 * CameraView sürekli mode="video" — mode geçişinde recordAsync kırılmasın.
 */
export function HikayeKameraSahne({
  onCekim,
  onGaleri,
  onGaleriVideo,
  onKapat,
}: Props) {
  const { t } = useCeviri();
  const insets = useSafeAreaInsets();
  const camRef = useRef<CameraView>(null);
  const [camIzin, camIzinIste] = useCameraPermissions();
  const [micIzin, micIzinIste] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [hazir, setHazir] = useState(false);
  const [kayit, setKayit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [sureMs, setSureMs] = useState(0);

  const kayitBaslaMs = useRef(0);
  const kaydediyorRef = useRef(false);
  const parmakBasiliRef = useRef(false);
  const zoomRef = useRef(0);
  const pinchBaslangic = useRef(0);
  zoomRef.current = zoom;

  useEffect(() => {
    if (!camIzin?.granted && camIzin?.canAskAgain !== false) {
      void camIzinIste();
    }
  }, [camIzin, camIzinIste]);

  useEffect(() => {
    if (camIzin?.granted && !micIzin?.granted && micIzin?.canAskAgain !== false) {
      void micIzinIste();
    }
  }, [camIzin?.granted, micIzin, micIzinIste]);

  useEffect(() => {
    if (!kayit) {
      setSureMs(0);
      return;
    }
    const id = setInterval(() => {
      setSureMs(Date.now() - kayitBaslaMs.current);
    }, 100);
    return () => clearInterval(id);
  }, [kayit]);

  const zoomAyarla = useCallback((v: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(0, v));
    setZoom(next);
    zoomRef.current = next;
  }, []);

  const flip = useCallback(() => {
    if (kaydediyorRef.current) return;
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
    zoomAyarla(0);
  }, [zoomAyarla]);

  const flashToggle = useCallback(() => {
    setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'));
  }, []);

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onBegin(() => {
          pinchBaslangic.current = zoomRef.current;
        })
        .onUpdate((e) => {
          const delta = Math.log2(Math.max(0.05, e.scale || 1)) * 0.5;
          zoomAyarla(pinchBaslangic.current + delta);
        }),
    [zoomAyarla],
  );

  const fotoCek = useCallback(async () => {
    if (!camRef.current || !hazir || busy || kaydediyorRef.current) return;
    setBusy(true);
    try {
      const pic = await camRef.current.takePictureAsync({
        quality: 0.82,
        skipProcessing: true,
        shutterSound: false,
      });
      if (pic?.uri) {
        onCekim({ uri: pic.uri, mediaType: 'image', mime: 'image/jpeg' });
      }
    } catch {
      /* native hata */
    } finally {
      setBusy(false);
    }
  }, [hazir, busy, onCekim]);

  const videoDurdur = useCallback(() => {
    parmakBasiliRef.current = false;
    if (!kaydediyorRef.current) return;
    try {
      camRef.current?.stopRecording();
    } catch {
      /* */
    }
  }, []);

  const videoBaslat = useCallback(async () => {
    if (!camRef.current || !hazir || kaydediyorRef.current || busy) return;
    if (!parmakBasiliRef.current) return;

    if (!micIzin?.granted) {
      try {
        await micIzinIste();
      } catch {
        /* */
      }
    }
    // İzin beklerken bırakıldıysa kayıt başlatma
    if (!parmakBasiliRef.current) return;

    kaydediyorRef.current = true;
    setKayit(true);
    kayitBaslaMs.current = Date.now();
    setSureMs(0);

    if (!parmakBasiliRef.current) {
      kaydediyorRef.current = false;
      setKayit(false);
      return;
    }

    try {
      const rec = await camRef.current.recordAsync({
        maxDuration: VIDEO_KAMERA_MAX_SN,
      });
      const durationMs = Math.max(0, Date.now() - kayitBaslaMs.current);
      if (rec?.uri && durationMs >= MIN_VIDEO_MS) {
        onCekim({
          uri: rec.uri,
          mediaType: 'video',
          durationMs,
          mime: 'video/mp4',
        });
      }
    } catch {
      /* iptal / çok kısa / native */
    } finally {
      kaydediyorRef.current = false;
      parmakBasiliRef.current = false;
      setKayit(false);
      setSureMs(0);
    }
  }, [hazir, busy, micIzin, micIzinIste, onCekim]);

  const holdBasla = useCallback(() => {
    if (!hazir || busy || kaydediyorRef.current) return;
    parmakBasiliRef.current = true;
    void videoBaslat();
  }, [hazir, busy, videoBaslat]);

  const shutterGesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(HOLD_MS)
      .onEnd(() => {
        runOnJS(fotoCek)();
      });
    const hold = Gesture.LongPress()
      .minDuration(HOLD_MS)
      .maxDistance(120)
      .onStart(() => {
        runOnJS(holdBasla)();
      })
      .onFinalize(() => {
        runOnJS(videoDurdur)();
      });
    return Gesture.Exclusive(hold, tap);
  }, [fotoCek, holdBasla, videoDurdur]);

  if (!camIzin) {
    return (
      <View style={styles.root}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!camIzin.granted) {
    return (
      <View style={[styles.root, styles.izin]}>
        <Text style={styles.izinBaslik}>{t('hikaye.kameraIzniBaslik')}</Text>
        <Text style={styles.izinAlt}>{t('hikaye.kameraIzniAlt')}</Text>
        <Pressable
          style={styles.izinBtn}
          onPress={() => {
            if (camIzin.canAskAgain === false) void Linking.openSettings();
            else void camIzinIste();
          }}
        >
          <Text style={styles.izinBtnYazi}>
            {camIzin.canAskAgain === false
              ? t('hikaye.ayarlaraGit')
              : t('hikaye.izinVer')}
          </Text>
        </Pressable>
        <Pressable onPress={onGaleri} style={styles.izinLink}>
          <Text style={styles.izinLinkYazi}>{t('hikaye.galeri')}</Text>
        </Pressable>
        <Pressable onPress={onKapat} style={styles.kapatUst}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const altPad = Math.max(insets.bottom, 16);

  return (
    <View style={styles.root}>
      <CameraView
        ref={camRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        mode="video"
        mute={false}
        zoom={zoom}
        videoQuality="720p"
        onCameraReady={() => setHazir(true)}
        onMountError={() => setHazir(false)}
      />

      {/* Pinch obturatörü örtmesin */}
      <GestureDetector gesture={pinch}>
        <View
          style={[styles.pinchKatman, { bottom: altPad + 120 }]}
          collapsable={false}
        />
      </GestureDetector>

      <View
        style={[styles.ustBar, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <Pressable onPress={onKapat} hitSlop={12} accessibilityLabel={t('ortak.kapat')}>
          <Ionicons name="close" size={30} color="#fff" />
        </Pressable>
        <Pressable onPress={flashToggle} hitSlop={12} accessibilityLabel={t('hikaye.flash')}>
          <Ionicons
            name={
              flash === 'off'
                ? 'flash-off'
                : flash === 'auto'
                  ? 'flash-outline'
                  : 'flash'
            }
            size={26}
            color="#fff"
          />
        </Pressable>
        <Pressable onPress={flip} hitSlop={12} accessibilityLabel={t('hikaye.kameraCevir')}>
          <Ionicons name="camera-reverse" size={28} color="#fff" />
        </Pressable>
      </View>

      {kayit ? (
        <View style={[styles.kayitRozet, { top: insets.top + 52 }]}>
          <View style={styles.kayitNokta} />
          <Text style={styles.kayitYazi}>{sureYazi(sureMs)}</Text>
        </View>
      ) : null}

      {zoom > 0.02 && !kayit ? (
        <Pressable
          style={[styles.zoomRozet, { top: insets.top + 56 }]}
          onPress={() => zoomAyarla(0)}
          accessibilityLabel={t('hikaye.zoomSifirla')}
        >
          <Text style={styles.zoomRozetYazi}>{zoomEtiket(zoom)}</Text>
        </Pressable>
      ) : null}

      <View style={[styles.altBar, { paddingBottom: altPad }]}>
        <Pressable style={styles.yanBtn} onPress={onGaleri} disabled={kayit}>
          <Ionicons name="images" size={26} color="#fff" />
          <Text style={styles.yanYazi}>{t('hikaye.galeri')}</Text>
        </Pressable>

        <GestureDetector gesture={shutterGesture}>
          <View
            style={[styles.obturator, kayit && styles.obturatorKayit]}
            accessibilityRole="button"
            accessibilityLabel={t('hikaye.cek')}
          >
            <View style={[styles.obturatorIc, kayit && styles.obturatorIcKayit]} />
            {kayit ? (
              <View style={styles.obturatorHalka} pointerEvents="none" />
            ) : null}
          </View>
        </GestureDetector>

        <Pressable style={styles.yanBtn} onPress={onGaleriVideo} disabled={kayit}>
          <Ionicons name="videocam" size={26} color="#fff" />
          <Text style={styles.yanYazi}>{t('hikaye.galeriVideolar')}</Text>
        </Pressable>
      </View>

      {!kayit ? (
        <Text style={[styles.ipucu, { bottom: altPad + 88 }]}>
          {t('hikaye.kameraIpucu')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  pinchKatman: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 1,
  },
  izin: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  izinBaslik: {
    ...TipografiTokenlari.h2,
    color: '#fff',
    textAlign: 'center',
  },
  izinAlt: {
    ...TipografiTokenlari.body,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  izinBtn: {
    marginTop: 8,
    backgroundColor: RenkTokenlari.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  izinBtnYazi: {
    ...TipografiTokenlari.body,
    color: '#fff',
    fontWeight: '700',
  },
  izinLink: { marginTop: 8, padding: 8 },
  izinLinkYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  kapatUst: { position: 'absolute', top: 54, left: 16 },
  ustBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    zIndex: 4,
  },
  altBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    zIndex: 5,
  },
  yanBtn: { alignItems: 'center', gap: 4, width: 72 },
  yanYazi: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  obturator: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  obturatorKayit: { borderColor: RenkTokenlari.live },
  obturatorIc: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  obturatorIcKayit: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: RenkTokenlari.live,
  },
  obturatorHalka: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: 'rgba(255,59,48,0.55)',
  },
  kayitRozet: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    zIndex: 4,
  },
  kayitNokta: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.live,
  },
  kayitYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
  },
  zoomRozet: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 4,
  },
  zoomRozetYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ipucu: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.55)',
    zIndex: 4,
  },
});
