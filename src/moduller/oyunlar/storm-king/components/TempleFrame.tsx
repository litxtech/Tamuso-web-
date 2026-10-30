import React, { memo, type ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StormFrames } from '../constants/symbols';

type Props = {
  boardWidth: number;
  boardHeight: number;
  archHeight: number;
  children: ReactNode;
};

export const TempleFrame = memo(function TempleFrame({
  boardWidth,
  boardHeight,
  archHeight,
  children,
}: Props) {
  const padX = Math.round(boardWidth * 0.045);
  const padY = Math.round(boardHeight * 0.045);
  return (
    <View style={styles.wrap}>
      <Image
        source={StormFrames.ornament}
        style={{ width: boardWidth + padX * 2, height: archHeight }}
        fadeDuration={0}
        resizeMode="contain"
      />
      <View style={{ width: boardWidth, height: boardHeight }}>
        {children}
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', '#C084FC', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.neon}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  neon: { position: 'absolute', left: 8, right: 8, bottom: 0, height: 2 },
});
