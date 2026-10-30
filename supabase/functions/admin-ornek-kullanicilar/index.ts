import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Ornek = {
  display_name: string;
  username: string;
  gender: 'female' | 'male';
  portrait: number;
  bio: string;
  birth: string;
  city_code: string;
  coins: number;
  diamonds: number;
  level: number;
  host?: boolean;
};

/** Gerçekçi TR isimleri + randomuser.me portreleri */
const ORNEKLER: Ornek[] = [
  // Kız
  { display_name: 'Elif Yılmaz', username: 'ornek_elif', gender: 'female', portrait: 44, bio: 'İstanbul · kahve ve gece sohbeti ☕', birth: '1998-03-12', city_code: '34', coins: 4200, diamonds: 180, level: 12 },
  { display_name: 'Zeynep Kara', username: 'ornek_zeynep', gender: 'female', portrait: 65, bio: 'Ankara geceleri · müzik 🎧', birth: '1996-07-21', city_code: '06', coins: 2800, diamonds: 95, level: 9, host: true },
  { display_name: 'Ayşe Demir', username: 'ornek_ayse', gender: 'female', portrait: 68, bio: 'İzmir sahil ruhu 🌊', birth: '2000-01-08', city_code: '35', coins: 1500, diamonds: 40, level: 6 },
  { display_name: 'Defne Aydın', username: 'ornek_defne', gender: 'female', portrait: 32, bio: 'Antalya · tatil ve oda keyfi ☀️', birth: '1999-11-02', city_code: '07', coins: 6100, diamonds: 220, level: 15 },
  { display_name: 'Melis Çelik', username: 'ornek_melis', gender: 'female', portrait: 17, bio: 'Bursa · samimi sohbet 💜', birth: '1997-05-19', city_code: '16', coins: 900, diamonds: 20, level: 4 },
  { display_name: 'Selin Arslan', username: 'ornek_selin', gender: 'female', portrait: 26, bio: 'Eskişehir · öğrenci hayatı 📚', birth: '2001-09-14', city_code: '26', coins: 2200, diamonds: 70, level: 7 },
  { display_name: 'İrem Koç', username: 'ornek_irem', gender: 'female', portrait: 9, bio: 'Gaziantep · sıcak muhabbet 🌶️', birth: '1995-12-30', city_code: '27', coins: 3400, diamonds: 110, level: 10 },
  { display_name: 'Nazlı Şahin', username: 'ornek_nazli', gender: 'female', portrait: 47, bio: 'Trabzon · Karadeniz enerjisi 🌿', birth: '1998-08-03', city_code: '61', coins: 1700, diamonds: 55, level: 8 },
  { display_name: 'Ceren Yıldız', username: 'ornek_ceren', gender: 'female', portrait: 71, bio: 'Konya · sakin akşamlar 🌙', birth: '1994-04-25', city_code: '42', coins: 5100, diamonds: 300, level: 14, host: true },
  { display_name: 'Ece Kurt', username: 'ornek_ece', gender: 'female', portrait: 12, bio: 'Mersin · deniz kokusu 🐚', birth: '2002-02-17', city_code: '33', coins: 800, diamonds: 15, level: 3 },
  { display_name: 'Sude Aksoy', username: 'ornek_sude', gender: 'female', portrait: 55, bio: 'Adana · neşeli oda ✨', birth: '1999-06-09', city_code: '01', coins: 2600, diamonds: 88, level: 9 },
  { display_name: 'Asya Polat', username: 'ornek_asya', gender: 'female', portrait: 39, bio: 'Samsun · yeni arkadaşlar 💫', birth: '1997-10-11', city_code: '55', coins: 1900, diamonds: 60, level: 7 },
  // Erkek
  { display_name: 'Emre Yılmaz', username: 'ornek_emre', gender: 'male', portrait: 32, bio: 'İstanbul · gece odaları 🎤', birth: '1995-02-14', city_code: '34', coins: 3800, diamonds: 140, level: 11, host: true },
  { display_name: 'Can Demir', username: 'ornek_can', gender: 'male', portrait: 75, bio: 'Ankara · spor ve sohbet ⚽', birth: '1993-08-22', city_code: '06', coins: 4500, diamonds: 200, level: 13 },
  { display_name: 'Burak Kaya', username: 'ornek_burak', gender: 'male', portrait: 11, bio: 'İzmir · rahat ortam 🌊', birth: '1998-12-01', city_code: '35', coins: 1200, diamonds: 35, level: 5 },
  { display_name: 'Mert Aydın', username: 'ornek_mert', gender: 'male', portrait: 52, bio: 'Bursa · müzik ve PK 🔥', birth: '1996-03-28', city_code: '16', coins: 7200, diamonds: 410, level: 18, host: true },
  { display_name: 'Kerem Çelik', username: 'ornek_kerem', gender: 'male', portrait: 22, bio: 'Antalya · yaz vibe ☀️', birth: '2000-07-07', city_code: '07', coins: 2100, diamonds: 75, level: 8 },
  { display_name: 'Onur Şahin', username: 'ornek_onur', gender: 'male', portrait: 41, bio: 'Kayseri · samimi sohbet', birth: '1994-11-19', city_code: '38', coins: 1600, diamonds: 45, level: 6 },
  { display_name: 'Arda Koç', username: 'ornek_arda', gender: 'male', portrait: 8, bio: 'Eskişehir · kampüs enerjisi 🎓', birth: '2001-01-30', city_code: '26', coins: 950, diamonds: 22, level: 4 },
  { display_name: 'Deniz Arslan', username: 'ornek_deniz', gender: 'male', portrait: 67, bio: 'Trabzon · Karadeniz 💚', birth: '1997-09-05', city_code: '61', coins: 3000, diamonds: 120, level: 10 },
  { display_name: 'Yusuf Kurt', username: 'ornek_yusuf', gender: 'male', portrait: 18, bio: 'Gaziantep · muhabbet 🌶️', birth: '1992-05-16', city_code: '27', coins: 5400, diamonds: 260, level: 16 },
  { display_name: 'Baran Yıldız', username: 'ornek_baran', gender: 'male', portrait: 36, bio: 'Diyarbakır · yeni bağlantılar', birth: '1999-04-02', city_code: '21', coins: 1800, diamonds: 50, level: 7 },
  { display_name: 'Tolga Aksoy', username: 'ornek_tolga', gender: 'male', portrait: 60, bio: 'Konya · akşam odaları', birth: '1995-10-24', city_code: '42', coins: 2700, diamonds: 90, level: 9 },
  { display_name: 'Hakan Polat', username: 'ornek_hakan', gender: 'male', portrait: 4, bio: 'Samsun · sohbet & hediye 🎁', birth: '1991-06-13', city_code: '55', coins: 6500, diamonds: 330, level: 17, host: true },
];

function avatarUrl(gender: 'female' | 'male', portrait: number): string {
  const folder = gender === 'female' ? 'women' : 'men';
  return `https://randomuser.me/api/portraits/${folder}/${portrait}.jpg`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anon || !serviceKey) {
      return Response.json({ error: 'env missing' }, { status: 500, headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: me } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!me?.is_admin) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: 'seed' | 'purge' | 'status';
    };
    const action = body.action ?? 'status';

    if (action === 'status') {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_sample', true)
        .is('deleted_at', null);
      return Response.json(
        { ok: true, action: 'status', toplam: count ?? 0 },
        { headers: corsHeaders },
      );
    }

    if (action === 'purge') {
      const { data: rows } = await admin
        .from('profiles')
        .select('id')
        .eq('is_sample', true);
      const ids = (rows ?? []).map((r) => r.id as string);
      const hatalar: string[] = [];
      for (const id of ids) {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error && !/not found/i.test(error.message)) {
          hatalar.push(`${id}: ${error.message}`);
        }
      }
      const { data: temiz, error: temizHata } = await admin.rpc(
        'admin_ornek_kullanicilari_sil',
      );
      const silinen = Number(
        (temiz as { silinen?: number } | null)?.silinen ?? 0,
      );
      if (temizHata) hatalar.push(temizHata.message);
      return Response.json(
        { ok: !temizHata, action: 'purge', silinen, hatalar },
        { headers: corsHeaders },
      );
    }

    if (action !== 'seed') {
      return Response.json({ error: 'action: seed | purge | status' }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Mevcut örnekleri atla (username)
    const { data: mevcut } = await admin
      .from('profiles')
      .select('username')
      .eq('is_sample', true);
    const mevcutSet = new Set((mevcut ?? []).map((m) => (m.username ?? '').toLowerCase()));

    const { data: regions } = await admin
      .from('geo_regions')
      .select('id, code')
      .eq('country_code', 'TR');
    const regionMap = new Map(
      (regions ?? []).map((r) => [String(r.code), r.id as string]),
    );

    let eklenen = 0;
    let atlanan = 0;
    const hatalar: string[] = [];

    for (const o of ORNEKLER) {
      if (mevcutSet.has(o.username.toLowerCase())) {
        atlanan += 1;
        continue;
      }
      const email = `${o.username}@tamuso.sample`;
      const password = `Ornek!${o.username.slice(-4)}${o.portrait}`;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: o.display_name,
          username: o.username,
          gender: o.gender,
          is_sample: true,
          is_guest: false,
          language: 'tr',
        },
      });
      if (createErr || !created.user) {
        hatalar.push(`${o.username}: ${createErr?.message ?? 'create failed'}`);
        continue;
      }
      const uid = created.user.id;
      const regionId = regionMap.get(o.city_code) ?? null;
      await admin
        .from('profiles')
        .update({
          display_name: o.display_name,
          username: o.username,
          gender: o.gender,
          birth_date: o.birth,
          bio: o.bio,
          avatar_url: avatarUrl(o.gender, o.portrait),
          country: 'Türkiye',
          country_code: 'TR',
          region_id: regionId,
          language: 'tr',
          is_guest: false,
          is_sample: true,
          is_host: !!o.host,
          is_verified: true,
          level: o.level,
          xp: o.level * 120,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uid);

      await admin
        .from('wallets')
        .update({
          coins: o.coins,
          diamonds: o.diamonds,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', uid);

      eklenen += 1;
    }

    await admin.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: 'sample_users_seed',
      summary: `Örnek kullanıcı eklendi: ${eklenen}`,
      details: { eklenen, atlanan, hatalar },
    });

    return Response.json(
      {
        ok: true,
        action: 'seed',
        eklenen,
        atlanan,
        toplam_katalog: ORNEKLER.length,
        hatalar,
      },
      { headers: corsHeaders },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
