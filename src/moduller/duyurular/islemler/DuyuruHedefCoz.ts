/**
 * CTA hedefi yalnız bilinen uygulama rotalarına veya izinli https adresine çözülür.
 */
const IC_ONEK = [
  '/duyuru',
  '/kullanici',
  '/room',
  '/lobi',
  '/canli',
  '/durum',
  '/ajans',
  '/oyun',
  '/kesfet',
  '/sehir',
  '/ulke',
  '/platform',
  '/ayarlar',
  '/(tabs)',
];

function icRotaMi(path: string) {
  if (!path.startsWith('/') || path.includes('..') || path.includes('://')) return false;
  return IC_ONEK.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
}

export function DuyuruHedefCoz(
  type: string,
  destination: { path?: string; id?: string; url?: string } | null | undefined,
  izinliHostlar: string[] = [],
): string | null {
  const dest = destination ?? {};
  const id = (dest.id ?? '').trim();
  const idGuvenli = /^[A-Za-z0-9_-]{1,80}$/.test(id);
  switch (type) {
    case 'INTERNAL_ROUTE':
      return dest.path && icRotaMi(dest.path) ? dest.path : null;
    case 'PROFILE':
    case 'CREATOR':
      return idGuvenli ? `/kullanici/${id}` : null;
    case 'VOICE_ROOM':
      return idGuvenli ? `/room/${id}` : null;
    case 'LIVE':
      return idGuvenli ? `/canli/${id}` : null;
    case 'STATUS':
      return idGuvenli ? `/durum/${id}` : null;
    case 'AGENCY':
      return idGuvenli ? `/ajans/${id}` : null;
    case 'GAME':
      return idGuvenli ? `/oyun/${id}` : null;
    case 'WEBVIEW':
    case 'EXTERNAL_URL': {
      const url = (dest.url ?? '').trim();
      if (!url.startsWith('https://')) return null;
      try {
        const host = new URL(url).hostname.toLowerCase();
        if (!izinliHostlar.map((h) => h.toLowerCase()).includes(host)) return null;
        return url;
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}
