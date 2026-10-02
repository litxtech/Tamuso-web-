export type MagazaPlatformu = 'ios' | 'android';

const APPLE = new Set(['apps.apple.com', 'itunes.apple.com']);

/** https ve ilgili mağaza alanı. javascript / webview yok. */
export function MagazaUrlGecerli(platform: MagazaPlatformu, url: string): boolean {
  const ham = String(url ?? '').trim();
  if (!ham || ham.length > 500) return false;
  if (/\s|<|>|"|\\/.test(ham)) return false;
  let parsed: URL;
  try {
    parsed = new URL(ham);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const yol = parsed.pathname;
  if (platform === 'ios') {
    return APPLE.has(host) && yol.length > 1;
  }
  return host === 'play.google.com' && yol.startsWith('/store/');
}

/** Etiketleri düz metne indir. HTML çalıştırılmaz. */
export function GuvenliGuncellemeMetni(girdi: string | null | undefined, limit = 2000): string {
  return String(girdi ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, limit);
}
