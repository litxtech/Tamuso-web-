import { createClient } from 'npm:@supabase/supabase-js@2';
import { r2EnvOku, r2Imza } from '../_shared/studio/r2.ts';

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  if (req.method !== 'POST') return json({ ok: false, code: 'METHOD' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ ok: false, code: 'UNAUTHORIZED' }, 401);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anon || !service) return json({ ok: false, code: 'CONFIG_ERROR' }, 500);

  const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: auth } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ ok: false, code: 'UNAUTHORIZED' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: 'BAD_JSON' }, 400);
  }

  const admin = createClient(supabaseUrl, service);
  const { data: bayrak } = await admin.from('feature_flags').select('enabled').eq('key', 'game_publishing_enabled').maybeSingle();
  if (!(bayrak as { enabled?: boolean } | null)?.enabled) {
    return json(String(body.action) === 'published' ? { ok: true, games: [] } : { ok: false, code: 'PUBLISH_DISABLED' }, String(body.action) === 'published' ? 200 : 403);
  }

  const action = String(body.action ?? 'published');
  const env = r2EnvOku();

  if (action === 'published') {
    const { data } = await admin.from('creator_games')
      .select('id, title, thumbnail_r2_key, published_at')
      .eq('runtime_type', 'tamuso_game_v2')
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false })
      .limit(40);
    const games = [];
    for (const row of (data ?? []) as { id: string; title: string | null; thumbnail_r2_key: string | null }[]) {
      const coverUrl = env && row.thumbnail_r2_key ? await r2Imza(env, row.thumbnail_r2_key) : null;
      games.push({ id: row.id, title: row.title || '', coverUrl });
    }
    return json({ ok: true, games });
  }

  const gameId = String(body.gameId ?? '').trim();
  if (!gameId) return json({ ok: false, code: 'BAD_GAME' }, 400);
  const { data } = await admin.from('creator_games').select('*').eq('id', gameId).eq('runtime_type', 'tamuso_game_v2').eq('status', 'PUBLISHED').maybeSingle();
  const game = data as { title?: string | null; manifest?: unknown; thumbnail_r2_key?: string | null } | null;
  if (!game) return json({ ok: false, code: 'NOT_PUBLISHED' }, 404);
  const { data: assets } = await admin.from('creator_game_assets').select('asset_key, r2_key').eq('game_id', gameId).eq('status', 'READY');
  const urls: Record<string, string> = {};
  const hosts = new Set<string>();
  if (env) {
    for (const row of (assets ?? []) as { asset_key: string; r2_key: string | null }[]) {
      if (!row.r2_key) continue;
      const url = await r2Imza(env, row.r2_key);
      if (!url) continue;
      urls[row.asset_key] = url;
      hosts.add(new URL(url).hostname);
    }
    if (game.thumbnail_r2_key) {
      const url = await r2Imza(env, game.thumbnail_r2_key);
      if (url) {
        urls.__thumbnail = url;
        hosts.add(new URL(url).hostname);
      }
    }
  }
  return json({
    ok: true,
    title: game.title,
    manifest: game.manifest ?? null,
    urls,
    allowedHosts: [...hosts],
  });
});
