import { supabase } from '../../../lib/supabase';
import { AdminKullaniciDosyasiGetir } from '../kullanici/okuma/AdminKullaniciOkuma';
import type { AdminKullaniciDosyasi } from '../kullanici/tipler';

export type AdminKycBasvuru = {
  id: string;
  user_id: string;
  status: string;
  doc_type: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  hometown: string | null;
  phone_e164: string | null;
  email: string | null;
  country: string | null;
  nationality: string | null;
  doc_front_path: string;
  doc_back_path: string | null;
  selfie_path: string;
  liveness_passed: boolean;
  liveness_meta: Record<string, unknown> | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at?: string | null;
  profiles?: {
    display_name: string | null;
    username: string | null;
    public_user_id?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type AdminKycCuzdanHesap = {
  wallet_number: string | null;
  wallet_brand_name: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
  kyc_status: string | null;
};

export type AdminKycDetay = {
  basvuru: AdminKycBasvuru;
  cuzdan: AdminKycCuzdanHesap | null;
  dosya: AdminKullaniciDosyasi | null;
  belgeler: {
    on: string | null;
    arka: string | null;
    selfie: string | null;
  };
};

function profilNormalize(
  raw: unknown,
): AdminKycBasvuru['profiles'] {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw[0] as AdminKycBasvuru['profiles'];
    return first ?? null;
  }
  return raw as AdminKycBasvuru['profiles'];
}

function satirlariNormalize(rows: AdminKycBasvuru[]): AdminKycBasvuru[] {
  return rows.map((r) => ({
    ...r,
    profiles: profilNormalize((r as { profiles?: unknown }).profiles),
  }));
}

export async function AdminKycListesi(
  limit = 40,
): Promise<AdminKycBasvuru[]> {
  const { data, error } = await supabase
    .from('kyc_applications')
    .select(
      '*, profiles!kyc_applications_user_id_fkey(display_name, username, public_user_id, avatar_url)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    const fallback = await supabase
      .from('kyc_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (fallback.error) throw new Error(fallback.error.message);
    return ((fallback.data as AdminKycBasvuru[]) ?? []).map((r) => ({
      ...r,
      profiles: null,
    }));
  }

  return satirlariNormalize((data as AdminKycBasvuru[]) ?? []);
}

export async function AdminKycBasvuruGetir(
  id: string,
): Promise<AdminKycBasvuru | null> {
  const { data, error } = await supabase
    .from('kyc_applications')
    .select(
      '*, profiles!kyc_applications_user_id_fkey(display_name, username, public_user_id, avatar_url)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    const fallback = await supabase
      .from('kyc_applications')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data
      ? { ...(fallback.data as AdminKycBasvuru), profiles: null }
      : null;
  }
  if (!data) return null;
  return satirlariNormalize([data as AdminKycBasvuru])[0] ?? null;
}

export async function AdminKycBelgeUrl(
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('kyc-docs')
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function belgeUrlGuvenli(path: string | null | undefined) {
  if (!path) return null;
  return AdminKycBelgeUrl(path);
}

export async function AdminKycDetayGetir(
  id: string,
): Promise<AdminKycDetay> {
  const basvuru = await AdminKycBasvuruGetir(id);
  if (!basvuru) throw new Error('Başvuru bulunamadı');

  const [cuzdanRes, dosya, on, arka, selfie] = await Promise.all([
    supabase
      .from('wallet_accounts')
      .select(
        'wallet_number, wallet_brand_name, legal_first_name, legal_last_name, kyc_status',
      )
      .eq('user_id', basvuru.user_id)
      .maybeSingle(),
    AdminKullaniciDosyasiGetir(basvuru.user_id).catch(() => null),
    belgeUrlGuvenli(basvuru.doc_front_path),
    belgeUrlGuvenli(basvuru.doc_back_path),
    belgeUrlGuvenli(basvuru.selfie_path),
  ]);

  return {
    basvuru,
    cuzdan: (cuzdanRes.data as AdminKycCuzdanHesap | null) ?? null,
    dosya: dosya?.ok === false ? null : dosya,
    belgeler: { on, arka, selfie },
  };
}

export async function AdminKycBasvuruSil(id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_kyc_basvuru_sil', { p_id: id });
  if (error) throw new Error(error.message);
}

export async function AdminKycDurumGuncelle(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_kyc_durum_guncelle', {
    p_id: id,
    p_status: status,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
}
