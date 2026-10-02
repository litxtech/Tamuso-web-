/**
 * Dil bootstrap — layout import edilir edilmez AsyncStorage + changeLanguage
 * paralel başlar. DilSaglayici sadece sonucu bekler (flash azaltır).
 *
 * SYSTEM → cihaz/ülke dili; MANUAL → kayıtlı seçim.
 */
import {
  DilCozumle,
  DilNormalizeEt,
  type DilModu,
  type UygulamaDili,
} from './diller';
import { I18nDiliniAyarla } from './index';
import { KullaniciAyarlariniGetir } from '../moduller/ayarlar/islemler/KullaniciAyarlariniYonet';
import { RtlUygula } from './RtlUygula';

export type DilBootstrapSonuc = {
  dil: UygulamaDili;
  dilModu: DilModu;
  reloadGerekli: boolean;
};

export const dilBootstrapSoz: Promise<DilBootstrapSonuc> = (async () => {
  try {
    const ayar = await KullaniciAyarlariniGetir();
    const secilen =
      ayar.dilModu === 'MANUAL' && ayar.dilKayitli
        ? DilNormalizeEt(ayar.dil)
        : DilCozumle({
            mod: ayar.dilModu,
            manuelDil: ayar.dil,
          });
    await I18nDiliniAyarla(secilen);
    const reloadGerekli = RtlUygula(secilen).yenidenBaslatGerekli;
    return { dil: secilen, dilModu: ayar.dilModu, reloadGerekli };
  } catch {
    const fallback = DilCozumle({ mod: 'SYSTEM' });
    await I18nDiliniAyarla(fallback);
    const reloadGerekli = RtlUygula(fallback).yenidenBaslatGerekli;
    return { dil: fallback, dilModu: 'SYSTEM', reloadGerekli };
  }
})();
