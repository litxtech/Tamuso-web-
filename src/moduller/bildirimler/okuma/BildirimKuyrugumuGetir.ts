import { supabase } from '../../../lib/supabase';

export type UygulamaBildirimi = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  deep_link: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_username?: string | null;
  actor_avatar_url?: string | null;
};

function satirMap(r: Record<string, unknown>): UygulamaBildirimi {
  return {
    id: String(r.id),
    category: String(r.category ?? 'system'),
    title: String(r.title ?? ''),
    body: r.body != null ? String(r.body) : null,
    deep_link: r.deep_link != null ? String(r.deep_link) : null,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    read_at: r.read_at != null ? String(r.read_at) : null,
    created_at: String(r.created_at),
    actor_id: r.actor_id != null ? String(r.actor_id) : null,
    actor_name: r.actor_name != null ? String(r.actor_name) : null,
    actor_username: r.actor_username != null ? String(r.actor_username) : null,
    actor_avatar_url:
      r.actor_avatar_url != null ? String(r.actor_avatar_url) : null,
  };
}

export async function BildirimlerimiListele(
  limit = 50,
): Promise<UygulamaBildirimi[]> {
  try {
    const { data, error } = await supabase.rpc('bildirimlerimi_listele', {
      p_limit: limit,
    });
    if (error) throw error;
    const liste = ((data ?? []) as Record<string, unknown>[]).map(satirMap);
    const { CevrimdisiAktifKullanici } = await import('../../cevrimdisi/AktifKullanici');
    const { BildirimAnlikYaz } = await import('../../cevrimdisi/AnlikGoruntu');
    void BildirimAnlikYaz(CevrimdisiAktifKullanici(), liste);
    return liste;
  } catch (e) {
    const { CevrimdisiAktifKullanici } = await import('../../cevrimdisi/AktifKullanici');
    const { BildirimAnlikOku } = await import('../../cevrimdisi/AnlikGoruntu');
    const disk = await BildirimAnlikOku(CevrimdisiAktifKullanici());
    if (disk) return disk as UygulamaBildirimi[];
    throw e;
  }
}

export async function BildirimOkunmamisSayim(): Promise<number> {
  const { data, error } = await supabase.rpc('bildirim_okunmamis_sayim');
  if (error) throw error;
  return Number(data) || 0;
}

export async function BildirimleriHepsiniOkundu(): Promise<number> {
  const { data, error } = await supabase.rpc('bildirimleri_hepsini_okundu');
  if (error) throw error;
  return Number(data) || 0;
}

export async function BildirimOkunduIsaretle(
  id: string,
): Promise<{ ok: boolean; unread: number }> {
  const { data, error } = await supabase.rpc('bildirim_okundu_isaretle', {
    p_id: id,
  });
  if (error) throw error;
  const row = data as { ok?: boolean; unread?: number } | null;
  return { ok: !!row?.ok, unread: Number(row?.unread) || 0 };
}

export async function BildirimSil(
  id: string,
): Promise<{ ok: boolean; deleted: number; unread: number }> {
  const { data, error } = await supabase.rpc('bildirim_sil', { p_id: id });
  if (error) throw error;
  const row = data as { ok?: boolean; deleted?: number; unread?: number } | null;
  return {
    ok: !!row?.ok,
    deleted: Number(row?.deleted) || 0,
    unread: Number(row?.unread) || 0,
  };
}

export async function BildirimleriTopluSil(
  ids: string[],
): Promise<{ ok: boolean; deleted: number; unread: number }> {
  if (ids.length === 0) return { ok: true, deleted: 0, unread: 0 };
  const { data, error } = await supabase.rpc('bildirimleri_toplu_sil', {
    p_ids: ids,
  });
  if (error) throw error;
  const row = data as { ok?: boolean; deleted?: number; unread?: number } | null;
  return {
    ok: !!row?.ok,
    deleted: Number(row?.deleted) || 0,
    unread: Number(row?.unread) || 0,
  };
}

export async function BildirimleriHepsiniSil(): Promise<{
  ok: boolean;
  deleted: number;
  unread: number;
}> {
  const { data, error } = await supabase.rpc('bildirimleri_hepsini_sil');
  if (error) throw error;
  const row = data as { ok?: boolean; deleted?: number; unread?: number } | null;
  return {
    ok: !!row?.ok,
    deleted: Number(row?.deleted) || 0,
    unread: Number(row?.unread) || 0,
  };
}

export async function BildirimKuyrugaEkleDev(input: {
  title: string;
  body?: string;
  category?: string;
}): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('bildirim_kuyruga_ekle_dev', {
    p_title: input.title,
    p_body: input.body ?? null,
    p_category: input.category ?? 'system',
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

/** @deprecated */
export type OutboxBildirim = UygulamaBildirimi & { status?: string };

/** @deprecated */
export async function BildirimKuyrugumuGetir(
  limit = 30,
): Promise<UygulamaBildirimi[]> {
  return BildirimlerimiListele(limit);
}
