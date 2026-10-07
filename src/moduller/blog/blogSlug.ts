const AYRIK = new Set(['kategori', 'etiket', 'ara', 'sayfa', 'onizleme']);

/** Türkçe başlığı blog adresine çevirir. Elle yazılan slug bunun üzerine yazılabilir. */
export function slugYap(girdi: string): string {
  const harita: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', I: 'i', ö: 'o', Ö: 'o',
    ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', Â: 'a', î: 'i', û: 'u',
  };
  let s = [...String(girdi ?? '')].map((ch) => harita[ch] ?? ch).join('');
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  s = s.replace(/[''`’‘]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  s = s.slice(0, 80).replace(/-+$/g, '');
  if (!s || AYRIK.has(s)) return '';
  return s;
}

export function slugGecerli(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && !AYRIK.has(slug);
}
