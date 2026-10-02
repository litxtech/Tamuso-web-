const MESHY = 'https://api.meshy.ai';

export type MeshyGorev = {
  id: string;
  status: string;
  progress: number;
  error: string;
  glbUrl: string | null;
  thumbnailUrl: string | null;
  textureUrl: string | null;
  rigGlbUrl: string | null;
  walkGlbUrl: string | null;
  animationGlbUrl: string | null;
};

type Hata = { ok: false; code: string; status?: number };

function anahtar(key: string): HeadersInit {
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function oku(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function sonucId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const result = (data as { result?: unknown }).result;
  return typeof result === 'string' && result.length > 8 ? result : null;
}

export async function meshyOnizlemeOlustur(key: string, prompt: string): Promise<{ ok: true; id: string } | Hata> {
  const res = await fetch(`${MESHY}/openapi/v2/text-to-3d`, {
    method: 'POST',
    headers: anahtar(key),
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      mode: 'preview',
      prompt: prompt.slice(0, 800),
      model_type: 'smart-topology',
      ai_model: 'meshy-t2',
      target_polycount: 4000,
      target_formats: ['glb'],
      moderation: true,
    }),
  });
  const data = await oku(res);
  if (!res.ok) return { ok: false, code: res.status === 402 ? 'MESHY_QUOTA' : 'MESHY_CREATE', status: res.status };
  const id = sonucId(data);
  if (!id) return { ok: false, code: 'MESHY_CREATE' };
  return { ok: true, id };
}

export async function meshyDokuOlustur(key: string, previewTaskId: string, texturePrompt: string): Promise<{ ok: true; id: string } | Hata> {
  const body: Record<string, unknown> = {
    mode: 'refine',
    preview_task_id: previewTaskId,
    enable_pbr: false,
    texture_resolution: '2k',
  };
  if (texturePrompt.trim()) body.texture_prompt = texturePrompt.slice(0, 800);
  const res = await fetch(`${MESHY}/openapi/v2/text-to-3d`, {
    method: 'POST',
    headers: anahtar(key),
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify(body),
  });
  const data = await oku(res);
  if (!res.ok) return { ok: false, code: 'MESHY_REFINE', status: res.status };
  const id = sonucId(data);
  if (!id) return { ok: false, code: 'MESHY_REFINE' };
  return { ok: true, id };
}

export async function meshyIskeletOlustur(key: string, inputTaskId: string): Promise<{ ok: true; id: string } | Hata> {
  const res = await fetch(`${MESHY}/openapi/v1/rigging`, {
    method: 'POST',
    headers: anahtar(key),
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({ input_task_id: inputTaskId, height_meters: 1.8 }),
  });
  const data = await oku(res);
  if (!res.ok) return { ok: false, code: 'MESHY_RIG', status: res.status };
  const id = sonucId(data);
  if (!id) return { ok: false, code: 'MESHY_RIG' };
  return { ok: true, id };
}

export async function meshyAnimasyonOlustur(
  key: string,
  rigTaskId: string,
  actionId: number,
): Promise<{ ok: true; id: string } | Hata> {
  const res = await fetch(`${MESHY}/openapi/v1/animations`, {
    method: 'POST',
    headers: anahtar(key),
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({ rig_task_id: rigTaskId, action_id: actionId }),
  });
  const data = await oku(res);
  if (!res.ok) return { ok: false, code: 'MESHY_ANIMATION', status: res.status };
  const id = sonucId(data);
  if (!id) return { ok: false, code: 'MESHY_ANIMATION' };
  return { ok: true, id };
}

function metinHata(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const task = (data as { task_error?: { message?: string } }).task_error;
  return String(task?.message ?? '').slice(0, 180);
}

function urlAl(v: unknown): string | null {
  return typeof v === 'string' && v.startsWith('https://') ? v : null;
}

export function meshyHostuGuvenli(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'assets.meshy.ai' || host.endsWith('.meshy.ai');
  } catch {
    return false;
  }
}

export async function meshyGorevOku(key: string, kind: 'text' | 'rig' | 'animation', id: string): Promise<MeshyGorev | Hata> {
  const path = kind === 'text'
    ? `/openapi/v2/text-to-3d/${id}`
    : kind === 'rig'
    ? `/openapi/v1/rigging/${id}`
    : `/openapi/v1/animations/${id}`;
  let res: Response;
  try {
    res = await fetch(`${MESHY}${path}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, code: 'MESHY_TIMEOUT' };
  }
  const data = await oku(res);
  if (!res.ok || !data || typeof data !== 'object') {
    return { ok: false, code: 'MESHY_STATUS', status: res.status };
  }
  const row = data as Record<string, unknown>;
  const modelUrls = (row.model_urls ?? {}) as Record<string, unknown>;
  const textures = Array.isArray(row.texture_urls) ? row.texture_urls[0] as Record<string, unknown> | undefined : undefined;
  const result = (row.result ?? {}) as Record<string, unknown>;
  const basic = (result.basic_animations ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? id),
    status: String(row.status ?? ''),
    progress: Number(row.progress ?? 0),
    error: metinHata(data),
    glbUrl: urlAl(modelUrls.glb),
    thumbnailUrl: urlAl(row.thumbnail_url),
    textureUrl: urlAl(textures?.base_color),
    rigGlbUrl: urlAl(result.rigged_character_glb_url),
    walkGlbUrl: urlAl(basic.walking_glb_url),
    animationGlbUrl: urlAl(result.animation_glb_url),
  };
}

export async function meshyDosyaIndir(url: string): Promise<{ ok: true; bytes: Uint8Array; mime: string } | Hata> {
  if (!meshyHostuGuvenli(url)) return { ok: false, code: 'MESHY_URL' };
  const kontrol = new AbortController();
  const zaman = setTimeout(() => kontrol.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: kontrol.signal });
    if (!res.ok) return { ok: false, code: 'MESHY_DOWNLOAD', status: res.status };
    const govde = await Promise.race([
      res.arrayBuffer(),
      new Promise<never>((_, reject) => setTimeout(() => {
        kontrol.abort();
        reject(new Error('SURE'));
      }, 12_000)),
    ]);
    const bytes = new Uint8Array(govde);
    const mime = res.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream';
    return { ok: true, bytes, mime };
  } catch {
    return { ok: false, code: 'MESHY_TIMEOUT' };
  } finally {
    clearTimeout(zaman);
  }
}
