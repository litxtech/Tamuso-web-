import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../src/components/Screen';
import { YonluIkon } from '../../src/components/YonluIkon';
import { TextField } from '../../src/components/TextField';
import { KlavyeKapatan } from '../../src/components/KlavyeKapatan';
import {
  KlavyeFocusKaydir,
  KlavyeScrollView,
  type KlavyeScrollHandle,
} from '../../src/bilesenler/klavye/KlavyeScrollView';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';
import { useAuth } from '../../src/contexts/AuthContext';
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
import {
  CekimTalebiOlustur,
  CekimTaleplerimiGetir,
} from '../../src/moduller/cuzdan/cekim/CekimTalebiOlustur';
import { CEKIM_ODEME_IS_GUNU } from '../../src/moduller/cuzdan/cekim/CekimOdemeBilgisi';
import { BankaHesabiGetir } from '../../src/moduller/kullanici-profili/islemler/BankaHesabi';
import type { BankaHesabi } from '../../src/moduller/kullanici-profili/islemler/BankaHesabi';
import {
  HediyeGecmisiniGetir,
  type HediyeGecmisiKaydi,
} from '../../src/moduller/hediyeler/okuma/HediyeGecmisiniGetir';
import {
  ProfilIstatistikleriniGetir,
  type KullaniciProfilIstatistikleri,
} from '../../src/moduller/kullanici-profili/istatistik/ProfilIstatistikleriniGetir';
import { CuzdanBankaKarti } from '../../src/moduller/cuzdan/bilesenler/CuzdanBankaKarti';
import { CuzdanHesabiGarantile } from '../../src/moduller/cuzdan/takas/CuzdanHesabi';
import { CUZDAN_MARKA_ADI } from '../../src/moduller/cuzdan/takas/CuzdanTakasTipleri';
import type { WalletAccount } from '../../src/moduller/cuzdan/takas/CuzdanTakasTipleri';
import {
  CuzdanKartiniMesajlaPaylas,
  CuzdanKartiniWhatsAppPaylas,
} from '../../src/moduller/cuzdan/islemler/CuzdanKartPaylasimi';
import { MesajKullaniciAramaPaneli } from '../../src/moduller/mesajlasma/bilesenler/MesajKullaniciAramaPaneli';
import type { ArananKullanici } from '../../src/moduller/mesajlasma/okuma/KullanicilariAra';
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
import {
  CoinTryKarsiligi,
  TryYazi,
} from '../../src/moduller/cuzdan/katalog/CoinTryOrani';
import { useCuzdanUiConfig } from '../../src/moduller/cuzdan/ui-config/useCuzdanUiConfig';
import {
  CuzdanAksiyonlariSirali,
  CuzdanBolumAcikMi,
  CuzdanMetinAl,
} from '../../src/moduller/cuzdan/ui-config/CuzdanUiNormalize';
import { CuzdanDinamikSimge } from '../../src/moduller/cuzdan/bilesenler/CuzdanDinamikSimge';
import { CuzdanDinamikAksiyonGrid } from '../../src/moduller/cuzdan/bilesenler/CuzdanDinamikAksiyonGrid';
import type { CuzdanUiAction } from '../../src/moduller/cuzdan/ui-config/CuzdanUiTipleri';
import { DIL_LOCALE_MAP } from '../../src/i18n/diller';
import { useCeviri } from '../../src/i18n/useCeviri';

type CekimTalebi = {
  id: string;
  diamonds: number;
  status: string;
  method: string;
  created_at: string;
};

type Sekme = 'hareket' | 'hediye' | 'yukle' | 'cekim';
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
  if (s === 'hareket' || s === 'hediye' || s === 'yukle' || s === 'cekim') {
    return s;
  }
  return null;
}

export default function WalletScreen() {
  const { t, dil } = useCeviri();
  const sayiLocale = DIL_LOCALE_MAP[dil];
  const { wallet, refreshWallet, adjustWallet, isGuest, refreshProfile, user, profile } =
    useAuth();
  const { config: cuzdanUi } = useCuzdanUiConfig();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const params = useLocalSearchParams<{ sekme?: string | string[] }>();
  const scrollRef = useRef<KlavyeScrollHandle>(null);
  const [packages, setPackages] = useState<CoinPackage[]>(COIN_PAKET_FALLBACK);
  const [ledger, setLedger] = useState<LedgerSatiri[]>([]);
  const [hediyeler, setHediyeler] = useState<HediyeGecmisiKaydi[]>([]);
  const [stats, setStats] = useState<KullaniciProfilIstatistikleri | null>(null);
  const [withdrawals, setWithdrawals] = useState<CekimTalebi[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [purchaseLocked, setPurchaseLocked] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [banka, setBanka] = useState<BankaHesabi | null>(null);
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
  const [mutaHesap, setMutaHesap] = useState<WalletAccount | null>(null);
  const [kartPaylasAcik, setKartPaylasAcik] = useState(false);
  const [kartPaylasBusy, setKartPaylasBusy] = useState(false);
  const [takasAcik, setTakasAcik] = useState(false);
  const [cekimAcik, setCekimAcik] = useState(false);
  const insets = useSafeAreaInsets();

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
    void OzellikBayragiAktifMiSunucu('wallet_exchange_enabled').then((v) => {
      if (!iptal()) setTakasAcik(v);
    });
    void Promise.all([
      OzellikBayragiAktifMiSunucu('wallet_withdraw_enabled'),
      OzellikBayragiAktifMiSunucu('withdrawals_enabled'),
    ]).then(([a, b]) => {
      if (!iptal()) setCekimAcik(a || b);
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
    BankaHesabiGetir()
      .then((b) => {
        if (!iptal()) setBanka(b);
      })
      .catch(() => {
        if (!iptal()) setBanka(null);
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
      void CuzdanHesabiGarantile().then((r) => {
        if (!iptal() && r.ok) setMutaHesap(r.hesap);
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

  const onWithdraw = () => {
    islemiDene('cekim', () => {
      const diamonds = Number.parseInt(withdrawAmount.replace(/\D/g, ''), 10);
      if (!Number.isFinite(diamonds) || diamonds <= 0) {
        Alert.alert(t('cuzdanX.tutar'), t('cuzdanX.gecerliElmasGir'));
        return;
      }
      if ((wallet?.diamonds ?? 0) < diamonds) {
        Alert.alert(t('cuzdanX.yetersiz'), t('cuzdanX.elmasYetersiz'));
        return;
      }
      if (!banka?.iban) {
        Alert.alert(t('cuzdanX.bankaBilgisi'), t('cuzdanX.ibanKaydet'), [
          { text: t('ortak.iptal'), style: 'cancel' },
          {
            text: t('profil.duzenle'),
            onPress: () => router.push('/profil-duzenle' as any),
          },
        ]);
        return;
      }
      Alert.alert(
        t('cuzdanX.cekimTalebi'),
        `${diamonds} ${t('cuzdan.elmas').toLocaleLowerCase()} → ${banka.bank_name}\n${banka.iban}\n\n${t('cuzdanXExtra.odemeBilgisi', { gun: CEKIM_ODEME_IS_GUNU })}`,
        [
          { text: t('ortak.iptal'), style: 'cancel' },
          {
            text: t('cuzdanX.talepEt'),
            onPress: async () => {
              setWithdrawBusy(true);
              const sonuc = await CekimTalebiOlustur({
                diamonds,
                method: 'bank',
                details: {
                  account_holder: banka.account_holder,
                  bank_name: banka.bank_name,
                  iban: banka.iban,
                },
              });
              setWithdrawBusy(false);
              if (!sonuc.ok) {
                Alert.alert(
                  t('cuzdan.cekim'),
                  sonuc.hata ?? t('cuzdanX.durumReddedildi'),
                );
                return;
              }
              setWithdrawAmount('');
              adjustWallet({ diamonds: -diamonds });
              await yenileHepsi();
              Alert.alert(
                t('cuzdanX.talepAlindi'),
                `${t('cuzdanX.durumIncelemede')}.\n\n${t('cuzdanXExtra.odemeBilgisi', { gun: CEKIM_ODEME_IS_GUNU })}`,
              );
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
    ...(cekimAcik
      ? ([{ id: 'cekim' as const, label: t('cuzdan.cekim'), icon: 'cash-outline' as const }] as const)
      : []),
  ];

  // Bildirim / deep link: ?sekme=yukle → Yükle sekmesi
  React.useEffect(() => {
    const hedef = sekmeParamCoz(params.sekme);
    if (hedef) setSekme(hedef);
  }, [params.sekme]);

  // Çekim kapalıyken sekmede kalma
  React.useEffect(() => {
    if (!cekimAcik && sekme === 'cekim') setSekme('yukle');
  }, [cekimAcik, sekme]);

  const flagMap = useMemo(
    () => ({
      wallet_exchange_enabled: takasAcik,
      wallet_withdraw_enabled: cekimAcik,
      withdrawals_enabled: cekimAcik,
    }),
    [takasAcik, cekimAcik],
  );

  const hizliAksiyonlar = useMemo(() => {
    const list = CuzdanAksiyonlariSirali(cuzdanUi, flagMap).filter(
      (a) => a.key === 'takas' || a.key === 'kyc' || a.action_type === 'route',
    );
    // KYC başlığını durumla zenginleştir
    return list.map((a) => {
      if (a.key !== 'kyc') return a;
      return {
        ...a,
        title:
          mutaHesap?.kyc_status === 'approved'
            ? t('cuzdanX.kimlikOnayli')
            : mutaHesap?.kyc_status === 'pending'
              ? t('cuzdanX.kycBekliyor')
              : a.title,
        icon_color:
          mutaHesap?.kyc_status === 'approved'
            ? RenkTokenlari.mint
            : a.icon_color,
      };
    });
  }, [cuzdanUi, flagMap, mutaHesap?.kyc_status, t]);

  const aksiyonCalistir = useCallback(
    (a: CuzdanUiAction) => {
      if (a.action_type === 'open_statement') {
        void hesapOzetiniAc();
        return;
      }
      if (a.action_type === 'route' && a.action_target) {
        const hedef = a.action_target;
        if (hedef.includes('takas')) {
          islemiDene('takas', () => router.push(hedef as any));
        } else if (hedef.includes('kyc')) {
          islemiDene('kyc', () => router.push(hedef as any));
        } else {
          router.push(hedef as any);
        }
      }
    },
    [hesapOzetiniAc, islemiDene],
  );

  const tema = cuzdanUi.theme;
  const goster = (key: Parameters<typeof CuzdanBolumAcikMi>[1]) =>
    CuzdanBolumAcikMi(cuzdanUi, key);

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
            {cuzdanUi.general.eyebrow ? (
              <Text
                style={[styles.baslikFisilti, { color: tema.secondaryText }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cuzdanUi.general.eyebrow}
              </Text>
            ) : null}
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
                {cuzdanUi.general.screen_name || t('cuzdan.baslik')}
              </Text>
            </View>
            {cuzdanUi.general.subtitle ? (
              <Text
                style={[styles.baslikAlt, { color: tema.secondaryText }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {cuzdanUi.general.subtitle}
              </Text>
            ) : null}
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
              {goster('hero_card') ? (
              <CuzdanBankaKarti
                coins={wallet?.coins ?? 0}
                diamonds={wallet?.diamonds ?? 0}
                hesapKodu={profile?.public_user_id ?? user?.id}
                cuzdanNo={mutaHesap?.wallet_number}
                cuzdanMarka={
                  cuzdanUi.brand?.name?.trim() ||
                  mutaHesap?.wallet_brand_name ||
                  CUZDAN_MARKA_ADI
                }
                kartTipi={cuzdanUi.brand?.card_type}
                markaTagline={cuzdanUi.brand?.tagline}
                markaTaglineGorunur={cuzdanUi.brand?.tagline_visible !== false}
                degerOzeti={cuzdanUi.value_summary}
                sahipAdi={
                  mutaHesap?.legal_first_name
                    ? `${mutaHesap.legal_first_name} ${mutaHesap.legal_last_name ?? ''}`.trim()
                    : (profile?.display_name ?? profile?.username)
                }
                yuklenen={stats?.total_topup_coin ?? 0}
                harcanan={stats?.total_spent_coin ?? 0}
                onQrOku={
                  takasAcik
                    ? () =>
                        islemiDene('takas', () =>
                          router.push('/cuzdan/takas' as any),
                        )
                    : undefined
                }
                onPaylas={() =>
                  islemiDene('mesaj_gonder', () => {
                    const no = mutaHesap?.wallet_number?.replace(/\D/g, '') ?? '';
                    if (no.length !== 18) {
                      Alert.alert(
                        t('cuzdan.baslik'),
                        t('cuzdanX.numaraHazirDegil'),
                      );
                      return;
                    }
                    setKartPaylasAcik(true);
                  })
                }
                onWhatsAppPaylas={() =>
                  islemiDene('mesaj_gonder', () => {
                    void (async () => {
                      const no = mutaHesap?.wallet_number ?? '';
                      const r = await CuzdanKartiniWhatsAppPaylas(no);
                      if (!r.ok) Alert.alert(t('ortak.whatsapp'), r.hata);
                    })();
                  })
                }
              />
              ) : null}

              {goster('quick_actions') && hizliAksiyonlar.length > 0 ? (
                <CuzdanDinamikAksiyonGrid
                  actions={hizliAksiyonlar}
                  onPress={aksiyonCalistir}
                />
              ) : null}

              {purchaseLocked ? (
                <Text style={[styles.lockHint, { color: tema.warning }]}>
                  {CuzdanMetinAl(
                    cuzdanUi,
                    'purchase_locked',
                    dil,
                    t('cuzdanX.satinAlmaKapali'),
                  )}
                </Text>
              ) : null}

              {goster('coin_info') ? (
                <Text style={[styles.coinInfo, { color: tema.secondaryText }]}>
                  {CuzdanMetinAl(cuzdanUi, 'coin_info', dil)}
                </Text>
              ) : null}
              {CuzdanMetinAl(cuzdanUi, 'hero_note', dil) ? (
                <Text style={[styles.coinInfo, { color: tema.secondaryText, marginTop: 4 }]}>
                  {CuzdanMetinAl(cuzdanUi, 'hero_note', dil)}
                </Text>
              ) : null}
            </View>

            {goster('summary') ? (
            <View style={styles.ozetBolum}>
              <Text style={[styles.bolumEtiket, { color: tema.secondaryText }]}>
                {CuzdanMetinAl(cuzdanUi, 'summary_title', dil, t('cuzdan.ozet'))}
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
              <Text style={styles.bolumEtiket}>{t('cuzdanX.islemler')}</Text>
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
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <View
                        style={[
                          styles.tabIkon,
                          aktif && styles.tabIkonActive,
                        ]}
                      >
                        <Ionicons
                          name={s.icon}
                          size={18}
                          color={
                            aktif
                              ? RenkTokenlari.textOnPrimary
                              : RenkTokenlari.textMuted
                          }
                        />
                      </View>
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
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.panelTitle}>
                      {t('cuzdanX.hesapHareketleri')}
                    </Text>
                    <Text style={styles.panelSub}>{t('cuzdanX.hareketAlt')}</Text>
                  </View>
                  <BelgePaylasDugmesi
                    onPress={() => {
                      if (belgeBusy) return;
                      void hesapOzetiniAc();
                    }}
                    label={belgeBusy ? t('cuzdanX.hazirlaniyor') : t('cuzdanXExtra.pdfExcel')}
                  />
                </View>

                <View style={styles.yonFiltreSatir}>
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
                        style={[styles.yonChip, aktif && styles.yonChipAktif]}
                      >
                        <Text
                          style={[
                            styles.yonChipYazi,
                            aktif && styles.yonChipYaziAktif,
                          ]}
                        >
                          {f.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.filtreEtiket}>{t('cuzdanXExtra.tarihAra')}</Text>
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

                {oyunStats && oyunStats.totalGames > 0 ? (
                  <Text style={styles.oyunOzetSatir}>
                    {t('cuzdanX.oyunOzet', {
                      oyun: oyunStats.totalGames,
                      kazanc: oyunStats.wins,
                      oran: oyunStats.winRate,
                      lig: oyunStats.leagueLabel,
                    })}
                  </Text>
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
                          name={row.delta >= 0 ? 'add' : 'remove'}
                          size={12}
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
                <Text style={styles.panelSub}>{t('cuzdanX.hediyeAlt')}</Text>
                <View style={styles.yonFiltreSatir}>
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
                        style={[styles.yonChip, aktif && styles.yonChipAktif]}
                      >
                        <Text
                          style={[
                            styles.yonChipYazi,
                            aktif && styles.yonChipYaziAktif,
                          ]}
                        >
                          {f.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
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
                      key={`h-${String(h.gun)}`}
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
                    const tryDeger = CoinTryKarsiligi(h.coins_spent);
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
                          {!gonderildi ? (
                            <Text style={styles.lineTry}>
                              {t('cuzdanX.kazanc', { deger: TryYazi(tryDeger) })}
                            </Text>
                          ) : (
                            <Text style={styles.lineTryMuted}>
                              {t('cuzdanX.deger', { deger: TryYazi(tryDeger) })}
                            </Text>
                          )}
                        </View>
                        <View style={styles.lineRight}>
                          <Text
                            style={[
                              styles.lineDelta,
                              {
                                color: gonderildi
                                  ? RenkTokenlari.danger
                                  : RenkTokenlari.mint,
                              },
                            ]}
                          >
                            {gonderildi
                              ? `-${h.coins_spent}`
                              : `+${h.diamonds_earned}`}
                          </Text>
                          {!gonderildi ? (
                            <Text style={styles.lineTryDelta}>
                              {TryYazi(tryDeger)}
                            </Text>
                          ) : null}
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

            {sekme === 'cekim' && goster('withdraw') && cekimAcik ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>{t('cuzdanX.elmasCekimi')}</Text>
                <View style={styles.odemeBilgiKart}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={RenkTokenlari.accent}
                  />
                  <Text style={styles.odemeBilgiYazi}>
                    {t('cuzdanXExtra.odemeBilgisi', { gun: CEKIM_ODEME_IS_GUNU })}
                  </Text>
                </View>
                {banka?.iban ? (
                  <View style={styles.ibanKart}>
                    <Text style={styles.ibanEtiket}>{t('cuzdanX.kayitliHesap')}</Text>
                    <Text style={styles.ibanAd}>{banka.account_holder}</Text>
                    <Text style={styles.ibanBanka}>{banka.bank_name}</Text>
                    <Text style={styles.ibanNo}>{banka.iban}</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => router.push('/profil-duzenle' as any)}>
                    <Text style={styles.panelHintWarn}>{t('cuzdanX.ibanYok')}</Text>
                  </Pressable>
                )}
                <TextField
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  keyboardType="number-pad"
                  placeholder={t('cuzdanX.miktarElmas')}
                  onFocus={(e) =>
                    KlavyeFocusKaydir(scrollRef.current, e as never, {
                      delayMs: 60,
                    })
                  }
                />
                <Pressable
                  onPress={onWithdraw}
                  style={[styles.withdraw, withdrawBusy && { opacity: 0.6 }]}
                  disabled={withdrawBusy}
                >
                  <Text style={styles.withdrawText}>
                    {withdrawBusy
                      ? t('guvenlik.gonderiliyor')
                      : t('cuzdanX.cekimTalebiOlustur')}
                  </Text>
                </Pressable>
                {withdrawals.length === 0 ? (
                  <Empty text={t('cuzdanX.cekimTalebiYok')} />
                ) : (
                  withdrawals.map((w) => (
                    <Pressable
                      key={w.id}
                      onPress={() =>
                        setDetay({
                          tur: 'cekim',
                          veri: w,
                          durumEtiket: cekimDurum[w.status] ?? w.status,
                        })
                      }
                      style={({ pressed }) => [styles.line, pressed && styles.linePressed]}
                    >
                      <View style={styles.lineCopy}>
                        <Text style={styles.lineTitle}>
                          {t('cuzdanX.elmasSatir', {
                            adet: w.diamonds,
                            yontem: w.method,
                          })}
                        </Text>
                        <Text style={styles.lineMeta}>{formatTarih(w.created_at, sayiLocale)}</Text>
                      </View>
                      <Text style={styles.status}>
                        {cekimDurum[w.status] ?? w.status}
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

      <Modal
        visible={kartPaylasAcik}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !kartPaylasBusy && setKartPaylasAcik(false)}
      >
        <View
          style={[
            styles.paylasModal,
            { paddingTop: Math.max(insets.top, BoslukTokenlari.md) },
          ]}
        >
          <View style={styles.paylasModalUst}>
            <Text style={styles.paylasModalBaslik}>
              {t('cuzdanX.kartiPaylasBaslik')}
            </Text>
            <Pressable
              onPress={() => !kartPaylasBusy && setKartPaylasAcik(false)}
              hitSlop={8}
              disabled={kartPaylasBusy}
            >
              <Ionicons name="close" size={24} color={RenkTokenlari.text} />
            </Pressable>
          </View>
          <Text style={styles.paylasModalAlt}>{t('cuzdanX.kartiPaylasAlt')}</Text>
          <MesajKullaniciAramaPaneli
            haricUserId={user?.id}
            seciliyor={kartPaylasBusy}
            onSec={(k: ArananKullanici) => {
              const no = mutaHesap?.wallet_number ?? '';
              const ad =
                k.display_name?.trim() || k.username || t('ortak.kullanici');
              Alert.alert(
                t('cuzdanX.kartiPaylas'),
                t('cuzdanX.kartiPaylasSoru', { ad }),
                [
                  { text: t('ortak.vazgec'), style: 'cancel' },
                  {
                    text: t('ortak.gonder'),
                    onPress: () => {
                      void (async () => {
                        setKartPaylasBusy(true);
                        const r = await CuzdanKartiniMesajlaPaylas({
                          otherUserId: k.id,
                          walletNumber: no,
                        });
                        setKartPaylasBusy(false);
                        if (!r.ok) {
                          Alert.alert(t('paylasim.baslik'), r.hata);
                          return;
                        }
                        setKartPaylasAcik(false);
                        Alert.alert(
                          t('cuzdanX.gonderildi'),
                          t('cuzdanX.kartIletildi'),
                          [
                            {
                              text: t('cuzdanX.sohbeteGit'),
                              onPress: () =>
                                router.push(`/mesaj/${r.threadId}` as any),
                            },
                            { text: t('ortak.tamam') },
                          ],
                        );
                      })();
                    },
                  },
                ],
              );
            }}
          />
        </View>
      </Modal>

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
    alignItems: 'center',
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(18,20,32,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryIkon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryVal: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 18,
  },
  summaryLbl: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  tabs: {
    flexDirection: 'row',
    gap: BoslukTokenlari.sm,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: BoslukTokenlari.md + 2,
    paddingHorizontal: 4,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  tabActive: {
    backgroundColor: 'rgba(232, 64, 145, 0.12)',
    borderColor: 'rgba(232, 64, 145, 0.35)',
  },
  tabIkon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  tabIkonActive: {
    backgroundColor: RenkTokenlari.primarySoft,
  },
  tabText: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
    fontSize: 11,
  },
  tabTextActive: { color: RenkTokenlari.text, fontWeight: '700' },
  panel: {
    marginHorizontal: BoslukTokenlari.xl,
    gap: BoslukTokenlari.sm,
  },
  panelBaslikSatir: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BoslukTokenlari.sm,
    marginBottom: 2,
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
    color: RenkTokenlari.accent,
    marginBottom: 4,
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
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(18,20,32,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 4,
  },
  linePressed: { opacity: 0.88 },
  lineIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  hediyeIkon: {
    width: 24,
    height: 24,
    borderRadius: 7,
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
