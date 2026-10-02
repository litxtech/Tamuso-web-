import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken } from 'npm:livekit-server-sdk@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type LiveKitRol = 'listener' | 'speaker' | 'host' | 'publisher';

function rolGrant(role: LiveKitRol) {
  switch (role) {
    case 'host':
    case 'publisher':
      return {
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      };
    case 'speaker':
      return {
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      };
    default:
      return {
        roomJoin: true,
        canPublish: false,
        canSubscribe: true,
        canPublishData: false,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY');

    if (!apiKey || !apiSecret || !livekitUrl) {
      return Response.json(
        { error: 'LiveKit secrets missing on Edge Function' },
        { status: 500, headers: corsHeaders },
      );
    }
    if (!supabaseUrl || !supabaseAnon) {
      return Response.json(
        { error: 'Supabase env missing' },
        { status: 500, headers: corsHeaders },
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = (await req.json()) as {
      roomName?: string;
      role?: LiveKitRol;
    };
    const roomName = body.roomName?.trim();
    const role: LiveKitRol = body.role ?? 'listener';

    if (!roomName || roomName.length > 128) {
      return Response.json(
        { error: 'Invalid roomName' },
        { status: 400, headers: corsHeaders },
      );
    }
    if (!['listener', 'speaker', 'host', 'publisher'].includes(role)) {
      return Response.json(
        { error: 'Invalid role' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { error: kilitHata } = await supabase.rpc('rtc_saglayici_kilit_kontrol', {
      p_saglayici: 'LIVEKIT',
    });
    if (kilitHata && !kilitHata.message.includes('does not exist')) {
      return Response.json(
        { error: kilitHata.message },
        { status: kilitHata.message.includes('uyusmuyor') ? 409 : 403, headers: corsHeaders },
      );
    }

    // Audit + kill switch (migration 006)
    const { error: auditError } = await supabase.rpc('livekit_token_istegi_kaydet', {
      p_room_name: roomName,
      p_role: role,
    });
    if (auditError) {
      return Response.json(
        { error: auditError.message },
        { status: 403, headers: corsHeaders },
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: user.email ?? user.id.slice(0, 8),
      ttl: '6h',
    });
    at.addGrant({
      room: roomName,
      ...rolGrant(role),
    });

    const token = await at.toJwt();
    return Response.json(
      { token, url: livekitUrl, roomName, role },
      { headers: corsHeaders },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Token failed';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
