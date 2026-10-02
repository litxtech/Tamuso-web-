import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/ai-music/helpers.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anon) return json({ ok: false }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ ok: false }, 401);

    const url = new URL(req.url);
    const jobId = url.searchParams.get('job_id');
    if (!jobId) return json({ ok: false, error: 'job_id required' }, 400);

    const client = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await client
      .from('ai_music_generation_jobs')
      .select('id, status, track_id, error_code, error_message, requested_duration_seconds, created_at, finished_at')
      .eq('id', jobId)
      .maybeSingle();

    if (error || !data) return json({ ok: false, error: 'Not found' }, 404);
    return json({ ok: true, job: data });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'error' }, 500);
  }
});
