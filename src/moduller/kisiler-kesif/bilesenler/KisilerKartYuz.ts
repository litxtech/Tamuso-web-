/**
 * Profil fotoğrafı yokken baş harf ve kullanıcıya sabit renk çifti.
 * Renkler mevcut tema tokenlarından seçilir.
 */

import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

const CIFTLER: readonly (readonly [string, string])[] = [
  [RenkTokenlari.primary, RenkTokenlari.bgElevated],
  [RenkTokenlari.magenta, RenkTokenlari.bgElevated],
  [RenkTokenlari.primarySoft, RenkTokenlari.bg],
];

export function basHarfler(isim: string): string {
  const parca = isim.trim().split(/\s+/).filter(Boolean);
  if (parca.length === 0) return '?';
  const ilk = parca[0] ?? '';
  if (parca.length === 1) return ilk.slice(0, 2).toLocaleUpperCase();
  const ikinci = parca[1] ?? '';
  return `${ilk.slice(0, 1)}${ikinci.slice(0, 1)}`.toLocaleUpperCase();
}

export function harfRenkleri(anahtar: string): readonly [string, string] {
  let h = 0;
  for (let i = 0; i < anahtar.length; i++) {
    h = (h * 31 + anahtar.charCodeAt(i)) >>> 0;
  }
  return CIFTLER[h % CIFTLER.length] ?? [RenkTokenlari.primary, RenkTokenlari.bgElevated];
}
