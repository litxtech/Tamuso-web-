import React, { memo, useLayoutEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { StormGems, orbArt } from '../constants/symbols';
import { STORM_THEME } from '../constants/theme';
import { registerSymbolMotion, unregisterSymbolMotion } from '../timeline/playSpin';
import type { GemId, SymbolData } from '../types';

type Props = {
  symbol: SymbolData;
  cell: number;
  pop?: number;
};

export const StormSymbol = memo(function StormSymbol({ symbol, cell, pop }: Props) {
  const x = useSharedValue(symbol.col * cell);
  const y = useSharedValue(symbol.row * cell);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glow = useSharedValue(0);

  useLayoutEffect(() => {
    x.value = symbol.col * cell;
    y.value = symbol.row * cell;
    opacity.value = 1;
    scale.value = 1;
    registerSymbolMotion(symbol.uid, { x, y, scale, opacity, glow });
    return () => unregisterSymbolMotion(symbol.uid);
  }, [cell, glow, opacity, scale, symbol.col, symbol.row, symbol.uid, x, y]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  const source =
    symbol.cell.type === 'gem' ? StormGems[symbol.cell.id] : orbArt(symbol.cell.value);
  const label = symbol.cell.type === 'multiplier' ? `${symbol.cell.value}×` : null;
  const plate = symbol.cell.type === 'gem' ? GEM_PLATE[symbol.cell.id] : '#6D28D9';

  return (
    <Animated.View style={[styles.cell, { width: cell, height: cell }, anim]} pointerEvents="none">
      <View style={[styles.plate, { backgroundColor: plate, borderRadius: cell * 0.22 }]} />
      <Image source={source} style={styles.art} resizeMode="contain" fadeDuration={0} />
      {label ? (
        <Text style={[styles.mult, { fontSize: Math.max(11, cell * 0.28) }]}>{label}</Text>
      ) : null}
      {pop && pop > 0 ? (
        <View style={styles.pop}>
          <Text style={styles.popText}>{pop}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
});

const GEM_PLATE: Record<GemId, string> = {
  ruby: '#9F1239',
  sapphire: '#1D4ED8',
  emerald: '#047857',
  amethyst: '#6D28D9',
  topaz: '#B45309',
  aqua: '#0E7490',
};

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: { position: 'absolute', width: '78%', height: '78%' },
  art: { width: '92%', height: '92%' },
  mult: {
    position: 'absolute',
    color: STORM_THEME.text,
    fontWeight: '800',
    textShadowColor: '#2A0A4A',
    textShadowRadius: 6,
  },
  pop: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: 'rgba(18,8,28,0.72)',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  popText: { color: STORM_THEME.gold, fontWeight: '800', fontSize: 11 },
});
