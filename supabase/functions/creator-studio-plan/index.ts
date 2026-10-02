import { createClient } from 'npm:@supabase/supabase-js@2';
import { deepseekChat, json } from '../_shared/deepseek/helpers.ts';

type Plan = {
  title: string;
  summary: string;
  genre: string;
  kind: 'hidden_pick' | 'choice';
  startScore: number;
  endBelow: number | null;
  rounds: number;
  shuffle: boolean;
  items: { label: string; detail: string; delta: number }[];
};

function sayi(v: unknown, yedek: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : yedek;
}

function temizPlan(raw: unknown): Plan | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? '').trim().slice(0, 80);
  const summary = String(o.summary ?? '').trim().slice(0, 500);
  if (!title || !summary) return null;
  const gelen = Array.isArray(o.items) ? o.items.slice(0, 12) : [];
  const items = gelen
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        label: String(row.label ?? '').trim().slice(0, 40),
        detail: String(row.detail ?? '').trim().slice(0, 160),
        delta: sayi(row.delta, 0),
      };
    })
    .filter((item) => item.label.length > 0);
  if (items.length < 2) return null;
  const endRaw = o.endBelow;
  const endBelow = endRaw == null || endRaw === '' ? null : sayi(endRaw, 0);
  return {
    title,
    summary,
    genre: String(o.genre ?? '').trim().slice(0, 40),
    kind: o.kind === 'choice' ? 'choice' : 'hidden_pick',
    startScore: sayi(o.startScore, 0),
    endBelow,
    rounds: Math.min(30, Math.max(1, sayi(o.rounds, 8))),
    shuffle: o.shuffle !== false,
    items,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }
  if (req.method !== 'POST') return json({ ok: false, code: 'METHOD' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ ok: false, code: 'UNAUTHORIZED' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim();
  if (!supabaseUrl || !anon || !service) return json({ ok: false, code: 'CONFIG_ERROR' }, 500);

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ ok: false, code: 'UNAUTHORIZED' }, 401);

  let body: { gameId?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: 'BAD_JSON' }, 400);
  }
  const gameId = String(body.gameId ?? '').trim();
  if (!gameId) return json({ ok: false, code: 'BAD_GAME' }, 400);

  const { data: oyun, error: oyunHata } = await userClient.rpc('creator_oyun_oku', { p_id: gameId });
  if (oyunHata || !oyun) return json({ ok: false, code: 'FORBIDDEN' }, 403);
  const kayit = oyun as { prompt?: string; options?: Record<string, unknown> };
  const prompt = String(kayit.prompt ?? '').trim();
  if (prompt.length < 3) return json({ ok: false, code: 'EMPTY' }, 400);

  const admin = createClient(supabaseUrl, service);
  const { data: jobId, error: jobHata } = await admin.rpc('creator_studio_plan_baslat', {
    p_game_id: gameId,
    p_user_id: userData.user.id,
  });
  if (jobHata || !jobId) {
    const msg = jobHata?.message ?? '';
    const code = msg.includes('QUOTA')
      ? 'QUOTA'
      : msg.includes('AI_DISABLED')
        ? 'AI_DISABLED'
        : msg.includes('ALREADY_RUNNING')
          ? 'ALREADY_RUNNING'
          : 'JOB_ERROR';
    return json({ ok: false, code }, code === 'AI_DISABLED' ? 403 : 429);
  }

  const fail = async (code: string) => {
    await admin.rpc('creator_studio_plan_bitir', {
      p_job_id: jobId,
      p_user_id: userData.user.id,
      p_plan: null,
      p_hata: code,
    });
    return json({ ok: false, code }, 502);
  };

  if (!apiKey) return fail('CONFIG_ERROR');

  const dil = String(body.language ?? 'en').slice(0, 8);
  const ai = await deepseekChat({
    apiKey,
    temperature: 0.4,
    maxTokens: 1400,
    jsonMode: true,
    system:
      'Turn the user prompt into ONE playable mobile game as JSON. Do not write a design document. Copy the user numbers exactly. kind is hidden_pick when outcomes stay secret until chosen, otherwise choice. Fields: title, summary, genre, kind, startScore, endBelow (number or null), rounds, shuffle, items (2 to 12). Each item has label, detail, delta (integer, negative allowed). No code, SQL, URLs, or extra keys. All text in language: ' +
      dil,
    user: JSON.stringify({
      prompt,
      options: kayit.options ?? {},
    }),
  });
  if (!ai.ok) return fail(ai.code);

  let plan: Plan | null = null;
  try {
    plan = temizPlan(JSON.parse(ai.content));
  } catch {
    plan = null;
  }
  if (!plan) return fail('BAD_PLAN');

  const { error: bitirHata } = await admin.rpc('creator_studio_plan_bitir', {
    p_job_id: jobId,
    p_user_id: userData.user.id,
    p_plan: plan,
    p_hata: null,
  });
  if (bitirHata) return json({ ok: false, code: 'SAVE_ERROR' }, 500);
  return json({ ok: true, plan });
});
