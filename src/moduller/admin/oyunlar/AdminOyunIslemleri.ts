import { supabase } from '../../../lib/supabase';
import type { GameControlConfig } from '../../oyunlar/ortak/tipler/OyunTipleri';
import {
  AdminKillSwitchAyarla,
  AdminOzellikBayragiAyarla,
  AdminBayraklariGetir,
} from '../platform/AdminPlatformIslemleri';

export type AdminOyunKatalogSatiri = {
  game_code: string;
  name: string;
  is_active: boolean;
};

/** Uygulamanın listelediği durum ile sunucunun bahis/spin kapısı. */
export type AdminOyunKapiDurumu = {
  game_code: string;
  liste_acik: boolean;
  bayrak: string | null;
  bayrak_acik: boolean | null;
  politika_acik: boolean | null;
};

export function oyunKapisiUyumsuzMu(d: AdminOyunKapiDurumu): boolean {
  if (d.bayrak_acik != null && d.bayrak_acik !== d.liste_acik) return true;
  if (d.politika_acik != null && d.politika_acik !== d.liste_acik) return true;
  return false;
}

export async function AdminOyunKapiDurumuGetir(): Promise<AdminOyunKapiDurumu[]> {
  const { data, error } = await supabase.rpc('admin_oyun_kapi_durumu');
  if (error) throw error;
  return (data as AdminOyunKapiDurumu[]) ?? [];
}

export async function AdminOyunKontrolGetir(
  gameCode = 'kozmik_kaskad',
): Promise<GameControlConfig | null> {
  const { data, error } = await supabase
    .from('game_control_configs')
    .select('*')
    .eq('game_code', gameCode)
    .maybeSingle();
  if (error) throw error;
  return data as GameControlConfig | null;
}

/** Tüm oyun kontrol config'leri — admin aç/kapa listesi. */
export async function AdminTumOyunKontrolleriniGetir(): Promise<GameControlConfig[]> {
  const { data, error } = await supabase
    .from('game_control_configs')
    .select('*')
    .order('game_code', { ascending: true });
  if (error) throw error;
  return (data as GameControlConfig[]) ?? [];
}

export async function AdminOyunKataloguGetir(): Promise<AdminOyunKatalogSatiri[]> {
  const { data, error } = await supabase
    .from('game_catalog')
    .select('game_code, name, is_active')
    .order('game_code', { ascending: true });
  if (error) throw error;
  return (data as AdminOyunKatalogSatiri[]) ?? [];
}

export async function AdminOyunKontrolGuncelle(params: {
  gameCode: string;
  patch: Record<string, unknown>;
  reason?: string;
}): Promise<GameControlConfig> {
  const { data, error } = await supabase.rpc('admin_oyun_kontrol_guncelle', {
    p_game_code: params.gameCode,
    p_patch: params.patch,
    p_reason: params.reason ?? null,
  });
  if (error) throw error;
  return data as GameControlConfig;
}

/**
 * Tek oyunu canlı aç / kapat. Liste, oyun bayrağı ve Fruit Wheel politikası
 * sunucuda tek işlemde değişir; kapalı oyuna bahis/spin de reddedilir.
 */
export async function AdminOyunGorunurlukAyarla(
  gameCode: string,
  acik: boolean,
  reason?: string,
): Promise<GameControlConfig> {
  const { data, error } = await supabase.rpc('admin_oyun_gorunurluk_ayarla', {
    p_game_code: gameCode,
    p_acik: acik,
    p_reason: reason ?? (acik ? 'admin: oyun açıldı' : 'admin: oyun kapatıldı'),
  });
  if (error) throw error;
  return data as GameControlConfig;
}

/** Tüm oyun butonlarını platform seviyesinde aç/kapa. */
export async function AdminOyunPlatformAyarla(acik: boolean): Promise<void> {
  await AdminOzellikBayragiAyarla('games_enabled', acik);
  if (!acik) {
    await AdminKillSwitchAyarla(
      'kill_games',
      true,
      'admin panel: tüm oyunlar kapalı',
    );
  } else {
    await AdminKillSwitchAyarla(
      'kill_games',
      false,
      'admin panel: oyunlar açıldı',
    );
  }
}

export async function AdminOyunPlatformDurumu(): Promise<{
  gamesEnabled: boolean;
  killGames: boolean;
}> {
  const { flags, kills } = await AdminBayraklariGetir();
  const gamesEnabled =
    flags.find((f) => f.key === 'games_enabled')?.enabled ?? true;
  const killGames = kills.find((k) => k.key === 'kill_games')?.active ?? false;
  return { gamesEnabled, killGames };
}

export async function AdminAktifOyunOturumlari(limit = 20) {
  const { data, error } = await supabase
    .from('game_sessions')
    .select(
      'id, game_code, room_id, status, created_at, started_at, ends_at, max_players',
    )
    .in('status', ['waiting', 'countdown', 'playing'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
