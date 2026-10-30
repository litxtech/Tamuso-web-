/**
 * Meyve çarkı personel RPC'leri — YALNIZCA web yönetim konsolunda kullanılır.
 *
 * Bu dosya `apps/super-admin` içinde tutulur; mobil uygulama hiçbir zaman
 * import etmez. Böylece iOS/Android binary'sinde personel RPC adları
 * (force_next, save_policy vb.) hiç görünmez (Guideline 2.5.19).
 */
import { supabase } from '../../../src/lib/supabase';

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
