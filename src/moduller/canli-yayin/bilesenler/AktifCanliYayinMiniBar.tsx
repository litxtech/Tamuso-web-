/**
 * Küçültülmüş canlı yayın — sürüklenen küçük pencere.
 * Uygulama içinde gezinirken LiveKit açık kalır; dokun = yayına dön.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { FullWindowOverlay } from 'react-native-screens';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { yuzenTabBarToplamYukseklik } from '../../../components/YuzenTabBosluk';
import { CanliYayinVideoSahne } from './CanliYayinVideoSahne';
import { MedyaOdasiKes } from '../../livekit/MedyaBaglantisi';
import { LiveKitBaglantiYoneticisi } from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';
import {
  CanliYayinBitir,
  CanliYayinIzleyiciCik,
} from '../islemler/CanliYayinIslemleri';
import { useCanliYayinArkaPlanBitir } from '../islemler/useCanliYayinArkaPlanBitir';
import {
  AktifCanliYayinBitir,
  AktifCanliYayinDurumunuAl,
  AktifCanliYayinOneCikar,
} from '../oturum/AktifCanliYayinOturumu';
import { useAktifCanliYayin } from '../oturum/useAktifCanliYayin';
import { useCeviri } from '../../../i18n/useCeviri';

const PENCERE_W = 132;
const PENCERE_H = 188;
const EDGE_PAD = 10;
const TAP_SLOP = 8;
/** Ses odası penceresinin (320) üstünde */
const Z = 330;

export function AktifCanliYayinMiniBar() {
  const { t } = useCeviri();
  const durum = useAktifCanliYayin();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const tabAlt = yuzenTabBarToplamYukseklik(insets.bottom);
  const gorunur = !!durum?.arkaPlanda;
  const [videoAc, setVideoAc] = useState(false);

  const minX = EDGE_PAD;
  const maxX = Math.max(minX, W - PENCERE_W - EDGE_PAD);
  const minY = insets.top + EDGE_PAD;
  const maxY = Math.max(minY, H - PENCERE_H - tabAlt - EDGE_PAD);
  const baslangicX = maxX;
  const baslangicY = Math.min(maxY, Math.max(minY, Math.round(H * 0.36)));

  const x = useSharedValue(baslangicX);
  const y = useSharedValue(baslangicY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const tamamenCik = useCallback(() => {
    const d = AktifCanliYayinDurumunuAl();
    if (!d) return;
    const { sessionId, rol } = d;
    AktifCanliYayinBitir();
    if (rol === 'host') {
      void CanliYayinBitir(sessionId).catch(() => undefined);
    } else {
      void CanliYayinIzleyiciCik(sessionId).catch(() => undefined);
    }
    void MedyaOdasiKes({ hizli: true }).catch(() => undefined);
  }, []);

  useCanliYayinArkaPlanBitir(gorunur && durum?.rol === 'host', tamamenCik);

  useEffect(() => {
    if (!gorunur) {
      setVideoAc(false);
      return;
    }
    const beklet = setTimeout(() => setVideoAc(true), 400);
    return () => clearTimeout(beklet);
  }, [gorunur]);

  useEffect(() => {
    if (!gorunur || durum?.rol !== 'host') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const birak = LiveKitBaglantiYoneticisi.dinle((_d, detay) => {
      if (detay === 'disconnected') {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (LiveKitBaglantiYoneticisi.durumGetir() === 'connected') return;
          if (AppState.currentState !== 'active') return;
          tamamenCik();
        }, 4000);
      } else if (detay === 'connected' || detay === 'reconnected') {
        if (timer) clearTimeout(timer);
        timer = null;
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      birak();
    };
  }, [gorunur, durum?.rol, tamamenCik]);

  useEffect(() => {
    if (!gorunur) return;
    x.value = baslangicX;
    y.value = baslangicY;
  }, [gorunur, baslangicX, baslangicY, x, y]);

  useEffect(() => {
    if (!durum?.arkaPlanda) return;
    const sessionId = durum.sessionId;
    const topic = `aktif-canli-end-${sessionId}`;
    for (const ch of supabase.getChannels()) {
      if (ch.topic === `realtime:${topic}` || ch.topic === topic) {
        void supabase.removeChannel(ch);
      }
    }
    const kanal = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const next = payload.new as { is_live?: boolean } | null;
          if (next && next.is_live === false) {
            const d = AktifCanliYayinDurumunuAl();
            AktifCanliYayinBitir();
            if (d?.rol !== 'host') {
              void CanliYayinIzleyiciCik(sessionId).catch(() => undefined);
            }
            void MedyaOdasiKes({ hizli: true }).catch(() => undefined);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [durum?.arkaPlanda, durum?.sessionId]);

  const yayinaDon = useCallback(() => {
    if (!durum) return;
    const { sessionId, rol } = durum;
    AktifCanliYayinOneCikar();
    if (rol === 'host') {
      router.push('/canli' as any);
    } else {
      router.push(`/canli/${sessionId}` as any);
    }
  }, [durum]);

  const pan = Gesture.Pan()
    .minDistance(TAP_SLOP)
    .onBegin(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      const nx = startX.value + e.translationX;
      const ny = startY.value + e.translationY;
      x.value = Math.min(maxX, Math.max(minX, nx));
      y.value = Math.min(maxY, Math.max(minY, ny));
    })
    .onEnd(() => {
      const mid = W / 2;
      const hedefX = x.value + PENCERE_W / 2 < mid ? minX : maxX;
      x.value = withSpring(hedefX, { damping: 16, stiffness: 240 });
      y.value = withSpring(Math.min(maxY, Math.max(minY, y.value)), {
        damping: 16,
        stiffness: 240,
      });
    });

  const tap = Gesture.Tap()
    .maxDistance(TAP_SLOP)
    .onEnd(() => {
      runOnJS(yayinaDon)();
    });

  const kapatGesture = Gesture.Tap().onEnd(() => {
    runOnJS(tamamenCik)();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  if (!gorunur || !durum) return null;

  const katman = (
    <View style={styles.layer} pointerEvents="box-none" collapsable={false}>
      <Animated.View
        style={[styles.pencereWrap, animStyle]}
        pointerEvents="box-none"
        collapsable={false}
      >
        <GestureDetector gesture={gesture}>
          <View
            style={styles.pencere}
            accessibilityRole="button"
            accessibilityLabel={t('sesOda.kucultGezin')}
            collapsable={false}
          >
            {videoAc ? (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <CanliYayinVideoSahne
                  rol={durum.rol === 'host' ? 'host' : 'izleyici'}
                  mock={durum.mock}
                />
              </View>
            ) : null}
            <View style={styles.karart} pointerEvents="none" />
            <View style={styles.ustSatir} pointerEvents="none">
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveYazi}>{t('canliYayin.canli')}</Text>
              </View>
            </View>
            <View style={styles.altSatir} pointerEvents="none">
              <Text style={styles.baslik} numberOfLines={2}>
                {durum.meta.title}
              </Text>
              <Text style={styles.alt} numberOfLines={1}>
                {durum.meta.hostAd}
              </Text>
            </View>
          </View>
        </GestureDetector>
        <GestureDetector gesture={kapatGesture}>
          <View
            style={styles.kapat}
            collapsable={false}
            accessibilityRole="button"
            accessibilityLabel={
              durum.rol === 'host'
                ? t('canliYayin.a11yYayiniBitir')
                : t('canliYayin.a11yCik')
            }
          >
            <Ionicons name="close" size={16} color="#fff" />
          </View>
        </GestureDetector>
      </Animated.View>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay>
        <GestureHandlerRootView style={styles.overlayKok} pointerEvents="box-none">
          {katman}
        </GestureHandlerRootView>
      </FullWindowOverlay>
    );
  }

  return katman;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: Z,
    elevation: Z,
  },
  overlayKok: {
    ...StyleSheet.absoluteFillObject,
  },
  pencereWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PENCERE_W,
    height: PENCERE_H,
  },
  pencere: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#120814',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 70, 110, 0.8)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 16,
  },
  karart: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  ustSatir: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 36,
    zIndex: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.live,
  },
  liveYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  kapat: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  altSatir: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 7,
    zIndex: 2,
    gap: 1,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 15,
  },
  alt: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 10,
  },
});
