import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi, guvenliGeriDon } from '../../../../src/components/EkranBasligi';
import {
  AjansSertifikaAyarGetir,
  AjansSertifikaAyarKaydet,
} from '../../../../src/moduller/ajanslar/islemler/AjansSertifikaIslemleri';
import { AjansCta } from '../../../../src/moduller/ajanslar/bilesenler/AjansYonetimPrimitifleri';
import { useCeviri } from '../../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';

export default function AdminAjansSertifikaEkrani() {
  const { t } = useCeviri();
  const [uyeler, setUyeler] = useState('100');
  const [dakika, setDakika] = useState('1000000');
  const [coin, setCoin] = useState('50000000');
  const [hediye, setHediye] = useState('1000');
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const a = await AjansSertifikaAyarGetir();
      setUyeler(String(a.member_threshold));
      setDakika(String(a.live_minutes_threshold));
      setCoin(String(a.coin_sales_threshold));
      setHediye(String(a.gift_usd));
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.sertifikaHata'));
    } finally {
      setYukleniyor(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const kaydet = async () => {
    setMesaj(null);
    setHata(null);
    try {
      await AjansSertifikaAyarKaydet({
        member_threshold: Number(uyeler),
        live_minutes_threshold: Number(dakika),
        coin_sales_threshold: Number(coin),
        gift_usd: Number(hediye),
      });
      setMesaj(t('ajans.tamam'));
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.sertifikaHata'));
    }
  };

  const alan = (etiket: string, deger: string, set: (v: string) => void) => (
    <View style={styles.alan}>
      <Text style={styles.etiket}>{etiket}</Text>
      <TextInput
        value={deger}
        onChangeText={set}
        keyboardType="number-pad"
        style={styles.input}
        placeholderTextColor={RenkTokenlari.textDim}
        accessibilityLabel={etiket}
      />
    </View>
  );

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('ajans.sertifikaAdmin')}
        onBack={() => guvenliGeriDon('/admin')}
        border
      />
      <View style={styles.govde}>
        {yukleniyor ? <Text style={styles.etiket}>{t('ajans.gorusmeYukleniyor')}</Text> : null}
        {hata ? <Text style={styles.hata}>{hata}</Text> : null}
        {mesaj ? <Text style={styles.mesaj}>{mesaj}</Text> : null}
        {alan(t('ajans.sertifikaAdminUyeler'), uyeler, setUyeler)}
        {alan(t('ajans.sertifikaAdminDakika'), dakika, setDakika)}
        {alan(t('ajans.sertifikaAdminCoin'), coin, setCoin)}
        {alan(t('ajans.sertifikaAdminHediye'), hediye, setHediye)}
        <AjansCta label={t('ajans.sertifikaAdminKaydet')} onPress={() => void kaydet()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  govde: { padding: 16, gap: 12 },
  alan: { gap: 6 },
  etiket: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  input: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: RenkTokenlari.text,
  },
  hata: { color: RenkTokenlari.danger },
  mesaj: { color: '#E2B657' },
});
