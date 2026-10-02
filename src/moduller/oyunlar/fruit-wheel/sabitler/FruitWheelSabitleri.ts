export const GAME_CODE = 'fruit_wheel' as const;
export const GAME_VERSION = 'fruit-wheel-v1';
export const GAME_DISPLAY_NAME = 'Fruit Wheel';

export const FRUIT_ORDER = [
  'cherry',
  'lemon',
  'orange',
  'watermelon',
  'grape',
  'strawberry',
  'pineapple',
  'kiwi',
] as const;

export type FruitId = (typeof FRUIT_ORDER)[number];

export const SEGMENT_COUNT = FRUIT_ORDER.length;
export const SEGMENT_DEG = 360 / SEGMENT_COUNT;

export const FRUIT_IMAGES: Record<FruitId, number> = {
  cherry: require('../../../../../assets/oyunlar/fruit-wheel/fw-cherry.png'),
  lemon: require('../../../../../assets/oyunlar/fruit-wheel/fw-lemon.png'),
  orange: require('../../../../../assets/oyunlar/fruit-wheel/fw-orange.png'),
  watermelon: require('../../../../../assets/oyunlar/fruit-wheel/fw-watermelon.png'),
  grape: require('../../../../../assets/oyunlar/fruit-wheel/fw-grape.png'),
  strawberry: require('../../../../../assets/oyunlar/fruit-wheel/fw-strawberry.png'),
  pineapple: require('../../../../../assets/oyunlar/fruit-wheel/fw-pineapple.png'),
  kiwi: require('../../../../../assets/oyunlar/fruit-wheel/fw-kiwi.png'),
};

export const FRUIT_COVER = require('../../../../../assets/oyunlar/fruit-wheel/fw-cover.jpg');

export const FRUIT_ACCENT: Record<FruitId, string> = {
  cherry: '#E25B78',
  lemon: '#F4D47A',
  orange: '#E08A45',
  watermelon: '#3EBE78',
  grape: '#A78BFA',
  strawberry: '#F472B6',
  pineapple: '#F4D47A',
  kiwi: '#A3E635',
};

/** Koyu taş dilim renkleri. Çarpan ve sonuç sunucudan gelir. */
export const FRUIT_SEGMENT: Record<FruitId, string> = {
  cherry: '#6B1D32',
  lemon: '#7A5414',
  orange: '#8A3E16',
  watermelon: '#145C3A',
  grape: '#3E2478',
  strawberry: '#7A2348',
  pineapple: '#6E5214',
  kiwi: '#3A5618',
};

export function fruitIndex(id: string): number {
  const i = FRUIT_ORDER.indexOf(id as FruitId);
  return i < 0 ? 0 : i;
}
