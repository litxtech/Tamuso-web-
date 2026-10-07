/**
 * Mesaj metninden URL ayıklama — tıklanabilir + önizleme.
 * http(s), www., uygulama şeması, mailto/tel.
 */

export type MesajUrlParca =
  | { tur: 'text'; deger: string }
  | { tur: 'link'; deger: string; url: string }
  | { tur: 'tel'; deger: string; numara: string };

/** Trailing punctuation sık sık mesaj sonuna yapışır */
const TRAIL_PUNCT_RE = /[.,;:!?)>\]]+$/;

/**
 * Global URL matcher:
 * - https?://…
 * - www.…
 * - muta://… (veya EXPO scheme)
 * - mailto: / tel:
 */
const URL_GLOBAL_RE =
  /(?:https?:\/\/|www\.|[a-z][a-z0-9+.-]*:\/\/|mailto:|tel:)[^\s<>"'`)\]}]+/gi;

export function MesajUrlNormalize(ham: string): string | null {
  const raw = (ham ?? '').trim().replace(TRAIL_PUNCT_RE, '');
  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return null;
  }

  if (lower.startsWith('www.')) {
    return `https://${raw}`;
  }

  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:')
  ) {
    return raw;
  }

  // App / custom scheme (muta://paylas/…)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    return raw;
  }

  return null;
}

export function MesajMetindenUrlAyikla(metin: string): string[] {
  if (!metin) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(URL_GLOBAL_RE.source, URL_GLOBAL_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(metin)) !== null) {
    const norm = MesajUrlNormalize(m[0]);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

export function MesajIlkUrl(metin: string | null | undefined): string | null {
  if (!metin) return null;
  return MesajMetindenUrlAyikla(metin)[0] ?? null;
}

export function MesajMetniLinkParcala(metin: string): MesajUrlParca[] {
  if (!metin) return [{ tur: 'text', deger: '' }];
  const re = new RegExp(URL_GLOBAL_RE.source, URL_GLOBAL_RE.flags);
  const parcalar: MesajUrlParca[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(metin)) !== null) {
    const ham = m[0];
    const start = m.index;
    const norm = MesajUrlNormalize(ham);
    if (start > last) {
      parcalar.push({ tur: 'text', deger: metin.slice(last, start) });
    }
    if (norm) {
      // Görünen metinden trailing punct ayır
      const cleaned = ham.replace(TRAIL_PUNCT_RE, '');
      const trail = ham.slice(cleaned.length);
      parcalar.push({ tur: 'link', deger: cleaned, url: norm });
      if (trail) parcalar.push({ tur: 'text', deger: trail });
    } else {
      parcalar.push({ tur: 'text', deger: ham });
    }
    last = start + ham.length;
  }
  if (last < metin.length) {
    parcalar.push({ tur: 'text', deger: metin.slice(last) });
  }
  const urlParcalari = parcalar.length ? parcalar : [{ tur: 'text' as const, deger: metin }];
  return urlParcalari.flatMap((p) =>
    p.tur === 'text' ? metindenTelefonParcala(p.deger) : [p],
  );
}

/**
 * Telefon gibi görünen numaralar. Kısa kodlar (112, 444…) bağlanmaz.
 * En az 8 hane; 10’dan kısa yalın rakam dizisi de bağlanmaz.
 */
const TEL_RE = /(\+?\d(?:[\s().-]{0,2}\d){7,14})/g;

function telefonNumarasi(ham: string): string | null {
  const govde = ham.trim();
  const rakam = govde.replace(/\D/g, '');
  if (rakam.length < 8 || rakam.length > 15) return null;
  const arti = govde.trimStart().startsWith('+');
  const sifir = rakam.startsWith('0');
  const ayrac = /[\s().-]/.test(govde);
  if (!arti && !sifir && !ayrac && rakam.length < 10) return null;
  return arti ? `+${rakam}` : rakam;
}

function metindenTelefonParcala(metin: string): MesajUrlParca[] {
  if (!metin) return [{ tur: 'text', deger: metin }];
  const re = new RegExp(TEL_RE.source, TEL_RE.flags);
  const parcalar: MesajUrlParca[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(metin)) !== null) {
    const ham = m[1] ?? m[0];
    const start = m.index;
    const onceki = start > 0 ? metin[start - 1] : '';
    if (onceki && /[\w+]/.test(onceki)) continue;
    const numara = telefonNumarasi(ham);
    if (!numara) continue;
    if (start > last) {
      parcalar.push({ tur: 'text', deger: metin.slice(last, start) });
    }
    parcalar.push({ tur: 'tel', deger: ham, numara });
    last = start + ham.length;
  }
  if (last < metin.length) {
    parcalar.push({ tur: 'text', deger: metin.slice(last) });
  }
  return parcalar.length ? parcalar : [{ tur: 'text', deger: metin }];
}

const HOST_DOST_AD: Record<string, string> = {
  'youtu.be': 'YouTube',
  'youtube.com': 'YouTube',
  'm.youtube.com': 'YouTube',
  'www.youtube.com': 'YouTube',
  'music.youtube.com': 'YouTube Music',
  'instagram.com': 'Instagram',
  'www.instagram.com': 'Instagram',
  'instagr.am': 'Instagram',
  'tiktok.com': 'TikTok',
  'www.tiktok.com': 'TikTok',
  'vm.tiktok.com': 'TikTok',
  'twitter.com': 'X',
  'www.twitter.com': 'X',
  'x.com': 'X',
  'www.x.com': 'X',
  't.co': 'X',
  'facebook.com': 'Facebook',
  'www.facebook.com': 'Facebook',
  'fb.me': 'Facebook',
  'fb.watch': 'Facebook',
  'open.spotify.com': 'Spotify',
  'spotify.com': 'Spotify',
  'wa.me': 'WhatsApp',
  'api.whatsapp.com': 'WhatsApp',
  'chat.whatsapp.com': 'WhatsApp',
  't.me': 'Telegram',
  'telegram.me': 'Telegram',
  'linkedin.com': 'LinkedIn',
  'www.linkedin.com': 'LinkedIn',
  'reddit.com': 'Reddit',
  'www.reddit.com': 'Reddit',
  'redd.it': 'Reddit',
  'maps.google.com': 'Google Maps',
  'goo.gl': 'Google',
  'bit.ly': 'Bitly',
};

export function MesajUrlHostGoster(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'mailto:' || u.protocol === 'tel:') {
      return u.pathname || url;
    }
    const host = u.hostname.toLowerCase();
    if (HOST_DOST_AD[host]) return HOST_DOST_AD[host];
    const bare = host.replace(/^www\./i, '');
    if (HOST_DOST_AD[bare]) return HOST_DOST_AD[bare];
    return bare || url;
  } catch {
    return url;
  }
}

/** Kartta gösterilecek tam hostname (youtube.com gibi) */
export function MesajUrlHostHam(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'mailto:' || u.protocol === 'tel:') {
      return u.pathname || url;
    }
    return u.hostname.replace(/^www\./i, '') || url;
  } catch {
    return url;
  }
}
