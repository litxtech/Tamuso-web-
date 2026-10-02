import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { BosDurum } from '../../src/components/BosDurum';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { KillSwitchAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { useUlkeLigi } from '../../src/moduller/ulke-ligi/kancalar/useUlkeLigi';
import { UlkeSatir } from '../../src/moduller/ulke-ligi/bilesenler/UlkeSatir';
import { UlkeKullaniciKart } from '../../src/moduller/ulke-ligi/bilesenler/UlkeKullaniciKart';
import type { UlkeLigiPeriod } from '../../src/moduller/ulke-ligi/tipler';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';

function UlkeLigiIskelet() {
  return (
    <View style={styles.skelWrap}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.skelRow} />
      ))}
    </View>
  );
}

export default function DunyaUlkeLigiEkrani() {
  const { t } = useCeviri();
  const [period, setPeriod] = useState<UlkeLigiPeriod>('weekly');
  const [arama, setArama] = useState('');
  const [aramaDebounced, setAramaDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setAramaDebounced(arama.trim()), 280);
    return () => clearTimeout(id);
  }, [arama]);

  const bayrakAcik =
    OzellikBayragiAktifMi('country_league_enabled') &&
    !KillSwitchAktifMi('kill_country_league_display');

  const periodAcik =
    period === 'weekly'
      ? OzellikBayragiAktifMi('country_league_weekly_enabled')
      : OzellikBayragiAktifMi('country_league_all_time_enabled');

  const { satirlar, benim, yukleniyor, hata, modulAcik, hasMore, yenile, dahaFazla } =
    useUlkeLigi({
      period,
      search: aramaDebounced,
      aktif: bayrakAcik && periodAcik,
    });

  const tabs = useMemo(
    () =>
      [
        OzellikBayragiAktifMi('country_league_weekly_enabled')
          ? ({ id: 'weekly' as const, label: t('ulkeLigi.tabHaftalik') })
          : null,
        OzellikBayragiAktifMi('country_league_all_time_enabled')
          ? ({ id: 'all_time' as const, label: t('ulkeLigi.tabTumZamanlar') })
          : null,
      ].filter(Boolean) as { id: UlkeLigiPeriod; label: string }[],
    [t],
  );

  if (!bayrakAcik) {
    return (
      <Screen edges={['top']}>
        <EkranBasligi title={t('ulkeLigi.baslik')} fallbackHref="/(tabs)" />
        <BosDurum
          icon="globe-outline"
          title={t('ulkeLigi.kapaliBaslik')}
          body={t('ulkeLigi.kapaliBody')}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ulke-ligi">
        <EkranBasligi
          title={t('ulkeLigi.baslik')}
          subtitle={t('ulkeLigi.altBaslik')}
          fallbackHref="/(tabs)"
        />

        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const aktif = period === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, aktif && styles.tabAktif]}
                onPress={() => setPeriod(tab.id)}
              >
                <Text style={[styles.tabYazi, aktif && styles.tabYaziAktif]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.araWrap}>
          <TextInput
            style={styles.ara}
            value={arama}
            onChangeText={setArama}
            placeholder={t('ulkeLigi.araPlaceholder')}
            placeholderTextColor={RenkTokenlari.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <View style={styles.userCard}>
          <UlkeKullaniciKart
            veri={benim}
            period={period}
            onPress={
              benim?.country_code
                ? () => router.push(`/ulke/${benim.country_code}` as never)
                : undefined
            }
          />
        </View>

        {yukleniyor && satirlar.length === 0 ? (
          <UlkeLigiIskelet />
        ) : hata && satirlar.length === 0 ? (
          <View style={styles.hataWrap}>
            <BosDurum
              icon="cloud-offline-outline"
              title={t('ulkeLigi.hataBaslik')}
              body={t('ulkeLigi.hataBody')}
            />
            <Pressable style={styles.retry} onPress={yenile}>
              <Text style={styles.retryYazi}>{t('ulkeLigi.tekrarDene')}</Text>
            </Pressable>
          </View>
        ) : !modulAcik || !periodAcik ? (
          <BosDurum
            icon="globe-outline"
            title={t('ulkeLigi.kapaliBaslik')}
            body={t('ulkeLigi.kapaliBody')}
          />
        ) : (
          <FlatList
            data={satirlar}
            keyExtractor={(item) => item.country_code}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={yukleniyor}
                onRefresh={yenile}
                tintColor={RenkTokenlari.accent}
              />
            }
            ListEmptyComponent={
              <BosDurum
                icon="trophy-outline"
                title={t('ulkeLigi.bosBaslik')}
                body={t('ulkeLigi.bosBody')}
              />
            }
            onEndReached={() => {
              if (hasMore) dahaFazla();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              yukleniyor && satirlar.length > 0 ? (
                <ActivityIndicator
                  color={RenkTokenlari.accent}
                  style={{ marginVertical: 16 }}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <UlkeSatir
                satir={item}
                onPress={() => router.push(`/ulke/${item.country_code}` as never)}
              />
            )}
          />
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
  },
  tabAktif: {
    borderColor: 'rgba(232,64,145,0.55)',
    backgroundColor: 'rgba(232,64,145,0.12)',
  },
  tabYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  tabYaziAktif: { color: RenkTokenlari.text },
  araWrap: {
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
  },
  ara: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: YaricapTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 10,
  },
  userCard: {
    paddingHorizontal: BoslukTokenlari.lg,
    marginBottom: BoslukTokenlari.sm,
  },
  list: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.sm,
  },
  skelWrap: {
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.sm,
  },
  skelRow: {
    height: 64,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    opacity: 0.55,
  },
  hataWrap: { gap: 12, paddingHorizontal: BoslukTokenlari.lg },
  retry: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(232,64,145,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.45)',
  },
  retryYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
});
