import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import type { AjansListeKart } from '../okuma/AjansProfilGetir';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  ajans: AjansListeKart;
  sahipMi?: boolean;
  onPress: () => void;
};

export function AjansKesfetKarti({ ajans, sahipMi, onPress }: Props) {
  const { t, dil } = useCeviri();
  const sayi = (n: number) =>
    new Intl.NumberFormat(DIL_LOCALE_MAP[dil]).format(n);
  const kisa = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return sayi(n);
  };
  const banner = MedyaUriGuvenli(ajans.banner_url);
  const logo = MedyaUriGuvenli(ajans.logo_url);
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <LinearGradient
        colors={[...RenkTokenlari.gradientCard]}
        style={styles.kart}
      >
        {banner ? (
          <Image source={{ uri: banner }} style={styles.banner} />
        ) : (
          <View style={[styles.banner, styles.bannerBos]} />
        )}
        <View style={styles.govde}>
          <View style={styles.ust}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoBos]}>
                <Ionicons
                  name="business"
                  size={22}
                  color={RenkTokenlari.primarySoft}
                />
              </View>
            )}
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.ad} numberOfLines={1}>
                {ajans.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {ajans.agency_public_id}
                {ajans.level_code ? ` · ${ajans.level_code}` : ''}
                {ajans.country ? ` · ${ajans.country}` : ''}
              </Text>
              {ajans.slogan ? (
                <Text style={styles.slogan} numberOfLines={1}>
                  {ajans.slogan}
                </Text>
              ) : null}
            </View>
            {sahipMi ? (
              <View style={styles.sahipRozet}>
                <Text style={styles.sahipYazi}>{t('ajans.senin')}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statSatir}>
            <View style={styles.stat}>
              <Text style={styles.statDeger}>{sayi(ajans.uye_sayisi)}</Text>
              <Text style={styles.statLabel}>{t('ajans.uye')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statDeger}>{kisa(ajans.haftalik_coin)}</Text>
              <Text style={styles.statLabel}>{t('ajans.haftalikCoin')}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statDeger}>{kisa(ajans.toplam_coin)}</Text>
              <Text style={styles.statLabel}>{t('ajans.toplamCoin')}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: BoslukTokenlari.sm },
  kart: {
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
  },
  banner: {
    width: '100%',
    height: 72,
    backgroundColor: RenkTokenlari.surface,
  },
  bannerBos: {
    backgroundColor: RenkTokenlari.surface,
  },
  govde: {
    padding: BoslukTokenlari.md,
    gap: BoslukTokenlari.md,
    marginTop: -28,
  },
  ust: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#121018',
    backgroundColor: RenkTokenlari.bgCard,
  },
  logoBos: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ad: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  slogan: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    marginTop: 2,
  },
  sahipRozet: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 196, 98, 0.16)',
    marginBottom: 4,
  },
  sahipYazi: {
    ...TipografiTokenlari.micro,
    color: '#F5C462',
    fontWeight: '800',
  },
  statSatir: {
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.pressFill,
    alignItems: 'center',
    gap: 2,
  },
  statDeger: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  statLabel: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
});
