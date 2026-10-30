import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { StormFrames } from '../constants/symbols';

type Props = {
  corner: number;
};

export const GameCardFrame = memo(function GameCardFrame({ corner }: Props) {
  const edge = { width: corner, height: corner };
  return (
    <View pointerEvents="none" style={styles.layer}>
      <Image source={StormFrames.cardTl} fadeDuration={0} resizeMode="stretch" style={[styles.corner, styles.tl, edge]} />
      <Image source={StormFrames.cardTr} fadeDuration={0} resizeMode="stretch" style={[styles.corner, styles.tr, edge]} />
      <Image source={StormFrames.cardBl} fadeDuration={0} resizeMode="stretch" style={[styles.corner, styles.bl, edge]} />
      <Image source={StormFrames.cardBr} fadeDuration={0} resizeMode="stretch" style={[styles.corner, styles.br, edge]} />
      <Image
        source={StormFrames.cardTop}
        fadeDuration={0}
        resizeMode="stretch"
        style={[styles.top, { height: corner, left: corner - 1, right: corner - 1 }]}
      />
      <Image
        source={StormFrames.cardBottom}
        fadeDuration={0}
        resizeMode="stretch"
        style={[styles.bottom, { height: corner, left: corner - 1, right: corner - 1 }]}
      />
      <Image
        source={StormFrames.cardLeft}
        fadeDuration={0}
        resizeMode="stretch"
        style={[styles.left, { width: corner, top: corner - 1, bottom: corner - 1 }]}
      />
      <Image
        source={StormFrames.cardRight}
        fadeDuration={0}
        resizeMode="stretch"
        style={[styles.right, { width: corner, top: corner - 1, bottom: corner - 1 }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill },
  corner: { position: 'absolute' },
  tl: { left: 0, top: 0 },
  tr: { right: 0, top: 0 },
  bl: { left: 0, bottom: 0 },
  br: { right: 0, bottom: 0 },
  top: { position: 'absolute', top: 0 },
  bottom: { position: 'absolute', bottom: 0 },
  left: { position: 'absolute', left: 0 },
  right: { position: 'absolute', right: 0 },
});
