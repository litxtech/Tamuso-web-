import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { CamArkaplan } from '../../src/bilesenler/yuzey/CamArkaplan';
import { SatinAlmaGecmisiniGetir } from '../../src/moduller/ai-muzik/islemler/AiMuzikApi';
import type { SatinAlmaGecmisSatir } from '../../src/moduller/ai-muzik/tipler';
import { SatinAlmaItirazOlustur } from '../../src/moduller/cuzdan/itiraz/SatinAlmaItirazIslemleri';
import type { SatinAlmaItirazNeden } from '../../src/moduller/cuzdan/itiraz/SatinAlmaItirazTipleri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri, type CeviriAnahtari } from '../../src/i18n/useCeviri';
import { useDil } from '../../src/i18n/DilSaglayici';

type CeviriFn = (key: CeviriAnahtari, opts?: Record<string, unknown>) => string;

const NEDEN_ANAHTARLARI: Record<SatinAlmaItirazNeden, CeviriAnahtari> = {
  not_received: 'satinAlma.nedenGelmedi',
  wrong_amount: 'satinAlma.nedenYanlisTutar',
  duplicate: 'satinAlma.nedenCift',
  unauthorized: 'satinAlma.nedenIzinsiz',
  other: 'satinAlma.nedenDiger',
};

const NEDENLER = Object.keys(NEDEN_ANAHTARLARI) as SatinAlmaItirazNeden[];

function nedenEtiket(code: string, t: CeviriFn): string {
  const key = NEDEN_ANAHTARLARI[code as SatinAlmaItirazNeden];
  return key ? t(key) : code;
}

function itirazDurumEtiket(status: string, t: CeviriFn): string {
  switch (status) {
    case 'pending':
      return t('satinAlma.incelemede');
    case 'approved':
      return t('satinAlma.itirazOnaylandi');
    case 'rejected':
      return t('satinAlma.itirazReddedildi');
    default:
      return status;
  }
}

function turEtiket(kind: string, t: CeviriFn): string {
  if (kind === 'ai_music') return t('aiMuzik.baslik');
  if (kind === 'coin') return t('cuzdan.coin');
  return kind;
}

function kanalEtiket(row: SatinAlmaGecmisSatir, t: CeviriFn): string {
  const c = (row.channel ?? row.store ?? '').toLowerCase();
  if (c === 'apple') return 'App Store';
  if (c === 'google') return 'Google Play';
  if (c === 'stripe') return t('satinAlma.kanalKart');
  if (c === 'manual') return t('satinAlma.kanalManuel');
  return c || '—';
}

function tutarYazi(row: SatinAlmaGecmisSatir, locale: string): string {
  if (row.amount_try != null && Number(row.amount_try) > 0) {
    return `${Number(row.amount_try).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ₺`;
  }
  if (row.amount_usd != null && Number(row.amount_usd) > 0) {
    return `$${Number(row.amount_usd).toFixed(2)}`;
  }
  return '—';
}

function tarihYazi(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function durumYazi(status: string, t: CeviriFn): string {
  const s = status.toUpperCase();
  if (s === 'CREDITED' || s === 'PAID' || s === 'COMPLETED' || s === 'VERIFIED') {
    return t('satinAlma.durumTamamlandi');
  }
  if (s === 'PENDING' || s === 'PURCHASED' || s === 'VERIFYING') {
    return t('satinAlma.durumBekliyor');
  }
  if (s === 'FAILED' || s === 'CANCELLED') return t('satinAlma.durumBasarisiz');
  if (s === 'REFUNDED') return t('satinAlma.durumIade');
  return status;
}

function itirazBtnStil(t: CeviriFn, status?: string | null) {
  if (status === 'approved') {
    return {
      bg: RenkTokenlari.mint + '22',
      border: RenkTokenlari.mint,
      text: RenkTokenlari.mint,
      label: t('satinAlma.itirazOnaylandi'),
    };
  }
  if (status === 'rejected') {
    return {
      bg: RenkTokenlari.danger + '18',
      border: RenkTokenlari.danger,
      text: RenkTokenlari.danger,
      label: t('satinAlma.itirazReddedildi'),
    };
  }
  if (status === 'pending') {
    return {
      bg: RenkTokenlari.accent + '22',
      border: RenkTokenlari.accent,
      text: RenkTokenlari.accent,
      label: t('satinAlma.incelemede'),
    };
  }
  return {
    bg: RenkTokenlari.primarySoft + '22',
    border: RenkTokenlari.primarySoft,
    text: RenkTokenlari.primarySoft,
    label: t('satinAlma.itirazEt'),
  };
}

export default function SatinAlmaGecmisiEkrani() {
  const { t } = useCeviri();
  const { locale } = useDil();
  const [liste, setListe] = useState<SatinAlmaGecmisSatir[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);
  const [detayAcik, setDetayAcik] = useState(false);
  const [secili, setSecili] = useState<SatinAlmaGecmisSatir | null>(null);
  const [neden, setNeden] = useState<SatinAlmaItirazNeden>('not_received');
  const [not, setNot] = useState('');
  const [gonderiyor, setGonderiyor] = useState(false);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      const rows = await SatinAlmaGecmisiniGetir(80);
      setListe(
        rows.filter((r) => {
          const s = String(r.status ?? '').toUpperCase();
          if (r.kind === 'coin') return s === 'COMPLETED' && Number(r.quantity) > 0;
          if (r.kind === 'ai_music') return s === 'CREDITED';
          return s === 'COMPLETED' || s === 'CREDITED' || s === 'PAID';
        }),
      );
    } catch {
      setListe([]);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const itirazTikla = (item: SatinAlmaGecmisSatir) => {
    setSecili(item);
    if (item.dispute) {
      setDetayAcik(true);
      return;
    }
    setNeden('not_received');
    setNot('');
    setFormAcik(true);
  };

  const itirazGonder = async () => {
    if (!secili) return;
    setGonderiyor(true);
    try {
      await SatinAlmaItirazOlustur({
        kind: secili.kind,
        purchaseId: secili.id,
        reasonCode: neden,
        userNote: not,
      });
      setFormAcik(false);
      Alert.alert(t('satinAlma.itirazAlindi'), t('satinAlma.itirazAlindiMesaj'));
      await yukle();
    } catch (e) {
      Alert.alert(
        t('satinAlma.itiraz'),
        e instanceof Error ? e.message : t('satinAlma.gonderilemedi'),
      );
    } finally {
      setGonderiyor(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('ayarlar.satinAlmaGecmisi')}
        subtitle={t('ayarlar.satinAlmaAlt')}
        fallbackHref="/profil-ayarlar"
      />
      {yukleniyor && liste.length === 0 ? (
        <ActivityIndicator
          color={RenkTokenlari.primarySoft}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(i) => `${i.kind}-${i.id}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.bos}>{t('ayarlar.satinAlmaBos')}</Text>
          }
          renderItem={({ item }) => {
            const btn = itirazBtnStil(t, item.dispute?.status);
            return (
              <View style={styles.kart}>
                <CamArkaplan intensity={36} style={StyleSheet.absoluteFill} hafif />
                <View style={styles.kartUst}>
                  <View style={styles.turRozet}>
                    <Text style={styles.turYazi}>{turEtiket(item.kind, t)}</Text>
                  </View>
                  <Text style={styles.tarih}>
                    {tarihYazi(item.created_at, locale)}
                  </Text>
                </View>
                <Text style={styles.baslik}>{item.title}</Text>
                <Text style={styles.detay}>{item.detail}</Text>
                <View style={styles.altSatir}>
                  <Text style={styles.meta}>{kanalEtiket(item, t)}</Text>
                  <Text style={styles.meta}>{durumYazi(item.status, t)}</Text>
                  <Text style={styles.tutar}>{tutarYazi(item, locale)}</Text>
                </View>

                <Pressable
                  style={[
                    styles.itirazBtn,
                    { backgroundColor: btn.bg, borderColor: btn.border },
                  ]}
                  onPress={() => itirazTikla(item)}
                >
                  <Text style={[styles.itirazBtnYazi, { color: btn.text }]}>
                    {btn.label}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {/* Yeni itiraz formu */}
      <Modal
        visible={formAcik}
        transparent
        animationType="slide"
        onRequestClose={() => setFormAcik(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setFormAcik(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetBaslik}>{t('satinAlma.paketItiraz')}</Text>
            <Text style={styles.sheetAlt}>
              {secili?.title} · {secili ? tutarYazi(secili, locale) : ''}
            </Text>
            <Text style={styles.alanEtiket}>{t('satinAlma.neden')}</Text>
            <View style={styles.nedenWrap}>
              {NEDENLER.map((k) => (
                <Pressable
                  key={k}
                  style={[styles.nedenChip, neden === k && styles.nedenChipAktif]}
                  onPress={() => setNeden(k)}
                >
                  <Text
                    style={[
                      styles.nedenChipYazi,
                      neden === k && styles.nedenChipYaziAktif,
                    ]}
                  >
                    {t(NEDEN_ANAHTARLARI[k])}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.alanEtiket}>{t('satinAlma.aciklamaIstege')}</Text>
            <TextInput
              style={styles.notInput}
              value={not}
              onChangeText={setNot}
              placeholder={t('satinAlma.kisacaAnlat')}
              placeholderTextColor={RenkTokenlari.textDim}
              multiline
              maxLength={800}
            />
            <View style={styles.sheetAksiyon}>
              <Pressable
                style={styles.iptalBtn}
                onPress={() => setFormAcik(false)}
              >
                <Text style={styles.iptalYazi}>{t('ortak.vazgec')}</Text>
              </Pressable>
              <Pressable
                style={[styles.gonderBtn, gonderiyor && { opacity: 0.6 }]}
                disabled={gonderiyor}
                onPress={() => void itirazGonder()}
              >
                <Text style={styles.gonderYazi}>
                  {gonderiyor ? '…' : t('satinAlma.itiraziGonder')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mevcut itiraz detayı */}
      <Modal
        visible={detayAcik}
        transparent
        animationType="fade"
        onRequestClose={() => setDetayAcik(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setDetayAcik(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetBaslik}>{t('satinAlma.itirazDurumu')}</Text>
            <Text style={styles.sheetAlt}>{secili?.title}</Text>
            {secili?.dispute ? (
              <View style={{ gap: 10 }}>
                <Text style={styles.detaySatir}>
                  {t('satinAlma.durum')}:{' '}
                  <Text style={{ fontWeight: '800', color: RenkTokenlari.text }}>
                    {itirazDurumEtiket(secili.dispute.status, t)}
                  </Text>
                </Text>
                <Text style={styles.detaySatir}>
                  {t('satinAlma.neden')}: {nedenEtiket(secili.dispute.reason_code, t)}
                </Text>
                {secili.dispute.user_note ? (
                  <Text style={styles.detaySatir}>
                    {t('satinAlma.senNotun')}: {secili.dispute.user_note}
                  </Text>
                ) : null}
                {secili.dispute.resolution_note ? (
                  <Text style={styles.detaySatir}>
                    {t('satinAlma.geriYanit')}: {secili.dispute.resolution_note}
                  </Text>
                ) : null}
                {secili.dispute.admin_note &&
                secili.dispute.status !== 'pending' ? (
                  <Text style={styles.detaySatir}>
                    {t('satinAlma.ekNot')}: {secili.dispute.admin_note}
                  </Text>
                ) : null}
                <Text style={styles.detaySatir}>
                  {t('satinAlma.acilis')}: {tarihYazi(secili.dispute.created_at, locale)}
                </Text>
                {secili.dispute.reviewed_at ? (
                  <Text style={styles.detaySatir}>
                    {t('satinAlma.karar')}: {tarihYazi(secili.dispute.reviewed_at, locale)}
                  </Text>
                ) : null}
                {secili.dispute.status === 'approved' ? (
                  <Text style={styles.onayNotu}>
                    {t('satinAlma.onayNotu')}
                  </Text>
                ) : null}
              </View>
            ) : null}
            <Pressable
              style={[styles.gonderBtn, { marginTop: 16, alignSelf: 'stretch' }]}
              onPress={() => setDetayAcik(false)}
            >
              <Text style={styles.gonderYazi}>{t('ortak.kapat')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: BoslukTokenlari.lg,
    paddingBottom: 40,
    flexGrow: 1,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginTop: 48,
  },
  kart: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  kartUst: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  turRozet: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.primarySoft + '28',
  },
  turYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  tarih: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  baslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  detay: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    marginTop: 2,
  },
  altSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  tutar: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    marginLeft: 'auto',
  },
  itirazBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
  },
  itirazBtnYazi: {
    ...TipografiTokenlari.caption,
    fontWeight: '800',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: RenkTokenlari.bgElevated,
    borderTopLeftRadius: YaricapTokenlari.xl,
    borderTopRightRadius: YaricapTokenlari.xl,
    padding: BoslukTokenlari.lg,
    paddingBottom: 36,
    gap: 8,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  sheetBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  sheetAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    marginBottom: 8,
  },
  alanEtiket: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
    marginTop: 4,
  },
  nedenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nedenChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  nedenChipAktif: {
    borderColor: RenkTokenlari.primarySoft,
    backgroundColor: RenkTokenlari.primarySoft + '22',
  },
  nedenChipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  nedenChipYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  notInput: {
    minHeight: 80,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    padding: 12,
    color: RenkTokenlari.text,
    textAlignVertical: 'top',
    ...TipografiTokenlari.body,
  },
  sheetAksiyon: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  iptalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    alignItems: 'center',
  },
  iptalYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  gonderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.primarySoft,
    alignItems: 'center',
  },
  gonderYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.bg,
    fontWeight: '800',
  },
  detaySatir: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    lineHeight: 20,
  },
  onayNotu: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.mint,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
  },
});
