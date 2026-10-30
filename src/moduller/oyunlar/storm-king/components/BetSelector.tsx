import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STORM_THEME } from '../constants/theme';

type Props = {
  betLabel: string;
  value: number;
  disabled: boolean;
  onDec: () => void;
  onInc: () => void;
};

export const BetSelector = memo(function BetSelector({
  betLabel,
  value,
  disabled,
  onDec,
  onInc,
}: Props) {
  return (
    <View style={styles.row}>
      <RoundButton label="-" disabled={disabled} onPress={onDec} />
      <View style={styles.mid}>
        <Text style={styles.caption}>{betLabel}</Text>
        <Text style={styles.value}>{value.toLocaleString('tr-TR')}</Text>
      </View>
      <RoundButton label="+" disabled={disabled} onPress={onInc} />
    </View>
  );
});

function RoundButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.btn, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 8, 28, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(230, 195, 106, 0.28)',
  },
  mid: { minWidth: 72, alignItems: 'center' },
  caption: { color: STORM_THEME.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  value: {
    color: STORM_THEME.text,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(230, 195, 106, 0.45)',
  },
  btnText: { color: STORM_THEME.text, fontWeight: '800', fontSize: 20, lineHeight: 22 },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.94 }] },
});
