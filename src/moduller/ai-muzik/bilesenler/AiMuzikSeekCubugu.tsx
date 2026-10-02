import React, { useCallback, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';

type Props = {
  positionSn: number;
  durationSn: number;
  disabled?: boolean;
  onSeek: (positionSn: number) => void;
  onSeekStart?: () => void;
  onSeekEnd?: (positionSn: number) => void;
};

function formatSn(s: number): string {
  const n = Math.max(0, Math.floor(s + 1e-6));
  return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`;
}

/** Tam saniyeye yuvarla (seek hedefi). */
function snYuvarla(sn: number, maxSn: number): number {
  const m = Math.max(0, maxSn);
  return Math.min(m, Math.max(0, Math.round(sn)));
}

/**
 * Hassas progress — locationX + saniye yuvarlama + ±1/±5 sn.
 */
export function AiMuzikSeekCubugu({
  positionSn,
  durationSn,
  disabled,
  onSeek,
  onSeekStart,
  onSeekEnd,
}: Props) {
  const genislik = useRef(1);
  const durationRef = useRef(durationSn);
  const disabledRef = useRef(!!disabled);
  const onSeekRef = useRef(onSeek);
  const onSeekStartRef = useRef(onSeekStart);
  const onSeekEndRef = useRef(onSeekEnd);
  const [suruklenen, setSuruklenen] = useState<number | null>(null);

  durationRef.current = durationSn;
  disabledRef.current = !!disabled;
  onSeekRef.current = onSeek;
  onSeekStartRef.current = onSeekStart;
  onSeekEndRef.current = onSeekEnd;

  const gosterilen = suruklenen ?? positionSn;
  const dur = Math.max(durationSn, 0);
  const pct = dur > 0 ? Math.min(1, Math.max(0, gosterilen / dur)) : 0;

  const xToSn = useCallback((locationX: number) => {
    const w = Math.max(genislik.current, 1);
    const p = Math.min(1, Math.max(0, locationX / w));
    return snYuvarla(p * durationRef.current, durationRef.current);
  }, []);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !disabledRef.current && durationRef.current > 0,
      onMoveShouldSetPanResponder: (_e, g) =>
        !disabledRef.current &&
        durationRef.current > 0 &&
        (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        const sn = xToSn(e.nativeEvent.locationX);
        setSuruklenen(sn);
        onSeekStartRef.current?.();
        onSeekRef.current(sn);
      },
      onPanResponderMove: (e) => {
        const sn = xToSn(e.nativeEvent.locationX);
        setSuruklenen(sn);
        onSeekRef.current(sn);
      },
      onPanResponderRelease: (e) => {
        const sn = xToSn(e.nativeEvent.locationX);
        setSuruklenen(null);
        onSeekEndRef.current?.(sn);
      },
      onPanResponderTerminate: () => setSuruklenen(null),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    genislik.current = Math.max(e.nativeEvent.layout.width, 1);
  };

  const adim = (delta: number) => {
    if (disabled || dur <= 0) return;
    const base = suruklenen ?? positionSn;
    const sn = snYuvarla(base + delta, dur);
    setSuruklenen(sn);
    onSeekStartRef.current?.();
    onSeekRef.current(sn);
    onSeekEndRef.current?.(sn);
    setSuruklenen(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.adimRow}>
        <Pressable
          onPress={() => adim(-5)}
          disabled={disabled}
          hitSlop={8}
          style={styles.adimBtn}
          accessibilityLabel="5 saniye geri"
        >
          <Ionicons name="play-back" size={16} color={RenkTokenlari.text} />
          <Text style={styles.adimYazi}>5</Text>
        </Pressable>
        <Pressable
          onPress={() => adim(-1)}
          disabled={disabled}
          hitSlop={8}
          style={styles.adimBtn}
          accessibilityLabel="1 saniye geri"
        >
          <Text style={styles.adimYazi}>-1s</Text>
        </Pressable>
        <Text style={styles.canliSn} accessibilityLabel={`Saniye ${formatSn(gosterilen)}`}>
          {formatSn(gosterilen)}
        </Text>
        <Pressable
          onPress={() => adim(1)}
          disabled={disabled}
          hitSlop={8}
          style={styles.adimBtn}
          accessibilityLabel="1 saniye ileri"
        >
          <Text style={styles.adimYazi}>+1s</Text>
        </Pressable>
        <Pressable
          onPress={() => adim(5)}
          disabled={disabled}
          hitSlop={8}
          style={styles.adimBtn}
          accessibilityLabel="5 saniye ileri"
        >
          <Ionicons name="play-forward" size={16} color={RenkTokenlari.text} />
          <Text style={styles.adimYazi}>5</Text>
        </Pressable>
      </View>

      <View
        style={styles.trackHit}
        onLayout={onLayout}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="İlerleme saniyesi"
        accessibilityValue={{
          min: 0,
          max: Math.floor(dur),
          now: Math.floor(gosterilen),
        }}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
          <View
            style={[
              styles.thumb,
              { left: `${pct * 100}%`, transform: [{ translateX: -10 }] },
            ]}
            pointerEvents="none"
          />
        </View>
      </View>
      <View style={styles.zamanRow}>
        <Text style={styles.zaman}>{formatSn(gosterilen)}</Text>
        <Text style={styles.zaman}>{formatSn(dur)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  adimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  adimBtn: {
    minWidth: 40,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: RenkTokenlari.surface,
  },
  adimYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  canliSn: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.primarySoft,
    fontVariant: ['tabular-nums'],
    minWidth: 56,
    textAlign: 'center',
  },
  trackHit: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.border,
    overflow: 'visible',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  thumb: {
    position: 'absolute',
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: RenkTokenlari.primarySoft,
  },
  zamanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  zaman: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontVariant: ['tabular-nums'],
  },
});
