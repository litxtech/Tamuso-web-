import { supabase } from '../../../../lib/supabase';
import { oyunRpcRetryIle } from '../../ortak/servisler/OyunAgIstek';
import type { ConfirmResult, FruitWheelState } from '../tipler/FruitWheelTipleri';

type Fail = { ok: false; code: string };

function asState(data: unknown): FruitWheelState | Fail {
  if (!data || typeof data !== 'object') return { ok: false, code: 'empty' };
  const row = data as FruitWheelState & { code?: string };
  if (row.ok === false) return { ok: false, code: row.code ?? 'error' };
  if (!('round' in row)) return { ok: false, code: 'empty' };
  return row;
}

export async function fruitWheelSync(): Promise<FruitWheelState | Fail> {
  const { data, error } = await oyunRpcRetryIle(() => supabase.rpc('fruit_wheel_sync'));
  if (error) return { ok: false, code: 'network' };
  return asState(data);
}

export async function fruitWheelHeartbeat(): Promise<void> {
  await oyunRpcRetryIle(() => supabase.rpc('fruit_wheel_heartbeat')).catch(() => null);
}

export async function fruitWheelConfirm(
  roundId: string,
  idempotencyKey: string,
  items: { fruitId: string; amount: number }[],
): Promise<ConfirmResult> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('fruit_wheel_confirm', {
      p_round_id: roundId,
      p_key: idempotencyKey,
      p_items: items,
    }),
  );
  if (error || !data) return { ok: false, code: 'network' };
  return data as ConfirmResult;
}

export async function fruitWheelHistory(): Promise<unknown> {
  const { data, error } = await oyunRpcRetryIle(() =>
    supabase.rpc('fruit_wheel_history', { p_limit: 30 }),
  );
  if (error) return { ok: false, code: 'network' };
  return data;
}

export function newFruitWheelIdempotencyKey(): string {
  return `fw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export async function fruitWheelAdminDashboard(): Promise<unknown> {
  const { data, error } = await supabase.rpc('fruit_wheel_admin_dashboard');
  if (error) return { ok: false, code: error.message };
  return data;
}

export async function fruitWheelAdminMath(): Promise<unknown> {
  const { data, error } = await supabase.rpc('fruit_wheel_admin_math');
  if (error) return { ok: false, code: error.message };
  return data;
}

export async function fruitWheelAdminSetEnabled(enabled: boolean): Promise<unknown> {
  const { data, error } = await supabase.rpc('fruit_wheel_admin_set_enabled', {
    p_enabled: enabled,
  });
  if (error) return { ok: false, code: error.message };
  return data;
}

export async function fruitWheelAdminPublish(fruits: unknown): Promise<unknown> {
  const { data, error } = await supabase.rpc('fruit_wheel_admin_publish_fruits', {
    p_fruits: fruits,
  });
  if (error) return { ok: false, code: error.message };
  return data;
}

export async function fruitWheelAdminSavePolicy(patch: unknown): Promise<unknown> {
  const { data, error } = await supabase.rpc('fruit_wheel_admin_save_policy', {
    p_patch: patch,
  });
  if (error) return { ok: false, code: error.message };
  return data;
}

export async function fruitWheelAdminForceNext(fruitId: string | null): Promise<unknown> {
  const { data, error } = await supabase.rpc('fruit_wheel_admin_force_next', {
    p_fruit_id: fruitId,
  });
  if (error) return { ok: false, code: error.message };
  return data;
}

export async function fruitWheelAdminAudit(): Promise<unknown> {
  const { data, error } = await supabase.rpc('fruit_wheel_admin_audit', { p_limit: 30 });
  if (error) return { ok: false, code: error.message };
  return data;
}
