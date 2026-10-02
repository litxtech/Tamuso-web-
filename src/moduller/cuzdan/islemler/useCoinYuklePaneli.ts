import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuth } from '../../../contexts/AuthContext';
import { useCeviri } from '../../../i18n/useCeviri';
import { DIL_LOCALE_MAP } from '../../../i18n/diller';
import { useMisafirIslemKapisi } from '../../misafir-hesabi/islemler/useMisafirIslemKapisi';
import { CoinPaketiSatinAl } from '../../iap/islemler/CoinPaketiSatinAl';
import { IapBaglantisiniIsit } from '../../iap/oturum/IapOturum';
import { KillSwitchAktifMiSunucu } from '../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { CoinPaketleriniGetir } from '../okuma/CoinPaketleriniGetir';
import { COIN_PAKET_FALLBACK } from '../katalog/CoinPaketFallback';
import { PaketFiyatYazi } from '../katalog/CoinPaketFiyat';
import {
  MagazaFiyatlariniYukle,
  PaketlereMagazaFiyatiUygula,
} from '../katalog/MagazaFiyatlariniYukle';
import { supabase } from '../../../lib/supabase';
import type { CoinPackage } from '../../../types/models';

const COIN_PAKET_KANAL_IMZA = 'coin-packages-live';

function ayniCoinPaketKanaliniTemizle() {
  for (const ch of supabase.getChannels()) {
    const topic = ch.topic ?? '';
    if (
      topic === COIN_PAKET_KANAL_IMZA ||
      topic === `realtime:${COIN_PAKET_KANAL_IMZA}` ||
      topic.includes(COIN_PAKET_KANAL_IMZA)
    ) {
      void supabase.removeChannel(ch);
    }
  }
}

/**
 * Oyun / hediye yetersiz bakiyesinde açılan coin yükleme paneli.
 * Wallet sekmesindeki satın alma akışını paylaşır.
 */
export function useCoinYuklePaneli() {
  const { t, dil } = useCeviri();
  const loc = DIL_LOCALE_MAP[dil];
  const { adjustWallet, refreshWallet, isGuest } = useAuth();
  const { upgradeAcik, upgradeKapat, upgradeAc, islemiDene } =
    useMisafirIslemKapisi(isGuest);
  const [acik, setAcik] = useState(false);
  const [packages, setPackages] = useState<CoinPackage[]>(COIN_PAKET_FALLBACK);
  const [purchaseLocked, setPurchaseLocked] = useState(false);
  const magazaYukleniyor = useRef(false);

  /** DB paketleri — mağaza fiyatı yok (IAP yalnız panel açıkken) */
  const paketleriYenile = useCallback(async (magazaFiyat = false) => {
    void KillSwitchAktifMiSunucu('kill_coin_purchase').then(setPurchaseLocked);
    try {
      const data = await CoinPaketleriniGetir();
      if (!data.length) return;
      if (!magazaFiyat) {
        setPackages(data);
        return;
      }
      if (magazaYukleniyor.current) {
        setPackages(data);
        return;
      }
      magazaYukleniyor.current = true;
      try {
        const fiyatlar = await MagazaFiyatlariniYukle(data);
        setPackages(PaketlereMagazaFiyatiUygula(data, fiyatlar));
      } catch {
        setPackages(data);
      } finally {
        magazaYukleniyor.current = false;
      }
    } catch {
      /* fallback kalır */
    }
  }, []);

  // Mount: yalnız katalog — canlı/oda ekranında IAP init etme (çökme riski)
  useEffect(() => {
    void paketleriYenile(false);
  }, [paketleriYenile]);

  // Panel açılınca mağaza fiyatı + IAP ısıt (native build)
  useEffect(() => {
    if (!acik) return;
    IapBaglantisiniIsit();
    void paketleriYenile(true);
  }, [acik, paketleriYenile]);

  // Admin değişiklikleri — realtime
  // Sabit topic + Strict Mode / çoklu mount → "after subscribe()" hatası;
  // önce temizle, benzersiz topic kullan.
  useEffect(() => {
    ayniCoinPaketKanaliniTemizle();
    const topic = `${COIN_PAKET_KANAL_IMZA}-${Date.now().toString(36)}`;
    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      ch = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'coin_packages' },
          () => {
            void paketleriYenile();
          },
        )
        .subscribe();
    } catch {
      ch = null;
    }
    return () => {
      if (ch) void supabase.removeChannel(ch);
    };
  }, [paketleriYenile]);

  const ac = useCallback(() => {
    setAcik(true);
  }, []);

  const kapat = useCallback(() => {
    setAcik(false);
  }, []);

  const satinAl = useCallback(
    (pkg: CoinPackage) => {
      islemiDene('coin_satinal', () => {
        if (purchaseLocked) {
          Alert.alert(
            t('cuzdanX.kapali'),
            t('cuzdanX.satinAlmaDurduruldu'),
          );
          return;
        }
        const toplam = pkg.coins + pkg.bonus_coins;
        const fiyatYazi = PaketFiyatYazi(pkg);
        const kanal =
          Platform.OS === 'ios'
            ? 'App Store'
            : Platform.OS === 'android'
              ? 'Google Play'
              : t('cuzdanX.kanalStripe');
        const bonus =
          pkg.bonus_coins > 0
            ? t('cuzdanX.bonusSatir', {
                taban: pkg.coins.toLocaleString(loc),
                bonus: pkg.bonus_coins.toLocaleString(loc),
              })
            : '';
        Alert.alert(
          t('cuzdanX.coinYukle'),
          t('cuzdanX.satinAlOnay', {
            baslik: pkg.title,
            bonus,
            toplam: toplam.toLocaleString(loc),
            fiyat: fiyatYazi,
            kanal,
          }),
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
                  // Önce sunucu bakiyesini çek — optimistic + eski txn yanıltmasın
                  try {
                    await refreshWallet();
                  } catch {
                    if (sonuc.coinsAdded != null && sonuc.coinsAdded > 0) {
                      adjustWallet({ coins: sonuc.coinsAdded });
                    }
                  }
                  Alert.alert(
                    t('ortak.basarili'),
                    sonuc.coinsAdded != null
                      ? t('cuzdanX.coinEklendi', { adet: sonuc.coinsAdded })
                      : t('cuzdanX.odemeTamam'),
                  );
                  setAcik(false);
                } catch (e) {
                  Alert.alert(
                    t('cuzdanX.satinAlma'),
                    e instanceof Error
                      ? e.message
                      : t('cuzdanX.beklenmeyenHata'),
                  );
                }
              },
            },
          ],
        );
      });
    },
    [adjustWallet, islemiDene, loc, purchaseLocked, refreshWallet, t],
  );

  return {
    acik,
    ac,
    kapat,
    packages,
    purchaseLocked,
    satinAl,
    paketleriYenile,
    upgradeAcik,
    upgradeKapat,
    upgradeAc,
    isGuest,
  };
}
