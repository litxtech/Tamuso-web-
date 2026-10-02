import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { ulkeBayragi, ulkeGorunenAd } from '../../kisiler-kesif/utils/KisilerYardimcilar';
import { ulkePuanKisa, ulkePuanTam } from '../utils/UlkeLigiFormat';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  countryCode: string;
  rank: number | null;
  points: number;
  gapToNext?: number | null;
  periodLabel?: string;
  contributorCount?: number | null;
};

const ZEMIN = [
  'rgba(232,64,145,0.22)',
  'rgba(139,92,246,0.18)',
  'rgba(34,211,238,0.12)',
] as const;

/** Cam hero — ülke bayrağı + sıralama + puan */
export function UlkeHeroKart({
  countryCode,
  rank,
  points,
  gapToNext,
  periodLabel,
  contributorCount,
}: Props) {
  const { t } = useCeviri();
  const bayrak = ulkeBayragi(countryCode);
  const ad = ulkeGorunenAd(countryCode);

  return (
    <View style={styles.wrap}>
      <CamArkaplan intensity={48} hafif style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[...ZEMIN]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ic}>
        <Text style={styles.flag} allowFontScaling={false}>
          {bayrak || '🏳️'}
        </Text>
        <View style={styles.copy}>
          <Text style={styles.ad} numberOfLines={1}>
            {ad}
          </Text>
          {periodLabel ? (
            <Text style={styles.period} numberOfLines={1}>
              {periodLabel}
            </Text>
          ) : null}
          <View style={styles.meta}>
            {rank != null ? (
              <Text style={styles.rank}>#{rank}</Text>
            ) : (
              <Text style={styles.rankMuted}>{t('ulkeLigi.siraYok')}</Text>
            )}
            <Text style={styles.points}>{ulkePuanKisa(points)}</Text>
          </View>
          {gapToNext != null && gapToNext > 0 ? (
            <Text style={styles.gap}>
              {t('ulkeLigi.gapMetin', { n: ulkePuanTam(gapToNext) })}
            </Text>
          ) : null}
          {contributorCount != null ? (
            <Text style={styles.contrib}>
              {t('ulkeLigi.katkiciSayisi', { n: contributorCount })}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.35)',
    minHeight: 120,
  },
  ic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
  },
  flag: {
    fontSize: 52,
    lineHeight: 60,
    writingDirection: 'ltr',
  },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  ad: { ...TipografiTokenlari.h2, color: RenkTokenlari.text, fontWeight: '800' },
  period: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  meta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 4,
  },
  rank: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  rankMuted: { ...TipografiTokenlari.body, color: RenkTokenlari.textDim },
  points: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  gap: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted, marginTop: 2 },
  contrib: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
});
