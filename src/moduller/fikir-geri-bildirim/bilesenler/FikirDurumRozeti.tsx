import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { YaricapTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';
import {
  FIKIR_DURUM_ETIKET_ANAHTAR,
  type FikirDurum,
} from '../tipler';

export function fikirDurumRenk(st: string): string {
  switch (st) {
    case 'REVIEWING':
      return RenkTokenlari.accent;
    case 'PLANNED':
      return RenkTokenlari.primarySoft;
    case 'IN_DEVELOPMENT':
      return RenkTokenlari.violet;
    case 'COMPLETED':
      return RenkTokenlari.mint;
    case 'NOT_PLANNED':
      return RenkTokenlari.textMuted;
    default:
      return RenkTokenlari.primary;
  }
}

export function FikirDurumRozeti({
  status,
  label,
}: {
  status: FikirDurum | string;
  label?: string;
}) {
  const { t } = useCeviri();
  const renk = fikirDurumRenk(status);
  const key = FIKIR_DURUM_ETIKET_ANAHTAR[status as FikirDurum] as
    | CeviriAnahtari
    | undefined;
  const yazi = label ?? (key ? t(key) : status);

  return (
    <View style={[styles.chip, { borderColor: renk + '55', backgroundColor: renk + '18' }]}>
      <View style={[styles.nokta, { backgroundColor: renk }]} />
      <Text style={[styles.yazi, { color: renk }]} numberOfLines={1}>
        {yazi}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  nokta: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  yazi: {
    ...TipografiTokenlari.caption,
    fontWeight: '600',
    fontSize: 11,
  },
});
