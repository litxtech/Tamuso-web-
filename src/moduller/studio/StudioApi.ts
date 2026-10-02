import { supabase } from '../../lib/supabase';
import { OrtamDegiskenleri } from '../../yapilandirma/OrtamDegiskenleri';

export type StudioDurum = {
  studio_enabled: boolean;
  new_game: boolean;
  ai: boolean;
  meshy: boolean;
  audio: boolean;
  preview: boolean;
  rewards: boolean;
  terms_version: number;
  accepted: boolean;
  terms: string;
};

export type StudioOyun = {
  id: string;
  title: string;
  prompt: string;
  status: string;
  updated_at: string;
  runtime_type?: string;
  error_code?: string | null;
  thumbnail_r2_key?: string | null;
  genre?: string | null;
  dimension?: string | null;
  assets_ready?: number;
  assets_total?: number;
  has_plan?: boolean;
  specification?: unknown;
  design?: {
    gameplay?: string[];
    world?: string[];
    player?: string[];
    camera?: string[];
    physics?: string[];
    audio?: string[];
    ui?: string[];
  } | null;
  scene_graph?: unknown;
  gameplay_graph?: unknown;
  manifest?: { runtime?: string; economy?: { testBalance?: number }; issues?: string[] } | null;
    plan?: {
      title?: string;
      summary?: string;
      genre?: string;
      kind?: 'hidden_pick' | 'choice' | string;
      startScore?: number;
      endBelow?: number | null;
      rounds?: number;
      shuffle?: boolean;
      items?: { label: string; detail: string; delta: number }[];
      assumptions?: string[];
      scenes?: { id: string; name: string; goal: string }[];
    } | null;
  options?: Record<string, unknown>;
};

function hataKodu(message: string) {
  if (message.includes('STUDIO_CLOSED')) return 'STUDIO_CLOSED';
  if (message.includes('TERMS_REQUIRED')) return 'TERMS_REQUIRED';
  if (message.includes('CREATE_DISABLED')) return 'CREATE_DISABLED';
  if (message.includes('QUOTA')) return 'QUOTA';
  if (message.includes('AI_DISABLED')) return 'AI_DISABLED';
  return 'HATA';
}

export async function StudioDurumAl(dil: string): Promise<StudioDurum | { kod: string }> {
  const { data, error } = await supabase.rpc('creator_studio_durum', { p_dil: dil });
  if (error) return { kod: hataKodu(error.message) };
  const d = data as StudioDurum;
  return {
    studio_enabled: !!d.studio_enabled,
    new_game: !!d.new_game,
    ai: !!d.ai,
    meshy: !!d.meshy,
    audio: !!d.audio,
    preview: !!d.preview,
    rewards: !!d.rewards,
    terms_version: Number(d.terms_version ?? 1),
    accepted: !!d.accepted,
    terms: String(d.terms ?? ''),
  };
}

export async function StudioKabulEt(): Promise<{ ok: true } | { ok: false; kod: string }> {
  const { error } = await supabase.rpc('creator_studio_kabul_et');
  if (error) return { ok: false, kod: hataKodu(error.message) };
  return { ok: true };
}

export async function StudioOyunKaydet(input: {
  id?: string | null;
  prompt: string;
  title: string;
  options: Record<string, unknown>;
}): Promise<{ ok: true; id: string } | { ok: false; kod: string }> {
  const { data, error } = await supabase.rpc('creator_oyun_kaydet', {
    p_id: input.id ?? null,
    p_prompt: input.prompt,
    p_options: input.options,
    p_title: input.title,
  });
  if (error) return { ok: false, kod: hataKodu(error.message) };
  const row = data as { id?: string };
  if (!row?.id) return { ok: false, kod: 'HATA' };
  return { ok: true, id: row.id };
}

export async function StudioOyunlarim(): Promise<StudioOyun[]> {
  const { data, error } = await supabase.rpc('creator_oyunlarim');
  if (error || !Array.isArray(data)) return [];
  return data as StudioOyun[];
}

export async function StudioOyunOku(id: string): Promise<StudioOyun | null> {
  const { data, error } = await supabase.rpc('creator_oyun_oku', { p_id: id });
  if (error || !data) return null;
  return data as StudioOyun;
}

export async function StudioPlanIste(gameId: string, language: string): Promise<{ ok: true } | { ok: false; kod: string }> {
  const base = OrtamDegiskenleri.supabaseUrl.replace(/\/$/, '');
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!base || !jwt) return { ok: false, kod: 'UNAUTHORIZED' };
  try {
    const res = await fetch(`${base}/functions/v1/creator-studio-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: OrtamDegiskenleri.supabaseAnonAnahtari,
      },
      body: JSON.stringify({ gameId, language }),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string };
    if (!res.ok || json.ok !== true) return { ok: false, kod: json.code ?? 'HATA' };
    return { ok: true };
  } catch {
    return { ok: false, kod: 'NETWORK' };
  }
}
