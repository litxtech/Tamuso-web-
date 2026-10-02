/**
 * Ortak oyun algoritma admin API — Zeus (ve ileride diğer oyunlar).
 */

import { supabase } from '../../../../lib/supabase';

export type GameCodeAlg = 'zeus' | 'kozmik_kaskad' | 'nox_reels' | 'fair_spin';

export type GameMathRow = {
  mathVersion: string;
  displayName: string;
  description: string;
  isActive: boolean;
  simulatedRtp: number | null;
  config: Record<string, unknown>;
  createdAt?: string;
};

export type GameScheduleRow = {
  id: string;
  gameCode: string;
  mathVersion: string;
  displayName?: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: string;
  createdAt?: string;
  isLive?: boolean;
};

export type GameSettingsBundle = {
  gameCode: string;
  gamePaused: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  minBet: number | null;
  maxBet: number | null;
  betPresets: number[] | null;
  autoplayEnabled: boolean | null;
  turboEnabled: boolean | null;
  maxDailyWager: number | null;
  maxDailyLoss: number | null;
  maxRoundsPerDay: number | null;
  activeMath: {
    mathVersion?: string;
    displayName?: string;
    source?: string;
    config?: Record<string, unknown>;
  };
  fieldHelp: Record<string, string>;
};

export type ObservedRtp = {
  gameCode: string;
  hours: number;
  wager: number;
  win: number;
  rounds: number;
  observedRtp: number | null;
};

async function rpcJson<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function gameAdminMathList(gameCode: GameCodeAlg) {
  return rpcJson<GameMathRow[]>('game_admin_math_list', {
    p_game_code: gameCode,
  });
}

export function gameAdminMathActivate(
  gameCode: GameCodeAlg,
  mathVersion: string,
  reason = '',
) {
  return rpcJson<GameMathRow[]>('game_admin_math_activate', {
    p_game_code: gameCode,
    p_math_version: mathVersion,
    p_reason: reason,
  });
}

export function gameAdminSettingsGet(gameCode: GameCodeAlg) {
  return rpcJson<GameSettingsBundle>('game_admin_settings_get', {
    p_game_code: gameCode,
  });
}

export function gameAdminSettingsUpdate(
  gameCode: GameCodeAlg,
  patch: Record<string, unknown>,
  reason = '',
) {
  return rpcJson<GameSettingsBundle>('game_admin_settings_update', {
    p_game_code: gameCode,
    p_patch: patch,
    p_reason: reason,
  });
}

export function gameAdminScheduleList(gameCode: GameCodeAlg, limit = 50) {
  return rpcJson<GameScheduleRow[]>('game_admin_schedule_list', {
    p_game_code: gameCode,
    p_limit: limit,
  });
}

export function gameAdminScheduleCreate(
  gameCode: GameCodeAlg,
  mathVersion: string,
  startsAt: string,
  endsAt: string,
  reason = '',
) {
  return rpcJson<GameScheduleRow[]>('game_admin_schedule_create', {
    p_game_code: gameCode,
    p_math_version: mathVersion,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_reason: reason,
  });
}

export function gameAdminScheduleCancel(id: string, reason = '') {
  return rpcJson<GameScheduleRow[]>('game_admin_schedule_cancel', {
    p_id: id,
    p_reason: reason,
  });
}

export function gameAdminObservedRtp(gameCode: GameCodeAlg, hours = 24) {
  return rpcJson<ObservedRtp>('game_admin_observed_rtp', {
    p_game_code: gameCode,
    p_hours: hours,
  });
}
