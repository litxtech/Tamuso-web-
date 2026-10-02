import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  vipLevel: number | string | null | undefined;
  gifterLevel?: number | string | null;
  charmLevel?: number | string | null;
  rechargeLevel?: number | string | null;
};

function chipMetin(onEk: string, deger: number | string | null | undefined) {
  if (deger == null || deger === '') return null;
  const n = Number(deger);
  if (Number.isFinite(n) && n <= 0) return null;
  const yazi = Number.isFinite(n) ? String(Math.floor(n)) : String(deger).trim();
  if (!yazi) return null;
  return `${onEk} ${yazi}`;
}

export function PrestigeRozetSatiri({
  vipLevel,
  gifterLevel,
  charmLevel,
  rechargeLevel,
}: Props) {
  const { t } = useCeviri();
  const chips: Array<{ id: string; label: string; hot?: boolean }> = [];
  const vip = chipMetin(t('siralamalar.boardVip'), vipLevel);
  if (vip) chips.push({ id: 'vip', label: vip, hot: true });
  const hediye = chipMetin(t('siralamalar.boardHediye'), gifterLevel);
  if (hediye) chips.push({ id: 'gifter', label: hediye });
  const cekicilik = chipMetin(t('siralamalar.boardCekicilik'), charmLevel);
  if (cekicilik) chips.push({ id: 'charm', label: cekicilik });
  const yukleme = chipMetin(t('siralamalar.boardYukleme'), rechargeLevel);
  if (yukleme) chips.push({ id: 'recharge', label: yukleme });
  if (chips.length === 0) return null;

  return (
    <View style={styles.row}>
      {chips.map((c) => (
        <Chip key={c.id} label={c.label} hot={c.hot} />
      ))}
    </View>
  );
}

function Chip({ label, hot }: { label: string; hot?: boolean }) {
  if (hot) {
    return (
      <LinearGradient
        colors={['#F5E6A8', '#D4AF37', '#C49A2A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.chipHot}
      >
        <Text style={styles.textHot}>{label}</Text>
      </LinearGradient>
    );
  }
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    backgroundColor: 'rgba(212,175,55,0.1)',
  },
  chipHot: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  text: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.accent,
    fontWeight: '700',
  },
  textHot: {
    ...TipografiTokenlari.micro,
    color: '#3A2A08',
    fontWeight: '800',
  },
});
