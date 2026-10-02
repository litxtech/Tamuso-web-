/**
 * Oyun kart kataloğu — feed / lobi kartlarının görsel kimliği tek yerde.
 * Yeni oyun eklenince buraya bir kayıt düşer; UI otomatik kartlaşır.
 */

import type { ImageSourcePropType } from 'react-native';
import { GAME_DISPLAY_NAME as KASKAD_NAME } from '../../kaskad/sabitler/KaskadSabitleri';
import {
  BackgroundImages as KaskadBg,
  CharacterImages as KaskadCharacter,
  SymbolImages as KaskadSymbols,
} from '../../kaskad/assets/VisualAssets';
import { GAME_DISPLAY_NAME as ZEUS_NAME } from '../../zeus/config/ZeusSabitleri';
import {
  CharacterImages as ZeusCharacter,
  SymbolImages as ZeusSymbols,
  UiImages as ZeusUi,
} from '../../zeus/assets/VisualAssets';
import { GAME_DISPLAY_NAME as NOX_NAME } from '../../slot/sabitler/SlotAyarlari';
import {
  BackgroundImages as NoxBg,
  SymbolImages as NoxSymbols,
  UiImages as NoxUi,
} from '../../slot/assets/VisualAssets';
import { GAME_DISPLAY_NAME as FAIR_SPIN_NAME } from '../../fair-spin/sabitler/FairSpinSabitleri';
import { GAME_DISPLAY_NAME as FRUIT_WHEEL_NAME, FRUIT_COVER, FRUIT_IMAGES } from '../../fruit-wheel/sabitler/FruitWheelSabitleri';
import { GAME_DISPLAY_NAME as ASTRAL_FALLS_NAME } from '../../astral-falls/sabitler/AstralFallsSabitleri';
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

const FAIR_SPIN_COVER = require('../../../../../assets/oyunlar/fair-spin/ui/cover.png');
/** Referans kapak henüz PNG değil — marka kartı için geçici astral tonlu kapak */
const ASTRAL_COVER = FAIR_SPIN_COVER;

export const OYUN_KART_KATALOGU: Record<
  'zeus' | 'kozmik_kaskad' | 'nox_reels' | 'fair_spin' | 'astral_falls' | 'fruit_wheel',
  OyunKartKimligi
> = {
  zeus: {
    kod: 'zeus',
    baslik: ZEUS_NAME,
    eyebrow: 'OLYMPUS',
    slogan: 'Çarpan küreleri · 15 ücretsiz tur',
    kapak: ZeusUi.cover,
    karakter: ZeusCharacter.zeusIdle,
    semboller: [
      ZeusSymbols.goldCrown,
      ZeusSymbols.redRuby,
      ZeusSymbols.multiplierOrb,
      ZeusSymbols.pegasus,
    ],
    aura: ['#FFE08A', '#E8C547', '#4DA8FF'],
    cta: ['#FFD86B', '#C9861A'],
    href: '/oyun/zeus',
  },
  kozmik_kaskad: {
    kod: 'kozmik_kaskad',
    baslik: KASKAD_NAME,
    eyebrow: 'FIRTINA DİYARI',
    slogan: 'Portal scatter · kaskad zincirleri',
    kapak: KaskadBg.stormSky,
    karakter: KaskadCharacter.stormKeeper,
    semboller: [
      KaskadSymbols.energyCrown,
      KaskadSymbols.purpleCrystal,
      KaskadSymbols.stormMultiplier,
      KaskadSymbols.portalScatter,
    ],
    aura: ['#A78BFA', '#6FE3FF', '#F0B429'],
    cta: ['#8B5CF6', '#4C1D95'],
    href: '/oyun/kaskad',
  },
  nox_reels: {
    kod: 'nox_reels',
    baslik: NOX_NAME,
    eyebrow: 'NIGHT SLOT',
    slogan: '5×3 payline · wild · scatter bonus',
    kapak: NoxUi.cover,
    karakter: NoxSymbols.SCATTER,
    semboller: [
      NoxSymbols.DIAMOND,
      NoxSymbols.ROYAL_CROWN,
      NoxSymbols.WILD,
      NoxSymbols.SCATTER,
    ],
    aura: ['#B794F6', '#FFE08A', '#6FE3FF'],
    cta: ['#7C3AED', '#1E1B4B'],
    href: '/oyun/nox',
  },
  fair_spin: {
    kod: 'fair_spin',
    baslik: FAIR_SPIN_NAME,
    eyebrow: 'FAIR WHEEL',
    slogan: '8 dilim · sunucu RNG · coin bahis',
    kapak: FAIR_SPIN_COVER,
    karakter: FAIR_SPIN_COVER,
    semboller: [
      FAIR_SPIN_COVER,
      FAIR_SPIN_COVER,
      FAIR_SPIN_COVER,
      FAIR_SPIN_COVER,
    ],
    aura: ['#E6CE92', '#22D3EE', '#8A733F'],
    cta: ['#E6CE92', '#8A733F'],
    href: '/oyun/fair-spin',
  },
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
  astral_falls: {
    kod: 'astral_falls',
    baslik: ASTRAL_FALLS_NAME,
    eyebrow: 'ASTRAL',
    slogan: '6×5 kozmik kristal · zincir düşüş · 15 ücretsiz tur',
    kapak: ASTRAL_COVER,
    karakter: ASTRAL_COVER,
    semboller: [ASTRAL_COVER, ASTRAL_COVER, ASTRAL_COVER, ASTRAL_COVER],
    aura: ['#E8C691', '#7BDBED', '#B594F3'],
    cta: ['#E8C691', '#1C5B6B'],
    href: '/oyun/astral-falls',
  },
};

export function oyunKartKimligi(kod: GameCode): OyunKartKimligi | null {
  if (kod === 'zeus') return OYUN_KART_KATALOGU.zeus;
  if (kod === 'kozmik_kaskad') return OYUN_KART_KATALOGU.kozmik_kaskad;
  if (kod === 'nox_reels') return OYUN_KART_KATALOGU.nox_reels;
  if (kod === 'fair_spin') return OYUN_KART_KATALOGU.fair_spin;
  if (kod === 'astral_falls') return OYUN_KART_KATALOGU.astral_falls;
  if (kod === 'fruit_wheel') return OYUN_KART_KATALOGU.fruit_wheel;
  return null;
}

/** Feed sırası — Zeus, Astral, NOX, Fair Spin, Kaskad; bilinmeyen kodlar atlanır */
export function feedOyunKartlari(kodlar: readonly GameCode[]): OyunKartKimligi[] {
  const sira: Array<
    'zeus' | 'fruit_wheel' | 'astral_falls' | 'nox_reels' | 'fair_spin' | 'kozmik_kaskad'
  > = ['zeus', 'fruit_wheel', 'astral_falls', 'nox_reels', 'fair_spin', 'kozmik_kaskad'];
  return sira
    .filter((k) => kodlar.includes(k))
    .map((k) => OYUN_KART_KATALOGU[k]);
}
