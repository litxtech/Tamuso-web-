/**
 * Küçültülmüş ses odası — sürüklenen küçük pencere (yüksek zIndex).
 * Uygulama içinde gezinirken LiveKit açık kalır; dokun = odaya dön.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Pressable,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { yuzenTabBarToplamYukseklik } from '../../../components/YuzenTabBosluk';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { AktifSesOdasiOneCikar } from '../oturum/AktifSesOdasiOturumu';
import { useAktifSesOdasi } from '../oturum/useAktifSesOdasi';
import { SesOdasiArkaPlanTamamenCik } from '../arka-plan/SesOdasiArkaPlanServisi';
import { useCeviri } from '../../../i18n/useCeviri';

const PENCERE_W = 168;
const PENCERE_H = 96;
const EDGE_PAD = 10;
const TAP_SLOP = 8;
/** Tab bar (200) üstünde kalsın */
const Z = 320;

export function AktifSesOdasiMiniBar() {
  const { t } = useCeviri();
  const durum = useAktifSesOdasi();
  const insets = useSafeAreaInsets();
  const pathname = usePathname() ?? '';
  const segments = useSegments();
  const { width: W, height: H } = useWindowDimensions();
  const tabAlt = yuzenTabBarToplamYukseklik(insets.bottom);

  const odaEkraninda = useMemo(() => {
    if (!durum) return false;
    // segments: ['room', id] — pathname bazen gecikmeli kalır
    if (segments.includes('room' as never)) return true;
    if (pathname.includes(`/room/${durum.roomId}`)) return true;
    if (pathname === '/room/[id]') return true;
    return false;
  }, [durum, pathname, segments]);

  const gorunur = !!durum?.arkaPlanda && !odaEkraninda;

  const minX = EDGE_PAD;
  const maxX = Math.max(minX, W - PENCERE_W - EDGE_PAD);
  const minY = insets.top + EDGE_PAD;
  const maxY = Math.max(minY, H - PENCERE_H - tabAlt - EDGE_PAD);
  const baslangicX = maxX;
  const baslangicY = Math.min(maxY, Math.max(minY, Math.round(H * 0.2)));

  const x = useSharedValue(baslangicX);
  const y = useSharedValue(baslangicY);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Görünür olunca köşeye yerleştir (ilk açılışta kaçmasın)
  useEffect(() => {
    if (!gorunur) return;
    x.value = baslangicX;
    y.value = baslangicY;
  }, [gorunur, baslangicX, baslangicY, x, y]);

  useEffect(() => {
    if (!durum?.arkaPlanda) return;
    const roomId = durum.roomId;
    const topic = `aktif-ses-oda-end-${roomId}`;
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
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const next = payload.new as { is_live?: boolean } | null;
          if (next && next.is_live === false) {
            void (async () => {
              await SesOdasiArkaPlanTamamenCik();
              Alert.alert(t('sesOda.sesOdasi'), t('sesOda.yonetimKapatti'));
            })();
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [durum?.arkaPlanda, durum?.roomId, t]);

  const odayaDon = useCallback(() => {
    if (!durum) return;
    AktifSesOdasiOneCikar();
    router.push(`/room/${durum.roomId}` as any);
  }, [durum]);

  const tamamenCik = useCallback(() => {
    if (!durum) return;
    Alert.alert(t('sesOda.odadanCik'), t('sesOda.ayrilSoru'), [
      { text: t('sesOda.kal'), style: 'cancel' },
      {
        text: t('sesOda.cik'),
        style: 'destructive',
        onPress: () => {
          void SesOdasiArkaPlanTamamenCik();
        },
      },
    ]);
  }, [durum, t]);

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
      runOnJS(odayaDon)();
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const animStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
  }));

  if (!gorunur || !durum) return null;

  const kapak = MedyaUriGuvenli(durum.coverUrl);

  return (
    <View style={styles.layer} pointerEvents="box-none" collapsable={false}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.pencereWrap, animStyle]}
          accessibilityRole="button"
          accessibilityLabel={t('sesOda.sesDevamOdayaDon')}
          collapsable={false}
        >
          <View style={styles.pencere}>
            {kapak ? (
              <Image source={{ uri: kapak }} style={styles.kapak} />
            ) : (
              <View style={[styles.kapak, styles.kapakBos]}>
                <Ionicons name="mic" size={28} color="rgba(255,255,255,0.55)" />
              </View>
            )}
            <View style={styles.karart} pointerEvents="none" />
            <View style={styles.ustSatir} pointerEvents="box-none">
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveYazi}>{t('sesOda.canli')}</Text>
              </View>
              <Pressable
                onPress={tamamenCik}
                hitSlop={12}
                style={styles.kapat}
                accessibilityLabel={t('sesOda.odadanCik')}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.altSatir} pointerEvents="none">
              <Text style={styles.baslik} numberOfLines={2}>
                {durum.title}
              </Text>
              <Text style={styles.alt} numberOfLines={1}>
                {t('sesOda.sesDevamEdiyor')}
                {durum.dinleyiciSayisi > 0
                  ? ` · ${durum.dinleyiciSayisi}`
                  : ''}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: Z,
    elevation: Z,
  },
  pencereWrap: {
    position: 'absolute',
    width: PENCERE_W,
    height: PENCERE_H,
  },
  pencere: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1220',
    borderWidth: 1.5,
    borderColor: 'rgba(72, 220, 170, 0.75)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 16,
  },
  kapak: {
    ...StyleSheet.absoluteFillObject,
  },
  kapakBos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1A30',
  },
  karart: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  ustSatir: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
  },
});
