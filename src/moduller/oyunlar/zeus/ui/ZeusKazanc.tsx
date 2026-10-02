import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TipografiTokenlari } from '../../../../tasarim-sistemi/TipografiTokenlari';
import {
  WIN_TIER_LABELS,
  winCountDurationMs,
} from '../config/ZeusSabitleri';
import type { ZeusWinTier } from '../tipler/ZeusTipleri';

type Props = {
  totalWin: number;
  baseWin: number;
  totalMultiplier: number;
  tier: ZeusWinTier;
  visible: boolean;
  compact?: boolean;
};

function ZeusKazancInner({
  totalWin,
  baseWin,
  totalMultiplier,
  tier,
  visible,
  compact = false,
}: Props) {
  const [displayedWin, setDisplayedWin] = useState(0);
  const [heldWin, setHeldWin] = useState(0);
  const [heldTier, setHeldTier] = useState<ZeusWinTier>('NONE');
  const [heldBase, setHeldBase] = useState(0);
  const [heldMult, setHeldMult] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pop = useSharedValue(1);
  const lastTargetRef = useRef(0);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!visible) {
      return;
    }

    if (totalWin <= 0) {
      setDisplayedWin(0);
      setHeldWin(0);
      setHeldTier('NONE');
      lastTargetRef.current = 0;
      return;
    }

    setHeldWin(totalWin);
    setHeldTier(tier);
    setHeldBase(baseWin);
    setHeldMult(totalMultiplier);

    const sameTarget = lastTargetRef.current === totalWin;
    lastTargetRef.current = totalWin;
    if (sameTarget) {
      setDisplayedWin(totalWin);
      return;
    }

    const duration = winCountDurationMs(tier);
    const startedAt = Date.now();
    const from = displayedWin > 0 && displayedWin < totalWin ? displayedWin : 0;
    setDisplayedWin(from);
    pop.value = 0.92;
    pop.value = withSequence(
      withTiming(1.1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 280 }),
    );
    timerRef.current = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedWin(from + (totalWin - from) * eased);
      if (progress >= 1 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setDisplayedWin(totalWin);
      }
    }, 32);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // displayedWin bilerek deps dışı — count-up sıfırlanmasın
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseWin, pop, tier, totalMultiplier, totalWin, visible]);

  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const showWin = visible && (totalWin > 0 || heldWin > 0);
  const showAmount = totalWin > 0 ? displayedWin : heldWin;
  const showTier = totalWin > 0 ? tier : heldTier;
  const showBase = totalWin > 0 ? baseWin : heldBase;
  const showMult = totalWin > 0 ? totalMultiplier : heldMult;

  if (!showWin) {
    return (
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        <Text style={styles.label}>KAZANÇ</Text>
        <Text style={[styles.idle, compact && styles.idleCompact]}>—</Text>
      </View>
    );
  }

  return (
    <Animated.View
      style={[styles.wrap, compact && styles.wrapCompact, styles.wrapWin, popStyle]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Kazanç ${Math.floor(showAmount).toLocaleString('tr-TR')} coin`}
    >
      <Text style={styles.label}>{WIN_TIER_LABELS[showTier] || 'KAZANÇ'}</Text>
      <View style={styles.row}>
        {showMult > 1 ? (
          <Text style={styles.formula}>
            {Math.floor(showBase).toLocaleString('tr-TR')} × {showMult} ={' '}
          </Text>
        ) : null}
        <Text style={[styles.value, compact && styles.valueCompact]}>
          {Math.floor(showAmount).toLocaleString('tr-TR')}
        </Text>
        <Text style={styles.coin}> COIN</Text>
      </View>
      <View style={styles.shine} pointerEvents="none" />
    </Animated.View>
  );
}

export const ZeusKazanc = memo(ZeusKazancInner);

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(12,14,24,0.55)',
    overflow: 'hidden',
  },
  wrapWin: {
    borderColor: 'rgba(246,226,122,0.75)',
    backgroundColor: 'rgba(28,18,8,0.82)',
  },
  wrapCompact: {
    minHeight: 40,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  label: {
    color: 'rgba(232,197,71,0.8)',
    fontSize: TipografiTokenlari.micro.fontSize,
    letterSpacing: 1.6,
    fontWeight: '800',
  },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  formula: {
    color: 'rgba(247,242,232,0.55)',
    fontSize: TipografiTokenlari.body.fontSize,
    fontWeight: '700',
  },
  value: {
    color: '#F6E27A',
    fontSize: 28,
    fontWeight: '900',
  },
  valueCompact: { fontSize: 22 },
  coin: {
    color: '#E8C547',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  shine: {
    position: 'absolute',
    top: -20,
    left: '18%',
    width: 42,
    height: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '22deg' }],
  },
  idle: {
    color: 'rgba(247,242,232,0.35)',
    fontSize: 22,
    fontWeight: '800',
  },
  idleCompact: { fontSize: 18 },
});
