import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STORM_THEME } from '../constants/theme';

type Props = {
  label: string;
  value: number;
};

function formatCoins(value: number): string {
  return Math.trunc(value).toLocaleString('tr-TR');
}

export const WinDisplay = memo(function WinDisplay({ label, value }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatCoins(value)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    minWidth: 148,
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 8, 28, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.35)',
  },
  label: {
    color: STORM_THEME.muted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  value: {
    color: STORM_THEME.gold,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
