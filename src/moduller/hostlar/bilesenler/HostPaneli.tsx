import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCeviri } from '../../../i18n/useCeviri';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { HostProfil } from '../okuma/HostProfiliniGetir';
import { HostBolumBasligi } from './HostBolumBasligi';

type Props = {
  host: HostProfil | null;
  ajansHostu: boolean;
};

export function HostPaneli({ host, ajansHostu }: Props) {
  const { t, dil } = useCeviri();
  const sayi = (n: number) => Math.max(0, n || 0).toLocaleString(dil);

  return (
    <View style={styles.wrap}>
      {host ? (
        <>
          <HostBolumBasligi baslik={t('host.panelBaslik')} />
          <View style={styles.izgara}>
            <Stat
              icon="time-outline"
              deger={sayi(Math.floor(host.total_live_seconds / 3600))}
              etiket={t('host.saatCanli')}
            />
            <Stat
              icon="diamond-outline"
              deger={sayi(host.gift_income_diamonds)}
              etiket={t('host.elmas')}
            />
            <Stat
              icon="people-outline"
              deger={sayi(host.unique_gifters)}
              etiket={t('host.hediyeVeren')}
            />
            <Stat
              icon="trophy-outline"
              deger={sayi(host.pk_wins)}
              etiket={t('host.pkGalibiyet')}
            />
          </View>
        </>
      ) : null}

      <HostBolumBasligi baslik={t('host.hizliIslemler')} />
      <Aksiyon
        icon="radio-outline"
        baslik={t('host.aksiyonCanli')}
        alt={t('host.aksiyonCanliAlt')}
        onPress={() => router.push('/canli' as any)}
      />
      <Aksiyon
        icon="mic-outline"
        baslik={t('host.aksiyonSes')}
        alt={t('host.aksiyonSesAlt')}
        onPress={() => router.push('/(tabs)/create' as any)}
      />
      <Aksiyon
        icon="wallet-outline"
        baslik={t('host.aksiyonKazanc')}
        alt={t('host.aksiyonKazancAlt')}
        onPress={() => router.push('/(tabs)/wallet' as any)}
      />
      {ajansHostu ? (
        <Aksiyon
          icon="business-outline"
          baslik={t('host.ajansPaneli')}
          alt={t('host.aksiyonAjansAlt')}
          onPress={() => router.push('/ajans/uye' as any)}
        />
      ) : null}
    </View>
  );
}

function Stat({
  icon,
  deger,
  etiket,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  deger: string;
  etiket: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={RenkTokenlari.primarySoft} />
      <Text style={styles.statDeger} numberOfLines={1} adjustsFontSizeToFit>
        {deger}
      </Text>
      <Text style={styles.statEtiket} numberOfLines={1}>
        {etiket}
      </Text>
    </View>
  );
}

function Aksiyon({
  icon,
  baslik,
  alt,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  baslik: string;
  alt: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.aksiyon, pressed && styles.pressed]}
    >
      <View style={styles.aksiyonIkon}>
        <Ionicons name={icon} size={20} color={RenkTokenlari.primarySoft} />
      </View>
      <View style={styles.aksiyonMetin}>
        <Text style={styles.aksiyonBaslik}>{baslik}</Text>
        <Text style={styles.aksiyonAlt}>{alt}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={RenkTokenlari.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: BoslukTokenlari.sm },
  pressed: { opacity: 0.88 },
  izgara: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: BoslukTokenlari.sm,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    gap: 4,
  },
  statDeger: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
  },
  statEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  aksiyon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  aksiyonIkon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: RenkTokenlari.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aksiyonMetin: { flex: 1, gap: 2 },
  aksiyonBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  aksiyonAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
