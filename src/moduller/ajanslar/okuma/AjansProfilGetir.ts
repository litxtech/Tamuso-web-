import { supabase } from '../../../lib/supabase';
import { DepoyaMedyaYukle, MedyaUzantisiCoz } from '../../../ortak/medya/DepoyaMedyaYukle';
import { UlkeKodunaNormalizeEt } from '../../../ortak/ulke/UlkeKodunaNormalizeEt';
import { ProfilMedyasiSec } from '../../kullanici-profili/islemler/ProfilMedyasiYukle';

export type AjansListeKart = {
  id: string;
  agency_public_id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  slogan: string | null;
  country: string | null;
  description: string | null;
  level_code: string | null;
  host_count: number;
  total_gifts: number;
  monthly_score: number;
  trust_tier: string;
  is_coin_distributor: boolean;
  status: string;
  owner_id: string;
  uye_sayisi: number;
  haftalik_coin: number;
  toplam_coin: number;
};

export type AjansProfilYayinci = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
  joined_at: string | null;
  yayin_dakika: number;
  ses_dakika: number;
  kazanc_elmas: number;
  haftalik_coin: number;
  oyun_kazanc_coin: number;
  oyun_oturum: number;
};

export type AjansProfil = {
  agency: {
    id: string;
    agency_public_id: string;
    name: string;
    username?: string | null;
    is_verified?: boolean;
    logo_url: string | null;
    banner_url: string | null;
    slogan: string | null;
    website_url: string | null;
    country: string | null;
    description: string | null;
    level_code: string | null;
    host_count: number;
    total_gifts: number;
    monthly_score: number;
    trust_tier: string;
    is_coin_distributor: boolean;
    status: string;
    owner_id: string;
    invite_code: string | null;
    created_at: string;
  };
  owner: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    public_user_id: string | null;
  } | null;
  ben_sahibiyim: boolean;
  istatistik: {
    uye_sayisi: number;
    toplam_coin: number;
    haftalik_coin: number;
    aylik_coin: number;
    yayin_dakika_toplam: number;
    yayin_dakika_ay: number;
    ses_dakika_toplam: number;
    oyun_kazanc_coin: number;
    oyun_oturum: number;
  };
  yayincilar: AjansProfilYayinci[];
};

export async function AjansListesiModernGetir(
  limit = 40,
): Promise<AjansListeKart[]> {
  const { data, error } = await supabase.rpc('ajans_listesi_modern', {
    p_limit: limit,
  });
  if (error) throw error;
  return (data as AjansListeKart[]) ?? [];
}

export async function AjansProfilGetir(
  agencyId: string,
): Promise<AjansProfil> {
  const { data, error } = await supabase.rpc('ajans_profil_getir', {
    p_agency_id: agencyId,
  });
  if (error) throw error;
  return data as AjansProfil;
}

export async function AjansProfilGuncelle(input: {
  agencyId: string;
  name?: string;
  description?: string;
  slogan?: string;
  country?: string;
  websiteUrl?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
}): Promise<{ ok: boolean; hata?: string }> {
  const country =
    input.country === undefined
      ? null
      : UlkeKodunaNormalizeEt(input.country) ??
        (input.country.trim() ? input.country.trim() : null);
  const { error } = await supabase.rpc('ajans_profil_guncelle', {
    p_agency_id: input.agencyId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
    p_slogan: input.slogan ?? null,
    p_country: country,
    p_website_url: input.websiteUrl ?? null,
    p_logo_url: input.logoUrl === undefined ? null : input.logoUrl,
    p_banner_url: input.bannerUrl === undefined ? null : input.bannerUrl,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

/** Logo veya banner seçip storage'a yükler; ajans profilini günceller. */
export async function AjansMedyaYukle(input: {
  agencyId: string;
  tur: 'logo' | 'banner';
}): Promise<{ ok: true; url: string } | { ok: false; hata: string; iptal?: boolean }> {
  const secim = await ProfilMedyasiSec(input.tur === 'logo' ? 'avatar' : 'cover');
  if (!secim.ok) return secim;

  try {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return { ok: false, hata: 'Oturum yok' };

    const ext = MedyaUzantisiCoz(
      secim.medya.uri,
      secim.medya.mimeType,
      'jpg',
    );
    const path = `${uid}/agency-${input.agencyId}-${input.tur}-${Date.now()}.${ext}`;

    const up = await DepoyaMedyaYukle(supabase, {
      bucket: 'profile-media',
      path,
      uri: secim.medya.uri,
      mime: secim.medya.mimeType,
      tur: 'image',
      upsert: true,
    });
    if (!up.ok) return { ok: false, hata: up.hata };

    const { data: pub } = supabase.storage.from('profile-media').getPublicUrl(up.path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;

    const r = await AjansProfilGuncelle({
      agencyId: input.agencyId,
      ...(input.tur === 'logo' ? { logoUrl: url } : { bannerUrl: url }),
    });
    if (!r.ok) return { ok: false, hata: r.hata ?? 'Kaydedilemedi' };
    return { ok: true, url };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : String(e) };
  }
}
