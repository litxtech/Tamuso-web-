import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DilNormalizeEt,
  VARSAYILAN_DIL,
  type UygulamaDili,
} from './diller';
import { tr } from './locales/tr';
import { en } from './locales/en';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { ar } from './locales/ar';
import { fr } from './locales/fr';
import { fil } from './locales/fil';

const resources = {
  tr: { translation: tr },
  en: { translation: en },
  es: { translation: es },
  pt: { translation: pt },
  ar: { translation: ar },
  fr: { translation: fr },
  fil: { translation: fil },
} as const;

/**
 * İlk boyama: cihaz/ülke dili (senkron). AsyncStorage MANUAL dil yüklenene kadar
 * flash’ı azaltır. Kayıtlı MANUAL dil DilSaglayici’de await ile uygulanır.
 *
 * Not: CihazDiliniAl() burada çağrılmaz — HMR / circular import sırasında
 * named export undefined kalırsa TypeError: undefined is not a function olur.
 */
function baslangicDilAl(): UygulamaDili {
  try {
    const tag =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : '';
    if (tag) return DilNormalizeEt(tag);
  } catch {
    /* Intl yok / bozuk */
  }
  return VARSAYILAN_DIL;
}

const BASLANGIC_DIL = baslangicDilAl();

/** init tamamlanmadan changeLanguage çağrılmasın */
export const i18nHazir = i18n.use(initReactI18next).init({
  resources,
  lng: BASLANGIC_DIL,
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
  returnNull: false,
  parseMissingKeyHandler: (key) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[i18n] Missing translation:', key);
    }
    const enVal = i18n.getResource('en', 'translation', key);
    return typeof enVal === 'string' ? enVal : '';
  },
});

/**
 * Dil değişimini uygula — mutlaka await et.
 * Aksi halde UI İngilizce açılıp sonra düzelir (language flash).
 */
export async function I18nDiliniAyarla(dil: string): Promise<UygulamaDili> {
  const kod = DilNormalizeEt(dil);
  await i18nHazir;
  if (i18n.language !== kod && !i18n.language?.startsWith(`${kod}-`)) {
    await i18n.changeLanguage(kod);
  }
  return kod;
}

export function AktifDil(): UygulamaDili {
  return DilNormalizeEt(i18n.language);
}

export { isRtlDil, isRtlAktif } from './rtl';

export default i18n;
