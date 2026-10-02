/**
 * Minimal Zeus symbol — Image only, no per-cell gradient / pulse loops.
 */

import React, { memo, useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DESTROY_MS } from '../config/ZeusSabitleri';
import { isEmptyInstanceId, isMultiplier } from './SymbolRules';
import {
  isKnownZeusSymbol,
  ZEUS_SYMBOL_TINT,
  zeusSymbolImage,
} from './ZeusSymbolRegistry';
import type {
  GridCell,
  PerformanceProfile,
  ZeusSymbolType,
} from '../tipler/ZeusTipleri';

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
}: Props) {
  const isEmpty = isEmptyInstanceId(cell.instanceId);
  const opacity = useSharedValue(isEmpty ? 0 : 1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isEmpty) {
      opacity.value = 0;
      return;
    }
    if (visualState === 'destroy') {
      scale.value = withTiming(0.2, {
        duration: DESTROY_MS,
        easing: Easing.in(Easing.cubic),
      });
      opacity.value = withTiming(0, { duration: DESTROY_MS });
      return;
    }
    opacity.value = visualState === 'dimmed' ? 0.75 : 1;
    scale.value = visualState === 'matched' || visualState === 'anticipation' ? 1.06 : 1;
  }, [cell.instanceId, isEmpty, opacity, scale, visualState]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (isEmpty) {
    return <View style={{ width: size, height: size }} />;
  }

  const type = cell.type as ZeusSymbolType;
  const known = isKnownZeusSymbol(type);
  const source = zeusSymbolImage(type);
  const tint = known ? ZEUS_SYMBOL_TINT[type] : '#E8C547';
  const pad = Math.max(1, Math.round(size * 0.03));
  const img = size - pad * 2;

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          padding: pad,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${tint}33`,
          borderRadius: Math.round(size * 0.18),
        },
        anim,
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={{ width: img, height: img }}
          resizeMode="contain"
          fadeDuration={0}
        />
      ) : (
        <Text style={[styles.fallback, { color: tint, fontSize: size * 0.3 }]}>
          ?
        </Text>
      )}
      {isMultiplier(type) && cell.multiplierValue ? (
        <View style={styles.multBadge} pointerEvents="none">
          <Text style={[styles.multText, { fontSize: Math.max(11, size * 0.28) }]}>
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
    a.cell.type === b.cell.type &&
    a.cell.multiplierValue === b.cell.multiplierValue &&
    a.size === b.size &&
    a.visualState === b.visualState,
);

const styles = StyleSheet.create({
  fallback: { fontWeight: '900' },
  multBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multText: {
    color: '#FFF8E8',
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
