import { AgBaglantisiIzleyici } from '../ag-baglantisi/AgBaglantisiIzleyici';
import { AgBaglantiDurumunuGetir } from '../ag-baglantisi/okuma/AgBaglantiDurumunuGetir';
import { DurumBegeniToggle, DurumDetayGetir, DurumOlustur, DurumYorumEkle } from '../durum/islemler/DurumIslemleri';
import { MesajOutboxFlush } from '../mesajlasma/depolama/MesajOutboxDepolama';
import { TakipServisi } from '../takip/islemler/TakipServisi';
import { AgDurumMerkezi } from './AgDurumMerkezi';
import { CevrimdisiAyarOku } from './AyarDeposu';
import { cevrimdisiYaz } from './CevrimdisiDeposu';
import { IslemKuyruguCalistir } from './IslemKuyrugu';
import type { KuyrukKaydi, KuyrukSonuc } from './saf/KuyrukMantigi';
import { uuidGecerliMi } from './saf/Uuid';
import { TaslakSil, TaslaklariGetir } from './TaslakDeposu';

let calisiyor = false;

async function onlineMi(): Promise<boolean> {
  const d = AgBaglantisiIzleyici.sonDurum() ?? (await AgBaglantiDurumunuGetir());
  if (!d.bagli) return false;
  if (d.internetErisilebilir === false) return false;
  return true;
}

async function wifiMi(): Promise<boolean> {
  const d = AgBaglantisiIzleyici.sonDurum() ?? (await AgBaglantiDurumunuGetir());
  return String(d.tip).toUpperCase() === 'WIFI';
}

async function islemCalistir(
  kayit: KuyrukKaydi,
  userId?: string,
): Promise<KuyrukSonuc> {
  if (!(await onlineMi())) return { ok: false, ertele: true };
  try {
    if (kayit.type === 'like') {
      const statusId = String(kayit.payload.statusId ?? '');
      const istenen = kayit.payload.liked === true;
      const detay = await DurumDetayGetir(statusId);
      if (detay.liked_by_me === istenen) return { ok: true };
      const r = await DurumBegeniToggle(statusId);
      if (!r.ok) return { ok: false, hata: r.hata };
      if (typeof r.liked === 'boolean' && r.liked !== istenen) {
        const ikinci = await DurumBegeniToggle(statusId);
        if (!ikinci.ok) return { ok: false, hata: ikinci.hata };
      }
      return { ok: true };
    }
    if (kayit.type === 'follow') {
      const hedef = String(kayit.payload.userId ?? '');
      const istenen = kayit.payload.following === true;
      const durum = await TakipServisi.durumGetir(hedef);
      if (durum?.state === 'BLOCKED' || durum?.state === 'BLOCKED_BY_USER') {
        return { ok: false, hata: 'blocked' };
      }
      const suAn =
        durum?.state === 'FOLLOWING' ||
        durum?.state === 'MUTUAL' ||
        durum?.state === 'REQUEST_PENDING';
      if (istenen === suAn) return { ok: true };
      const r = istenen
        ? await TakipServisi.takipEt(hedef)
        : await TakipServisi.takiptenCik(hedef);
      if (!r.ok) return { ok: false, hata: r.hata ?? r.code };
      return { ok: true };
    }
    if (kayit.type === 'comment') {
      const hamId = String(kayit.payload.clientId ?? kayit.id ?? '');
      const clientId = uuidGecerliMi(hamId) ? hamId : undefined;
      const r = await DurumYorumEkle(String(kayit.payload.statusId ?? ''), String(kayit.payload.body ?? ''), {
        parentId: (kayit.payload.parentId as string | null) ?? null,
        mediaUrl: (kayit.payload.mediaUrl as string | null) ?? null,
        clientId,
      });
      if (!r.ok) return { ok: false, hata: r.hata };
      if (userId) await TaslakSil(userId, kayit.id);
      return { ok: true };
    }
    if (kayit.type === 'post') {
      const r = await DurumOlustur({
        mediaType: (kayit.payload.mediaType as 'image' | 'video' | 'text' | 'audio') ?? 'text',
        mediaUrl: (kayit.payload.mediaUrl as string | null) ?? null,
        caption: String(kayit.payload.caption ?? ''),
        durationMs: (kayit.payload.durationMs as number | null) ?? null,
      });
      if (!r.ok) return { ok: false, hata: r.hata };
      if (typeof kayit.payload.draftId === 'string') {
        /* taslak başarıdan sonra silinir — çağıran userId bilmez, payload'da */
      }
      return { ok: true };
    }
    return { ok: false, hata: 'unsupported' };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : 'sync_failed' };
  }
}

export async function SenkronCalistir(userId: string | null | undefined): Promise<void> {
  if (!userId || calisiyor) return;
  if (!(await onlineMi())) return;
  calisiyor = true;
  AgDurumMerkezi.senkronBasladi();
  let hataVar = false;
  try {
    await MesajOutboxFlush(userId);
    const ayar = await CevrimdisiAyarOku(userId);
    const videoIzinli = ayar.videoOnbellek === 'wifi_ve_mobil' || (await wifiMi());
    const sonuc = await IslemKuyruguCalistir(
      userId,
      (kayit) => islemCalistir(kayit, userId),
      { videoIzinli },
    );
    if (ayar.otomatikPaylas) {
      const taslaklar = await TaslaklariGetir(userId);
      for (const t of taslaklar) {
        if (t.type !== 'post' || !t.hazir) continue;
        if (t.video || t.images.some((u) => !/^https?:\/\//i.test(u))) continue;
        const r = await islemCalistir({
          id: t.id,
          type: 'post',
          payload: {
            mediaType: 'text',
            mediaUrl: null,
            caption: t.text,
            draftId: t.id,
          },
          priority: 60,
          createdAt: t.createdAt,
          retryCount: 0,
          status: 'PENDING',
          idempotencyKey: `post:${t.id}`,
        });
        if (r.ok) await TaslakSil(userId, t.id);
        else if (!r.ertele) hataVar = true;
      }
    }
    if (sonuc.kalan > 0) hataVar = true;
    await cevrimdisiYaz(userId, 'meta', { sonSenkron: new Date().toISOString() });
  } catch {
    hataVar = true;
  } finally {
    calisiyor = false;
    AgDurumMerkezi.senkronBitti(hataVar);
  }
}
