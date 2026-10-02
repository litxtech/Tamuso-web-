import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { ulkeBayragi, ulkeGorunenAd } from '../../kisiler-kesif/utils/KisilerYardimcilar';
import { ulkeHareketMetni, ulkePuanKisa } from '../utils/UlkeLigiFormat';
import type { UlkeLiderSatiri } from '../tipler';

type Props = {
  satir: UlkeLiderSatiri;
  onPress?: () => void;
};

/** Liderlik satırı — sıra, bayrak (RTL'de aynalanmaz), ad, puan, hareket */
export function UlkeSatir({ satir, onPress }: Props) {
  const top = satir.rank <= 3;
  const bayrak = ulkeBayragi(satir.country_code);
  const ad = ulkeGorunenAd(satir.country_code);
  const hareket = ulkeHareketMetni(satir.rank_delta);
  const yukseldi = (satir.rank_delta ?? 0) > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, top && styles.rowTop, pressed && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${satir.rank}. ${ad}, ${ulkePuanKisa(satir.points)}`}
    >
      <Text style={[styles.rank, top && styles.rankTop]}>#{satir.rank}</Text>
      {/* Bayrak — scaleX ile aynalama yok; emoji doğal kalsın */}
      <Text style={styles.flag} allowFontScaling={false}>
        {bayrak || '🏳️'}
      </Text>
      <View style={styles.mid}>
        <Text style={styles.name} numberOfLines={1}>
          {ad}
        </Text>
        {hareket ? (
          <Text
            style={[
              styles.move,
              { color: yukseldi ? RenkTokenlari.mint : RenkTokenlari.danger },
            ]}
          >
            {hareket}
          </Text>
        ) : null}
      </View>
      <Text style={styles.points}>{ulkePuanKisa(satir.points)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  rowTop: { borderColor: 'rgba(240,180,41,0.4)' },
  pressed: { opacity: 0.88 },
  rank: {
    width: 36,
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
    textAlign: 'center',
  },
  rankTop: { color: RenkTokenlari.accent },
  flag: {
    fontSize: 28,
    lineHeight: 34,
    writingDirection: 'ltr',
  },
  mid: { flex: 1, gap: 2, minWidth: 0 },
  name: { ...TipografiTokenlari.body, color: RenkTokenlari.text, fontWeight: '700' },
  move: { ...TipografiTokenlari.micro, fontWeight: '700' },
  points: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
    writingDirection: 'ltr',
  },
});
