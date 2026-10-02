/**
 * ZEUS — canonical symbol contract + registry.
 * Server `type` string ↔ client asset birebir.
 */

import type { ImageSourcePropType } from 'react-native';
import type { ZeusSymbolType } from '../tipler/ZeusTipleri';
import { SymbolImages } from '../assets/VisualAssets';

export const ZEUS_SYMBOL_IDS = [
  'blueDiamond',
  'greenEmerald',
  'purpleGem',
  'redRuby',
  'goldCrown',
  'goldRing',
  'goldGoblet',
  'lyre',
  'pegasus',
  'zeusScatter',
  'multiplierOrb',
] as const satisfies readonly ZeusSymbolType[];

const ID_SET = new Set<string>(ZEUS_SYMBOL_IDS);

/** Server/client ID normalize — bilinmeyen → null */
export function normalizeZeusSymbolId(
  raw: string | null | undefined,
): ZeusSymbolType | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (ID_SET.has(trimmed)) return trimmed as ZeusSymbolType;
  // legacy uppercase / snake_case toleransı
  const camel = trimmed
    .replace(/[-_\s]+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
  if (ID_SET.has(camel)) return camel as ZeusSymbolType;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error('[UNKNOWN_ZEUS_SYMBOL]', raw);
  }
  return null;
}

export function zeusSymbolImage(
  type: ZeusSymbolType | string | null | undefined,
): ImageSourcePropType | null {
  const id = normalizeZeusSymbolId(type ?? null);
  if (!id) return null;
  return SymbolImages[id] ?? null;
}

export function isKnownZeusSymbol(
  type: string | null | undefined,
): type is ZeusSymbolType {
  return normalizeZeusSymbolId(type) != null;
}

/** Soft color aura behind each symbol (no tile/cell frame) */
export const ZEUS_SYMBOL_TINT: Record<ZeusSymbolType, string> = {
  blueDiamond: '#3DB8FF',
  greenEmerald: '#2EE88A',
  purpleGem: '#C07AFF',
  redRuby: '#FF4D6A',
  goldCrown: '#FFD24A',
  goldRing: '#FFC94A',
  goldGoblet: '#FFB83A',
  lyre: '#F0B030',
  pegasus: '#8EC4FF',
  zeusScatter: '#FFE66A',
  multiplierOrb: '#4AE8FF',
};

export const ZEUS_SPECIAL_SYMBOLS: ReadonlySet<ZeusSymbolType> = new Set([
  'zeusScatter',
  'multiplierOrb',
]);
