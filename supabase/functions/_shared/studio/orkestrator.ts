import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { json } from '../deepseek/helpers.ts';
import { derleOyun } from './derleyici.ts';
import { glbDogrula, gorselDogrula, sesDogrula, sha256 } from './dosya.ts';
import { elevenMuzikOlustur, elevenSesOlustur, elevenSfxOlustur } from './elevenlabs.ts';
import { meshyAnimasyonOlustur, meshyDosyaIndir, meshyDokuOlustur, meshyGorevOku, meshyIskeletOlustur, meshyOnizlemeOlustur } from './meshy.ts';
import { oyunAnahtari, r2EnvOku, r2Imza, r2Yukle, type R2Env } from './r2.ts';
import { guvenlikTara, type AssetPlan, type GameSpecification, type StudioPaket } from './sozlesme.ts';
import { yamaUygula } from './yama.ts';
import { yamaCagir, yonetmenCagir } from './yonetmen.ts';

type Db = SupabaseClient;
type Satir = Record<string, unknown>;

const CALISAN = ['PLANNING', 'GENERATING_ASSETS', 'BUILDING_SCENE', 'BUILDING_GAMEPLAY', 'SCANNING'];

async function bayrak(db: Db, key: string): Promise<boolean> {
  const { data } = await db.from('feature_flags').select('enabled').eq('key', key).maybeSingle();
  return !!(data as { enabled?: boolean } | null)?.enabled;
}

async function oyunAl(db: Db, gameId: string, userId: string): Promise<Satir | null> {
  const { data } = await db.from('creator_games').select('*').eq('id', gameId).eq('creator_id', userId).maybeSingle();
  return (data as Satir | null) ?? null;
}

async function gunluk(db: Db, gameId: string, level: 'info' | 'warn' | 'error', step: string, code: string, detail: string) {
  const yazi = detail.slice(0, 160);
  const satir = JSON.stringify({ studio: 'log', gameId, level, step, code, detail: yazi });
  if (level === 'error' || level === 'warn') console.error(satir);
  else console.log(satir);
  await db.from('creator_studio_logs').insert({ game_id: gameId, level, step, code, detail: yazi });
}

function faz(state: 'bekliyor' | 'oluyor' | 'bitti' | 'hata', detail = ''): { state: string; detail: string } {
  return { state, detail };
}

export async function v2Ilerleme(db: Db, game: Satir) {
  const gameId = String(game.id);
  const { data: assets } = await db.from('creator_game_assets').select('asset_key, asset_type, source_provider, status, size_bytes, pipeline, error_code, required').eq('game_id', gameId);
  const liste = (assets ?? []) as Satir[];
  const modeller = liste.filter((a) => a.asset_type === 'model');
  const sesler = liste.filter((a) => a.asset_type === 'audio');
  const modelHazir = modeller.filter((a) => a.status === 'READY').length;
  const sesHazir = sesler.filter((a) => a.status === 'READY').length;
  const modelHata = modeller.some((a) => a.status === 'FAILED');
  const sesHata = sesler.some((a) => a.status === 'FAILED');
  const doku = modeller.filter((a) => (a.pipeline as { textured?: boolean } | null)?.textured).length;
  const durum = String(game.status ?? 'DRAFT');
  const specVar = !!game.specification;
  const sahneVar = !!game.scene_graph;
  const oynanisVar = !!game.gameplay_graph;
  const { data: jobs } = await db.from('creator_studio_jobs')
    .select('kind, status, error_code, created_at, finished_at, payload')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false })
    .limit(16);
  const simdi = Date.now();
  let pollAfterMs = 12000;
  const activity = ((jobs ?? []) as Satir[]).map((j) => {
    const durumIs = String(j.status ?? '');
    if (['QUEUED', 'RUNNING', 'RETRYING'].includes(durumIs)) {
      const sonraki = Number(((j.payload ?? {}) as { nextAt?: number }).nextAt ?? 0);
      const bekle = sonraki > simdi ? Math.min(20000, Math.max(8000, sonraki - simdi)) : 8000;
      pollAfterMs = Math.min(pollAfterMs, bekle);
    }
    return {
      kind: String(j.kind ?? ''),
      status: durumIs,
      errorCode: (j.error_code as string | null) ?? null,
      at: (j.finished_at as string | null) ?? (j.created_at as string | null),
    };
  });
  return {
    status: durum,
    errorCode: game.error_code ?? null,
    runtimeType: game.runtime_type,
    title: game.title,
    version: game.active_version ?? 0,
    phases: [
      { id: 'design', ...faz(specVar ? 'bitti' : durum === 'PLANNING' ? 'oluyor' : durum === 'FAILED' && !specVar ? 'hata' : 'bekliyor') },
      { id: 'scene_plan', ...faz(specVar ? 'bitti' : 'bekliyor') },
      { id: 'models', ...faz(modelHata ? 'hata' : modeller.length && modelHazir === modeller.length ? 'bitti' : modeller.length ? 'oluyor' : 'bekliyor', modeller.length ? `${modelHazir}/${modeller.length}` : '') },
      { id: 'textures', ...faz(modeller.length && doku === modeller.length ? 'bitti' : doku ? 'oluyor' : 'bekliyor', modeller.length ? `${doku}/${modeller.length}` : '') },
      { id: 'audio', ...faz(sesHata ? 'hata' : sesler.length && sesHazir === sesler.length ? 'bitti' : sesler.length ? 'oluyor' : 'bekliyor', sesler.length ? `${sesHazir}/${sesler.length}` : '') },
      { id: 'gameplay', ...faz(oynanisVar ? 'bitti' : durum === 'BUILDING_GAMEPLAY' ? 'oluyor' : 'bekliyor') },
      { id: 'preview', ...faz(durum === 'READY_FOR_PREVIEW' || durum === 'PRIVATE_TEST' || durum === 'SUBMITTED' ? 'bitti' : durum === 'FAILED' ? 'hata' : sahneVar ? 'oluyor' : 'bekliyor') },
    ],
    assets: liste.map((a) => ({
      assetKey: a.asset_key,
      type: a.asset_type,
      provider: a.source_provider,
      status: a.status,
      sizeBytes: a.size_bytes,
      pipeline: a.pipeline,
      errorCode: a.error_code,
      required: a.required,
    })),
    specification: game.specification ?? null,
    design: game.design ?? null,
    scene: game.scene_graph ?? null,
    gameplay: game.gameplay_graph ?? null,
    manifest: game.manifest ?? null,
    activity,
    pollAfterMs,
    eta: await etaHesapla(db, game, liste),
    coverUrl: await imzaAlan(game.thumbnail_r2_key),
    avatarUrl: await imzaAlan(game.avatar_r2_key),
  };
}

const VARSAYILAN_SURE: Record<string, number> = {
  GAME_SPEC: 25_000,
  GAME_DESIGN: 20_000,
  ASSET_PLAN: 8_000,
  MESHY_MODEL: 180_000,
  MESHY_TEXTURE: 120_000,
  MESHY_RIG: 90_000,
  MESHY_ANIMATION: 90_000,
  ELEVENLABS_SFX: 20_000,
  ELEVENLABS_VOICE: 25_000,
  ELEVENLABS_MUSIC: 40_000,
  R2_UPLOAD: 8_000,
  ASSET_PROCESS: 8_000,
  SCENE_BUILD: 6_000,
  GAMEPLAY_BUILD: 6_000,
  PREVIEW_BUILD: 6_000,
};

async function etaHesapla(db: Db, game: Satir, assets: Satir[]) {
  const durum = String(game.status ?? 'DRAFT');
  const durmus = ['CANCELLED', 'ARCHIVED'].includes(durum);
  const bitti = ['READY_FOR_PREVIEW', 'PRIVATE_TEST', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'].includes(durum);
  if (durmus || bitti) {
    return { remainingSeconds: 0, minSeconds: 0, maxSeconds: 0, confidence: bitti ? 'done' : 'stopped', calculatedAt: new Date().toISOString() };
  }
  const { data: jobs } = await db.from('creator_studio_jobs')
    .select('kind, status, created_at, finished_at')
    .eq('game_id', String(game.id))
    .order('created_at', { ascending: true })
    .limit(80);
  const isler = (jobs ?? []) as Satir[];
  const ornekler: number[] = [];
  const turOrtalama = new Map<string, number>();
  for (const j of isler) {
    if (String(j.status) !== 'COMPLETED' || !j.created_at || !j.finished_at) continue;
    const sure = new Date(String(j.finished_at)).getTime() - new Date(String(j.created_at)).getTime();
    if (sure < 500 || sure > 1_800_000) continue;
    ornekler.push(sure);
    const tur = String(j.kind);
    const once = turOrtalama.get(tur);
    turOrtalama.set(tur, once == null ? sure : Math.round((once + sure) / 2));
  }
  const kalanIs = isler.filter((j) => ['QUEUED', 'RUNNING', 'RETRYING'].includes(String(j.status)));
  const hazirOlmayan = assets.filter((a) => !['READY', 'FAILED', 'CANCELLED'].includes(String(a.status)));
  const simdi = Date.now();
  let toplam = 0;
  const kaynak = kalanIs.length
    ? kalanIs.map((j) => ({ kind: String(j.kind), created: j.created_at as string | null, status: String(j.status) }))
    : hazirOlmayan.map((a) => ({
        kind: a.asset_type === 'audio' ? 'ELEVENLABS_SFX' : 'MESHY_MODEL',
        created: null as string | null,
        status: String(a.status),
      }));
  for (const is of kaynak) {
    const taban = turOrtalama.get(is.kind) ?? VARSAYILAN_SURE[is.kind] ?? 20_000;
    if (is.status === 'RUNNING' && is.created) {
      const gecti = simdi - new Date(is.created).getTime();
      toplam += Math.max(5_000, taban - gecti);
    } else {
      toplam += taban;
    }
  }
  if (String(game.status) === 'PLANNING' && !game.specification) toplam += turOrtalama.get('GAME_SPEC') ?? VARSAYILAN_SURE.GAME_SPEC;
  if (!game.scene_graph && kaynak.length) toplam += VARSAYILAN_SURE.SCENE_BUILD;
  const paralel = Math.max(1, Math.min(3, kaynak.filter((k) => k.status === 'RUNNING').length || 1));
  const kalanMs = kaynak.length ? Math.round(toplam / paralel) : (['DRAFT', 'PLANNING'].includes(durum) ? VARSAYILAN_SURE.GAME_SPEC : 0);
  const yeterli = ornekler.length >= 2;
  const sapma = yeterli ? 0.25 : 0.6;
  return {
    remainingSeconds: Math.max(0, Math.round(kalanMs / 1000)),
    minSeconds: Math.max(0, Math.round((kalanMs * (1 - sapma)) / 1000)),
    maxSeconds: Math.max(0, Math.round((kalanMs * (1 + sapma)) / 1000)),
    confidence: kaynak.length === 0 && !['DRAFT', 'PLANNING'].includes(durum) ? 'unknown' : yeterli ? 'measured' : ornekler.length ? 'low' : 'estimating',
    calculatedAt: new Date().toISOString(),
    samples: ornekler.length,
  };
}

export async function v2Durdur(db: Db, userId: string, gameId: string): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game || game.runtime_type !== 'tamuso_game_v2') return json({ ok: false, code: 'FORBIDDEN' }, 403);
  await db.from('creator_studio_jobs')
    .update({ status: 'CANCELLED', error_code: 'USER_STOP', finished_at: new Date().toISOString() })
    .eq('game_id', gameId)
    .in('status', ['QUEUED', 'RETRYING']);
  await db.from('creator_game_assets')
    .update({ status: 'CANCELLED', error_code: 'USER_STOP' })
    .eq('game_id', gameId)
    .in('status', ['QUEUED']);
  await kaydetOyun(db, gameId, { status: 'CANCELLED', error_code: null });
  await gunluk(db, gameId, 'info', 'STOP', 'USER_STOP', gameId.slice(0, 8));
  const taze = await oyunAl(db, gameId, userId);
  return json({ ok: true, ...(taze ? await v2Ilerleme(db, taze) : {}) });
}

export async function v2Devam(db: Db, userId: string, gameId: string): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game || game.runtime_type !== 'tamuso_game_v2') return json({ ok: false, code: 'FORBIDDEN' }, 403);
  await db.from('creator_game_assets')
    .update({ status: 'QUEUED', error_code: null })
    .eq('game_id', gameId)
    .in('status', ['CANCELLED', 'FAILED']);
  await kaydetOyun(db, gameId, { status: game.specification ? 'GENERATING_ASSETS' : 'DRAFT', error_code: null });
  await gunluk(db, gameId, 'info', 'RESUME', 'USER_RESUME', gameId.slice(0, 8));
  const taze = await oyunAl(db, gameId, userId);
  if (taze && String(taze.status) === 'DRAFT') return v2Baslat(db, userId, gameId, 'tr');
  return json({ ok: true, ...(taze ? await v2Ilerleme(db, taze) : {}) });
}

async function imzaAlan(anahtar: unknown): Promise<string | null> {
  const key = typeof anahtar === 'string' ? anahtar : '';
  const env = r2EnvOku();
  if (!key || !env) return null;
  return r2Imza(env, key);
}

async function isYaz(db: Db, row: Record<string, unknown>) {
  await db.from('creator_studio_jobs').insert(row);
}

async function kaydetOyun(db: Db, gameId: string, patch: Record<string, unknown>) {
  let onceki = '';
  if (patch.status) {
    const { data } = await db.from('creator_games').select('status').eq('id', gameId).maybeSingle();
    onceki = String((data as { status?: string } | null)?.status ?? '');
  }
  await db.from('creator_games').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', gameId);
  const sonraki = String(patch.status ?? '');
  const olay = sonraki === 'READY_FOR_PREVIEW' ? 'studio_ready' : sonraki === 'FAILED' ? 'studio_failed' : '';
  if (!olay || sonraki === onceki) return;
  const { error } = await db.rpc('creator_studio_bildir', { p_id: gameId, p_olay: olay });
  if (error) console.log(JSON.stringify({ studio: 'push', gameId, olay, code: error.message.slice(0, 80) }));
}

export async function v2Baslat(db: Db, userId: string, gameId: string, language: string): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game || game.runtime_type !== 'tamuso_game_v2') return json({ ok: false, code: 'FORBIDDEN' }, 403);
  if (CALISAN.includes(String(game.status))) {
    return json({ ok: true, ...(await v2Ilerleme(db, game)) });
  }
  if (!(await bayrak(db, 'ai_generation_enabled'))) return json({ ok: false, code: 'AI_DISABLED' }, 403);

  const { count } = await db.from('creator_studio_jobs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'GAME_SPEC').gte('created_at', new Date(Date.now() - 86_400_000).toISOString());
  if ((count ?? 0) >= 12) return json({ ok: false, code: 'QUOTA' }, 429);

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim();
  if (!apiKey) return json({ ok: false, code: 'CONFIG_ERROR' }, 500);

  await kaydetOyun(db, gameId, { status: 'PLANNING', error_code: null });
  const { data: job } = await db.from('creator_studio_jobs').insert({
    user_id: userId, game_id: gameId, kind: 'GAME_SPEC', status: 'RUNNING',
  }).select('id').single();

  const ai = await yonetmenCagir({
    apiKey,
    prompt: String(game.prompt ?? ''),
    language,
    options: game.options ?? {},
  });
  if (!ai.ok) {
    await db.from('creator_studio_jobs').update({
      status: 'FAILED',
      error_code: ai.code,
      payload: ai.detail ? { detail: ai.detail } : {},
      finished_at: new Date().toISOString(),
    }).eq('id', (job as { id: string }).id);
    await kaydetOyun(db, gameId, { status: 'FAILED', error_code: ai.code });
    const taze = await oyunAl(db, gameId, userId);
    return json({ ok: false, code: ai.code, ...(taze ? await v2Ilerleme(db, taze) : {}) }, 502);
  }
  const risk = guvenlikTara(ai.paket);
  if (risk) {
    await kaydetOyun(db, gameId, { status: 'FAILED', error_code: 'SECURITY', specification: ai.paket.specification });
    return json({ ok: false, code: 'SECURITY' }, 422);
  }
  const modeller = ai.paket.assetPlan.assets.filter((a) => a.type === 'model' && a.source === 'meshy' && !a.instanceOf);
  if (ai.paket.specification.game.dimension === '3d' && modeller.length < 1) {
    await kaydetOyun(db, gameId, { status: 'FAILED', error_code: 'BAD_ASSET_PLAN', specification: ai.paket.specification, design: ai.paket.design, asset_plan: ai.paket.assetPlan });
    return json({ ok: false, code: 'BAD_ASSET_PLAN' }, 422);
  }

  await db.from('creator_studio_jobs').update({ status: 'COMPLETED', finished_at: new Date().toISOString() }).eq('id', (job as { id: string }).id);
  await isYaz(db, { user_id: userId, game_id: gameId, kind: 'GAME_DESIGN', status: 'COMPLETED', finished_at: new Date().toISOString() });
  await isYaz(db, { user_id: userId, game_id: gameId, kind: 'ASSET_PLAN', status: 'COMPLETED', finished_at: new Date().toISOString() });

  const meshyAcik = await bayrak(db, 'meshy_enabled');
  const sesAcik = await bayrak(db, 'elevenlabs_enabled');
  const meshyKey = Deno.env.get('MESHY_API_KEY')?.trim() ?? '';
  const elevenKey = Deno.env.get('ELEVENLABS_API_KEY')?.trim() ?? '';
  if (modeller.length && (!meshyAcik || !meshyKey)) {
    await paketKaydet(db, gameId, ai.paket, String(ai.paket.specification.game.title));
    await kaydetOyun(db, gameId, { status: 'FAILED', error_code: meshyAcik ? 'MESHY_CONFIG' : 'MESHY_DISABLED' });
    const taze = await oyunAl(db, gameId, userId);
    return json({ ok: false, code: meshyAcik ? 'MESHY_CONFIG' : 'MESHY_DISABLED', ...(taze ? await v2Ilerleme(db, taze) : {}) }, 409);
  }

  await db.from('creator_game_assets').delete().eq('game_id', gameId);
  await paketKaydet(db, gameId, ai.paket, ai.paket.specification.game.title);
  await varlikleriAc(db, userId, gameId, ai.paket.assetPlan, { meshy: meshyAcik && !!meshyKey, eleven: sesAcik && !!elevenKey });
  const sesler = ai.paket.assetPlan.assets.filter((a) => a.type === 'audio' && a.source === 'elevenlabs');
  if (sesler.length && (!sesAcik || !elevenKey)) {
    await db.from('creator_game_assets').update({ status: 'FAILED', error_code: sesAcik ? 'ELEVEN_CONFIG' : 'AUDIO_DISABLED' }).eq('game_id', gameId).eq('asset_type', 'audio');
  }
  await kaydetOyun(db, gameId, { status: 'GENERATING_ASSETS', error_code: null, active_version: Number(game.active_version ?? 0) + 1 });
  const taze = await oyunAl(db, gameId, userId);
  if (!taze) return json({ ok: false, code: 'SAVE_ERROR' }, 500);
  await v2Adim(db, userId, taze);
  const son = await oyunAl(db, gameId, userId);
  return json({ ok: true, ...(await v2Ilerleme(db, son ?? taze)) });
}

async function paketKaydet(db: Db, gameId: string, paket: StudioPaket, title: string) {
  await kaydetOyun(db, gameId, {
    title: title.slice(0, 80),
    specification: paket.specification,
    design: paket.design,
    asset_plan: paket.assetPlan,
    scene_graph: null,
    gameplay_graph: null,
    manifest: null,
  });
}

async function varlikleriAc(db: Db, userId: string, gameId: string, plan: AssetPlan, bayraklar: { meshy: boolean; eleven: boolean }) {
  for (const asset of plan.assets) {
    if (asset.instanceOf) continue;
    if (asset.source === 'runtime') continue;
    const provider = asset.source === 'elevenlabs' ? 'elevenlabs' : asset.source === 'user' ? 'user' : 'meshy';
    if (provider === 'user') continue;
    const acik = provider === 'meshy' ? bayraklar.meshy : bayraklar.eleven;
    const { data } = await db.from('creator_game_assets').insert({
      game_id: gameId,
      creator_id: userId,
      version_no: 1,
      asset_key: asset.assetId,
      asset_type: asset.type === 'model' ? 'model' : asset.type === 'audio' ? 'audio' : asset.type,
      source_provider: provider,
      status: acik ? 'QUEUED' : 'FAILED',
      required: asset.required,
      error_code: acik ? null : provider === 'meshy' ? 'MESHY_DISABLED' : 'AUDIO_DISABLED',
      pipeline: { generated: false, downloaded: false, validated: false, optimized: false, optimization: 'not_run', textured: false, lod: 'not_generated', uploaded: false },
    }).select('id').single();
    if (!acik || !data) continue;
    const kind = asset.type === 'audio'
      ? asset.audioKind === 'music' ? 'ELEVENLABS_MUSIC' : asset.audioKind === 'voice' ? 'ELEVENLABS_VOICE' : 'ELEVENLABS_SFX'
      : asset.rig ? 'MESHY_RIG' : 'MESHY_MODEL';
    await isYaz(db, {
      user_id: userId,
      game_id: gameId,
      kind,
      status: 'QUEUED',
      payload: {
        assetId: (data as { id: string }).id,
        assetKey: asset.assetId,
        stage: asset.type === 'audio' ? 'audio' : 'preview',
        prompt: asset.generationPrompt,
        rig: asset.rig,
        actionId: asset.actionId,
        audioKind: asset.audioKind,
        nextAt: 0,
      },
    });
  }
}

export async function v2Adim(db: Db, userId: string, game: Satir): Promise<void> {
  const gameId = String(game.id);
  const taze = await oyunAl(db, gameId, userId);
  const durum = String(taze?.status ?? game.status);
  if (durum === 'CANCELLED' || durum === 'ARCHIVED') return;
  if (!CALISAN.includes(durum) && durum !== 'GENERATING_ASSETS') return;
  const env = r2EnvOku();
  const version = Number(game.active_version ?? 1);
  const { data: jobs } = await db.from('creator_studio_jobs').select('*').eq('game_id', gameId).in('status', ['QUEUED', 'RUNNING', 'RETRYING']).order('created_at', { ascending: true });
  const liste = (jobs ?? []) as Satir[];
  const simdi = Date.now();
  const uygun = liste.filter((job) => {
    const kind = String(job.kind);
    if (!kind.startsWith('MESHY') && !kind.startsWith('ELEVEN') && kind !== 'COVER') return false;
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    const nextAt = Number(payload.nextAt ?? 0);
    return !(job.status === 'RUNNING' && simdi < nextAt);
  });
  uygun.sort((a, b) => {
    const derece = (job: Satir) => (String(job.kind) === 'COVER' ? 1 : 0);
    const fark = derece(a) - derece(b);
    if (fark) return fark;
    const na = Number(((a.payload ?? {}) as { nextAt?: number }).nextAt ?? 0);
    const nb = Number(((b.payload ?? {}) as { nextAt?: number }).nextAt ?? 0);
    return na - nb;
  });
  const siradaki = uygun[0];
  if (siradaki) {
    const payload = (siradaki.payload ?? {}) as Record<string, unknown>;
    const kind = String(siradaki.kind);
    const ad = String(payload.assetKey ?? kind);
    await db.from('creator_studio_jobs').update({
      status: 'RUNNING',
      payload: { ...payload, nextAt: Date.now() + 20_000 },
    }).eq('id', siradaki.id);
    try {
      await gunluk(db, gameId, 'info', 'ADIM', kind, ad);
      if (kind === 'COVER') await kapakAdimi(db, siradaki, payload, env, gameId, version);
      else if (kind.startsWith('MESHY')) await meshyAdimi(db, siradaki, payload, env, gameId, version);
      else await sesAdimi(db, { ...siradaki, status: 'RUNNING' }, { ...payload, nextAt: 0 }, env, gameId, version);
    } catch (err) {
      await gunluk(db, gameId, 'error', 'ADIM', 'EXCEPTION', `${ad} ${String(err).slice(0, 80)}`);
      await ertele(db, siradaki, payload);
    }
  } else {
    const bekleyen = liste.map((j) => String(j.kind)).slice(0, 6).join(',');
    await gunluk(db, gameId, 'info', 'BEKLEME', 'NOT_DUE', bekleyen || 'yok');
  }
  await bitisKontrol(db, userId, gameId);
}

async function meshyAdimi(db: Db, job: Satir, payload: Record<string, unknown>, env: R2Env | null, gameId: string, version: number): Promise<string> {
  const key = Deno.env.get('MESHY_API_KEY')?.trim() ?? '';
  if (!key || !env) {
    await isBitti(db, job, 'FAILED', 'MESHY_CONFIG');
    return 'failed';
  }
  const nextAt = Number(payload.nextAt ?? 0);
  if (Date.now() < nextAt && job.status === 'RUNNING') return 'wait';
  if (payload.stage === 'download') return modelKaydet(db, job, payload, env, gameId, version);
  const stage = String(payload.stage ?? 'preview');
  const assetDbId = String(payload.assetId ?? '');
  if (job.status === 'QUEUED' || job.status === 'RETRYING') {
    const created = await meshyOnizlemeOlustur(key, String(payload.prompt ?? ''));
    if (!created.ok) {
      await isBitti(db, job, 'FAILED', created.code);
      await varlikDurum(db, assetDbId, 'FAILED', created.code);
      return 'failed';
    }
    await db.from('creator_studio_jobs').update({
      status: 'RUNNING',
      payload: { ...payload, stage: 'preview', taskId: created.id, nextAt: Date.now() + 8000 },
    }).eq('id', job.id);
    await varlikDurum(db, assetDbId, 'GENERATING', null, { provider_job_id: created.id });
    return 'started';
  }
  const taskId = String(payload.taskId ?? '');
  const kind = stage === 'rig' ? 'rig' : stage === 'animation' ? 'animation' : 'text';
  await db.from('creator_studio_jobs').update({
    payload: { ...payload, nextAt: Date.now() + 15000 },
  }).eq('id', job.id);
  const gorev = await meshyGorevOku(key, kind, taskId);
  if (!('status' in gorev)) {
    await gunluk(db, gameId, 'warn', 'MESHY', gorev.code, String(payload.assetKey ?? stage));
    await ertele(db, job, payload);
    return 'wait';
  }
  await gunluk(db, gameId, gorev.status === 'FAILED' ? 'error' : 'info', 'MESHY', gorev.status, `${String(payload.assetKey ?? stage)} ${gorev.progress}`);
  if (gorev.status === 'FAILED' || gorev.status === 'CANCELED') {
    await isBitti(db, job, 'FAILED', 'MESHY_FAILED');
    await varlikDurum(db, assetDbId, 'FAILED', 'MESHY_FAILED');
    return 'failed';
  }
  if (gorev.status !== 'SUCCEEDED') {
    await ertele(db, job, payload);
    return 'wait';
  }
  if (stage === 'preview') {
    const refine = await meshyDokuOlustur(key, taskId, String(payload.prompt ?? ''));
    if (!refine.ok) {
      await isBitti(db, job, 'FAILED', refine.code);
      await varlikDurum(db, assetDbId, 'FAILED', refine.code);
      return 'failed';
    }
    await db.from('creator_studio_jobs').update({
      kind: 'MESHY_TEXTURE',
      payload: { ...payload, stage: 'refine', taskId: refine.id, previewTaskId: taskId, nextAt: Date.now() + 8000 },
    }).eq('id', job.id);
    return 'refine';
  }
  if (stage === 'refine' && payload.rig === true) {
    const rig = await meshyIskeletOlustur(key, taskId);
    if (!rig.ok) {
      await isBitti(db, job, 'FAILED', rig.code);
      await varlikDurum(db, assetDbId, 'FAILED', rig.code);
      return 'failed';
    }
    await db.from('creator_studio_jobs').update({
      kind: 'MESHY_RIG',
      payload: { ...payload, stage: 'rig', taskId: rig.id, refineTaskId: taskId, nextAt: Date.now() + 8000 },
    }).eq('id', job.id);
    return 'rig';
  }
  if (stage === 'rig' && typeof payload.actionId === 'number') {
    const anim = await meshyAnimasyonOlustur(key, taskId, payload.actionId);
    if (!anim.ok) {
      await isBitti(db, job, 'FAILED', anim.code);
      await varlikDurum(db, assetDbId, 'FAILED', anim.code);
      return 'failed';
    }
    await db.from('creator_studio_jobs').update({
      kind: 'MESHY_ANIMATION',
      payload: { ...payload, stage: 'animation', taskId: anim.id, nextAt: Date.now() + 8000 },
    }).eq('id', job.id);
    return 'animation';
  }
  const url = gorev.animationGlbUrl || gorev.rigGlbUrl || gorev.glbUrl;
  if (!url) {
    await isBitti(db, job, 'FAILED', 'MESHY_EMPTY');
    await varlikDurum(db, assetDbId, 'FAILED', 'MESHY_EMPTY');
    return 'failed';
  }
  await db.from('creator_studio_jobs').update({
    payload: {
      ...payload,
      stage: 'download',
      glbUrl: url,
      thumbnailUrl: gorev.thumbnailUrl,
      walkGlbUrl: gorev.walkGlbUrl,
      nextAt: Date.now(),
    },
  }).eq('id', job.id);
  await gunluk(db, gameId, 'info', 'MESHY', 'URL_HAZIR', String(payload.assetKey ?? stage));
  return 'queued_download';
}

async function modelKaydet(db: Db, job: Satir, payload: Record<string, unknown>, env: R2Env, gameId: string, version: number) {
  const assetDbId = String(payload.assetId ?? '');
  const url = String(payload.glbUrl ?? '');
  const dosya = await meshyDosyaIndir(url);
  if (!dosya.ok) {
    if (dosya.code === 'MESHY_TIMEOUT' || dosya.code === 'MESHY_DOWNLOAD') {
      await ertele(db, job, payload);
      return 'wait';
    }
    await isBitti(db, job, 'FAILED', dosya.code);
    await varlikDurum(db, assetDbId, 'FAILED', dosya.code);
    return 'failed';
  }
  const rapor = glbDogrula(dosya.bytes);
  if (!rapor.ok) {
    await isBitti(db, job, 'FAILED', rapor.code);
    await varlikDurum(db, assetDbId, 'FAILED', rapor.code);
    return 'failed';
  }
  const assetKey = String(payload.assetKey ?? assetDbId);
  const r2Key = oyunAnahtari(gameId, version, 'models', `${assetKey}.glb`);
  const yukleme = await r2Yukle(env, r2Key, dosya.bytes, 'model/gltf-binary');
  if (!yukleme.ok) {
    await gunluk(db, gameId, 'error', 'R2', yukleme.code, assetKey);
    if (yukleme.code === 'R2_TIMEOUT' || yukleme.code === 'R2_UNAVAILABLE') {
      await erteleUzun(db, job, { ...payload, httpStatus: yukleme.httpStatus }, yukleme.code);
      return 'wait';
    }
    await isBitti(db, job, 'FAILED', yukleme.code);
    await varlikDurum(db, assetDbId, 'FAILED', yukleme.code);
    return 'failed';
  }
  const checksum = await sha256(dosya.bytes);
  await db.from('creator_game_assets').update({
    status: 'READY',
    r2_key: r2Key,
    mime_type: 'model/gltf-binary',
    size_bytes: rapor.bytes,
    model_format: 'glb',
    polygon_count: rapor.triangles,
    texture_resolution: '2k',
    checksum,
    ready_at: new Date().toISOString(),
    pipeline: {
      generated: true, downloaded: true, validated: true, optimized: false, optimization: 'not_run',
      textured: true, lod: 'not_generated', uploaded: true,
    },
  }).eq('id', assetDbId);
  await isBitti(db, job, 'COMPLETED', null);
  await gunluk(db, gameId, 'info', 'MODEL', 'HAZIR', assetKey);
  const kapak = String(payload.thumbnailUrl ?? '');
  if (kapak) await kapakIsi(db, String(job.user_id ?? ''), gameId, kapak, assetKey);
  return 'downloaded';
}

async function kapakIsi(db: Db, userId: string, gameId: string, url: string, assetKey: string) {
  const { data } = await db.from('creator_studio_jobs').select('id').eq('game_id', gameId).eq('kind', 'COVER').in('status', ['QUEUED', 'RUNNING', 'RETRYING']).limit(1);
  if (data && data.length) return;
  await isYaz(db, {
    user_id: userId,
    game_id: gameId,
    kind: 'COVER',
    status: 'QUEUED',
    payload: { url, assetKey, nextAt: 0 },
  });
  await gunluk(db, gameId, 'info', 'KAPAK', 'KUYRUK', assetKey);
}

async function kapakAdimi(db: Db, job: Satir, payload: Record<string, unknown>, env: R2Env | null, gameId: string, version: number) {
  const url = String(payload.url ?? '');
  const assetKey = String(payload.assetKey ?? 'kapak');
  if (!env) {
    await gunluk(db, gameId, 'error', 'KAPAK', 'R2_CONFIG', assetKey);
    await isBitti(db, job, 'FAILED', 'R2_CONFIG');
    return;
  }
  const dosya = await meshyDosyaIndir(url);
  if (!dosya.ok) {
    await gunluk(db, gameId, 'warn', 'KAPAK', dosya.code, assetKey);
    if (dosya.code === 'MESHY_TIMEOUT' || dosya.code === 'MESHY_DOWNLOAD') {
      await ertele(db, job, payload);
      return;
    }
    await isBitti(db, job, 'FAILED', dosya.code);
    return;
  }
  const mime = dosya.bytes[0] === 0xff ? 'image/jpeg' : 'image/png';
  if (!gorselDogrula(dosya.bytes, mime)) {
    await gunluk(db, gameId, 'error', 'KAPAK', 'FORMAT', assetKey);
    await isBitti(db, job, 'FAILED', 'FORMAT');
    return;
  }
  const { data: oyun } = await db.from('creator_games').select('thumbnail_r2_key, avatar_r2_key, cover_source, avatar_source').eq('id', gameId).maybeSingle();
  const satir = (oyun ?? {}) as Satir;
  const uzanti = mime === 'image/jpeg' ? 'jpg' : 'png';
  const yama: Record<string, unknown> = {};
  if (!satir.thumbnail_r2_key || satir.cover_source === 'model' || !satir.cover_source) {
    const key = oyunAnahtari(gameId, version, 'images', `kapak_${assetKey}.${uzanti}`);
    if ((await r2Yukle(env, key, dosya.bytes, mime)).ok) {
      yama.thumbnail_r2_key = key;
      yama.cover_source = 'model';
    }
  }
  if (!satir.avatar_r2_key || satir.avatar_source === 'model' || !satir.avatar_source) {
    const key = oyunAnahtari(gameId, version, 'images', `avatar_${assetKey}.${uzanti}`);
    if ((await r2Yukle(env, key, dosya.bytes, mime)).ok) {
      yama.avatar_r2_key = key;
      yama.avatar_source = 'model';
    }
  }
  if (!Object.keys(yama).length) {
    await gunluk(db, gameId, 'info', 'KAPAK', 'ELLE', assetKey);
    await isBitti(db, job, 'COMPLETED', null);
    return;
  }
  await kaydetOyun(db, gameId, yama);
  await gunluk(db, gameId, 'info', 'KAPAK', 'HAZIR', assetKey);
  await isBitti(db, job, 'COMPLETED', null);
}

async function kapakKaydet(db: Db, env: R2Env, gameId: string, version: number, assetKey: string, url: string) {
  const dosya = await meshyDosyaIndir(url);
  if (!dosya.ok) return;
  const mime = dosya.bytes[0] === 0xff ? 'image/jpeg' : 'image/png';
  if (!gorselDogrula(dosya.bytes, mime)) return;
  const uzanti = mime === 'image/jpeg' ? 'jpg' : 'png';
  const key = oyunAnahtari(gameId, version, 'images', `${assetKey}.${uzanti}`);
  const yukleme = await r2Yukle(env, key, dosya.bytes, mime);
  if (!yukleme.ok) return;
  await db.from('creator_games').update({ thumbnail_r2_key: key }).eq('id', gameId);
}

async function ekModelKaydet(db: Db, env: R2Env, gameId: string, version: number, assetKey: string, url: string, job: Satir) {
  const dosya = await meshyDosyaIndir(url);
  if (!dosya.ok || !glbDogrula(dosya.bytes).ok) return;
  const key = oyunAnahtari(gameId, version, 'animations', `${assetKey}.glb`);
  if (!(await r2Yukle(env, key, dosya.bytes, 'model/gltf-binary')).ok) return;
  await db.from('creator_game_assets').insert({
    game_id: gameId,
    creator_id: job.user_id,
    asset_key: assetKey,
    asset_type: 'animation',
    source_provider: 'meshy',
    status: 'READY',
    required: false,
    r2_key: key,
    mime_type: 'model/gltf-binary',
    size_bytes: dosya.bytes.byteLength,
    model_format: 'glb',
    ready_at: new Date().toISOString(),
    pipeline: { generated: true, downloaded: true, validated: true, optimized: false, optimization: 'not_run', textured: true, lod: 'not_generated', uploaded: true },
  });
}

async function sesAdimi(db: Db, job: Satir, payload: Record<string, unknown>, env: R2Env | null, gameId: string, version: number): Promise<boolean> {
  const key = Deno.env.get('ELEVENLABS_API_KEY')?.trim() ?? '';
  const assetDbId = String(payload.assetId ?? '');
  if (!key || !env) {
    await isBitti(db, job, 'FAILED', 'ELEVEN_CONFIG');
    await varlikDurum(db, assetDbId, 'FAILED', 'ELEVEN_CONFIG');
    return true;
  }
  if (job.status === 'RUNNING' && Date.now() < Number(payload.nextAt ?? 0)) return false;
  await db.from('creator_studio_jobs').update({
    status: 'RUNNING',
    payload: { ...payload, nextAt: Date.now() + 40000 },
  }).eq('id', job.id);
  const kind = String(payload.audioKind ?? 'sfx');
  const prompt = String(payload.prompt ?? '');
  const sonuc = kind === 'music'
    ? await elevenMuzikOlustur(key, prompt)
    : kind === 'voice'
    ? await elevenSesOlustur(key, prompt)
    : await elevenSfxOlustur(key, prompt, kind === 'ambience');
  if (!sonuc.ok || !sesDogrula(sonuc.bytes)) {
    const kod = sonuc.ok ? 'AUDIO_FORMAT' : sonuc.code;
    await gunluk(db, gameId, kod.endsWith('TIMEOUT') ? 'warn' : 'error', 'SES', kod, String(payload.assetKey ?? kind));
    if (kod === 'ELEVEN_TIMEOUT' || kod === 'ELEVEN_SFX' || kod === 'ELEVEN_MUSIC' || kod === 'ELEVEN_VOICE') {
      await ertele(db, job, payload);
      return false;
    }
    await isBitti(db, job, 'FAILED', kod);
    await varlikDurum(db, assetDbId, 'FAILED', kod);
    return true;
  }
  const assetKey = String(payload.assetKey ?? 'sfx');
  const r2Key = oyunAnahtari(gameId, version, 'audio', `${assetKey}.mp3`);
  const yukleme = await r2Yukle(env, r2Key, sonuc.bytes, 'audio/mpeg');
  if (!yukleme.ok) {
    await gunluk(db, gameId, 'error', 'R2', yukleme.code, assetKey);
    if (yukleme.code === 'R2_TIMEOUT' || yukleme.code === 'R2_UNAVAILABLE') {
      await erteleUzun(db, job, { ...payload, httpStatus: yukleme.httpStatus }, yukleme.code);
      return false;
    }
    await isBitti(db, job, 'FAILED', yukleme.code);
    await varlikDurum(db, assetDbId, 'FAILED', yukleme.code);
    return true;
  }
  await db.from('creator_game_assets').update({
    status: 'READY',
    r2_key: r2Key,
    mime_type: 'audio/mpeg',
    size_bytes: sonuc.bytes.byteLength,
    checksum: await sha256(sonuc.bytes),
    ready_at: new Date().toISOString(),
    pipeline: { generated: true, downloaded: true, validated: true, optimized: false, optimization: 'not_run', textured: false, lod: 'not_generated', uploaded: true },
  }).eq('id', assetDbId);
  await isBitti(db, job, 'COMPLETED', null);
  await gunluk(db, gameId, 'info', 'SES', 'HAZIR', String(payload.assetKey ?? 'audio'));
  return true;
}

async function erteleUzun(db: Db, job: Satir, payload: Record<string, unknown>, code: string) {
  const attempt = Number(job.attempt ?? 0) + 1;
  if (attempt > 4) {
    await isBitti(db, job, 'FAILED', code);
    await varlikDurum(db, String(payload.assetId ?? ''), 'FAILED', code);
    return;
  }
  const dakika = [60_000, 120_000, 300_000, 600_000][attempt - 1] ?? 600_000;
  await db.from('creator_studio_jobs').update({
    status: 'RETRYING',
    error_code: code,
    attempt,
    payload: { ...payload, nextAt: Date.now() + dakika, retryable: true },
  }).eq('id', job.id);
}

async function ertele(db: Db, job: Satir, payload: Record<string, unknown>) {
  const attempt = Number(job.attempt ?? 0) + 1;
  if (attempt > 48) {
    await isBitti(db, job, 'FAILED', 'TIMEOUT');
    await varlikDurum(db, String(payload.assetId ?? ''), 'FAILED', 'TIMEOUT');
    return;
  }
  const nextAt = Date.now() + Math.min(30_000, 4000 * 2 ** Math.min(3, attempt));
  await db.from('creator_studio_jobs').update({
    status: 'RUNNING',
    attempt,
    payload: { ...payload, nextAt },
  }).eq('id', job.id);
}

async function isBitti(db: Db, job: Satir, status: string, error: string | null) {
  await db.from('creator_studio_jobs').update({
    status,
    error_code: error,
    finished_at: new Date().toISOString(),
  }).eq('id', job.id);
}

async function varlikDurum(db: Db, id: string, status: string, error: string | null, ekstra: Record<string, unknown> = {}) {
  if (!id) return;
  await db.from('creator_game_assets').update({ status, error_code: error, ...ekstra }).eq('id', id);
}

async function bitisKontrol(db: Db, userId: string, gameId: string) {
  const game = await oyunAl(db, gameId, userId);
  if (!game) return;
  const { data: assets } = await db.from('creator_game_assets').select('*').eq('game_id', gameId);
  const liste = (assets ?? []) as Satir[];
  const acik = liste.filter((a) => !['READY', 'FAILED', 'CANCELLED'].includes(String(a.status)));
  if (acik.length) {
    const ozet = acik.slice(0, 6).map((a) => `${String(a.asset_key)}:${String(a.status)}`).join(',');
    await gunluk(db, gameId, 'info', 'BITIS', 'ACIK', ozet);
    return;
  }
  const zorunluHata = liste.find((a) => a.required !== false && a.status === 'FAILED');
  if (zorunluHata) {
    const kod = String(zorunluHata.asset_type) === 'audio' ? 'AUDIO_FAILED' : 'MODEL_FAILED';
    await kaydetOyun(db, gameId, { status: 'FAILED', error_code: String(zorunluHata.error_code ?? kod) });
    return;
  }
  const spec = game.specification as GameSpecification | null;
  const design = game.design as StudioPaket['design'] | null;
  if (!spec || !design) {
    await kaydetOyun(db, gameId, { status: 'FAILED', error_code: 'BAD_SPEC' });
    return;
  }
  const hazir = liste.filter((a) => a.status === 'READY' && a.r2_key).map((a) => ({
    assetId: String(a.asset_key),
    r2Key: String(a.r2_key),
    type: String(a.asset_type),
    mime: String(a.mime_type ?? ''),
  }));
  await kaydetOyun(db, gameId, { status: 'BUILDING_SCENE' });
  const version = Number(game.active_version ?? 1);
  const manifest = derleOyun({ gameId, version, specification: spec, design, readyAssets: hazir });
  const planVarlik = ((game.asset_plan as AssetPlan | null)?.assets ?? [])
    .filter((a) => a.required !== false && (a.type === 'model' || a.type === 'image'))
    .map((a) => a.assetId);
  const zorunluEksik = manifest.issues.some((i) => i.startsWith('ASSET_MISSING:') && planVarlik.includes(i.slice('ASSET_MISSING:'.length)));
  if (zorunluEksik) {
    await kaydetOyun(db, gameId, { status: 'FAILED', error_code: 'ASSET_MISSING', scene_graph: manifest.scene });
    return;
  }
  const risk = guvenlikTara({ specification: spec, design, assetPlan: { schemaVersion: 1, assets: [] } });
  await isYaz(db, { user_id: userId, game_id: gameId, kind: 'SCENE_BUILD', status: 'COMPLETED', finished_at: new Date().toISOString() });
  await isYaz(db, { user_id: userId, game_id: gameId, kind: 'GAMEPLAY_BUILD', status: 'COMPLETED', finished_at: new Date().toISOString() });
  await isYaz(db, { user_id: userId, game_id: gameId, kind: 'SECURITY_SCAN', status: risk ? 'FAILED' : 'COMPLETED', error_code: risk, finished_at: new Date().toISOString() });
  if (risk) {
    await kaydetOyun(db, gameId, { status: 'FAILED', error_code: 'SECURITY' });
    return;
  }
  const env = r2EnvOku();
  if (env) {
    const body = new TextEncoder().encode(JSON.stringify(manifest));
    await r2Yukle(env, oyunAnahtari(gameId, version, 'manifest', 'game.json'), body, 'application/json');
  }
  await isYaz(db, { user_id: userId, game_id: gameId, kind: 'PREVIEW_BUILD', status: 'COMPLETED', finished_at: new Date().toISOString() });
  await kaydetOyun(db, gameId, {
    status: 'READY_FOR_PREVIEW',
    error_code: null,
    scene_graph: manifest.scene,
    gameplay_graph: manifest.gameplay,
    manifest,
  });
}

export async function v2Tekrar(db: Db, userId: string, gameId: string): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game) return json({ ok: false, code: 'FORBIDDEN' }, 403);
  if (!game.specification || !game.asset_plan) return v2Baslat(db, userId, gameId, 'tr');
  const meshyAcik = await bayrak(db, 'meshy_enabled');
  const sesAcik = await bayrak(db, 'elevenlabs_enabled');
  const meshyKey = !!Deno.env.get('MESHY_API_KEY')?.trim();
  const elevenKey = !!Deno.env.get('ELEVENLABS_API_KEY')?.trim();
  const { count } = await db.from('creator_game_assets').select('id', { count: 'exact', head: true }).eq('game_id', gameId);
  if (!count) {
    await varlikleriAc(db, userId, gameId, game.asset_plan as AssetPlan, { meshy: meshyAcik && meshyKey, eleven: sesAcik && elevenKey });
  }
  await db.from('creator_game_assets').update({ status: 'QUEUED', error_code: null }).eq('game_id', gameId).eq('status', 'FAILED');
  await db.from('creator_studio_jobs').update({ status: 'QUEUED', error_code: null, finished_at: null, attempt: 0 }).eq('game_id', gameId).eq('status', 'FAILED');
  const { data: kuyruk } = await db.from('creator_game_assets').select('id, asset_key, asset_type, source_provider').eq('game_id', gameId).eq('status', 'QUEUED');
  const { data: isler } = await db.from('creator_studio_jobs').select('payload').eq('game_id', gameId).in('status', ['QUEUED', 'RUNNING', 'RETRYING']);
  const bagli = new Set(((isler ?? []) as Satir[]).map((j) => String((j.payload as { assetId?: string } | null)?.assetId ?? '')));
  const plan = game.asset_plan as AssetPlan;
  for (const asset of (kuyruk ?? []) as Satir[]) {
    if (bagli.has(String(asset.id))) continue;
    const tanim = plan.assets.find((a) => a.assetId === asset.asset_key);
    if (!tanim || tanim.source === 'runtime' || tanim.source === 'user') continue;
    await isYaz(db, {
      user_id: userId,
      game_id: gameId,
      kind: String(asset.asset_type) === 'audio' ? 'ELEVENLABS_SFX' : 'MESHY_MODEL',
      status: 'QUEUED',
      payload: {
        assetId: asset.id,
        assetKey: asset.asset_key,
        stage: String(asset.asset_type) === 'audio' ? 'audio' : 'preview',
        prompt: tanim.generationPrompt,
        rig: tanim.rig,
        actionId: tanim.actionId,
        audioKind: tanim.audioKind,
        nextAt: 0,
      },
    });
  }
  await kaydetOyun(db, gameId, { status: 'GENERATING_ASSETS', error_code: null });
  const taze = await oyunAl(db, gameId, userId);
  if (taze) await v2Adim(db, userId, taze);
  const son = await oyunAl(db, gameId, userId);
  return json({ ok: true, ...(son ? await v2Ilerleme(db, son) : {}) });
}

export async function v2Yama(db: Db, userId: string, gameId: string, request: string, language: string): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game?.specification) return json({ ok: false, code: 'NO_SPEC' }, 409);
  if (CALISAN.includes(String(game.status))) return json({ ok: false, code: 'BUSY' }, 409);
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim();
  if (!apiKey) return json({ ok: false, code: 'CONFIG_ERROR' }, 500);
  const spec = game.specification as GameSpecification;
  const plan = (game.asset_plan ?? { assets: [] }) as AssetPlan;
  const yama = await yamaCagir({
    apiKey,
    request,
    language,
    entityIds: spec.entities.map((e) => e.id),
    assetIds: plan.assets.map((a) => a.assetId),
  });
  if (!yama.ok) return json({ ok: false, code: yama.code }, 422);
  const onceki = await db.from('creator_game_revisions').select('revision').eq('game_id', gameId).order('revision', { ascending: false }).limit(1).maybeSingle();
  const rev = Number((onceki.data as { revision?: number } | null)?.revision ?? 0) + 1;
  await db.from('creator_game_revisions').insert({
    game_id: gameId,
    creator_id: userId,
    revision: rev,
    summary: yama.patch.summary,
    specification: game.specification,
    design: game.design,
    scene_graph: game.scene_graph,
    gameplay_graph: game.gameplay_graph,
    manifest: game.manifest,
  });
  const uygulanan = yamaUygula(spec, yama.patch);
  await kaydetOyun(db, gameId, { specification: uygulanan.specification });
  if (uygulanan.regenPrompts.length) {
    for (const item of uygulanan.regenPrompts) {
      await db.from('creator_game_assets').update({ status: 'QUEUED', error_code: null, r2_key: null, ready_at: null }).eq('game_id', gameId).eq('asset_key', item.assetId);
    }
    await kaydetOyun(db, gameId, { status: 'GENERATING_ASSETS', manifest: null, scene_graph: null });
    return json({ ok: true, code: 'REGEN', revision: rev });
  }
  if (String(game.status) === 'READY_FOR_PREVIEW' || game.manifest) {
    const { data: assets } = await db.from('creator_game_assets').select('*').eq('game_id', gameId).eq('status', 'READY');
    const hazir = ((assets ?? []) as Satir[]).filter((a) => a.r2_key).map((a) => ({
      assetId: String(a.asset_key), r2Key: String(a.r2_key), type: String(a.asset_type), mime: String(a.mime_type ?? ''),
    }));
    const design = game.design as StudioPaket['design'];
    const manifest = derleOyun({
      gameId,
      version: Number(game.active_version ?? 1),
      specification: uygulanan.specification,
      design,
      readyAssets: hazir,
    });
    await kaydetOyun(db, gameId, { scene_graph: manifest.scene, gameplay_graph: manifest.gameplay, manifest, status: 'READY_FOR_PREVIEW' });
  }
  return json({ ok: true, revision: rev, patch: yama.patch });
}

export async function v2GeriAl(db: Db, userId: string, gameId: string): Promise<Response> {
  const { data } = await db.from('creator_game_revisions').select('*').eq('game_id', gameId).eq('creator_id', userId).order('revision', { ascending: false }).limit(1).maybeSingle();
  const rev = data as Satir | null;
  if (!rev) return json({ ok: false, code: 'NO_REVISION' }, 404);
  await kaydetOyun(db, gameId, {
    specification: rev.specification,
    design: rev.design,
    scene_graph: rev.scene_graph,
    gameplay_graph: rev.gameplay_graph,
    manifest: rev.manifest,
    status: rev.manifest ? 'READY_FOR_PREVIEW' : 'DRAFT',
  });
  await db.from('creator_game_revisions').delete().eq('id', rev.id);
  return json({ ok: true, revision: rev.revision });
}

async function imzaliAdresler(db: Db, game: Satir) {
  const gameId = String(game.id);
  const env = r2EnvOku();
  if (!env) return { urls: {} as Record<string, string>, allowedHosts: [] as string[] };
  const { data } = await db.from('creator_game_assets').select('asset_key, r2_key, status').eq('game_id', gameId).eq('status', 'READY');
  const urls: Record<string, string> = {};
  const hosts = new Set<string>();
  for (const row of (data ?? []) as { asset_key: string; r2_key: string | null }[]) {
    if (!row.r2_key) continue;
    const url = await r2Imza(env, row.r2_key);
    if (!url) continue;
    urls[row.asset_key] = url;
    hosts.add(new URL(url).hostname);
  }
  if (game.thumbnail_r2_key) {
    const url = await r2Imza(env, String(game.thumbnail_r2_key));
    if (url) {
      urls.__thumbnail = url;
      hosts.add(new URL(url).hostname);
    }
  }
  return { urls, allowedHosts: [...hosts] };
}

export async function v2YayinListe(db: Db): Promise<Response> {
  if (!(await bayrak(db, 'game_publishing_enabled'))) return json({ ok: true, games: [] });
  const { data } = await db.from('creator_games')
    .select('id, title, thumbnail_r2_key, published_at')
    .eq('runtime_type', 'tamuso_game_v2')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .limit(40);
  const env = r2EnvOku();
  const games = [];
  for (const row of (data ?? []) as { id: string; title: string | null; thumbnail_r2_key: string | null; published_at: string | null }[]) {
    const coverUrl = env && row.thumbnail_r2_key ? await r2Imza(env, row.thumbnail_r2_key) : null;
    games.push({ id: row.id, title: row.title || '', coverUrl, publishedAt: row.published_at });
  }
  return json({ ok: true, games });
}

export async function v2CanliAdres(db: Db, gameId: string): Promise<Response> {
  if (!(await bayrak(db, 'game_publishing_enabled'))) return json({ ok: false, code: 'PUBLISH_DISABLED' }, 403);
  const { data } = await db.from('creator_games').select('*').eq('id', gameId).eq('runtime_type', 'tamuso_game_v2').eq('status', 'PUBLISHED').maybeSingle();
  const game = data as Satir | null;
  if (!game) return json({ ok: false, code: 'NOT_PUBLISHED' }, 404);
  const adres = await imzaliAdresler(db, game);
  return json({
    ok: true,
    title: game.title,
    manifest: game.manifest ?? null,
    urls: adres.urls,
    allowedHosts: adres.allowedHosts,
    expiresIn: 600,
  });
}

export async function v2Adresler(db: Db, userId: string, gameId: string): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game) return json({ ok: false, code: 'FORBIDDEN' }, 403);
  const env = r2EnvOku();
  if (!env) return json({ ok: false, code: 'R2_CONFIG' }, 500);
  const adres = await imzaliAdresler(db, game);
  return json({
    ok: true,
    urls: adres.urls,
    allowedHosts: adres.allowedHosts,
    manifest: game.manifest ?? null,
    expiresIn: 600,
  });
}

function baytCoz(raw: string): Uint8Array | null {
  if (raw.length < 32 || raw.length > 5_500_000) return null;
  try {
    const bin = atob(raw);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

export async function v2Gorsel(
  db: Db,
  gameId: string,
  userId: string,
  slot: string,
  mime: string,
  data: string,
  kaynak: 'creator' | 'admin',
): Promise<Response> {
  if (kaynak === 'creator') {
    const sahip = await oyunAl(db, gameId, userId);
    if (!sahip || sahip.runtime_type !== 'tamuso_game_v2') return json({ ok: false, code: 'FORBIDDEN' }, 403);
  } else {
    const { data: row } = await db.from('creator_games').select('id, runtime_type, active_version').eq('id', gameId).maybeSingle();
    if (!row || (row as Satir).runtime_type !== 'tamuso_game_v2') return json({ ok: false, code: 'FORBIDDEN' }, 403);
  }
  if (slot !== 'cover' && slot !== 'avatar') return json({ ok: false, code: 'SLOT' }, 400);
  if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp') return json({ ok: false, code: 'MIME' }, 400);
  const bytes = baytCoz(data);
  if (!bytes || !gorselDogrula(bytes, mime)) return json({ ok: false, code: bytes ? 'FORMAT' : 'SIZE' }, 400);
  const env = r2EnvOku();
  if (!env) return json({ ok: false, code: 'R2_CONFIG' }, 500);
  const { data: oyun } = await db.from('creator_games').select('active_version').eq('id', gameId).maybeSingle();
  const version = Number((oyun as Satir | null)?.active_version ?? 1);
  const uzanti = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const klasor = slot === 'cover' ? 'covers' : 'avatars';
  const r2Key = oyunAnahtari(gameId, version, 'images', `${klasor}_${crypto.randomUUID().slice(0, 8)}.${uzanti}`);
  const yukleme = await r2Yukle(env, r2Key, bytes, mime);
  if (!yukleme.ok) return json({ ok: false, code: yukleme.code }, 502);
  const yama = slot === 'cover'
    ? { thumbnail_r2_key: r2Key, cover_source: kaynak === 'admin' ? 'admin' : 'creator' }
    : { avatar_r2_key: r2Key, avatar_source: kaynak === 'admin' ? 'admin' : 'creator' };
  await kaydetOyun(db, gameId, yama);
  await gunluk(db, gameId, 'info', 'KAPAK', slot === 'cover' ? 'KAPAK_DEGISTI' : 'AVATAR_DEGISTI', kaynak);
  const taze = await db.from('creator_games').select('*').eq('id', gameId).maybeSingle();
  return json({ ok: true, ...(taze.data ? await v2Ilerleme(db, taze.data as Satir) : {}) });
}

const MIMELER = new Set(['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/wav']);

export async function v2Yukle(db: Db, userId: string, gameId: string, body: { name?: string; mime?: string; data?: string }): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game || game.runtime_type !== 'tamuso_game_v2') return json({ ok: false, code: 'FORBIDDEN' }, 403);
  const mime = String(body.mime ?? '');
  if (!MIMELER.has(mime)) return json({ ok: false, code: 'MIME' }, 400);
  const raw = String(body.data ?? '');
  if (raw.length < 32 || raw.length > 5_500_000) return json({ ok: false, code: 'SIZE' }, 400);
  let bytes: Uint8Array;
  try {
    const bin = atob(raw);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  } catch {
    return json({ ok: false, code: 'DATA' }, 400);
  }
  const gorsel = mime.startsWith('image/');
  if (gorsel ? !gorselDogrula(bytes, mime) : !sesDogrula(bytes)) return json({ ok: false, code: 'FORMAT' }, 400);
  const env = r2EnvOku();
  if (!env) return json({ ok: false, code: 'R2_CONFIG' }, 500);
  const keyName = String(body.name ?? 'upload').toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 32) || 'upload';
  const uzanti = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/jpeg' ? 'jpg' : 'audio';
  const klasor = gorsel ? 'images' : 'audio';
  const r2Key = oyunAnahtari(gameId, Number(game.active_version ?? 1), klasor, `${keyName}_${crypto.randomUUID().slice(0, 8)}.${uzanti === 'audio' ? 'mp3' : uzanti}`);
  const yukleme = await r2Yukle(env, r2Key, bytes, mime);
  if (!yukleme.ok) return json({ ok: false, code: yukleme.code }, 502);
  await db.from('creator_game_assets').insert({
    game_id: gameId,
    creator_id: userId,
    asset_key: keyName + '_' + crypto.randomUUID().slice(0, 6),
    asset_type: gorsel ? 'image' : 'audio',
    source_provider: 'user',
    status: 'READY',
    required: false,
    r2_key: r2Key,
    mime_type: mime,
    size_bytes: bytes.byteLength,
    checksum: await sha256(bytes),
    ready_at: new Date().toISOString(),
    pipeline: { generated: false, downloaded: true, validated: true, optimized: false, optimization: 'not_run', textured: false, lod: 'not_generated', uploaded: true },
  });
  return json({ ok: true });
}

export async function v2Kapaklar(db: Db, userId: string): Promise<Response> {
  const env = r2EnvOku();
  if (!env) return json({ ok: true, urls: {} });
  const { data } = await db.from('creator_games').select('id, thumbnail_r2_key').eq('creator_id', userId).not('thumbnail_r2_key', 'is', null).limit(40);
  const urls: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; thumbnail_r2_key: string }[]) {
    const url = await r2Imza(env, row.thumbnail_r2_key);
    if (url) urls[row.id] = url;
  }
  return json({ ok: true, urls });
}

export async function v2BasarisizYenile(db: Db, userId: string, gameId: string): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game) return json({ ok: false, code: 'FORBIDDEN' }, 403);
  const { data } = await db.from('creator_studio_jobs').select('*').eq('game_id', gameId).eq('status', 'FAILED');
  for (const job of (data ?? []) as Satir[]) {
    const kod = String(job.error_code ?? '');
    if (kod === 'R2_AUTH') continue;
    if (!kod.startsWith('R2_') && !['MESHY_TIMEOUT', 'MESHY_DOWNLOAD', 'ELEVEN_TIMEOUT', 'ELEVEN_SFX', 'ELEVEN_MUSIC', 'ELEVEN_VOICE'].includes(kod)) continue;
    const payload = (job.payload ?? {}) as Record<string, unknown>;
    const indir = String(job.kind).startsWith('MESHY') && payload.stage === 'download' && payload.glbUrl;
    await db.from('creator_studio_jobs').update({
      status: indir ? 'RUNNING' : 'QUEUED',
      error_code: null,
      finished_at: null,
      attempt: 0,
      payload: { ...payload, nextAt: 0, retryable: true },
    }).eq('id', job.id);
    await varlikDurum(db, String(payload.assetId ?? ''), indir ? 'GENERATING' : 'QUEUED', null);
  }
  await kaydetOyun(db, gameId, { status: 'GENERATING_ASSETS', error_code: null });
  await gunluk(db, gameId, 'info', 'RETRY', 'FAILED_ONLY', gameId.slice(0, 8));
  const taze = await oyunAl(db, gameId, userId);
  return json({ ok: true, ...(taze ? await v2Ilerleme(db, taze) : {}) });
}

export async function v2YayinIste(db: Db, userId: string, gameId: string): Promise<Response> {
  const game = await oyunAl(db, gameId, userId);
  if (!game) return json({ ok: false, code: 'FORBIDDEN' }, 403);
  if (game.status !== 'READY_FOR_PREVIEW' && game.status !== 'PRIVATE_TEST') {
    return json({ ok: false, code: 'NOT_READY' }, 409);
  }
  if (!(await bayrak(db, 'game_submission_enabled'))) return json({ ok: false, code: 'SUBMIT_DISABLED' }, 403);
  await isYaz(db, { user_id: userId, game_id: gameId, kind: 'PUBLISH_BUILD', status: 'COMPLETED', finished_at: new Date().toISOString() });
  await kaydetOyun(db, gameId, { status: 'SUBMITTED' });
  return json({ ok: true, status: 'SUBMITTED' });
}
