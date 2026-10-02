import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
  AjansCta,
  AjansHint,
  AjansKart,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import { useAjansRouteId } from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import {
  AjansIzinlerim,
  AjansIzinVar,
} from '../../../src/moduller/ajanslar/islemler/AjansYonetimV2Islemleri';
import { AjansPanelDetayGetir } from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import {
  AjansFaturaKaydet,
  AjansFaturalariListe,
  type AjansFatura,
} from '../../../src/moduller/ajanslar/islemler/AjansSatisIslemleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';

export default function AjansFaturalarEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [ajansAd, setAjansAd] = useState<string | null>(null);
  const [okuma, setOkuma] = useState(false);
  const [yonet, setYonet] = useState(false);
  const [liste, setListe] = useState<AjansFatura[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);
  const [secili, setSecili] = useState<AjansFatura | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [lineTitle, setLineTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [coins, setCoins] = useState('');
  const [notes, setNotes] = useState('');

  const formDoldur = (f: AjansFatura | null) => {
    setSecili(f);
    setBuyerName(f?.buyer_name ?? '');
    setTaxId(f?.buyer_tax_id ?? '');
    setAddress(f?.buyer_address ?? '');
    setLineTitle(f?.line_title ?? '');
    setAmount(f ? String(f.amount_try ?? '') : '');
    setCoins(f ? String(f.coins ?? '') : '');
    setNotes(f?.notes ?? '');
  };

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [detay, izin] = await Promise.all([
        AjansPanelDetayGetir(id),
        AjansIzinlerim(id),
      ]);
      setAjansAd(detay.agency?.name ?? null);
      const ok =
        AjansIzinVar(izin, 'agency.manage_invoices') ||
        AjansIzinVar(izin, 'agency.view_sales');
      setOkuma(ok);
      setYonet(AjansIzinVar(izin, 'agency.manage_invoices'));
      if (!ok) {
        setListe([]);
        return;
      }
      setListe(await AjansFaturalariListe(id));
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('ajans.satisYuklenemedi'),
      );
    } finally {
      setYukleniyor(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const kaydet = async (status: 'draft' | 'issued') => {
    if (!yonet || busy) return;
    setBusy(true);
    try {
      await AjansFaturaKaydet({
        agencyId: id,
        id: secili?.id,
        buyerName,
        buyerTaxId: taxId,
        buyerAddress: address,
        lineTitle: lineTitle || t('ajans.satisLinkVarsayilan'),
        amountTry: Number(amount.replace(',', '.')) || 0,
        coins: Math.floor(Number(coins.replace(/\D/g, '')) || 0),
        notes,
        status,
      });
      formDoldur(null);
      await yukle();
      Alert.alert(t('ajans.paketKaydedildi'), t('ajans.faturaKaydedildi'));
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
    <AjansAltEkranKabuk
      agencyId={id}
      agencyName={ajansAd}
      title={t('ajans.faturalarBaslik')}
      subtitle={t('ajans.faturalarAlt')}
      aktif="faturalar"
      yukleniyor={yukleniyor && !liste.length}
      refreshing={yukleniyor && liste.length > 0}
      onRefresh={() => void yukle()}
    >
      {!okuma ? (
        <AjansKart>
          <AjansHint>{t('ajans.faturaYetkiYok')}</AjansHint>
        </AjansKart>
      ) : (
        <>
          {yonet ? (
            <AjansKart>
              <Text style={styles.formBaslik}>
                {secili ? t('ajans.faturaDuzenle') : t('ajans.faturaYeni')}
              </Text>
              <Text style={styles.label}>{t('ajans.faturaAlici')}</Text>
              <TextInput
                style={styles.input}
                value={buyerName}
                onChangeText={setBuyerName}
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <Text style={styles.label}>{t('ajans.faturaVergi')}</Text>
              <TextInput
                style={styles.input}
                value={taxId}
                onChangeText={setTaxId}
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <Text style={styles.label}>{t('ajans.faturaAdres')}</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <Text style={styles.label}>{t('ajans.faturaKalem')}</Text>
              <TextInput
                style={styles.input}
                value={lineTitle}
                onChangeText={setLineTitle}
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('ajans.paketListeFiyat')}</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t('ajans.paketCoinMiktar')}</Text>
                  <TextInput
                    style={styles.input}
                    value={coins}
                    onChangeText={setCoins}
                    keyboardType="number-pad"
                    placeholderTextColor={RenkTokenlari.textDim}
                  />
                </View>
              </View>
              <Text style={styles.label}>{t('ajans.faturaNot')}</Text>
              <TextInput
                style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor={RenkTokenlari.textDim}
              />
              <View style={styles.aksiyonSatir}>
                <AjansCta
                  label={t('ajans.faturaTaslak')}
                  onPress={() => void kaydet('draft')}
                  ghost
                  loading={busy}
                />
                <AjansCta
                  label={t('ajans.faturaKes')}
                  onPress={() => void kaydet('issued')}
                  loading={busy}
                />
              </View>
              {secili ? (
                <Pressable onPress={() => formDoldur(null)} style={{ marginTop: 8 }}>
                  <Text style={styles.iptal}>{t('ajans.faturaFormTemizle')}</Text>
                </Pressable>
              ) : null}
            </AjansKart>
          ) : null}

          {liste.length === 0 && !yonet ? (
            <AjansKart>
              <AjansHint>{t('ajans.faturaYetkiYok')}</AjansHint>
            </AjansKart>
          ) : null}

          {liste.map((f) => (
            <AjansKart key={f.id}>
              <Pressable onPress={() => yonet && formDoldur(f)}>
                <Text style={styles.fisNo}>{f.invoice_no}</Text>
                <Text style={styles.baslik}>{f.buyer_name || '—'}</Text>
                <Text style={styles.alt}>
                  {f.line_title} · {Number(f.amount_try).toLocaleString('tr-TR')} ₺
                </Text>
                <Text style={styles.meta}>
                  {f.status === 'issued'
                    ? t('ajans.faturaKesildi')
                    : f.status === 'cancelled'
                      ? t('ajans.faturaIptal')
                      : t('ajans.faturaTaslakDurum')}
                </Text>
              </Pressable>
            </AjansKart>
          ))}
        </>
      )}
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  formBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: { flexDirection: 'row', gap: 8 },
  aksiyonSatir: { gap: 8, marginTop: 12 },
  iptal: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  fisNo: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginTop: 2,
  },
  alt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
});
