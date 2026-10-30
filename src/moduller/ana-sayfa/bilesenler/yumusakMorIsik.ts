/**
 * Ana ekran koyu teması — zemin ve kenar ışıkları.
 * Katmanlar ortaya inmez; açık tema bu veriyi kullanmaz.
 */
export const YUMUSAK_MOR_ZEMIN = '#090811';

export type MorIsikKatmani = {
  id: string;
  colors: readonly [string, string, ...string[]];
  locations: readonly [number, number, ...number[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
  yer: {
    top?: number | `${number}%`;
    left?: number | `${number}%`;
    right?: number | `${number}%`;
    bottom?: number | `${number}%`;
    width: `${number}%`;
    height: `${number}%`;
  };
};

export const YUMUSAK_MOR_KATMANLAR: readonly MorIsikKatmani[] = [
  {
    id: 'ust-sol',
    colors: [
      'rgba(124, 92, 214, 0.18)',
      'rgba(124, 92, 214, 0.05)',
      'rgba(124, 92, 214, 0)',
    ],
    locations: [0, 0.4, 1],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    yer: { top: 0, left: 0, width: '46%', height: '34%' },
  },
  {
    id: 'ust-sag',
    colors: [
      'rgba(98, 72, 186, 0.14)',
      'rgba(98, 72, 186, 0.04)',
      'rgba(98, 72, 186, 0)',
    ],
    locations: [0, 0.42, 1],
    start: { x: 1, y: 0 },
    end: { x: 0, y: 1 },
    yer: { top: 0, right: 0, width: '40%', height: '30%' },
  },
  {
    id: 'sol-kenar',
    colors: [
      'rgba(108, 82, 186, 0.09)',
      'rgba(108, 82, 186, 0.03)',
      'rgba(108, 82, 186, 0)',
    ],
    locations: [0, 0.35, 1],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
    yer: { top: '28%', left: 0, width: '18%', height: '46%' },
  },
  {
    id: 'sag-kenar',
    colors: [
      'rgba(108, 82, 186, 0.08)',
      'rgba(108, 82, 186, 0.02)',
      'rgba(108, 82, 186, 0)',
    ],
    locations: [0, 0.35, 1],
    start: { x: 1, y: 0.5 },
    end: { x: 0, y: 0.5 },
    yer: { top: '32%', right: 0, width: '16%', height: '40%' },
  },
  {
    id: 'alt-sol',
    colors: [
      'rgba(92, 70, 168, 0.08)',
      'rgba(92, 70, 168, 0.02)',
      'rgba(92, 70, 168, 0)',
    ],
    locations: [0, 0.4, 1],
    start: { x: 0, y: 1 },
    end: { x: 1, y: 0 },
    yer: { bottom: 0, left: 0, width: '38%', height: '16%' },
  },
  {
    id: 'alt-sag',
    colors: [
      'rgba(92, 70, 168, 0.07)',
      'rgba(92, 70, 168, 0.02)',
      'rgba(92, 70, 168, 0)',
    ],
    locations: [0, 0.4, 1],
    start: { x: 1, y: 1 },
    end: { x: 0, y: 0 },
    yer: { bottom: 0, right: 0, width: '34%', height: '14%' },
  },
];
