import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STORM_THEME } from '../constants/theme';

type Props = {
  label: string;
  value: string;
  width: number;
};

export const MultiplierDisplay = memo(function MultiplierDisplay({ label, value, width }: Props) {
  return (
    <View style={[styles.wrap, { width: Math.min(width, 220) }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    height: 48,
    marginBottom: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 11, 46, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(230, 195, 106, 0.4)',
  },
  label: {
    color: STORM_THEME.muted,
    fontSize: 9,
    letterSpacing: 1.3,
    fontWeight: '700',
  },
  value: {
    color: STORM_THEME.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
});
