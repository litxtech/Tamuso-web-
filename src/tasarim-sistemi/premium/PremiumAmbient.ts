/**
 * Tema-bağımsız ambient / glow yardımcıları.
 */
import { RenkTokenlari } from '../RenkTokenlari';
import { kullaniciTemaKodunuAl, temaAcikMi } from '../tema/TemaDurumu';

export type AtmosferLeke = {
  renk: string;
  opacity: number;
  w: number;
  h: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
};

export function premiumAcikTemaMi(): boolean {
  return temaAcikMi(kullaniciTemaKodunuAl());
}

/** Dark: lacivert-siyah ambient · Light: soft pembe/lila blobs */
export function premiumAtmosferLekeleri(): AtmosferLeke[] {
  if (premiumAcikTemaMi()) {
    return [
      { renk: RenkTokenlari.primary, opacity: 0.1, w: 300, h: 300, top: -110, left: -90 },
      { renk: RenkTokenlari.violet, opacity: 0.08, w: 240, h: 240, top: 140, right: -70 },
      { renk: RenkTokenlari.mint, opacity: 0.05, w: 180, h: 180, bottom: 120, left: 40 },
    ];
  }
  return [
    { renk: RenkTokenlari.violet, opacity: 0.14, w: 320, h: 320, top: -120, left: -100 },
    { renk: RenkTokenlari.primary, opacity: 0.1, w: 260, h: 260, top: 80, right: -90 },
    { renk: '#3B82F6', opacity: 0.06, w: 200, h: 200, bottom: 80, left: -40 },
  ];
}

export function premiumCtaGradient(): readonly [string, string, string] {
  return [RenkTokenlari.accent, '#E87A3B', RenkTokenlari.violet] as const;
}
