import { supabase } from '../../../lib/supabase';
import { DepoyaMedyaYukle } from '../../../ortak/medya/DepoyaMedyaYukle';
import type { DuyuruBelge, DuyuruDili } from '../tipler';

export type DuyuruCeviriGirdi = {
  locale: DuyuruDili;
  title: string;
  summary: string;
  body_doc: DuyuruBelge;
  button_text?: string;
};

export type DuyuruKayit = {
  action: 'draft' | 'publish';
  severity: 'NORMAL' | 'IMPORTANT' | 'CRITICAL';
  category_id?: string | null;
  publish_at?: string | null;
  expire_at?: string | null;
  dismissible?: boolean;
  show_until_read?: boolean;
  pinned?: boolean;
  pin_priority?: number;
  show_on_home?: boolean;
  home_display?: 'CARD' | 'BANNER' | 'CAROUSEL';
  show_on_launch?: boolean;
  launch_frequency?: 'ONCE_PER_USER' | 'EVERY_APP_OPEN_UNTIL_READ';
  allow_reactions?: boolean;
  allow_comments?: boolean;
  show_view_count?: boolean;
  send_push?: boolean;
  push_title?: string;
  push_body?: string;
  push_image_url?: string;
  target_mode?: 'all' | 'targeted';
  target_logic?: 'AND' | 'OR';
  targets?: Array<{ dimension: string; values: unknown }>;
  translations: DuyuruCeviriGirdi[];
  ctas?: Array<{
    sort_order: number;
    destination_type: string;
    destination: Record<string, string>;
    labels: Record<string, string>;
  }>;
};

export async function AdminDuyuruListe(status = 'all') {
  const { data, error } = await supabase.rpc('admin_duyuru_liste', { p_status: status });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
}

export async function AdminDuyuruGet(id: string) {
  const { data, error } = await supabase.rpc('admin_duyuru_get', { p_id: id });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function AdminDuyuruKaydet(id: string | null, payload: DuyuruKayit) {
  const { data, error } = await supabase.rpc('admin_duyuru_kaydet', {
    p_id: id,
    p_payload: payload,
  });
  if (error) return { ok: false as const, hata: error.message };
  const row = (data ?? {}) as { id?: string; status?: string };
  return { ok: true as const, id: row.id ?? '', status: row.status ?? '' };
}

export async function AdminDuyuruDurum(id: string, action: 'publish' | 'unpublish' | 'archive' | 'delete') {
  const { error } = await supabase.rpc('admin_duyuru_durum', { p_id: id, p_action: action });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AdminDuyuruKopyala(id: string) {
  const { data, error } = await supabase.rpc('admin_duyuru_kopyala', { p_id: id });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: String(data) };
}

export async function AdminDuyuruKategoriler() {
  const { data, error } = await supabase.rpc('admin_duyuru_kategoriler');
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as Array<{
    id: string;
    code: string;
    name: string;
    icon: string;
    theme_color: string;
    enabled: boolean;
  }>;
}

export async function AdminDuyuruKategoriKaydet(input: {
  id?: string | null;
  name: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
}) {
  const { data, error } = await supabase.rpc('admin_duyuru_kategori_kaydet', {
    p_id: input.id ?? null,
    p_name: input.name,
    p_icon: input.icon ?? '',
    p_color: input.color ?? '',
    p_enabled: input.enabled ?? true,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: String(data) };
}

export async function AdminDuyuruAnalitikOzet() {
  const { data, error } = await supabase.rpc('admin_duyuru_analitik_ozet');
  if (error) throw error;
  return (data ?? {}) as Record<string, number>;
}

export async function AdminDuyuruAnalitik(id: string) {
  const { data, error } = await supabase.rpc('admin_duyuru_analitik', { p_id: id });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function AdminDuyuruIzleyiciler(input: {
  id: string;
  q?: string;
  country?: string;
  platform?: string;
}) {
  const { data, error } = await supabase.rpc('admin_duyuru_izleyiciler', {
    p_id: input.id,
    p_q: input.q ?? null,
    p_country: input.country ?? null,
    p_platform: input.platform ?? null,
    p_cursor: null,
    p_limit: 60,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as Array<Record<string, string | null>>;
}

export async function AdminDuyuruDisaAktar(id: string) {
  const { data, error } = await supabase.rpc('admin_duyuru_izleyici_disa_aktar', { p_id: id });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, csv: String(data ?? '') };
}

export async function AdminDuyuruMedyaYukle(input: {
  announcementId: string;
  uri: string;
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE_RECORDING';
  mime?: string | null;
  durationMs?: number | null;
  onProgress?: (oran: number) => void;
  thumbnailUri?: string | null;
  locale?: string | null;
}) {
  input.onProgress?.(0.15);
  const tur = input.kind === 'VIDEO' ? 'video' : input.kind === 'IMAGE' ? 'image' : 'audio';
  const ext = tur === 'video' ? 'mp4' : tur === 'image' ? 'jpg' : 'm4a';
  const path = `${input.announcementId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const yukleme = await DepoyaMedyaYukle(supabase, {
    bucket: 'announcement-media',
    path,
    uri: input.uri,
    mime: input.mime,
    tur,
    maxBytes: tur === 'video' ? 80 * 1024 * 1024 : tur === 'image' ? 8 * 1024 * 1024 : 20 * 1024 * 1024,
  });
  if (!yukleme.ok) return yukleme;
  input.onProgress?.(0.7);
  const { data: pub } = supabase.storage.from('announcement-media').getPublicUrl(yukleme.path);
  let thumbPath: string | null = null;
  let thumbUrl: string | null = null;
  if (input.thumbnailUri) {
    const tPath = `${input.announcementId}/thumb-${Date.now()}.jpg`;
    const t = await DepoyaMedyaYukle(supabase, {
      bucket: 'announcement-media',
      path: tPath,
      uri: input.thumbnailUri,
      mime: 'image/jpeg',
      tur: 'image',
      maxBytes: 8 * 1024 * 1024,
    });
    if (t.ok) {
      thumbPath = t.path;
      thumbUrl = supabase.storage.from('announcement-media').getPublicUrl(t.path).data.publicUrl;
    }
  }
  const { data, error } = await supabase.rpc('admin_duyuru_medya_kaydet', {
    p_announcement_id: input.announcementId,
    p_kind: input.kind,
    p_path: yukleme.path,
    p_public_url: pub.publicUrl,
    p_mime: yukleme.contentType,
    p_bytes: 0,
    p_duration_ms: input.durationMs ?? null,
    p_width: null,
    p_height: null,
    p_thumb_path: thumbPath,
    p_thumb_url: thumbUrl,
    p_locale: input.locale ?? null,
    p_caption: null,
  });
  input.onProgress?.(1);
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: String(data) };
}

export async function AdminDuyuruMedyaSil(id: string) {
  const { error } = await supabase.rpc('admin_duyuru_medya_sil', { p_media_id: id });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AdminDuyuruPushDevam(id: string) {
  const { data, error } = await supabase.rpc('announcement_push_isle', {
    p_id: id,
    p_limit: 400,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, data };
}
