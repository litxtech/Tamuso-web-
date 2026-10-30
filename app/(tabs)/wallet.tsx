import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  InteractionManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Screen } from '../../src/components/Screen';
import { YonluIkon } from '../../src/components/YonluIkon';
import { TextField } from '../../src/components/TextField';
import { KlavyeKapatan } from '../../src/components/KlavyeKapatan';
import {
  KlavyeScrollView,
  type KlavyeScrollHandle,
} from '../../src/bilesenler/klavye/KlavyeScrollView';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';
import { useAuth, useWallet } from '../../src/contexts/AuthContext';
import { CoinPaketleriniGetir } from '../../src/moduller/cuzdan/okuma/CoinPaketleriniGetir';
import { COIN_PAKET_FALLBACK } from '../../src/moduller/cuzdan/katalog/CoinPaketFallback';
import {
  CoinPaketMagaza,
} from '../../src/moduller/cuzdan/bilesenler/CoinPaketMagaza';
import { PaketFiyatYazi } from '../../src/moduller/cuzdan/katalog/CoinPaketFiyat';
import {
  MagazaFiyatCacheTazeMi,
  MagazaFiyatlariniYukle,
  PaketlereMagazaFiyatiUygula,
} from '../../src/moduller/cuzdan/katalog/MagazaFiyatlariniYukle';
import { OzellikBayragiAktifMiSunucu } from '../../src/moduller/ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { CanliHediyeSimgesi } from '../../src/moduller/cuzdan/bilesenler/CanliCoinSimgesi';
import {
  CuzdanLedgeriniGetir,
  LedgerAnlasilirOzet,
  LedgerBirimEtiketi,
  type LedgerSatiri,
} from '../../src/moduller/cuzdan/okuma/CuzdanLedgeriniGetir';
import { CoinPaketiSatinAl } from '../../src/moduller/iap/islemler/CoinPaketiSatinAl';
import { IapBaglantisiniIsit } from '../../src/moduller/iap/oturum/IapOturum';
import { KillSwitchAktifMiSunucu } from '../../src/moduller/ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { CekimTaleplerimiGetir } from '../../src/moduller/cuzdan/cekim/CekimTalebiOlustur';
import {
  HediyeGecmisiniGetir,
  type HediyeGecmisiKaydi,
} from '../../src/moduller/hediyeler/okuma/HediyeGecmisiniGetir';
import {
  ProfilIstatistikleriniGetir,
  type KullaniciProfilIstatistikleri,
} from '../../src/moduller/kullanici-profili/istatistik/ProfilIstatistikleriniGetir';
import { CuzdanimBolumleri } from '../../src/moduller/cuzdan/bilesenler/CuzdanimBolumleri';
import {
  CuzdanHareketDetayKarti,
  type CuzdanHareketDetay,
} from '../../src/moduller/cuzdan/bilesenler/CuzdanHareketDetayKarti';
import {
  BelgePaylasDugmesi,
  BelgePaylasimPaneli,
} from '../../src/moduller/belge-paylasim/bilesenler/BelgePaylasimPaneli';
import { HesapHareketleriBelgesiOlustur } from '../../src/moduller/belge-paylasim/HesapHareketleriBelgesi';
import type { HesapHareketleriBelgeGirdi } from '../../src/moduller/belge-paylasim/HesapHareketleriBelgesi';
import {
  OyunGecmisiniGetir,
  type OyunGecmisiKaydi,
} from '../../src/moduller/oyunlar/ortak/servisler/OyunGecmisiniGetir';
import {
  OyunOyuncuIstatistikGetir,
  type OyunOyuncuIstatistik,
} from '../../src/moduller/oyunlar/ortak/servisler/OyunIstatistikServisi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import type { CoinPackage } from '../../src/types/models';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  HeaderTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCuzdanUiConfig } from '../../src/moduller/cuzdan/ui-config/useCuzdanUiConfig';
import { CuzdanBolumAcikMi } from '../../src/moduller/cuzdan/ui-config/CuzdanUiNormalize';
import { CuzdanDinamikSimge } from '../../src/moduller/cuzdan/bilesenler/CuzdanDinamikSimge';
import { DIL_LOCALE_MAP } from '../../src/i18n/diller';
import { useCeviri } from '../../src/i18n/useCeviri';

type CekimTalebi = {
  id: string;
  diamonds: number;
  status: string;
  method: string;
  created_at: string;
};

type Sekme = 'hareket' | 'hediye' | 'yukle';
type YonFiltre = 'tumu' | 'alinan' | 'verilen';

function formatTarih(iso: string, locale: string): string {
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

/** GG.AA.YYYY veya YYYY-MM-DD → gün başı/sonu ms */
function tarihMetinCoz(
  ham: string,
  uc: 'bas' | 'bit',
): number | null {
  const s = ham.trim();
  if (!s) return null;
  let y = 0;
  let m = 0;
  let d = 0;
  const tr = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
  const iso = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/.exec(s);
  if (tr) {
    d = Number(tr[1]);
    m = Number(tr[2]);
    y = Number(tr[3]);
  } else if (iso) {
    y = Number(iso[1]);
    m = Number(iso[2]);
    d = Number(iso[3]);
  } else {
    return null;
  }
  if (!y || !m || !d || m > 12 || d > 31) return null;
  if (uc === 'bas') return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function gunAraligiYazi(gunOnce: number): {
  bas: string;
  bit: string;
} {
  const bit = new Date();
  const bas = new Date();
  bas.setHours(0, 0, 0, 0);
  if (gunOnce > 0) bas.setDate(bas.getDate() - (gunOnce - 1));
  const fmt = (dt: Date) => {
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${dt.getFullYear()}`;
  };
  return { bas: fmt(bas), bit: fmt(bit) };
}

function tarihAraliktaMi(
  iso: string,
  basMs: number | null,
  bitMs: number | null,
): boolean {
  if (basMs == null && bitMs == null) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (basMs != null && t < basMs) return false;
  if (bitMs != null && t > bitMs) return false;
  return true;
}

function sekmeParamCoz(v: unknown): Sekme | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === 'hareket' || s === 'hediye' || s === 'yukle') {
    return s;
  }
  return null;
}

export default function WalletScreen() {
  const { t, dil } = useCeviri();
  const sayiLocale = DIL_LOCALE_MAP[dil];
  const { isGuest, refreshProfile, user, profile } = useAuth();
  const { wallet, refreshWallet, adjustWallet } = useWallet();
  const { config: cuzdanUi } = useCuzdanUiConfig();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const params = useLocalSearchParams<{ sekme?: string | string[] }>();
  const scrollRef = useRef<KlavyeScrollHandle>(null);
  const [packages, setPackages] = useState<CoinPackage[]>(COIN_PAKET_FALLBACK);
  const [ledger, setLedger] = useState<LedgerSatiri[]>([]);
  const [hediyeler, setHediyeler] = useState<HediyeGecmisiKaydi[]>([]);
  const [stats, setStats] = useState<KullaniciProfilIstatistikleri | null>(null);
  const [withdrawals, setWithdrawals] = useState<CekimTalebi[]>([]);
  const [purchaseLocked, setPurchaseLocked] = useState(false);
  const [sekme, setSekme] = useState<Sekme>(
    () => sekmeParamCoz(params.sekme) ?? 'hareket',
  );
  const [detay, setDetay] = useState<CuzdanHareketDetay | null>(null);
  const [oyunlar, setOyunlar] = useState<OyunGecmisiKaydi[]>([]);
  const [oyunStats, setOyunStats] = useState<OyunOyuncuIstatistik | null>(null);
  const [belgeAcik, setBelgeAcik] = useState(false);
  const [excelGirdi, setExcelGirdi] = useState<HesapHareketleriBelgeGirdi | null>(
    null,
  );
  const [belgeBusy, setBelgeBusy] = useState(false);
  const [yonFiltre, setYonFiltre] = useState<YonFiltre>('tumu');
  const [tarihBas, setTarihBas] = useState('');
  const [tarihBit, setTarihBit] = useState('');
  const [tarihAcik, setTarihAcik] = useState(false);

  const cekimDurum = useMemo<Record<string, string>>(
    () => ({
      pending: t('cuzdanX.durumIncelemede'),
      under_review: t('cuzdanX.durumIncelemede'),
      approved: t('cuzdanX.durumOnaylandi'),
      rejected: t('cuzdanX.durumReddedildi'),
      paid: t('cuzdanX.durumOdendi'),
      frozen: t('cuzdanX.durumDonduruldu'),
    }),
    [t],
  );

  const yenileHepsi = useCallback(async (iptalRef?: { current: boolean }) => {
    const iptal = () => iptalRef?.current === true;
    await refreshWallet();
    if (iptal()) return;

    void KillSwitchAktifMiSunucu('kill_coin_purchase').then((v) => {
      if (!iptal()) setPurchaseLocked(v);
    });

    // Paketler hemen; mağaza fiyatı cache'li (her focus IAP init yok)
    IapBaglantisiniIsit();
    CoinPaketleriniGetir()
      .then(async (data) => {
        if (iptal() || !data.length) return;
        // Önce katalog — kartlar anında görünsün
        setPackages((onceki) => {
          if (onceki.some((p) => !!p.store_display_price) && MagazaFiyatCacheTazeMi(data)) {
            return onceki;
          }
          return data;
        });
        try {
          const fiyatlar = await MagazaFiyatlariniYukle(data);
          if (iptal()) return;
          if (Object.keys(fiyatlar).length) {
            setPackages(PaketlereMagazaFiyatiUygula(data, fiyatlar));
          }
        } catch {
          if (!iptal()) setPackages((onceki) => (onceki.length ? onceki : data));
        }
      })
      .catch(() => undefined);

    CuzdanLedgeriniGetir(200)
      .then((rows) => {
        if (!iptal()) setLedger(rows);
      })
      .catch(() => {
        if (!iptal()) setLedger([]);
      });
    CekimTaleplerimiGetir()
      .then((rows) => {
        if (!iptal()) setWithdrawals(rows as CekimTalebi[]);
      })
      .catch(() => {
        if (!iptal()) setWithdrawals([]);
      });
    if (user?.id) {
      HediyeGecmisiniGetir(user.id, 80)
        .then((h) => {
          if (!iptal()) setHediyeler(h);
        })
        .catch(() => {
          if (!iptal()) setHediyeler([]);
        });
      ProfilIstatistikleriniGetir(user.id)
        .then((s) => {
          if (!iptal()) setStats(s);
        })
        .catch(() => {
          if (!iptal()) setStats(null);
        });
      OyunGecmisiniGetir(user.id, 60)
        .then((o) => {
          if (!iptal()) setOyunlar(o);
        })
        .catch(() => {
          if (!iptal()) setOyunlar([]);
        });
      OyunOyuncuIstatistikGetir(user.id)
        .then((o) => {
          if (!iptal()) setOyunStats(o);
        })
        .catch(() => {
          if (!iptal()) setOyunStats(null);
        });
    }
  }, [refreshWallet, user?.id]);

  useFocusEffect(
    useCallback(() => {
      const iptalRef = { current: false };
      // Önce bakiye; geçmişi etkileşim sonrası — feed'e dönüş donmasın
      void refreshWallet();
      const gorev = InteractionManager.runAfterInteractions(() => {
        if (iptalRef.current) return;
        void yenileHepsi(iptalRef);
      });
      return () => {
        iptalRef.current = true;
        gorev.cancel();
      };
    }, [yenileHepsi, refreshWallet]),
  );

  const hesapBelgesi = useMemo(() => {
    if (!excelGirdi) return null;
    return HesapHareketleriBelgesiOlustur(excelGirdi);
  }, [excelGirdi]);

  const hesapOzetiniAc = useCallback(async () => {
    setBelgeBusy(true);
    try {
      const basMs = tarihMetinCoz(tarihBas, 'bas');
      const bitMs = tarihMetinCoz(tarihBit, 'bit');
      const [ledgerBuyuk, hediyeBuyuk, cekimler, oyunBuyuk, oyunOzet] =
        await Promise.all([
          CuzdanLedgeriniGetir(250).catch(() => ledger),
          user?.id
            ? HediyeGecmisiniGetir(user.id, 200).catch(() => hediyeler)
            : Promise.resolve(hediyeler),
          CekimTaleplerimiGetir().catch(() => withdrawals),
          user?.id
            ? OyunGecmisiniGetir(user.id, 120).catch(() => oyunlar)
            : Promise.resolve(oyunlar),
          user?.id
            ? OyunOyuncuIstatistikGetir(user.id).catch(() => oyunStats)
            : Promise.resolve(oyunStats),
        ]);

      const ledgerFiltre = ledgerBuyuk.filter((r) => {
        if (!tarihAraliktaMi(r.created_at, basMs, bitMs)) return false;
        if (yonFiltre === 'alinan') return r.delta > 0;
        if (yonFiltre === 'verilen') return r.delta < 0;
        return true;
      });
      const hediyeFiltre = hediyeBuyuk.filter((h) => {
        if (!tarihAraliktaMi(h.created_at, basMs, bitMs)) return false;
        if (yonFiltre === 'alinan') return h.yon === 'alinan';
        if (yonFiltre === 'verilen') return h.yon === 'gonderilen';
        return true;
      });

      const girdi: HesapHareketleriBelgeGirdi = {
        sahipAdi: profile?.display_name ?? profile?.username,
        hesapKodu: profile?.public_user_id ?? user?.id,
        coins: wallet?.coins ?? 0,
        diamonds: wallet?.diamonds ?? 0,
        ledger: ledgerFiltre,
        hediyeler: hediyeFiltre,
        cekimler: (cekimler as CekimTalebi[]).map((w) => ({
          ...w,
          durumEtiket: cekimDurum[w.status] ?? w.status,
        })),
        oyunlar: oyunBuyuk,
        oyunOzet: oyunOzet ?? null,
      };
      setExcelGirdi(girdi);
      setBelgeAcik(true);
    } finally {
      setBelgeBusy(false);
    }
  }, [
    ledger,
    hediyeler,
    withdrawals,
    oyunlar,
    oyunStats,
    user?.id,
    profile?.display_name,
    profile?.username,
    profile?.public_user_id,
    wallet?.coins,
    wallet?.diamonds,
    cekimDurum,
    yonFiltre,
    tarihBas,
    tarihBit,
  ]);

  const tarihBasMs = useMemo(
    () => tarihMetinCoz(tarihBas, 'bas'),
    [tarihBas],
  );
  const tarihBitMs = useMemo(
    () => tarihMetinCoz(tarihBit, 'bit'),
    [tarihBit],
  );

  const filtrelenmisLedger = useMemo(() => {
    return ledger.filter((r) => {
      if (!tarihAraliktaMi(r.created_at, tarihBasMs, tarihBitMs)) return false;
      if (yonFiltre === 'alinan') return r.delta > 0;
      if (yonFiltre === 'verilen') return r.delta < 0;
      return true;
    });
  }, [ledger, yonFiltre, tarihBasMs, tarihBitMs]);

  const filtrelenmisHediyeler = useMemo(() => {
    return hediyeler.filter((h) => {
      if (!tarihAraliktaMi(h.created_at, tarihBasMs, tarihBitMs)) return false;
      if (yonFiltre === 'alinan') return h.yon === 'alinan';
      if (yonFiltre === 'verilen') return h.yon === 'gonderilen';
      return true;
    });
  }, [hediyeler, yonFiltre, tarihBasMs, tarihBitMs]);

  const yuklemeler = useMemo(
    () => ledger.filter((r) => r.delta > 0 && (r.currency === 'coin' || r.currency === 'coins')),
    [ledger],
  );
  const gonderilen = useMemo(
    () => hediyeler.filter((h) => h.yon === 'gonderilen'),
    [hediyeler],
  );
  const alinan = useMemo(
    () => hediyeler.filter((h) => h.yon === 'alinan'),
    [hediyeler],
  );

  const hizliTarihUygula = useCallback((gun: number | null) => {
    if (gun == null) {
      setTarihBas('');
      setTarihBit('');
      return;
    }
    const a = gunAraligiYazi(gun);
    setTarihBas(a.bas);
    setTarihBit(a.bit);
  }, []);

  const onBuy = (pkg: CoinPackage) => {
    islemiDene('coin_satinal', () => {
      if (purchaseLocked) {
        Alert.alert(t('cuzdanX.kapali'), t('cuzdanX.satinAlmaDurduruldu'));
        return;
      }
      const toplam = pkg.coins + pkg.bonus_coins;
      const fiyatYazi = PaketFiyatYazi(pkg);
      const kanal =
        Platform.OS === 'ios'
          ? 'App Store'
          : Platform.OS === 'android'
            ? 'Google Play'
            : 'Stripe';
      const bonusSatir =
        pkg.bonus_coins > 0
          ? `\n${pkg.coins.toLocaleString(sayiLocale)} + ${pkg.bonus_coins.toLocaleString(sayiLocale)} ${t('cuzdanX.bonus')}`
          : '';
      Alert.alert(
        t('cuzdanX.coinYukle'),
        `${pkg.title}${bonusSatir}\n${t('cuzdanX.toplamCoin', { toplam: toplam.toLocaleString(sayiLocale) })}\n${fiyatYazi}\n${t('cuzdanX.odemeKanali', { kanal })}`,
        [
          { text: t('ortak.iptal'), style: 'cancel' },
            {
              text: t('cuzdan.satinAl'),
              onPress: async () => {
                try {
                  const sonuc = await CoinPaketiSatinAl(pkg);
                  if (!sonuc.ok) {
                    Alert.alert(t('cuzdanX.satinAlma'), sonuc.hata);
                    return;
                  }
                  if (sonuc.method === 'stripe' && sonuc.url) {
                    await Linking.openURL(sonuc.url);
                    return;
                  }
                  // Önce sunucu bakiyesi — çift credit / eski txn yanıltmasın
                  try {
                    await refreshWallet();
                  } catch {
                    if (sonuc.coinsAdded != null && sonuc.coinsAdded > 0) {
                      adjustWallet({ coins: sonuc.coinsAdded });
                    }
                  }
                  void yenileHepsi().catch(() => undefined);
                  Alert.alert(
                    t('ortak.basarili'),
                    sonuc.coinsAdded != null
                      ? t('cuzdanX.coinEklendi', { adet: sonuc.coinsAdded })
                      : t('cuzdanX.odemeTamam'),
                  );
                } catch (e) {
                  Alert.alert(
                    t('cuzdanX.satinAlma'),
                    e instanceof Error ? e.message : t('cuzdanX.beklenmeyenHata'),
                  );
                }
              },
            },
        ],
      );
    });
  };

  const sekmeler: { id: Sekme; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'hareket', label: t('cuzdan.hareket'), icon: 'swap-vertical' },
    { id: 'hediye', label: t('cuzdan.hediye'), icon: 'gift-outline' },
    { id: 'yukle', label: t('cuzdan.yukleSekme'), icon: 'card-outline' },
  ];

  // Bildirim / deep link: ?sekme=yukle → Yükle sekmesi; eski ?sekme=cekim → yayıncı kazançları
  React.useEffect(() => {
    const ham = Array.isArray(params.sekme) ? params.sekme[0] : params.sekme;
    if (ham === 'cekim') {
      router.push('/cuzdan/yayinci-kazanclari' as never);
      return;
    }
    const hedef = sekmeParamCoz(params.sekme);
    if (hedef) setSekme(hedef);
  }, [params.sekme]);

  const tema = cuzdanUi.theme;
  const goster = (key: Parameters<typeof CuzdanBolumAcikMi>[1]) =>
    CuzdanBolumAcikMi(cuzdanUi, key);

  const tarihFiltreAktif = !!(tarihBas.trim() || tarihBit.trim());
  const filtreBlogu = (
    <View style={styles.filtreKap}>
      <View style={styles.filtreSatir}>
        <View style={styles.segment}>
          {(
            [
              { id: 'tumu' as const, label: t('cuzdanXExtra.filtreTumu') },
              { id: 'alinan' as const, label: t('cuzdan.alinan') },
              { id: 'verilen' as const, label: t('cuzdanXExtra.verilen') },
            ] as const
          ).map((f) => {
            const aktif = yonFiltre === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setYonFiltre(f.id)}
                style={[styles.segmentOge, aktif && styles.segmentOgeAktif]}
              >
                <Text
                  style={[styles.segmentYazi, aktif && styles.segmentYaziAktif]}
                  numberOfLines={1}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => setTarihAcik((a) => !a)}
          style={[
            styles.tarihDugme,
            (tarihAcik || tarihFiltreAktif) && styles.tarihDugmeAktif,
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('cuzdanXExtra.tarihAra')}
          accessibilityState={{ expanded: tarihAcik }}
        >
          <Ionicons
            name="calendar-outline"
            size={17}
            color={tarihAcik || tarihFiltreAktif ? RenkTokenlari.primary : RenkTokenlari.textMuted}
          />
          {tarihFiltreAktif ? <View style={styles.tarihNokta} /> : null}
        </Pressable>
      </View>
      {tarihAcik ? (
        <View style={styles.tarihPanel}>
          <View style={styles.hizliTarihSatir}>
            {(
              [
                { gun: 1, label: t('cuzdanXExtra.hizliBugun') },
                { gun: 7, label: t('cuzdanXExtra.hizli7gun') },
                { gun: 30, label: t('cuzdanXExtra.hizli30gun') },
                { gun: null, label: t('cuzdanXExtra.hizliTemizle') },
              ] as const
            ).map((h) => (
              <Pressable
                key={String(h.gun)}
                onPress={() => hizliTarihUygula(h.gun)}
                style={styles.hizliTarihChip}
              >
                <Text style={styles.hizliTarihYazi}>{h.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.tarihAlanSatir}>
            <View style={{ flex: 1 }}>
              <TextField
                value={tarihBas}
                onChangeText={setTarihBas}
                placeholder={t('cuzdanXExtra.tarihBaslangicPh')}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                value={tarihBit}
                onChangeText={setTarihBit}
                placeholder={t('cuzdanXExtra.tarihBitisPh')}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="cuzdan">
        {goster('header') ? (
        <View style={styles.baslikBar}>
          <Pressable
            onPress={() => {
              try {
                router.navigate('/(tabs)/profile');
              } catch {
                try {
                  router.replace('/(tabs)/profile');
                } catch {
                  /* ignore */
                }
              }
            }}
            style={styles.geri}
            hitSlop={8}
          >
            <YonluIkon yon="chevron-back" size={22} color={tema.primaryText} />
          </Pressable>
          <View style={styles.baslikCopy}>
            <View style={styles.baslikSatir}>
              {cuzdanUi.wallet_icon.visible !== false ? (
                <CuzdanDinamikSimge
                  icon={cuzdanUi.wallet_icon}
                  fallbackIonicon="wallet-outline"
                />
              ) : null}
              <Text
                style={[styles.baslik, { color: tema.primaryText }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t('cuzdanY.cuzdanim')}
              </Text>
            </View>
          </View>
          <View style={styles.geri} />
        </View>
        ) : null}

        <KlavyeScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          ekstraPad={56}
        >
          <KlavyeKapatan>
            <View style={styles.heroBolum}>
              <CuzdanimBolumleri
                wallet={wallet}
                purchaseLocked={purchaseLocked}
                onCoinYukle={() => {
                  setSekme('yukle');
                  requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
                }}
              />

              {purchaseLocked ? (
                <Text style={[styles.lockHint, { color: tema.warning }]}>
                  {t('cuzdanX.satinAlmaKapali')}
                </Text>
              ) : null}
            </View>

            {goster('summary') ? (
            <View style={styles.ozetBolum}>
              <Text style={[styles.bolumEtiket, { color: tema.secondaryText }]}>
                {t('cuzdan.ozet')}
              </Text>
              <View style={styles.summaryRow}>
                <OzetKutu
                  icon="arrow-up-circle"
                  tint={RenkTokenlari.danger}
                  label={t('cuzdanXExtra.verilen')}
                  value={String(stats?.total_gifts_sent ?? gonderilen.length)}
                  aktif={yonFiltre === 'verilen'}
                  onPress={() => {
                    setYonFiltre((p) => (p === 'verilen' ? 'tumu' : 'verilen'));
                    setSekme('hediye');
                  }}
                />
                <OzetKutu
                  icon="arrow-down-circle"
                  tint={RenkTokenlari.mint}
                  label={t('cuzdan.alinan')}
                  value={String(stats?.total_gifts_received ?? alinan.length)}
                  aktif={yonFiltre === 'alinan'}
                  onPress={() => {
                    setYonFiltre((p) => (p === 'alinan' ? 'tumu' : 'alinan'));
                    setSekme('hediye');
                  }}
                />
                <OzetKutu
                  icon="trending-up"
                  tint={tema.accent}
                  label={t('cuzdan.yukleme')}
                  value={String(yuklemeler.length)}
                  onPress={() => {
                    setYonFiltre('alinan');
                    setSekme('hareket');
                  }}
                />
              </View>
            </View>
            ) : null}

            {goster('tabs') ? (
            <View style={styles.sekmeBolum}>
              <View style={styles.tabs}>
                {sekmeler.map((s) => {
                  const aktif = sekme === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSekme(s.id)}
                      style={({ pressed }) => [
                        styles.tab,
                        aktif && styles.tabActive,
                        pressed && !aktif && { opacity: 0.8 },
                      ]}
                    >
                      <Ionicons
                        name={s.icon}
                        size={16}
                        color={
                          aktif
                            ? RenkTokenlari.textOnPrimary
                            : RenkTokenlari.textMuted
                        }
                      />
                      <Text
                        style={[styles.tabText, aktif && styles.tabTextActive]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            ) : null}

            {sekme === 'hareket' && goster('ledger') ? (
              <View style={styles.panel}>
                <View style={styles.panelBaslikSatir}>
                  <Text style={[styles.panelTitle, { flex: 1 }]} numberOfLines={1}>
                    {t('cuzdanX.hesapHareketleri')}
                  </Text>
                  <BelgePaylasDugmesi
                    onPress={() => {
                      if (belgeBusy) return;
                      void hesapOzetiniAc();
                    }}
                    label={belgeBusy ? t('cuzdanX.hazirlaniyor') : t('cuzdanXExtra.pdfExcel')}
                  />
                </View>

                {filtreBlogu}

                {oyunStats && oyunStats.totalGames > 0 ? (
                  <View style={styles.oyunOzetCip}>
                    <Ionicons name="game-controller-outline" size={13} color={RenkTokenlari.accent} />
                    <Text style={styles.oyunOzetSatir} numberOfLines={1}>
                      {t('cuzdanX.oyunOzet', {
                        oyun: oyunStats.totalGames,
                        kazanc: oyunStats.wins,
                        oran: oyunStats.winRate,
                        lig: oyunStats.leagueLabel,
                      })}
                    </Text>
                  </View>
                ) : null}
                {filtrelenmisLedger.length === 0 ? (
                  <Empty
                    text={
                      ledger.length === 0
                        ? t('cuzdanX.hareketYok')
                        : t('cuzdanXExtra.filtreSonucYok')
                    }
                  />
                ) : (
                  filtrelenmisLedger.map((row) => (
                    <Pressable
                      key={row.id}
                      onPress={() => setDetay({ tur: 'ledger', veri: row })}
                      style={({ pressed }) => [styles.line, pressed && styles.linePressed]}
                    >
                      <View
                        style={[
                          styles.lineIcon,
                          {
                            backgroundColor:
                              row.delta >= 0
                                ? 'rgba(61,207,176,0.14)'
                                : 'rgba(232,75,106,0.14)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={row.delta >= 0 ? 'arrow-down' : 'arrow-up'}
                          size={16}
                          color={
                            row.delta >= 0 ? RenkTokenlari.mint : RenkTokenlari.danger
                          }
                        />
                      </View>
                      <View style={styles.lineCopy}>
                        <Text style={styles.lineTitle} numberOfLines={2}>
                          {LedgerAnlasilirOzet(row)}
                        </Text>
                        <Text style={styles.lineMeta}>
                          {formatTarih(row.created_at, sayiLocale)}
                          {' · '}
                          {row.delta >= 0
                            ? t('cuzdanX.giris')
                            : t('cuzdanX.cikis')}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.lineDelta,
                          {
                            color:
                              row.delta >= 0
                                ? RenkTokenlari.mint
                                : RenkTokenlari.danger,
                          },
                        ]}
                      >
                        {row.delta >= 0 ? '+' : ''}
                        {row.delta.toLocaleString(sayiLocale)}{' '}
                        {LedgerBirimEtiketi(row.currency)}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={RenkTokenlari.textDim}
                      />
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}

            {sekme === 'hediye' && goster('gifts') ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>{t('cuzdanX.hediyeGecmisi')}</Text>
                {filtreBlogu}
                {filtrelenmisHediyeler.some((h) => h.yon === 'alinan') ? (
                  <View style={styles.ipucu}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={RenkTokenlari.textDim}
                    />
                    <Text style={styles.ipucuYazi}>{t('cuzdanY.hediyeGeliriBilgi')}</Text>
                  </View>
                ) : null}
                {filtrelenmisHediyeler.length === 0 ? (
                  <Empty
                    text={
                      hediyeler.length === 0
                        ? t('cuzdanX.hediyeYok')
                        : t('cuzdanXExtra.hediyeFiltreSonucYok')
                    }
                  />
                ) : (
                  filtrelenmisHediyeler.map((h, i) => {
                    const kim =
                      h.karsi_profil?.display_name ??
                      h.karsi_profil?.username ??
                      t('ortak.kullanici');
                    const gonderildi = h.yon === 'gonderilen';
                    return (
                      <Pressable
                        key={h.id}
                        onPress={() => setDetay({ tur: 'hediye', veri: h })}
                        style={({ pressed }) => [styles.line, pressed && styles.linePressed]}
                      >
                        <View style={styles.hediyeIkon}>
                          <CanliHediyeSimgesi
                            emoji={h.gift?.emoji ?? '🎁'}
                            size={18}
                            delayMs={(i % 6) * 80}
                          />
                        </View>
                        <View style={styles.lineCopy}>
                          <Text style={styles.lineTitle} numberOfLines={1}>
                            {h.gift?.name ?? t('cuzdanX.hediye')}
                            {h.quantity > 1 ? ` ×${h.quantity}` : ''}
                          </Text>
                          <Text style={styles.lineMeta} numberOfLines={2}>
                            {gonderildi ? `→ ${kim}` : `← ${kim}`}
                            {h.oda?.title ? ` · ${h.oda.title}` : ''}
                            {` · ${formatTarih(h.created_at, sayiLocale)}`}
                          </Text>
                        </View>
                        <View style={styles.lineRight}>
                          <Text
                            style={[
                              styles.lineDelta,
                              {
                                color: gonderildi
                                  ? RenkTokenlari.danger
                                  : RenkTokenlari.textMuted,
                              },
                            ]}
                          >
                            {gonderildi
                              ? `-${h.coins_spent.toLocaleString(sayiLocale)}`
                              : h.coins_spent.toLocaleString(sayiLocale)}
                          </Text>
                          <Text style={styles.lineTryDelta}>{t('cuzdanY.coin')}</Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={14}
                          color={RenkTokenlari.textDim}
                        />
                      </Pressable>
                    );
                  })
                )}
              </View>
            ) : null}

            {sekme === 'yukle' && goster('topup') ? (
              <View style={styles.panel}>
                <CoinPaketMagaza
                  packages={packages}
                  locked={purchaseLocked}
                  onBuy={onBuy}
                  onPaketleriYenile={() => {
                    CoinPaketleriniGetir()
                      .then((data) => {
                        if (data.length) setPackages(data);
                      })
                      .catch(() => undefined);
                  }}
                />
              </View>
            ) : null}

          </KlavyeKapatan>
        </KlavyeScrollView>
      </ModulHataSiniri>

      <CuzdanHareketDetayKarti detay={detay} onKapat={() => setDetay(null)} />

      <BelgePaylasimPaneli
        visible={belgeAcik}
        onKapat={() => setBelgeAcik(false)}
        icerik={hesapBelgesi}
        excelGirdi={excelGirdi}
      />


      <HesabiTamamlaKarti
        visible={upgradeAcik}
        onClose={upgradeKapat}
        onCompleted={() => {
          void refreshProfile();
          void refreshWallet();
        }}
      />
    </Screen>
  );
}

function OzetKutu({
  icon,
  tint,
  label,
  value,
  aktif,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  value: string;
  aktif?: boolean;
  onPress?: () => void;
}) {
  const icerik = (
    <>
      <View style={[styles.summaryIkon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={icon} size={13} color={tint} />
      </View>
      <Text style={styles.summaryVal}>{value}</Text>
      <Text style={styles.summaryLbl}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.summary,
          aktif && { borderColor: tint, borderWidth: 1.5 },
        ]}
      >
        {icerik}
      </Pressable>
    );
  }
  return <View style={styles.summary}>{icerik}</View>;
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  baslikBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HeaderTokenlari.horizontal,
    paddingTop: HeaderTokenlari.paddingTop,
    paddingBottom: HeaderTokenlari.paddingBottom,
    gap: HeaderTokenlari.titleGapAfterBack,
  },
  geri: {
    width: HeaderTokenlari.touchTarget,
    height: HeaderTokenlari.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baslikCopy: { flex: 1, minWidth: 0, alignItems: 'stretch', gap: 4 },
  baslikFisilti: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    letterSpacing: 1.4,
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },
  baslik: {
    ...TipografiTokenlari.h1,
    color: RenkTokenlari.text,
    lineHeight: 28,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
    letterSpacing: 0,
  },
  baslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minWidth: 0,
    gap: 8,
  },
  baslikAlt: {
    ...TipografiTokenlari.micro,
    textAlign: 'center',
    letterSpacing: 0,
  },
  coinInfo: {
    ...TipografiTokenlari.micro,
    lineHeight: 16,
    paddingHorizontal: BoslukTokenlari.xl,
  },
  scroll: {
    paddingBottom: YUZEN_TAB_ICERIK_BOSLUGU,
    gap: BoslukTokenlari.xxl,
    paddingTop: BoslukTokenlari.sm,
  },
  heroBolum: {
    gap: BoslukTokenlari.md,
  },
  hizliAksiyonlar: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.xl,
  },
  hizliBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: YaricapTokenlari.md,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  hizliBtnYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  ozetBolum: {
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.xl,
  },
  sekmeBolum: {
    gap: BoslukTokenlari.sm,
    paddingHorizontal: BoslukTokenlari.xl,
  },
  bolumEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    letterSpacing: 1.2,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontSize: 10,
    marginLeft: 2,
  },
  lockHint: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.warning,
    textAlign: 'center',
    marginHorizontal: BoslukTokenlari.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
  },
  summary: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: RenkTokenlari.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  summaryIkon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryVal: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 22,
  },
  summaryLbl: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 11,
    marginTop: -4,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: YaricapTokenlari.pill,
  },
  tabActive: {
    backgroundColor: RenkTokenlari.primary,
  },
  tabText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },
  tabTextActive: { color: RenkTokenlari.textOnPrimary, fontWeight: '800' },
  panel: {
    marginHorizontal: BoslukTokenlari.xl,
    gap: BoslukTokenlari.sm,
  },
  panelBaslikSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.sm,
    marginBottom: 2,
  },
  filtreKap: { gap: 8, marginBottom: 4 },
  filtreSatir: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    padding: 3,
    gap: 3,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.surface,
  },
  segmentOge: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: YaricapTokenlari.pill,
  },
  segmentOgeAktif: { backgroundColor: RenkTokenlari.bgCard },
  segmentYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
    fontSize: 12.5,
  },
  segmentYaziAktif: { color: RenkTokenlari.text, fontWeight: '800' },
  tarihDugme: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  tarihDugmeAktif: { backgroundColor: RenkTokenlari.pressFill },
  tarihNokta: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: RenkTokenlari.primary,
  },
  tarihPanel: {
    gap: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: RenkTokenlari.surface,
  },
  oyunOzetCip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.chipFill,
    marginBottom: 4,
  },
  ipucu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  ipucuYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    flex: 1,
  },
  yonFiltreSatir: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  yonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  yonChipAktif: {
    backgroundColor: 'rgba(61,207,176,0.16)',
    borderColor: RenkTokenlari.mint,
  },
  yonChipYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  yonChipYaziAktif: {
    color: RenkTokenlari.mint,
    fontWeight: '800',
  },
  filtreEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 4,
  },
  hizliTarihSatir: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hizliTarihChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.sm,
    backgroundColor: RenkTokenlari.surface,
  },
  hizliTarihYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    fontWeight: '600',
  },
  tarihAlanSatir: {
    flexDirection: 'row',
    gap: 8,
  },
  panelTitle: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  panelSub: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  oyunOzetSatir: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textMuted,
    flexShrink: 1,
  },
  panelHintWarn: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '600',
  },
  odemeBilgiKart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BoslukTokenlari.sm,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: 'rgba(240, 180, 41, 0.35)',
    backgroundColor: 'rgba(240, 180, 41, 0.08)',
    marginBottom: 4,
  },
  odemeBilgiYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    flex: 1,
    lineHeight: 20,
  },
  empty: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    paddingVertical: BoslukTokenlari.lg,
    textAlign: 'center',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: RenkTokenlari.surface,
    marginBottom: 2,
  },
  linePressed: { opacity: 0.88 },
  lineIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hediyeIkon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.pressFill,
    flexShrink: 0,
  },
  lineCopy: { flex: 1, gap: 1, minWidth: 0 },
  lineTitle: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.text,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 17,
  },
  lineMeta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 10,
    lineHeight: 13,
  },
  lineTry: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
    fontSize: 10,
  },
  lineTryMuted: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
  },
  lineRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  lineDelta: {
    ...TipografiTokenlari.caption,
    fontWeight: '800',
    flexShrink: 0,
    fontSize: 13,
  },
  lineTryDelta: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.mint,
    fontWeight: '700',
    fontSize: 10,
  },
  pkg: { marginBottom: 8 },
  pkgInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  pkgLeft: { gap: 2, flex: 1, minWidth: 0 },
  pkgTitle: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  pkgCoins: { ...TipografiTokenlari.caption, color: RenkTokenlari.accent },
  pkgRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  badge: {
    backgroundColor: 'rgba(232, 64, 145, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: YaricapTokenlari.pill,
  },
  badgeText: { ...TipografiTokenlari.micro, color: RenkTokenlari.primarySoft },
  price: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  ibanKart: {
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    gap: 2,
    marginBottom: 4,
  },
  ibanEtiket: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginBottom: 4,
  },
  ibanAd: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  ibanBanka: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  ibanNo: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.accent,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.4,
  },
  withdraw: {
    borderRadius: YaricapTokenlari.md,
    paddingVertical: BoslukTokenlari.md,
    alignItems: 'center',
    backgroundColor: 'rgba(61,207,176,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(61,207,176,0.35)',
  },
  withdrawText: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.mint,
    fontWeight: '700',
  },
  status: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
    flexShrink: 0,
  },
  paylasModal: {
    flex: 1,
    backgroundColor: RenkTokenlari.bg,
  },
  paylasModalUst: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.sm,
  },
  paylasModalBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  paylasModalAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    paddingHorizontal: BoslukTokenlari.xl,
    marginBottom: BoslukTokenlari.sm,
  },
});
