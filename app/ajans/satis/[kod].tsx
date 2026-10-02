import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { Screen } from '../../../src/components/Screen';
import { EkranBasligi } from '../../../src/components/EkranBasligi';
import { GradientButton } from '../../../src/components/GradientButton';
import { AjansAtmosfer } from '../../../src/moduller/ajanslar/bilesenler/AjansAtmosfer';
import {
  AjansSatisLinkiGetir,
  AjansSatisLinktenKayit,
} from '../../../src/moduller/ajanslar/islemler/AjansSatisIslemleri';
import { useAuth } from '../../../src/contexts/AuthContext';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';

/** Paylaşılabilir satış linki açılış sayfası */
export default function AjansSatisLinkAcilis() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ kod: string }>();
  const kod = Array.isArray(params.kod) ? params.kod[0] : params.kod;
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<Awaited<
    ReturnType<typeof AjansSatisLinkiGetir>
  > | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!kod) return;
    setYukleniyor(true);
    setHata(null);
    try {
      setLink(await AjansSatisLinkiGetir(kod));
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.satisLinkBulunamadi'));
      setLink(null);
    } finally {
      setYukleniyor(false);
    }
  }, [kod, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const talepEt = async () => {
    if (!kod || busy) return;
    if (!user) {
      router.push('/(auth)/login' as any);
      return;
    }
    setBusy(true);
    try {
      await AjansSatisLinktenKayit(kod);
      Alert.alert(t('ajans.satisTalepAlindi'), t('ajans.satisTalepAlt'), [
        {
          text: t('ortak.tamam'),
          onPress: () => router.replace('/(tabs)/wallet' as any),
        },
      ]);
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('ajans.satisKayitBasarisiz'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View style={styles.root}>
        <AjansAtmosfer />
        <EkranBasligi
          title={t('ajans.satisLinkAcilis')}
          subtitle={link?.agency_name}
          fallbackHref={'/(tabs)' as any}
        />
        {yukleniyor ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: 40 }}
          />
        ) : hata ? (
          <Text style={styles.hata}>{hata}</Text>
        ) : link ? (
          <View style={styles.kart}>
            <Text style={styles.baslik}>{link.title}</Text>
            {link.description ? (
              <Text style={styles.aciklama}>{link.description}</Text>
            ) : null}
            <Text style={styles.meta}>
              {Number(link.coins ?? 0).toLocaleString('tr-TR')} coin · liste{' '}
              {Number(link.liste_fiyat_try ?? 0).toLocaleString('tr-TR')} ₺
            </Text>
            <Text style={styles.platform}>
              {t('ajans.satisPlatform')}: {link.selling_platform}
            </Text>
            <GradientButton
              title={
                busy
                  ? t('ajans.paketKaydediliyor')
                  : user
                    ? t('ajans.satisTalepEt')
                    : t('ajans.satisGirisYap')
              }
              onPress={() => void talepEt()}
              loading={busy}
              disabled={busy}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kart: {
    margin: BoslukTokenlari.lg,
    padding: BoslukTokenlari.lg,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgGlass,
    gap: 10,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  aciklama: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    lineHeight: 22,
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  platform: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginBottom: 8,
  },
  hata: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
});
