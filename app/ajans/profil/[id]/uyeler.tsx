import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi } from '../../../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { MedyaUriGuvenli } from '../../../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import {
  AjansProfilGetir,
  type AjansProfilYayinci,
} from '../../../../src/moduller/ajanslar/okuma/AjansProfilGetir';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../../../src/tasarim-sistemi/tema/useTemayaAboneOl';
import { useCeviri } from '../../../../src/i18n/useCeviri';

function kisa(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.floor(n || 0));
}

function dakikaMetni(
  n: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const d = Math.max(0, Math.floor(Number(n) || 0));
  if (d < 60) return t('ajans.dkKisa', { n: d });
  const saat = Math.floor(d / 60);
  const kalan = d % 60;
  return kalan
    ? t('ajans.saDkKisa', { sa: saat, dk: kalan })
    : t('ajans.saKisa', { n: saat });
}

export default function AjansProfilUyelerEkrani() {
  useTemayaAboneOl();
  const { t } = useCeviri();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ad, setAd] = useState(t('ajans.baslik'));
  const [uyeler, setUyeler] = useState<AjansProfilYayinci[]>([]);
  const [arama, setArama] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const p = await AjansProfilGetir(id);
      setAd(p.agency.name);
      setUyeler(p.yayincilar ?? []);
    } catch {
      setUyeler([]);
    } finally {
      setYukleniyor(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    if (!q) return uyeler;
    return uyeler.filter(
      (u) =>
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.username ?? '').toLowerCase().includes(q) ||
        (u.public_user_id ?? '').toLowerCase().includes(q),
    );
  }, [uyeler, arama]);

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri
        modulAdi="ajans-profil-uyeler"
        varyant="ekran"
        fallbackHref={`/ajans/profil/${id}` as any}
      >
        <EkranBasligi
          title={t('ajans.uyeler')}
          subtitle={`${ad} · ${filtreli.length}`}
          fallbackHref={`/ajans/profil/${id}` as any}
        />
        {yukleniyor && uyeler.length === 0 ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={filtreli}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.liste}
            ListHeaderComponent={
              <TextInput
                value={arama}
                onChangeText={setArama}
                placeholder={t('ajans.phUyeUsername')}
                placeholderTextColor={RenkTokenlari.textDim}
                style={styles.input}
              />
            }
            ListEmptyComponent={
              <Text style={styles.bos}>
                {arama.trim()
                  ? t('ajans.sonucYok')
                  : t('ajans.henuzUyeYok')}
              </Text>
            }
            renderItem={({ item }) => {
              const av = MedyaUriGuvenli(item.avatar_url);
              return (
                <Pressable
                  style={styles.satir}
                  onPress={() => router.push(`/kullanici/${item.user_id}` as any)}
                >
                  {av ? (
                    <Image source={{ uri: av }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarBos]}>
                      <Ionicons name="person" size={18} color={RenkTokenlari.textDim} />
                    </View>
                  )}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.ad} numberOfLines={1}>
                      {item.display_name ||
                        item.username ||
                        t('ajans.uyeVarsayilan')}
                    </Text>
                    <Text style={styles.alt} numberOfLines={1}>
                      {item.username ? `@${item.username}` : '—'}
                      {item.public_user_id ? ` · ID ${item.public_user_id}` : ''}
                    </Text>
                    <Text style={styles.alt} numberOfLines={1}>
                      {t('ajans.profilUyeMeta', {
                        yayin: dakikaMetni(item.yayin_dakika, t),
                        ses: dakikaMetni(item.ses_dakika, t),
                        coin: kisa(item.haftalik_coin),
                      })}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={RenkTokenlari.textDim}
                  />
                </Pressable>
              );
            }}
          />
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  liste: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.surface,
    marginBottom: BoslukTokenlari.md,
  },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.divider,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: RenkTokenlari.surface,
  },
  avatarBos: { alignItems: 'center', justifyContent: 'center' },
  ad: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  alt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  bos: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    textAlign: 'center',
    paddingVertical: BoslukTokenlari.xl,
  },
});
