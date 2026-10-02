import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CamArkaplan } from '../../../bilesenler/yuzey/CamArkaplan';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { ulkeBayragi, ulkeGorunenAd } from '../../kisiler-kesif/utils/KisilerYardimcilar';
import { ulkePuanKisa } from '../utils/UlkeLigiFormat';
import { useCeviri } from '../../../i18n/useCeviri';
import type { BenimUlkeKatkisi, UlkeLigiPeriod } from '../tipler';

type Props = {
  veri: BenimUlkeKatkisi | null;
  period: UlkeLigiPeriod;
  onPress?: () => void;
};

/** Sticky kullanıcı kartı — kendi ülke katkısı özeti */
export function UlkeKullaniciKart({ veri, period, onPress }: Props) {
  const { t } = useCeviri();
  if (!veri?.country_code) {
    return (
      <View style={styles.wrap}>
        <CamArkaplan intensity={36} hafif style={StyleSheet.absoluteFill} />
        <Text style={styles.bos}>{t('ulkeLigi.ulkeSecHint')}</Text>
      </View>
    );
  }

  const puan =
    period === 'weekly' ? veri.points_weekly : veri.points_all_time;
  const sira = period === 'weekly' ? veri.rank_weekly : veri.rank_all_time;
  const bayrak = ulkeBayragi(veri.country_code);
  const ad = ulkeGorunenAd(veri.country_code);

  return (
    <Pressable
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <CamArkaplan intensity={40} hafif style={StyleSheet.absoluteFill} />
      <View style={styles.ic}>
        <Text style={styles.flag} allowFontScaling={false}>
          {bayrak}
        </Text>
        <View style={styles.mid}>
          <Text style={styles.label}>{t('ulkeLigi.seninUlken')}</Text>
          <Text style={styles.ad} numberOfLines={1}>
            {ad}
          </Text>
        </View>
        <View style={styles.sag}>
          {sira != null ? (
            <Text style={styles.rank}>#{sira}</Text>
          ) : (
            <Text style={styles.rankMuted}>—</Text>
          )}
          <Text style={styles.points}>{ulkePuanKisa(puan)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: YaricapTokenlari.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    padding: BoslukTokenlari.md,
    backgroundColor: 'rgba(20,12,28,0.35)',
  },
  pressed: { opacity: 0.9 },
  ic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: { fontSize: 28, lineHeight: 34, writingDirection: 'ltr' },
  mid: { flex: 1, gap: 2, minWidth: 0 },
  label: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, fontWeight: '700' },
  ad: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '800' },
  sag: { alignItems: 'flex-end', gap: 2 },
  rank: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  rankMuted: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  points: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    paddingVertical: 4,
  },
});
