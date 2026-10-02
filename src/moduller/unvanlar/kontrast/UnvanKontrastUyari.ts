/**
 * Admin tasarım önizlemesi için basit WCAG göreli parlaklık / kontrast uyarısı.
 * UI çökertmez; sadece uyarı metni döner.
 */

function parseRgb(color: string): [number, number, number] | null {
  if (!color) return null;
  if (color.startsWith('#')) {
    const h = color.slice(1);
    if (h.length === 6 || h.length === 8) {
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    }
  }
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

function kanal(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance 0..1 (WCAG) */
export function UnvanGoreliParlaklik(color: string): number | null {
  const rgb = parseRgb(color);
  if (!rgb) return null;
  return 0.2126 * kanal(rgb[0]) + 0.7152 * kanal(rgb[1]) + 0.0722 * kanal(rgb[2]);
}

/** Contrast ratio L1:L2 (≥1) */
export function UnvanKontrastOrani(fg: string, bg: string): number | null {
  const a = UnvanGoreliParlaklik(fg);
  const b = UnvanGoreliParlaklik(bg);
  if (a == null || b == null) return null;
  const light = Math.max(a, b);
  const dark = Math.min(a, b);
  return (light + 0.05) / (dark + 0.05);
}

/** true = düşük kontrast uyarısı göster (kısa helper) */
export function UnvanDusukKontrastMi(fg: string, bg: string): boolean {
  if (!bg || bg === 'transparent') return false;
  const ratio = UnvanKontrastOrani(fg, bg);
  if (ratio == null) return false;
  return ratio < 3;
}

export type UnvanKontrastSonuc = {
  ratio: number | null;
  /** true → admin'e göster */
  uyari: boolean;
  seviye: 'ok' | 'dusuk' | 'bilinmiyor';
  mesaj: string | null;
};

/**
 * Metin / arka plan kontrastı — AA küçük metin eşiği ~4.5.
 * Hex/rgba dışı renklerde sessizce bilinmiyor döner.
 */
export function UnvanKontrastUyari(
  textColor: string,
  backgroundColor: string,
  minRatio = 4.5,
): UnvanKontrastSonuc {
  if (!backgroundColor || backgroundColor === 'transparent') {
    return { ratio: null, uyari: false, seviye: 'bilinmiyor', mesaj: null };
  }
  const ratio = UnvanKontrastOrani(textColor, backgroundColor);
  if (ratio == null) {
    return { ratio: null, uyari: false, seviye: 'bilinmiyor', mesaj: null };
  }
  if (ratio < minRatio) {
    return {
      ratio,
      uyari: true,
      seviye: 'dusuk',
      mesaj: `Düşük kontrast (${ratio.toFixed(2)}:1). Okunabilirlik için ≥${minRatio}:1 önerilir.`,
    };
  }
  return { ratio, uyari: false, seviye: 'ok', mesaj: null };
}
