import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ListeGrubu, ListeSatiri } from '../../src/components/ListeSatiri';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import {
  GizlilikAlanEtiketleri,
  ProfilGostergeEtiketleri,
  GizlilikAyariKaydet,
  GizlilikAyarlariniGetir,
  type GizlilikAyarlari,
} from '../../src/moduller/ayarlar/islemler/GizlilikAyarlariniYonet';
import { GizlilikAnahtarListesi } from '../../src/moduller/ayarlar/bilesenler/GizlilikAnahtarListesi';
import {
  UlkeKatkisiAyarlariniGetir,
  UlkeKatkisiAyarlariniKaydet,
} from '../../src/moduller/ulke-ligi/islemler/UlkeLigiApi';
import type { UlkeKatkisiAyarlari } from '../../src/moduller/ulke-ligi/tipler';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { useTema } from '../../src/tasarim-sistemi/tema/TemaSaglayici';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';

const EMPTY: GizlilikAyarlari = {
  hide_recharge_rank: false,
  hide_gifter_rank: false,
  hide_current_room: false,
  hide_last_seen: false,
  hide_agency: false,
  hide_gift_collection: false,
  hide_top_supporter: false,
  hide_level: false,
  hide_topup_coin: false,
  hide_prestige: false,
  hide_account_value: false,
  hide_crown: false,
  hide_online_status: false,
  hide_followers: false,
  hide_following: false,
  hide_status_posts: false,
  hide_game_stats: false,
  is_private: false,
};

const ULKE_EMPTY: UlkeKatkisiAyarlari = {
  include_in_totals: true,
  show_on_leaderboard: true,
  show_on_profile: true,
  show_country_on_profile: true,
};

export default function GizlilikAyarlariEkrani() {
  const { palet } = useTema();
  const { t } = useCeviri();
  const [privacy, setPrivacy] = useState<GizlilikAyarlari>(EMPTY);
  const [ulkeAyar, setUlkeAyar] = useState<UlkeKatkisiAyarlari>(ULKE_EMPTY);
  const ulkeLigiAcik = OzellikBayragiAktifMi('country_league_enabled');

  useFocusEffect(
    useCallback(() => {
      void GizlilikAyarlariniGetir().then(setPrivacy);
      if (ulkeLigiAcik) {
        void UlkeKatkisiAyarlariniGetir()
          .then(setUlkeAyar)
          .catch(() => setUlkeAyar(ULKE_EMPTY));
      }
    }, [ulkeLigiAcik]),
  );

  const degistir = async (key: keyof GizlilikAyarlari, v: boolean) => {
    setPrivacy((p) => ({ ...p, [key]: v }));
    const r = await GizlilikAyariKaydet(key, v);
    if (!r.ok) {
      setPrivacy((p) => ({ ...p, [key]: !v }));
      Alert.alert(t('gizlilik.kisaBaslik'), r.hata ?? t('ortak.kaydedilemedi'));
    }
  };

  const ulkeDegistir = async (key: keyof UlkeKatkisiAyarlari, v: boolean) => {
    setUlkeAyar((p) => ({ ...p, [key]: v }));
    const r = await UlkeKatkisiAyarlariniKaydet({ [key]: v });
    if (!r.ok) {
      Alert.alert(t('gizlilik.kisaBaslik'), r.hata ?? t('ortak.kaydedilemedi'));
      void UlkeKatkisiAyarlariniGetir().then(setUlkeAyar);
    }
  };

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="gizlilik">
        <EkranBasligi
          title={t('gizlilik.baslik')}
          subtitle={t('gizlilik.altBaslik')}
          fallbackHref="/ayarlar"
        />
        <ScrollView contentContainerStyle={styles.content}>
          <ListeGrubu title={t('gizlilik.hesapGorunurlugu')}>
            <GizlilikAnahtarListesi
              maddeler={GizlilikAlanEtiketleri(t)}
              degerler={privacy}
              onDegistir={(k, v) => void degistir(k, v)}
              thumbColor={palet.bgElevated}
            />
          </ListeGrubu>

          <ListeGrubu title={t('gizlilik.profilGostergeleri')}>
            <Text style={[styles.hint, { color: palet.textMuted }]}>
              {t('gizlilik.profilGostergeHint')}
            </Text>
            <GizlilikAnahtarListesi
              maddeler={ProfilGostergeEtiketleri(t)}
              degerler={privacy}
              onDegistir={(k, v) => void degistir(k, v)}
              thumbColor={palet.bgElevated}
            />
          </ListeGrubu>

          <ListeGrubu title={t('gizlilik.islemHacmiBolum')}>
            <Text style={[styles.hint, { color: palet.textMuted }]}>
              {t('gizlilik.islemHacmiHint')}
            </Text>
            <ListeSatiri
              icon="diamond-outline"
              label={t('gizlilik.islemHacmiGorunurluk')}
              value={t('gizlilik.ayarla')}
              onPress={() => router.push('/islem-hacmi' as any)}
              last
            />
          </ListeGrubu>

          {ulkeLigiAcik ? (
            <ListeGrubu title={t('gizlilik.ulkeLigiBolum')}>
              <Text style={[styles.hint, { color: palet.textMuted }]}>
                {t('gizlilik.ulkeLigiHint')}
              </Text>
              {(
                [
                  ['include_in_totals', 'includeInTotals', 'includeInTotalsAlt'],
                  ['show_on_leaderboard', 'showOnLeaderboard', 'showOnLeaderboardAlt'],
                  ['show_on_profile', 'showOnProfile', 'showOnProfileAlt'],
                  [
                    'show_country_on_profile',
                    'showCountryOnProfile',
                    'showCountryOnProfileAlt',
                  ],
                ] as const
              ).map(([key, labelKey, altKey], i, arr) => (
                <View
                  key={key}
                  style={[
                    styles.switchRow,
                    i === arr.length - 1 && styles.switchRowLast,
                  ]}
                >
                  <View style={styles.switchCopy}>
                    <Text style={[styles.switchLabel, { color: palet.text }]}>
                      {t(`ulkeLigi.${labelKey}`)}
                    </Text>
                    <Text style={[styles.switchAlt, { color: palet.textMuted }]}>
                      {t(`ulkeLigi.${altKey}`)}
                    </Text>
                  </View>
                  <Switch
                    value={ulkeAyar[key]}
                    onValueChange={(v) => void ulkeDegistir(key, v)}
                    thumbColor={palet.bgElevated}
                  />
                </View>
              ))}
            </ListeGrubu>
          ) : null}

          <ListeGrubu title={t('ayarlar.kisilerAramalar')}>
            <ListeSatiri
              icon="people-outline"
              label={t('gizlilik.kesifArama')}
              value={t('gizlilik.kesifDeger')}
              onPress={() => router.push('/ayarlar/kisiler-aramalar' as any)}
            />
            <ListeSatiri
              icon="ban-outline"
              label={t('ayarlar.engellenenHesaplar')}
              onPress={() => router.push('/engellenen-kullanicilar' as any)}
              last
            />
          </ListeGrubu>
        </ScrollView>
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxl,
    gap: 0,
  },
  hint: {
    ...TipografiTokenlari.caption,
    paddingHorizontal: BoslukTokenlari.md,
    paddingTop: BoslukTokenlari.sm,
    paddingBottom: BoslukTokenlari.xs,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  switchRowLast: { borderBottomWidth: 0 },
  switchCopy: { flex: 1, gap: 2 },
  switchLabel: { ...TipografiTokenlari.body, fontWeight: '600' },
  switchAlt: { ...TipografiTokenlari.micro },
});
