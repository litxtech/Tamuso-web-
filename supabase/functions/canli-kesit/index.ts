import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  S3Upload,
} from 'npm:livekit-server-sdk@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function httpHost(url: string): string {
  return url.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
}

function publicUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/story-media/${path}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return Response.json({ ok: false, code: 'oturum' }, { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const apiKey = Deno.env.get('LIVEKIT_API_KEY') ?? '';
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET') ?? '';
  const livekitUrl = Deno.env.get('LIVEKIT_URL') ?? '';
  if (!supabaseUrl || !anon || !service || !apiKey || !apiSecret || !livekitUrl) {
    return Response.json({ ok: false, code: 'yapilandirma' }, { status: 500, headers: corsHeaders });
  }

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (userErr || !userId) {
    return Response.json({ ok: false, code: 'oturum' }, { status: 401, headers: corsHeaders });
  }

  let requestId = '';
  try {
    const body = (await req.json()) as { requestId?: string };
    requestId = (body.requestId ?? '').trim();
  } catch {
    requestId = '';
  }
  if (!requestId) {
    return Response.json({ ok: false, code: 'istek' }, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(supabaseUrl, service);
  const { data: row, error: rowErr } = await admin
    .from('live_clip_requests')
    .select('id, user_id, room_name, duration_ms, status')
    .eq('id', requestId)
    .maybeSingle();

  if (rowErr || !row || row.user_id !== userId || row.status !== 'recording') {
    return Response.json({ ok: false, code: 'istek' }, { status: 403, headers: corsHeaders });
  }

  const explicitKey = Deno.env.get('STORY_CLIP_S3_ACCESS_KEY') ?? '';
  const explicitSecret = Deno.env.get('STORY_CLIP_S3_SECRET') ?? '';
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? '';
  const jwt = auth.replace(/^bearer\s+/i, '').trim();
  const accessKey = explicitKey || projectRef;
  const secretKey = explicitSecret || anon;
  const sessionToken = explicitKey && explicitSecret ? '' : jwt;
  if (!accessKey || !secretKey || (!sessionToken && !(explicitKey && explicitSecret))) {
    await admin
      .from('live_clip_requests')
      .update({ status: 'failed', error_code: 'kayit_yok' })
      .eq('id', requestId);
    return Response.json({ ok: false, code: 'kayit_yok' }, { status: 200, headers: corsHeaders });
  }

  const bucket = Deno.env.get('STORY_CLIP_S3_BUCKET') ?? 'story-media';
  const region = Deno.env.get('STORY_CLIP_S3_REGION') ?? 'eu-central-1';
  const endpoint =
    Deno.env.get('STORY_CLIP_S3_ENDPOINT') ??
    `${supabaseUrl.replace('.supabase.co', '.storage.supabase.co').replace(/\/$/, '')}/storage/v1/s3`;
  const path = `${userId}/clips/${requestId}.mp4`;
  const sure = Math.min(30_000, Math.max(1_000, Number(row.duration_ms) || 30_000));

  const egress = new EgressClient(httpHost(livekitUrl), apiKey, apiSecret);
  let egressId = '';
  try {
    const file = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: path,
      disableManifest: true,
      output: {
        case: 's3',
        value: new S3Upload({
          accessKey,
          secret: secretKey,
          sessionToken: sessionToken || undefined,
          region,
          endpoint,
          bucket,
          forcePathStyle: true,
        }),
      },
    });
    const info = await egress.startParticipantEgress(row.room_name, userId, { file }, {
      screenShare: false,
      encodingOptions: EncodingOptionsPreset.PORTRAIT_H264_720P_30,
    });
    egressId = info.egressId;
    await new Promise((r) => setTimeout(r, sure + 1000));
    await egress.stopEgress(egressId);
  } catch (e) {
    if (egressId) {
      try {
        await egress.stopEgress(egressId);
      } catch {
        /* zaten durmuş olabilir */
      }
    }
    const ham = e instanceof Error ? e.message : 'egress';
    const kisa = ham.replace(/\s+/g, ' ').slice(0, 120);
    await admin
      .from('live_clip_requests')
      .update({ status: 'failed', error_code: kisa || 'egress' })
      .eq('id', requestId);
    return Response.json(
      { ok: false, code: 'egress', detail: kisa },
      { status: 200, headers: corsHeaders },
    );
  }

  const url = publicUrl(supabaseUrl, path);
  let hazir = false;
  for (let i = 0; i < 15; i += 1) {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      if (head.ok) {
        hazir = true;
        break;
      }
    } catch {
      /* tekrar */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!hazir) {
    await admin
      .from('live_clip_requests')
      .update({ status: 'failed', error_code: 'dosya_yok' })
      .eq('id', requestId);
    return Response.json({ ok: false, code: 'dosya_yok' }, { status: 200, headers: corsHeaders });
  }

  await admin
    .from('live_clip_requests')
    .update({ status: 'ready', media_url: url, media_path: path })
    .eq('id', requestId);

  return Response.json({ ok: true, url }, { headers: corsHeaders });
});
