import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PkCanliMacDetay } from '../skor/PkCanliMaciniGetir';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { AktifSayiLocale } from '../../../i18n/diller';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  mac: PkCanliMacDetay;
  selfLiveId?: string;
};

function kalanSaniye(endsAt: string | null): number | null {
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000));
}

/** TikTok tarzı şeffaf skor şeridi — videonun üstünde */
export function PkSkorSeridi({ mac, selfLiveId }: Props) {
  const { dil } = useCeviri();
  const sayiLocale = AktifSayiLocale(dil);
  const [kalan, setKalan] = useState(() => kalanSaniye(mac.ends_at));

  useEffect(() => {
    const id = setInterval(() => setKalan(kalanSaniye(mac.ends_at)), 500);
    return () => clearInterval(id);
  }, [mac.ends_at]);

  const toplam = mac.score_a + mac.score_b;
  const oranA = toplam > 0 ? (mac.score_a / toplam) * 100 : 50;
  const timer =
    kalan == null
      ? '—'
      : `${Math.floor(kalan / 60)}:${String(kalan % 60).padStart(2, '0')}`;

  const senA = !!(selfLiveId && mac.live_a_id === selfLiveId);
  const adSol = (senA ? mac.side_a?.host_name : mac.side_b?.host_name) ?? '';
  const adSag = (senA ? mac.side_b?.host_name : mac.side_a?.host_name) ?? '';
  const skorSol = senA ? mac.score_a : mac.score_b;
  const skorSag = senA ? mac.score_b : mac.score_a;
  const oranSol = senA ? oranA : 100 - oranA;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.ust}>
        <Text style={styles.skorSol}>{skorSol.toLocaleString(sayiLocale)}</Text>
        <View style={styles.timerPill}>
          <Text style={styles.timer}>{timer}</Text>
        </View>
        <Text style={styles.skorSag}>{skorSag.toLocaleString(sayiLocale)}</Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barSol, { width: `${oranSol}%` as `${number}%` }]} />
        <View style={styles.barSag} />
      </View>
      <View style={styles.isimler}>
        <Text style={styles.adSol} numberOfLines={1}>
          {adSol}
        </Text>
        <Text style={styles.adSag} numberOfLines={1}>
          {adSag}
        </Text>
      </View>
    </View>
  );
}

const golge = {
  textShadowColor: 'rgba(0,0,0,0.65)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
} as const;

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    gap: 4,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skorSol: {
    ...TipografiTokenlari.h2,
    fontSize: 26,
    lineHeight: 30,
    color: '#7DD3FC',
    fontWeight: '900',
    flex: 1,
    ...golge,
  },
  skorSag: {
    ...TipografiTokenlari.h2,
    fontSize: 26,
    lineHeight: 30,
    color: '#F9A8D4',
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
    ...golge,
  },
  timerPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  timer: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '800',
  },
  bar: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  barSol: {
    height: '100%',
    backgroundColor: 'rgba(56,189,248,0.82)',
  },
  barSag: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(244,114,182,0.82)',
  },
  isimler: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  adSol: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '700',
    flex: 1,
    ...golge,
  },
  adSag: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
    ...golge,
  },
});
