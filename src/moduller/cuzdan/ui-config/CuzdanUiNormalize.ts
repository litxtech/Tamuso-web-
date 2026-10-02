import { DEFAULT_CUZDAN_UI_CONFIG } from './CuzdanUiVarsayilan';
import type {
  CuzdanUiAction,
  CuzdanUiLocale,
  CuzdanUiPayload,
  CuzdanUiSection,
  CuzdanUiTextBlock,
  CuzdanSectionKey,
} from './CuzdanUiTipleri';
import { CUZDAN_ACTION_WHITELIST, CUZDAN_ROUTE_WHITELIST } from './CuzdanUiTipleri';

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
const RGBA_RE =
  /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i;

export function RenkGecerliMi(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  return HEX_RE.test(s) || RGBA_RE.test(s);
}

export function GuvenliRenk(v: unknown, fallback: string): string {
  return RenkGecerliMi(v) ? v.trim() : fallback;
}

function deepMergePayload(
  base: CuzdanUiPayload,
  raw: Partial<CuzdanUiPayload> | null | undefined,
): CuzdanUiPayload {
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    schema_version: Number(raw.schema_version ?? base.schema_version) || 1,
    general: { ...base.general, ...(raw.general ?? {}) },
    brand: { ...base.brand, ...(raw.brand ?? {}) },
    value_summary: { ...base.value_summary, ...(raw.value_summary ?? {}) },
    wallet_icon: {
      ...base.wallet_icon,
      ...(raw.wallet_icon ?? {}),
      color: GuvenliRenk(raw.wallet_icon?.color, base.wallet_icon.color),
      background: raw.wallet_icon?.background
        ? GuvenliRenk(raw.wallet_icon.background, base.wallet_icon.background ?? '#000')
        : base.wallet_icon.background,
    },
    coin: {
      ...base.coin,
      ...(raw.coin ?? {}),
      color: GuvenliRenk(raw.coin?.color, base.coin.color),
    },
    theme: {
      ...base.theme,
      ...(raw.theme ?? {}),
      background: GuvenliRenk(raw.theme?.background, base.theme.background),
      surface: GuvenliRenk(raw.theme?.surface, base.theme.surface),
      cardBackground: GuvenliRenk(raw.theme?.cardBackground, base.theme.cardBackground),
      primary: GuvenliRenk(raw.theme?.primary, base.theme.primary),
      secondary: GuvenliRenk(raw.theme?.secondary, base.theme.secondary),
      accent: GuvenliRenk(raw.theme?.accent, base.theme.accent),
      buttonBackground: GuvenliRenk(
        raw.theme?.buttonBackground,
        base.theme.buttonBackground,
      ),
      buttonText: GuvenliRenk(raw.theme?.buttonText, base.theme.buttonText),
      primaryText: GuvenliRenk(raw.theme?.primaryText, base.theme.primaryText),
      secondaryText: GuvenliRenk(raw.theme?.secondaryText, base.theme.secondaryText),
      border: GuvenliRenk(raw.theme?.border, base.theme.border),
      positive: GuvenliRenk(raw.theme?.positive, base.theme.positive),
      warning: GuvenliRenk(raw.theme?.warning, base.theme.warning),
      gradientStart: GuvenliRenk(raw.theme?.gradientStart, base.theme.gradientStart),
      gradientEnd: GuvenliRenk(raw.theme?.gradientEnd, base.theme.gradientEnd),
    },
    sections: Array.isArray(raw.sections) ? (raw.sections as CuzdanUiSection[]) : base.sections,
    actions: Array.isArray(raw.actions)
      ? (raw.actions as CuzdanUiAction[]).map(sanitizeAction)
      : base.actions,
    texts: Array.isArray(raw.texts) ? (raw.texts as CuzdanUiTextBlock[]) : base.texts,
    assets: { ...base.assets, ...(raw.assets ?? {}) },
  };
}

function sanitizeAction(a: CuzdanUiAction): CuzdanUiAction {
  const action_type = CUZDAN_ACTION_WHITELIST.includes(a.action_type)
    ? a.action_type
    : 'none';
  let action_target = a.action_target ?? null;
  if (action_type === 'route' && action_target) {
    const ok = (CUZDAN_ROUTE_WHITELIST as readonly string[]).includes(action_target);
    if (!ok) action_target = null;
  }
  return {
    ...a,
    action_type,
    action_target,
    enabled: !!a.enabled,
    sort_order: Number(a.sort_order) || 0,
  };
}

/** Bozuk/eksik payload → default ile birleştir; asla throw etme */
export function CuzdanUiNormalize(
  raw: unknown,
): CuzdanUiPayload {
  try {
    if (!raw || typeof raw !== 'object') return DEFAULT_CUZDAN_UI_CONFIG;
    return deepMergePayload(DEFAULT_CUZDAN_UI_CONFIG, raw as Partial<CuzdanUiPayload>);
  } catch {
    return DEFAULT_CUZDAN_UI_CONFIG;
  }
}

export function CuzdanBolumAcikMi(
  payload: CuzdanUiPayload,
  key: CuzdanSectionKey,
): boolean {
  const s = payload.sections.find((x) => x.key === key);
  return s ? !!s.enabled : true;
}

export function CuzdanBolumleriSirali(
  payload: CuzdanUiPayload,
): CuzdanUiSection[] {
  return [...payload.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function CuzdanAksiyonlariSirali(
  payload: CuzdanUiPayload,
  flagMap?: Record<string, boolean>,
): CuzdanUiAction[] {
  return [...payload.actions]
    .filter((a) => {
      if (!a.enabled) return false;
      if (a.requires_flag && flagMap && flagMap[a.requires_flag] === false) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function CuzdanMetinAl(
  payload: CuzdanUiPayload,
  key: string,
  locale: CuzdanUiLocale | string = 'tr',
  fallback = '',
): string {
  const block = payload.texts.find((t) => t.key === key && t.enabled);
  if (!block) return fallback;
  return (
    block.locales[locale] ||
    block.locales.tr ||
    block.locales.en ||
    block.locales.es ||
    block.locales.pt ||
    block.locales.ar ||
    Object.values(block.locales)[0] ||
    fallback
  );
}
