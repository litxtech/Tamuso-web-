import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { STORM_THEME } from '../constants/theme';

type Props = {
  label: string;
  disabled: boolean;
  reduceMotion: boolean;
  onPress: () => void;
};

export const SpinButton = memo(function SpinButton({ label, disabled, reduceMotion, onPress }: Props) {
  const glow = useSharedValue(0);
  const flash = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (!reduceMotion) {
          glow.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 220 }));
        }
        onPress();
      }}
      style={({ pressed }) => [styles.hit, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <LinearGradient
        colors={['#F6E2A8', '#E6C36A', '#8A6A2F']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.ring}
      >
        <View style={styles.core}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </LinearGradient>
      <Animated.View pointerEvents="none" style={[styles.flash, flash]} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hit: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 84,
    height: 84,
    borderRadius: 42,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1248',
    borderWidth: 1,
    borderColor: 'rgba(246, 226, 168, 0.45)',
  },
  label: {
    color: STORM_THEME.gold,
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 13,
  },
  flash: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 244, 214, 0.28)',
  },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.96 }] },
});
