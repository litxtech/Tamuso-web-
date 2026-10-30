/**
 * Oyun kontrol servisi — aktif config + override okuma.
 * Görünürlük: admin `is_enabled` (MAINTENANCE gizli).
 */

import { supabase } from '../../../../lib/supabase';
import { GameLogger } from '../../cekirdek/OyunLogger';
import { oyunRpcRetryIle } from './OyunAgIstek';
import { STORM_KING_PAKETTE } from '../../storm-king/StormKingPaket';
import type {
  GameCode,
  GameControlConfig,
  GameControlOverride,
  RpcResult,
} from '../tipler/OyunTipleri';

export type GameControlBundle = {
  config: GameControlConfig | null;
  override: GameControlOverride | null;
};

/** Kullanıcıya açık oyunlar. Kapalı / bakım kodları sorgu zaten eler. */
const KULLANICI_OYUNLARI = new Set<string>(STORM_KING_PAKETTE ? ['fruit_wheel', 'storm_king'] : ['fruit_wheel']);

export function KullaniciOyunuMu(kod: string | null | undefined): boolean {
  return !!kod && KULLANICI_OYUNLARI.has(kod);
}

/** Sunucunun bahis/spin kapısında baktığı oyun bayrağı. */
const OYUN_BAYRAGI: Record<string, string> = {
  fruit_wheel: 'fruit_wheel_enabled',
  storm_king: 'storm_king_enabled',
};

function KullaniciOyunlariniSuz(kodlar: GameCode[]): GameCode[] {
  return kodlar.filter((kod) => KULLANICI_OYUNLARI.has(kod));
}

/** Uygulamada listelenmeye uygun oyun kodları (kapalı / bakım / bayrağı kapalı hariç). */
export async function listVisibleGameCodes(): Promise<RpcResult<GameCode[]>> {
  try {
    const [cfgRes, bayrakRes] = await Promise.all([
      oyunRpcRetryIle(() =>
        supabase
          .from('game_control_configs')
          .select('game_code, is_enabled, mode')
          .eq('is_enabled', true)
          .neq('mode', 'MAINTENANCE')
          .order('game_code', { ascending: true }),
      ),
      supabase
        .from('feature_flags')
        .select('key, enabled')
        .in('key', Object.values(OYUN_BAYRAGI)),
    ]);

    if (cfgRes.error) {
      GameLogger.warn('listVisibleGameCodes', { hata: cfgRes.error.message });
      return { ok: false, hata: cfgRes.error.message ?? 'listVisibleGameCodes' };
    }

    const kapaliBayraklar = new Set(
      ((bayrakRes.data ?? []) as Array<{ key: string; enabled: boolean }>)
        .filter((b) => !b.enabled)
        .map((b) => b.key),
    );
    const codes = KullaniciOyunlariniSuz(
      ((cfgRes.data ?? []) as Array<{ game_code: GameCode }>).map((r) => r.game_code),
    ).filter((kod) => !kapaliBayraklar.has(OYUN_BAYRAGI[kod] ?? ''));
    return { ok: true, data: codes };
  } catch (e) {
    const hata = e instanceof Error ? e.message : 'listVisibleGameCodes başarısız';
    GameLogger.warn('listVisibleGameCodes', { hata });
    return { ok: false, hata };
  }
}

export async function isGameVisible(gameCode: GameCode): Promise<boolean> {
  if (!KullaniciOyunuMu(gameCode)) return false;
  const res = await listVisibleGameCodes();
  // Ağ kopunca meyve oyununu kapalı gösterme — spin endpoint zaten bayrağı zorlar.
  if (!res.ok) return true;
  return res.data.includes(gameCode);
}

export async function fetchGameControl(
  gameCode: GameCode,
  now: Date = new Date(),
): Promise<RpcResult<GameControlBundle>> {
  try {
    const iso = now.toISOString();

    const [configRes, overrideRes] = await Promise.all([
      supabase
        .from('game_control_configs')
        .select('*')
        .eq('game_code', gameCode)
        .eq('is_enabled', true)
        .maybeSingle(),
      supabase
        .from('game_control_overrides')
        .select('*')
        .eq('game_code', gameCode)
        .lte('starts_at', iso)
        .gte('ends_at', iso)
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (configRes.error) {
      GameLogger.error('fetchGameControl config', { hata: configRes.error.message });
      return { ok: false, hata: configRes.error.message };
    }
    if (overrideRes.error) {
      GameLogger.error('fetchGameControl override', { hata: overrideRes.error.message });
      return { ok: false, hata: overrideRes.error.message };
    }

    return {
      ok: true,
      data: {
        config: (configRes.data as GameControlConfig | null) ?? null,
        override: (overrideRes.data as GameControlOverride | null) ?? null,
      },
    };
  } catch (e) {
    const hata = e instanceof Error ? e.message : 'fetchGameControl başarısız';
    GameLogger.error('fetchGameControl', { hata });
    return { ok: false, hata };
  }
}

export const OyunKontrolServisi = {
  fetchGameControl,
  listVisibleGameCodes,
  isGameVisible,
} as const;
