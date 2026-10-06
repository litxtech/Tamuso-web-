import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FRUIT_ACCENT,
  FRUIT_IMAGES,
  FRUIT_ORDER,
  FRUIT_SEGMENT,
  SEGMENT_DEG,
  fruitIndex,
  type FruitId,
} from '../sabitler/FruitWheelSabitleri';
import { wheelSpinPlan } from '../math/FruitWheelGeometri';
import { fruitWheelSes } from '../ses/FruitWheelAudio';
import type { PublicFruit } from '../tipler/FruitWheelTipleri';

const LIGHTS = 8;
const HALF_RAD = ((SEGMENT_DEG / 2) * Math.PI) / 180;

type Mode = 'open' | 'lock' | 'spin' | 'result';

type Props = {
  fruits: PublicFruit[];
  stakes: Record<string, number>;
  spinning: boolean;
  targetFruitId: string | null;
  winnerFruitId: string | null;
  roundNo: number;
  names: Record<string, string>;
  size?: number;
  mode?: Mode;
  interactive?: boolean;
  selectedFruitId?: FruitId | null;
  onFruitPress?: (id: FruitId) => void;
  onSettled: () => void;
};

type TikOlayi = {
  nativeEvent?: {
    locationX?: number;
    locationY?: number;
    offsetX?: number;
    offsetY?: number;
    clientX?: number;
    clientY?: number;
  };
  currentTarget?: unknown;
};

function sayiMi(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Native `locationX` verir. Web tıklamasında nativeEvent bir MouseEvent'tir;
 * locationX yoktur, offsetX / clientX vardır. Yoksa bahis sessizce düşer.
 */
function tikNoktasi(e: TikOlayi, yedek: { getBoundingClientRect?: () => { left: number; top: number } } | null): { x: number; y: number } | null {
  const ne = e.nativeEvent;
  if (!ne) return null;
  if (sayiMi(ne.locationX) && sayiMi(ne.locationY)) {
    return { x: ne.locationX, y: ne.locationY };
  }
  if (sayiMi(ne.offsetX) && sayiMi(ne.offsetY)) {
    return { x: ne.offsetX, y: ne.offsetY };
  }
  const dugum = (e.currentTarget ?? yedek) as { getBoundingClientRect?: () => { left: number; top: number } } | null;
  const kutu = dugum?.getBoundingClientRect?.();
  if (kutu && sayiMi(ne.clientX) && sayiMi(ne.clientY)) {
    return { x: ne.clientX - kutu.left, y: ne.clientY - kutu.top };
  }
  return null;
}

/** Tık: merkezden açı → dilim (dönüş hesaba katılır). */
function hitFruitId(x: number, y: number, size: number, rotationDeg: number): FruitId | null {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < size * 0.1 || r > size * 0.5) return null;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const rot = ((rotationDeg % 360) + 360) % 360;
  const local = ((deg - rot) % 360 + 360) % 360;
  const idx = Math.round(local / SEGMENT_DEG) % FRUIT_ORDER.length;
  return FRUIT_ORDER[idx] ?? null;
}

function formatStake(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10}K`.replace('.0K', 'K');
  return String(n);
}

function Segment({
  index,
  color,
  dim,
  radius,
}: {
  index: number;
  color: string;
  dim: boolean;
  radius: number;
}) {
  const h = radius + 4;
  const base = Math.ceil(2 * h * Math.tan(HALF_RAD));
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: base,
        height: h,
        left: radius - base / 2,
        top: radius - h,
        opacity: dim ? 0.36 : 1,
        transformOrigin: '50% 100%',
        transform: [{ rotate: `${index * SEGMENT_DEG}deg` }],
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: base / 2,
          borderRightWidth: base / 2,
          borderTopWidth: h,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
    </View>
  );
}

function FruitMark({
  fruit,
  index,
  radius,
  rotation,
  stake,
  dim,
  win,
  selected,
}: {
  fruit: PublicFruit;
  index: number;
  radius: number;
  rotation: SharedValue<number>;
  stake: number;
  dim: boolean;
  win: boolean;
  selected: boolean;
}) {
  const art = Math.round(radius * 0.28);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!win) {
      pop.value = withTiming(selected ? 1.08 : 1, { duration: 180 });
      return;
    }
    pop.value = withSequence(
      withTiming(1.25, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(1.12, { duration: 220 }),
    );
  }, [pop, selected, win]);

  const badge = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-(rotation.value + index * SEGMENT_DEG)}deg` }],
  }));
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));
  const high = fruit.multiplier >= 10;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: art + 8,
        height: radius,
        left: radius - (art + 8) / 2,
        top: 0,
        alignItems: 'center',
        paddingTop: radius * 0.1,
        opacity: dim ? 0.4 : 1,
        transformOrigin: '50% 100%',
        transform: [{ rotate: `${index * SEGMENT_DEG}deg` }],
      }}
    >
      <Animated.View style={[artStyle, selected && styles.markOn]}>
        <Image source={FRUIT_IMAGES[fruit.id]} style={{ width: art, height: art }} resizeMode="contain" />
      </Animated.View>
      {fruit.multiplier > 0 ? (
        <Animated.View style={[styles.badge, high && styles.badgeHigh, badge]}>
          <Text style={[styles.badgeText, high && styles.badgeTextHigh]}>x{fruit.multiplier}</Text>
        </Animated.View>
      ) : null}
      {stake > 0 ? (
        <Animated.View style={[styles.stake, badge]}>
          <Text style={styles.stakeText}>{formatStake(stake)}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Light({ index, radius }: { index: number; radius: number }) {
  const ang = (index / LIGHTS) * Math.PI * 2;
  const r = radius - 8;
  const x = radius + Math.sin(ang) * r;
  const y = radius - Math.cos(ang) * r;
  return (
    <View
      pointerEvents="none"
      style={[styles.light, { left: x - 2, top: y - 2 }]}
    />
  );
}

export const FruitWheelCarki = React.memo(function FruitWheelCarki({
  fruits,
  stakes,
  spinning,
  targetFruitId,
  winnerFruitId,
  roundNo,
  size = 300,
  interactive = false,
  selectedFruitId = null,
  onFruitPress,
  onSettled,
}: Props) {
  const rotation = useSharedValue(0);
  const pointer = useSharedValue(0);
  const lastTick = useRef(0);
  const spunKey = useRef<string | null>(null);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;
  const onFruitPressRef = useRef(onFruitPress);
  onFruitPressRef.current = onFruitPress;
  const tikRef = useRef<View>(null);
  const fruitsRef = useRef(fruits);
  fruitsRef.current = fruits;

  const ordered = useMemo(() => {
    const byId = new Map(fruits.map((f) => [f.id, f]));
    return FRUIT_ORDER.map((id) => byId.get(id)).filter((f): f is PublicFruit => Boolean(f));
  }, [fruits]);

  const tick = (_strong: boolean) => {
    const now = Date.now();
    // Çok seyrek ses — ısı / titreşim yükü yok
    if (now - lastTick.current < 280) return;
    lastTick.current = now;
    fruitWheelSes('pointer-tick');
  };

  useEffect(() => {
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pointer);
    };
  }, [pointer, rotation]);

  useAnimatedReaction(
    () => Math.floor(rotation.value / SEGMENT_DEG),
    (cur, prev) => {
      if (prev == null || cur === prev || !spinning) return;
      const mod = ((rotation.value % 360) + 360) % 360;
      const strong = mod < SEGMENT_DEG * 4 || mod > 360 - SEGMENT_DEG;
      pointer.value = withSequence(
        withTiming(strong ? 6 : 3, { duration: 36 }),
        withTiming(0, { duration: 70 }),
      );
      runOnJS(tick)(strong);
    },
  );

  useEffect(() => {
    if (!spinning) {
      spunKey.current = null;
      return;
    }
    if (!targetFruitId) return;
    // Tur no değişse bile aynı hedef için animasyonu yeniden başlatma (atlama/tilt)
    const lock = `spin:${targetFruitId}`;
    if (spunKey.current === lock) return;
    spunKey.current = lock;
    const index = fruitIndex(targetFruitId);
    const plan = wheelSpinPlan(index, roundNo);
    const current = rotation.value;
    const currentMod = ((current % 360) + 360) % 360;
    const slot = ((plan.rest % 360) + 360) % 360;
    const forward = (slot - currentMod + 360) % 360;
    const turns = Math.max(4, Math.min(plan.turns, 5));
    const target = current + turns * 360 + forward;
    fruitWheelSes('wheel-start');
    rotation.value = withSequence(
      withTiming(current - 6, { duration: 70, easing: Easing.out(Easing.quad) }),
      withTiming(target + plan.overshoot, {
        duration: 2200,
        easing: Easing.bezier(0.05, 0.85, 0.12, 1),
      }),
      withTiming(target, { duration: 220, easing: Easing.out(Easing.cubic) }, (done) => {
        if (done) runOnJS(onSettledRef.current)();
      }),
    );
  }, [spinning, targetFruitId, roundNo, rotation]);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  const pointerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pointer.value }],
  }));

  const disc = size - 16;
  const radius = disc / 2;
  const shown = ordered.length > 0
    ? ordered
    : FRUIT_ORDER.map((id) => ({
        id,
        multiplier: 0,
        accent: FRUIT_ACCENT[id],
        enabled: true,
        tier: 'NORMAL' as const,
      }));

  const onDiscPress = useCallback(
    (e: TikOlayi) => {
      if (!interactive || spinning) return;
      const nokta = tikNoktasi(e, tikRef.current);
      if (!nokta) return;
      const id = hitFruitId(nokta.x, nokta.y, size, rotation.value);
      if (!id) return;
      const fruit = fruitsRef.current.find((f) => f.id === id);
      if (fruit && fruit.enabled === false) return;
      onFruitPressRef.current?.(id);
    },
    [interactive, rotation, size, spinning],
  );

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" style={[styles.halo, { width: size, height: size, borderRadius: size / 2 }]} />
      {!spinning ? (
        <View pointerEvents="none" style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
          {Array.from({ length: LIGHTS }, (_, i) => (
            <Light key={i} index={i} radius={size / 2} />
          ))}
        </View>
      ) : null}
      <Animated.View
        style={[
          styles.disc,
          { width: disc, height: disc, borderRadius: radius, top: 8, left: 8 },
          wheelStyle,
        ]}
        pointerEvents="none"
      >
        {shown.map((fruit) => (
          <Segment
            key={`s-${fruit.id}`}
            index={fruitIndex(fruit.id)}
            color={FRUIT_SEGMENT[fruit.id as FruitId] ?? '#3E2478'}
            dim={Boolean(winnerFruitId) && winnerFruitId !== fruit.id}
            radius={radius}
          />
        ))}
        {shown.map((fruit) => {
          const i = fruitIndex(fruit.id);
          return (
            <View
              key={`d-${fruit.id}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 1.5,
                height: radius - 4,
                left: radius - 0.75,
                top: 4,
                backgroundColor: 'rgba(244,212,122,0.75)',
                transformOrigin: '50% 100%',
                transform: [{ rotate: `${i * SEGMENT_DEG - SEGMENT_DEG / 2}deg` }],
              }}
            />
          );
        })}
        {shown.map((fruit) => (
          <FruitMark
            key={fruit.id}
            fruit={fruit}
            index={fruitIndex(fruit.id)}
            radius={radius}
            rotation={rotation}
            stake={stakes[fruit.id] ?? 0}
            dim={Boolean(winnerFruitId) && winnerFruitId !== fruit.id}
            win={winnerFruitId === fruit.id}
            selected={selectedFruitId === fruit.id}
          />
        ))}
      </Animated.View>
      <View pointerEvents="none" style={[styles.hub, { width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1 }]}>
        <Text style={styles.hubTop}>FRUIT</Text>
        <Text style={styles.hubBot}>WHEEL</Text>
      </View>
      <Animated.View pointerEvents="none" style={[styles.pointer, pointerStyle]}>
        <LinearGradient colors={['#FFE6A3', '#D7AE55']} style={styles.pointerCap} />
        <View style={styles.pointerTip} />
      </Animated.View>
      {interactive ? (
        <Pressable
          ref={tikRef}
          style={StyleSheet.absoluteFill}
          disabled={spinning}
          onPress={onDiscPress}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    backgroundColor: 'rgba(109,59,245,0.22)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 10,
    borderColor: '#D7AE55',
  },
  disc: {
    position: 'absolute',
    backgroundColor: '#130B20',
    overflow: 'hidden',
  },
  hub: {
    position: 'absolute',
    backgroundColor: '#1A1030',
    borderWidth: 3,
    borderColor: '#F4D47A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  hubTop: { color: '#FFE6A3', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  hubBot: { color: '#E8E4F0', fontSize: 8, fontWeight: '700', letterSpacing: 0.6 },
  markOn: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#F4D47A',
    backgroundColor: 'rgba(244,212,122,0.18)',
  },
  badge: {
    marginTop: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(7,6,13,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(244,212,122,0.45)',
  },
  badgeHigh: { borderColor: '#F4D47A', backgroundColor: 'rgba(90,60,10,0.8)' },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  badgeTextHigh: { color: '#FFE6A3' },
  stake: {
    marginTop: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(109,59,245,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,230,163,0.55)',
  },
  stakeText: { color: '#FFE6A3', fontSize: 11, fontWeight: '900', letterSpacing: 0.2 },
  light: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pointer: {
    position: 'absolute',
    top: 2,
    zIndex: 6,
    alignItems: 'center',
  },
  pointerCap: { width: 16, height: 10, borderRadius: 4 },
  pointerTip: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D7AE55',
  },
});
