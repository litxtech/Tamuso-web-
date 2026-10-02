/**
 * Çocuk Koruma onay kartı metinleri — i18n üzerinden.
 * Tek seferlik; onayda kaybolur, “değilim” + onayda hesap kapanır.
 */

import i18n from '../../../i18n';

export type CocukKorumaKartMetinSeti = {
  baslik: string;
  govde: string;
  btnBuyugum: string;
  btnDegilim: string;
  onayUyari: string;
  btnOnayKapat: string;
  btnVazgec: string;
};

const ALANLAR: Array<keyof CocukKorumaKartMetinSeti> = [
  'baslik',
  'govde',
  'btnBuyugum',
  'btnDegilim',
  'onayUyari',
  'btnOnayKapat',
  'btnVazgec',
];

/** Aktif dil metin seti */
export function CocukKorumaKartMetin(): CocukKorumaKartMetinSeti {
  const out = {} as CocukKorumaKartMetinSeti;
  for (const k of ALANLAR) {
    out[k] = i18n.t(`cocukKoruma.${k}`) as string;
  }
  return out;
}

/** @deprecated — CocukKorumaKartMetin() / useCeviri kullan */
export const COCUK_KORUMA_KART = {
  get baslikTr() {
    return i18n.t('cocukKoruma.baslik');
  },
  get baslikEn() {
    return i18n.t('cocukKoruma.baslik');
  },
  get govdeTr() {
    return i18n.t('cocukKoruma.govde');
  },
  get govdeEn() {
    return i18n.t('cocukKoruma.govde');
  },
  get btnBuyugumTr() {
    return i18n.t('cocukKoruma.btnBuyugum');
  },
  get btnBuyugumEn() {
    return i18n.t('cocukKoruma.btnBuyugum');
  },
  get btnDegilimTr() {
    return i18n.t('cocukKoruma.btnDegilim');
  },
  get btnDegilimEn() {
    return i18n.t('cocukKoruma.btnDegilim');
  },
  get onayUyariTr() {
    return i18n.t('cocukKoruma.onayUyari');
  },
  get onayUyariEn() {
    return i18n.t('cocukKoruma.onayUyari');
  },
  get btnOnayKapatTr() {
    return i18n.t('cocukKoruma.btnOnayKapat');
  },
  get btnOnayKapatEn() {
    return i18n.t('cocukKoruma.btnOnayKapat');
  },
  get btnVazgecTr() {
    return i18n.t('cocukKoruma.btnVazgec');
  },
  get btnVazgecEn() {
    return i18n.t('cocukKoruma.btnVazgec');
  },
} as const;
