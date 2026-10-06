import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import { HIKAYE_MUZIK_KLIP_MS } from '../sabitler';

type Props = {
  title: string;
  trackDurationMs: number | null;
  clipStartMs: number;
  onChangeStart: (ms: number) => void;
};

function snYazi(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/**
 * Instagram tarzı sürüklemeli 15 sn müzik seçici.
 */
export function HikayeMuzikKlipSecici({
  title,
  trackDurationMs,
  clipStartMs,
  onChangeStart,
}: Props) {
  const { t } = useCeviri();
  const [barW, setBarW] = useState(300);
  const klip = HIKAYE_MUZIK_KLIP_MS;
  const toplam = Math.max(klip, trackDurationMs ?? klip);
  const maxStart = Math.max(0, toplam - klip);
  const pencereOran = Math.min(1, klip / toplam);
  const pencereW = Math.max(24, pencereOran * barW);
  const left = maxStart > 0 ? (clipStartMs / maxStart) * (barW - pencereW) : 0;

  const x = useSharedValue(left);
  const basX = useSharedValue(0);
  const wSv = useSharedValue(barW);
  const pencereWSv = useSharedValue(pencereW);
  const maxStartSv = useSharedValue(maxStart);

  React.useEffect(() => {
    wSv.value = barW;
    pencereWSv.value = pencereW;
    maxStartSv.value = maxStart;
    x.value = left;
  }, [barW, pencereW, left, maxStart, x, wSv, pencereWSv, maxStartSv]);

  const bildir = (ms: number) => {
    onChangeStart(Math.max(0, Math.min(maxStart, Math.round(ms))));
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      basX.value = x.value;
    })
    .onUpdate((e) => {
      const maxL = Math.max(0, wSv.value - pencereWSv.value);
      x.value = Math.min(Math.max(0, basX.value + e.translationX), maxL);
    })
    .onEnd(() => {
      const maxL = Math.max(0, wSv.value - pencereWSv.value);
      const oran = maxL > 0 ? x.value / maxL : 0;
      runOnJS(bildir)(oran * maxStartSv.value);
    });

  const stil = useAnimatedStyle(() => ({
    left: x.value,
    width: pencereWSv.value,
  }));

  const ipucu = useMemo(
    () =>
      t('hikaye.muzikKlipIpucu', {
        sn: Math.round(klip / 1000),
      }),
    [t, klip],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.baslik} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.ipucu}>{ipucu}</Text>
      <Text style={styles.sure}>
        {snYazi(clipStartMs)} – {snYazi(clipStartMs + klip)}
      </Text>
      <View
        style={styles.bar}
        onLayout={(e: LayoutChangeEvent) =>
          setBarW(e.nativeEvent.layout.width)
        }
      >
        <View style={styles.barBg} />
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.pencere, stil]}>
            <View style={styles.kulpIc} />
            <View style={[styles.kulpIc, styles.kulpSag]} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '700',
  },
  ipucu: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.65)',
  },
  sure: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  bar: {
    height: 36,
    justifyContent: 'center',
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  pencere: {
    position: 'absolute',
    height: 28,
    top: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(232,64,145,0.5)',
    borderWidth: 2,
    borderColor: RenkTokenlari.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  kulpIc: {
    width: 8,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  kulpSag: {},
});
