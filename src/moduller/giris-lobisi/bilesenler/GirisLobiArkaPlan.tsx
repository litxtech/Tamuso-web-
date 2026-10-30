/**
 * Giriş lobisi arka plan — uzaktan video/resim veya modern gradient.
 * Build gerekmez; admin yüklemesi anında URL ile oynar.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import type { GirisLobisiMedya } from '../tipler';

const KLIP_SURESI_MS = 28_000;
const { width: W, height: H } = Dimensions.get('window');

type Props = {
  medya: GirisLobisiMedya[];
  aktif?: boolean;
};

function ModernArkaPlan() {
  return (
    <LinearGradient
      colors={[...RenkTokenlari.gradientNight]}
      locations={[0, 0.55, 1]}
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient
        colors={['rgba(232,64,145,0.18)', 'transparent', 'rgba(139,92,246,0.14)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
    </LinearGradient>
  );
}

function UzakVideo({ uri, aktif }: { uri: string; aktif: boolean }) {
  const aktifRef = useRef(aktif);
  aktifRef.current = aktif;
  const sonUri = useRef<string | null>(null);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    if (aktifRef.current) p.play();
  });

  // URI değişince kaynak değiştir — aktif toggle’da yeniden indirme yok
  useEffect(() => {
    let iptal = false;
    void (async () => {
      try {
        if (sonUri.current === uri) {
          if (aktifRef.current) {
            player.muted = true;
            player.loop = true;
            player.play();
          }
          return;
        }
        await player.replaceAsync(uri);
        if (iptal) return;
        sonUri.current = uri;
        player.muted = true;
        player.loop = true;
        if (aktifRef.current) player.play();
      } catch (e) {
        console.warn('[GirisLobiArkaPlan] video', e);
      }
    })();
    return () => {
      iptal = true;
    };
  }, [uri, player]);

  useEffect(() => {
    try {
      if (!aktif) {
        player.pause();
        return;
      }
      player.muted = true;
      player.loop = true;
      player.play();
    } catch (e) {
      console.warn('[GirisLobiArkaPlan] play', e);
    }
  }, [aktif, player]);

  return (
    <VideoView
      player={player}
      style={styles.tamEkran}
      contentFit="cover"
      nativeControls={false}
      playsInline
      pointerEvents="none"
      surfaceType="textureView"
    />
  );
}

export function GirisLobiArkaPlan({ medya, aktif = true }: Props) {
  const aktifListe = medya.filter((m) => m.public_url);
  const [index, setIndex] = useState(0);
  /** Android’de VideoView formu ve Chrome kartını örter; form önce çizilsin. */
  const [videoAcik, setVideoAcik] = useState(Platform.OS !== 'android');

  const medyaAnahtar = medya.map((m) => m.id).join('|');

  useEffect(() => {
    setIndex(0);
  }, [medyaAnahtar]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const t = setTimeout(() => setVideoAcik(true), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!aktif || aktifListe.length < 2) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % aktifListe.length);
    }, KLIP_SURESI_MS);
    return () => clearInterval(t);
  }, [aktif, aktifListe.length, medyaAnahtar]);

  const suanki = aktifListe[index % Math.max(aktifListe.length, 1)];
  const medyali = aktifListe.length > 0;
  const poster =
    aktifListe.find((m) => m.tur === 'image') ??
    (suanki?.tur === 'image' ? suanki : null);
  const posterUri = MedyaUriGuvenli(poster?.public_url);
  const suankiUri = MedyaUriGuvenli(suanki?.public_url);

  return (
    <View style={styles.wrap} pointerEvents="none" collapsable={false}>
      <ModernArkaPlan />

      {posterUri && suanki?.tur === 'video' ? (
        <Image
          source={{ uri: posterUri }}
          style={styles.tamEkran}
          resizeMode="cover"
        />
      ) : null}

      {videoAcik && aktif && suanki?.tur === 'video' && suankiUri ? (
        <UzakVideo uri={suankiUri} aktif />
      ) : null}

      {suanki?.tur === 'image' && suankiUri ? (
        <Image
          source={{ uri: suankiUri }}
          style={styles.tamEkran}
          resizeMode="cover"
        />
      ) : null}

      <LinearGradient
        colors={
          medyali
            ? [...RenkTokenlari.overlayGradient]
            : ['transparent', 'transparent', 'transparent']
        }
        locations={[0, 0.4, 1]}
        style={styles.overlay}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: W,
    height: H,
    zIndex: 0,
    elevation: 0,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bg,
  },
  tamEkran: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: W,
    height: H,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
