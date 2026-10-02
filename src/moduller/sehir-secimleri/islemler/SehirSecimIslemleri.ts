import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';

export type SehirSecimGidisat = {
  election: {
    id: string;
    title: string;
    city_id: string;
    role_target: string;
    status: string;
    starts_at: string;
    ends_at: string;
    total_votes: number;
    tallied_at?: string | null;
  };
  city: { id: string; name: string; slug: string; country_code: string } | null;
  winner: {
    user_id: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
  } | null;
  my_vote_candidate_id: string | null;
  candidates: Array<{
    id: string;
    user_id: string;
    manifesto: string | null;
    vote_count: number;
    status: string;
    created_at: string;
    display_name: string;
    username: string | null;
    avatar_url: string | null;
    percent: number;
  }>;
};

export async function SehirAdayBasvurusu(input: {
  electionId: string;
  manifesto?: string;
}): Promise<{ ok: boolean; hata?: string }> {
  if (!(await OzellikBayragiAktifMiSunucu('city_elections_enabled'))) {
    return { ok: false, hata: i18n.t('sehir.secimlerKapali') };
  }
  const { error } = await supabase.rpc('sehir_aday_basvurusu', {
    p_election_id: input.electionId,
    p_manifesto: input.manifesto ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function SehirOyuKullan(input: {
  electionId: string;
  candidateId: string;
}): Promise<{ ok: boolean; hata?: string; total_votes?: number }> {
  if (!(await OzellikBayragiAktifMiSunucu('city_elections_enabled'))) {
    return { ok: false, hata: i18n.t('sehir.secimlerKapali') };
  }
  const { data, error } = await supabase.rpc('sehir_oyu_kullan', {
    p_election_id: input.electionId,
    p_candidate_id: input.candidateId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; total_votes?: number } | null;
  return { ok: true, total_votes: row?.total_votes };
}

export async function SehirSecimGidisatGetir(
  electionId: string,
): Promise<SehirSecimGidisat> {
  const { data, error } = await supabase.rpc('sehir_secim_gidisat', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return data as SehirSecimGidisat;
}

export async function AdminSehirSecimBaslat(input: {
  cityId: string;
  role?: 'leader' | 'vice_leader';
  hours?: number;
  title?: string;
  startVoting?: boolean;
}): Promise<{ ok: boolean; id?: string; hata?: string; notified?: number }> {
  const { data, error } = await supabase.rpc('admin_sehir_secim_baslat', {
    p_city_id: input.cityId,
    p_role: input.role ?? 'leader',
    p_hours: input.hours ?? 48,
    p_title: input.title ?? null,
    p_start_voting: input.startVoting ?? true,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; id?: string; notified?: number };
  return { ok: !!row?.ok, id: row?.id, notified: row?.notified };
}

export async function AdminSehirSecimOylamayaAc(
  electionId: string,
): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('admin_sehir_secim_oylamaya_ac', {
    p_election_id: electionId,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AdminSehirSecimSonuclandir(
  electionId: string,
): Promise<{ ok: boolean; hata?: string; winner_name?: string }> {
  const { data, error } = await supabase.rpc('admin_sehir_secim_sonuclandir', {
    p_election_id: electionId,
  });
  if (error) return { ok: false, hata: error.message };
  const row = data as { ok?: boolean; winner_name?: string };
  return { ok: !!row?.ok, winner_name: row?.winner_name };
}

export async function AdminSehirSecimListesi(): Promise<
  Array<{
    id: string;
    title: string;
    status: string;
    role_target: string;
    starts_at: string;
    ends_at: string;
    total_votes: number;
    city_name: string;
    city_id: string;
    winner_name?: string | null;
  }>
> {
  const { data, error } = await supabase.rpc('admin_sehir_secim_listesi', {
    p_limit: 50,
  });
  if (error) throw error;
  if (Array.isArray(data)) return data as any[];
  return [];
}

export async function TrSehirleriListesi(): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    plate_code: string | null;
    supporter_count: number;
    power_score: number;
  }>
> {
  const { data, error } = await supabase.rpc('tr_sehirleri_listesi');
  if (error) throw error;
  if (Array.isArray(data)) return data as any[];
  return [];
}

/** @deprecated */
export async function SehirSecimOlusturDev(input: {
  cityId: string;
  title?: string;
}): Promise<{ ok: boolean; hata?: string; id?: string }> {
  return AdminSehirSecimBaslat({
    cityId: input.cityId,
    title: input.title,
    startVoting: false,
  });
}

/** @deprecated */
export async function SehirSecimiOylamayaAcDev(
  electionId: string,
): Promise<{ ok: boolean; hata?: string }> {
  return AdminSehirSecimOylamayaAc(electionId);
}
