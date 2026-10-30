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
import type { HostBasvurusu } from '../okuma/HostProfiliniGetir';
import {
  BasvuruGorunumuBul,
  type BasvuruGorunumu,
  type HostAsamasi,
} from '../yardimcilar/HostAsamasi';
import { HostBolumBasligi } from './HostBolumBasligi';

const DURUM_ANAHTARI: Record<BasvuruGorunumu['durum'], CeviriAnahtari> = {
  beklemede: 'host.appBeklemede',
  ajans: 'host.appAjans',
  platform: 'host.appPlatform',
  onaylandi: 'host.appOnaylandi',
  reddedildi: 'host.appReddedildi',
  tamamlandi: 'host.appTamamlandi',
};

type Props = {
  basvurular: HostBasvurusu[];
  asama: HostAsamasi;
};

export function HostBasvuruGecmisi({ basvurular, asama }: Props) {
  const { t, dil } = useCeviri();
  if (basvurular.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <HostBolumBasligi baslik={t('host.gecmisBaslik')} />
      <View style={styles.kart}>
        {basvurular.map((b, i) => {
          const gorunum = BasvuruGorunumuBul(b, asama);
          const renk =
            gorunum.ton === 'olumlu'
              ? RenkTokenlari.success
              : gorunum.ton === 'olumsuz'
                ? RenkTokenlari.danger
                : RenkTokenlari.warning;
          return (
            <View key={b.id} style={[styles.satir, i > 0 && styles.satirAyrac]}>
              <View style={styles.ikon}>
                <Ionicons
                  name={b.path === 'join_agency' ? 'business-outline' : 'person-outline'}
                  size={18}
                  color={RenkTokenlari.primarySoft}
                />
              </View>
              <View style={styles.metin}>
                <Text style={styles.baslik}>
                  {t(b.path === 'join_agency' ? 'host.yolAjans' : 'host.yolBagimsiz')}
                </Text>
                <Text style={styles.tarih}>
                  {new Date(b.created_at).toLocaleDateString(dil, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.cip,
                  { backgroundColor: `${renk}1F`, borderColor: `${renk}55` },
                ]}
              >
                <Text style={[styles.cipYazi, { color: renk }]} numberOfLines={1}>
                  {t(DURUM_ANAHTARI[gorunum.durum])}
                </Text>
              </View>
            </View>
          );
        })}
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metin: { flex: 1, gap: 2 },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  tarih: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  cip: {
    flexShrink: 1,
    maxWidth: '45%',
    paddingHorizontal: BoslukTokenlari.sm + 2,
    paddingVertical: 4,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
  },
  cipYazi: {
    ...TipografiTokenlari.caption,
    fontWeight: '700',
  },
});
