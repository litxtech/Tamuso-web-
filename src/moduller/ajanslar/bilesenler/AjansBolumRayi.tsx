import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  screenPaddingHorizontal,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { ajansHref } from '../kancalar/useAjansRouteId';
import { useCeviri } from '../../../i18n/useCeviri';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';

type BolumSabit = {
  key: string;
  labelKey: CeviriAnahtari;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
};

export const AJANS_BOLUMLER: BolumSabit[] = [
  { key: 'ozet', labelKey: 'ajans.ozetBolum', icon: 'grid-outline', path: '' },
  { key: 'canli', labelKey: 'ajans.kpiCanli', icon: 'radio-outline', path: 'canli' },
  { key: 'uyeler', labelKey: 'ajans.uyeler', icon: 'people-outline', path: 'uyeler' },
  { key: 'basvurular', labelKey: 'ajans.basvuruVarsayilan', icon: 'mail-outline', path: 'basvurular' },
  { key: 'davetler', labelKey: 'ajans.hizliDavet', icon: 'person-add-outline', path: 'davetler' },
  { key: 'ekipler', labelKey: 'ajans.rayEkip', icon: 'git-network-outline', path: 'ekipler' },
  { key: 'program', labelKey: 'ajans.programBaslik', icon: 'calendar-outline', path: 'program' },
  { key: 'etkinlikler', labelKey: 'ajans.hizliEtkinlik', icon: 'sparkles-outline', path: 'etkinlikler' },
  { key: 'duyurular', labelKey: 'ajans.hizliDuyuru', icon: 'megaphone-outline', path: 'duyurular' },
  { key: 'gorevler', labelKey: 'ajans.rayGorev', icon: 'checkbox-outline', path: 'gorevler' },
  { key: 'analitik', labelKey: 'ajans.analitik', icon: 'stats-chart-outline', path: 'analitik' },
  { key: 'islemler', labelKey: 'ajans.rayIslem', icon: 'wallet-outline', path: 'islemler' },
  { key: 'cuzdan', labelKey: 'ajans.rayCuzdan', icon: 'cash-outline', path: 'cuzdan' },
  { key: 'paketler', labelKey: 'ajans.rayPaket', icon: 'pricetags-outline', path: 'paketler' },
  { key: 'satis-linkleri', labelKey: 'ajans.raySatisLink', icon: 'link-outline', path: 'satis-linkleri' },
  { key: 'satis-takibi', labelKey: 'ajans.raySatisTakip', icon: 'checkmark-done-outline', path: 'satis-takibi' },
  { key: 'en-cok-alicilar', labelKey: 'ajans.rayTopAlicilar', icon: 'trophy-outline', path: 'en-cok-alicilar' },
  { key: 'dekontlar', labelKey: 'ajans.rayDekont', icon: 'receipt-outline', path: 'dekontlar' },
  { key: 'faturalar', labelKey: 'ajans.rayFatura', icon: 'document-text-outline', path: 'faturalar' },
  { key: 'destek', labelKey: 'ajans.rayDestek', icon: 'help-buoy-outline', path: 'destek' },
  { key: 'guvenlik', labelKey: 'ajans.rayGuvenlik', icon: 'shield-checkmark-outline', path: 'guvenlik' },
  { key: 'dogrulama', labelKey: 'ajans.verMerkez', icon: 'finger-print-outline', path: 'dogrulama' },
  { key: 'ayarlar', labelKey: 'ajans.ayarlar', icon: 'settings-outline', path: 'ayarlar' },
];

export function AjansBolumRayi({
  agencyId,
  aktif,
}: {
  agencyId: string;
  aktif?: string;
}) {
  const { t } = useCeviri();
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const aktifKey = aktif ?? 'ozet';

  useEffect(() => {
    const x = offsets.current[aktifKey];
    if (typeof x === 'number' && scrollRef.current) {
      scrollRef.current.scrollTo({ x: Math.max(0, x - 24), animated: true });
    }
  }, [aktifKey]);

  const onChipLayout = (key: string) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.x;
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {AJANS_BOLUMLER.map((b) => {
          const secili = aktifKey === b.key;
          return (
            <Pressable
              key={b.key}
              onLayout={onChipLayout(b.key)}
              style={[styles.chip, secili && styles.chipAktif]}
              onPress={() => router.push(ajansHref(agencyId, b.path) as any)}
            >
              <Ionicons
                name={b.icon}
                size={15}
                color={secili ? RenkTokenlari.primarySoft : RenkTokenlari.textDim}
              />
              <Text style={[styles.yazi, secili && styles.yaziAktif]} numberOfLines={1}>
                {t(b.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Geriye uyumluluk */
export { AjansBolumRayi as AjansBolumGrid };

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  rail: {
    paddingHorizontal: screenPaddingHorizontal,
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  chipAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  yazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
  },
  yaziAktif: {
    color: RenkTokenlari.text,
  },
});
