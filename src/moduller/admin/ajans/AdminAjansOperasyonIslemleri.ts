import { supabase } from '../../../lib/supabase';

export const AJANS_OZELLIK_KILITLERI = [
  { key: 'sale_links', label: 'Satış linkleri' },
  { key: 'sales_ops', label: 'Satış takibi' },
  { key: 'coin_transfer', label: 'Coin transfer' },
  { key: 'invites', label: 'Davetler' },
  { key: 'applications', label: 'Başvurular' },
  { key: 'invoices', label: 'Faturalar' },
  { key: 'packages', label: 'Paketler' },
  { key: 'announcements', label: 'Duyurular' },
  { key: 'rooms', label: 'Ses odaları' },
  { key: 'live', label: 'Canlı yayın' },
  { key: 'gift_earn', label: 'Satış hediyesi' },
  { key: 'wallet_ops', label: 'Cüzdan işlemleri' },
] as const;

export type AjansOzellikKey = (typeof AJANS_OZELLIK_KILITLERI)[number]['key'];

export type AdminAjansOperasyonOzeti = {
  ok: boolean;
  agency: Record<string, unknown>;
  wallet: Record<string, unknown>;
  locks: {
    ok?: boolean;
    status?: string;
    trust_tier?: string;
    is_coin_distributor?: boolean;
    earnings_penalty_pct?: number;
    gift_earn_disabled?: boolean;
    admin_note?: string | null;
    wallet_frozen?: boolean;
    wallet_frozen_reason?: string | null;
    locks?: Record<string, boolean>;
    lock_details?: Array<{
      feature_key: string;
      locked: boolean;
      reason?: string | null;
      locked_at?: string;
    }>;
  };
  sales: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
  invites: Array<Record<string, unknown>>;
  sanctions: Array<Record<string, unknown>>;
  top_buyers: Array<{
    buyer_id?: string | null;
    buyer_name?: string;
    toplam_try?: number;
    toplam_coin?: number;
    islem_adet?: number;
  }>;
  ciro: {
    toplam_try?: number;
    toplam_coin?: number;
    islem_adet?: number;
  };
};

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message ?? 'İşlem başarısız');
}

export async function AdminAjansOperasyonOzetiGetir(
  agencyId: string,
): Promise<AdminAjansOperasyonOzeti> {
  const { data, error } = await supabase.rpc('admin_ajans_operasyon_ozeti', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return data as AdminAjansOperasyonOzeti;
}

export async function AdminAjansDurumAyarla(input: {
  agencyId: string;
  status?: string | null;
  trustTier?: string | null;
  adminNote?: string | null;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_ajans_durum_ayarla', {
    p_agency_id: input.agencyId,
    p_status: input.status ?? null,
    p_trust_tier: input.trustTier ?? null,
    p_admin_note: input.adminNote ?? null,
    p_reason: input.reason ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminAjansOzellikKilidi(input: {
  agencyId: string;
  featureKey: string;
  locked: boolean;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_ajans_ozellik_kilidi', {
    p_agency_id: input.agencyId,
    p_feature_key: input.featureKey,
    p_locked: input.locked,
    p_reason: input.reason ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminAjansCuzdanDondur(input: {
  agencyId: string;
  frozen: boolean;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_ajans_cuzdan_dondur', {
    p_agency_id: input.agencyId,
    p_frozen: input.frozen,
    p_reason: input.reason ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminAjansKazancCezasi(input: {
  agencyId: string;
  penaltyPct?: number | null;
  giftEarnDisabled?: boolean | null;
  reason?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_ajans_kazanc_cezasi', {
    p_agency_id: input.agencyId,
    p_penalty_pct: input.penaltyPct ?? null,
    p_gift_earn_disabled: input.giftEarnDisabled ?? null,
    p_reason: input.reason ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminAjansCoinCezasi(input: {
  agencyId: string;
  coins: number;
  reason?: string | null;
}): Promise<{ balance_after: number; deducted: number }> {
  const { data, error } = await supabase.rpc('admin_ajans_coin_cezasi', {
    p_agency_id: input.agencyId,
    p_coins: input.coins,
    p_reason: input.reason ?? null,
  });
  if (error) rpcHata(error);
  return data as { balance_after: number; deducted: number };
}

export async function AdminAjansYaptirimKaldir(
  sanctionId: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_ajans_yaptirim_kaldir', {
    p_sanction_id: sanctionId,
    p_note: note ?? null,
  });
  if (error) rpcHata(error);
}

export async function AdminAjansSatisLinkiAktiflik(input: {
  agencyId: string;
  linkId: string;
  isActive: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('admin_ajans_satis_linki_aktiflik', {
    p_agency_id: input.agencyId,
    p_id: input.linkId,
    p_is_active: input.isActive,
  });
  if (error) rpcHata(error);
}

export async function AdminAjansDavetIptal(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_ajans_davet_iptal', {
    p_invite_id: inviteId,
  });
  if (error) rpcHata(error);
}

/** Ajans tarafı — özellik kilitlerini oku (build gerekmez) */
export async function AjansOzellikKilitleriGetir(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_ozellik_kilitleri', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return data as AdminAjansOperasyonOzeti['locks'];
}
