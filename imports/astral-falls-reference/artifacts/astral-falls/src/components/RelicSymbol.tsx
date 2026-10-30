import { useId } from 'react';
import type { SymbolId } from '../game/engine';

type Mineral = { light: string; face: string; shadow: string; edge: string };

const minerals: Record<SymbolId, Mineral> = {
  sun: { light: '#fff4b4', face: '#f6ad3f', shadow: '#a94d29', edge: '#ffe5a0' },
  moon: { light: '#e7fff8', face: '#7bdbed', shadow: '#286f9c', edge: '#b8fbff' },
  star: { light: '#f5e5ff', face: '#b594f3', shadow: '#624298', edge: '#e6caff' },
  comet: { light: '#ffe3c8', face: '#f48173', shadow: '#a83d64', edge: '#ffd2b0' },
  prism: { light: '#d5ffdc', face: '#61d4aa', shadow: '#237c79', edge: '#bbffe2' },
  crown: { light: '#ffe9e2', face: '#e5a2bc', shadow: '#93547e', edge: '#ffd0df' },
  scatter: { light: '#ffebfc', face: '#f17bd8', shadow: '#692c85', edge: '#ffb9ed' },
  multiplier: { light: '#f1ffba', face: '#b7dd68', shadow: '#476a68', edge: '#e4ff9d' },
};

export const symbolNames: Record<SymbolId, string> = {
  sun: 'Güneş mührü',
  moon: 'Ay mührü',
  star: 'Yıldız mührü',
  comet: 'Kuyruklu yıldız',
  prism: 'Kristal prizma',
  crown: 'Taç',
  scatter: 'Geçit',
  multiplier: 'Çarpan',
};

/**
 * Each stone has its own outline and cut pattern. Keep the large facets dominant:
 * the artwork is normally rendered inside a roughly 40px-wide mobile tile.
 */
export function RelicSymbol({ symbol }: { symbol: SymbolId }) {
  const rawId = useId();
  const id = `mineral-${rawId.replace(/:/g, '')}`;
  const gem = `url(#${id}-gem)`;
  const glint = `url(#${id}-glint)`;
  const { light, face, shadow, edge } = minerals[symbol];

  return (
    <svg className="symbol-art" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-gem`} x1="19" y1="12" x2="83" y2="92" gradientUnits="userSpaceOnUse">
          <stop stopColor={light} />
          <stop offset=".43" stopColor={face} />
          <stop offset="1" stopColor={shadow} />
        </linearGradient>
        <linearGradient id={`${id}-glint`} x1="28" y1="18" x2="69" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor={light} stopOpacity=".93" />
          <stop offset=".52" stopColor={face} stopOpacity=".42" />
          <stop offset="1" stopColor={shadow} stopOpacity=".08" />
        </linearGradient>
      </defs>

      {symbol === 'sun' && <>
        <path d="M50 3 59 21 73 11 73 31 92 29 80 44 97 50 80 57 91 72 73 69 73 89 59 79 50 97 41 79 27 89 27 69 9 72 20 57 3 50 20 44 8 29 27 31 27 11 41 21Z" fill={gem} stroke={edge} strokeWidth="2.3" strokeLinejoin="round" />
        <path d="M50 3v23M73 11 62 32M92 29 72 39M97 50H75M91 72 71 61M73 89 61 70M50 97V75M27 89 39 70M9 72 29 61M3 50h22M8 29l20 10M27 11l11 21" stroke={shadow} strokeWidth="1.6" opacity=".7" />
        <path d="M50 22 71 30 79 50 70 71 50 79 29 70 21 50 30 29Z" fill={shadow} stroke={edge} strokeWidth="2.2" />
        <path d="M50 22 71 30 50 49 30 29ZM71 30 79 50 50 49ZM79 50 70 71 50 49ZM70 71 50 79 50 49ZM50 79 29 70 50 49ZM29 70 21 50 50 49ZM21 50 30 29 50 49Z" fill={glint} />
        <path d="M50 30 65 35 70 50 63 65 50 70 35 64 30 50 36 35Z" fill={gem} stroke={light} strokeWidth="1.5" />
        <path d="m50 35 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z" fill={light} opacity=".9" />
      </>}

      {symbol === 'moon' && <>
        <path d="M71 10C57 15 44 30 44 48c0 19 13 33 32 36-11 8-27 10-40 5C17 82 10 62 16 42 22 22 43 9 62 9l9 1Z" fill={gem} stroke={edge} strokeWidth="2.7" strokeLinejoin="round" />
        <path d="M62 9 42 31 31 52 35 76 36 89M42 31l2 17-13 4M44 48 35 76l25 11M16 42l15 10-15 11M16 63l19 13M62 9l-20 22-26 11" stroke={light} strokeWidth="1.4" opacity=".8" />
        <path d="M62 9 42 31 16 42c7-21 27-34 46-33ZM31 52l13-4c0 19 13 33 32 36l-16 3-25-11Z" fill={glint} />
        <path d="M70 27 73 36 82 39 73 42 70 51 67 42 58 39 67 36Z" fill={light} />
        <path d="m78 59 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill={edge} />
      </>}

      {symbol === 'star' && <>
        <path d="m50 4 12 29 26-21-16 29 24 9-24 9 16 29-26-21-12 29-12-29-26 21 16-29-24-9 24-9-16-29 26 21Z" fill={gem} stroke={edge} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M50 4v31M88 12 65 40M96 50H68M88 88 65 62M50 96V67M12 88l23-26M4 50h28M12 12l23 28" stroke={light} strokeWidth="1.6" opacity=".73" />
        <path d="m50 26 13 13 19 11-19 11-13 13-13-13-19-11 19-11Z" fill={shadow} stroke={light} strokeWidth="1.6" />
        <path d="m50 26 13 13-13 11-13-11ZM63 39l19 11-32 0ZM82 50 63 61 50 50ZM63 61 50 74V50ZM50 74 37 61l13-11ZM37 61 18 50h32ZM18 50l19-11 13 11Z" fill={glint} />
        <path d="m50 39 5 11-5 11-5-11Z" fill={light} />
      </>}

      {symbol === 'comet' && <>
        <path d="M5 90c25-2 39-9 49-23L79 26 66 61C52 83 30 92 5 90Z" fill={gem} stroke={edge} strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M6 89c22-9 38-21 48-37L72 24M17 70c16-1 30-5 44-18M31 88c13-9 23-19 29-30" stroke={light} strokeWidth="1.9" opacity=".82" strokeLinecap="round" />
        <path d="M15 86c21-9 33-22 46-44l11-18-9 34C48 76 32 85 15 86Z" fill={glint} />
        <path d="M76 7 86 20 96 34 87 50 72 61 55 55 44 41 52 23Z" fill={gem} stroke={edge} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M76 7 72 30 86 20ZM76 7 52 23 72 30ZM52 23 44 41 72 30ZM44 41l11 14 17-25ZM55 55l17 6V30ZM72 30l15 20-15 11ZM72 30l24 4-9 16ZM86 20l10 14-24-4Z" fill={glint} stroke={edge} strokeWidth=".8" strokeLinejoin="round" />
        <path d="m72 24 6 7-6 9-7-9Z" fill={light} />
      </>}

      {symbol === 'prism' && <>
        <path d="M50 4 74 18 84 67 50 96 16 67 26 18Z" fill={gem} stroke={edge} strokeWidth="2.7" strokeLinejoin="round" />
        <path d="M50 4 50 96M26 18h48M16 67l34-49 34 49M16 67l34 29 34-29M26 18l24 23 24-23M50 41 16 67m34-26 34 26" stroke={edge} strokeWidth="1.65" opacity=".88" />
        <path d="M50 4 26 18l24 23ZM50 4l24 14-24 23ZM26 18 16 67l34-26ZM74 18l10 49-34-26ZM50 41 16 67l34 29ZM50 41l34 26-34 29Z" fill={glint} />
        <path d="M50 23 66 48 50 77 34 48Z" fill={gem} stroke={light} strokeWidth="1.8" />
        <path d="M50 23v54M34 48h32" stroke={light} strokeWidth="1.4" opacity=".8" />
      </>}

      {symbol === 'crown' && <>
        <path d="M8 26 31 44 50 12 69 44 92 26 83 78 77 88H23l-6-10Z" fill={gem} stroke={edge} strokeWidth="2.7" strokeLinejoin="round" />
        <path d="M8 26 31 44l-8 44M50 12 43 58 31 44M50 12l7 46 12-14M92 26 69 44l8 44M17 78h66M23 88h54" stroke={light} strokeWidth="1.7" opacity=".88" />
        <path d="M8 26 31 44 43 58 17 78ZM50 12l7 46H43ZM92 26 69 44 57 58l26 20Z" fill={glint} />
        <path d="M17 78 43 58h14l26 20-6 10H23Z" fill={shadow} stroke={edge} strokeWidth="1.7" />
        <path d="M25 79h50M26 86h48" stroke={light} strokeWidth="2" />
        <path d="m50 44 9 12-9 12-9-12Z" fill={gem} stroke={light} strokeWidth="1.7" />
        <path d="m50 46 6 10-6 10V46Z" fill={light} opacity=".8" />
        <circle cx="8" cy="26" r="3" fill={light} /><circle cx="50" cy="12" r="3" fill={light} /><circle cx="92" cy="26" r="3" fill={light} />
      </>}

      {symbol === 'scatter' && <>
        <path d="M50 3 74 12 94 33 97 54 83 79 50 97 17 79 3 54 6 33 26 12Z" fill={shadow} stroke={edge} strokeWidth="2.7" strokeLinejoin="round" />
        <path d="M50 9 73 18 88 36 90 55 78 74 50 89 22 74 10 55 12 36 27 18Z" fill={gem} stroke={light} strokeWidth="1.5" />
        <path d="M50 9v18M73 18 64 33M88 36 72 42M90 55 72 55M78 74 65 66M50 89V73M22 74l13-8M10 55h18M12 36l16 6M27 18l9 15" stroke={light} strokeWidth="2" opacity=".78" />
        <path d="M50 22 71 35 77 53 66 72 50 80 34 72 23 53 29 35Z" fill="#321c50" stroke={light} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="m50 27 15 12 5 14-9 14-11 8-11-8-9-14 5-14Z" fill={glint} opacity=".52" />
        <path d="M50 29 60 46 50 71 40 46Z" fill={gem} stroke={light} strokeWidth="1.6" />
        <path d="m50 33 4 13-4 17-4-17Z" fill={light} />
      </>}

      {symbol === 'multiplier' && <>
        <path d="M50 3 67 9 89 11 91 33 97 50 91 67 89 89 67 91 50 97 33 91 11 89 9 67 3 50 9 33 11 11 33 9Z" fill={shadow} stroke={edge} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M50 9 67 16 84 16 84 33 91 50 84 67 84 84 67 84 50 91 33 84 16 84 16 67 9 50 16 33 16 16 33 16Z" fill={gem} stroke={light} strokeWidth="1.4" />
        <path d="M50 9v17M84 16 72 29M91 50H75M84 84 72 71M50 91V74M16 84l12-13M9 50h16M16 16l12 13" stroke={light} strokeWidth="2.1" opacity=".77" />
        <path d="M50 23 69 31 77 50 69 69 50 77 31 69 23 50 31 31Z" fill="#233d4b" stroke={light} strokeWidth="2.5" />
        <path d="M50 23 69 31 50 49 31 31ZM69 31l8 19-27-1ZM77 50l-8 19-19-20ZM69 69l-19 8V49ZM50 77l-19-8 19-20ZM31 69l-8-19 27-1ZM23 50l8-19 19 18Z" fill={glint} opacity=".62" />
        <path d="M38 38 62 62M62 38 38 62" stroke={shadow} strokeWidth="11" strokeLinecap="round" />
        <path d="M38 38 62 62M62 38 38 62" stroke={light} strokeWidth="6" strokeLinecap="round" />
      </>}
    </svg>
  );
}