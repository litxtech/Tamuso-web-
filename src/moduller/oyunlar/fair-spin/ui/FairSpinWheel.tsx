/**
 * Fair Spin çark — sunucu segmentId'ye döner; client sonuç üretmez.
 * Dilimler merkezden eşit açıyla yerleştirilir (RN transform-origin uyumlu).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { FairSpinSegment } from '../tipler/FairSpinTipleri';
import { SPIN_DURATION_MS } from '../sabitler/FairSpinSabitleri';
import { playFairSpinWheel, stopFairSpinAudio } from '../ses/FairSpinAudio';
import { useCeviri } from '../../../../i18n/useCeviri';

const ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'diamond',
  'trophy',
  'gift',
  'heart',
  'rocket',
  'star',
  'ribbon',
  'game-controller',
];

type Props = {
  segments: FairSpinSegment[];
  spinning: boolean;
  targetSegmentId: string | null;
  countdown: number | null;
  onSpinEnd: () => void;
  size?: number;
};

/** Dilim rengi + koyu kenar — pasta dilimi görünümü */
function SliceFill({
  color,
  angle,
  slice,
  radius,
}: {
  color: string;
  angle: number;
  slice: number;
  radius: number;
}) {
  // Border-triangle: merkezden dışarı açılan dilim
  const half = (Math.PI * slice) / 360;
  const base = Math.max(8, radius * Math.tan(half) * 2);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.sliceAnchor,
        {
          width: base,
          left: radius - base / 2,
          top: radius,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: base / 2,
          borderRightWidth: base / 2,
          borderBottomWidth: radius,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          opacity: 0.88,
          transform: [{ translateY: -radius }],
        }}
      />
    </View>
  );
}

export function FairSpinWheel({
  segments,
  spinning,
  targetSegmentId,
  countdown,
  onSpinEnd,
  size = 320,
}: Props) {
  const { t } = useCeviri();
  const rotation = useSharedValue(0);
  const onEndRef = useRef(onSpinEnd);
  const reducedMotion = useRef(false);
  const num = Math.max(segments.length, 1);
  const slice = 360 / num;

  const trackSize = size - 10;
  const center = trackSize / 2;
  const hubR = Math.min(44, Math.max(28, trackSize * 0.145));
  const arc = (2 * Math.PI * (center * 0.55)) / num;
  // Madalyonlar dilime ve çarka sığsın
  const medW = Math.min(38, Math.max(24, arc * 0.58));
  const medH = medW * 1.28;
  const radius = Math.min(
    center - medH / 2 - 6,
    Math.max(hubR + medH / 2 + 6, center * 0.54),
  );
  const pad = Math.max(18, Math.min(28, size * 0.08));

  useEffect(() => {
    onEndRef.current = onSpinEnd;
  }, [onSpinEnd]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reducedMotion.current = v === true;
    });
  }, []);

  useEffect(() => {
    if (!spinning || !targetSegmentId || segments.length <= 0) return;

    const targetIndex = segments.findIndex((s) => s.id === targetSegmentId);
    if (targetIndex < 0) return;

    const duration = reducedMotion.current ? 800 : SPIN_DURATION_MS;
    const currentMod = ((rotation.value % 360) + 360) % 360;
    const targetAngle = 360 - targetIndex * slice;
    const spins = reducedMotion.current ? 360 : 360 * 6;
    const offset = Math.random() * (slice * 0.55) - slice * 0.275;
    const next = rotation.value + spins + (targetAngle - currentMod) + offset;

    playFairSpinWheel();

    const finish = () => {
      stopFairSpinAudio();
      onEndRef.current();
    };

    rotation.value = withTiming(
      next,
      { duration, easing: Easing.bezier(0.2, 0.8, 0.2, 1) },
      (finished) => {
        if (finished) runOnJS(finish)();
      },
    );
  }, [spinning, targetSegmentId, segments, slice, rotation]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const hubLabel = useMemo(() => {
    if (countdown != null) return String(countdown);
    return null;
  }, [countdown]);

  if (segments.length === 0) return null;

  const studs = Array.from({ length: num }, (_, i) => i);

  return (
    <View style={[styles.wrap, { width: size + pad, height: size + pad }]}>
      {/* Ambient glow */}
      <View
        style={[
          styles.glowOuter,
          {
            width: size + pad * 0.85,
            height: size + pad * 0.85,
            borderRadius: (size + pad * 0.85) / 2,
          },
        ]}
      />
      <View
        style={[
          styles.glowInner,
          {
            width: size + pad * 0.4,
            height: size + pad * 0.4,
            borderRadius: (size + pad * 0.4) / 2,
          },
        ]}
      />

      {/* Pointer */}
      <View style={[styles.pointerMount, { top: Math.max(0, pad / 2 - 14) }]}>
        <LinearGradient
          colors={['#4a4a5a', '#1a1a25']}
          style={[styles.pointerBar, { width: size < 280 ? 36 : 44, height: size < 280 ? 16 : 20 }]}
        >
          <View style={styles.pointerBarInset} />
        </LinearGradient>
        <View
          style={[
            styles.pointerBlade,
            size < 280 && {
              borderLeftWidth: 11,
              borderRightWidth: 11,
              borderTopWidth: 16,
            },
          ]}
        >
          <View style={styles.pointerBladeShine} />
        </View>
      </View>

      {/* Champagne rim */}
      <LinearGradient
        colors={[
          '#8a733f',
          '#e6ce92',
          '#b59b58',
          '#f8e7b5',
          '#b59b58',
          '#e6ce92',
          '#8a733f',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.rim,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {/* Rim studs */}
        {studs.map((i) => {
          const a = ((i + 0.5) * slice * Math.PI) / 180;
          const sr = size / 2 - 5;
          const cx = size / 2 + Math.sin(a) * sr;
          const cy = size / 2 - Math.cos(a) * sr;
          return (
            <View
              key={`stud-${i}`}
              style={[
                styles.stud,
                { left: cx - 3.5, top: cy - 3.5 },
              ]}
            />
          );
        })}

        <View
          style={[
            styles.rimInset,
            {
              width: trackSize,
              height: trackSize,
              borderRadius: trackSize / 2,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.track,
              {
                width: trackSize,
                height: trackSize,
                borderRadius: trackSize / 2,
              },
              wheelStyle,
            ]}
          >
            {/* Pasta dilimleri */}
            {segments.map((segment, index) => (
              <SliceFill
                key={`slice-${segment.id}`}
                color={segment.color || '#2a2a35'}
                angle={index * slice}
                slice={slice}
                radius={center}
              />
            ))}

            {/* Ayırıcı çizgiler */}
            {segments.map((_, index) => (
              <View
                key={`div-${index}`}
                pointerEvents="none"
                style={[
                  styles.divider,
                  {
                    left: center - 0.5,
                    height: center,
                    transform: [
                      { translateY: -center / 2 },
                      { rotate: `${index * slice + slice / 2}deg` },
                      { translateY: -center / 2 },
                    ],
                  },
                ]}
              />
            ))}

            {/* Madalyonlar */}
            {segments.map((segment, index) => {
              const angle = index * slice;
              const icon = ICONS[index % ICONS.length];
              return (
                <View
                  key={segment.id}
                  style={[
                    styles.medSlot,
                    {
                      width: medW,
                      height: medH,
                      left: center - medW / 2,
                      top: center - medH / 2,
                      transform: [
                        { rotate: `${angle}deg` },
                        { translateY: -radius },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      'rgba(255,255,255,0.22)',
                      segment.color || '#2a2a35',
                      'rgba(0,0,0,0.55)',
                    ]}
                    locations={[0, 0.35, 1]}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={[
                      styles.medallion,
                      {
                        width: medW,
                        height: medH,
                        borderRadius: medW / 2,
                      },
                    ]}
                  >
                    <View style={styles.medGlass} />
                    <Ionicons
                      name={icon}
                      size={Math.round(medW * 0.34)}
                      color="rgba(255,255,255,0.95)"
                      style={styles.medIcon}
                    />
                    <View style={styles.multBadge}>
                      <Text
                        style={[
                          styles.mult,
                          { fontSize: Math.max(9, Math.round(medW * 0.2)) },
                        ]}
                        numberOfLines={1}
                      >
                        {segment.label || `${segment.multiplier}x`}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </Animated.View>

          {/* Merkez hub */}
          <LinearGradient
            colors={['#e6ce92', '#8a733f', '#f8e7b5', '#b59b58']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.hubRim,
              {
                width: hubR * 2 + 6,
                height: hubR * 2 + 6,
                borderRadius: hubR + 3,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(40,45,60,0.95)', '#0a0a0f']}
              style={[
                styles.hub,
                {
                  width: hubR * 2,
                  height: hubR * 2,
                  borderRadius: hubR,
                },
              ]}
            >
              <View style={styles.hubGrid} />
              {hubLabel != null ? (
                <>
                  <Text style={styles.hubEyebrow}>{t('oyun.fairSpinSistem')}</Text>
                  <Text style={styles.hubCount}>{hubLabel}</Text>
                </>
              ) : (
                <>
                  <View style={styles.hubDot} />
                  <Text style={styles.hubReady}>{t('oyun.fairSpinHazir')}</Text>
                </>
              )}
            </LinearGradient>
          </LinearGradient>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
  },
  glowOuter: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  glowInner: {
    position: 'absolute',
    backgroundColor: 'rgba(230,206,146,0.07)',
  },
  pointerMount: {
    position: 'absolute',
    zIndex: 40,
    alignItems: 'center',
  },
  pointerBar: {
    width: 44,
    height: 20,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerBarInset: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pointerBlade: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 22,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#e6ce92',
  },
  pointerBladeShine: {
    position: 'absolute',
    top: -22,
    left: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  rim: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.95,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18,
    padding: 5,
  },
  stud: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#f8e7b5',
    borderWidth: 1,
    borderColor: 'rgba(138,115,63,0.8)',
    zIndex: 5,
  },
  rimInset: {
    backgroundColor: '#0e0e14',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  track: {
    backgroundColor: '#16161f',
    overflow: 'hidden',
  },
  sliceAnchor: {
    position: 'absolute',
    height: 0,
    alignItems: 'center',
    overflow: 'visible',
  },
  divider: {
    position: 'absolute',
    top: '50%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  medSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  medallion: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(230,206,146,0.35)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  medGlass: {
    position: 'absolute',
    top: 4,
    left: '10%',
    width: '80%',
    height: '28%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  medIcon: {
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  multBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: '92%',
  },
  mult: {
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  hubRim: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.9,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  hub: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hubGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  hubEyebrow: {
    fontSize: 8,
    fontWeight: '700',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  hubCount: {
    fontSize: 34,
    fontWeight: '300',
    color: '#fff',
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  hubDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22d3ee',
    marginBottom: 4,
    shadowColor: '#22d3ee',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  hubReady: {
    fontSize: 8,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
});
