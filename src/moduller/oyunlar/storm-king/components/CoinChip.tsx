import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STORM_THEME } from '../constants/theme';

type Props = {
  label: string;
  value: number;
};

function formatCoins(value: number): string {
  return Math.trunc(value).toLocaleString('tr-TR');
}

export const CoinChip = memo(function CoinChip({ label, value }: Props) {
  return (
    <View style={styles.pill} accessibilityRole="text" accessibilityLabel={`${label} ${formatCoins(value)}`}>
      <LinearGradient colors={['#FFE7A3', '#E6C36A', '#8A6A2F']} style={styles.disc}>
        <View style={styles.discHole} />
      </LinearGradient>
      <View style={styles.copy}>
        <Text style={styles.caption}>{label}</Text>
        <Text style={styles.amount}>{formatCoins(value)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(18, 8, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(230, 195, 106, 0.55)',
  },
  disc: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discHole: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 42, 8, 0.55)',
  },
  copy: { alignItems: 'flex-end' },
  caption: {
    color: STORM_THEME.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  amount: {
    color: STORM_THEME.text,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
