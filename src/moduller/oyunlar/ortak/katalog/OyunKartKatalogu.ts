/**
 * Oyun kart kataloğu — feed / lobi kartlarının görsel kimliği tek yerde.
 *
 * Yalnızca binary'de gerçekten oynanabilen oyunlar burada tutulur.
 * Diğer motorların (zeus, nox, kaskad, fair-spin, astral-falls, storm-king)
 * varlıkları ve rotaları iOS paketinden çıkarılmıştır; katalogda yer almazlar.
 */

import type { ImageSourcePropType } from 'react-native';
import { GAME_DISPLAY_NAME as FRUIT_WHEEL_NAME, FRUIT_COVER, FRUIT_IMAGES } from '../../fruit-wheel/sabitler/FruitWheelSabitleri';
import type { GameCode } from '../tipler/OyunTipleri';

export type OyunKartKimligi = {
  kod: GameCode;
  /** Ekran adı */
  baslik: string;
  /** Küçük üst etiket */
  eyebrow: string;
  /** Tek satır slogan */
  slogan: string;
  /** Kart arka planı */
  kapak: ImageSourcePropType;
  /** Karakter (sağ altta yüzer) */
  karakter: ImageSourcePropType;
  /** Kartta yüzen 4 sembol */
  semboller: readonly [
    ImageSourcePropType,
    ImageSourcePropType,
    ImageSourcePropType,
    ImageSourcePropType,
  ];
  /** Aura halkası renkleri */
  aura: readonly [string, string, string];
  /** CTA degrade */
  cta: readonly [string, string];
  /** Bağımsız oyun rotası */
  href: string;
};

export const OYUN_KART_KATALOGU: Record<'fruit_wheel', OyunKartKimligi> = {
  fruit_wheel: {
    kod: 'fruit_wheel',
    baslik: FRUIT_WHEEL_NAME,
    eyebrow: '8 MEYVE',
    slogan: '8 meyve · canlı çark',
    kapak: FRUIT_COVER,
    karakter: FRUIT_IMAGES.kiwi,
    semboller: [
      FRUIT_IMAGES.cherry,
      FRUIT_IMAGES.watermelon,
      FRUIT_IMAGES.pineapple,
      FRUIT_IMAGES.kiwi,
    ],
    aura: ['#C6A15A', '#7A45C4', '#1A1030'],
    cta: ['#E6CE92', '#5B3A8C'],
    href: '/oyun/fruit-wheel',
  },
};

/** Uygulamada ekranı açık olan oyunlar. */
const ERISILEBILIR_OYUNLAR = ['fruit_wheel'] as const;

export function oyunKartKimligi(kod: GameCode): OyunKartKimligi | null {
  if (kod === 'fruit_wheel') return OYUN_KART_KATALOGU.fruit_wheel;
  return null;
}

/** Feed sırası; yalnızca erişilebilir oyunlar, bilinmeyen kodlar atlanır */
export function feedOyunKartlari(kodlar: readonly GameCode[]): OyunKartKimligi[] {
  return ERISILEBILIR_OYUNLAR.filter((k) => kodlar.includes(k))
    .map(oyunKartKimligi)
    .filter((k): k is OyunKartKimligi => k != null);
}
