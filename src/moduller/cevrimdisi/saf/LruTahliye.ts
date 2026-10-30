export type TahliyeAlan =
  | 'draft'
  | 'pin'
  | 'recent'
  | 'story'
  | 'profile'
  | 'feed'
  | 'explore'
  | 'media';

export type TahliyeKaydi = {
  id: string;
  alan: TahliyeAlan;
  bytes: number;
  lastUsedAt: number;
};

/** Düşük sayı önce silinir. Taslak ve manuel kayıt silinmez. */
const ONCELIK: Record<TahliyeAlan, number | null> = {
  media: 0,
  explore: 1,
  feed: 2,
  profile: 3,
  story: 4,
  recent: 5,
  pin: null,
  draft: null,
};

export function tahliyeEt(
  kayitlar: readonly TahliyeKaydi[],
  limitBayt: number,
): { kalan: TahliyeKaydi[]; silinen: TahliyeKaydi[] } {
  const korunan: TahliyeKaydi[] = [];
  const aday: TahliyeKaydi[] = [];
  for (const k of kayitlar) {
    if (ONCELIK[k.alan] == null) korunan.push(k);
    else aday.push(k);
  }
  aday.sort((a, b) => {
    const pa = ONCELIK[a.alan] ?? 0;
    const pb = ONCELIK[b.alan] ?? 0;
    if (pa !== pb) return pa - pb;
    return a.lastUsedAt - b.lastUsedAt;
  });
  let toplam =
    korunan.reduce((s, k) => s + Math.max(0, k.bytes), 0) +
    aday.reduce((s, k) => s + Math.max(0, k.bytes), 0);
  const silinen: TahliyeKaydi[] = [];
  const kalanAday: TahliyeKaydi[] = [];
  for (const k of aday) {
    if (toplam > limitBayt) {
      silinen.push(k);
      toplam -= Math.max(0, k.bytes);
    } else {
      kalanAday.push(k);
    }
  }
  return { kalan: [...korunan, ...kalanAday], silinen };
}
