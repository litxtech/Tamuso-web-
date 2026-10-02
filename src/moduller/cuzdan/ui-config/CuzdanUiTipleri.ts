/**
 * Cüzdan UI remote config tipleri — admin yayınlar, istemci tüketir.
 * Finansal bakiye / IAP ile karıştırma.
 */

export type CuzdanUiLocale = 'tr' | 'en' | 'es' | 'pt' | 'ar' | 'fr' | 'fil';

export type CuzdanIconSource = 'ionicon' | 'url' | 'default';

export type CuzdanActionType =
  | 'route'
  | 'open_statement'
  | 'none';

export type CuzdanSectionKey =
  | 'header'
  | 'hero_card'
  | 'quick_actions'
  | 'summary'
  | 'tabs'
  | 'coin_info'
  | 'ledger'
  | 'gifts'
  | 'topup'
  | 'withdraw';

export type CuzdanUiIcon = {
  source: CuzdanIconSource;
  ionicon?: string | null;
  url?: string | null;
  size: number;
  color: string;
  background?: string | null;
  radius?: number;
  opacity?: number;
  visible?: boolean;
};

export type CuzdanCoinDisplay = {
  name: string;
  short_name: string;
  source: CuzdanIconSource;
  ionicon?: string | null;
  url?: string | null;
  color: string;
  gradient_start?: string | null;
  gradient_end?: string | null;
  size: number;
  placement: 'before' | 'after';
  show_beside_amount: boolean;
};

export type CuzdanUiTheme = {
  preset: 'dark' | 'light' | 'premium' | 'custom';
  background: string;
  surface: string;
  cardBackground: string;
  primary: string;
  secondary: string;
  accent: string;
  buttonBackground: string;
  buttonText: string;
  primaryText: string;
  secondaryText: string;
  border: string;
  positive: string;
  warning: string;
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: 'vertical' | 'horizontal' | 'diagonal';
  radius: number;
};

export type CuzdanUiSection = {
  key: CuzdanSectionKey;
  enabled: boolean;
  sort_order: number;
};

export type CuzdanUiAction = {
  key: string;
  enabled: boolean;
  title: string;
  subtitle?: string;
  icon: string;
  icon_type: 'ionicon' | 'url';
  icon_color: string;
  background_color: string;
  text_color: string;
  sort_order: number;
  action_type: CuzdanActionType;
  action_target?: string | null;
  /** Feature flag — UI + sunucu bayrağı ile AND */
  requires_flag?: string | null;
};

export type CuzdanUiTextBlock = {
  key: string;
  type: 'heading' | 'subtitle' | 'body' | 'info' | 'warning' | 'footnote';
  enabled: boolean;
  sort_order: number;
  style_variant?: string;
  locales: Partial<Record<CuzdanUiLocale | string, string>>;
};

/** Kart üstü marka + Apple-güvenli gelir açıklaması */
export type CuzdanUiBrand = {
  /** Kart üstü marka — örn. MUTA PAY */
  name: string;
  /** Marka altı — örn. Dijital cüzdan */
  card_type: string;
  /** Kart tipi altına kısa tagline (gizlenebilir) */
  tagline: string;
  tagline_visible: boolean;
};

/** Katalog / tahmini tutar paneli — satır satır admin kontrolü */
export type CuzdanUiValueSummary = {
  enabled: boolean;
  show_katalog: boolean;
  show_platform_share: boolean;
  show_seller_net: boolean;
  show_payment_note: boolean;
  show_language_note: boolean;
  katalog_label: string;
  platform_label: string;
  seller_net_label: string;
  payment_note: string;
  language_note: string;
};

export type CuzdanUiPayload = {
  schema_version: number;
  general: {
    screen_name: string;
    eyebrow: string;
    subtitle?: string;
    description?: string;
  };
  brand: CuzdanUiBrand;
  value_summary: CuzdanUiValueSummary;
  wallet_icon: CuzdanUiIcon;
  coin: CuzdanCoinDisplay;
  theme: CuzdanUiTheme;
  sections: CuzdanUiSection[];
  actions: CuzdanUiAction[];
  texts: CuzdanUiTextBlock[];
  assets: {
    banner_url?: string | null;
    empty_state_url?: string | null;
  };
};

export type CuzdanUiCanliYanit = {
  ok: boolean;
  source: 'live' | 'default' | 'cache';
  version_no: number;
  version_id?: string | null;
  published_at?: string | null;
  label?: string | null;
  payload: CuzdanUiPayload;
};

/** Whitelist — admin sadece bunları seçebilir */
export const CUZDAN_ACTION_WHITELIST: CuzdanActionType[] = [
  'route',
  'open_statement',
  'none',
];

export const CUZDAN_ROUTE_WHITELIST = [
  '/cuzdan/takas',
  '/kyc',
  '/(tabs)/wallet',
  '/admin/finans',
] as const;
