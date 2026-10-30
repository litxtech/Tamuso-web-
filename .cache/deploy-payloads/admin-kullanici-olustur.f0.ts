import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Body = {
  email: string;
  password: string;
  display_name?: string;
  username?: string;
  phone_e164?: string;
};

/**
 * Admin: yeni kullanici olustur (auth + profil).
 * Caller must be is_admin.
 */
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

    // Granular RBAC: require admin.admins.create (SUPER_ADMIN bypasses via RPC)
    const { data: canCreate, error: permErr } = await userClient.rpc(
      'admin_has_permission',
      { p_permission: 'admin.admins.create' },
    );
    if (permErr || canCreate !== true) {
      return Response.json(
        { error: 'Forbidden: missing permission admin.admins.create' },
        { status: 403, headers: corsHeaders },
      );
    }

    const body = (await req.json()) as Body;
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';
    if (!email || password.length < 6) {
      return Response.json(
        { error: 'email ve en az 6 karakter sifre gerekli' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: body.display_name ?? null,
        username: body.username ?? null,
      },
    });
    if (createErr || !created.user) {
      return Response.json(
        { error: createErr?.message ?? 'create failed' },
        { status: 400, headers: corsHeaders },
      );
    }

    const uid = created.user.id;
    const patch: Record<string, unknown> = {
      is_guest: false,
      updated_at: new Date().toISOString(),
    };
    if (body.display_name?.trim()) patch.display_name = body.display_name.trim();
    if (body.username?.trim()) patch.username = body.username.trim().toLowerCase();
    if (body.phone_e164?.trim()) patch.phone_e164 = body.phone_e164.trim();

    await admin.from('profiles').update(patch).eq('id', uid);

    await admin.from('admin_audit_logs').insert({
      admin_id: user.id,
      target_user_id: uid,
      action: 'create_user',
      summary: `Yeni kullanici olusturuldu: ${email}`,
      details: { email, username: body.username ?? null },
    });

    return Response.json(
      { ok: true, user_id: uid, email },
      { headers: corsHeaders },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'error' },
      { status: 500, headers: corsHeaders },
    );
  }
});
