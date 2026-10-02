import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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

const MEDAL: Record<number, string[]> = {
  1: ['#F6D365', '#FDA085'],
  2: ['#C9D6FF', '#E2E2E2'],
  3: ['#F2994A', '#F2C94C'],
};

export function SiralamaKullaniciSatiri({
  item,
  birim = 'coin',
}: {
  item: SiralamaSatiri;
  birim?: string;
}) {
  const { t } = useCeviri();
  const rank = item.rank ?? 0;
  const ad =
    item.display_name?.trim() ||
    item.username?.trim() ||
    t('ortak.kullanici');
  const harf = ad.charAt(0).toLocaleUpperCase('tr-TR');
  const medal = MEDAL[rank];
  const profilId = item.user_id;
  const avatar = MedyaUriGuvenli(item.avatar_url);

  return (
    <Pressable
      style={[styles.row, rank <= 3 && styles.rowTop]}
      disabled={!profilId}
      onPress={() => {
        if (!profilId) return;
        router.push(`/kullanici/${profilId}` as any);
      }}
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

      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <LinearGradient
          colors={[RenkTokenlari.primary, RenkTokenlari.accent]}
          style={styles.avatar}
        >
          <Text style={styles.harf}>{harf}</Text>
        </LinearGradient>
      )}

      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {ad}
        </Text>
        {item.username ? (
          <Text style={styles.user} numberOfLines={1}>
            @{item.username}
          </Text>
        ) : null}
      </View>

      <View style={styles.scoreWrap}>
        <Text style={styles.score}>{CoinSkoruFormatla(item.score)}</Text>
        <Text style={styles.birim}>{birim}</Text>
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
  harf: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
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
