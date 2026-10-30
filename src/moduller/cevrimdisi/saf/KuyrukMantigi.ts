import { denemeTukendiMi, sonrakiBeklemeMs } from './GeriCekilme';
import { catismaSinifla, type CatismaKodu } from './Catisma';

export type IslemDurumu = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type IslemTuru = 'comment' | 'like' | 'follow' | 'post' | 'photo' | 'video';

/** Küçük sayı önce gider. Mesaj outbox bu kuyruğun dışında, daha önce çalışır. */
export const ISLEM_ONCELIGI: Record<IslemTuru, number> = {
  comment: 30,
  like: 40,
  follow: 50,
  post: 60,
  photo: 70,
  video: 80,
};

export type KuyrukKaydi = {
  id: string;
  type: IslemTuru;
  payload: Record<string, unknown>;
  priority: number;
  createdAt: string;
  retryCount: number;
  status: IslemDurumu;
  idempotencyKey: string;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  conflict?: CatismaKodu | null;
};

export type KuyrukSonuc = {
  ok: boolean;
  hata?: string;
  conflict?: CatismaKodu | null;
  /** Ağ gitti — deneme sayılmaz, kayıt PENDING kalır. */
  ertele?: boolean;
};

const BIRLESEN = new Set<IslemTuru>(['like', 'follow']);

export function kuyrukKaydiGecerliMi(x: unknown): x is KuyrukKaydi {
  if (!x || typeof x !== 'object') return false;
  const k = x as KuyrukKaydi;
  return (
    typeof k.id === 'string' &&
    typeof k.type === 'string' &&
    typeof k.idempotencyKey === 'string' &&
    typeof k.status === 'string' &&
    typeof k.createdAt === 'string'
  );
}

/** Çökme: PROCESSING kayıt tekrar PENDING olur, ikinci kopya açılmaz. */
export function kuyrukAcilistaDuzelt(liste: readonly KuyrukKaydi[]): KuyrukKaydi[] {
  return liste.map((k) =>
    k.status === 'PROCESSING' ? { ...k, status: 'PENDING' } : k,
  );
}

/**
 * Like/follow aynı hedefte tek kayıtta birleşir; son istenen durum kalır.
 * Diğer işlemler aynı idempotency anahtarıyla ikinci kez eklenmez.
 */
export function kuyrugaBirlestir(
  liste: readonly KuyrukKaydi[],
  gelen: KuyrukKaydi,
): KuyrukKaydi[] {
  const acik = (k: KuyrukKaydi) =>
    k.status === 'PENDING' || k.status === 'FAILED' || k.status === 'PROCESSING';
  if (BIRLESEN.has(gelen.type)) {
    const i = liste.findIndex(
      (k) => k.idempotencyKey === gelen.idempotencyKey && acik(k),
    );
    if (i >= 0) {
      const onceki = liste[i]!;
      const sonraki = [...liste];
      sonraki[i] = {
        ...onceki,
        payload: gelen.payload,
        status: 'PENDING',
        retryCount: 0,
        nextAttemptAt: null,
        lastError: null,
        conflict: null,
        createdAt: onceki.createdAt,
      };
      return sonraki;
    }
  }
  if (liste.some((k) => k.idempotencyKey === gelen.idempotencyKey && k.status !== 'CANCELLED')) {
    return [...liste];
  }
  return [...liste, gelen];
}

export function kuyrukSirala(liste: readonly KuyrukKaydi[], simdiMs: number): KuyrukKaydi[] {
  return liste
    .filter((k) => {
      if (k.status !== 'PENDING' && k.status !== 'FAILED') return false;
      if (denemeTukendiMi(k.retryCount) && k.status === 'FAILED') return false;
      if (k.nextAttemptAt && Date.parse(k.nextAttemptAt) > simdiMs) return false;
      return true;
    })
    .sort((a, b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt));
}

export function kuyrukBasarisiz(
  kayit: KuyrukKaydi,
  hata: string | undefined,
  simdiMs: number,
): KuyrukKaydi {
  const conflict = catismaSinifla(hata);
  const retryCount = kayit.retryCount + 1;
  if (conflict || denemeTukendiMi(retryCount)) {
    return {
      ...kayit,
      status: 'FAILED',
      retryCount,
      lastError: hata ?? null,
      conflict,
      nextAttemptAt: null,
    };
  }
  return {
    ...kayit,
    status: 'FAILED',
    retryCount,
    lastError: hata ?? null,
    conflict: null,
    nextAttemptAt: new Date(simdiMs + sonrakiBeklemeMs(retryCount - 1)).toISOString(),
  };
}

export async function kuyrukIsle(
  liste: readonly KuyrukKaydi[],
  simdiMs: number,
  calistir: (kayit: KuyrukKaydi) => Promise<KuyrukSonuc>,
  opts?: {
    videoIzinli?: boolean;
    onSonuc?: (kayit: KuyrukKaydi, sonuc: KuyrukSonuc) => void;
  },
): Promise<{ liste: KuyrukKaydi[]; gonderilen: number }> {
  let guncel = kuyrukAcilistaDuzelt(liste);
  const sira = kuyrukSirala(guncel, simdiMs);
  let gonderilen = 0;
  for (const aday of sira) {
    if (aday.type === 'video' && opts?.videoIzinli === false) continue;
    guncel = guncel.map((k) =>
      k.id === aday.id ? { ...k, status: 'PROCESSING' } : k,
    );
    let sonuc: KuyrukSonuc;
    try {
      sonuc = await calistir(aday);
    } catch (e) {
      sonuc = { ok: false, hata: e instanceof Error ? e.message : 'sync_failed' };
    }
    opts?.onSonuc?.(aday, sonuc);
    if (sonuc.ok) {
      guncel = guncel.filter((k) => k.id !== aday.id);
      gonderilen += 1;
    } else if (sonuc.ertele) {
      guncel = guncel.map((k) =>
        k.id === aday.id ? { ...aday, status: 'PENDING' } : k,
      );
      break;
    } else {
      guncel = guncel.map((k) =>
        k.id === aday.id ? kuyrukBasarisiz({ ...aday, status: 'PROCESSING' }, sonuc.hata, simdiMs) : k,
      );
    }
  }
  return { liste: guncel, gonderilen };
}
