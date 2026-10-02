import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
  AjansDekontDmMedyayaYukle,
  AjansDekontPdfYerelAl,
  AjansDekontSistemPaylas,
  AjansDekontWhatsAppPaylas,
  AjansSatislariListe,
  type AjansTakipSatis,
} from '../../../src/moduller/ajanslar/islemler/AjansSatisIslemleri';
import {
  MesajDosyaGonder,
  OzelSohbetAcVeyaGetir,
} from '../../../src/moduller/mesajlasma/islemler/MesajGonder';
import { YerelDosyayiPaylas } from '../../../src/moduller/mesajlasma/islemler/MesajDosyaIndir';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';

/** Satış dekontları — PDF dosya olarak aç / WhatsApp / Tamuso */
export default function AjansDekontlarEkrani() {
  const { t } = useCeviri();
  const id = useAjansRouteId();
  const [ajansAd, setAjansAd] = useState<string | null>(null);
  const [okuma, setOkuma] = useState(false);
  const [liste, setListe] = useState<AjansTakipSatis[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const dekontlar = useMemo(
    () =>
      liste.filter(
        (s) =>
          s.payment_status === 'paid' ||
          s.payment_status === 'manual' ||
          !!s.receipt_url ||
          !!s.receipt_note ||
          !!(s.receipt_payload as { pdf_path?: string } | null)?.pdf_path,
      ),
    [liste],
  );

  const pdfAc = useCallback(
    async (s: AjansTakipSatis) => {
      setBusyId(s.id);
      try {
        // Tek tur: signed URL (veya gerekirse üret) → indir → paylaş
        const uri = await AjansDekontPdfYerelAl(
          s.id,
          `dekont-${s.id.slice(0, 8)}.pdf`,
          s,
        );
        await YerelDosyayiPaylas(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('ajans.dekontPdfAc'),
          uti: 'com.adobe.pdf',
        });
        void yukle();
      } catch (e) {
        Alert.alert(
          t('ortak.hata'),
          e instanceof Error ? e.message : t('ajans.dekontPdfYok'),
        );
      } finally {
        setBusyId(null);
      }
    },
    [t, yukle],
  );

  const whatsapp = useCallback(
    async (s: AjansTakipSatis) => {
      setBusyId(s.id);
      try {
        await AjansDekontWhatsAppPaylas({
          saleId: s.id,
          packageTitle: s.package_title || t('ajans.satisLinkVarsayilan'),
          amountTry: Number(s.amount_try ?? 0),
          coins: Number(s.coins ?? 0),
          buyerLabel: s.buyer_display_name || s.buyer_label,
          agencyName: ajansAd,
          sale: s,
        });
      } catch (e) {
        Alert.alert(
          t('ortak.hata'),
          e instanceof Error ? e.message : t('ajans.dekontPaylasilamadi'),
        );
      } finally {
        setBusyId(null);
      }
    },
    [ajansAd, t],
  );

  const tamusoMesaj = useCallback(
    async (s: AjansTakipSatis) => {
      setBusyId(s.id);
      try {
        if (s.buyer_id) {
          const sohbet = await OzelSohbetAcVeyaGetir(s.buyer_id);
          if (!sohbet.ok) throw new Error(sohbet.hata);
          const up = await AjansDekontDmMedyayaYukle(s.id, s);
          const body = [
            t('ajans.dekontTamusoMesajBaslik'),
            s.package_title || t('ajans.satisLinkVarsayilan'),
            `${Number(s.amount_try ?? 0).toLocaleString('tr-TR')} ₺ · ${Number(s.coins ?? 0).toLocaleString('tr-TR')} coin`,
          ].join('\n');
          const gonder = await MesajDosyaGonder({
            threadId: sohbet.threadId,
            mediaUrl: up.url,
            body,
            fileName: up.fileName,
            mime: 'application/pdf',
          });
          if (!gonder.ok) throw new Error(gonder.hata);
          router.push(`/mesaj/${sohbet.threadId}`);
          return;
        }

        await AjansDekontSistemPaylas({
          saleId: s.id,
          packageTitle: s.package_title || t('ajans.satisLinkVarsayilan'),
          amountTry: Number(s.amount_try ?? 0),
          coins: Number(s.coins ?? 0),
          buyerLabel: s.buyer_display_name || s.buyer_label,
          agencyName: ajansAd,
        });
      } catch (e) {
        Alert.alert(
          t('ortak.hata'),
          e instanceof Error ? e.message : t('ajans.dekontPaylasilamadi'),
        );
      } finally {
        setBusyId(null);
      }
    },
    [ajansAd, t],
  );

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      agencyName={ajansAd}
      title={t('ajans.dekontlarBaslik')}
      subtitle={t('ajans.dekontlarAlt')}
      aktif="dekontlar"
      yukleniyor={yukleniyor && !dekontlar.length}
      refreshing={yukleniyor && dekontlar.length > 0}
      onRefresh={() => void yukle()}
    >
      {!okuma ? (
        <AjansKart>
          <AjansHint>{t('ajans.satisTakipYetkiYok')}</AjansHint>
        </AjansKart>
      ) : dekontlar.length === 0 ? (
        <AjansKart>
          <AjansHint>{t('ajans.dekontBos')}</AjansHint>
        </AjansKart>
      ) : (
        dekontlar.map((s) => {
          const pdfVar =
            !!s.receipt_url ||
            !!(s.receipt_payload as { pdf_path?: string } | null)?.pdf_path;
          return (
            <AjansKart key={s.id}>
              <Text style={styles.fisNo}>
                {t('ajans.dekontNo', { id: s.id.slice(0, 8).toUpperCase() })}
              </Text>
              <Text style={styles.baslik}>
                {s.package_title || t('ajans.satisLinkVarsayilan')}
              </Text>
              <Text style={styles.alt}>
                {Number(s.amount_try ?? 0).toLocaleString('tr-TR')} ₺ ·{' '}
                {Number(s.coins ?? 0).toLocaleString('tr-TR')} coin ·{' '}
                {s.payment_status}
              </Text>
              {(s.buyer_display_name || s.buyer_label || s.buyer_email || s.buyer_id) ? (
                <Text style={styles.not}>
                  {[
                    s.buyer_display_name || s.buyer_label,
                    s.buyer_email,
                    s.buyer_id ? `ID ${s.buyer_id.slice(0, 8)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
              {s.receipt_note && s.receipt_note.length <= 80 ? (
                <Text style={styles.not}>{s.receipt_note}</Text>
              ) : null}
              <View style={styles.aksiyonlar}>
                <Pressable
                  style={styles.aksiyon}
                  disabled={busyId === s.id}
                  onPress={() => void pdfAc(s)}
                >
                  <Text style={styles.aksiyonYazi}>
                    {busyId === s.id && !pdfVar
                      ? t('ajans.dekontPdfHazirlaniyor')
                      : t('ajans.dekontPdfAc')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.aksiyon, styles.aksiyonWa]}
                  disabled={busyId === s.id}
                  onPress={() => void whatsapp(s)}
                >
                  <Text style={styles.aksiyonYaziWa}>{t('ajans.dekontWhatsapp')}</Text>
                </Pressable>
                <Pressable
                  style={styles.aksiyon}
                  disabled={busyId === s.id}
                  onPress={() => void tamusoMesaj(s)}
                >
                  <Text style={styles.aksiyonYazi}>{t('ajans.dekontTamuso')}</Text>
                </Pressable>
              </View>
              <Text style={styles.meta}>
                {new Date(s.created_at).toLocaleString('tr-TR')}
              </Text>
            </AjansKart>
          );
        })
      )}
    </AjansAltEkranKabuk>
  );
}

const styles = StyleSheet.create({
  fisNo: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  baslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginTop: 4,
  },
  alt: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  not: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    marginTop: 6,
  },
  meta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 8,
  },
  aksiyonlar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  aksiyon: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  aksiyonWa: {
    backgroundColor: 'rgba(37,211,102,0.12)',
    borderColor: 'rgba(37,211,102,0.35)',
  },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  aksiyonYaziWa: {
    ...TipografiTokenlari.caption,
    color: '#25D366',
    fontWeight: '700',
  },
});
