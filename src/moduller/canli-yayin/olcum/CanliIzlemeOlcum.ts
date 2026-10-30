/**
 * Canlı izleme zaman çizelgesi: dokunma → ilk video karesi.
 * Bağımlılıksız — LiveKit yöneticisi ve ekran aynı kaydı işaretler.
 * Geliştirmede özet konsola yazılır; üretimde yalnız bellekte tutulur.
 */

export type CanliOlcumAsamasi =
  | 'dokunma'
  | 'ekran'
  | 'satir'
  | 'token'
  | 'baglantiBasla'
  | 'sinyal'
  | 'odaBagli'
  | 'videoAbone'
  | 'ilkKare';

type Kayit = {
  oda: string;
  t0: number;
  asamalar: Partial<Record<CanliOlcumAsamasi, number>>;
  bitti: boolean;
};

/** Ekran tek başına açıldıysa (bildirim, banner) eski dokunma kaydı kullanılmaz */
const KAYIT_OMRU_MS = 30_000;

let aktif: Kayit | null = null;
let sonOzet: { oda: string; metin: string; ilkKareMs: number } | null = null;
const dinleyiciler = new Set<() => void>();

const ETIKET: Record<CanliOlcumAsamasi, string> = {
  dokunma: 'dokunma',
  ekran: 'ekran',
  satir: 'yayın bilgisi',
  token: 'token',
  baglantiBasla: 'bağlantı başladı',
  sinyal: 'sinyal',
  odaBagli: 'WebRTC bağlı',
  videoAbone: 'video abone',
  ilkKare: 'ilk kare',
};

function ozetYaz(k: Kayit): string {
  const sira: CanliOlcumAsamasi[] = [
    'ekran',
    'satir',
    'token',
    'baglantiBasla',
    'sinyal',
    'odaBagli',
    'videoAbone',
    'ilkKare',
  ];
  return sira
    .filter((a) => k.asamalar[a] != null)
    .map((a) => `${ETIKET[a]} +${k.asamalar[a]}ms`)
    .join(' | ');
}

/** Karta dokunuşta (veya ekran kendi başına açıldığında) yeni ölçüm başlatır. */
export function CanliOlcumBaslat(oda: string, opts?: { zorla?: boolean }): void {
  if (
    !opts?.zorla &&
    aktif &&
    aktif.oda === oda &&
    !aktif.bitti &&
    Date.now() - aktif.t0 < KAYIT_OMRU_MS
  ) {
    return;
  }
  aktif = { oda, t0: Date.now(), asamalar: { dokunma: 0 }, bitti: false };
}

/** Aşamayı ilk kez işaretler. Başka odaya ait / süresi geçmiş kayıtta yok sayılır. */
export function CanliOlcumIsaretle(asama: CanliOlcumAsamasi, oda?: string | null): void {
  const k = aktif;
  if (!k || k.bitti) return;
  if (oda && k.oda !== oda) return;
  if (Date.now() - k.t0 > KAYIT_OMRU_MS) {
    aktif = null;
    return;
  }
  if (k.asamalar[asama] != null) return;
  k.asamalar[asama] = Date.now() - k.t0;
  if (asama !== 'ilkKare') return;
  k.bitti = true;
  const metin = ozetYaz(k);
  sonOzet = { oda: k.oda, metin, ilkKareMs: k.asamalar.ilkKare ?? 0 };
  if (__DEV__) {
    console.log(`[CanliHiz] ${k.oda} toplam ${k.asamalar.ilkKare}ms → ${metin}`);
  }
  dinleyiciler.forEach((fn) => fn());
}

export function CanliOlcumSonOzet(oda?: string | null) {
  if (!sonOzet) return null;
  if (oda && sonOzet.oda !== oda) return null;
  return sonOzet;
}

export function CanliOlcumDinle(fn: () => void): () => void {
  dinleyiciler.add(fn);
  return () => {
    dinleyiciler.delete(fn);
  };
}
