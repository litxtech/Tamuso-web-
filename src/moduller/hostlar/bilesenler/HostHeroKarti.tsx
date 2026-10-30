import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCeviri, type CeviriAnahtari } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  GolgeTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { HostAsamasi } from '../yardimcilar/HostAsamasi';

type Props = {
  asama: HostAsamasi;
  basvuruBekliyor: boolean;
};

const ICERIK: Record<
  HostAsamasi,
  {
    icon: keyof typeof Ionicons.glyphMap;
    baslik: CeviriAnahtari;
    govde: CeviriAnahtari;
    rozet: CeviriAnahtari;
  }
> = {
  yok: {
    icon: 'mic',
    baslik: 'host.heroYokBaslik',
    govde: 'host.heroYokBody',
    rozet: 'host.henuzDegil',
  },
  bagimsiz: {
    icon: 'mic',
    baslik: 'host.heroBagimsizBaslik',
    govde: 'host.heroBagimsizBody',
    rozet: 'host.rozetBagimsiz',
  },
  ajans: {
    icon: 'briefcase',
    baslik: 'host.heroAjansBaslik',
    govde: 'host.heroAjansBody',
    rozet: 'host.rozetAjans',
  },
  askida: {
    icon: 'pause',
    baslik: 'host.heroAskidaBaslik',
    govde: 'host.heroAskidaBody',
    rozet: 'host.durumAskida',
  },
};

export function HostHeroKarti({ asama, basvuruBekliyor }: Props) {
  const { t } = useCeviri();
  const icerik = ICERIK[asama];
  const inceleniyor = asama === 'yok' && basvuruBekliyor;

  const rozetRenk =
    asama === 'askida'
      ? RenkTokenlari.danger
      : asama === 'yok'
        ? inceleniyor
          ? RenkTokenlari.warning
          : RenkTokenlari.primarySoft
        : RenkTokenlari.success;
  const rozetMetin = inceleniyor ? t('host.durumIncelemede') : t(icerik.rozet);

  return (
    <LinearGradient
      colors={[...RenkTokenlari.gradientCard]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.kart}
    >
      <View style={styles.ust}>
        <LinearGradient
          colors={
            asama === 'askida'
              ? [RenkTokenlari.surface, RenkTokenlari.surface]
              : [...RenkTokenlari.gradientPrimary]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ikon}
        >
          <Ionicons
            name={icerik.icon}
            size={26}
            color={
              asama === 'askida'
                ? RenkTokenlari.danger
                : RenkTokenlari.textOnPrimary
            }
          />
        </LinearGradient>
        <View
          style={[
            styles.rozet,
            { backgroundColor: `${rozetRenk}1F`, borderColor: `${rozetRenk}55` },
          ]}
        >
          <View style={[styles.rozetNokta, { backgroundColor: rozetRenk }]} />
          <Text style={[styles.rozetYazi, { color: rozetRenk }]} numberOfLines={1}>
            {rozetMetin}
          </Text>
        </View>
      </View>
      <Text style={styles.baslik}>{t(icerik.baslik)}</Text>
      <Text style={styles.govde}>{t(icerik.govde)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  kart: {
    padding: BoslukTokenlari.xl,
    borderRadius: YaricapTokenlari.xl,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: BoslukTokenlari.sm,
    ...GolgeTokenlari.card,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: BoslukTokenlari.md,
    marginBottom: BoslukTokenlari.sm,
  },
  ikon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rozet: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
  },
  rozetNokta: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rozetYazi: {
    ...TipografiTokenlari.caption,
    fontWeight: '700',
    flexShrink: 1,
  },
  baslik: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
  },
  govde: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
});
