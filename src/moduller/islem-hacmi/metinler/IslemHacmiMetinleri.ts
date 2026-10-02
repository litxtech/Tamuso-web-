/**

 * İşlem Hacmi metinleri — merkezi i18n üzerinden.

 * Geriye uyumluluk: IslemHacmiMetin() aynı alan adlarını döner.

 */



import i18n from '../../../i18n';

import { DilNormalizeEt } from '../../../i18n/diller';



export type IslemHacmiMetinSeti = {

  kartBaslik: string;

  kartAltBaslik: string;

  kartGizliSahibi: string;

  detayBaslik: string;

  detayAltBaslik: string;

  toplamEtiket: string;

  kademeEtiket: string;

  kademeYok: string;

  sonrakiKademe: string;

  kalanEtiket: string;

  uygunIslemEtiket: string;

  gorunurlukBaslik: string;

  gorunurlukAlt: string;

  gorunurlukFull: string;

  gorunurlukFullAlt: string;

  gorunurlukTier: string;

  gorunurlukTierAlt: string;

  gorunurlukPrivate: string;

  gorunurlukPrivateAlt: string;

  rozetGoster: string;

  cerceveGoster: string;

  efektGoster: string;

  liderlikGoster: string;

  bilgiBaslik: string;

  bilgiMetin: string;

  bilgiKapat: string;

  yukleHata: string;

  kaydetHata: string;

  bosDurum: string;

};



const ALANLAR: Array<keyof IslemHacmiMetinSeti> = [

  'kartBaslik',

  'kartAltBaslik',

  'kartGizliSahibi',

  'detayBaslik',

  'detayAltBaslik',

  'toplamEtiket',

  'kademeEtiket',

  'kademeYok',

  'sonrakiKademe',

  'kalanEtiket',

  'uygunIslemEtiket',

  'gorunurlukBaslik',

  'gorunurlukAlt',

  'gorunurlukFull',

  'gorunurlukFullAlt',

  'gorunurlukTier',

  'gorunurlukTierAlt',

  'gorunurlukPrivate',

  'gorunurlukPrivateAlt',

  'rozetGoster',

  'cerceveGoster',

  'efektGoster',

  'liderlikGoster',

  'bilgiBaslik',

  'bilgiMetin',

  'bilgiKapat',

  'yukleHata',

  'kaydetHata',

  'bosDurum',

];



/** Aktif veya istenen dilde metin seti */

export function IslemHacmiMetin(dil?: string | null): IslemHacmiMetinSeti {

  const kod = DilNormalizeEt(dil ?? i18n.language);

  const tf = i18n.getFixedT(kod);

  const out = {} as IslemHacmiMetinSeti;

  for (const k of ALANLAR) {

    out[k] = tf(`islemHacmi.${k}`) as string;

  }

  return out;

}



/** @deprecated — IslemHacmiMetin() / useCeviri t() kullan */

export const IslemHacmiMetinleri = {

  get tr() {

    return IslemHacmiMetin('tr');

  },

  get en() {

    return IslemHacmiMetin('en');

  },

  get es() {

    return IslemHacmiMetin('es');

  },

  get pt() {

    return IslemHacmiMetin('pt');

  },

  get ar() {

    return IslemHacmiMetin('ar');

  },

  get fr() {

    return IslemHacmiMetin('fr');

  },

  get fil() {

    return IslemHacmiMetin('fil');

  },

};

