import { Appearance, Platform } from 'react-native';
import { RENK_PALET_HARITASI, temaAcikMi } from './RenkPaletleri';
import type { RenkPaleti, TemaKodu } from './TemaTipleri';

export type { RenkPaleti, TemaKodu };
export { temaKoduMu, TEMA_KODLARI } from './TemaTipleri';
export { temaAcikMi } from './RenkPaletleri';

type Dinleyici = () => void;

type TemaMut = {
  aktifKod: TemaKodu;
  paletOnbellek: RenkPaleti | null;
  koyuSahneKilit: number;
  cacheDoldurma: TemaKodu | null;
};

type TemaGlobal = typeof globalThis & {
  __tamusoTemaDurumu?: TemaMut;
};

const dinleyiciler = new Set<Dinleyici>();

/** Soguk acilis — AsyncStorage gelene kadar koyu */
try {
  Appearance.setColorScheme('dark');
} catch {
  /* eski native */
}

/** Kod → palet. Yeni temalar RENK_PALET_HARITASI'na eklenir. */
export function paletiKoddanAl(kod: TemaKodu): RenkPaleti {
  return RENK_PALET_HARITASI[kod] ?? RENK_PALET_HARITASI.koyu;
}

function mutAl(): TemaMut {
  const g = globalThis as TemaGlobal;
  return (g.__tamusoTemaDurumu ??= {
    aktifKod: 'koyu',
    paletOnbellek: null,
    koyuSahneKilit: 0,
    cacheDoldurma: null,
  });
}

export function temaKodunuAl(): TemaKodu {
  const d = mutAl();
  if (typeof d.koyuSahneKilit !== 'number') d.koyuSahneKilit = 0;
  if (d.cacheDoldurma) return d.cacheDoldurma;
  return d.koyuSahneKilit > 0 ? 'koyu' : d.aktifKod;
}

export function kullaniciTemaKodunuAl(): TemaKodu {
  return mutAl().aktifKod;
}

export function paletiAl(): RenkPaleti {
  const d = mutAl();
  if (d.paletOnbellek) return d.paletOnbellek;
  d.paletOnbellek = paletiKoddanAl(temaKodunuAl());
  return d.paletOnbellek;
}

export function temaAboneOl(fn: Dinleyici): () => void {
  dinleyiciler.add(fn);
  return () => {
    dinleyiciler.delete(fn);
  };
}

function sistemeUygula(kod: TemaKodu): void {
  const acikMi = temaAcikMi(kod);
  try {
    Appearance.setColorScheme(acikMi ? 'light' : 'dark');
  } catch {
    /* eski native */
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.style.backgroundColor = paletiKoddanAl(kod).bg;
    document.documentElement.style.colorScheme = acikMi ? 'light' : 'dark';
  }
}

/**
 * Paleti anlik degistir (Stil factory cache doldururken).
 * Dinleyici tetiklemez.
 */
export function temaKodunuAnlikKur(kod: TemaKodu): void {
  const d = mutAl();
  d.cacheDoldurma = kod;
  d.paletOnbellek = null;
}

export function temaKodunuAnlikBirak(): void {
  const d = mutAl();
  d.cacheDoldurma = null;
  d.paletOnbellek = null;
}

export function temayiKur(kod: TemaKodu): void {
  const d = mutAl();
  if (d.aktifKod === kod && d.paletOnbellek && (d.koyuSahneKilit ?? 0) === 0) {
    sistemeUygula(kod);
    return;
  }
  d.aktifKod = kod;
  d.paletOnbellek = null;
  sistemeUygula(kod);
  dinleyiciler.forEach((fn) => fn());
}

/** Canli oda / sahne — alt agac koyu palet okusun. */
export function koyuSahneKilidiGir(): void {
  const d = mutAl();
  d.koyuSahneKilit = (d.koyuSahneKilit ?? 0) + 1;
  d.paletOnbellek = null;
  dinleyiciler.forEach((fn) => fn());
}

export function koyuSahneKilidiCik(): void {
  const d = mutAl();
  d.koyuSahneKilit = Math.max(0, (d.koyuSahneKilit ?? 0) - 1);
  d.paletOnbellek = null;
  dinleyiciler.forEach((fn) => fn());
}
