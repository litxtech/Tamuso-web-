import { createClient } from 'npm:@supabase/supabase-js@2';
import { RoomServiceClient } from 'npm:livekit-server-sdk@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const ODA_LIMIT = 25;

type Kalite = 'mukemmel' | 'iyi' | 'zayif' | 'koptu' | 'yeni' | 'bilinmiyor';

function httpHost(url: string) {
  return url.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:').replace(/\/$/, '');
}

function sayi(deger: unknown): number {
  if (typeof deger === 'number' && Number.isFinite(deger)) return deger;
  if (typeof deger === 'bigint') return Number(deger);
  if (typeof deger === 'string' && deger.trim() !== '' && Number.isFinite(Number(deger))) {
    return Number(deger);
  }
  return 0;
}

function katilimMs(deger: unknown): number | null {
  const n = sayi(deger);
  if (n <= 0) return null;
  return n > 1e12 ? n : n * 1000;
}

function kaliteHam(deger: unknown): number {
  if (typeof deger === 'number') return deger;
  const ad = String(deger ?? '').toUpperCase();
  if (ad.includes('LOST')) return 3;
  if (ad.includes('EXCELLENT')) return 2;
  if (ad.includes('GOOD')) return 1;
  if (ad.includes('POOR')) return 0;
  return -1;
}

function kaliteSinif(q: unknown, joined: unknown, simdi: number): Kalite {
  const ham = kaliteHam(q);
  const ms = katilimMs(joined);
  if (ham === 3) return 'koptu';
  if (ham === 2) return 'mukemmel';
  if (ham === 1) return 'iyi';
  if (ham === 0) {
    if (ms != null && simdi - ms < 15_000) return 'yeni';
    return 'zayif';
  }
  return 'bilinmiyor';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    if (!supabaseUrl || !supabaseAnon) {
      return Response.json({ ok: false, hata: 'Sunucu ayarı eksik' }, { status: 500, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ ok: false, hata: 'Oturum gerekli' }, { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: adminMi, error: adminHata } = await supabase.rpc('ben_admin_miyim');
    if (adminHata || adminMi !== true) {
      return Response.json({ ok: false, hata: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const { data: tokenOzet, error: tokenHata } = await supabase.rpc('rtc_livekit_token_ozeti');

    if (!apiKey || !apiSecret || !livekitUrl) {
      return Response.json(
        {
          ok: false,
          hata: 'LiveKit sunucu anahtarları okunamadı',
          token: tokenHata ? null : tokenOzet,
          olcum_at: new Date().toISOString(),
        },
        { status: 200, headers: corsHeaders },
      );
    }

    const svc = new RoomServiceClient(httpHost(livekitUrl), apiKey, apiSecret);
    const odalar = await svc.listRooms();
    const simdi = Date.now();
    const secilen = odalar.slice(0, ODA_LIMIT);
    const sayac: Record<Kalite, number> = {
      mukemmel: 0,
      iyi: 0,
      zayif: 0,
      koptu: 0,
      yeni: 0,
      bilinmiyor: 0,
    };
    let katilimci = 0;
    let yayinci = 0;
    let okunanOda = 0;
    let okunamayanOda = 0;

    for (const oda of secilen) {
      const ad = String(oda.name ?? '');
      if (!ad) continue;
      try {
        const kisiler = await svc.listParticipants(ad);
        okunanOda += 1;
        for (const kisi of kisiler) {
          katilimci += 1;
          const tracks = Array.isArray(kisi.tracks) ? kisi.tracks.length : 0;
          if (tracks > 0 || kisi.permission?.canPublish) yayinci += 1;
          const sinif = kaliteSinif(kisi.connectionQuality, kisi.joinedAt, simdi);
          sayac[sinif] += 1;
        }
      } catch {
        okunamayanOda += 1;
      }
    }

    const odaKatilim = odalar.reduce((t, o) => t + sayi(o.numParticipants), 0);

    return Response.json(
      {
        ok: true,
        olcum_at: new Date().toISOString(),
        oda: odalar.length,
        oda_ornek: secilen.length,
        kismi: odalar.length > ODA_LIMIT,
        okunan_oda: okunanOda,
        okunamayan_oda: okunamayanOda,
        katilimci_oda: odaKatilim,
        katilimci,
        yayinci,
        kalite: sayac,
        token: tokenHata ? null : tokenOzet,
      },
      { headers: corsHeaders },
    );
  } catch {
    return Response.json(
      { ok: false, hata: 'LiveKit ölçümü alınamadı', olcum_at: new Date().toISOString() },
      { status: 200, headers: corsHeaders },
    );
  }
});
