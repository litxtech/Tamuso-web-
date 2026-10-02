import i18n from '../../../i18n';
import type { CuzdanUiPayload } from './CuzdanUiTipleri';

function localeMap(key: string): Record<string, string> {
  return {
    tr: i18n.t(key, { lng: 'tr' }) as string,
    en: i18n.t(key, { lng: 'en' }) as string,
    es: i18n.t(key, { lng: 'es' }) as string,
    pt: i18n.t(key, { lng: 'pt' }) as string,
    ar: i18n.t(key, { lng: 'ar' }) as string,
    fr: i18n.t(key, { lng: 'fr' }) as string,
    fil: i18n.t(key, { lng: 'fil' }) as string,
  };
}

/** Crash-safe fallback — mevcut Tamuso cüzdan görünümü (canlı dil) */
export function getDefaultCuzdanUiConfig(): CuzdanUiPayload {
  return {
    schema_version: 1,
    general: {
      screen_name: i18n.t('cuzdan.baslik') as string,
      eyebrow: i18n.t('cuzdanX.uiEyebrow') as string,
      subtitle: '',
      description: '',
    },
    brand: {
      name: 'MUTA PAY',
      card_type: i18n.t('cuzdanX.uiKartTipi') as string,
      tagline: i18n.t('cuzdanX.uiBrandTagline') as string,
      tagline_visible: true,
    },
    value_summary: {
      enabled: true,
      show_katalog: true,
      show_platform_share: true,
      show_seller_net: true,
      show_payment_note: true,
      show_language_note: true,
      katalog_label: i18n.t('cuzdanX.uiKatalogLabel') as string,
      platform_label: i18n.t('cuzdanX.uiPlatformLabel') as string,
      seller_net_label: i18n.t('cuzdanX.uiSellerNetLabel') as string,
      payment_note: i18n.t('cuzdanX.uiPaymentNote') as string,
      language_note: i18n.t('cuzdanX.uiLanguageNote') as string,
    },
    wallet_icon: {
      source: 'ionicon',
      ionicon: 'wallet-outline',
      url: null,
      size: 22,
      color: '#FFFFFF',
      background: 'rgba(232,64,145,0.22)',
      radius: 14,
      opacity: 1,
      visible: true,
    },
    coin: {
      name: 'Coin',
      short_name: 'Coin',
      source: 'ionicon',
      ionicon: 'ellipse',
      url: null,
      color: '#F0B429',
      gradient_start: '#F0B429',
      gradient_end: '#E84091',
      size: 18,
      placement: 'before',
      show_beside_amount: true,
    },
    theme: {
      preset: 'premium',
      background: '#0B0614',
      surface: '#16121E',
      cardBackground: '#1A1424',
      primary: '#E84091',
      secondary: '#8B5CF6',
      accent: '#F0B429',
      buttonBackground: 'rgba(232,64,145,0.16)',
      buttonText: '#FFFFFF',
      primaryText: '#FFFFFF',
      secondaryText: 'rgba(255,255,255,0.62)',
      border: 'rgba(255,255,255,0.10)',
      positive: '#34D399',
      warning: '#F0B429',
      gradientStart: '#E84091',
      gradientEnd: '#8B5CF6',
      gradientDirection: 'vertical',
      radius: 16,
    },
    sections: [
      { key: 'header', enabled: true, sort_order: 10 },
      { key: 'hero_card', enabled: true, sort_order: 20 },
      { key: 'quick_actions', enabled: true, sort_order: 30 },
      { key: 'summary', enabled: true, sort_order: 40 },
      { key: 'tabs', enabled: true, sort_order: 50 },
      { key: 'coin_info', enabled: true, sort_order: 60 },
      { key: 'ledger', enabled: true, sort_order: 70 },
      { key: 'gifts', enabled: true, sort_order: 80 },
      { key: 'topup', enabled: true, sort_order: 90 },
      { key: 'withdraw', enabled: true, sort_order: 100 },
    ],
    actions: [
      {
        key: 'takas',
        enabled: true,
        title: i18n.t('cuzdanX.uiTakasTitle') as string,
        subtitle: i18n.t('cuzdanX.uiTakasSubtitle') as string,
        icon: 'swap-horizontal',
        icon_type: 'ionicon',
        icon_color: '#F0B429',
        background_color: 'rgba(255,255,255,0.06)',
        text_color: '#FFFFFF',
        sort_order: 10,
        action_type: 'route',
        action_target: '/cuzdan/takas',
        requires_flag: 'wallet_exchange_enabled',
      },
      {
        key: 'kyc',
        enabled: true,
        title: i18n.t('cuzdanX.uiKycTitle') as string,
        subtitle: '',
        icon: 'shield-checkmark-outline',
        icon_type: 'ionicon',
        icon_color: '#E84091',
        background_color: 'rgba(255,255,255,0.06)',
        text_color: '#FFFFFF',
        sort_order: 20,
        action_type: 'route',
        action_target: '/kyc',
        requires_flag: null,
      },
      {
        key: 'hareket_belge',
        enabled: true,
        title: i18n.t('cuzdanX.uiHesapOzetiTitle') as string,
        subtitle: i18n.t('cuzdanX.uiHesapOzetiSubtitle') as string,
        icon: 'document-text-outline',
        icon_type: 'ionicon',
        icon_color: '#FFFFFF',
        background_color: 'rgba(255,255,255,0.06)',
        text_color: '#FFFFFF',
        sort_order: 30,
        action_type: 'open_statement',
        action_target: null,
        requires_flag: null,
      },
    ],
    texts: [
      {
        key: 'coin_info',
        type: 'info',
        enabled: true,
        sort_order: 10,
        style_variant: 'footnote',
        locales: localeMap('cuzdanX.uiCoinInfo'),
      },
      {
        key: 'purchase_locked',
        type: 'warning',
        enabled: true,
        sort_order: 20,
        style_variant: 'warning',
        locales: localeMap('cuzdanX.uiPurchaseLocked'),
      },
      {
        key: 'summary_title',
        type: 'heading',
        enabled: true,
        sort_order: 5,
        style_variant: 'section',
        locales: localeMap('cuzdanX.uiSummaryTitle'),
      },
      {
        key: 'hero_note',
        type: 'info',
        enabled: true,
        sort_order: 8,
        style_variant: 'footnote',
        locales: localeMap('cuzdanX.uiHeroNote'),
      },
    ],
    assets: {
      banner_url: null,
      empty_state_url: null,
    },
  };
}

/** Geriye dönük — her okumada canlı dil için getDefaultCuzdanUiConfig tercih et */
export const DEFAULT_CUZDAN_UI_CONFIG: CuzdanUiPayload = new Proxy(
  {} as CuzdanUiPayload,
  {
    get(_t, prop, receiver) {
      if (prop === Symbol.toStringTag) return 'Object';
      if (prop === 'then') return undefined;
      const live = getDefaultCuzdanUiConfig();
      const v = Reflect.get(live, prop, receiver);
      return typeof v === 'function' ? v.bind(live) : v;
    },
    ownKeys() {
      return Reflect.ownKeys(getDefaultCuzdanUiConfig());
    },
    getOwnPropertyDescriptor(_t, prop) {
      const live = getDefaultCuzdanUiConfig();
      const desc = Reflect.getOwnPropertyDescriptor(live, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
    has(_t, prop) {
      return prop in getDefaultCuzdanUiConfig();
    },
  },
);
