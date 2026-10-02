import i18n from '../../i18n';

const BLOCKED_SCHEMES = [
  'javascript:',
  'file:',
  'data:',
  'intent:',
  'vbscript:',
  'about:',
  'blob:',
];

export type UrlValidation = {
  ok: boolean;
  url?: string;
  reason?: string;
};

/**
 * Sadece https:// — http default kapalı.
 * Open redirect / malicious scheme engeli.
 */
export function isSafeHttpsUrl(raw: string): UrlValidation {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, reason: i18n.t('webview.urlBos') };

  const lower = trimmed.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) {
      return {
        ok: false,
        reason: i18n.t('webview.engellenenSema', { scheme }),
      };
    }
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: i18n.t('webview.gecersizUrl') };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: i18n.t('webview.sadeceHttps') };
  }

  // Host kontrolü — "https://" boş host'u da yakala
  if (!parsed.hostname || parsed.hostname === 'localhost') {
    return { ok: false, reason: i18n.t('webview.bosHost') };
  }

  // Userinfo (user:pass@) şüpheli — engelle
  if (parsed.username || parsed.password) {
    return { ok: false, reason: i18n.t('webview.kimlikEngellendi') };
  }

  // Control characters
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return { ok: false, reason: i18n.t('webview.gecersizKarakter') };
  }

  return { ok: true, url: parsed.toString() };
}

export function shouldAllowWebViewNavigation(url: string): boolean {
  return isSafeHttpsUrl(url).ok;
}
