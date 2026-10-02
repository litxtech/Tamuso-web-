import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type { DuyuruDetay, DuyuruKart } from '../tipler';

function listeCoz(data: unknown): { items: DuyuruKart[]; next: string | null } {
  const row = (data ?? {}) as { items?: DuyuruKart[]; next_cursor?: string | null };
  return {
    items: Array.isArray(row.items) ? row.items : [],
    next: row.next_cursor ?? null,
  };
}

export async function DuyuruListesiGetir(input: {
  locale: string;
  filter?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<{ items: DuyuruKart[]; next: string | null }> {
  const { data, error } = await supabase.rpc('duyuru_liste', {
    p_locale: input.locale,
    p_filter: input.filter ?? 'all',
    p_cursor: input.cursor ?? null,
    p_limit: input.limit ?? 20,
  });
  if (error) throw error;
  return listeCoz(data);
}

export async function DuyuruDetayGetir(
  id: string,
  locale: string,
): Promise<DuyuruDetay | null> {
  const { data, error } = await supabase.rpc('duyuru_detay', {
    p_id: id,
    p_locale: locale,
  });
  if (error) {
    if (/not found/i.test(error.message)) return null;
    throw error;
  }
  return (data ?? null) as DuyuruDetay | null;
}

export async function DuyuruRozetSayisi(): Promise<number> {
  const { data, error } = await supabase.rpc('duyuru_rozet');
  if (error) return 0;
  return typeof data === 'number' ? data : Number(data ?? 0) || 0;
}

export async function DuyuruAnaSayfaGetir(locale: string) {
  const { data, error } = await supabase.rpc('duyuru_ana_sayfa', { p_locale: locale });
  if (error) return [];
  return (Array.isArray(data) ? data : []) as Array<{
    id: string;
    home_display: 'CARD' | 'BANNER' | 'CAROUSEL';
    theme_color: string | null;
    title: string;
    summary: string;
    thumbnail_url: string | null;
  }>;
}

export async function DuyuruAcilisGetir(locale: string) {
  const { data, error } = await supabase.rpc('duyuru_acilis', { p_locale: locale });
  if (error || !data) return null;
  return data as {
    id: string;
    severity: string;
    dismissible: boolean;
    show_until_read: boolean;
    launch_frequency: string;
    title: string;
    summary: string;
    body_plain: string;
    content_locale: string;
    hero: string | null;
    ctas: Array<{ id: string; destination_type: string; destination: Record<string, string>; label: string }>;
  };
}

export async function DuyuruAcilisGoruldu(id: string) {
  await supabase.rpc('duyuru_acilis_goruldu', { p_id: id });
}

export async function DuyuruOkunduIsaretle(announcementId: string) {
  const { error } = await supabase.rpc('duyuru_okundu_isaretle', {
    p_announcement_id: announcementId,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function DuyuruTepkiVer(id: string, reaction: string) {
  const { data, error } = await supabase.rpc('duyuru_tepki', {
    p_id: id,
    p_reaction: reaction,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, data };
}

export async function DuyuruYorumEkle(id: string, body: string) {
  const { data, error } = await supabase.rpc('duyuru_yorum_ekle', {
    p_id: id,
    p_body: body,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, data };
}

export async function DuyuruYorumSil(commentId: string) {
  const { error } = await supabase.rpc('duyuru_yorum_sil', { p_comment_id: commentId });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function DuyuruYorumBildir(commentId: string, reason: string) {
  const { error } = await supabase.rpc('duyuru_yorum_bildir', {
    p_comment_id: commentId,
    p_reason: reason,
  });
  if (error) return { ok: false as const, hata: error.message || i18n.t('duyuru.bildirilemedi') };
  return { ok: true as const };
}

/** Eski çağrılar için ince sarmalayıcı. */
export async function AktifDuyurulariGetir(limit = 20) {
  const { items } = await DuyuruListesiGetir({ locale: 'tr', limit });
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.summary,
    priority: item.severity.toLowerCase(),
    starts_at: item.publish_at,
    deep_link: `/duyuru/${item.id}`,
  }));
}

export type Duyuru = {
  id: string;
  title: string;
  body: string;
  priority: string;
  starts_at: string;
  deep_link: string | null;
};
