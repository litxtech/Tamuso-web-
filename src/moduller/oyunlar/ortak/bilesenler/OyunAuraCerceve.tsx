/**
 * OyunAuraCerceve — kartın ETRAFINDA dönen ışık halkası.
 * İki ters yönde dönen gradient tabaka + nefes alan dış parlama.
 * Kart içeriği çerçevenin içinde kırpılır; layout'a dokunmaz.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  /** Halka renkleri — 2 ya da 3 ton (aralara şeffaf boşluk otomatik eklenir) */
  renkler: readonly [string, string] | readonly [string, string, string];
  /** Dış köşe yarıçapı */
  yaricap: number;
  /** Halka kalınlığı (px) */
  kalinlik?: number;
  /** Tam tur süresi (ms) */
  hizMs?: number;
  /** Animasyon kapalıyken statik degrade çizilir (liste performansı) */
  aktif?: boolean;
  /** Dış parlama (shadow) rengi — verilmezse ilk renk */
  parlamaRengi?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function OyunAuraCerceve({
  renkler,
  yaricap,
  kalinlik = 1.5,
  hizMs = 5200,
  aktif = true,
  parlamaRengi,
  style,
  children,
}: Props) {
  const [boyut, setBoyut] = useState({ w: 0, h: 0 });
  const donus = useSharedValue(0);
  const tersDonus = useSharedValue(0);
  const nefes = useSharedValue(0.55);

  useEffect(() => {
    if (!aktif) {
      donus.value = 0;
      tersDonus.value = 0;
      nefes.value = 0.6;
      return;
    }
    donus.value = withRepeat(
      withTiming(360, { duration: hizMs, easing: Easing.linear }),
      -1,
      false,
    );
    tersDonus.value = withRepeat(
      withTiming(-360, { duration: hizMs * 1.7, easing: Easing.linear }),
      -1,
      false,
    );
    nefes.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.45, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [aktif, donus, hizMs, nefes, tersDonus]);

  const capraz = Math.ceil(Math.hypot(boyut.w, boyut.h)) + 8;

  const donusStil = useAnimatedStyle(() => ({
    transform: [{ rotate: `${donus.value}deg` }],
  }));
  const tersStil = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tersDonus.value}deg` }],
    opacity: 0.55,
  }));
  const parlamaStil = useAnimatedStyle(() => ({
    shadowOpacity: 0.28 + nefes.value * 0.5,
    opacity: 0.55 + nefes.value * 0.45,
  }));

  const [r0, r1, r2] = [renkler[0], renkler[1], renkler[2] ?? renkler[0]];
  const parlama = parlamaRengi ?? r0;

  return (
    <View style={[{ borderRadius: yaricap }, style]}>
      {/* Dış parlama — yalnızca halka; içerik üstünde kalmasın */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.parlama,
          {
            borderRadius: yaricap + 2,
            shadowColor: parlama,
            borderColor: parlama,
            zIndex: 0,
          },
          parlamaStil,
        ]}
      />
      <View
        style={[styles.halkaKirp, { borderRadius: yaricap, padding: kalinlik, zIndex: 1 }]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== boyut.w || height !== boyut.h) {
            setBoyut({ w: width, h: height });
          }
        }}
      >
        {boyut.w > 0 ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.donenKare,
                {
                  width: capraz,
                  height: capraz,
                  marginLeft: -capraz / 2,
                  marginTop: -capraz / 2,
                },
                donusStil,
              ]}
            >
              <LinearGradient
                colors={[r0, 'transparent', r1, 'transparent', r2, 'transparent', r0]}
                locations={[0, 0.16, 0.33, 0.5, 0.66, 0.84, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.donenKare,
                {
                  width: capraz,
                  height: capraz,
                  marginLeft: -capraz / 2,
                  marginTop: -capraz / 2,
                },
                tersStil,
              ]}
            >
              <LinearGradient
                colors={['transparent', r1, 'transparent', r2, 'transparent']}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </>
        ) : (
          <LinearGradient
            pointerEvents="none"
            colors={[r0, r1, r2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.halkaAlt]}
          />
        )}
        {/* Poster / simgeler — dönen halkaların ÜSTÜNDE */}
        <View style={[styles.icerik, { borderRadius: yaricap - kalinlik }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  parlama: {
    borderWidth: 1.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  halkaKirp: {
    overflow: 'hidden',
    position: 'relative',
  },
  halkaAlt: {
    zIndex: 0,
  },
  donenKare: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    zIndex: 0,
  },
  icerik: {
    overflow: 'hidden',
    zIndex: 2,
    elevation: 2,
    position: 'relative',
  },
});
