import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../src/i18n/diller';
import {
  KANAL_ANAHTARI,
  KAZANC_DURUM_ANAHTARI,
  ODEME_DURUM_ANAHTARI,
  UYGUN_DEGIL_ANAHTARI,
  UsdYazi,
  YayinciKazancKayitlariGetir,
  YayinciKazancOzetiGetir,
  YayinciOdemeTalebiIptal,
  YayinciOdemeTalebiOlustur,
  YayinciOdemeTaleplerimiGetir,
  type YayinciKanal,
  type YayinciKazancKaydi,
  type YayinciKazancOzeti,
  type YayinciOdemeTalebi,
} from '../../src/moduller/cuzdan/yayinci/YayinciKazancIslemleri';

const KANALLAR: YayinciKanal[] = ['live', 'voice_room', 'post', 'message', 'call', 'other'];

function tarih(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function YayinciKazanclariEkrani() {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const [ozet, setOzet] = useState<YayinciKazancOzeti | null>(null);
  const [kayitlar, setKayitlar] = useState<YayinciKazancKaydi[]>([]);
  const [talepler, setTalepler] = useState<YayinciOdemeTalebi[]>([]);
  const [kanal, setKanal] = useState<YayinciKanal | null>(null);
  const [durum, setDurum] = useState<'yukleniyor' | 'hazir' | 'hata'>('yukleniyor');
  const [yenileniyor, setYenileniyor] = useState(false);
  const [islemde, setIslemde] = useState(false);
  const [detay, setDetay] = useState<YayinciKazancKaydi | null>(null);

  const yukle = useCallback(async (secKanal: YayinciKanal | null) => {
    try {
      const [o, k, tl] = await Promise.all([
        YayinciKazancOzetiGetir(),
        YayinciKazancKayitlariGetir({ kanal: secKanal, limit: 100 }),
        YayinciOdemeTaleplerimiGetir(),
      ]);
      setOzet(o);
      setKayitlar(k);
      setTalepler(tl);
      setDurum('hazir');
    } catch {
      setDurum('hata');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void yukle(kanal);
    }, [yukle, kanal]),
  );

  const yenile = async () => {
    setYenileniyor(true);
    await yukle(kanal);
    setYenileniyor(false);
  };

  const talepOlustur = () => {
    if (!ozet) return;
    Alert.alert(
      t('cuzdanY.odemeTalebi'),
      t('cuzdanY.odemeTalebiOnay', { tutar: UsdYazi(ozet.available_usd, locale) }),
      [
        { text: t('ortak.iptal'), style: 'cancel' },
        {
          text: t('cuzdanY.talepGonder'),
          onPress: async () => {
            setIslemde(true);
            const r = await YayinciOdemeTalebiOlustur();
            setIslemde(false);
            if (!r.ok) {
              Alert.alert(t('cuzdanY.odemeTalebi'), r.hata);
              return;
            }
            Alert.alert(t('cuzdanY.odemeTalebi'), t('cuzdanY.talepAlindi'));
            void yukle(kanal);
          },
        },
      ],
    );
  };

  const talepIptal = (talep: YayinciOdemeTalebi) => {
    Alert.alert(t('cuzdanY.talepIptal'), t('cuzdanY.talepIptalSoru'), [
      { text: t('ortak.vazgec'), style: 'cancel' },
      {
        text: t('cuzdanY.talepIptal'),
        style: 'destructive',
        onPress: async () => {
          setIslemde(true);
          const r = await YayinciOdemeTalebiIptal(talep.id);
          setIslemde(false);
          if (!r.ok) Alert.alert(t('cuzdanY.talepIptal'), r.hata);
          void yukle(kanal);
        },
      },
    ]);
  };

  const ust = (
    <View style={styles.ust}>
      {durum === 'yukleniyor' ? (
        <ActivityIndicator color={RenkTokenlari.mint} style={{ marginVertical: 24 }} />
      ) : durum === 'hata' || !ozet ? (
        <Text style={styles.alt}>{t('cuzdanY.kazancYuklenemedi')}</Text>
      ) : (
        <>
          <View style={styles.kart}>
            <Text style={styles.altEtiket}>{t('cuzdanY.cekilebilir')}</Text>
            <Text style={styles.buyuk}>{UsdYazi(ozet.available_usd, locale)}</Text>
            <View style={styles.izgara}>
              <Deger etiket={t('cuzdanY.toplamUygunGelir')} deger={UsdYazi(ozet.eligible_gross_usd, locale)} />
              <Deger
                etiket={t('cuzdanY.yayinciPayi', { oran: Math.round(ozet.creator_share * 100) })}
                deger={UsdYazi(ozet.creator_share_usd, locale)}
              />
              <Deger etiket={t('cuzdanY.kesintiler')} deger={UsdYazi(ozet.deductions_usd, locale)} />
              <Deger etiket={t('cuzdanY.bekleyen')} deger={UsdYazi(ozet.pending_usd, locale)} />
              <Deger etiket={t('cuzdanY.guvenlikBekletme')} deger={UsdYazi(ozet.on_hold_usd, locale)} />
              <Deger etiket={t('cuzdanY.odemede')} deger={UsdYazi(ozet.in_payout_usd, locale)} />
              <Deger etiket={t('cuzdanY.tamamlanan')} deger={UsdYazi(ozet.paid_usd, locale)} />
            </View>
            <Text style={styles.alt}>{t('cuzdanY.gelirMetni')}</Text>
          </View>

          <View style={styles.kart}>
            <Text style={styles.kartBaslik}>{t('cuzdanY.odemeBilgileri')}</Text>
            <Satir etiket={t('cuzdanY.minimumOdeme')} deger={UsdYazi(ozet.payout_min_usd, locale)} />
            <Satir
              etiket={t('cuzdanY.mevcutDonem')}
              deger={`${tarih(ozet.current_period_start, locale)} – ${tarih(ozet.current_period_end, locale)}`}
            />
            <Satir etiket={t('cuzdanY.sonrakiIslem')} deger={tarih(ozet.next_processing_date, locale)} />
            <Satir etiket={t('cuzdanY.odemeYontemi')} deger={t('cuzdanY.bankaHavalesi')} />
            <Satir
              etiket={t('cuzdanY.transferUcreti')}
              deger={ozet.payout_fee_usd > 0 ? UsdYazi(ozet.payout_fee_usd, locale) : t('cuzdanY.ucretYok')}
            />
            <Text style={styles.alt}>{t('cuzdanY.metinOdeme')}</Text>
            {ozet.available_usd > 0 && ozet.available_usd < ozet.payout_min_usd ? (
              <Text style={styles.alt}>{t('cuzdanY.minimumAltiDevreder')}</Text>
            ) : null}
            {!ozet.withdrawals_enabled ? (
              <View style={styles.uyari}>
                <Ionicons name="pause-circle-outline" size={15} color={RenkTokenlari.warning} />
                <Text style={styles.uyariYazi}>{t('cuzdanY.cekimKullanilamiyor')}</Text>
              </View>
            ) : ozet.open_request ? null : (
              <Pressable
                onPress={talepOlustur}
                disabled={islemde || ozet.available_usd < ozet.payout_min_usd}
                style={({ pressed }) => [
                  styles.dugme,
                  (pressed || islemde || ozet.available_usd < ozet.payout_min_usd) && { opacity: 0.55 },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.dugmeYazi}>{t('cuzdanY.odemeTalebiOlustur')}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => router.push('/kyc' as never)} style={styles.baglanti}>
              <Text style={styles.baglantiYazi}>{t('cuzdanY.kimlikDogrulama')}</Text>
              <Ionicons name="chevron-forward" size={14} color={RenkTokenlari.textMuted} />
            </Pressable>
            <Pressable onPress={() => router.push('/profil-duzenle' as never)} style={styles.baglanti}>
              <Text style={styles.baglantiYazi}>{t('cuzdanY.bankaBilgileri')}</Text>
              <Ionicons name="chevron-forward" size={14} color={RenkTokenlari.textMuted} />
            </Pressable>
          </View>

          {talepler.length > 0 ? (
            <View style={styles.kart}>
              <Text style={styles.kartBaslik}>{t('cuzdanY.odemeTaleplerim')}</Text>
              {talepler.map((tl) => (
                <View key={tl.id} style={styles.talep}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.satirDeger}>{UsdYazi(tl.net_usd, locale)}</Text>
                    <Text style={styles.altKucuk}>
                      {tarih(tl.created_at, locale)} · {tl.bank_name ?? ''} {tl.iban_masked ?? ''}
                    </Text>
                    {tl.status_note ? <Text style={styles.altKucuk}>{tl.status_note}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.durumEtiket}>{t(ODEME_DURUM_ANAHTARI[tl.status])}</Text>
                    {tl.status === 'pending' ? (
                      <Pressable onPress={() => talepIptal(tl)} disabled={islemde}>
                        <Text style={styles.iptalYazi}>{t('cuzdanY.talepIptal')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.kart}>
            <Text style={styles.kartBaslik}>{t('cuzdanY.kazancKaynaklari')}</Text>
            {KANALLAR.map((k) => (
              <Satir key={k} etiket={t(KANAL_ANAHTARI[k])} deger={UsdYazi(ozet.by_channel[k] ?? 0, locale)} />
            ))}
          </View>

          <View style={styles.filtre}>
            <Cip etiket={t('cuzdanY.tumu')} aktif={kanal === null} onPress={() => setKanal(null)} />
            {KANALLAR.map((k) => (
              <Cip key={k} etiket={t(KANAL_ANAHTARI[k])} aktif={kanal === k} onPress={() => setKanal(k)} />
            ))}
          </View>
        </>
      )}
    </View>
  );

  return (
    <Screen>
      <EkranBasligi title={t('cuzdanY.bolumYayinci')} fallbackHref="/(tabs)/wallet" />
      <FlatList
        data={durum === 'hazir' ? kayitlar : []}
        keyExtractor={(k) => k.id}
        ListHeaderComponent={ust}
        contentContainerStyle={styles.liste}
        refreshControl={<RefreshControl refreshing={yenileniyor} onRefresh={yenile} tintColor={RenkTokenlari.mint} />}
        ListEmptyComponent={
          durum === 'hazir' ? <Text style={styles.bos}>{t('cuzdanY.kazancKaydiYok')}</Text> : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setDetay(detay?.id === item.id ? null : item)} style={styles.kayit}>
            <View style={styles.kayitUst}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.satirDeger}>
                  {t(KANAL_ANAHTARI[item.channel] ?? 'cuzdanY.kanalDiger')}
                  {item.payer_name ? ` · ${item.payer_name}` : ''}
                </Text>
                <Text style={styles.altKucuk}>
                  {tarih(item.created_at, locale)} · {t(KAZANC_DURUM_ANAHTARI[item.status])}
                </Text>
              </View>
              <Text style={[styles.satirDeger, !item.eligible && { color: RenkTokenlari.textMuted }]}>
                {UsdYazi(item.net_usd, locale)}
              </Text>
            </View>
            {detay?.id === item.id ? (
              <View style={styles.kayitDetay}>
                <Satir etiket={t('cuzdanY.coinMiktari')} deger={item.coins.toLocaleString(locale)} />
                <Satir
                  etiket={t('cuzdanY.coinKaynagi')}
                  deger={t(
                    item.coin_source === 'game'
                      ? 'cuzdanY.kaynakOyun'
                      : item.coin_source === 'bonus'
                        ? 'cuzdanY.kaynakOdul'
                        : 'cuzdanY.kaynakSatinAlinan',
                  )}
                />
                <Satir etiket={t('cuzdanY.paylasilabilirGelir')} deger={UsdYazi(item.gross_usd, locale)} />
                <Satir
                  etiket={t('cuzdanY.yayinciPayi', { oran: Math.round(item.creator_rate * 100) })}
                  deger={UsdYazi(item.creator_usd, locale)}
                />
                <Satir etiket={t('cuzdanY.platformPayi')} deger={UsdYazi(item.platform_usd, locale)} />
                <Satir etiket={t('cuzdanY.kesintiler')} deger={UsdYazi(item.deductions_usd, locale)} />
                <Satir etiket={t('cuzdanY.netKazanc')} deger={UsdYazi(item.net_usd, locale)} />
                <Satir
                  etiket={t('cuzdanY.odemeDonemi')}
                  deger={`${tarih(item.period_start, locale)} – ${tarih(item.period_end, locale)}`}
                />
                {!item.eligible ? (
                  <Text style={styles.altKucuk}>
                    {t(UYGUN_DEGIL_ANAHTARI[item.ineligible_reason ?? ''] ?? 'cuzdanY.kazancUygunDegil')}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        )}
      />
    </Screen>
  );
}

function Deger({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View style={styles.deger}>
      <Text style={styles.altKucuk} numberOfLines={2}>
        {etiket}
      </Text>
      <Text style={styles.satirDeger}>{deger}</Text>
    </View>
  );
}

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View style={styles.satir}>
      <Text style={styles.satirEtiket}>{etiket}</Text>
      <Text style={styles.satirDeger}>{deger}</Text>
    </View>
  );
}

function Cip({ etiket, aktif, onPress }: { etiket: string; aktif: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.cip, aktif && styles.cipAktif]}>
      <Text style={[styles.cipYazi, aktif && styles.cipYaziAktif]}>{etiket}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  liste: { paddingHorizontal: 16, paddingBottom: 48, gap: 8 },
  ust: { gap: 12, marginBottom: 8 },
  kart: {
    borderRadius: 18,
    padding: 16,
    gap: 8,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  kartBaslik: { color: RenkTokenlari.text, fontSize: 15, fontWeight: '700' },
  buyuk: { color: RenkTokenlari.text, fontSize: 30, fontWeight: '800' },
  altEtiket: { color: RenkTokenlari.textMuted, fontSize: 12 },
  alt: { color: RenkTokenlari.textMuted, fontSize: 12.5, lineHeight: 18 },
  altKucuk: { color: RenkTokenlari.textMuted, fontSize: 11.5, lineHeight: 16 },
  izgara: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deger: {
    minWidth: '47%',
    flexGrow: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 2,
  },
  satir: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  satirEtiket: { color: RenkTokenlari.textMuted, fontSize: 13, flex: 1 },
  satirDeger: { color: RenkTokenlari.text, fontSize: 13.5, fontWeight: '700' },
  uyari: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,193,7,0.08)',
  },
  uyariYazi: { color: RenkTokenlari.text, fontSize: 12.5, flex: 1 },
  dugme: {
    marginTop: 4,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 11,
    backgroundColor: RenkTokenlari.primary,
  },
  dugmeYazi: { color: RenkTokenlari.textOnPrimary, fontSize: 14, fontWeight: '700' },
  baglanti: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  baglantiYazi: { color: RenkTokenlari.text, fontSize: 13 },
  talep: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.divider,
  },
  durumEtiket: { color: RenkTokenlari.accent, fontSize: 12, fontWeight: '700' },
  iptalYazi: { color: RenkTokenlari.danger, fontSize: 12, fontWeight: '600' },
  filtre: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  cipAktif: { borderColor: RenkTokenlari.accent, backgroundColor: 'rgba(230,206,146,0.12)' },
  cipYazi: { color: RenkTokenlari.textMuted, fontSize: 12, fontWeight: '600' },
  cipYaziAktif: { color: RenkTokenlari.text },
  kayit: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: RenkTokenlari.surface,
    gap: 8,
  },
  kayitUst: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kayitDetay: { gap: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: RenkTokenlari.divider },
  bos: { color: RenkTokenlari.textMuted, textAlign: 'center', paddingVertical: 24 },
});
