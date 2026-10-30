/**
 * Aktif canlı yayın oturumu — küçültülünce medya bağlantısını canlı tutar.
 * Normal çıkışta bitirilir; arka planda iken MedyaOdasiKes çağrılmaz.
 */
import type { CanliYayinMeta } from '../bilesenler/CanliYayinTiyatro';

export type AktifCanliYayinDurum = {
  sessionId: string;
  rol: 'host' | 'izleyici';
  hostId: string;
  meta: CanliYayinMeta;
  mock: boolean;
  /** true: yayın ekranı kapansa bile LiveKit açık kalsın */
  arkaPlanda: boolean;
};

type Dinleyici = (durum: AktifCanliYayinDurum | null) => void;

let durum: AktifCanliYayinDurum | null = null;
const dinleyiciler = new Set<Dinleyici>();
/** Küçültme anı — hemen ardından gelen odak/load pencereyi kapatmasın */
let kucultulduguAn = 0;

function yayinla() {
  dinleyiciler.forEach((fn) => fn(durum));
}

export function AktifCanliYayinDurumunuAl(): AktifCanliYayinDurum | null {
  return durum;
}

export function AktifCanliYayinArkaPlandaMi(): boolean {
  return !!durum?.arkaPlanda;
}

export function AktifCanliYayinCanliMi(): boolean {
  return !!durum;
}

/** Küçültmeden hemen sonra gelen sahte odak / yeniden bağlanma */
export function AktifCanliYayinKucultmeTazeMi(ms = 4000): boolean {
  return kucultulduguAn > 0 && Date.now() - kucultulduguAn < ms;
}

export function AktifCanliYayinDinle(fn: Dinleyici): () => void {
  dinleyiciler.add(fn);
  fn(durum);
  return () => {
    dinleyiciler.delete(fn);
  };
}

export function AktifCanliYayinBaslat(input: {
  sessionId: string;
  rol: 'host' | 'izleyici';
  hostId: string;
  meta: CanliYayinMeta;
  mock?: boolean;
}): void {
  const ayni =
    durum?.sessionId === input.sessionId && durum.arkaPlanda && durum.rol === input.rol;
  durum = {
    sessionId: input.sessionId,
    rol: input.rol,
    hostId: input.hostId,
    meta: input.meta,
    mock: input.mock ?? false,
    arkaPlanda: ayni ? true : false,
  };
  if (!ayni) kucultulduguAn = 0;
  yayinla();
}

export function AktifCanliYayinArkaPlanaAl(): void {
  if (!durum) return;
  kucultulduguAn = Date.now();
  durum = { ...durum, arkaPlanda: true };
  yayinla();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MedyaMiniSesiniTut } = require('../../livekit/MedyaBaglantisi') as {
      MedyaMiniSesiniTut: () => void;
    };
    MedyaMiniSesiniTut();
  } catch {
    /* ses modülü */
  }
}

/** Yayın ekranına dönünce. Küçültme sonrası sahte odak bunu çağırmamalı. */
export function AktifCanliYayinOneCikar(): void {
  if (!durum) return;
  kucultulduguAn = 0;
  durum = { ...durum, arkaPlanda: false };
  yayinla();
}

export function AktifCanliYayinGuncelle(patch: {
  meta?: CanliYayinMeta;
  mock?: boolean;
}): void {
  if (!durum) return;
  durum = {
    ...durum,
    ...(patch.meta ? { meta: patch.meta } : null),
    ...(patch.mock != null ? { mock: patch.mock } : null),
  };
  yayinla();
}

export function AktifCanliYayinBitir(): void {
  if (!durum && kucultulduguAn === 0) return;
  durum = null;
  kucultulduguAn = 0;
  yayinla();
}
