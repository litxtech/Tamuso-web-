import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { GradientButton } from '../../src/components/GradientButton';
import { useAuth } from '../../src/contexts/AuthContext';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { BenimDavetKodumuAl } from '../../src/moduller/paylasim-linkleri/okuma/DavetKodunuAl';
import { UygulamayiPaylas } from '../../src/moduller/paylasim-linkleri/islemler/UygulamayiPaylas';
import {
  PaylasimHttpsUrlOlustur,
  PaylasimDeepLinkOlustur,
} from '../../src/moduller/paylasim-linkleri/PaylasimUrl';
import type { KullaniciDavetKodu } from '../../src/moduller/paylasim-linkleri/tipler';
import { OrtamDegiskenleri } from '../../src/yapilandirma/OrtamDegiskenleri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

const LOCALE_MAP: Record<string, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  ar: 'ar',
  fr: 'fr-FR',
  fil: 'fil-PH',
};

/** Kullanıcı: kişisel davet linki oluştur / kopyala / paylaş */
export default function PaylasimEkrani() {
  const { t, dil } = useCeviri();
  const { isGuest } = useAuth();
  const [upgradeAcik, setUpgradeAcik] = useState(false);
  const [davet, setDavet] = useState<KullaniciDavetKodu | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isGuest) {
        setYukleniyor(false);
        return;
      }
      setYukleniyor(true);
      BenimDavetKodumuAl()
        .then(setDavet)
        .catch(() => setDavet(null))
        .finally(() => setYukleniyor(false));
    }, [isGuest]),
  );

  const httpsUrl = davet ? PaylasimHttpsUrlOlustur(davet.code) : '';
  const deepUrl = davet ? PaylasimDeepLinkOlustur(davet.code) : '';

  const kopyala = async (metin: string) => {
    try {
      const Clipboard = await import('expo-clipboard');
      await Clipboard.setStringAsync(metin);
      Alert.alert(t('paylasim.kopyalandiBaslik'), t('paylasim.kopyalandiBody'));
      return;
    } catch {
      // Native modul yoksa sistem paylasim paneli
    }
    try {
      await Share.share({ message: metin });
    } catch {
      Alert.alert(t('ortak.kopyala'), t('paylasim.kopyalaBasarisiz'));
    }
  };

  const paylas = async () => {
    if (isGuest) {
      setUpgradeAcik(true);
      return;
    }
    setBusy(true);
    const r = await UygulamayiPaylas();
    setBusy(false);
    if (!r.ok) Alert.alert(t('paylasim.paylasimHata'), r.hata);
    else {
      const guncel = await BenimDavetKodumuAl().catch(() => null);
      if (guncel) setDavet(guncel);
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('paylasim.baslik')}
        subtitle={t('paylasim.altBaslik')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[...RenkTokenlari.gradientCard]} style={styles.kart}>
          <Text style={styles.fisilti}>{t('paylasim.davet')}</Text>
          <Text style={styles.baslik}>{OrtamDegiskenleri.uygulamaAdi}</Text>
          <Text style={styles.alt}>{t('paylasim.aciklama')}</Text>

          {isGuest ? (
            <GradientButton
              title={t('paylasim.hesabiTamamla')}
              onPress={() => setUpgradeAcik(true)}
            />
          ) : yukleniyor ? (
            <ActivityIndicator color={RenkTokenlari.primarySoft} />
          ) : davet ? (
            <>
              <View style={styles.kodKutu}>
                <Text style={styles.kodEtiket}>{t('paylasim.davetKodun')}</Text>
                <Text style={styles.kod}>{davet.code}</Text>
                <Text style={styles.istatistik}>
                  {t('paylasim.tiklama', {
                    count: davet.click_count.toLocaleString(
                      LOCALE_MAP[dil] ?? dil,
                    ),
                  })}
                </Text>
              </View>

              <View style={styles.linkKutu}>
                <Text style={styles.linkEtiket}>{t('paylasim.paylasimLinki')}</Text>
                <Text style={styles.link} selectable>
                  {httpsUrl}
                </Text>
                <Pressable
                  style={styles.kopya}
                  onPress={() => void kopyala(httpsUrl)}
                >
                  <Ionicons name="copy-outline" size={16} color={RenkTokenlari.primarySoft} />
                  <Text style={styles.kopyaYazi}>{t('ortak.kopyala')}</Text>
                </Pressable>
              </View>

              <GradientButton
                title={
                  busy ? t('paylasim.aciliyor') : t('paylasim.whatsappPaylas')
                }
                onPress={() => void paylas()}
              />

              <Pressable
                style={styles.deep}
                onPress={() => void kopyala(deepUrl)}
              >
                <Text style={styles.deepYazi}>{t('paylasim.derinLinkKopyala')}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.hata}>{t('paylasim.kodAlinamadi')}</Text>
          )}
        </LinearGradient>
      </ScrollView>

      <HesabiTamamlaKarti
        visible={upgradeAcik}
        onClose={() => setUpgradeAcik(false)}
        onCompleted={() => setUpgradeAcik(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
  },
  kart: {
    padding: BoslukTokenlari.xl,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: BoslukTokenlari.md,
  },
  fisilti: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1.4,
  },
  baslik: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
  },
  alt: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
  kodKutu: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
    gap: 4,
  },
  kodEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  kod: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 2,
  },
  istatistik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  linkKutu: {
    gap: 6,
  },
  linkEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  link: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
  },
  kopya: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  kopyaYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  deep: { alignItems: 'center', paddingVertical: 8 },
  deepYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
  },
  hata: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
  },
});
