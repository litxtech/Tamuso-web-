import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { OzellikBayragiAktifMi } from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import { DusukCihazModuAktifMi } from '../../performans/DusukCihazModuAktifMi';
import { UnvanTasariminiDogrula } from '../dogrulama/UnvanTasarimZod';
import { UnvanIkonIonAdi } from '../sabitlemeler/UnvanIkonKutuphanesi';
import type {
  TitlePresentationModel,
  UnvanDesign,
  UnvanShape,
  UnvanSize,
} from '../tipler';

type Props = {
  presentation?: TitlePresentationModel | null;
  /** Alias — admin önizleme `title={sunum}` */
  title?: TitlePresentationModel | null;
  /** Ham design fallback (admin preview) */
  design?: unknown;
  label?: string;
  size?: UnvanSize;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
};

const MAX_W = 140;

function shapeRadius(shape: UnvanShape, corner: number | null | undefined): number {
  if (corner != null && Number.isFinite(corner)) return corner;
  switch (shape) {
    case 'PILL':
    case 'CAPSULE':
      return YaricapTokenlari.pill;
    case 'SOFT_PILL':
      return 12;
    case 'ROUNDED_RECT':
      return 8;
    case 'COMPACT':
      return 6;
    case 'CUT_CORNER':
      return 4;
    case 'DIAMOND_EDGE':
      return 3;
    case 'HEX':
      return 10;
    case 'MINIMAL':
      return 4;
    case 'OUTLINE':
      return 10;
    default:
      return 12;
  }
}

function fontSizeFor(size: UnvanSize): number {
  if (size === 'COMPACT') return TipografiTokenlari.micro.fontSize;
  if (size === 'PROMINENT') return TipografiTokenlari.caption.fontSize + 1;
  return TipografiTokenlari.micro.fontSize + 1;
}

function fontWeightFor(w: UnvanDesign['fontWeight']): '500' | '600' | '700' {
  if (w === 'bold') return '700';
  if (w === 'medium') return '500';
  return '600';
}

function glowShadow(d: UnvanDesign): ViewStyle {
  if (!d.glowEnabled || d.glowIntensity === 'off') return {};
  const intensity =
    d.glowIntensity === 'strong' ? 0.55 : d.glowIntensity === 'medium' ? 0.4 : 0.28;
  const radius = d.glowIntensity === 'strong' ? 10 : d.glowIntensity === 'medium' ? 7 : 5;
  return {
    shadowColor: d.glowColor,
    shadowOpacity: intensity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation: d.glowIntensity === 'strong' ? 6 : 3,
  };
}

function gradientColors(d: UnvanDesign): [string, string, ...string[]] {
  const c1 = d.backgroundColor || '#7C3AED';
  const c2 = d.backgroundColor2 || c1;
  if (d.backgroundColor3) return [c1, c2, d.backgroundColor3];
  return [c1, c2];
}

function gradientPoints(dir: UnvanDesign['gradientDirection']): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  switch (dir) {
    case 'RIGHT_LEFT':
      return { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } };
    case 'TOP_BOTTOM':
      return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
    case 'DIAGONAL':
      return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
    case 'LEFT_RIGHT':
    default:
      return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
  }
}

function IconSlot({
  design,
  color,
  size,
}: {
  design: UnvanDesign;
  color: string;
  size: number;
}) {
  if (design.iconType === 'none' || !design.iconValue) return null;
  if (design.iconType === 'emoji') {
    return (
      <Text style={{ fontSize: size, lineHeight: size + 2, color }} numberOfLines={1}>
        {design.iconValue}
      </Text>
    );
  }
  if (design.iconType === 'custom') {
    const uri = design.iconValue.startsWith('http') ? design.iconValue : null;
    if (!uri) return null;
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 2 }}
        resizeMode="contain"
      />
    );
  }
  const ion = UnvanIkonIonAdi(design.iconValue);
  if (!ion) return null;
  return <Ionicons name={ion} size={size} color={color} />;
}

/**
 * Ünvan rozeti — bozuk config'de asla crash yok.
 */
export function UserTitleBadge({
  presentation,
  title,
  design: rawDesign,
  label,
  size: sizeOverride,
  maxWidth = MAX_W,
  style,
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const model = presentation ?? title ?? null;

  const design = useMemo(() => {
    try {
      return UnvanTasariminiDogrula(model?.design ?? rawDesign ?? {});
    } catch {
      return UnvanTasariminiDogrula({});
    }
  }, [model?.design, rawDesign]);

  const text = (label ?? model?.label ?? '').trim();
  const hasContent = !!(text || model || rawDesign);

  const size = sizeOverride ?? design.size;
  const fontSize = fontSizeFor(size);
  const iconSize = size === 'PROMINENT' ? fontSize + 2 : fontSize;
  const radius = shapeRadius(design.shape, design.cornerRadius);
  const padH = design.paddingH;
  const padV = design.paddingV;

  const animAllowed =
    hasContent &&
    design.animationType !== 'NONE' &&
    OzellikBayragiAktifMi('title_animations_enabled') &&
    !reduceMotion &&
    !DusukCihazModuAktifMi();

  useEffect(() => {
    if (!animAllowed) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(design.animationType === 'SOFT_GLOW' || design.animationType === 'SPARKLE' ? 1.06 : 0.55, {
        duration: design.animationType === 'SHIMMER' ? 900 : 1400,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [animAllowed, design.animationType, pulse]);

  const animStyle = useAnimatedStyle(() => {
    if (!animAllowed) return {};
    if (design.animationType === 'SOFT_GLOW' || design.animationType === 'SPARKLE') {
      return { opacity: 0.82 + (pulse.value - 1) * 2, transform: [{ scale: pulse.value }] };
    }
    if (design.animationType === 'SHIMMER' || design.animationType === 'GRADIENT_SHIFT') {
      return { opacity: 0.7 + pulse.value * 0.3 };
    }
    return {};
  });

  if (!hasContent) return null;

  const borderColor = design.borderEnabled ? design.borderColor : 'transparent';
  const borderWidth = design.borderEnabled ? design.borderWidth : 0;

  const isGradient =
    design.backgroundType === 'LINEAR_GRADIENT' ||
    design.backgroundType === 'SUBTLE_GRADIENT';
  const isGlass = design.backgroundType === 'GLASS';
  const isTransparent =
    design.backgroundType === 'TRANSPARENT' || design.shape === 'OUTLINE';

  let bgColor = design.backgroundColor;
  if (isTransparent) bgColor = 'transparent';
  else if (isGlass) {
    bgColor = design.backgroundColor.includes('rgba')
      ? design.backgroundColor
      : 'rgba(255,255,255,0.12)';
  }

  const content = (
    <>
      {design.iconPosition === 'LEFT' ? (
        <IconSlot design={design} color={design.textColor} size={iconSize} />
      ) : null}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.label,
          {
            color: design.textColor,
            fontSize,
            fontWeight: fontWeightFor(design.fontWeight),
            maxWidth: maxWidth - padH * 2 - (design.iconType !== 'none' ? iconSize + 4 : 0),
          },
        ]}
      >
        {text || '—'}
      </Text>
      {design.iconPosition === 'RIGHT' ? (
        <IconSlot design={design} color={design.textColor} size={iconSize} />
      ) : null}
    </>
  );

  const baseWrap: ViewStyle = {
    maxWidth,
    borderRadius: radius,
    paddingHorizontal: isGradient ? 0 : padH,
    paddingVertical: isGradient ? 0 : padV,
    borderWidth,
    borderColor,
    overflow: 'hidden',
    ...glowShadow(design),
    ...(design.shape === 'DIAMOND_EDGE' ? { transform: [{ skewX: '-6deg' }] } : null),
  };

  const inner = <View style={[styles.row, { gap: 4 }]}>{content}</View>;

  try {
    if (isGradient) {
      const pts = gradientPoints(design.gradientDirection);
      const colors = gradientColors(design);
      return (
        <Animated.View style={[baseWrap, animStyle, style]} accessibilityRole="text">
          <LinearGradient
            colors={colors}
            start={pts.start}
            end={pts.end}
            style={[
              styles.gradFill,
              {
                borderRadius: radius,
                paddingHorizontal: padH,
                paddingVertical: padV,
              },
            ]}
          >
            {inner}
          </LinearGradient>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={[baseWrap, { backgroundColor: bgColor }, animStyle, style]}
        accessibilityRole="text"
        accessibilityLabel={text}
      >
        {inner}
      </Animated.View>
    );
  } catch {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText} numberOfLines={1}>
          {text || 'Ünvan'}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
  },
  gradFill: {
    alignSelf: 'stretch',
  },
  fallback: {
    maxWidth: MAX_W,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.85)',
  },
  fallbackText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
