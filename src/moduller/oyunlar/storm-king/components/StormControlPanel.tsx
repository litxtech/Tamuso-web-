import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STORM_THEME } from '../constants/theme';
import { BetSelector } from './BetSelector';
import { SpinButton } from './SpinButton';

type Props = {
  betLabel: string;
  bet: number;
  turboLabel: string;
  autoLabel: string;
  payLabel: string;
  spinLabel: string;
  turbo: boolean;
  auto: boolean;
  showAuto: boolean;
  busy: boolean;
  reduceMotion: boolean;
  onDec: () => void;
  onInc: () => void;
  onTurbo: () => void;
  onAuto: () => void;
  onPay: () => void;
  onSpin: () => void;
};

export const StormControlPanel = memo(function StormControlPanel(props: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <BetSelector
          betLabel={props.betLabel}
          value={props.bet}
          disabled={props.busy || props.auto}
          onDec={props.onDec}
          onInc={props.onInc}
        />
      </View>
      <View style={styles.controls}>
        <Mini
          label={props.turboLabel}
          active={props.turbo}
          disabled={false}
          onPress={props.onTurbo}
        />
        <SpinButton
          label={props.spinLabel}
          disabled={props.busy}
          reduceMotion={props.reduceMotion}
          onPress={props.onSpin}
        />
        {props.showAuto ? (
          <Mini label={props.autoLabel} active={props.auto} disabled={false} onPress={props.onAuto} />
        ) : (
          <Mini label={props.payLabel} active={false} disabled={false} onPress={props.onPay} />
        )}
      </View>
      {props.showAuto ? (
        <Pressable onPress={props.onPay} style={styles.payLink}>
          <Text style={styles.payText}>{props.payLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

function Mini({
  label,
  active,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.mini, active && styles.miniOn]}
      accessibilityRole="button"
    >
      <Text style={styles.miniText} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    marginTop: 8,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 24,
    backgroundColor: 'rgba(18, 8, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(230, 195, 106, 0.32)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 4,
  },
  mini: {
    maxWidth: 96,
    minWidth: 72,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(196, 182, 212, 0.28)',
  },
  miniOn: {
    backgroundColor: 'rgba(230, 195, 106, 0.22)',
    borderColor: STORM_THEME.gold,
  },
  miniText: { color: STORM_THEME.text, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  payLink: { alignSelf: 'center', paddingBottom: 8 },
  payText: { color: STORM_THEME.gold, fontSize: 11, fontWeight: '700' },
});
