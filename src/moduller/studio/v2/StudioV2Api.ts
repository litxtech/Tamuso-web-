import { supabase } from '../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';

export type StudioFaz = {
  id: string;
  state: 'bekliyor' | 'oluyor' | 'bitti' | 'hata';
  detail: string;
};

export type StudioVarlik = {
  assetKey: string;
  type: string;
  provider: string;
  status: string;
  sizeBytes: number | null;
  pipeline: Record<string, unknown> | null;
  errorCode: string | null;
  required: boolean;
};

export type StudioV2Gorunum = {
  ok: boolean;
  code?: string;
  status?: string;
  errorCode?: string | null;
  runtimeType?: string;
  title?: string;
  version?: number;
  phases?: StudioFaz[];
  assets?: StudioVarlik[];
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
  scene?: unknown;
  gameplay?: unknown;
  manifest?: {
    runtime?: string;
    economy?: { mode?: string; testBalance?: number };
    issues?: string[];
  } | null;
  activity?: { kind: string; status: string; errorCode: string | null; at: string | null }[];
  eta?: {
    remainingSeconds: number;
    minSeconds: number;
    maxSeconds: number;
    confidence: 'measured' | 'low' | 'estimating' | 'unknown' | 'done' | 'stopped';
    calculatedAt: string;
    samples?: number;
  } | null;
  logs?: { at: string | null; level: string; step: string; code: string | null; detail: string | null }[];
  games?: { id: string; title: string; coverUrl: string | null }[];
  patch?: { summary?: string; operations?: { operation: string }[] };
  revision?: number;
  coverUrl?: string | null;
  avatarUrl?: string | null;
  pollAfterMs?: number;
};

async function cagir(body: Record<string, unknown>, fonksiyon = 'creator-studio-v2'): Promise<StudioV2Gorunum & { urls?: Record<string, string>; allowedHosts?: string[] }> {
  const base = OrtamDegiskenleri.supabaseUrl.replace(/\/$/, '');
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!base || !jwt) return { ok: false, code: 'UNAUTHORIZED' };
  try {
    const res = await fetch(`${base}/functions/v1/${fonksiyon}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
        apikey: OrtamDegiskenleri.supabaseAnonAnahtari,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as StudioV2Gorunum;
    if (!res.ok && json.ok !== true) {
      console.log('[studio]', res.status, json.code ?? 'HATA');
      return { ...json, ok: false, code: json.code ?? 'HATA' };
    }
    return json;
  } catch (err) {
    console.log('[studio]', err instanceof Error ? err.message : 'NETWORK');
    return { ok: false, code: 'NETWORK' };
  }
}

export function StudioV2Kaydet(input: {
  id?: string | null;
  prompt: string;
  title?: string;
  options: Record<string, unknown>;
}) {
  return supabase.rpc('creator_v2_kaydet', {
    p_id: input.id ?? null,
    p_prompt: input.prompt,
    p_options: input.options,
    p_title: input.title ?? '',
  });
}

export function StudioV2Baslat(gameId: string, language: string) {
  return cagir({ action: 'start', gameId, language });
}

export function StudioV2Adim(gameId: string) {
  return cagir({ action: 'tick', gameId });
}

export function StudioV2Tekrar(gameId: string) {
  return cagir({ action: 'retry', gameId });
}

export function StudioV2Basarisiz(gameId: string) {
  return cagir({ action: 'retry_failed', gameId });
}

export function StudioV2Yama(gameId: string, request: string, language: string) {
  return cagir({ action: 'patch', gameId, request, language });
}

export function StudioV2GeriAl(gameId: string) {
  return cagir({ action: 'undo', gameId });
}

export function StudioV2Adresler(gameId: string) {
  return cagir({ action: 'urls', gameId });
}

export function StudioV2Yayindaki() {
  return cagir({ action: 'published' }, 'creator-studio-play');
}

export function StudioV2Canli(gameId: string) {
  return cagir({ action: 'play', gameId }, 'creator-studio-play');
}

export function StudioV2Yukle(gameId: string, name: string, mime: string, data: string) {
  return cagir({ action: 'upload', gameId, name, mime, data });
}

export function StudioV2Kapaklar() {
  return cagir({ action: 'thumbs' });
}

export function StudioV2Durdur(gameId: string) {
  return cagir({ action: 'stop', gameId });
}

export function StudioV2Devam(gameId: string) {
  return cagir({ action: 'resume', gameId });
}

export function StudioV2Yayin(gameId: string) {
  return cagir({ action: 'publish', gameId });
}

export function StudioV2AdminAdres(gameId: string) {
  return cagir({ action: 'admin_urls', gameId });
}

export function StudioV2Gorsel(gameId: string, slot: 'cover' | 'avatar', mime: string, data: string) {
  return cagir({ action: 'cover', gameId, slot, mime, data });
}

export function StudioV2AdminGorsel(gameId: string, slot: 'cover' | 'avatar', mime: string, data: string) {
  return cagir({ action: 'admin_cover', gameId, slot, mime, data });
}
