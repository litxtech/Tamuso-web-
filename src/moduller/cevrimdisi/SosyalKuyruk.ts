import { AgBaglantiDurumunuGetir } from '../ag-baglantisi/okuma/AgBaglantiDurumunuGetir';
import { DurumBegeniToggle, DurumYorumEkle } from '../durum/islemler/DurumIslemleri';
import { catismaSinifla } from './saf/Catisma';
import { kuyrugaAlinmaliMi } from './saf/KuyrukKarari';
import { uuidGecerliMi } from './saf/Uuid';
import { IslemKuyrugaEkle } from './IslemKuyrugu';
import { TaslakKaydet } from './TaslakDeposu';

async function cevrimdisiMi(): Promise<boolean> {
  const d = await AgBaglantiDurumunuGetir();
  if (!d.bagli) return true;
  if (d.internetErisilebilir === false) return true;
  return false;
}

export async function DurumBegeniVeyaKuyruk(input: {
  userId: string | null | undefined;
  statusId: string;
  liked: boolean;
}): Promise<{ ok: boolean; liked?: boolean; like_count?: number; hata?: string; queued?: boolean }> {
  const offline = await cevrimdisiMi();
  if (offline && input.userId) {
    await IslemKuyrugaEkle(input.userId, {
      type: 'like',
      idempotencyKey: `like:${input.statusId}`,
      payload: { statusId: input.statusId, liked: input.liked },
    });
    return { ok: true, liked: input.liked, queued: true };
  }
  const r = await DurumBegeniToggle(input.statusId);
  if (r.ok) return r;
  // Beğeninin client_id'si yok. Yavaş ama bağlı istek kuyruğa yazılmaz; çift toggle olmasın.
  if (
    input.userId &&
    kuyrugaAlinmaliMi({
      offline: false,
      hata: r.hata,
      idempotent: false,
      catisma: catismaSinifla(r.hata) != null,
    })
  ) {
    await IslemKuyrugaEkle(input.userId, {
      type: 'like',
      idempotencyKey: `like:${input.statusId}`,
      payload: { statusId: input.statusId, liked: input.liked },
    });
    return { ok: true, liked: input.liked, queued: true };
  }
  return r;
}

export async function DurumYorumVeyaKuyruk(input: {
  userId: string | null | undefined;
  statusId: string;
  body: string;
  parentId?: string | null;
  mediaUrl?: string | null;
  localId: string;
}): Promise<{ ok: boolean; id?: string; hata?: string; queued?: boolean }> {
  const offline = await cevrimdisiMi();
  const clientId = uuidGecerliMi(input.localId) ? input.localId : undefined;
  const kuyruga = async () => {
    if (!input.userId) return { ok: false as const, hata: 'oturum' };
    await IslemKuyrugaEkle(input.userId, {
      type: 'comment',
      id: input.localId,
      idempotencyKey: `comment:${input.localId}`,
      payload: {
        statusId: input.statusId,
        body: input.body,
        parentId: input.parentId ?? null,
        mediaUrl: input.mediaUrl ?? null,
        clientId: clientId ?? null,
      },
    });
    await TaslakKaydet(input.userId, {
      id: input.localId,
      type: 'comment',
      text: input.body,
      images: [],
      video: null,
      hashtags: [],
      mentions: [],
      location: null,
      ekstra: { statusId: input.statusId },
    });
    return { ok: true as const, id: input.localId, queued: true as const };
  };
  if (offline) return kuyruga();
  const r = await DurumYorumEkle(input.statusId, input.body, {
    parentId: input.parentId,
    mediaUrl: input.mediaUrl,
    clientId,
  });
  if (r.ok) return r;
  if (
    kuyrugaAlinmaliMi({
      offline: false,
      hata: r.hata,
      idempotent: !!clientId && r.idempotent !== false,
      catisma: catismaSinifla(r.hata) != null,
    })
  ) {
    return kuyruga();
  }
  return r;
}

export async function TakipKuyrugaAl(input: {
  userId: string | null | undefined;
  hedefId: string;
  following: boolean;
}): Promise<void> {
  if (!input.userId) return;
  await IslemKuyrugaEkle(input.userId, {
    type: 'follow',
    idempotencyKey: `follow:${input.hedefId}`,
    payload: { userId: input.hedefId, following: input.following },
  });
}
