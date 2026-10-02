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
  positionMs: number;
  durationMs: number;
  playing: boolean;
  disabled?: boolean;
  onSeek: (positionMs: number) => void;
  onSkip?: (deltaMs: number) => void;
  onPlayPause?: () => void;
};

function msMetin(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Oda müziği — locationX + saniye yuvarlama + ±10 sn */
export function OdaMuzikSeekCubugu({
  positionMs,
  durationMs,
  playing,
  disabled,
  onSeek,
  onSkip,
  onPlayPause,
}: Props) {
  const genislik = useRef(1);
  const durationRef = useRef(durationMs);
  const disabledRef = useRef(!!disabled);
  const onSeekRef = useRef(onSeek);
  const [suruklenen, setSuruklenen] = useState<number | null>(null);

  durationRef.current = durationMs;
  disabledRef.current = !!disabled;
  onSeekRef.current = onSeek;

  const gosterilen = suruklenen ?? positionMs;
  const pct =
    durationMs > 0 ? Math.min(1, Math.max(0, gosterilen / durationMs)) : 0;

  const xToMs = useCallback((locationX: number) => {
    const w = Math.max(genislik.current, 1);
    const p = Math.min(1, Math.max(0, locationX / w));
    const sn = Math.round((p * Math.max(durationRef.current, 0)) / 1000);
    return sn * 1000;
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
        const ms = xToMs(e.nativeEvent.locationX);
        setSuruklenen(ms);
      },
      onPanResponderMove: (e) => {
        const ms = xToMs(e.nativeEvent.locationX);
        setSuruklenen(ms);
      },
      onPanResponderRelease: (e) => {
        const ms = xToMs(e.nativeEvent.locationX);
        setSuruklenen(null);
        onSeekRef.current(ms);
      },
      onPanResponderTerminate: () => setSuruklenen(null),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    genislik.current = Math.max(e.nativeEvent.layout.width, 1);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.ctrls}>
        <Pressable
          onPress={() => onSkip?.(-10_000)}
          disabled={disabled}
          hitSlop={8}
          accessibilityLabel="10 saniye geri"
          style={styles.skipBtn}
        >
          <Ionicons name="play-back" size={18} color={RenkTokenlari.text} />
          <Text style={styles.skipYazi}>10</Text>
        </Pressable>
        {onPlayPause ? (
          <Pressable
            onPress={onPlayPause}
            disabled={disabled}
            hitSlop={8}
            accessibilityLabel={playing ? 'Duraklat' : 'Oynat'}
            style={styles.playBtn}
          >
            <Ionicons
              name={playing ? 'pause' : 'play'}
              size={22}
              color={RenkTokenlari.primarySoft}
            />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => onSkip?.(10_000)}
          disabled={disabled}
          hitSlop={8}
          accessibilityLabel="10 saniye ileri"
          style={styles.skipBtn}
        >
          <Ionicons name="play-forward" size={18} color={RenkTokenlari.text} />
          <Text style={styles.skipYazi}>10</Text>
        </Pressable>
      </View>

      <View
        style={styles.trackHit}
        onLayout={onLayout}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="İlerleme"
        accessibilityValue={{
          min: 0,
          max: Math.floor(durationMs / 1000),
          now: Math.floor(gosterilen / 1000),
        }}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
          <View
            style={[
              styles.thumb,
              { left: `${pct * 100}%`, transform: [{ translateX: -8 }] },
            ]}
            pointerEvents="none"
          />
        </View>
      </View>

      <View style={styles.zamanRow}>
        <Text style={styles.zaman}>{msMetin(gosterilen)}</Text>
        <Text style={styles.zaman}>{msMetin(durationMs)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 8 },
  ctrls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  skipBtn: {
    alignItems: 'center',
    minWidth: 44,
    minHeight: 36,
    justifyContent: 'center',
  },
  skipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: -2,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primarySoft + '22',
  },
  trackHit: {
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'visible',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  thumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: RenkTokenlari.primarySoft,
  },
  zamanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zaman: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontVariant: ['tabular-nums'],
  },
});
