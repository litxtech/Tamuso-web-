/**
 * ai-music-create — JWT auth → entitlement reserve → ElevenLabs Music → Storage → capture/release
 * API key: ELEVENLABS_API_KEY secret only (never client).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  corsHeaders,
  downsamplePeaks,
  elevenLabsComposeDetailed,
  elevenLabsComposeWithPlan,
  elevenLabsUploadReference,
  buildSimilarCompositionPlan,
  hashText,
  json,
  preparePrompt,
  safeErrorMessage,
  sha256Hex,
} from '../_shared/ai-music/helpers.ts';

type Body = {
  prompt?: string;
  duration_seconds?: number;
  genre_code?: string | null;
  mood?: string | null;
  tempo?: string | null;
  bpm?: number | null;
  language_code?: string | null;
  instruments?: string[] | null;
  structure_hint?: string | null;
  lyrics_mode?: 'ai' | 'user' | 'instrumental';
  lyrics?: string | null;
  /** female | male | choir — enstrümantalde yok sayılır */
  voice_gender?: 'female' | 'male' | 'choir' | null;
  idempotency_key?: string;
  /** Mevcut parçayı yeni talimatla yeniden üret (kütüphane durumu korunur) */
  revise_track_id?: string | null;
  /** Storage path in ai-music-temp for reference audio/video */
  reference_storage_path?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID().slice(0, 12);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const elevenKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!supabaseUrl || !serviceKey || !anon) {
      return json({ ok: false, error: 'CONFIG_ERROR', message: safeErrorMessage('CONFIG_ERROR') }, 500);
    }
    if (!elevenKey) {
      console.error(`[ai-music-create] ${correlationId} missing ELEVENLABS_API_KEY`);
      return json({ ok: false, error: 'CONFIG_ERROR', message: safeErrorMessage('CONFIG_ERROR') }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ ok: false, error: 'UNAUTHORIZED', message: 'Oturum gerekli.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ ok: false, error: 'UNAUTHORIZED', message: 'Geçersiz oturum.' }, 401);
    }

    const body = (await req.json()) as Body;
    const idempotencyKey =
      body.idempotency_key?.trim() ||
      req.headers.get('x-idempotency-key')?.trim() ||
      '';
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return json({ ok: false, error: 'INVALID', message: 'Idempotency key gerekli.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Feature / kill / config
    const { data: cfg } = await admin.from('ai_music_config').select('*').eq('id', 1).maybeSingle();
    const { data: flag } = await admin
      .from('feature_flags')
      .select('enabled')
      .eq('key', 'ai_music_enabled')
      .maybeSingle();
    const { data: kill } = await admin
      .from('kill_switches')
      .select('active')
      .eq('key', 'kill_ai_music_generation')
      .maybeSingle();

    if (!cfg?.enabled || flag?.enabled === false || kill?.active === true) {
      return json({ ok: false, error: 'FEATURE_DISABLED', message: safeErrorMessage('FEATURE_DISABLED') }, 503);
    }

    // Per-user create block (admin moderation)
    const { data: modRow } = await admin
      .from('ai_music_user_moderation')
      .select('create_blocked')
      .eq('user_id', user.id)
      .maybeSingle();
    if (modRow?.create_blocked === true) {
      return json(
        {
          ok: false,
          error: 'CREATE_BLOCKED',
          message: 'Müzik oluşturma hakkın geçici olarak kapatıldı.',
        },
        403,
      );
    }

    const prompt = (body.prompt ?? '').trim();
    const maxPrompt = cfg.prompt_max_length ?? 2000;
    if (!prompt || prompt.length < 3 || prompt.length > maxPrompt) {
      return json({ ok: false, error: 'INVALID', message: 'Geçersiz prompt.' }, 400);
    }

    const durationSeconds = Math.round(Number(body.duration_seconds ?? 60));
    const minSec = cfg.min_track_seconds ?? 60;
    const maxSec = cfg.max_track_seconds ?? 300;
    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds < minSec ||
      durationSeconds > maxSec ||
      durationSeconds < 3 ||
      durationSeconds > 600
    ) {
      return json({ ok: false, error: 'INVALID_DURATION', message: safeErrorMessage('INVALID_DURATION') }, 400);
    }

    // Rights acceptance
    const { data: rights } = await admin
      .from('music_rights_acceptances')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('policy_version', cfg.rights_policy_version)
      .maybeSingle();
    if (!rights) {
      return json({ ok: false, error: 'RIGHTS_REQUIRED', message: safeErrorMessage('RIGHTS_REQUIRED') }, 403);
    }

    const reviseTrackId =
      typeof body.revise_track_id === 'string' && body.revise_track_id.trim()
        ? body.revise_track_id.trim()
        : null;
    let reviseTrack: {
      id: string;
      public_track_code: string | null;
      in_user_library: boolean | null;
      title: string | null;
    } | null = null;

    if (reviseTrackId) {
      const { data: rt, error: rtErr } = await admin
        .from('music_tracks')
        .select('id, public_track_code, in_user_library, title, owner_user_id, source, soft_deleted_at, status')
        .eq('id', reviseTrackId)
        .maybeSingle();
      if (
        rtErr ||
        !rt ||
        rt.owner_user_id !== user.id ||
        rt.source !== 'ai' ||
        rt.soft_deleted_at ||
        rt.status !== 'READY'
      ) {
        return json(
          { ok: false, error: 'INVALID', message: 'Yeniden üretilecek parça bulunamadı.' },
          400,
        );
      }
      reviseTrack = {
        id: rt.id as string,
        public_track_code: rt.public_track_code as string | null,
        in_user_library: rt.in_user_library as boolean | null,
        title: rt.title as string | null,
      };
    }

    // Idempotent replay
    const { data: existing } = await admin
      .from('ai_music_generation_jobs')
      .select('id, status, track_id')
      .eq('user_id', user.id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existing) {
      return json({
        ok: true,
        idempotent: true,
        job_id: existing.id,
        status: existing.status,
        track_id: existing.track_id,
        correlation_id: correlationId,
      });
    }

    // Concurrent + daily limits
    const { count: activeCount } = await admin
      .from('ai_music_generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['QUEUED', 'PREPARING', 'GENERATING', 'PROCESSING']);
    if ((activeCount ?? 0) >= (cfg.max_concurrent_per_user ?? 1)) {
      return json({ ok: false, error: 'CONCURRENT_LIMIT', message: safeErrorMessage('CONCURRENT_LIMIT') }, 429);
    }

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: dayCount } = await admin
      .from('ai_music_generation_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', dayStart.toISOString());
    if ((dayCount ?? 0) >= (cfg.daily_generation_limit ?? 20)) {
      return json({ ok: false, error: 'DAILY_LIMIT', message: safeErrorMessage('DAILY_LIMIT') }, 429);
    }

    const lyricsMode = body.lyrics_mode ?? 'ai';
    const rawVoice = body.voice_gender;
    const voiceGender =
      lyricsMode === 'instrumental'
        ? null
        : rawVoice === 'female' || rawVoice === 'male' || rawVoice === 'choir'
          ? rawVoice
          : null;
    const hasReferencePath =
      typeof body.reference_storage_path === 'string' &&
      !!body.reference_storage_path.trim();
    const prepared = preparePrompt({
      prompt,
      genre: body.genre_code,
      mood: body.mood,
      tempo: body.tempo,
      bpm: body.bpm,
      language: body.language_code,
      instruments: body.instruments ?? undefined,
      lyricsMode,
      lyrics: body.lyrics,
      structure: body.structure_hint,
      hasReference: hasReferencePath,
      voiceGender,
    });

    const promptHash = hashText(prepared.preparedPrompt);
    const lyricsHash = body.lyrics ? hashText(body.lyrics) : null;

    const auditSettings: Record<string, unknown> = {
      request: {
        prompt,
        duration_seconds: durationSeconds,
        genre_code: body.genre_code ?? null,
        mood: body.mood ?? null,
        tempo: body.tempo ?? null,
        bpm: body.bpm ?? null,
        language_code: body.language_code ?? null,
        instruments: body.instruments ?? [],
        structure_hint: body.structure_hint ?? null,
        lyrics_mode: lyricsMode,
        lyrics_len: body.lyrics?.length ?? 0,
        voice_gender: voiceGender,
        revise_track_id: reviseTrackId,
        reference_storage_path: body.reference_storage_path ?? null,
        force_instrumental: prepared.forceInstrumental,
      },
      prepared_prompt: prepared.preparedPrompt,
      title_hint: prepared.titleHint ?? null,
      client: {
        user_agent: req.headers.get('user-agent')?.slice(0, 240) ?? null,
      },
      correlation_id: correlationId,
      captured_at: new Date().toISOString(),
    };

    // Create job first
    const { data: job, error: jobErr } = await admin
      .from('ai_music_generation_jobs')
      .insert({
        user_id: user.id,
        idempotency_key: idempotencyKey,
        status: 'QUEUED',
        provider: 'elevenlabs',
        provider_model: cfg.model_id ?? 'music_v2_5',
        requested_duration_seconds: durationSeconds,
        reserved_seconds: durationSeconds,
        user_prompt: prompt,
        prepared_prompt: prepared.preparedPrompt,
        prompt_hash: promptHash,
        lyrics_text: lyricsMode === 'user' ? body.lyrics?.slice(0, cfg.lyrics_max_length ?? 4000) : null,
        lyrics_mode: lyricsMode,
        force_instrumental: prepared.forceInstrumental,
        genre_code: body.genre_code ?? null,
        mood: body.mood ?? null,
        tempo: body.tempo ?? null,
        bpm: body.bpm ?? null,
        language_code: body.language_code ?? null,
        instruments: body.instruments ?? [],
        structure_hint: body.structure_hint ?? null,
        settings: auditSettings,
        correlation_id: correlationId,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (jobErr || !job) {
      if (jobErr?.code === '23505') {
        const { data: again } = await admin
          .from('ai_music_generation_jobs')
          .select('id, status, track_id')
          .eq('user_id', user.id)
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();
        return json({
          ok: true,
          idempotent: true,
          job_id: again?.id,
          status: again?.status,
          track_id: again?.track_id,
        });
      }
      console.error(`[ai-music-create] ${correlationId} job insert`, jobErr?.message);
      return json({ ok: false, error: 'GENERATION_FAILED', message: safeErrorMessage('GENERATION_FAILED') }, 500);
    }

    const jobId = job.id as string;

    // Atomic reserve BEFORE provider call
    const { data: reserve, error: reserveErr } = await admin.rpc('ai_music_entitlement_reserve', {
      p_user_id: user.id,
      p_generation_id: jobId,
      p_seconds: durationSeconds,
    });

    if (reserveErr || !reserve?.ok) {
      await admin
        .from('ai_music_generation_jobs')
        .update({
          status: 'FAILED',
          error_code: 'INSUFFICIENT_ENTITLEMENT',
          error_message: safeErrorMessage('INSUFFICIENT_ENTITLEMENT'),
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return json(
        {
          ok: false,
          error: 'INSUFFICIENT_ENTITLEMENT',
          message: safeErrorMessage('INSUFFICIENT_ENTITLEMENT'),
          available_seconds: reserve?.available_seconds ?? 0,
        },
        402,
      );
    }

    await admin
      .from('ai_music_generation_jobs')
      .update({ status: 'GENERATING', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    // Respond early path: for long generations we could background — here we await with long timeout
    const musicLengthMs = durationSeconds * 1000;

    const referencePath =
      typeof body.reference_storage_path === 'string' &&
      body.reference_storage_path.trim()
        ? body.reference_storage_path.trim()
        : null;

    let composed: Awaited<ReturnType<typeof elevenLabsComposeDetailed>>;

    if (referencePath) {
      const { data: flagRef } = await admin
        .from('feature_flags')
        .select('enabled')
        .eq('key', 'ai_music_reference_enabled')
        .maybeSingle();
      if (flagRef?.enabled === false || cfg.reference_upload_enabled === false) {
        await admin.rpc('ai_music_entitlement_release', {
          p_user_id: user.id,
          p_generation_id: jobId,
          p_seconds: durationSeconds,
        });
        await admin
          .from('ai_music_generation_jobs')
          .update({
            status: 'FAILED',
            error_code: 'FEATURE_DISABLED',
            error_message: 'Referans yükleme kapalı.',
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
        return json(
          { ok: false, error: 'FEATURE_DISABLED', message: 'Referans ile üretim kapalı.', job_id: jobId },
          503,
        );
      }

      const dl = await admin.storage.from('ai-music-temp').download(referencePath);
      if (dl.error || !dl.data) {
        await admin.rpc('ai_music_entitlement_release', {
          p_user_id: user.id,
          p_generation_id: jobId,
          p_seconds: durationSeconds,
        });
        return json(
          {
            ok: false,
            error: 'INVALID',
            message: 'Referans dosyası bulunamadı.',
            job_id: jobId,
          },
          400,
        );
      }

      const refBytes = new Uint8Array(await dl.data.arrayBuffer());
      const fname = referencePath.split('/').pop() ?? 'reference.mp3';
      const mimeGuess = fname.endsWith('.mp4') || fname.endsWith('.mov')
        ? 'video/mp4'
        : fname.endsWith('.m4a')
          ? 'audio/mp4'
          : fname.endsWith('.wav')
            ? 'audio/wav'
            : 'audio/mpeg';

      const uploaded = await elevenLabsUploadReference({
        apiKey: elevenKey,
        bytes: refBytes,
        filename: fname,
        mime: mimeGuess,
        modelId: cfg.model_id ?? 'music_v2_5',
      });

      // Clean temp (best effort)
      try {
        await admin.storage.from('ai-music-temp').remove([referencePath]);
      } catch {
        /* ignore */
      }

      if (!uploaded.ok) {
        await admin.rpc('ai_music_entitlement_release', {
          p_user_id: user.id,
          p_generation_id: jobId,
          p_seconds: durationSeconds,
        });
        await admin
          .from('ai_music_generation_jobs')
          .update({
            status: 'FAILED',
            error_code: uploaded.code,
            error_message: safeErrorMessage(uploaded.code),
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
        return json({
          ok: false,
          error: uploaded.code,
          message: uploaded.suggestion ?? safeErrorMessage(uploaded.code),
          job_id: jobId,
          suggestion: uploaded.suggestion,
        }, 422);
      }

      // Brief + İngilizce stil etiketleri önde; referans conditioning zayıf/orta
      const plan = buildSimilarCompositionPlan({
        prompt,
        musicLengthMs,
        referenceSongId: uploaded.songId,
        lyrics: lyricsMode === 'user' ? body.lyrics ?? null : null,
        forceInstrumental: prepared.forceInstrumental,
        positiveStyles: prepared.positiveStyles,
        negativeStyles: prepared.negativeStyles,
        language: body.language_code ?? 'tr',
      });

      composed = await elevenLabsComposeWithPlan({
        apiKey: elevenKey,
        compositionPlan: plan,
        modelId: cfg.model_id ?? 'music_v2',
        forceInstrumental: prepared.forceInstrumental,
      });
    } else {
      composed = await elevenLabsComposeDetailed({
        apiKey: elevenKey,
        prompt: prepared.preparedPrompt,
        musicLengthMs,
        modelId: cfg.model_id ?? 'music_v2',
        forceInstrumental: prepared.forceInstrumental,
      });
    }

    if (!composed.ok) {
      await admin.rpc('ai_music_entitlement_release', {
        p_user_id: user.id,
        p_generation_id: jobId,
        p_seconds: durationSeconds,
      });
      await admin
        .from('ai_music_generation_jobs')
        .update({
          status: 'FAILED',
          error_code: composed.code,
          error_message: safeErrorMessage(composed.code),
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          settings: composed.suggestion
            ? { prompt_suggestion: composed.suggestion }
            : {},
        })
        .eq('id', jobId);

      return json({
        ok: false,
        error: composed.code,
        message: safeErrorMessage(composed.code),
        job_id: jobId,
        suggestion: composed.suggestion,
      }, 422);
    }

    if (!composed.audio.length) {
      await admin.rpc('ai_music_entitlement_release', {
        p_user_id: user.id,
        p_generation_id: jobId,
        p_seconds: durationSeconds,
      });
      await admin
        .from('ai_music_generation_jobs')
        .update({
          status: 'FAILED',
          error_code: 'GENERATION_FAILED',
          error_message: safeErrorMessage('GENERATION_FAILED'),
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return json({ ok: false, error: 'GENERATION_FAILED', message: safeErrorMessage('GENERATION_FAILED'), job_id: jobId }, 500);
    }

    await admin
      .from('ai_music_generation_jobs')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    const audioSha = await sha256Hex(composed.audio);
    const storagePath = `ai/${user.id}/${jobId}.mp3`;

    const upload = await admin.storage.from('music-audio').upload(storagePath, composed.audio, {
      contentType: 'audio/mpeg',
      upsert: true,
    });
    if (upload.error) {
      console.error(`[ai-music-create] ${correlationId} storage`, upload.error.message);
      await admin.rpc('ai_music_entitlement_release', {
        p_user_id: user.id,
        p_generation_id: jobId,
        p_seconds: durationSeconds,
      });
      await admin
        .from('ai_music_generation_jobs')
        .update({
          status: 'FAILED',
          error_code: 'GENERATION_FAILED',
          error_message: safeErrorMessage('GENERATION_FAILED'),
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
      return json({ ok: false, error: 'GENERATION_FAILED', message: safeErrorMessage('GENERATION_FAILED'), job_id: jobId }, 500);
    }

    const { data: pub } = admin.storage.from('music-audio').getPublicUrl(storagePath);
    const audioUrl = pub.publicUrl;
    const peaks = downsamplePeaks(composed.waveform);
    const apiTitle = (composed.title && composed.title.trim()) || '';
    const promptLower = prompt.trim().toLowerCase();
    const apiLooksLikePrompt =
      !!apiTitle &&
      promptLower.length >= 8 &&
      (apiTitle.toLowerCase() === promptLower.slice(0, apiTitle.length) ||
        promptLower.startsWith(apiTitle.toLowerCase()) ||
        (apiTitle.length > 32 && promptLower.includes(apiTitle.toLowerCase())));
    const title =
      (!apiLooksLikePrompt && apiTitle) ||
      prepared.titleHint.slice(0, 80) ||
      reviseTrack?.title ||
      'Yeni Müzik';

    const { data: profile } = await admin
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .maybeSingle();

    let trackId: string;
    let publicCode: string;

    if (reviseTrack) {
      trackId = reviseTrack.id;
      publicCode = reviseTrack.public_track_code ?? `TM-${trackId.slice(0, 8).toUpperCase()}`;

      const { error: updErr } = await admin
        .from('music_tracks')
        .update({
          title: title.slice(0, 120),
          audio_url: audioUrl,
          audio_storage_path: storagePath,
          duration_ms: musicLengthMs,
          mime_type: 'audio/mpeg',
          file_size: composed.audio.byteLength,
          file_ext: 'mp3',
          status: 'READY',
          is_active: true,
          genre_code: body.genre_code ?? null,
          mood: body.mood ?? null,
          language_code: body.language_code ?? null,
          is_instrumental: prepared.forceInstrumental,
          prompt_hash: promptHash,
          lyrics_hash: lyricsHash,
          master_audio_sha256: audioSha,
          waveform_peaks: peaks,
          generation_job_id: jobId,
          last_user_prompt: prompt.slice(0, 4000),
          updated_at: new Date().toISOString(),
          metadata: {
            provider: 'elevenlabs',
            model: cfg.model_id,
            correlation_id: correlationId,
            revised: true,
          },
          tags: body.genre_code ? [body.genre_code] : [],
        })
        .eq('id', trackId)
        .eq('owner_user_id', user.id);

      if (updErr) {
        console.error(`[ai-music-create] ${correlationId} revise`, updErr.message);
        await admin.rpc('ai_music_entitlement_release', {
          p_user_id: user.id,
          p_generation_id: jobId,
          p_seconds: durationSeconds,
        });
        await admin
          .from('ai_music_generation_jobs')
          .update({
            status: 'FAILED',
            error_code: 'GENERATION_FAILED',
            error_message: safeErrorMessage('GENERATION_FAILED'),
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
        return json({ ok: false, error: 'GENERATION_FAILED', message: safeErrorMessage('GENERATION_FAILED'), job_id: jobId }, 500);
      }

      const { data: verMax } = await admin
        .from('music_track_versions')
        .select('version_number')
        .eq('track_id', trackId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextVer = Number(verMax?.version_number ?? 1) + 1;

      const { data: version } = await admin
        .from('music_track_versions')
        .insert({
          track_id: trackId,
          version_number: nextVer,
          is_master: false,
          storage_path: storagePath,
          audio_url: audioUrl,
          duration_ms: musicLengthMs,
          mime_type: 'audio/mpeg',
          file_size: composed.audio.byteLength,
          audio_sha256: audioSha,
          waveform_peaks: peaks,
          created_by: user.id,
          edit_metadata: { kind: 'revise', prompt_hash: promptHash },
        })
        .select('id')
        .single();

      if (version?.id) {
        await admin
          .from('music_tracks')
          .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
          .eq('id', trackId);
      }

      await admin
        .from('music_passports')
        .update({
          prompt_hash: promptHash,
          lyrics_hash: lyricsHash,
          master_audio_sha256: audioSha,
          duration_ms: musicLengthMs,
          provider_generation_id: composed.songId,
          version: nextVer,
        })
        .eq('track_id', trackId);
    } else {
      publicCode = `TM-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

      const { data: track, error: trackErr } = await admin
        .from('music_tracks')
        .insert({
          title: title.slice(0, 120),
          artist_name: profile?.username ?? profile?.display_name ?? null,
          audio_url: audioUrl,
          audio_storage_path: storagePath,
          duration_ms: musicLengthMs,
          mime_type: 'audio/mpeg',
          file_size: composed.audio.byteLength,
          file_ext: 'mp3',
          status: 'READY',
          is_active: true,
          source: 'ai',
          owner_user_id: user.id,
          created_by: user.id,
          public_track_code: publicCode,
          moderation_status: 'ACTIVE',
          genre_code: body.genre_code ?? null,
          mood: body.mood ?? null,
          language_code: body.language_code ?? null,
          is_instrumental: prepared.forceInstrumental,
          prompt_hash: promptHash,
          lyrics_hash: lyricsHash,
          master_audio_sha256: audioSha,
          waveform_peaks: peaks,
          generation_job_id: jobId,
          last_user_prompt: prompt.slice(0, 4000),
          in_user_library: false,
          rights_status: 'owned',
          rights_ack: true,
          published_at: new Date().toISOString(),
          metadata: {
            provider: 'elevenlabs',
            model: cfg.model_id,
            correlation_id: correlationId,
          },
          tags: body.genre_code ? [body.genre_code] : [],
        })
        .select('id')
        .single();

      if (trackErr || !track) {
        console.error(`[ai-music-create] ${correlationId} track`, trackErr?.message);
        await admin.rpc('ai_music_entitlement_release', {
          p_user_id: user.id,
          p_generation_id: jobId,
          p_seconds: durationSeconds,
        });
        await admin
          .from('ai_music_generation_jobs')
          .update({
            status: 'FAILED',
            error_code: 'GENERATION_FAILED',
            error_message: safeErrorMessage('GENERATION_FAILED'),
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
        return json({ ok: false, error: 'GENERATION_FAILED', message: safeErrorMessage('GENERATION_FAILED'), job_id: jobId }, 500);
      }

      trackId = track.id as string;

      const { data: version } = await admin
        .from('music_track_versions')
        .insert({
          track_id: trackId,
          version_number: 1,
          is_master: true,
          storage_path: storagePath,
          audio_url: audioUrl,
          duration_ms: musicLengthMs,
          mime_type: 'audio/mpeg',
          file_size: composed.audio.byteLength,
          audio_sha256: audioSha,
          waveform_peaks: peaks,
          created_by: user.id,
          edit_metadata: { kind: 'master' },
        })
        .select('id')
        .single();

      if (version?.id) {
        await admin
          .from('music_tracks')
          .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
          .eq('id', trackId);
      }

      await admin.from('music_passports').insert({
        track_id: trackId,
        public_track_code: publicCode,
        creator_user_id: user.id,
        creator_public_handle_snapshot: profile?.username ?? null,
        published_at: new Date().toISOString(),
        ai_provider: 'elevenlabs',
        ai_model: cfg.model_id ?? 'music_v2_5',
        provider_generation_id: composed.songId,
        prompt_hash: promptHash,
        lyrics_hash: lyricsHash,
        master_audio_sha256: audioSha,
        fingerprint_status: 'NOT_AVAILABLE',
        duration_ms: musicLengthMs,
        version: 1,
        terms_version: cfg.terms_version,
        rights_declaration_version: cfg.rights_policy_version,
      });
    }

    // Capture entitlement (provider succeeded — authoritative)
    await admin.rpc('ai_music_entitlement_capture', {
      p_user_id: user.id,
      p_generation_id: jobId,
      p_seconds: durationSeconds,
    });

    await admin
      .from('ai_music_generation_jobs')
      .update({
        status: 'READY',
        track_id: trackId,
        provider_song_id: composed.songId,
        captured_seconds: durationSeconds,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {
          ...auditSettings,
          result: {
            title,
            track_id: trackId,
            public_track_code: publicCode,
            provider_song_id: composed.songId ?? null,
            audio_sha256: audioSha,
            duration_ms: musicLengthMs,
            revised: !!reviseTrack,
            had_reference: !!referencePath,
          },
        },
      })
      .eq('id', jobId);

    // Taste memory for "önceki müziğim gibi"
    try {
      await admin.rpc('ai_music_taste_upsert', {
        p_user_id: user.id,
        p_genre: body.genre_code ?? null,
        p_mood: body.mood ?? null,
        p_tempo: body.tempo ?? null,
        p_language: body.language_code ?? null,
        p_title: title,
        p_track_id: trackId,
        p_prompt: prompt,
        p_settings: {
          duration_seconds: durationSeconds,
          lyrics_mode: lyricsMode,
          instruments: body.instruments ?? [],
          structure_hint: body.structure_hint ?? null,
          bpm: body.bpm ?? null,
          force_instrumental: prepared.forceInstrumental,
        },
      });
    } catch (e) {
      console.error(`[ai-music-create] ${correlationId} taste`, e instanceof Error ? e.message : 'taste');
    }

    // In-app + push notification
    try {
      await admin.from('user_notifications').insert({
        user_id: user.id,
        category: 'system',
        title: 'Müziğin hazır 🎵',
        body: `${title} dinlemeye hazır.`,
        deep_link: `/ai-muzik/${trackId}`,
        payload: { track_id: trackId, job_id: jobId },
      });
      await admin.rpc('bildirim_kuyruga_ekle', {
        p_user_id: user.id,
        p_category: 'system',
        p_title: 'Müziğin hazır 🎵',
        p_body: `${title} dinlemeye hazır.`,
        p_deep_link: `/ai-muzik/${trackId}`,
        p_payload: { track_id: trackId, job_id: jobId },
      });
    } catch (e) {
      console.error(`[ai-music-create] ${correlationId} notify`, e instanceof Error ? e.message : 'notify');
    }

    // Analytics (privacy-safe)
    try {
      await admin.from('analytics_events').insert({
        user_id: user.id,
        event_name: 'ai_music_generation_success',
        props: {
          duration_seconds: durationSeconds,
          genre_code: body.genre_code ?? null,
          instrumental: prepared.forceInstrumental,
        },
      });
    } catch {
      /* ignore */
    }

    console.log(`[ai-music-create] ${correlationId} ready job=${jobId} track=${trackId} ms=${musicLengthMs}`);


    return json({
      ok: true,
      job_id: jobId,
      track_id: trackId,
      status: 'READY',
      title,
      public_track_code: publicCode,
      revised: !!reviseTrack,
      correlation_id: correlationId,
    });
  } catch (e) {
    console.error(`[ai-music-create] ${correlationId}`, e instanceof Error ? e.message : 'error');
    return json({ ok: false, error: 'GENERATION_FAILED', message: safeErrorMessage('GENERATION_FAILED') }, 500);
  }
});
