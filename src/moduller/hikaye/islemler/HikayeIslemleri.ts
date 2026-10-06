import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import {
  HIKAYE_CAPTION_MAX,
  HIKAYE_OZELLIK_BAYRAGI,
} from '../sabitler';
import type {
  HikayeArsivOgesi,
  HikayeDeeplinkSonuc,
  HikayeGoruntuleyen,
  HikayeGrup,
  HikayeIslemSonuc,
  HikayeOgesi,
  HikayeOlusturGirdi,
  HikayeSessizOge,
  HikayeTepsiOgesi,
  HikayeYakinArkadas,
} from '../tipler';

async function bayrakKontrol(): Promise<HikayeIslemSonuc<never> | null> {
  if (!(await OzellikBayragiAktifMiSunucu(HIKAYE_OZELLIK_BAYRAGI))) {
    return { ok: false, hata: i18n.t('hikaye.ozellikKapali') };
  }
  return null;
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function rpcHata(error: { message: string } | null): string {
  return error?.message ?? i18n.t('ortak.birHataOlustu');
}

function normalizeTepsi(row: unknown): HikayeTepsiOgesi | null {
  const r = asObj(row);
  if (!r) return null;
  const userId =
    typeof r.owner_id === 'string'
      ? r.owner_id
      : typeof r.user_id === 'string'
        ? r.user_id
        : null;
  if (!userId) return null;
  return {
    user_id: userId,
    story_id: typeof r.story_id === 'string' ? r.story_id : null,
    display_name:
      typeof r.display_name === 'string' && r.display_name.trim()
        ? r.display_name.trim()
        : i18n.t('ortak.kullanici'),
    username: typeof r.username === 'string' ? r.username : null,
    avatar_url: typeof r.avatar_url === 'string' ? r.avatar_url : null,
    preview_url:
      typeof r.preview_url === 'string'
        ? r.preview_url
        : typeof r.cover_url === 'string'
          ? r.cover_url
          : typeof r.thumbnail_url === 'string'
            ? r.thumbnail_url
            : null,
    is_mine: !!(r.is_own ?? r.is_mine),
    has_unseen: !!r.has_unseen,
    item_count: Number(r.item_count ?? 0) || 0,
    latest_at:
      typeof r.latest_item_at === 'string'
        ? r.latest_item_at
        : typeof r.latest_at === 'string'
          ? r.latest_at
          : null,
  };
}

function normalizeOge(row: unknown, ownerId?: string): HikayeOgesi | null {
  const r = asObj(row);
  if (!r) return null;
  const id = typeof r.id === 'string' ? r.id : null;
  if (!id) return null;
  const composition = asObj(r.composition);
  const bg =
    typeof r.background_color === 'string'
      ? r.background_color
      : typeof composition?.background_color === 'string'
        ? composition.background_color
        : null;
  return {
    id,
    story_id: typeof r.story_id === 'string' ? r.story_id : id,
    user_id:
      typeof r.owner_id === 'string'
        ? r.owner_id
        : typeof r.user_id === 'string'
          ? r.user_id
          : ownerId ?? '',
    media_type: (r.media_type as HikayeOgesi['media_type']) || 'image',
    media_url: typeof r.media_url === 'string' ? r.media_url : null,
    thumbnail_url:
      typeof r.thumbnail_url === 'string' ? r.thumbnail_url : null,
    duration_ms: Number(r.duration_ms ?? 0) || 0,
    caption: typeof r.caption === 'string' ? r.caption : null,
    background_color: bg,
    text_style: composition,
    overlays: Array.isArray(r.overlays)
      ? (r.overlays as HikayeOgesi['overlays'])
      : Array.isArray(composition?.overlays)
        ? (composition!.overlays as HikayeOgesi['overlays'])
        : null,
    attachment: asObj(r.attachment),
    visibility: (r.privacy as HikayeOgesi['visibility']) || 'followers',
    created_at:
      typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
    expires_at:
      typeof r.expires_at === 'string' ? r.expires_at : new Date().toISOString(),
    view_count: Number(r.view_count ?? 0) || 0,
    my_reaction: typeof r.my_reaction === 'string' ? r.my_reaction : null,
    is_seen: !!(r.viewed ?? r.is_seen),
  };
}

function normalizeGrup(payload: unknown): HikayeGrup | null {
  const root = asObj(payload);
  if (!root) return null;
  const owner = asObj(root.owner);
  const story = asObj(root.story);
  const ownerId =
    typeof owner?.id === 'string'
      ? owner.id
      : typeof story?.owner_id === 'string'
        ? story.owner_id
        : null;
  if (!ownerId) return null;
  const items = asArr(root.items)
    .map((x) => normalizeOge(x, ownerId))
    .filter((x): x is HikayeOgesi => !!x);
  return {
    user_id: ownerId,
    story_id: typeof story?.id === 'string' ? story.id : null,
    display_name:
      typeof owner?.display_name === 'string' && owner.display_name.trim()
        ? owner.display_name.trim()
        : i18n.t('ortak.kullanici'),
    username: typeof owner?.username === 'string' ? owner.username : null,
    avatar_url: typeof owner?.avatar_url === 'string' ? owner.avatar_url : null,
    is_mine: false, // çağıran set eder
    expires_at:
      typeof story?.expires_at === 'string' ? story.expires_at : null,
    view_count: Number(story?.view_count ?? 0) || 0,
    items,
  };
}

/** Ana sayfa hikaye tepsi — sunucu kendi satırını öne koyar; client index 0 garantiler */
export async function HikayeTepsiGetir(): Promise<
  HikayeIslemSonuc<HikayeTepsiOgesi[]>
> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { data, error } = await supabase.rpc('hikaye_tepsi_getir', {
    p_limit: 50,
  });
  if (error) return { ok: false, hata: rpcHata(error) };

  const root = asObj(data);
  const itemsRaw = root ? asArr(root.items) : asArr(data);
  const liste = itemsRaw
    .map(normalizeTepsi)
    .filter((x): x is HikayeTepsiOgesi => !!x);

  liste.sort((a, b) => {
    if (a.is_mine && !b.is_mine) return -1;
    if (!a.is_mine && b.is_mine) return 1;
    if (a.has_unseen !== b.has_unseen) return a.has_unseen ? -1 : 1;
    const ta = a.latest_at ? Date.parse(a.latest_at) : 0;
    const tb = b.latest_at ? Date.parse(b.latest_at) : 0;
    return tb - ta;
  });

  return { ok: true, data: liste };
}

export async function HikayeOlustur(
  girdi: HikayeOlusturGirdi,
): Promise<HikayeIslemSonuc<HikayeOgesi>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const caption =
    typeof girdi.caption === 'string'
      ? girdi.caption.trim().slice(0, HIKAYE_CAPTION_MAX)
      : null;

  if (girdi.mediaType !== 'text') {
    const url = (girdi.mediaUrl ?? '').trim();
    if (!/^https?:\/\//i.test(url)) {
      return { ok: false, hata: i18n.t('hikaye.medyaGecersiz') };
    }
  }

  const composition: Record<string, unknown> = {
    composition_version: 1,
    ...(girdi.textStyle ?? {}),
  };
  if (girdi.backgroundColor) {
    composition.background_color = girdi.backgroundColor;
  }
  if (girdi.overlays?.length) {
    composition.overlays = girdi.overlays;
  }

  const attachment =
    girdi.attachment ??
    (() => {
      const shared = girdi.overlays?.find((o) =>
        o.type.startsWith('shared_'),
      );
      if (shared) {
        return {
          type: shared.type,
          ref_id: shared.ref_id,
          text: shared.text,
          ...(shared.meta ?? {}),
        };
      }
      // Müzik paylaşım sayacı attachment.type=music bekler
      const musicOv = girdi.overlays?.find((o) => o.type === 'music');
      if (musicOv) {
        return {
          type: musicOv.type,
          ref_id: musicOv.ref_id,
          ...(musicOv.meta ?? {}),
        };
      }
      const linkOv = girdi.overlays?.find((o) => o.type === 'link');
      if (linkOv) {
        return {
          type: 'link',
          url: linkOv.url ?? null,
          label: linkOv.text ?? null,
          text: linkOv.text ?? null,
          ...(linkOv.meta ?? {}),
        };
      }
      return null;
    })();

  const privacy = girdi.visibility ?? null;

  const { data, error } = await supabase.rpc('hikaye_olustur', {
    p_media_type: girdi.mediaType,
    p_media_url: girdi.mediaUrl ?? null,
    p_thumbnail_url: girdi.thumbnailUrl ?? null,
    p_duration_ms: girdi.durationMs ?? null,
    p_composition: composition,
    p_attachment: attachment,
    p_caption: caption,
    p_privacy: privacy,
    p_excluded_user_ids: girdi.excludedUserIds ?? null,
    p_idempotency_key: girdi.idempotencyKey ?? null,
  });

  if (error) return { ok: false, hata: rpcHata(error) };
  const root = asObj(data);
  if (!root || root.ok === false) {
    return { ok: false, hata: i18n.t('hikaye.olusturulamadi') };
  }

  const itemId = typeof root.item_id === 'string' ? root.item_id : null;
  const storyId = typeof root.story_id === 'string' ? root.story_id : null;
  if (!itemId) return { ok: false, hata: i18n.t('hikaye.olusturulamadi') };

  return {
    ok: true,
    data: {
      id: itemId,
      story_id: storyId ?? itemId,
      user_id: '',
      media_type: girdi.mediaType,
      media_url: girdi.mediaUrl ?? null,
      thumbnail_url: girdi.thumbnailUrl ?? null,
      duration_ms: Number(girdi.durationMs ?? 0) || 0,
      caption,
      background_color: girdi.backgroundColor ?? null,
      text_style: composition,
      overlays: girdi.overlays ?? null,
      attachment: asObj(attachment),
      visibility: (privacy as HikayeOgesi['visibility']) || 'followers',
      created_at: new Date().toISOString(),
      expires_at:
        typeof root.expires_at === 'string'
          ? root.expires_at
          : new Date().toISOString(),
      view_count: 0,
      my_reaction: null,
      is_seen: false,
    },
  };
}

export async function HikayeGrupGetir(
  userId: string,
): Promise<HikayeIslemSonuc<HikayeGrup>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;
  if (!userId) return { ok: false, hata: i18n.t('hikaye.kullaniciYok') };

  const { data, error } = await supabase.rpc('hikaye_grup_getir', {
    p_owner_id: userId,
    p_include_archived: false,
  });
  if (error) return { ok: false, hata: rpcHata(error) };

  const root = asObj(data);
  if (root?.enabled === false) {
    return { ok: false, hata: i18n.t('hikaye.ozellikKapali') };
  }
  if (root?.story == null && asArr(root?.items).length === 0) {
    return { ok: false, hata: i18n.t('hikaye.bulunamadi') };
  }

  const grup = normalizeGrup(data);
  if (!grup || grup.items.length === 0) {
    return { ok: false, hata: i18n.t('hikaye.bulunamadi') };
  }

  const uid = (await supabase.auth.getUser()).data.user?.id;
  grup.is_mine = uid === grup.user_id;
  return { ok: true, data: grup };
}

export async function HikayeSilOge(
  itemId: string,
): Promise<HikayeIslemSonuc<void>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { error } = await supabase.rpc('hikaye_sil_oge', {
    p_item_id: itemId,
  });
  if (error) return { ok: false, hata: rpcHata(error) };
  return { ok: true, data: undefined };
}

export async function HikayeGoruntulemeKaydet(
  itemId: string,
): Promise<HikayeIslemSonuc<void>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { error } = await supabase.rpc('hikaye_goruntuleme_kaydet', {
    p_item_id: itemId,
  });
  if (error) return { ok: false, hata: rpcHata(error) };
  return { ok: true, data: undefined };
}

export async function HikayeGoruntuleyenler(
  itemId: string,
  opts?: { storyId?: string | null; cursor?: string | null; limit?: number },
): Promise<HikayeIslemSonuc<HikayeGoruntuleyen[]>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { data, error } = await supabase.rpc('hikaye_goruntuleyenler', {
    p_story_id: opts?.storyId ?? null,
    p_item_id: itemId,
    p_limit: opts?.limit ?? 50,
    p_cursor: opts?.cursor ?? null,
  });
  if (error) return { ok: false, hata: rpcHata(error) };

  const root = asObj(data);
  const rows = root ? asArr(root.items ?? root.viewers) : asArr(data);

  const liste = rows
    .map((row) => {
      const r = asObj(row);
      if (!r || typeof r.user_id !== 'string') {
        if (r && typeof r.viewer_id === 'string') {
          return {
            user_id: r.viewer_id,
            display_name:
              typeof r.display_name === 'string'
                ? r.display_name
                : i18n.t('ortak.kullanici'),
            username: typeof r.username === 'string' ? r.username : null,
            avatar_url: typeof r.avatar_url === 'string' ? r.avatar_url : null,
            viewed_at:
              typeof r.viewed_at === 'string'
                ? r.viewed_at
                : new Date().toISOString(),
            reaction: typeof r.reaction === 'string' ? r.reaction : null,
          } satisfies HikayeGoruntuleyen;
        }
        return null;
      }
      return {
        user_id: r.user_id,
        display_name:
          typeof r.display_name === 'string'
            ? r.display_name
            : i18n.t('ortak.kullanici'),
        username: typeof r.username === 'string' ? r.username : null,
        avatar_url: typeof r.avatar_url === 'string' ? r.avatar_url : null,
        viewed_at:
          typeof r.viewed_at === 'string'
            ? r.viewed_at
            : new Date().toISOString(),
        reaction: typeof r.reaction === 'string' ? r.reaction : null,
      } satisfies HikayeGoruntuleyen;
    })
    .filter((x): x is HikayeGoruntuleyen => !!x);

  return { ok: true, data: liste };
}

export async function HikayeTepki(
  itemId: string,
  emoji: string | null,
): Promise<HikayeIslemSonuc<void>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { error } = await supabase.rpc('hikaye_tepki', {
    p_item_id: itemId,
    p_emoji: emoji,
  });
  if (error) return { ok: false, hata: rpcHata(error) };
  return { ok: true, data: undefined };
}

export async function HikayeSessizeAl(
  userId: string,
): Promise<HikayeIslemSonuc<void>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { error } = await supabase.rpc('hikaye_sessize_al', {
    p_muted_user_id: userId,
  });
  if (error) return { ok: false, hata: rpcHata(error) };
  return { ok: true, data: undefined };
}

export async function HikayeSessiziAc(
  userId: string,
): Promise<HikayeIslemSonuc<void>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { error } = await supabase.rpc('hikaye_sessizi_ac', {
    p_muted_user_id: userId,
  });
  if (error) return { ok: false, hata: rpcHata(error) };
  return { ok: true, data: undefined };
}

export async function HikayeSessizlerListesi(): Promise<
  HikayeIslemSonuc<HikayeSessizOge[]>
> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { data, error } = await supabase.rpc('hikaye_sessizler_listesi');
  if (error) return { ok: false, hata: rpcHata(error) };

  const root = asObj(data);
  const rows = root ? asArr(root.items) : asArr(data);

  const liste = rows
    .map((row) => {
      const r = asObj(row);
      const uid =
        typeof r?.user_id === 'string'
          ? r.user_id
          : typeof r?.muted_user_id === 'string'
            ? r.muted_user_id
            : null;
      if (!uid) return null;
      return {
        user_id: uid,
        display_name:
          typeof r?.display_name === 'string'
            ? r.display_name
            : i18n.t('ortak.kullanici'),
        username: typeof r?.username === 'string' ? r.username : null,
        avatar_url: typeof r?.avatar_url === 'string' ? r.avatar_url : null,
        muted_at:
          typeof r?.muted_at === 'string'
            ? r.muted_at
            : new Date().toISOString(),
      } satisfies HikayeSessizOge;
    })
    .filter((x): x is HikayeSessizOge => !!x);

  return { ok: true, data: liste };
}

export async function HikayeDeeplinkCoz(input: {
  storyId?: string | null;
  itemId?: string | null;
  ownerId?: string | null;
}): Promise<HikayeIslemSonuc<HikayeDeeplinkSonuc>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { data, error } = await supabase.rpc('hikaye_deeplink_coz', {
    p_story_id: input.storyId ?? null,
    p_item_id: input.itemId ?? null,
    p_owner_id: input.ownerId ?? null,
  });
  if (error) return { ok: false, hata: rpcHata(error) };
  const r = asObj(data);
  if (!r || r.ok === false || typeof r.owner_id !== 'string') {
    return { ok: false, hata: i18n.t('hikaye.bulunamadi') };
  }
  return {
    ok: true,
    data: {
      user_id: r.owner_id,
      item_id: typeof r.item_id === 'string' ? r.item_id : null,
      story_id: typeof r.story_id === 'string' ? r.story_id : null,
      deep_link: typeof r.deep_link === 'string' ? r.deep_link : null,
    },
  };
}

/** Yakın arkadaş listesini getir */
export async function HikayeYakinArkadasListesi(): Promise<
  HikayeIslemSonuc<HikayeYakinArkadas[]>
> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { data, error } = await supabase.rpc('hikaye_yakin_arkadas_getir');
  if (error) return { ok: false, hata: rpcHata(error) };

  const root = asObj(data);
  const rows = root ? asArr(root.items) : asArr(data);

  const liste = rows
    .map((row) => {
      const r = asObj(row);
      if (!r || typeof r.user_id !== 'string') return null;
      return {
        user_id: r.user_id,
        display_name:
          typeof r.display_name === 'string'
            ? r.display_name
            : i18n.t('ortak.kullanici'),
        username: typeof r.username === 'string' ? r.username : null,
        avatar_url: typeof r.avatar_url === 'string' ? r.avatar_url : null,
      } satisfies HikayeYakinArkadas;
    })
    .filter((x): x is HikayeYakinArkadas => !!x);

  return { ok: true, data: liste };
}

/** Yakın arkadaş listesini toplu ayarla (sunucu replace) */
export async function HikayeYakinArkadasAyarla(
  friendIds: string[],
): Promise<HikayeIslemSonuc<{ count: number }>> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { data, error } = await supabase.rpc('hikaye_yakin_arkadas_ayarla', {
    p_friend_ids: friendIds,
  });
  if (error) return { ok: false, hata: rpcHata(error) };
  const root = asObj(data);
  return {
    ok: true,
    data: { count: Number(root?.count ?? friendIds.length) || 0 },
  };
}

/** @deprecated → HikayeYakinArkadasAyarla */
export async function HikayeYakinArkadasEkle(
  userId: string,
): Promise<HikayeIslemSonuc<void>> {
  const mevcut = await HikayeYakinArkadasListesi();
  if (!mevcut.ok) return mevcut;
  const ids = [
    ...new Set([...mevcut.data.map((x) => x.user_id), userId]),
  ];
  const r = await HikayeYakinArkadasAyarla(ids);
  if (!r.ok) return r;
  return { ok: true, data: undefined };
}

/** @deprecated → HikayeYakinArkadasAyarla */
export async function HikayeYakinArkadasCikar(
  userId: string,
): Promise<HikayeIslemSonuc<void>> {
  const mevcut = await HikayeYakinArkadasListesi();
  if (!mevcut.ok) return mevcut;
  const ids = mevcut.data.map((x) => x.user_id).filter((id) => id !== userId);
  const r = await HikayeYakinArkadasAyarla(ids);
  if (!r.ok) return r;
  return { ok: true, data: undefined };
}

export async function HikayeArsivListesi(opts?: {
  cursor?: string | null;
  limit?: number;
}): Promise<
  HikayeIslemSonuc<{ items: HikayeArsivOgesi[]; nextCursor: string | null }>
> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;

  const { data, error } = await supabase.rpc('hikaye_arsiv_listesi', {
    p_limit: opts?.limit ?? 30,
    p_cursor: opts?.cursor ?? null,
  });
  if (error) return { ok: false, hata: rpcHata(error) };

  const root = asObj(data);
  const itemsRaw = root ? asArr(root.items) : asArr(data);
  const nextCursor =
    typeof root?.next_cursor === 'string' ? root.next_cursor : null;

  const items = itemsRaw
    .map((row) => {
      const r = asObj(row);
      if (!r) return null;
      const storyId =
        typeof r.story_id === 'string'
          ? r.story_id
          : typeof r.id === 'string'
            ? r.id
            : null;
      if (!storyId) return null;
      const oge: HikayeArsivOgesi = {
        id: storyId,
        story_id: storyId,
        media_type: 'image',
        media_url:
          typeof r.cover_url === 'string'
            ? r.cover_url
            : typeof r.media_url === 'string'
              ? r.media_url
              : null,
        caption: typeof r.caption === 'string' ? r.caption : null,
        background_color: null,
        created_at:
          typeof r.created_at === 'string'
            ? r.created_at
            : new Date().toISOString(),
        expires_at: typeof r.expires_at === 'string' ? r.expires_at : null,
        view_count: Number(r.view_count ?? 0) || 0,
        item_count: Number(r.item_count ?? 0) || 0,
      };
      return oge;
    })
    .filter((x): x is HikayeArsivOgesi => !!x);

  return { ok: true, data: { items, nextCursor } };
}

/** Profil avatar hikaye halkası — hafif özet */
export async function HikayeKullaniciOzetGetir(
  ownerId: string,
): Promise<
  HikayeIslemSonuc<{
    has_active: boolean;
    has_unseen: boolean;
    item_count: number;
    story_id: string | null;
    preview_url: string | null;
  }>
> {
  const kapali = await bayrakKontrol();
  if (kapali) return kapali;
  if (!ownerId) return { ok: false, hata: i18n.t('hikaye.kullaniciYok') };

  const { data, error } = await supabase.rpc('hikaye_kullanici_ozet', {
    p_owner_id: ownerId,
  });
  if (error) return { ok: false, hata: rpcHata(error) };
  const r = asObj(data);
  return {
    ok: true,
    data: {
      has_active: !!r?.has_active,
      has_unseen: !!r?.has_unseen,
      item_count: Number(r?.item_count ?? 0) || 0,
      story_id: typeof r?.story_id === 'string' ? r.story_id : null,
      preview_url:
        typeof r?.preview_url === 'string' ? r.preview_url : null,
    },
  };
}
