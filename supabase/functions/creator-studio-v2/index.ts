import { createClient } from 'npm:@supabase/supabase-js@2';
import { json } from '../_shared/deepseek/helpers.ts';
import { v2Adim, v2Adresler, v2BasarisizYenile, v2Baslat, v2CanliAdres, v2Devam, v2Durdur, v2GeriAl, v2Gorsel, v2Ilerleme, v2Kapaklar, v2Tekrar, v2Yama, v2YayinIste, v2YayinListe, v2Yukle } from '../_shared/studio/orkestrator.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
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
  const action = String(body.action ?? 'tick');
  const language = String(body.language ?? 'en').slice(0, 8);
  const admin = createClient(supabaseUrl, service);
  const userId = userData.user.id;
  if (action === 'thumbs') return v2Kapaklar(admin, userId);
  if (action === 'published') return v2YayinListe(admin);

  const gameId = String(body.gameId ?? '').trim();
  if (!gameId) return json({ ok: false, code: 'BAD_GAME' }, 400);

  if (action === 'start') return v2Baslat(admin, userId, gameId, language);
  if (action === 'stop') return v2Durdur(admin, userId, gameId);
  if (action === 'resume') return v2Devam(admin, userId, gameId);
  if (action === 'retry') return v2Tekrar(admin, userId, gameId);
  if (action === 'retry_failed') return v2BasarisizYenile(admin, userId, gameId);
  if (action === 'patch') return v2Yama(admin, userId, gameId, String(body.request ?? ''), language);
  if (action === 'undo') return v2GeriAl(admin, userId, gameId);
  if (action === 'urls') return v2Adresler(admin, userId, gameId);
  if (action === 'play') return v2CanliAdres(admin, gameId);
  if (action === 'upload') {
    return v2Yukle(admin, userId, gameId, {
      name: String(body.name ?? ''),
      mime: String(body.mime ?? ''),
      data: String(body.data ?? ''),
    });
  }
  if (action === 'publish') return v2YayinIste(admin, userId, gameId);
  if (action === 'cover') {
    return v2Gorsel(admin, gameId, userId, String(body.slot ?? ''), String(body.mime ?? ''), String(body.data ?? ''), 'creator');
  }
  if (action === 'admin_cover') {
    const { data: adminMi } = await userClient.rpc('ben_admin_miyim');
    if (!adminMi) return json({ ok: false, code: 'FORBIDDEN' }, 403);
    return v2Gorsel(admin, gameId, userId, String(body.slot ?? ''), String(body.mime ?? ''), String(body.data ?? ''), 'admin');
  }
  if (action === 'admin_urls') {
    const { data: adminMi } = await userClient.rpc('ben_admin_miyim');
    if (!adminMi) return json({ ok: false, code: 'FORBIDDEN' }, 403);
    const { data: sahip } = await admin.from('creator_games').select('creator_id').eq('id', gameId).maybeSingle();
    const creatorId = (sahip as { creator_id?: string } | null)?.creator_id;
    if (!creatorId) return json({ ok: false, code: 'FORBIDDEN' }, 403);
    return v2Adresler(admin, creatorId, gameId);
  }

  const { data } = await admin.from('creator_games').select('*').eq('id', gameId).eq('creator_id', userId).maybeSingle();
  if (!data) return json({ ok: false, code: 'FORBIDDEN' }, 403);
  const adim = v2Adim(admin, userId, data as Record<string, unknown>);
  const kuyruk = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (kuyruk?.waitUntil) kuyruk.waitUntil(adim);
  else await adim;
  return json({ ok: true, ...(await v2Ilerleme(admin, data as Record<string, unknown>)) });
});
