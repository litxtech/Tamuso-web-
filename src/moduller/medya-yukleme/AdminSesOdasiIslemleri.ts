import { supabase } from '../../lib/supabase';
import type { AdminCanliOda } from '../admin/tipler/PlatformTipleri';

export type AdminOdaYaptirimGirdi = {
  reason?: string;
  /** Coin cezası (0 = yok) */
  coin_penalty?: number;
  /** İhtar kaydı */
  warning?: boolean;
  /** Saat; -1 = kalıcı; undefined/0 = yok */
  upload_ban_hours?: number;
  /** Saat; -1 = kalıcı; undefined/0 = yok */
  room_create_ban_hours?: number;
  account_ban?: boolean;
  /** Saat; -1/undefined = kalıcı (account_ban true iken) */
  account_ban_hours?: number;
  /** Host + seçilen diğer kullanıcılar */
  target_user_ids?: string[];
};

export type AdminOdaModerasyonSonuc = {
  ok: boolean;
  room_id: string;
  host_id: string;
  title: string | null;
  reason: string;
  targets?: string[];
  close?: Record<string, unknown>;
  sanctions?: Array<Record<string, unknown>>;
};

export type AdminOdaUyesi = {
  user_id: string;
  role: string;
  display_name: string;
  username: string | null;
  is_host: boolean;
};

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message ?? 'Admin işlem başarısız');
}

export function YaptirimPayloadOlustur(
  sanctions: AdminOdaYaptirimGirdi,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    reason: sanctions.reason?.trim() || undefined,
    warning: sanctions.warning === true,
    account_ban: sanctions.account_ban === true,
  };

  if (sanctions.coin_penalty && sanctions.coin_penalty > 0) {
    payload.coin_penalty = Math.floor(sanctions.coin_penalty);
  }
  if (
    sanctions.upload_ban_hours !== undefined &&
    sanctions.upload_ban_hours !== 0
  ) {
    payload.upload_ban_hours = sanctions.upload_ban_hours;
  }
  if (
    sanctions.room_create_ban_hours !== undefined &&
    sanctions.room_create_ban_hours !== 0
  ) {
    payload.room_create_ban_hours = sanctions.room_create_ban_hours;
  }
  if (sanctions.account_ban === true) {
    if (
      sanctions.account_ban_hours !== undefined &&
      sanctions.account_ban_hours !== 0
    ) {
      payload.account_ban_hours = sanctions.account_ban_hours;
    } else {
      payload.account_ban_hours = -1;
    }
  }
  if (sanctions.target_user_ids?.length) {
    payload.target_user_ids = [...new Set(sanctions.target_user_ids)];
  }
  return payload;
}

export async function AdminCanliSesOdalari(
  limit = 50,
): Promise<AdminCanliOda[]> {
  const { data, error } = await supabase.rpc('admin_canli_odalar', {
    p_limit: limit,
  });
  if (error) rpcHata(error);
  return (data ?? []) as AdminCanliOda[];
}

export async function AdminOdaUyeleri(
  roomId: string,
): Promise<AdminOdaUyesi[]> {
  const { data, error } = await supabase.rpc('admin_oda_uyeleri', {
    p_room_id: roomId,
  });
  if (error) rpcHata(error);
  return (data ?? []) as AdminOdaUyesi[];
}

/** Sadece kapat + üyeleri dağıt (yaptırım yok) */
export async function AdminSesOdasiKapat(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_oda_canli_kapat', {
    p_room_id: roomId,
  });
  if (error) rpcHata(error);
}

/** Kapat + isteğe bağlı yaptırımlar (host + seçilenler). Feed `is_live=false` ile düşer. */
export async function AdminSesOdasiKapatVeYaptirim(
  roomId: string,
  sanctions: AdminOdaYaptirimGirdi = {},
): Promise<AdminOdaModerasyonSonuc> {
  const { data, error } = await supabase.rpc(
    'admin_ses_odasi_kapat_ve_yaptirim',
    {
      p_room_id: roomId,
      p_sanctions: YaptirimPayloadOlustur(sanctions),
    },
  );
  if (error) rpcHata(error);
  return data as AdminOdaModerasyonSonuc;
}

export async function AdminYaptirimUygula(input: {
  userId: string;
  kind: 'upload_ban' | 'room_create_ban';
  hours?: number;
  reason?: string;
  roomId?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_yaptirim_uygula', {
    p_user_id: input.userId,
    p_kind: input.kind,
    p_hours: input.hours ?? 24,
    p_reason: input.reason ?? null,
    p_room_id: input.roomId ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminYaptirimKaldir(input: {
  sanctionId?: string;
  userId?: string;
  kind?: 'upload_ban' | 'room_create_ban';
}): Promise<void> {
  const { error } = await supabase.rpc('admin_yaptirim_kaldir', {
    p_sanction_id: input.sanctionId ?? null,
    p_user_id: input.userId ?? null,
    p_kind: input.kind ?? null,
  });
  if (error) rpcHata(error);
}

export type AktifYaptirim = {
  id: string;
  kind: 'upload_ban' | 'room_create_ban' | string;
  reason: string;
  starts_at: string;
  expires_at: string | null;
  room_id: string | null;
};

export async function BenimAktifYaptirimlarim(): Promise<AktifYaptirim[]> {
  const { data, error } = await supabase.rpc('benim_aktif_yaptirimlarim');
  if (error) return [];
  return (Array.isArray(data) ? data : []) as AktifYaptirim[];
}

export async function YaptirimAktifMi(
  kind: 'upload_ban' | 'room_create_ban',
): Promise<boolean> {
  const liste = await BenimAktifYaptirimlarim();
  return liste.some((s) => s.kind === kind);
}

/** Ban / yaptırım süre seçenekleri (saat) */
export const YAPTIRIM_SURE_SECENEKLERI = [
  { label: '1 saat', hours: 1 },
  { label: '6 saat', hours: 6 },
  { label: '24 saat', hours: 24 },
  { label: '3 gün', hours: 72 },
  { label: '7 gün', hours: 168 },
  { label: '30 gün', hours: 720 },
  { label: '1 yıl', hours: 8760 },
  { label: 'Kalıcı', hours: -1 },
] as const;

export const COIN_CEZA_HIZLI = [1_000, 5_000, 10_000, 50_000] as const;

/** ISO başlangıç → "12 dk" / "1 sa 5 dk" */
export function SureMetni(baslangicIso: string | null | undefined): string {
  if (!baslangicIso) return '—';
  const t = new Date(baslangicIso).getTime();
  if (!Number.isFinite(t)) return '—';
  const sn = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sn < 60) return `${sn} sn`;
  const dk = Math.floor(sn / 60);
  if (dk < 60) return `${dk} dk`;
  const sa = Math.floor(dk / 60);
  const kalanDk = dk % 60;
  if (sa < 48) return kalanDk > 0 ? `${sa} sa ${kalanDk} dk` : `${sa} sa`;
  const gun = Math.floor(sa / 24);
  const kalanSa = sa % 24;
  return kalanSa > 0 ? `${gun} g ${kalanSa} sa` : `${gun} g`;
}

export function SureSaatEtiket(hours: number | null | undefined): string {
  if (hours == null) return 'yok';
  if (hours < 0) return 'kalıcı';
  const hit = YAPTIRIM_SURE_SECENEKLERI.find((s) => s.hours === hours);
  if (hit) return hit.label;
  if (hours < 24) return `${hours} sa`;
  if (hours % 24 === 0) return `${hours / 24} gün`;
  return `${hours} sa`;
}

/** Örnek (demo) canlı ses odalarını yeniden kurar — admin only */
export async function AdminOrnekSesOdalariDoldur(): Promise<{
  ok: boolean;
  oda_sayisi?: number;
  hata?: string;
}> {
  const { data, error } = await supabase.rpc('admin_ornek_ses_odalari_seed');
  if (error) return { ok: false, hata: error.message };
  const row = (data ?? {}) as { ok?: boolean; oda_sayisi?: number };
  return { ok: row.ok !== false, oda_sayisi: row.oda_sayisi };
}

/** Örnek canlı odaları feed’den kapatır — admin only */
export async function AdminOrnekSesOdalariKapat(): Promise<{
  ok: boolean;
  kapatilan?: number;
  hata?: string;
}> {
  const { data, error } = await supabase.rpc('admin_ornek_ses_odalari_kapat');
  if (error) return { ok: false, hata: error.message };
  const row = (data ?? {}) as { ok?: boolean; kapatilan?: number };
  return { ok: row.ok !== false, kapatilan: row.kapatilan };
}
