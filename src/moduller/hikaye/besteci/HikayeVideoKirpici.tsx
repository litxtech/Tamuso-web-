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
export type HikayeVideoTrim = {
  startMs: number;
  endMs: number;
};

type Props = {
  durationMs: number;
  trim: HikayeVideoTrim;
  onChange: (trim: HikayeVideoTrim) => void;
};

const MIN_MS = 500;
const KULP = 22;

function snYazi(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/**
 * Sürüklemeli video kırpma — pencere tüm videoyu kapsar (süre limiti yok).
 */
export function HikayeVideoKirpici({ durationMs, trim, onChange }: Props) {
  const { t } = useCeviri();
  const [barW, setBarW] = useState(300);

  const kaynakMs = Math.max(1000, durationMs > 0 ? durationMs : 30_000);
  const toplam = kaynakMs;
  const maxPencere = toplam;

  const start = Math.min(Math.max(0, trim.startMs), Math.max(0, toplam - MIN_MS));
  const end = Math.min(
    toplam,
    Math.max(trim.endMs, start + MIN_MS),
    start + maxPencere,
  );

  const startX = useSharedValue((start / toplam) * Math.max(barW, 1));
  const endX = useSharedValue((end / toplam) * Math.max(barW, 1));
  const basStart = useSharedValue(0);
  const basEnd = useSharedValue(0);
  const wSv = useSharedValue(Math.max(barW, 1));
  const toplamSv = useSharedValue(toplam);

  React.useEffect(() => {
    wSv.value = Math.max(barW, 1);
    toplamSv.value = toplam;
    startX.value = (start / toplam) * Math.max(barW, 1);
    endX.value = (end / toplam) * Math.max(barW, 1);
  }, [barW, toplam, start, end, startX, endX, wSv, toplamSv]);

  const bildir = (sMs: number, eMs: number) => {
    let s = Math.max(0, Math.min(sMs, toplam - MIN_MS));
    let e = Math.max(s + MIN_MS, Math.min(eMs, toplam));
    if (e - s > maxPencere) {
      // Hangi kenar taştıysa pencereyi max’e çek
      if (Math.abs(s - start) > Math.abs(e - end)) {
        s = Math.max(0, e - maxPencere);
      } else {
        e = Math.min(toplam, s + maxPencere);
      }
    }
    onChange({ startMs: Math.round(s), endMs: Math.round(e) });
  };

  const solPan = Gesture.Pan()
    .onBegin(() => {
      basStart.value = startX.value;
    })
    .onUpdate((e) => {
      const maxX = endX.value - (MIN_MS / toplamSv.value) * wSv.value;
      const minX = endX.value - (maxPencere / toplamSv.value) * wSv.value;
      startX.value = Math.min(
        Math.max(Math.max(0, minX), basStart.value + e.translationX),
        maxX,
      );
    })
    .onEnd(() => {
      const sMs = (startX.value / wSv.value) * toplamSv.value;
      const eMs = (endX.value / wSv.value) * toplamSv.value;
      runOnJS(bildir)(Math.round(sMs), Math.round(eMs));
    });

  const sagPan = Gesture.Pan()
    .onBegin(() => {
      basEnd.value = endX.value;
    })
    .onUpdate((e) => {
      const minX = startX.value + (MIN_MS / toplamSv.value) * wSv.value;
      const maxX = startX.value + (maxPencere / toplamSv.value) * wSv.value;
      endX.value = Math.max(
        minX,
        Math.min(Math.min(wSv.value, maxX), basEnd.value + e.translationX),
      );
    })
    .onEnd(() => {
      const sMs = (startX.value / wSv.value) * toplamSv.value;
      const eMs = (endX.value / wSv.value) * toplamSv.value;
      runOnJS(bildir)(Math.round(sMs), Math.round(eMs));
    });

  const ortaPan = Gesture.Pan()
    .onBegin(() => {
      basStart.value = startX.value;
      basEnd.value = endX.value;
    })
    .onUpdate((e) => {
      const gen = basEnd.value - basStart.value;
      let ns = basStart.value + e.translationX;
      ns = Math.max(0, Math.min(ns, wSv.value - gen));
      startX.value = ns;
      endX.value = ns + gen;
    })
    .onEnd(() => {
      const sMs = (startX.value / wSv.value) * toplamSv.value;
      const eMs = (endX.value / wSv.value) * toplamSv.value;
      runOnJS(bildir)(Math.round(sMs), Math.round(eMs));
    });

  const pencereStil = useAnimatedStyle(() => ({
    left: startX.value,
    width: Math.max(KULP, endX.value - startX.value),
  }));

  const solStil = useAnimatedStyle(() => ({
    left: startX.value - KULP / 2,
  }));

  const sagStil = useAnimatedStyle(() => ({
    left: endX.value - KULP / 2,
  }));

  const sureMetin = useMemo(
    () => `${snYazi(start)} – ${snYazi(end)} · ${snYazi(end - start)}`,
    [start, end],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.baslik}>{t('hikaye.videoKirp')}</Text>
      <Text style={styles.sure}>{sureMetin}</Text>
      <View
        style={styles.bar}
        onLayout={(e: LayoutChangeEvent) =>
          setBarW(e.nativeEvent.layout.width)
        }
      >
        <View style={styles.barBg} />
        <GestureDetector gesture={ortaPan}>
          <Animated.View style={[styles.pencere, pencereStil]} />
        </GestureDetector>
        <GestureDetector gesture={solPan}>
          <Animated.View style={[styles.kulp, solStil]}>
            <View style={styles.kulpIc} />
          </Animated.View>
        </GestureDetector>
        <GestureDetector gesture={sagPan}>
          <Animated.View style={[styles.kulp, sagStil]}>
            <View style={styles.kulpIc} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  baslik: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '700',
  },
  sure: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.75)',
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
    backgroundColor: 'rgba(232,64,145,0.45)',
    borderWidth: 2,
    borderColor: RenkTokenlari.primary,
  },
  kulp: {
    position: 'absolute',
    width: KULP,
    height: 36,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  kulpIc: {
    width: 10,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
});
