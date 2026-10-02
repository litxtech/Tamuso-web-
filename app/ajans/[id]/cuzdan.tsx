import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AjansAltEkranKabuk,
  AjansBolumBaslik,
  AjansHint,
  AjansKart,
} from '../../../src/moduller/ajanslar/bilesenler/AjansAltEkranKabuk';
import {
  ajansHref,
  useAjansRouteId,
} from '../../../src/moduller/ajanslar/kancalar/useAjansRouteId';
import { AjansPanelDetayGetir } from '../../../src/moduller/ajanslar/islemler/AjansPanelIslemleri';
import {
  AjansCuzdanHareketleriGetir,
  type AjansCuzdanHareket,
  type AjansSatisOzeti,
} from '../../../src/moduller/ajanslar/islemler/AjansSatisIslemleri';
import { CanliCoinSimgesi } from '../../../src/moduller/cuzdan/bilesenler/CanliCoinSimgesi';
import { RenkTokenlari } from '../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../src/tasarim-sistemi/TipografiTokenlari';
import {
  GolgeTokenlari,
  YaricapTokenlari,
} from '../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../../src/i18n/useCeviri';
import type { CeviriAnahtari } from '../../../src/i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../src/i18n/diller';

const HEDIYE_ESIK = 10_000;
const HAREKET_LIMIT = 200;

type Donem = 'bugun' | '7' | '30' | 'tumu';
type Filtre = 'tumu' | 'satis' | 'hediye' | 'dagitim';

const DONEMLER: { id: Donem; label: CeviriAnahtari }[] = [
  { id: 'bugun', label: 'ajans.cuzdanDonemBugun' },
  { id: '7', label: 'ajans.cuzdanDonem7' },
  { id: '30', label: 'ajans.cuzdanDonem30' },
  { id: 'tumu', label: 'ajans.cuzdanDonemTumu' },
];

const FILTRELER: { id: Filtre; label: CeviriAnahtari }[] = [
  { id: 'tumu', label: 'ajans.cuzdanFiltreTumu' },
  { id: 'satis', label: 'ajans.cuzdanFiltreSatis' },
  { id: 'hediye', label: 'ajans.cuzdanFiltreHediye' },
  { id: 'dagitim', label: 'ajans.cuzdanFiltreDagitim' },
];

const AKSIYONLAR: {
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: CeviriAnahtari;
}[] = [
  { path: 'islemler', icon: 'paper-plane-outline', label: 'ajans.cuzdanAksiyonDagit' },
  { path: 'paketler', icon: 'pricetags-outline', label: 'ajans.cuzdanAksiyonPaket' },
  { path: 'satis-takibi', icon: 'checkmark-done-outline', label: 'ajans.cuzdanAksiyonSatis' },
  { path: 'dekontlar', icon: 'receipt-outline', label: 'ajans.cuzdanAksiyonDekont' },
  { path: 'faturalar', icon: 'document-text-outline', label: 'ajans.cuzdanAksiyonFatura' },
  { path: 'en-cok-alicilar', icon: 'trophy-outline', label: 'ajans.cuzdanAksiyonAlici' },
];

function sayi(n: number, locale: string) {
  return Number(n || 0).toLocaleString(locale);
}

function nedenGrup(reason: string): Filtre {
  if (reason === 'package_sale') return 'satis';
  if (reason === 'sale_volume_gift' || reason === 'sale_volume_gift_backfill') {
    return 'hediye';
  }
  if (reason === 'distribution_out') return 'dagitim';
  return 'tumu';
}

function nedenEtiket(reason: string, t: (k: CeviriAnahtari) => string): string {
  switch (reason) {
    case 'package_sale':
      return t('ajans.cuzdanNedenSatis');
    case 'sale_volume_gift':
    case 'sale_volume_gift_backfill':
      return t('ajans.cuzdanNedenHediye');
    case 'distribution_out':
      return t('ajans.cuzdanNedenDagitim');
    default:
      return reason;
  }
}

function nedenIkon(reason: string): keyof typeof Ionicons.glyphMap {
  switch (reason) {
    case 'package_sale':
      return 'cart-outline';
    case 'sale_volume_gift':
    case 'sale_volume_gift_backfill':
      return 'gift-outline';
    case 'distribution_out':
      return 'arrow-up-outline';
    default:
      return 'swap-horizontal-outline';
  }
}

function birimEtiket(
  currency: AjansCuzdanHareket['currency'],
  t: (k: CeviriAnahtari) => string,
): string {
  if (currency === 'distribution') return t('ajans.cuzdanBirimDagitim');
  if (currency === 'diamonds') return t('ajans.cuzdanBirimElmas');
  return t('ajans.cuzdanBirimCoin');
}

function ayniGun(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function donemBaslangic(donem: Donem): number | null {
  if (donem === 'tumu') return null;
  const now = new Date();
  if (donem === 'bugun') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }
  const gun = donem === '7' ? 7 : 30;
  return Date.now() - gun * 24 * 60 * 60 * 1000;
}

export default function AjansCuzdanEkrani() {
  const { t, dil } = useCeviri();
  const locale = DIL_LOCALE_MAP[dil];
  const id = useAjansRouteId();
  const [ajansAd, setAjansAd] = useState<string | null>(null);
  const [wallet, setWallet] = useState<
    (AjansSatisOzeti['cuzdan'] & { updated_at?: string }) | null
  >(null);
  const [hareketler, setHareketler] = useState<AjansCuzdanHareket[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [donem, setDonem] = useState<Donem>('tumu');
  const [filtre, setFiltre] = useState<Filtre>('tumu');

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const [detay, cz] = await Promise.all([
        AjansPanelDetayGetir(id),
        AjansCuzdanHareketleriGetir(id, HAREKET_LIMIT),
      ]);
      setAjansAd(detay.agency?.name ?? null);
      setWallet(cz.wallet);
      setHareketler(cz.hareketler);
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('ajans.yuklenemedi'),
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

  const hediyePct = useMemo(() => {
    if (!wallet) return 0;
    const kalan = Math.max(0, Number(wallet.sonraki_hediye_icin) || 0);
    const ilerleme = Math.max(0, HEDIYE_ESIK - kalan);
    return Math.min(100, Math.round((ilerleme / HEDIYE_ESIK) * 100));
  }, [wallet]);

  const donemHareket = useMemo(() => {
    const bas = donemBaslangic(donem);
    if (bas == null) return hareketler;
    return hareketler.filter((h) => new Date(h.created_at).getTime() >= bas);
  }, [donem, hareketler]);

  const ozet = useMemo(() => {
    let giren = 0;
    let cikan = 0;
    for (const h of donemHareket) {
      const d = Number(h.delta) || 0;
      if (d > 0) giren += d;
      else if (d < 0) cikan += Math.abs(d);
    }
    return { giren, cikan, net: giren - cikan };
  }, [donemHareket]);

  const liste = useMemo(() => {
    if (filtre === 'tumu') return donemHareket;
    return donemHareket.filter((h) => nedenGrup(h.reason) === filtre);
  }, [donemHareket, filtre]);

  const gruplar = useMemo(() => {
    const bugun = new Date();
    const dun = new Date();
    dun.setDate(bugun.getDate() - 1);
    const kovalar: { key: string; baslik: string; satirlar: AjansCuzdanHareket[] }[] =
      [];
    for (const h of liste) {
      const d = new Date(h.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const son = kovalar[kovalar.length - 1];
      if (son?.key === key) {
        son.satirlar.push(h);
        continue;
      }
      const baslik = ayniGun(d, bugun)
        ? t('ajans.cuzdanDonemBugun')
        : ayniGun(d, dun)
          ? t('ajans.cuzdanDun')
          : d.toLocaleDateString(locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'long',
            });
      kovalar.push({ key, baslik, satirlar: [h] });
    }
    return kovalar;
  }, [liste, locale, t]);

  const git = (path: string) => {
    router.push(ajansHref(id, path) as any);
  };

  return (
    <AjansAltEkranKabuk
      agencyId={id}
      agencyName={ajansAd}
      title={t('ajans.cuzdanBaslik')}
      subtitle={t('ajans.cuzdanAlt')}
      aktif="cuzdan"
      yukleniyor={yukleniyor && !wallet}
      refreshing={yukleniyor && !!wallet}
      onRefresh={() => void yukle()}
    >
      {wallet ? (
        <>
          <LinearGradient
            colors={[...RenkTokenlari.gradientCard]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroUst}>
              <CanliCoinSimgesi size={36} />
              <View style={styles.heroKimlik}>
                <Text style={styles.heroEtiket}>{t('ajans.cuzdanCoin')}</Text>
                <Text style={styles.heroAjans} numberOfLines={1}>
                  {ajansAd || t('ajans.cuzdanBaslik')}
                </Text>
              </View>
            </View>
            <Text style={styles.heroDeger}>{sayi(wallet.coins, locale)}</Text>
            {wallet.updated_at ? (
              <Text style={styles.heroGuncelleme}>
                {t('ajans.cuzdanGuncelleme', {
                  zaman: new Date(wallet.updated_at).toLocaleString(locale, {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </Text>
            ) : null}
            <View style={styles.heroFayans}>
              <View style={styles.fayans}>
                <Text style={styles.fayansEtiket} numberOfLines={2}>
                  {t('ajans.cuzdanDagitim')}
                </Text>
                <Text style={styles.fayansDeger}>
                  {sayi(wallet.distribution_balance, locale)}
                </Text>
              </View>
              <View style={styles.fayans}>
                <Text style={styles.fayansEtiket}>{t('ajans.cuzdanElmas')}</Text>
                <Text style={styles.fayansDeger}>
                  {sayi(wallet.diamonds, locale)}
                </Text>
              </View>
              <View style={styles.fayans}>
                <Text style={styles.fayansEtiket} numberOfLines={2}>
                  {t('ajans.cuzdanSatilanEtiket')}
                </Text>
                <Text style={styles.fayansDeger}>
                  {sayi(wallet.lifetime_coins_sold, locale)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <AjansKart>
            <View style={styles.cipSatir}>
              {DONEMLER.map((d) => {
                const secili = donem === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => setDonem(d.id)}
                    style={[styles.cip, secili && styles.cipAktif]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: secili }}
                  >
                    <Text style={[styles.cipYazi, secili && styles.cipYaziAktif]}>
                      {t(d.label)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.ozetSatir}>
              <View style={styles.ozetHucre}>
                <Ionicons
                  name="arrow-down-circle"
                  size={16}
                  color={RenkTokenlari.success}
                />
                <Text style={styles.ozetEtiket}>{t('ajans.cuzdanGiren')}</Text>
                <Text style={[styles.ozetDeger, styles.deltaPoz]}>
                  +{sayi(ozet.giren, locale)}
                </Text>
              </View>
              <View style={styles.ozetHucre}>
                <Ionicons
                  name="arrow-up-circle"
                  size={16}
                  color={RenkTokenlari.danger}
                />
                <Text style={styles.ozetEtiket}>{t('ajans.cuzdanCikan')}</Text>
                <Text style={[styles.ozetDeger, styles.deltaNeg]}>
                  −{sayi(ozet.cikan, locale)}
                </Text>
              </View>
              <View style={styles.ozetHucre}>
                <Ionicons
                  name="stats-chart-outline"
                  size={16}
                  color={RenkTokenlari.primarySoft}
                />
                <Text style={styles.ozetEtiket}>{t('ajans.cuzdanNet')}</Text>
                <Text
                  style={[
                    styles.ozetDeger,
                    ozet.net >= 0 ? styles.deltaPoz : styles.deltaNeg,
                  ]}
                >
                  {ozet.net > 0 ? '+' : ozet.net < 0 ? '−' : ''}
                  {sayi(Math.abs(ozet.net), locale)}
                </Text>
              </View>
            </View>
          </AjansKart>

          <AjansKart>
            <View style={styles.progressBas}>
              <Text style={styles.progressBaslik}>
                {t('ajans.cuzdanHediyeIlerleme')}
              </Text>
              <Text style={styles.progressPct}>%{hediyePct}</Text>
            </View>
            <Text style={styles.progressEsik}>
              {t('ajans.cuzdanHediyeEsik', {
                done: sayi(HEDIYE_ESIK - Number(wallet.sonraki_hediye_icin || 0), locale),
                total: sayi(HEDIYE_ESIK, locale),
              })}
            </Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${hediyePct}%` }]} />
            </View>
            <View style={styles.hediyeAlt}>
              <View style={styles.hediyeRozet}>
                <Ionicons name="gift-outline" size={14} color={RenkTokenlari.primarySoft} />
                <Text style={styles.hediyeRozetYazi}>
                  {t('ajans.cuzdanHediyeKazanildi', {
                    n: Number(wallet.sale_gift_milestones) || 0,
                  })}
                </Text>
              </View>
              <Text style={styles.progressMeta}>
                {t('ajans.cuzdanHediyeKalan', {
                  n: sayi(wallet.sonraki_hediye_icin, locale),
                })}
              </Text>
            </View>
            <Text style={styles.progressHint}>{t('ajans.cuzdanHediyeKural')}</Text>
          </AjansKart>

          <AjansBolumBaslik>{t('ajans.cuzdanHizli')}</AjansBolumBaslik>
          <View style={styles.aksiyonSatir}>
            {AKSIYONLAR.slice(0, 3).map((a) => (
              <Aksiyon
                key={a.path}
                icon={a.icon}
                label={t(a.label)}
                onPress={() => git(a.path)}
              />
            ))}
          </View>
          <View style={styles.aksiyonSatir}>
            {AKSIYONLAR.slice(3).map((a) => (
              <Aksiyon
                key={a.path}
                icon={a.icon}
                label={t(a.label)}
                onPress={() => git(a.path)}
              />
            ))}
          </View>

          <AjansBolumBaslik>{t('ajans.cuzdanHareketler')}</AjansBolumBaslik>
          <View style={styles.cipSatir}>
            {FILTRELER.map((f) => {
              const secili = filtre === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFiltre(f.id)}
                  style={[styles.cip, secili && styles.cipAktif]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: secili }}
                >
                  <Text style={[styles.cipYazi, secili && styles.cipYaziAktif]}>
                    {t(f.label)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {hareketler.length >= HAREKET_LIMIT ? (
            <AjansHint>
              {t('ajans.cuzdanHareketLimit', { n: HAREKET_LIMIT })}
            </AjansHint>
          ) : null}

          {liste.length === 0 ? (
            <AjansKart>
              <AjansHint>
                {hareketler.length === 0
                  ? t('ajans.cuzdanHareketBos')
                  : t('ajans.cuzdanHareketBosFiltre')}
              </AjansHint>
            </AjansKart>
          ) : (
            gruplar.map((g) => (
              <View key={g.key} style={styles.grup}>
                <Text style={styles.gunBaslik}>{g.baslik}</Text>
                <AjansKart>
                  {g.satirlar.map((h, i) => {
                    const meta = (h.meta ?? {}) as Record<string, unknown>;
                    const alt =
                      h.reason === 'package_sale'
                        ? [
                            meta.buyer_name,
                            meta.amount_try != null
                              ? `${Number(meta.amount_try).toLocaleString(locale)} ₺`
                              : null,
                            meta.coins_sold != null
                              ? `${sayi(Number(meta.coins_sold), locale)} coin`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : '';
                    const pozitif = h.delta > 0;
                    return (
                      <View
                        key={h.id}
                        style={[
                          styles.hareket,
                          i < g.satirlar.length - 1 && styles.hareketCizgi,
                        ]}
                      >
                        <View style={styles.hareketIkon}>
                          <Ionicons
                            name={nedenIkon(h.reason)}
                            size={16}
                            color={RenkTokenlari.primarySoft}
                          />
                        </View>
                        <View style={styles.hareketGovde}>
                          <Text style={styles.hareketBaslik}>
                            {nedenEtiket(h.reason, t)}
                          </Text>
                          {alt ? <Text style={styles.hareketAlt}>{alt}</Text> : null}
                          <Text style={styles.hareketMeta}>
                            {new Date(h.created_at).toLocaleTimeString(locale, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' · '}
                            {birimEtiket(h.currency, t)}
                            {h.delta !== 0
                              ? ` · ${t('ajans.cuzdanBakiyeSonrasi', {
                                  n: sayi(h.balance_after, locale),
                                })}`
                              : ''}
                          </Text>
                        </View>
                        {h.delta !== 0 ? (
                          <Text
                            style={[
                              styles.delta,
                              pozitif ? styles.deltaPoz : styles.deltaNeg,
                            ]}
                          >
                            {pozitif ? '+' : '−'}
                            {sayi(Math.abs(h.delta), locale)}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </AjansKart>
              </View>
            ))
          )}
        </>
      ) : (
        <AjansKart>
          <AjansHint>{t('ajans.yuklenemedi')}</AjansHint>
        </AjansKart>
      )}
    </AjansAltEkranKabuk>
  );
}

function Aksiyon({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.aksiyon, pressed && styles.aksiyonBasili]}
      accessibilityRole="button"
    >
      <View style={styles.aksiyonIkon}>
        <Ionicons name={icon} size={18} color={RenkTokenlari.primarySoft} />
      </View>
      <Text style={styles.aksiyonYazi} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: YaricapTokenlari.lg,
    padding: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    ...GolgeTokenlari.card,
  },
  heroUst: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroKimlik: { flex: 1, gap: 2 },
  heroEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroAjans: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  heroDeger: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 40,
    lineHeight: 46,
    marginTop: 14,
  },
  heroGuncelleme: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  heroFayans: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  fayans: {
    flex: 1,
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.pressFill,
  },
  fayansEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  fayansDeger: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '800',
  },
  cipSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.pressFill,
  },
  cipAktif: { backgroundColor: RenkTokenlari.primarySoft },
  cipYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
  cipYaziAktif: { color: '#fff' },
  ozetSatir: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RenkTokenlari.border,
  },
  ozetHucre: { flex: 1, gap: 4, alignItems: 'flex-start' },
  ozetEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  ozetDeger: {
    ...TipografiTokenlari.body,
    fontWeight: '800',
  },
  progressBas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  progressPct: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  progressEsik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    marginTop: 6,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: RenkTokenlari.primarySoft,
    borderRadius: 5,
  },
  hediyeAlt: { marginTop: 12, gap: 8 },
  hediyeRozet: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.pressFill,
  },
  hediyeRozetYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  progressMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
  },
  progressHint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 8,
  },
  aksiyonSatir: { flexDirection: 'row', gap: 8 },
  aksiyon: {
    flex: 1,
    minHeight: 84,
    borderRadius: YaricapTokenlari.md,
    padding: 12,
    gap: 8,
    backgroundColor: RenkTokenlari.bgGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
  },
  aksiyonBasili: { opacity: 0.72 },
  aksiyonIkon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.pressFill,
  },
  aksiyonYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  grup: { gap: 8 },
  gunBaslik: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  hareket: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  hareketCizgi: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RenkTokenlari.border,
  },
  hareketIkon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.pressFill,
  },
  hareketGovde: { flex: 1, gap: 2 },
  hareketBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  hareketAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
  },
  hareketMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  delta: {
    ...TipografiTokenlari.caption,
    fontWeight: '800',
    marginTop: 2,
  },
  deltaPoz: { color: RenkTokenlari.success },
  deltaNeg: { color: RenkTokenlari.danger },
});
