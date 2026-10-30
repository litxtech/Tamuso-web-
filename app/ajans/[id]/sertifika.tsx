import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AjansAltEkranKabuk } from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import {
  AjansCta,
  AjansKart,
} from '../../../src/moduller/ajanslar/bilesenler/AjansYonetimPrimitifleri';
import { AjansSahipRozeti } from '../../../src/moduller/ajanslar/bilesenler/AjansSahipRozeti';
import { useAjansRouteId } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansSertifikaDurumGetir,
  type AjansSertifikaDurum,
} from '../../../src/moduller/ajanslar/islemler/AjansSertifikaIslemleri';
import { AjansSertifikaPaylas } from '../../../src/moduller/ajanslar/sertifika/AjansSertifikaPdf';
import { useCeviri } from '../../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../src/i18n/diller';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';

function cubuk(su: number, hedef: number): string {
  if (hedef <= 0) return '0%';
  return `${Math.min(100, Math.round((su / hedef) * 100))}%`;
}

export default function AjansSertifikaEkrani() {
  const { t, dil } = useCeviri();
  const id = useAjansRouteId();
  const [durum, setDurum] = useState<AjansSertifikaDurum | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [paylasiliyor, setPaylasiliyor] = useState(false);
  const sayi = (n: number) => new Intl.NumberFormat(DIL_LOCALE_MAP[dil]).format(n);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      setDurum(await AjansSertifikaDurumGetir(id));
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.sertifikaHata'));
    } finally {
      setYukleniyor(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const paylas = async () => {
    if (!durum?.ready) return;
    setPaylasiliyor(true);
    const r = await AjansSertifikaPaylas(durum);
    setPaylasiliyor(false);
    if (!r.ok) setHata(r.hata);
  };

  const satir = (etiket: string, su: number, hedef: number) => (
    <View style={styles.satir}>
      <View style={styles.satirUst}>
        <Text style={styles.etiket}>{etiket}</Text>
        <Text style={styles.deger}>
          {t('ajans.sertifikaIlerleme', { su: sayi(su), hedef: sayi(hedef) })}
        </Text>
      </View>
      <View style={styles.iz}>
        <View style={[styles.dolu, { width: cubuk(su, hedef) }]} />
      </View>
    </View>
  );

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      title={t('ajans.sertifikaBaslik')}
      subtitle={t('ajans.sertifikaAlt')}
      aktif="sertifika"
      yukleniyor={yukleniyor && !durum}
      refreshing={yukleniyor}
      onRefresh={() => void yukle()}
    >
      {hata ? <Text style={styles.hata}>{hata}</Text> : null}
      {durum ? (
        <>
          <View style={[styles.belge, !durum.ready && styles.soluk]}>
            <Text style={styles.marka}>TAMUSO</Text>
            <AjansSahipRozeti />
            <Text style={styles.ad}>{durum.owner_name}</Text>
            <Text style={styles.ajans}>{durum.agency_name}</Text>
            <Text style={styles.metin}>
              {t('ajans.sertifikaMetin', {
                ad: durum.owner_name,
                ajans: durum.agency_name,
              })}
            </Text>
            <Text style={styles.hediye}>
              {t('ajans.sertifikaHediye', { tutar: String(durum.gift_usd) })}
            </Text>
          </View>
          {!durum.ready ? <Text style={styles.solukYazi}>{t('ajans.sertifikaSoluk')}</Text> : null}
          <AjansKart>
            {satir(t('ajans.sertifikaUyeler'), durum.members, durum.member_threshold)}
            {satir(t('ajans.sertifikaDakika'), durum.live_minutes, durum.live_minutes_threshold)}
            {satir(t('ajans.sertifikaCoin'), durum.coin_sales, durum.coin_sales_threshold)}
          </AjansKart>
          {durum.ready ? (
            <AjansCta
              label={paylasiliyor ? t('ajans.gorusmeYukleniyor') : t('ajans.sertifikaIndir')}
              onPress={() => void paylas()}
            />
          ) : null}
        </>
      ) : null}
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  hata: { color: RenkTokenlari.danger },
  belge: {
    borderWidth: 1,
    borderColor: '#E2B657',
    borderRadius: 18,
    padding: 20,
    gap: 10,
    backgroundColor: '#1A1424',
    alignItems: 'center',
  },
  soluk: { opacity: 0.42 },
  marka: {
    ...TipografiTokenlari.micro,
    letterSpacing: 4,
    color: '#E2B657',
    fontWeight: '800',
  },
  ad: { ...TipografiTokenlari.h2, color: RenkTokenlari.text, fontWeight: '800', textAlign: 'center' },
  ajans: { ...TipografiTokenlari.body, color: '#E2B657', textAlign: 'center' },
  metin: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, textAlign: 'center' },
  hediye: { ...TipografiTokenlari.caption, color: '#F8E7A2', textAlign: 'center', fontWeight: '700' },
  solukYazi: { ...TipografiTokenlari.caption, color: RenkTokenlari.textDim },
  satir: { gap: 6, marginBottom: 10 },
  satirUst: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  etiket: { ...TipografiTokenlari.caption, color: RenkTokenlari.text, flex: 1 },
  deger: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim },
  iz: { height: 6, borderRadius: 99, backgroundColor: RenkTokenlari.pressFill, overflow: 'hidden' },
  dolu: { height: 6, backgroundColor: '#E2B657' },
});
