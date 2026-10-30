import { cevrimdisiOku, cevrimdisiYaz } from './CevrimdisiDeposu';
import type { KvDepo } from './depo/KvDepo';
import {
  ISLEM_ONCELIGI,
  kuyrukAcilistaDuzelt,
  kuyrukIsle,
  kuyrukKaydiGecerliMi,
  kuyrugaBirlestir,
  type IslemTuru,
  type KuyrukKaydi,
  type KuyrukSonuc,
} from './saf/KuyrukMantigi';

const ALAN = 'kuyruk';

export type KuyrukSonucOlayi = {
  idempotencyKey: string;
  ok: boolean;
  hata?: string;
  ertele?: boolean;
};

type SonucDinleyici = (olay: KuyrukSonucOlayi) => void;
const dinleyiciler = new Set<SonucDinleyici>();

export function IslemKuyrukSonucDinle(fn: SonucDinleyici): () => void {
  dinleyiciler.add(fn);
  return () => {
    dinleyiciler.delete(fn);
  };
}

function sonucYayinla(olay: KuyrukSonucOlayi): void {
  for (const fn of dinleyiciler) {
    try {
      fn(olay);
    } catch {
      /* dinleyici ekranı düşürmesin */
    }
  }
}

async function oku(userId: string, depo?: KvDepo): Promise<KuyrukKaydi[]> {
  const ham = await cevrimdisiOku<unknown>(userId, ALAN, [], depo);
  if (!Array.isArray(ham)) return [];
  return kuyrukAcilistaDuzelt(ham.filter(kuyrukKaydiGecerliMi));
}

async function yaz(userId: string, liste: KuyrukKaydi[], depo?: KvDepo): Promise<void> {
  await cevrimdisiYaz(userId, ALAN, liste, depo);
}

export async function IslemKuyruguListele(
  userId: string,
  depo?: KvDepo,
): Promise<KuyrukKaydi[]> {
  const liste = await oku(userId, depo);
  await yaz(userId, liste, depo);
  return liste;
}

export async function IslemKuyrugaEkle(
  userId: string,
  girdi: {
    type: IslemTuru;
    idempotencyKey: string;
    payload: Record<string, unknown>;
    id?: string;
  },
  depo?: KvDepo,
): Promise<KuyrukKaydi> {
  const liste = await oku(userId, depo);
  const kayit: KuyrukKaydi = {
    id: girdi.id ?? girdi.idempotencyKey,
    type: girdi.type,
    payload: girdi.payload,
    priority: ISLEM_ONCELIGI[girdi.type],
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'PENDING',
    idempotencyKey: girdi.idempotencyKey,
    nextAttemptAt: null,
    lastError: null,
    conflict: null,
  };
  const sonraki = kuyrugaBirlestir(liste, kayit);
  await yaz(userId, sonraki, depo);
  return sonraki.find((k) => k.idempotencyKey === kayit.idempotencyKey) ?? kayit;
}

export async function IslemKuyruguCalistir(
  userId: string,
  calistir: (kayit: KuyrukKaydi) => Promise<KuyrukSonuc>,
  opts?: { simdiMs?: number; videoIzinli?: boolean; depo?: KvDepo },
): Promise<{ gonderilen: number; kalan: number }> {
  const liste = await oku(userId, opts?.depo);
  const sonuc = await kuyrukIsle(liste, opts?.simdiMs ?? Date.now(), calistir, {
    videoIzinli: opts?.videoIzinli,
    onSonuc: (kayit, s) => {
      sonucYayinla({
        idempotencyKey: kayit.idempotencyKey,
        ok: s.ok,
        hata: s.hata,
        ertele: s.ertele,
      });
    },
  });
  await yaz(userId, sonuc.liste, opts?.depo);
  const kalan = sonuc.liste.filter(
    (k) => k.status === 'PENDING' || k.status === 'FAILED',
  ).length;
  return { gonderilen: sonuc.gonderilen, kalan };
}

export async function IslemKuyruguIptal(
  userId: string,
  id: string,
  depo?: KvDepo,
): Promise<void> {
  const liste = await oku(userId, depo);
  await yaz(
    userId,
    liste.map((k) => (k.id === id ? { ...k, status: 'CANCELLED' as const } : k)),
    depo,
  );
}
