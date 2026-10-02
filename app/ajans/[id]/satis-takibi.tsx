import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  AjansAltEkranKabuk,
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
  AjansSatisDogrula,
  AjansSatislariListe,
  type AjansTakipSatis,
} from '../../../src/moduller/ajanslar/islemler/AjansSatisIslemleri';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';

function durumRenk(v: string) {
  if (v === 'valid') return RenkTokenlari.success;
  if (v === 'invalid') return RenkTokenlari.danger;
  return RenkTokenlari.textDim;
}

export default function AjansSatisTakibiEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [ajansAd, setAjansAd] = useState<string | null>(null);
  const [okuma, setOkuma] = useState(false);
  const [inceleme, setInceleme] = useState(false);
  const [liste, setListe] = useState<AjansTakipSatis[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [filtre, setFiltre] = useState<'all' | 'pending' | 'valid' | 'invalid'>(
    'all',
  );

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [detay, izin] = await Promise.all([
        AjansPanelDetayGetir(id),
        AjansIzinlerim(id),
      ]);
      setAjansAd(detay.agency?.name ?? null);
      const g =
        AjansIzinVar(izin, 'agency.view_sales') ||
        AjansIzinVar(izin, 'agency.review_sales');
      setOkuma(g);
      setInceleme(AjansIzinVar(izin, 'agency.review_sales'));
      if (!g) {
        setListe([]);
        return;
      }
      setListe(await AjansSatislariListe(id));
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

  const goster =
    filtre === 'all'
      ? liste
      : liste.filter((s) => s.validation_status === filtre);

  const isaretle = async (
    sale: AjansTakipSatis,
    status: 'valid' | 'invalid' | 'pending',
  ) => {
    if (!inceleme) return;
    try {
      await AjansSatisDogrula({
        agencyId: id,
        saleId: sale.id,
        validationStatus: status,
        invalidReason:
          status === 'invalid' ? t('ajans.satisGecersizNot') : null,
      });
      await yukle();
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('ajans.satisKayitBasarisiz'),
      );
    }
  };

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      agencyName={ajansAd}
      title={t('ajans.satisTakibiBaslik')}
      subtitle={t('ajans.satisTakibiAlt')}
      aktif="satis-takibi"
      yukleniyor={yukleniyor && !liste.length}
      refreshing={yukleniyor && liste.length > 0}
      onRefresh={() => void yukle()}
    >
      {!okuma ? (
        <AjansKart>
          <AjansHint>{t('ajans.satisTakipYetkiYok')}</AjansHint>
        </AjansKart>
      ) : (
        <>
          <View style={styles.filtre}>
            {(['all', 'pending', 'valid', 'invalid'] as const).map((f) => (
              <Pressable
                key={f}
                style={[styles.chip, filtre === f && styles.chipAktif]}
                onPress={() => setFiltre(f)}
              >
                <Text
                  style={[
                    styles.chipYazi,
                    filtre === f && styles.chipYaziAktif,
                  ]}
                >
                  {t(
                    f === 'all'
                      ? 'ajans.satisFiltreHepsi'
                      : f === 'pending'
                        ? 'ajans.satisBekleyen'
                        : f === 'valid'
                          ? 'ajans.satisGecerli'
                          : 'ajans.satisGecersiz',
                  )}
                </Text>
              </Pressable>
            ))}
          </View>

          {goster.length === 0 ? (
            <AjansKart>
              <AjansHint>{t('ajans.satisBos')}</AjansHint>
            </AjansKart>
          ) : null}

          {goster.map((s) => (
            <AjansKart key={s.id}>
              <Text style={styles.baslik}>
                {s.package_title || t('ajans.satisLinkVarsayilan')}
              </Text>
              <Text style={styles.alt}>
                {s.buyer_label || s.buyer_id?.slice(0, 8) || '—'} ·{' '}
                {Number(s.amount_try ?? 0).toLocaleString('tr-TR')} ₺ ·{' '}
                {Number(s.coins ?? 0).toLocaleString('tr-TR')} coin
              </Text>
              <Text style={styles.meta}>
                {t('ajans.satisOdeme')}: {s.payment_status} ·{' '}
                <Text style={{ color: durumRenk(s.validation_status) }}>
                  {s.validation_status === 'valid'
                    ? t('ajans.satisGecerli')
                    : s.validation_status === 'invalid'
                      ? t('ajans.satisGecersiz')
                      : t('ajans.satisBekleyen')}
                </Text>
              </Text>
              {s.receipt_note ? (
                <Text style={styles.alt}>{s.receipt_note}</Text>
              ) : null}
              {inceleme ? (
                <View style={styles.aksiyonSatir}>
                  <Pressable
                    style={styles.aksiyon}
                    onPress={() => void isaretle(s, 'valid')}
                  >
                    <Text style={[styles.aksiyonYazi, { color: RenkTokenlari.success }]}>
                      {t('ajans.satisGecerliIsaret')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.aksiyon}
                    onPress={() => void isaretle(s, 'invalid')}
                  >
                    <Text style={[styles.aksiyonYazi, { color: RenkTokenlari.danger }]}>
                      {t('ajans.satisGecersizIsaret')}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </AjansKart>
          ))}
        </>
      )}
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  filtre: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  chipAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: RenkTokenlari.pressFill,
  },
  chipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  chipYaziAktif: { color: RenkTokenlari.primarySoft },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  alt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  meta: { ...TipografiTokenlari.micro, color: RenkTokenlari.textDim, marginTop: 4 },
  aksiyonSatir: { flexDirection: 'row', gap: 8, marginTop: 10 },
  aksiyon: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    fontWeight: '700',
  },
});
