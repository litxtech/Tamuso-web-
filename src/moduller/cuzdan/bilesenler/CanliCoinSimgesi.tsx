import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

type Props = {
  size?: number;
  /** Görsel ağırlık (boyut ipucu) — sürekli animasyon tetiklemez */
  seviye?: number;
  delayMs?: number;
  /**
   * true: hafif nabız (yalnızca 1 vurgu paketi için).
   * Magazada 50 kartta sonsuz rotate/scale UI titretiyordu — varsayılan kapalı.
   */
  animasyon?: boolean;
};

/** Coin simgesi — varsayılan statik; animasyon opt-in */
export function CanliCoinSimgesi({
  size = 44,
  seviye = 0.3,
  delayMs = 0,
  animasyon = false,
}: Props) {
  const nabiz = useSharedValue(1);

  useEffect(() => {
    if (!animasyon) {
      nabiz.value = 1;
      return;
    }
    nabiz.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1.05 + seviye * 0.03, { duration: 1200 }),
          withTiming(1, { duration: 1200 }),
        ),
        -1,
        false,
      ),
    );
  }, [animasyon, delayMs, nabiz, seviye]);

  const stil = useAnimatedStyle(() => ({
    transform: [{ scale: nabiz.value }],
  }));

  const font = Math.round(size * 0.42);
  const halkaBoy = size + 8;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        pointerEvents="none"
        style={[
          styles.halka,
          {
            width: halkaBoy,
            height: halkaBoy,
            borderRadius: halkaBoy / 2,
            borderColor: RenkTokenlari.accent,
            opacity: 0.35 + seviye * 0.25,
          },
        ]}
      />
      <Animated.View style={stil}>
        <LinearGradient
          colors={[...RenkTokenlari.gradientGold]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.35)',
          }}
        >
          <Text style={{ fontSize: font, fontWeight: '900', color: '#3A2208' }}>C</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

/** Hediye simgesi. Mağaza ızgarasında `sakin` kullan — spring ve sürekli nabız kartı titretir. */
export function CanliHediyeSimgesi({
  emoji,
  size = 40,
  delayMs = 0,
  secili = false,
  sakin = false,
}: {
  emoji: string;
  size?: number;
  delayMs?: number;
  secili?: boolean;
  /** Izgarada spring/nabız kartı titretmesin */
  sakin?: boolean;
}) {
  const android = Platform.OS === 'android';
  const giris = useSharedValue(1);
  const nabiz = useSharedValue(1);

  useEffect(() => {
    if (sakin || android) {
      giris.value = 1;
      return;
    }
    giris.value = 0;
    giris.value = withDelay(
      Math.min(delayMs, 120),
      withSpring(1, { damping: 14, stiffness: 180, mass: 0.6 }),
    );
  }, [android, delayMs, giris, emoji, sakin]);

  useEffect(() => {
    if (sakin || !secili) {
      nabiz.value = withTiming(1, { duration: 80 });
      return;
    }
    nabiz.value = withSequence(
      withTiming(1.08, { duration: 120 }),
      withTiming(1, { duration: 140 }),
    );
  }, [nabiz, sakin, secili]);

  const stil = useAnimatedStyle(() => ({
    opacity: giris.value,
    transform: [
      { scale: (0.35 + giris.value * 0.65) * nabiz.value },
      { translateY: android ? 0 : (1 - giris.value) * 10 },
    ],
  }));

  if (sakin || (android && !secili)) {
    return <Text style={{ fontSize: size }}>{emoji}</Text>;
  }

  return (
    <Animated.View style={stil}>
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halka: {
    position: 'absolute',
    borderWidth: 1.5,
  },
});
