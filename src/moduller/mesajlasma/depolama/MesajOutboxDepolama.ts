/**
 * Offline mesaj outbox — AsyncStorage, hesap izolasyonu (userId).
 * client_id idempotency ile MesajGonder SSOT'ye flush eder.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AgBaglantisiIzleyici } from '../../ag-baglantisi/AgBaglantisiIzleyici';
import {
  KillSwitchAktifMi,
  OzellikBayragiAktifMi,
} from '../../ozellik-bayraklari/OzellikBayragiAktifMi';
import {
  MesajGonder,
  type MesajGonderGirdi,
} from '../islemler/MesajGonder';
import type { DirektMesaj } from '../okuma/MesajlariGetir';

const SURUM = 'v1';
const MAKS_DENEME = 6;
const ANAHTAR_ON_EK = `@muta/mesaj_outbox_${SURUM}`;

export type MesajOutboxDurum = 'QUEUED' | 'SENDING' | 'FAILED';

export type MesajOutboxKayit = {
  client_id: string;
  thread_id: string;
  payload: MesajGonderGirdi;
  retry_count: number;
  status: MesajOutboxDurum;
  created_at: string;
  updated_at: string;
  next_attempt_at?: string | null;
  last_error?: string | null;
};

type Dinleyici = (kayitlar: MesajOutboxKayit[]) => void;
type FlushSonucDinleyici = (sonuc: {
  clientId: string;
  ok: boolean;
  mesaj?: DirektMesaj;
  hata?: string;
}) => void;

const bellek = new Map<string, MesajOutboxKayit[]>();
const dinleyiciler = new Map<string, Set<Dinleyici>>();
const flushDinleyiciler = new Set<FlushSonucDinleyici>();
let agAbone: (() => void) | null = null;
let flushBusy = false;
let aktifUserId: string | null = null;

function anahtar(userId: string): string {
  return `${ANAHTAR_ON_EK}:${userId}`;
}

function outboxAktifMi(): boolean {
  if (KillSwitchAktifMi('kill_offline_outbox')) return false;
  return OzellikBayragiAktifMi('offline_outbox_enabled');
}

function backoffMs(retry: number): number {
  const base = Math.min(60_000, 1000 * Math.pow(2, Math.max(0, retry)));
  const jitter = Math.floor(Math.random() * 400);
  return base + jitter;
}

function bildir(userId: string): void {
  const list = bellek.get(userId) ?? [];
  const set = dinleyiciler.get(userId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(list);
    } catch {
      /* noop */
    }
  }
}

async function disktenOku(userId: string): Promise<MesajOutboxKayit[]> {
  try {
    const raw = await AsyncStorage.getItem(anahtar(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is MesajOutboxKayit =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as MesajOutboxKayit).client_id === 'string' &&
          typeof (x as MesajOutboxKayit).thread_id === 'string' &&
          typeof (x as MesajOutboxKayit).status === 'string',
      )
      .map((k) => (k.status === 'SENDING' ? { ...k, status: 'QUEUED' as const } : k));
  } catch {
    return [];
  }
}

async function diskeYaz(userId: string, list: MesajOutboxKayit[]): Promise<void> {
  try {
    if (list.length === 0) {
      await AsyncStorage.removeItem(anahtar(userId));
    } else {
      await AsyncStorage.setItem(anahtar(userId), JSON.stringify(list));
    }
  } catch {
    /* yerel outbox zorunlu değil */
  }
}

async function yukle(userId: string): Promise<MesajOutboxKayit[]> {
  const cached = bellek.get(userId);
  if (cached) return cached;
  const list = await disktenOku(userId);
  bellek.set(userId, list);
  return list;
}

async function kaydet(userId: string, list: MesajOutboxKayit[]): Promise<void> {
  bellek.set(userId, list);
  bildir(userId);
  await diskeYaz(userId, list);
}

export async function MesajOutboxYukle(
  userId: string,
): Promise<MesajOutboxKayit[]> {
  if (!userId) return [];
  return yukle(userId);
}

export async function MesajOutboxEkle(
  userId: string,
  kayit: Omit<
    MesajOutboxKayit,
    'retry_count' | 'status' | 'created_at' | 'updated_at' | 'next_attempt_at'
  > & { retry_count?: number; status?: MesajOutboxDurum },
): Promise<MesajOutboxKayit> {
  const list = [...(await yukle(userId))];
  const now = new Date().toISOString();
  const existing = list.findIndex((k) => k.client_id === kayit.client_id);
  const row: MesajOutboxKayit = {
    client_id: kayit.client_id,
    thread_id: kayit.thread_id,
    payload: { ...kayit.payload, clientId: kayit.client_id },
    retry_count: kayit.retry_count ?? 0,
    status: kayit.status ?? 'QUEUED',
    created_at: now,
    updated_at: now,
    next_attempt_at: now,
    last_error: null,
  };
  if (existing >= 0) list[existing] = { ...list[existing], ...row, created_at: list[existing].created_at };
  else list.push(row);
  await kaydet(userId, list);
  return row;
}

export async function MesajOutboxSil(
  userId: string,
  clientId: string,
): Promise<void> {
  const list = (await yukle(userId)).filter((k) => k.client_id !== clientId);
  await kaydet(userId, list);
}

export async function MesajOutboxGuncelle(
  userId: string,
  clientId: string,
  patch: Partial<MesajOutboxKayit>,
): Promise<void> {
  const list = [...(await yukle(userId))];
  const i = list.findIndex((k) => k.client_id === clientId);
  if (i < 0) return;
  list[i] = {
    ...list[i],
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await kaydet(userId, list);
}

export function MesajOutboxAboneOl(
  userId: string,
  dinleyici: Dinleyici,
): () => void {
  if (!userId) return () => undefined;
  let set = dinleyiciler.get(userId);
  if (!set) {
    set = new Set();
    dinleyiciler.set(userId, set);
  }
  set.add(dinleyici);
  void yukle(userId).then(() => bildir(userId));
  return () => {
    set!.delete(dinleyici);
    if (set!.size === 0) dinleyiciler.delete(userId);
  };
}

export function MesajOutboxFlushSonucAboneOl(
  dinleyici: FlushSonucDinleyici,
): () => void {
  flushDinleyiciler.add(dinleyici);
  return () => {
    flushDinleyiciler.delete(dinleyici);
  };
}

function flushSonucYayinla(sonuc: {
  clientId: string;
  ok: boolean;
  mesaj?: DirektMesaj;
  hata?: string;
}): void {
  for (const fn of flushDinleyiciler) {
    try {
      fn(sonuc);
    } catch {
      /* noop */
    }
  }
}

/** Ağ geri gelince / manuel — kuyruk flush */
export async function MesajOutboxFlush(userId: string): Promise<void> {
  if (!userId || !outboxAktifMi() || flushBusy) return;
  flushBusy = true;
  try {
    const list = await yukle(userId);
    const now = Date.now();
    const adaylar = list
      .filter(
        (k) =>
          k.retry_count < MAKS_DENEME &&
          (k.status === 'QUEUED' || k.status === 'FAILED') &&
          (!k.next_attempt_at || Date.parse(k.next_attempt_at) <= now),
      )
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    for (const kayit of adaylar) {
      if (aktifUserId && aktifUserId !== userId) break;
      await MesajOutboxGuncelle(userId, kayit.client_id, { status: 'SENDING' });
      let payload = kayit.payload;
      const meta = payload.mediaMeta;
      if (meta && meta.pending_upload === true && typeof meta.local_uri === 'string') {
        const tur = payload.messageType === 'video' ? 'video' : 'image';
        if (tur === 'video') {
          const tip = String(AgBaglantisiIzleyici.sonDurum()?.tip ?? '').toUpperCase();
          const { CevrimdisiAyarOku } = await import('../../cevrimdisi/AyarDeposu');
          const ayar = await CevrimdisiAyarOku(userId);
          if (ayar.videoOnbellek !== 'wifi_ve_mobil' && tip !== 'WIFI') {
            await MesajOutboxGuncelle(userId, kayit.client_id, {
              status: 'QUEUED',
              next_attempt_at: new Date(Date.now() + 30_000).toISOString(),
            });
            continue;
          }
        }
        const { DmMedyaUriYukle } = await import('../islemler/DmMedyasiYukle');
        const up = await DmMedyaUriYukle({
          uri: meta.local_uri,
          tur,
          mimeType: typeof meta.mime === 'string' ? meta.mime : null,
        });
        if (!up.ok) {
          const retry = kayit.retry_count + 1;
          await MesajOutboxGuncelle(userId, kayit.client_id, {
            status: retry >= MAKS_DENEME ? 'FAILED' : 'FAILED',
            retry_count: retry,
            next_attempt_at: new Date(Date.now() + backoffMs(retry)).toISOString(),
            last_error: up.hata,
          });
          flushSonucYayinla({ clientId: kayit.client_id, ok: false, hata: up.hata });
          continue;
        }
        payload = {
          ...payload,
          mediaUrl: up.url,
          messageType: up.messageType,
          mediaMeta: { ...meta, pending_upload: false },
        };
        await MesajOutboxGuncelle(userId, kayit.client_id, { payload });
      }
      const sonuc = await MesajGonder({
        ...payload,
        clientId: kayit.client_id,
        threadId: kayit.thread_id,
      });
      if (sonuc.ok) {
        await MesajOutboxSil(userId, kayit.client_id);
        flushSonucYayinla({
          clientId: kayit.client_id,
          ok: true,
          mesaj: sonuc.mesaj,
        });
      } else {
        const retry = kayit.retry_count + 1;
        const next = new Date(Date.now() + backoffMs(retry)).toISOString();
        await MesajOutboxGuncelle(userId, kayit.client_id, {
          status: 'FAILED',
          retry_count: retry,
          next_attempt_at: next,
          last_error: sonuc.hata,
        });
        flushSonucYayinla({
          clientId: kayit.client_id,
          ok: false,
          hata: sonuc.hata,
        });
      }
    }
  } finally {
    flushBusy = false;
  }
}

/** Login / sohbet açılışı — ag dinleyicisi + flush */
export function MesajOutboxOturumBagla(userId: string | null): void {
  aktifUserId = userId;
  if (!userId) {
    agAbone?.();
    agAbone = null;
    return;
  }
  void AgBaglantisiIzleyici.baslat();
  if (!agAbone) {
    agAbone = AgBaglantisiIzleyici.dinle((durum) => {
      const online =
        durum.bagli &&
        (durum.internetErisilebilir === null || durum.internetErisilebilir);
      if (online && aktifUserId) {
        void MesajOutboxFlush(aktifUserId);
      }
    }) as unknown as () => void;
  }
  void MesajOutboxFlush(userId);
}

/** Logout — bellek izolasyonu (disk userId anahtarlı kalır) */
export function MesajOutboxBellekTemizle(userId?: string): void {
  if (userId) {
    bellek.delete(userId);
    dinleyiciler.delete(userId);
    if (aktifUserId === userId) {
      aktifUserId = null;
      agAbone?.();
      agAbone = null;
    }
    return;
  }
  bellek.clear();
  dinleyiciler.clear();
  aktifUserId = null;
  agAbone?.();
  agAbone = null;
}
