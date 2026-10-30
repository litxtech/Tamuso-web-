import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';

export type AjansSertifikaDurum = {
  agency_id: string;
  agency_name: string;
  owner_name: string;
  members: number;
  live_minutes: number;
  coin_sales: number;
  member_threshold: number;
  live_minutes_threshold: number;
  coin_sales_threshold: number;
  gift_usd: number;
  ready: boolean;
  issued_at: string | null;
  is_owner: boolean;
};

export type AjansSertifikaAyar = {
  member_threshold: number;
  live_minutes_threshold: number;
  coin_sales_threshold: number;
  gift_usd: number;
};

function hataAnahtari(message: string): CeviriAnahtari {
  const m = message.toUpperCase();
  if (m.includes('ACCESS_DENIED')) return 'ajans.sertifikaErisim';
  if (m.includes('NOT_FOUND')) return 'ajans.ajansBulunamadi';
  return 'ajans.sertifikaHata';
}

function rpcHata(error: { message?: string } | null): never {
  throw new Error(i18n.t(hataAnahtari(error?.message ?? '')));
}

function sayi(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function AjansSertifikaDurumGetir(
  agencyId: string,
): Promise<AjansSertifikaDurum> {
  const { data, error } = await supabase.rpc('agency_owner_award_durum', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  const d = (data ?? {}) as Partial<AjansSertifikaDurum>;
  return {
    agency_id: String(d.agency_id ?? agencyId),
    agency_name: String(d.agency_name ?? ''),
    owner_name: String(d.owner_name ?? ''),
    members: sayi(d.members),
    live_minutes: sayi(d.live_minutes),
    coin_sales: sayi(d.coin_sales),
    member_threshold: sayi(d.member_threshold),
    live_minutes_threshold: sayi(d.live_minutes_threshold),
    coin_sales_threshold: sayi(d.coin_sales_threshold),
    gift_usd: sayi(d.gift_usd),
    ready: !!d.ready,
    issued_at: d.issued_at ? String(d.issued_at) : null,
    is_owner: !!d.is_owner,
  };
}

export async function AjansSertifikaAyarGetir(): Promise<AjansSertifikaAyar> {
  const { data, error } = await supabase.rpc('admin_agency_owner_award_oku');
  if (error) rpcHata(error);
  const d = (data ?? {}) as Partial<AjansSertifikaAyar>;
  return {
    member_threshold: sayi(d.member_threshold) || 100,
    live_minutes_threshold: sayi(d.live_minutes_threshold) || 1_000_000,
    coin_sales_threshold: sayi(d.coin_sales_threshold) || 50_000_000,
    gift_usd: sayi(d.gift_usd) || 1000,
  };
}

export async function AjansSertifikaAyarKaydet(
  ayar: AjansSertifikaAyar,
): Promise<void> {
  const { error } = await supabase.rpc('admin_agency_owner_award_ayarla', {
    p_members: ayar.member_threshold,
    p_minutes: ayar.live_minutes_threshold,
    p_coins: ayar.coin_sales_threshold,
    p_gift_usd: ayar.gift_usd,
  });
  if (error) rpcHata(error);
}
