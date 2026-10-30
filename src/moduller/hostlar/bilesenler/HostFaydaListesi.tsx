import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { HostBolumBasligi } from './HostBolumBasligi';

const FAYDALAR: {
  icon: keyof typeof Ionicons.glyphMap;
  baslik: CeviriAnahtari;
  govde: CeviriAnahtari;
}[] = [
  {
    icon: 'radio-outline',
    baslik: 'host.faydaYayinBaslik',
    govde: 'host.faydaYayinBody',
  },
  {
    icon: 'diamond-outline',
    baslik: 'host.faydaHediyeBaslik',
    govde: 'host.faydaHediyeBody',
  },
  {
    icon: 'trophy-outline',
    baslik: 'host.faydaSiralamaBaslik',
    govde: 'host.faydaSiralamaBody',
  },
];

export function HostFaydaListesi() {
  const { t } = useCeviri();
  return (
    <View style={styles.wrap}>
      <HostBolumBasligi baslik={t('host.faydaBaslik')} />
      <View style={styles.kart}>
        {FAYDALAR.map((f, i) => (
          <View
            key={f.baslik}
            style={[styles.satir, i > 0 && styles.satirAyrac]}
          >
            <View style={styles.ikon}>
              <Ionicons name={f.icon} size={20} color={RenkTokenlari.primarySoft} />
            </View>
            <View style={styles.metin}>
              <Text style={styles.baslik}>{t(f.baslik)}</Text>
              <Text style={styles.govde}>{t(f.govde)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: BoslukTokenlari.sm },
  kart: {
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    paddingHorizontal: BoslukTokenlari.lg,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.md,
  },
  satirAyrac: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.divider,
  },
  ikon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metin: { flex: 1, gap: 2 },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  govde: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
