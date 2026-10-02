import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { ulkeBayragi, ulkeGorunenAd } from '../../kisiler-kesif/utils/KisilerYardimcilar';
import { ulkePuanKisa } from '../utils/UlkeLigiFormat';
import { useCeviri } from '../../../i18n/useCeviri';
import type { BenimUlkeKatkisi } from '../tipler';

type Props = {
  veri: BenimUlkeKatkisi | null;
  /** public ziyarette show_on_profile / show_country_on_profile zaten filtrelenmiş olmalı */
  kompakt?: boolean;
  onPress?: () => void;
};

const KENAR = [
  'rgba(232,64,145,0.55)',
  'rgba(139,92,246,0.55)',
  'rgba(34,211,238,0.45)',
] as const;
const ZEMIN = [
  'rgba(232,64,145,0.10)',
  'rgba(139,92,246,0.08)',
  'rgba(34,211,238,0.08)',
] as const;

/** Profil — ülke kimliği + katkı kartı (gizlilik + bayrak kapılı) */
export function UlkeKatkisiKart({ veri, kompakt = false, onPress }: Props) {
  const { t } = useCeviri();
  if (!veri?.country_code || !veri.show_on_profile) return null;

  const bayrak = veri.show_country_on_profile
    ? ulkeBayragi(veri.country_code)
    : '';
  const ad = veri.show_country_on_profile
    ? ulkeGorunenAd(veri.country_code)
    : t('ulkeLigi.katkiKartBaslik');
  const puan = veri.points_all_time;
  const sira = veri.rank_all_time;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.wrap,
        kompakt && styles.wrapKompakt,
        pressed && styles.pressed,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${t('ulkeLigi.katkiKartBaslik')}: ${ulkePuanKisa(puan)}`}
    >
      <LinearGradient
        colors={[...KENAR]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.kenar, kompakt && styles.kenarFill]}
      >
        <View style={[styles.ic, kompakt && styles.icFill]}>
          <LinearGradient
            colors={[...ZEMIN]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.ikonWrap}>
            {bayrak ? (
              <Text style={styles.flagMini} allowFontScaling={false}>
                {bayrak}
              </Text>
            ) : (
              <Ionicons name="globe-outline" size={14} color={RenkTokenlari.accent} />
            )}
          </View>
          <View style={styles.copy}>
            <Text style={styles.baslik} numberOfLines={1}>
              {t('ulkeLigi.katkiKartBaslik')}
            </Text>
            <View style={styles.degerSatir}>
              <Text
                style={[styles.deger, kompakt && styles.degerKompakt]}
                numberOfLines={1}
              >
                {ulkePuanKisa(puan)}
              </Text>
              {sira != null ? (
                <Text style={styles.sira}>#{sira}</Text>
              ) : null}
            </View>
            {!kompakt ? (
              <Text style={styles.alt} numberOfLines={1}>
                {ad}
              </Text>
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
  },
  wrapKompakt: { flex: 1 },
  pressed: { opacity: 0.9 },
  kenar: { padding: 1.5, borderRadius: YaricapTokenlari.md },
  kenarFill: { flex: 1 },
  ic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md - 1,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgCard,
  },
  icFill: { flex: 1 },
  ikonWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,64,145,0.15)',
  },
  flagMini: { fontSize: 16, lineHeight: 20, writingDirection: 'ltr' },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  baslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  degerSatir: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  deger: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  degerKompakt: { fontSize: 16 },
  sira: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  alt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
});
