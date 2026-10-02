import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCeviri } from '../../i18n/useCeviri';
import type { StudioOyun } from './StudioApi';
import { RenkTokenlari } from '../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../tasarim-sistemi/BoslukVeYaricapTokenlari';

type Plan = NonNullable<StudioOyun['plan']>;
type Oge = { label: string; detail: string; delta: number };
type Oturum = {
  title: string;
  summary: string;
  kind: 'hidden_pick' | 'choice';
  startScore: number;
  endBelow: number | null;
  rounds: number;
  shuffle: boolean;
  items: Oge[];
};

function karistir<T>(liste: T[]): T[] {
  const kopya = [...liste];
  for (let i = kopya.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = kopya[i];
    kopya[i] = kopya[j];
    kopya[j] = tmp;
  }
  return kopya;
}

function oturumKur(plan: Plan): Oturum | null {
  const hazir = (plan.items ?? []).filter((item) => item.label && Number.isFinite(item.delta));
  if (hazir.length >= 2) {
    return {
      title: plan.title || '',
      summary: plan.summary || '',
      kind: plan.kind === 'choice' ? 'choice' : 'hidden_pick',
      startScore: Number(plan.startScore ?? 0),
      endBelow: plan.endBelow == null ? null : Number(plan.endBelow),
      rounds: Math.min(30, Math.max(1, Number(plan.rounds ?? 8))),
      shuffle: plan.shuffle !== false,
      items: hazir.slice(0, 12),
    };
  }
  const metin = [plan.summary ?? '', ...(plan.assumptions ?? [])].join('\n');
  const bulunan = metin.match(/[+-]\d+/g)?.map((n) => Number(n)).filter((n) => n !== 0) ?? [];
  const tekil: number[] = [];
  for (const n of bulunan) if (!tekil.includes(n)) tekil.push(n);
  if (tekil.length < 2) return null;
  const bas = metin.match(/(\d{3,6})/);
  return {
    title: plan.title || '',
    summary: plan.summary || '',
    kind: 'hidden_pick',
    startScore: bas ? Number(bas[1]) : 0,
    endBelow: 0,
    rounds: 12,
    shuffle: true,
    items: tekil.map((delta) => ({
      label: delta > 0 ? `+${delta}` : String(delta),
      detail: '',
      delta,
    })),
  };
}

export function StudioOnizleme({ plan }: { plan: Plan }) {
  const { t, rtl } = useCeviri();
  const hizala = rtl ? 'right' : 'left';
  const oyun = useMemo(() => oturumKur(plan), [plan]);
  const [asama, setAsama] = useState<'giris' | 'oyun' | 'son'>('giris');
  const [oge, setOge] = useState<Oge[]>(() => oyun?.items ?? []);
  const [skor, setSkor] = useState(oyun?.startScore ?? 0);
  const [tur, setTur] = useState(1);
  const [acik, setAcik] = useState<number | null>(null);
  const [sonuc, setSonuc] = useState<Oge | null>(null);

  if (!oyun) return null;

  const baslat = () => {
    setOge(oyun.shuffle ? karistir(oyun.items) : oyun.items);
    setSkor(oyun.startScore);
    setTur(1);
    setAcik(null);
    setSonuc(null);
    setAsama('oyun');
  };

  const sec = (index: number) => {
    if (acik != null) return;
    const secilen = oge[index];
    if (!secilen) return;
    const yeni = skor + secilen.delta;
    const bitis = (oyun.endBelow != null && yeni <= oyun.endBelow) || tur >= oyun.rounds;
    setAcik(index);
    setSonuc(secilen);
    setSkor(yeni);
    setTimeout(() => {
      if (bitis) {
        setAsama('son');
        return;
      }
      setTur((n) => n + 1);
      setOge(oyun.shuffle ? karistir(oyun.items) : oyun.items);
      setAcik(null);
      setSonuc(null);
    }, 800);
  };

  if (asama === 'giris') {
    return (
      <View style={styles.alan}>
        <Text style={[styles.ozet, { textAlign: hizala }]}>{oyun.summary}</Text>
        <Pressable style={styles.oyna} onPress={baslat}>
          <Text style={styles.oynaYazi}>{t('studio.oyna')}</Text>
        </Pressable>
      </View>
    );
  }

  if (asama === 'son') {
    return (
      <View style={styles.alan}>
        <Text style={[styles.skor, { textAlign: hizala }]}>
          {t('studio.testCoin')} {skor}
        </Text>
        <Text style={[styles.ozet, { textAlign: hizala }]}>{t('studio.testBitti')}</Text>
        <Pressable style={styles.oyna} onPress={baslat}>
          <Text style={styles.oynaYazi}>{t('studio.tekrarOyna')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.alan}>
      <Text style={[styles.skor, { textAlign: hizala }]}>
        {t('studio.testCoin')} {skor} · {tur}/{oyun.rounds}
      </Text>
      {sonuc?.detail ? <Text style={[styles.ozet, { textAlign: hizala }]}>{sonuc.detail}</Text> : null}
      <View style={styles.izgara}>
        {oge.map((item, index) => {
          const gorunur = oyun.kind === 'choice' || acik === index;
          return (
            <Pressable key={`${tur}-${index}-${item.label}`} style={styles.kutu} onPress={() => sec(index)}>
              <Text style={styles.kutuYazi}>
                {gorunur ? item.label : '?'}
              </Text>
              {gorunur && acik === index ? (
                <Text style={styles.delta}>{item.delta > 0 ? `+${item.delta}` : item.delta}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alan: { gap: BoslukTokenlari.md },
  ozet: { ...TipografiTokenlari.body, color: RenkTokenlari.text, lineHeight: 22 },
  skor: { ...TipografiTokenlari.title, color: RenkTokenlari.text, fontSize: 22 },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kutu: {
    width: '30%',
    flexGrow: 1,
    minHeight: 92,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  kutuYazi: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  delta: { color: '#fff', marginTop: 4, fontWeight: '700' },
  oyna: {
    backgroundColor: RenkTokenlari.primary,
    borderRadius: YaricapTokenlari.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oynaYazi: { color: '#fff', fontWeight: '800' },
});
