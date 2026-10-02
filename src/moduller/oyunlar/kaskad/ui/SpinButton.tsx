/**
 * SpinButton — prosedürel kristal/enerji düğmesi + dönen halka.
 */

import React, { memo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export type SpinButtonState =
  | 'idle'
  | 'requesting'
  | 'animating'
  | 'autoplay'
  | 'disabled';

type Props = {
  state: SpinButtonState;
  onPress: () => void;
  onLongPress?: () => void;
  autoplayLeft?: number;
  size?: number;
  reduceMotion?: boolean;
  art?: ImageSourcePropType;
};

function SpinButtonInner({
  state,
  onPress,
  onLongPress,
  autoplayLeft = 0,
  size = 118,
  reduceMotion = false,
  art,
}: Props) {
  const pressScale = useSharedValue(1);
  const glow = useSharedValue(0.4);
  const ringSpin = useSharedValue(0);
  const [artFailed, setArtFailed] = useState(false);
  const useArt = Boolean(art) && !artFailed;

  useEffect(() => {
    setArtFailed(false);
  }, [art]);

  useEffect(() => {
    if (state === 'idle' && !reduceMotion) {
      glow.value = withRepeat(
        withSequence(
          withTiming(0.95, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
      ringSpin.value = withRepeat(
        withTiming(360, { duration: 7000, easing: Easing.linear }),
        -1,
        false,
      );
    } else if (state === 'animating' || state === 'autoplay') {
      glow.value = withTiming(0.8, { duration: 180 });
      ringSpin.value = withRepeat(
        withTiming(360, { duration: 1800, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      glow.value = withTiming(state === 'disabled' ? 0.12 : 0.4, {
        duration: 220,
      });
    }
  }, [glow, reduceMotion, ringSpin, state]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
    shadowOpacity: glow.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringSpin.value}deg` }],
    opacity: 0.35 + glow.value * 0.45,
  }));

  const clickable = state === 'idle' || state === 'autoplay';
  const disabled = state === 'disabled';
  const clipR = size / 2;
  const busy = state === 'requesting' || state === 'animating';

  return (
    <Animated.View
      style={[
        styles.shadowWrap,
        { width: size, height: size, borderRadius: clipR },
        useArt ? styles.shadowGold : null,
        wrapStyle,
      ]}
    >
      {!reduceMotion && !disabled && !useArt ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.energyRing,
            {
              width: size * 1.12,
              height: size * 1.12,
              borderRadius: size,
              marginLeft: -size * 0.06,
              marginTop: -size * 0.06,
            },
            ringStyle,
          ]}
        />
      ) : null}
      <Pressable
        onPress={clickable ? onPress : undefined}
        onLongPress={
          state === 'idle' && onLongPress ? onLongPress : undefined
        }
        delayLongPress={380}
        disabled={!clickable}
        onPressIn={() => {
          pressScale.value = withTiming(0.92, { duration: 70 });
        }}
        onPressOut={() => {
          pressScale.value = withTiming(1, { duration: 110 });
        }}
        accessibilityRole="button"
        accessibilityLabel={state === 'autoplay' ? 'Autoplay durdur' : 'Başlat'}
        style={{
          width: size,
          height: size,
          borderRadius: clipR,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A1408',
        }}
      >
        {useArt ? (
          <Image
            source={art}
            style={{
              width: size,
              height: size,
              opacity: disabled ? 0.45 : busy ? 0.55 : 1,
              backgroundColor: '#1A1408',
            }}
            resizeMode="cover"
            fadeDuration={0}
            onError={() => setArtFailed(true)}
          />
        ) : (
          <LinearGradient
            colors={
              disabled
                ? ['#3A4155', '#1A1E2A']
                : ['#6FE3FF', '#3DB8E8', '#C9A24A', '#1B1638']
            }
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: disabled ? 0.55 : 1,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: 'rgba(255,224,138,0.65)',
            }}
          >
            <View
              style={{
                width: size * 0.72,
                height: size * 0.72,
                borderRadius: size,
                backgroundColor: 'rgba(8,12,24,0.88)',
                borderWidth: 1.5,
                borderColor: 'rgba(111,227,255,0.45)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </LinearGradient>
        )}
        <View style={styles.overlay} pointerEvents="none">
          {busy ? (
            <ActivityIndicator color="#F6E27A" size="large" />
          ) : state === 'autoplay' ? (
            <>
              <Ionicons name="stop" size={size * 0.2} color="#E8F6FF" />
              <Text style={styles.autoCount}>{autoplayLeft}</Text>
            </>
          ) : (
            <Text
              style={[
                styles.text,
                { fontSize: size * 0.13 },
                useArt ? styles.textOnArt : null,
              ]}
            >
              BAŞLAT
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export const SpinButton = memo(SpinButtonInner);

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: '#6FE3FF',
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  shadowGold: {
    shadowColor: '#E8C547',
  },
  energyRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(111,227,255,0.55)',
    borderTopColor: 'rgba(255,224,138,0.85)',
    borderBottomColor: 'rgba(111,227,255,0.25)',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#F7F2E8',
    fontWeight: '900',
    letterSpacing: 2.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 6,
  },
  textOnArt: {
    color: '#FFF6D0',
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  autoCount: {
    color: '#E8F6FF',
    fontWeight: '900',
    fontSize: 14,
    marginTop: 2,
  },
});
