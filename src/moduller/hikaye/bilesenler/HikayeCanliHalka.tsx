import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import {
  HIKAYE_GRADIENT_GORULDU,
  HIKAYE_GRADIENT_GORULMEDI,
} from '../sabitler';

type Props = {
  size: number;
  hasUnseen: boolean;
  /** Halka kalınlığı (px) */
  thickness?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/**
 * Story halkası — izlenmemiş: dönen canlı gradient; izlenmiş: sabit gri.
 * İç daire absolute inset → önizleme her zaman dairenin içine sığar.
 */
export function HikayeCanliHalka({
  size,
  hasUnseen,
  thickness = 2.5,
  style,
  children,
}: Props) {
  const rot = useSharedValue(0);
  const kalin = Math.max(2, thickness);
  const ic = Math.max(8, size - kalin * 2);

  useEffect(() => {
    if (!hasUnseen) {
      rot.value = 0;
      return;
    }
    rot.value = 0;
    rot.value = withRepeat(
      withTiming(360, { duration: 2800, easing: Easing.linear }),
      -1,
      false,
    );
  }, [hasUnseen, rot]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const gradient = hasUnseen
    ? HIKAYE_GRADIENT_GORULMEDI
    : HIKAYE_GRADIENT_GORULDU;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        styles.wrap,
        style,
      ]}
      collapsable={false}
    >
      {hasUnseen ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, animStyle]}
        >
          <LinearGradient
            colors={[...gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fill}
          />
        </Animated.View>
      ) : (
        <LinearGradient
          pointerEvents="none"
          colors={[...gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <View
        style={[
          styles.ic,
          {
            top: kalin,
            left: kalin,
            width: ic,
            height: ic,
            borderRadius: ic / 2,
          },
        ]}
        collapsable={false}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bg,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  ic: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bg,
  },
});
