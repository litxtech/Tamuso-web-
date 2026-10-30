/**
 * Meyve çarkı seçim ve ödeme kuralları.
 * Ödeme: eşleşen satırda floor(bahis × turun çarpanı), değilse 0.
 * Ağırlıklar 1/çarpan ile orantılıdır; böylece hiçbir meyve tek başına kârlı olmaz
 * ve yüksek çarpan daha seyrek gelir.
 */
export const MAX_MEYVE_SECIMI = 4;

export type MeyveCarpan = {
  id: string;
  multiplier: number;
  weight: number;
  tier: 'NORMAL' | 'GOOD' | 'BIG' | 'RARE';
};

export const MEYVE_CARPANLARI: readonly MeyveCarpan[] = [
  { id: 'cherry', multiplier: 5, weight: 120, tier: 'NORMAL' },
  { id: 'lemon', multiplier: 5, weight: 120, tier: 'NORMAL' },
  { id: 'orange', multiplier: 5, weight: 120, tier: 'NORMAL' },
  { id: 'watermelon', multiplier: 5, weight: 120, tier: 'NORMAL' },
  { id: 'grape', multiplier: 10, weight: 60, tier: 'GOOD' },
  { id: 'strawberry', multiplier: 15, weight: 40, tier: 'BIG' },
  { id: 'pineapple', multiplier: 25, weight: 24, tier: 'RARE' },
  { id: 'kiwi', multiplier: 40, weight: 15, tier: 'RARE' },
];

export function secimSayisi(tutarlar: Record<string, number>): number {
  return Object.values(tutarlar).filter((n) => n > 0).length;
}

/** Aynı meyve ikinci slot sayılmaz; tutarı artar. Beşinci farklı meyve eklenmez. */
export function meyveTutariEkle(
  tutarlar: Record<string, number>,
  meyveId: string,
  eklenecek: number,
  maxFarkli = MAX_MEYVE_SECIMI,
): { tutarlar: Record<string, number>; reddedildi: boolean } {
  if (eklenecek <= 0) return { tutarlar, reddedildi: true };
  const mevcut = tutarlar[meyveId] ?? 0;
  if (mevcut <= 0 && secimSayisi(tutarlar) >= maxFarkli) {
    return { tutarlar, reddedildi: true };
  }
  return {
    tutarlar: { ...tutarlar, [meyveId]: mevcut + eklenecek },
    reddedildi: false,
  };
}

/** Sunucu ödemesi. Eşleşmeyen satır 0; yeni bir kural yok. */
export function meyveKazanci(bahis: number, carpan: number, eslesti: boolean): number {
  if (!eslesti || bahis <= 0 || carpan <= 0) return 0;
  return Math.floor(bahis * carpan);
}

/** Bu turda tutturulabilecek en yüksek satır. Toplam bahis değildir. */
export function potansiyelKazanc(
  satirlar: readonly { bahis: number; carpan: number }[],
): number {
  return satirlar.reduce((en, s) => Math.max(en, meyveKazanci(s.bahis, s.carpan, true)), 0);
}

export function agirlikliMeyveSec(
  meyveler: readonly { id: string; weight: number }[],
  zar: number,
  haricId?: string | null,
): string {
  const havuz = meyveler.filter((m) => m.weight > 0 && m.id !== haricId);
  const kullan = havuz.length > 0 ? havuz : meyveler.filter((m) => m.weight > 0);
  const toplam = kullan.reduce((s, m) => s + m.weight, 0);
  if (toplam <= 0) throw new Error('weights must not be all zero');
  const roll = ((zar % toplam) + toplam) % toplam;
  let acc = 0;
  for (const m of kullan) {
    acc += m.weight;
    if (roll < acc) return m.id;
  }
  return kullan[kullan.length - 1]!.id;
}
