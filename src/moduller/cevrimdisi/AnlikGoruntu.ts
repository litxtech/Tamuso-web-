import { cevrimdisiOku, cevrimdisiYaz, cevrimdisiAlanSil } from './CevrimdisiDeposu';
import { hikayeOgeleriFiltrele, hikayeSuresiGecerliMi } from './saf/HikayeSuresi';
import type { TahliyeKaydi } from './saf/LruTahliye';
import { tahliyeEt } from './saf/LruTahliye';
import { jsonBayt, kotaHesapla } from './saf/KotaHesabi';

export type AnlikZarf<T> = {
  kayitlar: T;
  cachedAt: string;
  bytes: number;
};

const FEED_LIMIT = 80;
const PROFIL_LIMIT = 40;

function zarf<T>(kayitlar: T): AnlikZarf<T> {
  const json = JSON.stringify(kayitlar);
  return {
    kayitlar,
    cachedAt: new Date().toISOString(),
    bytes: json.length,
  };
}

export async function FeedAnlikYaz(userId: string | null | undefined, ogeler: unknown[]): Promise<void> {
  if (!userId || ogeler.length === 0) return;
  const kirpilmis = ogeler.slice(0, FEED_LIMIT).map((o) => {
    if (!o || typeof o !== 'object') return o;
    return {
      ...(o as Record<string, unknown>),
      cachedAt: new Date().toISOString(),
      lastViewedAt: new Date().toISOString(),
    };
  });
  await cevrimdisiYaz(userId, 'feed', zarf(kirpilmis));
}

export async function FeedAnlikOku(userId: string | null | undefined): Promise<unknown[] | null> {
  if (!userId) return null;
  const z = await cevrimdisiOku<AnlikZarf<unknown[]> | null>(userId, 'feed', null);
  if (!z || !Array.isArray(z.kayitlar) || z.kayitlar.length === 0) return null;
  return z.kayitlar;
}

export async function DurumAkisYaz(userId: string | null | undefined, ogeler: unknown[]): Promise<void> {
  if (!userId || ogeler.length === 0) return;
  await cevrimdisiYaz(userId, 'durumAkis', zarf(ogeler.slice(0, FEED_LIMIT)));
}

export async function DurumAkisOku(userId: string | null | undefined): Promise<unknown[] | null> {
  if (!userId) return null;
  const z = await cevrimdisiOku<AnlikZarf<unknown[]> | null>(userId, 'durumAkis', null);
  if (!z || !Array.isArray(z.kayitlar) || z.kayitlar.length === 0) return null;
  return z.kayitlar;
}

export async function FeedAnlikZamani(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const z = await cevrimdisiOku<AnlikZarf<unknown> | null>(userId, 'feed', null);
  return z?.cachedAt ?? null;
}

type HikayeAnlik = {
  tepsi: unknown[];
  gruplar: Record<string, { expires_at?: string | null; items?: { expires_at?: string | null }[] }>;
};

export async function HikayeTepsiYaz(userId: string | null | undefined, tepsi: unknown[]): Promise<void> {
  if (!userId) return;
  const onceki = await cevrimdisiOku<AnlikZarf<HikayeAnlik> | null>(userId, 'hikaye', null);
  const gruplar = onceki?.kayitlar?.gruplar ?? {};
  await cevrimdisiYaz(userId, 'hikaye', zarf({ tepsi: tepsi.slice(0, 50), gruplar }));
}

export async function HikayeGrupYaz(
  userId: string | null | undefined,
  sahipId: string,
  grup: { expires_at?: string | null; items?: { expires_at?: string | null; id?: string }[] },
): Promise<void> {
  if (!userId || !sahipId) return;
  const onceki = await cevrimdisiOku<AnlikZarf<HikayeAnlik> | null>(userId, 'hikaye', null);
  const tepsi = onceki?.kayitlar?.tepsi ?? [];
  const gruplar = { ...(onceki?.kayitlar?.gruplar ?? {}), [sahipId]: grup };
  await cevrimdisiYaz(userId, 'hikaye', zarf({ tepsi, gruplar }));
}

export async function HikayeTepsiOku(
  userId: string | null | undefined,
  simdiMs = Date.now(),
): Promise<unknown[]> {
  if (!userId) return [];
  const z = await cevrimdisiOku<AnlikZarf<HikayeAnlik> | null>(userId, 'hikaye', null);
  if (!z?.kayitlar) return [];
  const gruplar = z.kayitlar.gruplar ?? {};
  return (z.kayitlar.tepsi ?? []).filter((oge) => {
    if (!oge || typeof oge !== 'object') return false;
    const uid = (oge as { user_id?: string }).user_id;
    if (!uid) return false;
    const grup = gruplar[uid];
    if (!grup) return false;
    if (grup.expires_at && !hikayeSuresiGecerliMi(grup.expires_at, simdiMs)) return false;
    const canli = hikayeOgeleriFiltrele(grup.items ?? [], simdiMs);
    return canli.length > 0;
  });
}

export async function HikayeGrupOku<T extends { expires_at?: string | null; items: { expires_at?: string | null }[] }>(
  userId: string | null | undefined,
  sahipId: string,
  simdiMs = Date.now(),
): Promise<T | null> {
  if (!userId || !sahipId) return null;
  const z = await cevrimdisiOku<AnlikZarf<HikayeAnlik> | null>(userId, 'hikaye', null);
  const grup = z?.kayitlar?.gruplar?.[sahipId] as T | undefined;
  if (!grup) return null;
  if (grup.expires_at && !hikayeSuresiGecerliMi(grup.expires_at, simdiMs)) return null;
  const items = hikayeOgeleriFiltrele(grup.items ?? [], simdiMs);
  if (items.length === 0) return null;
  return { ...grup, items };
}

type ProfilAnlik = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  level?: number | null;
  is_verified?: boolean | null;
  country_code?: string | null;
  language?: string | null;
  is_guest?: boolean | null;
  lastViewedAt: string;
};

function profilTemizle(p: Record<string, unknown>): ProfilAnlik | null {
  const id = typeof p.id === 'string' ? p.id : '';
  if (!id) return null;
  return {
    id,
    username: (p.username as string | null) ?? null,
    display_name: (p.display_name as string | null) ?? null,
    bio: (p.bio as string | null) ?? null,
    avatar_url: (p.avatar_url as string | null) ?? null,
    cover_url: (p.cover_url as string | null) ?? null,
    level: typeof p.level === 'number' ? p.level : null,
    is_verified: typeof p.is_verified === 'boolean' ? p.is_verified : null,
    country_code: (p.country_code as string | null) ?? null,
    language: (p.language as string | null) ?? null,
    is_guest: typeof p.is_guest === 'boolean' ? p.is_guest : null,
    lastViewedAt: new Date().toISOString(),
  };
}

export async function ProfilAnlikYaz(
  izleyenId: string | null | undefined,
  profil: Record<string, unknown> | null,
): Promise<void> {
  if (!izleyenId || !profil) return;
  const temiz = profilTemizle(profil);
  if (!temiz) return;
  const z = await cevrimdisiOku<AnlikZarf<ProfilAnlik[]> | null>(izleyenId, 'profil', null);
  const liste = (z?.kayitlar ?? []).filter((p) => p.id !== temiz.id);
  liste.unshift(temiz);
  await cevrimdisiYaz(izleyenId, 'profil', zarf(liste.slice(0, PROFIL_LIMIT)));
}

export async function ProfilAnlikOku(
  izleyenId: string | null | undefined,
  profilId: string,
): Promise<ProfilAnlik | null> {
  if (!izleyenId || !profilId) return null;
  const z = await cevrimdisiOku<AnlikZarf<ProfilAnlik[]> | null>(izleyenId, 'profil', null);
  return z?.kayitlar?.find((p) => p.id === profilId) ?? null;
}

export async function KesfetAnlikYaz(userId: string | null | undefined, odalar: unknown[]): Promise<void> {
  if (!userId || odalar.length === 0) return;
  await cevrimdisiYaz(userId, 'kesfet', zarf(odalar.slice(0, 48)));
}

export async function KesfetAnlikOku(userId: string | null | undefined): Promise<unknown[] | null> {
  if (!userId) return null;
  const z = await cevrimdisiOku<AnlikZarf<unknown[]> | null>(userId, 'kesfet', null);
  if (!z || !Array.isArray(z.kayitlar)) return null;
  return z.kayitlar;
}

export async function BildirimAnlikYaz(userId: string | null | undefined, liste: unknown[]): Promise<void> {
  if (!userId) return;
  await cevrimdisiYaz(userId, 'bildirim', zarf(liste.slice(0, 60)));
}

export async function BildirimAnlikOku(userId: string | null | undefined): Promise<unknown[] | null> {
  if (!userId) return null;
  const z = await cevrimdisiOku<AnlikZarf<unknown[]> | null>(userId, 'bildirim', null);
  if (!z || !Array.isArray(z.kayitlar)) return null;
  return z.kayitlar;
}

type OdaAnlik = {
  id: string;
  title?: string | null;
  cover_url?: string | null;
  host?: unknown;
  lastViewedAt: string;
};

export async function OdaAnlikYaz(userId: string | null | undefined, oda: { id?: string } | null): Promise<void> {
  if (!userId || !oda?.id) return;
  const z = await cevrimdisiOku<AnlikZarf<OdaAnlik[]> | null>(userId, 'oda', null);
  const kayit: OdaAnlik = {
    id: oda.id,
    title: (oda as { title?: string | null }).title ?? null,
    cover_url: (oda as { cover_url?: string | null }).cover_url ?? null,
    host: (oda as { host?: unknown }).host ?? null,
    lastViewedAt: new Date().toISOString(),
  };
  const liste = (z?.kayitlar ?? []).filter((o) => o.id !== kayit.id);
  liste.unshift(kayit);
  await cevrimdisiYaz(userId, 'oda', zarf(liste.slice(0, 20)));
}

export async function OdaAnlikOku(userId: string | null | undefined, odaId: string): Promise<OdaAnlik | null> {
  if (!userId || !odaId) return null;
  const z = await cevrimdisiOku<AnlikZarf<OdaAnlik[]> | null>(userId, 'oda', null);
  return z?.kayitlar?.find((o) => o.id === odaId) ?? null;
}

export async function AnlikZaman(
  userId: string | null | undefined,
  alan: string,
): Promise<string | null> {
  if (!userId) return null;
  const z = await cevrimdisiOku<AnlikZarf<unknown> | null>(userId, alan, null);
  return z?.cachedAt ?? null;
}

function depoBayt(data: unknown): number {
  if (data == null) return 0;
  if (Array.isArray(data)) return data.length === 0 ? 0 : jsonBayt(data);
  if (typeof data === 'object') {
    const zarfBayt = (data as AnlikZarf<unknown>).bytes;
    if (typeof zarfBayt === 'number' && zarfBayt > 0) return zarfBayt;
  }
  return jsonBayt(data);
}

function medyaKayitBayt(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;
  const kayitlar = (data as AnlikZarf<MedyaIndexKaydi[]>).kayitlar;
  if (!Array.isArray(kayitlar)) return 0;
  return kayitlar.reduce((s, k) => s + Math.max(0, Number(k?.bytes) || 0), 0);
}

export async function AnlikBoyutlari(
  userId: string,
): Promise<Record<string, number>> {
  const alanlar = ['feed', 'durumAkis', 'hikaye', 'profil', 'kesfet', 'bildirim', 'oda', 'kuyruk', 'taslak', 'medya'] as const;
  const out: Record<string, number> = {};
  let medyaIndex = 0;
  for (const alan of alanlar) {
    const z = await cevrimdisiOku<unknown>(userId, alan, null);
    if (alan === 'medya') medyaIndex = medyaKayitBayt(z);
    else out[alan] = depoBayt(z);
  }
  const { MedyaDiskOlc } = await import('./MedyaDosya');
  const disk = await MedyaDiskOlc(userId);
  out.medya = Math.max(medyaIndex, disk.toplam);
  out.feed = (out.feed ?? 0) + (out.durumAkis ?? 0);
  return out;
}

export async function OnbellekParcaSil(
  userId: string,
  parca: 'feed' | 'hikaye' | 'kesfet' | 'image' | 'video',
): Promise<void> {
  if (parca === 'feed') await cevrimdisiAlanSil(userId, ['feed', 'durumAkis']);
  else if (parca === 'hikaye') await cevrimdisiAlanSil(userId, ['hikaye']);
  else if (parca === 'kesfet') await cevrimdisiAlanSil(userId, ['kesfet']);
  else {
    const yollar = await medyaIndexTemizle(userId, parca);
    const { MedyaTurDosyalariniSil, MedyaYollariSil } = await import('./MedyaDosya');
    await MedyaYollariSil(yollar);
    await MedyaTurDosyalariniSil(userId, parca);
  }
}

type MedyaIndexKaydi = TahliyeKaydi & { url?: string; yerel?: string | null };

async function medyaIndexTemizle(userId: string, tur: 'image' | 'video'): Promise<string[]> {
  const z = await cevrimdisiOku<AnlikZarf<MedyaIndexKaydi[]> | null>(userId, 'medya', null);
  const kalan: MedyaIndexKaydi[] = [];
  const silinen: string[] = [];
  for (const k of z?.kayitlar ?? []) {
    if (k.alan === 'draft' || k.alan === 'pin' || !k.id?.startsWith(`${tur}:`)) {
      kalan.push(k);
      continue;
    }
    if (k.yerel) silinen.push(k.yerel);
  }
  await cevrimdisiYaz(userId, 'medya', zarf(kalan));
  return silinen;
}

export async function MedyaIndexEkle(
  userId: string,
  kayit: MedyaIndexKaydi,
  bosBayt: number | null,
  manuelVar: boolean,
): Promise<void> {
  const z = await cevrimdisiOku<AnlikZarf<MedyaIndexKaydi[]> | null>(userId, 'medya', null);
  const liste = [kayit, ...(z?.kayitlar ?? []).filter((k) => k.id !== kayit.id)];
  const limit = kotaHesapla(bosBayt, manuelVar);
  const { kalan } = tahliyeEt(liste, limit);
  const kalanId = new Set(kalan.map((k) => k.id));
  const yazilacak = liste.filter((k) => kalanId.has(k.id) || k.alan === 'draft' || k.alan === 'pin');
  const silYollar = liste
    .filter((k) => !kalanId.has(k.id) && k.alan !== 'draft' && k.alan !== 'pin')
    .map((k) => k.yerel);
  await cevrimdisiYaz(userId, 'medya', zarf(yazilacak));
  if (silYollar.length > 0) {
    const { MedyaYollariSil } = await import('./MedyaDosya');
    await MedyaYollariSil(silYollar);
  }
}
