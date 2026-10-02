import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';
import { KlavyeKonumunuKaydet } from './KlavyeKonum';

/**
 * Klavye yüksekliği + açık mı?
 * Android: `softwareKeyboardLayoutMode: 'resize'` varsa önce pad=0;
 * resize yetmezse overlap ile tamamlanır. Erken tam-yükseklik pad
 * aşağı-yukarı zıplama yapıyordu.
 */
export function useKlavyeYuksekligi(ekstraPad = 0): {
  yukseklik: number;
  acik: boolean;
} {
  const [yukseklik, setYukseklik] = useState(0);
  const [acik, setAcik] = useState(false);

  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const baselineGap = Math.max(
      0,
      Dimensions.get('screen').height - Dimensions.get('window').height,
    );
    const timers: ReturnType<typeof setTimeout>[] = [];

    const androidPadHesapla = (
      keyboardH: number,
      screenY: number,
      agresif: boolean,
    ) => {
      const screenH = Dimensions.get('screen').height;
      const windowH = Dimensions.get('window').height;
      const gap = Math.max(0, screenH - windowH);
      const resizeMiktari = Math.max(0, gap - baselineGap);

      // Resize klavyeyi zaten taşıdıysa ekstra pad yok.
      if (resizeMiktari >= keyboardH * 0.45) {
        return Math.max(0, ekstraPad);
      }

      const overlap = Math.max(0, Math.ceil(windowH - screenY));
      if (overlap > 24) {
        return Math.max(0, overlap + ekstraPad);
      }

      // İlk karede tam pad yok (zıplama); yine de son input’lar için
      // minimum yer bırak — resize/overlap gelene kadar banka alanları örtülmesin.
      if (!agresif) {
        return Math.max(0, ekstraPad, Math.ceil(keyboardH * 0.55));
      }

      return Math.max(0, keyboardH + ekstraPad);
    };

    const uygula = (
      keyboardH: number,
      screenY: number,
      agresif = false,
    ) => {
      KlavyeKonumunuKaydet(screenY, keyboardH);
      if (keyboardH <= 0) {
        setYukseklik(0);
        return;
      }
      if (Platform.OS === 'android') {
        setYukseklik(androidPadHesapla(keyboardH, screenY, agresif));
        return;
      }
      setYukseklik(Math.max(0, keyboardH + ekstraPad));
    };

    const onShow = Keyboard.addListener(showEvt, (e) => {
      const keyboardH = e.endCoordinates?.height ?? 0;
      const screenY = e.endCoordinates?.screenY ?? 0;
      setAcik(true);
      uygula(keyboardH, screenY, false);
      if (Platform.OS === 'android' && keyboardH > 0) {
        // Resize otursun; gerekirse overlap ile tamamla (agresif = true).
        timers.push(
          setTimeout(() => uygula(keyboardH, screenY, true), 80),
          setTimeout(() => uygula(keyboardH, screenY, true), 200),
        );
      }
    });

    const onHide = Keyboard.addListener(hideEvt, () => {
      while (timers.length) {
        const id = timers.pop();
        if (id != null) clearTimeout(id);
      }
      setAcik(false);
      setYukseklik(0);
      KlavyeKonumunuKaydet(Dimensions.get('window').height, 0);
    });

    return () => {
      while (timers.length) {
        const id = timers.pop();
        if (id != null) clearTimeout(id);
      }
      onShow.remove();
      onHide.remove();
    };
  }, [ekstraPad]);

  return { yukseklik, acik };
}
