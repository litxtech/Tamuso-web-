import React, { useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AiMuzikSesSeviyesiAl,
  AiMuzikSesSeviyesiAyarla,
} from '../oynatici/AiMuzikOynatici';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';

type Props = {
  disabled?: boolean;
  onChange?: (v: number) => void;
};

/** 0.05–1.0 ses çubuğu */
export function AiMuzikSesCubugu({ disabled, onChange }: Props) {
  const [vol, setVol] = useState(() => AiMuzikSesSeviyesiAl());
  const genislik = useRef(1);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const uygula = (v: number) => {
    const n = Math.min(1, Math.max(0.05, Math.round(v * 100) / 100));
    setVol(n);
    AiMuzikSesSeviyesiAyarla(n);
    onChangeRef.current?.(n);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (e) => {
        const w = Math.max(genislik.current, 1);
        uygula(e.nativeEvent.locationX / w);
      },
      onPanResponderMove: (e) => {
        const w = Math.max(genislik.current, 1);
        uygula(e.nativeEvent.locationX / w);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    genislik.current = Math.max(e.nativeEvent.layout.width, 1);
  };

  const pct = vol;

  return (
    <View style={styles.wrap}>
      <Ionicons
        name={vol < 0.2 ? 'volume-low' : 'volume-high'}
        size={18}
        color={RenkTokenlari.textDim}
      />
      <View
        style={styles.trackHit}
        onLayout={onLayout}
        {...pan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Ses seviyesi"
        accessibilityValue={{ min: 5, max: 100, now: Math.round(vol * 100) }}
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
      <Text style={styles.yuzde}>{Math.round(vol * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 10,
  },
  trackHit: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.border,
    overflow: 'visible',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: RenkTokenlari.text,
  },
  thumb: {
    position: 'absolute',
    top: -5.5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: RenkTokenlari.text,
  },
  yuzde: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
});
