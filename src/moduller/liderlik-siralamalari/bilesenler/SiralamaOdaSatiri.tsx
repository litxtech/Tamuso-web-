import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CoinSkoruFormatla } from '../okuma/LiderlikSiralamasiniGetir';
import type { SiralamaSatiri } from '../okuma/LiderlikSiralamasiniGetir';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { useCeviri } from '../../../i18n/useCeviri';
import { SesOdasinaGit } from '../../ses-odalari/navigasyon/SesOdasinaGit';

const MEDAL: Record<number, string[]> = {
  1: ['#F6D365', '#FDA085'],
  2: ['#C9D6FF', '#E2E2E2'],
  3: ['#F2994A', '#F2C94C'],
};

export function SiralamaOdaSatiri({
  item,
}: {
  item: SiralamaSatiri;
}) {
  const { t } = useCeviri();
  const rank = item.rank ?? 0;
  const ad =
    item.room_title?.trim() ||
    item.display_name?.trim() ||
    t('olusturTab.oda');
  const host = item.username?.trim() || null;
  const kapak = MedyaUriGuvenli(item.room_cover_url || item.avatar_url);
  const medal = MEDAL[rank];
  const odaId = item.room_id;

  return (
    <Pressable
      style={[styles.row, rank <= 3 && styles.rowTop]}
      disabled={!odaId}
      onPress={() => {
        if (!odaId) return;
        void SesOdasinaGit({ roomId: odaId });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${rank}. ${ad}`}
    >
      <View style={styles.rankWrap}>
        {medal ? (
          <LinearGradient colors={medal as [string, string]} style={styles.medal}>
            <Text style={styles.medalText}>{rank}</Text>
          </LinearGradient>
        ) : (
          <Text style={styles.rank}>#{rank || '—'}</Text>
        )}
      </View>

      {kapak ? (
        <Image source={{ uri: kapak }} style={styles.avatar} />
      ) : (
        <LinearGradient
          colors={[...RenkTokenlari.gradientPrimary]}
          style={styles.avatar}
        >
          <Ionicons name="mic" size={18} color="#12040C" />
        </LinearGradient>
      )}

      <View style={styles.copy}>
        <View style={styles.adSatir}>
          <Text style={styles.name} numberOfLines={1}>
            {ad}
          </Text>
          {item.room_is_live ? (
            <View style={styles.canli}>
              <View style={styles.canliNokta} />
              <Text style={styles.canliYazi}>{t('kesfet.canliRozet')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.user} numberOfLines={1}>
          {host ? t('siralamalar.hostOdasi', { host }) : t('siralamalar.odaHarcamasi')}
        </Text>
      </View>

      <View style={styles.scoreWrap}>
        <Text style={styles.score}>{CoinSkoruFormatla(item.score)}</Text>
        <Text style={styles.birim}>coin</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  rowTop: {
    borderColor: 'rgba(246, 211, 101, 0.35)',
    backgroundColor: 'rgba(246, 211, 101, 0.06)',
  },
  rankWrap: { width: 36, alignItems: 'center' },
  medal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A1208',
  },
  rank: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  adSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    flexShrink: 1,
  },
  canli: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(232, 64, 145, 0.16)',
  },
  canliNokta: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: RenkTokenlari.primary,
  },
  canliYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    fontSize: 8,
    letterSpacing: 0.4,
  },
  user: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  scoreWrap: { alignItems: 'flex-end' },
  score: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.mint,
    fontSize: 18,
  },
  birim: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
});
