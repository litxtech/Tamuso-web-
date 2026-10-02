import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ListeGrubu, ListeSatiri } from '../../src/components/ListeSatiri';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import {
  KullaniciAyarlariniGetir,
  PushBildirimAyariniKaydet,
} from '../../src/moduller/ayarlar/islemler/KullaniciAyarlariniYonet';
import {
  SesOdasiPipAcikMi,
  SesOdasiPipKaydet,
} from '../../src/moduller/ses-odalari/depolama/SesOdasiPipTercihi';
import { SesOdasiPipParamsKapat } from '../../src/moduller/ses-odalari/pip/useSesOdasiPip';
import { UygulamaKimligi } from '../../src/yapilandirma/UygulamaKimligi';
import { GorunumSecimKartlari } from '../../src/moduller/gorunum/bilesenler/GorunumSecimKartlari';
import { useTema } from '../../src/tasarim-sistemi/tema/TemaSaglayici';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, HeaderTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useDil } from '../../src/i18n/DilSaglayici';
import { useCeviri } from '../../src/i18n/useCeviri';
import { BiyometriAyarSatiri } from '../../src/moduller/kimlik-dogrulama/biyometri/BiyometriAnahtari';

/** Uygulama tercihleri — kısa hub; gizlilik ayrı ekranda */
export default function AyarlarEkrani() {
  const [push, setPush] = useState(true);
  const [pipAcik, setPipAcik] = useState(true);
  const { palet } = useTema();
  const androidMu = Platform.OS === 'android';
  const { dilEtiketi, dilModu } = useDil();
  const { t } = useCeviri();

  useFocusEffect(
    useCallback(() => {
      void KullaniciAyarlariniGetir().then((a) => {
        setPush(a.pushEnabled);
      });
      void import('../../src/moduller/bildirimler/tercihler/PushTercihleriniYonet')
        .then(({ PushTercihleriniGetir }) => PushTercihleriniGetir())
        .then((p) => {
          setPush(p.all_enabled);
          void PushBildirimAyariniKaydet(p.all_enabled);
        })
        .catch(() => undefined);
      if (Platform.OS === 'android') {
        void SesOdasiPipAcikMi().then(setPipAcik);
      }
    }, []),
  );

  const pushDegistir = async (v: boolean) => {
    setPush(v);
    await PushBildirimAyariniKaydet(v);
    try {
      const { PushTercihiniKaydet } = await import(
        '../../src/moduller/bildirimler/tercihler/PushTercihleriniYonet'
      );
      await PushTercihiniKaydet('all_enabled', v);
      if (v) {
        const { CihazPushTokeniniKaydet } = await import(
          '../../src/moduller/bildirimler/kayit/CihazPushTokeniniKaydet'
        );
        void CihazPushTokeniniKaydet();
      }
    } catch {
      /* migration yoksa yerel ayar yeterli */
    }
  };

  const pipDegistir = async (v: boolean) => {
    setPipAcik(v);
    await SesOdasiPipKaydet(v);
    if (!v) SesOdasiPipParamsKapat();
  };

  const dilDegeri =
    dilModu === 'SYSTEM' ? t('ayarlar.sistemDiliniKullan') : dilEtiketi;

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="ayarlar">
        <EkranBasligi
          title={t('ayarlar.baslik')}
          subtitle={t('ayarlar.altBaslik')}
          fallbackHref="/profil-ayarlar"
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={[styles.sectionLabel, { color: palet.textDim }]}>
            {t('ayarlar.gorunum')}
          </Text>
          <GorunumSecimKartlari />
          <ListeSatiri
            icon="color-palette-outline"
            label={t('gorunum.tumunuGor')}
            value={t('gorunum.tumunuGorAlt')}
            onPress={() => router.push('/ayarlar/gorunum' as any)}
            last
          />
          <View style={{ height: BoslukTokenlari.lg }} />

          <ListeGrubu title={t('ayarlar.bildirimler')}>
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchLabel}>{t('ayarlar.pushBildirimleri')}</Text>
                <Text style={styles.switchHint}>{t('ayarlar.pushHint')}</Text>
              </View>
              <Switch
                value={push}
                onValueChange={(v) => void pushDegistir(v)}
                trackColor={{
                  true: RenkTokenlari.primary,
                  false: RenkTokenlari.border,
                }}
                thumbColor={palet.bgElevated}
              />
            </View>
            <ListeSatiri
              icon="notifications-outline"
              label={t('ayarlar.kategoriAyarlari')}
              onPress={() => router.push('/bildirim-ayarlari' as any)}
              last
            />
          </ListeGrubu>

          <ListeGrubu title={t('ayarlar.uygulama')}>
            <ListeSatiri
              icon="ribbon-outline"
              label={t('unvanlar.unvanlarim')}
              value={t('unvanlar.altKisa')}
              onPress={() => router.push('/ayarlar/unvanlarim' as any)}
            />
            <ListeSatiri
              icon="language-outline"
              label={t('ayarlar.dil')}
              value={dilDegeri}
              onPress={() => router.push('/ayarlar/dil' as any)}
              last={!androidMu}
            />
            {androidMu ? (
              <View style={[styles.switchRow, styles.switchRowLast]}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchLabel}>{t('ayarlar.pip')}</Text>
                  <Text style={styles.switchHint}>{t('ayarlar.pipHint')}</Text>
                </View>
                <Switch
                  value={pipAcik}
                  onValueChange={(v) => void pipDegistir(v)}
                  trackColor={{
                    true: RenkTokenlari.primary,
                    false: RenkTokenlari.border,
                  }}
                  thumbColor={palet.bgElevated}
                />
              </View>
            ) : null}
          </ListeGrubu>

          <ListeGrubu title={t('ayarlar.gizlilikGuvenlik')}>
            <BiyometriAyarSatiri />
            <ListeSatiri
              icon="eye-off-outline"
              label={t('ayarlar.gizlilikAyarlari')}
              value={t('ayarlar.gizlilikDeger')}
              onPress={() => router.push('/ayarlar/gizlilik' as any)}
            />
            <ListeSatiri
              icon="people-outline"
              label={t('ayarlar.kisilerAramalar')}
              value={t('ayarlar.kisilerDeger')}
              onPress={() => router.push('/ayarlar/kisiler-aramalar' as any)}
            />
            <ListeSatiri
              icon="shield-checkmark-outline"
              label={t('ayarlar.guvenlikMerkezi')}
              onPress={() => router.push('/guvenlik' as any)}
            />
            <ListeSatiri
              icon="ban-outline"
              label={t('ayarlar.engellenenHesaplar')}
              onPress={() => router.push('/engellenen-kullanicilar' as any)}
              last
            />
          </ListeGrubu>

          <ListeGrubu title={t('ayarlar.yardim')}>
            <ListeSatiri
              icon="receipt-outline"
              label={t('ayarlar.satinAlmaGecmisi')}
              onPress={() => router.push('/ayarlar/satin-alma-gecmisi' as any)}
            />
            <ListeSatiri
              icon="headset-outline"
              label={t('ayarlar.canliDestek')}
              onPress={() => router.push('/destek' as any)}
            />
            <ListeSatiri
              icon="mail-outline"
              label={t('ayarlar.bizeUlasin')}
              value={UygulamaKimligi.SUPPORT_EMAIL}
              onPress={() => {
                void Linking.openURL(
                  `mailto:${UygulamaKimligi.SUPPORT_EMAIL}?subject=${encodeURIComponent(t('ayarlar.destekKonu'))}`,
                ).catch(() =>
                  Alert.alert(t('ayarlar.iletisim'), UygulamaKimligi.SUPPORT_EMAIL),
                );
              }}
            />
            <ListeSatiri
              icon="document-text-outline"
              label={t('ayarlar.politikalar')}
              onPress={() => router.push('/politika' as any)}
            />
            <ListeSatiri
              icon="people-outline"
              label={t('ayarlar.toplulukKurallari')}
              onPress={() => router.push('/politika/community_rules' as any)}
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
    paddingHorizontal: HeaderTokenlari.horizontal,
    paddingTop: HeaderTokenlari.contentGap,
    paddingBottom: BoslukTokenlari.xxl,
  },
  sectionLabel: {
    ...TipografiTokenlari.micro,
    paddingHorizontal: BoslukTokenlari.sm,
    textTransform: 'uppercase',
    marginBottom: BoslukTokenlari.sm,
    marginTop: BoslukTokenlari.sm,
    letterSpacing: 0.8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: BoslukTokenlari.md,
    paddingHorizontal: BoslukTokenlari.md,
    gap: BoslukTokenlari.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  switchRowLast: {
    borderBottomWidth: 0,
  },
  switchCopy: { flex: 1, gap: 2 },
  switchLabel: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '600',
  },
  switchHint: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
