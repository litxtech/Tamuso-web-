import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Modal, Platform, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useCeviri } from '../../../i18n/useCeviri';
import { MagazaUrlGecerli } from '../MagazaUrl';
import { KuruluSurumuOku } from '../KuruluSurum';
import {
  IstegeBagliErtele,
  IstegeBagliErtelendiMi,
} from '../SurumOnbellek';
import { SurumOlayEkle, SurumPolitikasiniYukle } from '../SurumPolitikasiServisi';
import type { SurumKararTuru, SurumPolitikasi } from '../SurumKarari';
import { GuncellemeEkrani } from './GuncellemeEkrani';

type Gorunum = 'kontrol' | 'kapali' | 'zorunlu' | 'istege_bagli';

/**
 * Kök kapı. Auth, sekme, deep link ve push'un üstünde durur.
 * Zorunlu modda kapatma yoktur.
 */
export function SurumPolitikaKapisi({ children }: { children: React.ReactNode }) {
  const { t } = useCeviri();
  const [gorunum, setGorunum] = useState<Gorunum>(
    Platform.OS === 'ios' || Platform.OS === 'android' ? 'kontrol' : 'kapali',
  );
  const [policy, setPolicy] = useState<SurumPolitikasi | null>(null);
  const [magazaHatasi, setMagazaHatasi] = useState(false);
  const gosterilen = useRef<Gorunum>('kapali');
  const kontrol = useRef(0);

  const uygula = useCallback(async (ilk: boolean) => {
    const tur = ++kontrol.current;
    const sonuc = await SurumPolitikasiniYukle();
    if (tur !== kontrol.current) return;

    let sonraki: SurumKararTuru = sonuc.karar;
    if (sonraki === 'istege_bagli' && sonuc.policy) {
      const ertelendi = await IstegeBagliErtelendiMi(sonuc.policy);
      if (ertelendi) sonraki = 'izin';
    }
    if (tur !== kontrol.current) return;

    setPolicy(sonuc.policy);
    if (sonraki === 'zorunlu') {
      setGorunum('zorunlu');
      if (gosterilen.current !== 'zorunlu') SurumOlayEkle('force_update_shown', sonuc.policy);
      gosterilen.current = 'zorunlu';
      return;
    }
    if (sonraki === 'istege_bagli') {
      setGorunum('istege_bagli');
      if (gosterilen.current !== 'istege_bagli') {
        SurumOlayEkle('optional_update_shown', sonuc.policy);
      }
      gosterilen.current = 'istege_bagli';
      return;
    }
    setGorunum('kapali');
    setMagazaHatasi(false);
    gosterilen.current = 'kapali';
    if (ilk) return;
  }, []);

  useEffect(() => {
    void uygula(true);
  }, [uygula]);

  useEffect(() => {
    const alt = AppState.addEventListener('change', (sonraki) => {
      if (sonraki === 'active') void uygula(false);
    });
    return () => alt.remove();
  }, [uygula]);

  useEffect(() => {
    if (gorunum !== 'zorunlu') return;
    const tick = setInterval(() => {
      void uygula(false);
    }, 45_000);
    return () => clearInterval(tick);
  }, [gorunum, uygula]);

  useEffect(() => {
    if (gorunum !== 'zorunlu' && gorunum !== 'kontrol') return;
    const alt = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => alt.remove();
  }, [gorunum]);

  const magazaAc = useCallback(async () => {
    const guncel = KuruluSurumuOku();
    const platform = guncel.platform === 'android' ? 'android' : 'ios';
    const url = policy?.storeUrl ?? '';
    if (gorunum === 'zorunlu') SurumOlayEkle('force_update_store_clicked', policy);
    if (guncel.platform === 'diger' || !MagazaUrlGecerli(platform, url)) {
      setMagazaHatasi(true);
      SurumOlayEkle('store_open_failed', policy);
      return;
    }
    try {
      await Linking.openURL(url);
      setMagazaHatasi(false);
    } catch {
      setMagazaHatasi(true);
      SurumOlayEkle('store_open_failed', policy);
    }
  }, [gorunum, policy]);

  const sonra = useCallback(() => {
    if (!policy || gorunum !== 'istege_bagli') return;
    SurumOlayEkle('optional_update_later', policy);
    void IstegeBagliErtele(policy);
    setGorunum('kapali');
    gosterilen.current = 'kapali';
  }, [gorunum, policy]);

  const kurulu = KuruluSurumuOku();
  const acik = gorunum !== 'kapali';

  return (
    <View style={styles.kok}>
      {children}
      <Modal
        visible={acik}
        animationType="none"
        transparent={false}
        statusBarTranslucent
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (gorunum === 'istege_bagli') sonra();
        }}
        accessibilityViewIsModal
      >
        {gorunum === 'kontrol' || !policy ? (
          <View style={styles.kontrol} accessibilityLabel="Tamuso" />
        ) : (
          <GuncellemeEkrani
            baslik={policy.title || t('surum.hazirBaslik')}
            mesaj={policy.message || t('surum.hazirAlt')}
            buton={policy.buttonText || t('surum.simdiGuncelle')}
            kuruluSurum={kurulu.version}
            hedefSurum={policy.latestVersion}
            zorunlu={gorunum === 'zorunlu'}
            magazaHatasi={magazaHatasi}
            bakimNotu={policy.maintenanceMessage || undefined}
            onGuncelle={() => void magazaAc()}
            onSonra={gorunum === 'istege_bagli' ? sonra : undefined}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  kontrol: { flex: 1, backgroundColor: '#080811' },
});
