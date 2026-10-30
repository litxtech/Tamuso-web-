import { createClient } from 'npm:@supabase/supabase-js@2';
import { AccessToken, RoomServiceClient } from 'npm:livekit-server-sdk@2';

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

async function tokenYanit(
  apiKey: string,
  apiSecret: string,
  livekitUrl: string,
  user: { id: string; email?: string | null },
  roomName: string,
  role: LiveKitRol,
): Promise<Response> {
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // Isıtma: cron + istemci — izleyici ilk token'da soğuk başlatma beklemesin
  if (req.method === 'GET') {
    return Response.json({ ok: true }, { headers: corsHeaders });
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

    const body = (await req.json()) as {
      roomName?: string;
      role?: LiveKitRol;
      action?: string;
      identity?: string;
    };
    const roomName = body.roomName?.trim();
    let role: LiveKitRol = body.role ?? 'listener';

    if (!roomName || roomName.length > 128) {
      return Response.json(
        { error: 'Invalid roomName' },
        { status: 400, headers: corsHeaders },
      );
    }

    const ajansOdasi = roomName.startsWith('am-') || body.action === 'agency-sync';
    if (
      !ajansOdasi &&
      !['listener', 'speaker', 'host', 'publisher'].includes(role)
    ) {
      return Response.json(
        { error: 'Invalid role' },
        { status: 400, headers: corsHeaders },
      );
    }

    // Ajans dışı odalar: kullanıcı + sağlayıcı kilidi + audit tek tur (paralel).
    // RPC'ler auth.uid() ile çalışır; geçersiz JWT'de zaten reddedilir.
    const [userSonuc, kilitSonuc, auditSonuc] = await Promise.all([
      supabase.auth.getUser(),
      ajansOdasi
        ? Promise.resolve({ error: null })
        : supabase.rpc('rtc_saglayici_kilit_kontrol', { p_saglayici: 'LIVEKIT' }),
      ajansOdasi
        ? Promise.resolve({ error: null })
        : supabase.rpc('livekit_token_istegi_kaydet', {
            p_room_name: roomName,
            p_role: role,
          }),
    ]);

    const user = userSonuc.data.user;
    if (userSonuc.error || !user) {
      return Response.json(
        { error: 'Invalid session' },
        { status: 401, headers: corsHeaders },
      );
    }

    if (!ajansOdasi) {
      const kilitHata = kilitSonuc.error as { message: string } | null;
      if (kilitHata && !kilitHata.message.includes('does not exist')) {
        return Response.json(
          { error: kilitHata.message },
          {
            status: kilitHata.message.includes('uyusmuyor') ? 409 : 403,
            headers: corsHeaders,
          },
        );
      }
      const auditHata = auditSonuc.error as { message: string } | null;
      if (auditHata) {
        return Response.json(
          { error: auditHata.message },
          { status: 403, headers: corsHeaders },
        );
      }
      return tokenYanit(apiKey, apiSecret, livekitUrl, user, roomName, role);
    }

    if (body.action === 'agency-sync') {
      if (!roomName.startsWith('am-') || !body.identity) {
        return Response.json({ error: 'ACCESS_DENIED' }, { status: 403, headers: corsHeaders });
      }
      const { data: yetki, error: yetkiHata } = await supabase.rpc(
        'agency_meeting_livekit_uygula',
        { p_room_name: roomName, p_identity: body.identity },
      );
      if (yetkiHata || !yetki) {
        return Response.json(
          { error: yetkiHata?.message ?? 'ACCESS_DENIED' },
          { status: 403, headers: corsHeaders },
        );
      }
      const karar = yetki as { remove?: boolean; can_publish?: boolean };
      try {
        const svc = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
        if (karar.remove) {
          await svc.removeParticipant(roomName, body.identity);
        } else {
          await svc.updateParticipant(roomName, body.identity, {
            permission: {
              canPublish: !!karar.can_publish,
              canSubscribe: true,
              canPublishData: !!karar.can_publish,
            },
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'sync failed';
        return Response.json({ error: message }, { status: 502, headers: corsHeaders });
      }
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    if (roomName.startsWith('am-')) {
      const { data: sunucuRol, error: rolHata } = await supabase.rpc(
        'agency_meeting_livekit_yetkisi',
        { p_room_name: roomName },
      );
      if (rolHata || typeof sunucuRol !== 'string') {
        return Response.json(
          { error: rolHata?.message ?? 'ACCESS_DENIED' },
          { status: 403, headers: corsHeaders },
        );
      }
      role = sunucuRol as LiveKitRol;
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

    return tokenYanit(apiKey, apiSecret, livekitUrl, user, roomName, role);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Token failed';
    return Response.json({ error: message }, { status: 500, headers: corsHeaders });
  }
});
