/**
 * Sembol hücresi — premium Image + Gates-kalitesi match border / fizik.
 */

import React, { memo, useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DESTROY_MS } from '../sabitler/KaskadSabitleri';
import { isEmptyInstanceId, isMultiplier, isScatter } from './SymbolRules';
import { SymbolImages } from '../assets/VisualAssets';
import type { GridCell, PerformanceProfile } from '../tipler/KaskadTipleri';

export type SymbolVisualState =
  | 'normal'
  | 'matched'
  | 'destroy'
  | 'dimmed'
  | 'landing'
  | 'anticipation';

type Props = {
  cell: GridCell;
  size: number;
  visualState?: SymbolVisualState;
  dropDistanceCells?: number;
  dropDurationMs?: number;
  dropDelayMs?: number;
  performance?: PerformanceProfile;
};

function SymbolRendererInner({
  cell,
  size,
  visualState = 'normal',
  dropDistanceCells = 0,
  dropDurationMs = 220,
  dropDelayMs = 0,
  performance = 'HIGH',
}: Props) {
  const isEmpty = isEmptyInstanceId(cell.instanceId);
  const translateY = useSharedValue(-(dropDistanceCells * size));
  const scale = useSharedValue(1);
  const scaleX = useSharedValue(1);
  const opacity = useSharedValue(isEmpty ? 0 : 1);
  const glow = useSharedValue(0);
  const rotate = useSharedValue(0);
  const borderPulse = useSharedValue(0);
  const idleShimmer = useSharedValue(0);

  useEffect(() => {
    if (isEmpty) {
      opacity.value = 0;
      return;
    }
    if (dropDistanceCells > 0) {
      translateY.value = -(dropDistanceCells * size);
      opacity.value = 1;
      scale.value = 1;
      scaleX.value = 1;
      translateY.value = withDelay(
        dropDelayMs,
        withTiming(0, {
          duration: dropDurationMs,
          easing: Easing.bezier(0.22, 0.85, 0.28, 1),
        }),
      );
      // Squash-stretch land
      scale.value = withDelay(
        dropDelayMs + dropDurationMs - 20,
        withSequence(
          withTiming(0.92, { duration: 55 }),
          withTiming(1.08, { duration: 80 }),
          withSpring(1, { damping: 11, stiffness: 280 }),
        ),
      );
      scaleX.value = withDelay(
        dropDelayMs + dropDurationMs - 20,
        withSequence(
          withTiming(1.12, { duration: 55 }),
          withTiming(0.94, { duration: 80 }),
          withSpring(1, { damping: 12, stiffness: 260 }),
        ),
      );
    }
  }, [
    cell.instanceId,
    dropDelayMs,
    dropDistanceCells,
    dropDurationMs,
    isEmpty,
    opacity,
    scale,
    scaleX,
    size,
    translateY,
  ]);

  useEffect(() => {
    // Idle shimmer kapalı — 30 hücrede sürekli animasyon FPS düşürüyordu.
    idleShimmer.value = 0;
  }, [idleShimmer]);

  useEffect(() => {
    if (isEmpty) return;
    switch (visualState) {
      case 'matched':
        glow.value = withTiming(1, { duration: 120 });
        borderPulse.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 160 }),
            withTiming(0.45, { duration: 160 }),
          ),
          -1,
          true,
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 140 }),
            withTiming(1.02, { duration: 140 }),
          ),
          4,
          true,
        );
        opacity.value = withTiming(1, { duration: 60 });
        break;
      case 'destroy':
        borderPulse.value = withTiming(0, { duration: 60 });
        scale.value = withSequence(
          withTiming(1.22, { duration: DESTROY_MS * 0.22 }),
          withTiming(0, {
            duration: DESTROY_MS * 0.78,
            easing: Easing.in(Easing.cubic),
          }),
        );
        scaleX.value = withSequence(
          withTiming(1.15, { duration: DESTROY_MS * 0.22 }),
          withTiming(0.2, { duration: DESTROY_MS * 0.78 }),
        );
        rotate.value = withTiming(performance === 'LOW' ? 0 : 18, {
          duration: DESTROY_MS,
          easing: Easing.in(Easing.quad),
        });
        opacity.value = withSequence(
          withTiming(1, { duration: DESTROY_MS * 0.28 }),
          withTiming(0, { duration: DESTROY_MS * 0.72 }),
        );
        glow.value = withSequence(
          withTiming(1, { duration: 60 }),
          withTiming(0, { duration: DESTROY_MS }),
        );
        break;
      case 'dimmed':
        opacity.value = withTiming(0.28, { duration: 160 });
        glow.value = withTiming(0, { duration: 100 });
        borderPulse.value = withTiming(0, { duration: 100 });
        break;
      case 'landing':
        scale.value = withSequence(
          withTiming(1.06, { duration: 70 }),
          withSpring(1, { damping: 13 }),
        );
        break;
      case 'anticipation':
        glow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 220 }),
            withTiming(0.25, { duration: 220 }),
          ),
          -1,
          true,
        );
        borderPulse.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 220 }),
            withTiming(0.35, { duration: 220 }),
          ),
          -1,
          true,
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.12, { duration: 220 }),
            withTiming(1, { duration: 220 }),
          ),
          -1,
          true,
        );
        break;
      case 'normal':
      default:
        glow.value = withTiming(0, { duration: 120 });
        borderPulse.value = withTiming(0, { duration: 120 });
        rotate.value = withTiming(0, { duration: 120 });
        scaleX.value = withTiming(1, { duration: 120 });
        if (dropDistanceCells === 0) {
          opacity.value = withTiming(1, { duration: 120 });
          scale.value = withSpring(1);
        }
        break;
    }
  }, [
    borderPulse,
    dropDistanceCells,
    glow,
    isEmpty,
    opacity,
    performance,
    rotate,
    scale,
    scaleX,
    visualState,
  ]);

  useEffect(() => {
    // Sürekli multiplier rotasyonu sadece HIGH + idle/matched
    if (isEmpty || !isMultiplier(cell.symbolType) || performance !== 'HIGH') {
      return;
    }
    if (visualState === 'destroy' || visualState === 'dimmed') return;
    rotate.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [cell.symbolType, isEmpty, performance, rotate, visualState]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scaleX: scaleX.value * (1 + idleShimmer.value * 0.012) },
      { scaleY: scale.value * (1 + idleShimmer.value * 0.018) },
    ],
    opacity: opacity.value,
  }));

  const imgAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.75,
    transform: [{ scale: 1 + glow.value * 0.14 }],
  }));

  const matchRingStyle = useAnimatedStyle(() => {
    const p = borderPulse.value;
    return {
      opacity: interpolate(p, [0, 1], [0.4, 1]),
      transform: [{ scale: 1 + p * 0.05 }],
      shadowOpacity: 0.35 + p * 0.6,
    };
  });

  if (isEmpty) {
    return <View style={{ width: size, height: size }} />;
  }

  const imgSize = size;
  const showMatchRing =
    (visualState === 'matched' || visualState === 'anticipation') &&
    performance !== 'LOW';

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        },
        anim,
      ]}
    >
      {(visualState === 'matched' || visualState === 'anticipation') &&
      performance !== 'LOW' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowHalo,
            {
              width: imgSize * 0.86,
              height: imgSize * 0.86,
              borderRadius: imgSize,
              backgroundColor: isScatter(cell.symbolType)
                ? 'rgba(167,139,250,0.38)'
                : isMultiplier(cell.symbolType)
                  ? 'rgba(111,227,255,0.38)'
                  : 'rgba(232,200,120,0.45)',
            },
            glowStyle,
          ]}
        />
      ) : null}

      {showMatchRing ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.matchRing,
            {
              width: imgSize * 0.9,
              height: imgSize * 0.9,
              borderRadius: 12,
            },
            matchRingStyle,
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          {
            width: imgSize,
            height: imgSize,
            alignItems: 'center',
            justifyContent: 'center',
          },
          imgAnim,
        ]}
      >
        <Image
          source={SymbolImages[cell.symbolType]}
          style={{ width: imgSize, height: imgSize }}
          resizeMode="contain"
          fadeDuration={0}
        />
      </Animated.View>
      {isMultiplier(cell.symbolType) && cell.multiplierValue ? (
        <View style={styles.multBadge} pointerEvents="none">
          <Text style={[styles.multText, { fontSize: Math.max(10, imgSize * 0.26) }]}>
            {cell.multiplierValue}×
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

export const SymbolRenderer = memo(
  SymbolRendererInner,
  (a, b) =>
    a.cell.instanceId === b.cell.instanceId &&
    a.cell.symbolType === b.cell.symbolType &&
    a.cell.multiplierValue === b.cell.multiplierValue &&
    a.size === b.size &&
    a.visualState === b.visualState &&
    a.dropDistanceCells === b.dropDistanceCells &&
    a.dropDurationMs === b.dropDurationMs &&
    a.dropDelayMs === b.dropDelayMs &&
    a.performance === b.performance,
);

const styles = StyleSheet.create({
  glowHalo: {
    position: 'absolute',
  },
  matchRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#FFE08A',
    shadowColor: '#FFE08A',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: 'transparent',
  },
  multBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multText: {
    color: '#FFF8E8',
    fontWeight: '900',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});

