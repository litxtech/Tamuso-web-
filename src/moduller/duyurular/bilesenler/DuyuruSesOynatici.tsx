import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Props = {
  uri: string;
  durationMs?: number | null;
  onStart?: () => void;
  onComplete?: () => void;
  onProgress?: (oran: number) => void;
};

function sure(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

type Oynatici = {
  play: () => void;
  pause: () => void;
  seekTo?: (s: number) => void;
  remove?: () => void;
  release?: () => void;
  currentTime?: number;
  duration?: number;
  playing?: boolean;
  playbackRate?: number;
};

export function DuyuruSesOynatici({ uri, durationMs, onStart, onComplete, onProgress }: Props) {
  const oynatici = useRef<Oynatici | null>(null);
  const [caliyor, setCaliyor] = useState(false);
  const [gecen, setGecen] = useState(0);
  const [toplam, setToplam] = useState((durationMs ?? 0) / 1000);
  const [hiz, setHiz] = useState(1);
  const basladi = useRef(false);
  const bitti = useRef(false);
  const esikler = useRef(new Set<number>());

  useEffect(() => {
    return () => {
      try {
        oynatici.current?.pause();
        oynatici.current?.remove?.();
        oynatici.current?.release?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  useEffect(() => {
    if (!caliyor) return;
    const t = setInterval(() => {
      const p = oynatici.current;
      if (!p) return;
      const cur = Number(p.currentTime ?? 0);
      const dur = Number(p.duration ?? 0) || toplam;
      setGecen(cur);
      if (dur > 0) setToplam(dur);
      const oran = dur > 0 ? cur / dur : 0;
      onProgress?.(oran);
      for (const esik of [0.25, 0.5, 0.75]) {
        if (oran >= esik && !esikler.current.has(esik)) {
          esikler.current.add(esik);
          onProgress?.(esik);
        }
      }
      if (dur > 0 && oran >= 0.9 && !bitti.current) {
        bitti.current = true;
        onComplete?.();
      }
    }, 400);
    return () => clearInterval(t);
  }, [caliyor, onComplete, onProgress, toplam]);

  const toggle = () => {
    if (!oynatici.current) {
      const p = createAudioPlayer({ uri }) as Oynatici;
      p.playbackRate = hiz;
      oynatici.current = p;
    }
    const p = oynatici.current;
    if (caliyor) {
      p.pause();
      setCaliyor(false);
      return;
    }
    p.play();
    setCaliyor(true);
    if (!basladi.current) {
      basladi.current = true;
      onStart?.();
    }
  };

  const hizDegis = () => {
    const siradaki = hiz === 1 ? 1.5 : hiz === 1.5 ? 2 : 1;
    setHiz(siradaki);
    if (oynatici.current) oynatici.current.playbackRate = siradaki;
  };

  const oran = toplam > 0 ? Math.min(1, gecen / toplam) : 0;

  return (
    <View style={styles.kutu}>
      <Pressable onPress={toggle} style={styles.oynat} accessibilityRole="button">
        <Text style={styles.oynatYazi}>{caliyor ? '❚❚' : '▶'}</Text>
      </Pressable>
      <Text style={styles.sure}>{sure(gecen * 1000)}</Text>
      <View style={styles.cubuk}>
        <View style={[styles.dolu, { width: `${oran * 100}%` }]} />
      </View>
      <Text style={styles.sure}>{sure(toplam * 1000)}</Text>
      <Pressable onPress={hizDegis} accessibilityRole="button">
        <Text style={styles.hiz}>{hiz === 1 ? '1x' : `${hiz}x`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  kutu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    padding: BoslukTokenlari.sm,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  oynat: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primarySoft,
  },
  oynatYazi: { color: '#fff', fontWeight: '700' },
  sure: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, width: 36 },
  cubuk: { flex: 1, height: 4, borderRadius: 2, backgroundColor: RenkTokenlari.border, overflow: 'hidden' },
  dolu: { height: 4, backgroundColor: RenkTokenlari.accent },
  hiz: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, width: 28 },
});
