import React, { useEffect, useRef } from 'react';
import { Keyboard, StyleSheet, Text, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { HikayeOverlay } from '../tipler';

type Props = {
  overlay: HikayeOverlay;
  editing?: boolean;
  draggable?: boolean;
  onChangeText?: (text: string) => void;
  onMoveEnd?: (x: number, y: number) => void;
  onTap?: () => void;
  onBlurEdit?: () => void;
  canvasW: number;
  canvasH: number;
};

/**
 * Instagram tarzı sürüklenebilir metin — x/y normalize 0..1.
 */
export function HikayeSuruklenebilirMetin({
  overlay,
  editing,
  draggable = true,
  onChangeText,
  onMoveEnd,
  onTap,
  onBlurEdit,
  canvasW,
  canvasH,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const startX = (overlay.x ?? 0.5) * canvasW;
  const startY = (overlay.y ?? 0.45) * canvasH;
  const tx = useSharedValue(startX);
  const ty = useSharedValue(startY);
  const scale = useSharedValue(overlay.scale ?? 1);
  const basX = useSharedValue(0);
  const basY = useSharedValue(0);

  useEffect(() => {
    tx.value = (overlay.x ?? 0.5) * canvasW;
    ty.value = (overlay.y ?? 0.45) * canvasH;
    scale.value = overlay.scale ?? 1;
  }, [overlay.x, overlay.y, overlay.scale, canvasW, canvasH, tx, ty, scale]);

  useEffect(() => {
    if (editing) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
    inputRef.current?.blur();
    Keyboard.dismiss();
  }, [editing]);

  const bitir = (nx: number, ny: number) => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    onMoveEnd?.(nx, ny);
  };
  const dokun = () => {
    onTap?.();
  };
  const duzenlemeyiBitir = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    onBlurEdit?.();
  };

  const pan = Gesture.Pan()
    .enabled(draggable)
    .onBegin(() => {
      basX.value = tx.value;
      basY.value = ty.value;
      if (editing) {
        runOnJS(duzenlemeyiBitir)();
      }
    })
    .onUpdate((e) => {
      tx.value = Math.min(canvasW - 24, Math.max(24, basX.value + e.translationX));
      ty.value = Math.min(canvasH - 24, Math.max(24, basY.value + e.translationY));
    })
    .onEnd(() => {
      runOnJS(bitir)(tx.value / canvasW, ty.value / canvasH);
    });

  const tap = Gesture.Tap()
    .enabled(!!onTap)
    .onEnd(() => {
      runOnJS(dokun)();
    });

  const composed = Gesture.Simultaneous(pan, tap);

  const stil = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: tx.value,
    top: ty.value,
    transform: [
      { translateX: -100 },
      { translateY: -20 },
      { scale: scale.value },
    ],
  }));

  const renk = overlay.color ?? '#FFFFFF';

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[stil, styles.wrap]} collapsable={false}>
        {editing ? (
          <TextInput
            ref={inputRef}
            value={overlay.text ?? ''}
            onChangeText={onChangeText}
            style={[styles.metin, { color: renk }]}
            multiline
            autoFocus
            blurOnSubmit
            returnKeyType="done"
            onSubmitEditing={duzenlemeyiBitir}
            onBlur={duzenlemeyiBitir}
            placeholder="…"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
        ) : (
          <Text style={[styles.metin, { color: renk }]}>
            {overlay.text || ' '}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 200,
    alignItems: 'center',
    zIndex: 20,
  },
  metin: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    minWidth: 80,
  },
});
