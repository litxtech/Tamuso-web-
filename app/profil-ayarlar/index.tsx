import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ListeGrubu, ListeSatiri } from '../../src/components/ListeSatiri';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { AdminYetkisiVarMi } from '../../src/moduller/admin/yetki/AdminYetkisiVarMi';
import { useKullanimSuresi } from '../../src/moduller/kullanim-suresi/baglam/KullanimSuresiSaglayici';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, HeaderTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';

/** Profil menüsü — hesap hub; tercihler / gizlilik ayrı sayfalarda */
export default function ProfilAyarlarEkrani() {
  const {
    profile,
    signOut,
    isGuest,
    refreshProfile,
    refreshWallet,
  } = useAuth();
  const { t } = useCeviri();
  const isAdmin = AdminYetkisiVarMi(profile);
  const { formatli: kullanimFormatli, yenile: kullanimYenile } =
    useKullanimSuresi();
  const [upgradeAcik, setUpgradeAcik] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Ağır yenilemeyi her focus'ta yapma — cüzdan/feed jank'ına yol açıyor
      void kullanimYenile();
    }, [kullanimYenile]),
  );

  const misafirEngelle = (fn: () => void) => {
    if (isGuest) {
      setUpgradeAcik(true);
      return;
    }
    fn();
  };

  const onSignOut = () => {
    Alert.alert(t('auth.cikisBaslik'), t('auth.cikisSoru'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('auth.cikisYap'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('profil.ayarlar')}
        subtitle={t('profil.ayarlarAlt')}
        fallbackHref="/(tabs)/profile"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <ListeGrubu title={t('profil.hesap')}>
          <ListeSatiri
            icon="phone-portrait-outline"
            label={t('profil.aktifCihazlar')}
            onPress={() => router.navigate('/(tabs)/cihazlar')}
            last
          />
        </ListeGrubu>

        <ListeGrubu title={t('profil.gizlilikBolum')}>
          <ListeSatiri
            icon="eye-off-outline"
            label={t('ayarlar.gizlilikAyarlari')}
            value={t('ayarlar.gizlilikDeger')}
            onPress={() =>
              misafirEngelle(() => router.push('/ayarlar/gizlilik' as any))
            }
          />
          <ListeSatiri
            icon="ban-outline"
            label={t('ayarlar.engellenenHesaplar')}
            onPress={() => router.push('/engellenen-kullanicilar' as any)}
            last
          />
        </ListeGrubu>

        <ListeGrubu title={t('profil.uygulamaBolum')}>
          <ListeSatiri
            icon="color-palette-outline"
            label={t('ayarlar.baslik')}
            value={t('ayarlar.tercihlerDeger')}
            onPress={() => router.push('/ayarlar' as any)}
          />
          <ListeSatiri
            icon="receipt-outline"
            label={t('ayarlar.satinAlmaGecmisi')}
            value={t('ayarlar.satinAlmaDeger')}
            onPress={() =>
              misafirEngelle(() =>
                router.push('/ayarlar/satin-alma-gecmisi' as any),
              )
            }
          />
          <ListeSatiri
            icon="notifications-outline"
            label={t('ayarlar.bildirimAyarlari')}
            onPress={() => router.push('/bildirim-ayarlari' as any)}
          />
          <ListeSatiri
            icon="shield-checkmark-outline"
            label={t('guvenlik.baslik')}
            onPress={() => router.push('/guvenlik' as any)}
          />
          <ListeSatiri
            icon="time-outline"
            label={t('profil.kullanimSuresi')}
            value={kullanimFormatli}
            showChevron={false}
            last
          />
        </ListeGrubu>

        <ListeGrubu title={t('ayarlar.yardim')}>
          <ListeSatiri
            icon="headset-outline"
            label={t('ayarlar.canliDestek')}
            onPress={() => router.push('/destek' as any)}
          />
          <ListeSatiri
            icon="document-text-outline"
            label={t('ayarlar.politikalar')}
            onPress={() => router.push('/politika' as any)}
            last
          />
        </ListeGrubu>

        {isAdmin ? (
          <ListeGrubu title={t('profil.yonetim')}>
            <ListeSatiri
              icon="construct-outline"
              label={t('profil.adminPaneli')}
              onPress={() => router.push('/admin' as any)}
              last
            />
          </ListeGrubu>
        ) : null}

        <Pressable onPress={onSignOut} style={styles.logout}>
          <Text style={styles.logoutText}>{t('auth.cikisYap')}</Text>
        </Pressable>

        {!isGuest ? (
          <Pressable
            onPress={() => router.push('/hesap-sil' as any)}
            style={styles.deleteAccount}
          >
            <Text style={styles.deleteAccountText}>{t('hesapSil.baslik')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <HesabiTamamlaKarti
        visible={upgradeAcik}
        onClose={() => setUpgradeAcik(false)}
        onCompleted={() => {
          void refreshProfile();
          void refreshWallet();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: HeaderTokenlari.horizontal,
    paddingTop: HeaderTokenlari.contentGap,
    paddingBottom: BoslukTokenlari.xxxl,
  },
  logout: { alignItems: 'center', paddingVertical: BoslukTokenlari.lg },
  logoutText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    fontWeight: '700',
  },
  deleteAccount: { alignItems: 'center', paddingBottom: BoslukTokenlari.md },
  deleteAccountText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
});
