import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PkCanliMacDetay } from '../skor/PkCanliMaciniGetir';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
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

/** Canlı yayın üstünde PK skor çubuğu */
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

  const adA = mac.side_a?.host_name ?? 'A';
  const adB = mac.side_b?.host_name ?? 'B';
  const senA = selfLiveId && mac.live_a_id === selfLiveId;
  const senB = selfLiveId && mac.live_b_id === selfLiveId;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <LinearGradient
        colors={['rgba(18,14,28,0.88)', 'rgba(18,14,28,0.55)']}
        style={styles.kart}
      >
        <View style={styles.ust}>
          <Text style={styles.pk}>PK</Text>
          <Text style={styles.timer}>{timer}</Text>
        </View>
        <View style={styles.isimler}>
          <Text style={[styles.ad, senA && styles.sen]} numberOfLines={1}>
            {adA}
          </Text>
          <Text style={styles.vs}>VS</Text>
          <Text
            style={[styles.ad, styles.adB, senB && styles.sen]}
            numberOfLines={1}
          >
            {adB}
          </Text>
        </View>
        <View style={styles.skorlar}>
          <Text style={styles.skorA}>
            {mac.score_a.toLocaleString(sayiLocale)}
          </Text>
          <Text style={styles.skorB}>
            {mac.score_b.toLocaleString(sayiLocale)}
          </Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barA, { width: `${oranA}%` as `${number}%` }]} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    marginTop: 6,
    zIndex: 5,
  },
  kart: {
    borderRadius: YaricapTokenlari.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(240,180,41,0.35)',
    gap: 6,
  },
  ust: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pk: {
    ...TipografiTokenlari.micro,
    color: '#F0B429',
    fontWeight: '900',
    letterSpacing: 1,
  },
  timer: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, fontWeight: '700' },
  isimler: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ad: {
    ...TipografiTokenlari.caption,
    color: '#60A5FA',
    flex: 1,
    fontWeight: '700',
  },
  adB: { color: '#F472B6', textAlign: 'right' },
  sen: { textDecorationLine: 'underline' },
  vs: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  skorlar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skorA: { ...TipografiTokenlari.body, color: '#60A5FA', fontWeight: '800' },
  skorB: { ...TipografiTokenlari.body, color: '#F472B6', fontWeight: '800' },
  bar: {
    height: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(244,114,182,0.4)',
    overflow: 'hidden',
  },
  barA: { height: '100%', backgroundColor: '#60A5FA' },
});
