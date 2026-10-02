/** Shared helpers for AI Music edge functions — no secrets in logs. */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-idempotency-key',
};

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders });
}

export function safeErrorMessage(code: string): string {
  switch (code) {
    case 'INSUFFICIENT_ENTITLEMENT':
      return 'Yeterli AI müzik süren yok. Paket ekleyebilirsin.';
    case 'FEATURE_DISABLED':
      return 'AI Müzik Stüdyosu şu anda bakımda.';
    case 'RATE_LIMIT':
      return 'Çok fazla istek. Biraz sonra tekrar dene.';
    case 'PROMPT_REJECTED':
      return 'İsteğin işlenemedi. Lütfen daha genel bir müzik tanımı yaz.';
    case 'PROVIDER_RATE_LIMIT':
      return 'Müzik servisi yoğun. Biraz sonra tekrar dene.';
    case 'PROVIDER_TIMEOUT':
      return 'Müzik oluşturulamadı. Kullanılan üretim süresi hesabına geri eklendi.';
    case 'GENERATION_FAILED':
      return 'Müzik oluşturulamadı. Kullanılan üretim süresi hesabına geri eklendi.';
    case 'INVALID_DURATION':
      return 'Geçersiz süre seçimi.';
    case 'CONCURRENT_LIMIT':
      return 'Zaten devam eden bir üretimin var.';
    case 'DAILY_LIMIT':
      return 'Günlük üretim limitine ulaştın.';
    case 'RIGHTS_REQUIRED':
      return 'Devam etmek için haklar beyanını kabul etmelisin.';
    case 'CONFIG_ERROR':
      return 'Sunucu yapılandırması eksik. Lütfen daha sonra dene.';
    default:
      return 'Bir sorun oluştu. Lütfen tekrar dene.';
  }
}

export type PreparedPrompt = {
  preparedPrompt: string;
  forceInstrumental: boolean;
  titleHint: string;
  /** İngilizce stil etiketleri — composition_plan positive_styles için */
  positiveStyles: string[];
  negativeStyles: string[];
};

/** Türkçe / günlük prompt → İngilizce müzik üretim dili (ElevenLabs stil alanı İngilizce ister). */
export function extractMusicStyles(input: {
  prompt: string;
  genre?: string | null;
  mood?: string | null;
  tempo?: string | null;
  bpm?: number | null;
  instruments?: string[] | null;
  language?: string | null;
  vocalsHint?: string | null;
  /** Kullanıcı seçimi — prompttaki zıt cinsiyet ipuçlarını ezer */
  voiceGender?: 'female' | 'male' | 'choir' | null;
}): { positive: string[]; negative: string[]; styleSentence: string } {
  const raw = input.prompt.trim();
  const lower = raw.toLowerCase();
  const voice = input.voiceGender ?? null;
  const positive: string[] = [];
  const negative: string[] = [
    'low quality',
    'muffled',
    'distorted noise',
    'karaoke',
    'cover song',
    'spoken instructions',
    'narration',
  ];

  const push = (s: string) => {
    const t = s.trim();
    if (t && !positive.some((x) => x.toLowerCase() === t.toLowerCase())) {
      positive.push(t);
    }
  };

  // Genre / era keywords (TR + EN)
  if (/arabesk[\s\-]*rap|arapesk[\s\-]*rap/i.test(lower)) {
    push('Turkish arabesk-rap');
    if (voice !== 'female' && voice !== 'choir') push('emotional male vocals');
    push('early 2010s Turkish rap');
    push('dramatic strings');
    push('bağlama textures');
    push('trap-influenced drums');
  } else if (/arabesk|arapesk/i.test(lower)) {
    push('Turkish arabesk');
    push('emotional vocals');
    push('dramatic orchestration');
    push('melancholic');
  }
  if (/(^|[^a-z])rap([^a-z]|$)|trap/i.test(lower) && !/arabesk|arapesk/i.test(lower)) {
    push('rap');
    push('hip-hop');
    if (/trap/i.test(lower)) push('trap beats');
  }
  if (/201[0-5]|iki bin on|2012/i.test(lower)) {
    push('early 2010s production');
    push('2012 era sound');
  }
  if (/pop/i.test(lower)) push('pop');
  if (/rock/i.test(lower)) push('rock');
  if (/lo-?fi|lofı|lofi/i.test(lower)) push('lo-fi');
  if (/elektronik|electronic|edm/i.test(lower)) push('electronic');
  if (/karadeniz/i.test(lower)) {
    push('Turkish Black Sea folk');
    push('kemençe');
  }
  // Söz dili yalnızca kullanıcının seçtiği language_code — prompttan otomatik çıkarılmaz
  if (input.language === 'tr') push('Turkish lyrics');
  else if (input.language === 'en') push('English lyrics');
  else if (input.language === 'es') push('Spanish lyrics');
  // Seçim varsa prompttaki zıt cinsiyet taranmaz ("female" içindeki "male" erkek ses eklemez).
  if (voice === 'female') {
    push('female vocals');
    negative.push('male vocals', 'male singer');
  } else if (voice === 'male') {
    push('male vocals');
    negative.push('female vocals', 'female singer');
  } else if (voice === 'choir') {
    push('choir vocals');
  } else {
    if (/kadın|kadin|\bfemale\b/i.test(lower)) push('female vocals');
    if (/erkek|\bmale\b/i.test(lower)) push('male vocals');
    if (/koro|\bchoir\b/i.test(lower)) push('choir vocals');
  }
  if (/enstrümantal|enstrumantal|instrumental/i.test(lower)) {
    push('instrumental only');
    negative.push('vocals', 'singing');
  }
  if (/net|keskin|temiz|clear|clean/i.test(lower)) {
    push('clear vocals');
    push('clean mix');
    negative.push('hiss', 'crackle', 'lo-fi noise');
  }
  if (/cızırtı|cizirti|noise|static/i.test(lower)) {
    negative.push('crackle', 'static', 'distortion');
  }
  if (/gerçekçi|gercekci|realistic/i.test(lower)) {
    push('realistic production');
    push('natural sounding');
  }
  if (/hızlı|hizli|enerjik|fast/i.test(lower)) push('energetic');
  if (/yavaş|yavas|sakin|slow|chill/i.test(lower)) push('slow tempo', 'calm');
  if (/hüzün|huzun|üzgün|uzgun|sad/i.test(lower)) push('melancholic', 'emotional');
  if (/neşeli|neseli|mutlu|happy/i.test(lower)) push('uplifting', 'happy');
  if (/epik|epic|sinematik|cinematic/i.test(lower)) push('epic', 'cinematic');

  if (input.genre) push(String(input.genre).replace(/_/g, ' '));
  if (input.mood) {
    const moodMap: Record<string, string> = {
      Neşeli: 'joyful',
      Hüzünlü: 'melancholic',
      Enerjik: 'energetic',
      Rahat: 'chill',
      Epik: 'epic',
    };
    push(moodMap[input.mood] ?? input.mood);
  }
  if (input.tempo) {
    const tempoMap: Record<string, string> = {
      Yavaş: 'slow tempo',
      Orta: 'mid-tempo',
      Hızlı: 'fast tempo',
    };
    push(tempoMap[input.tempo] ?? input.tempo);
  }
  if (input.bpm && input.bpm > 0) push(`${input.bpm} BPM`);
  if (input.instruments?.length) {
    for (const i of input.instruments) push(i);
  }
  if (input.vocalsHint) push(input.vocalsHint);

  // Defaults so first chunk has 6–7+ styles (ElevenLabs guidance)
  push('great production quality');
  push('cohesive arrangement');
  push('original composition');
  if (positive.length < 7) push('modern studio mix');

  const styleSentence = positive
    .filter((s) => !/great production|cohesive|original composition|modern studio/i.test(s))
    .slice(0, 10)
    .join(', ');

  return { positive: positive.slice(0, 20), negative: negative.slice(0, 15), styleSentence };
}

/** Prompt metninden şarkı başlığı — kullanıcı brief'ini başlık yapma. */
export function buildMusicTitleHint(input: {
  prompt: string;
  genre?: string | null;
  mood?: string | null;
  hasReference?: boolean;
}): string {
  const genre = (input.genre ?? '').trim().toLowerCase();
  const mood = (input.mood ?? '').trim().toLowerCase();
  const lower = input.prompt.toLowerCase();

  if (/arabesk/i.test(lower)) return 'Arabesk Nabız';
  if (/\brap\b/i.test(lower)) return 'Sokak Ritmi';
  if (/lo-?fi/i.test(lower)) return 'Gece Lo-Fi';

  const genreAd: Record<string, string> = {
    pop: 'Pop',
    rock: 'Rock',
    hiphop: 'Hip-Hop',
    electronic: 'Elektronik',
    ambient: 'Ambient',
  };
  const moodAd: Record<string, string> = {
    Neşeli: 'Neşe',
    Hüzünlü: 'Hüzün',
    Enerjik: 'Nabız',
    Rahat: 'Sakin',
    Epik: 'Destan',
  };
  const g = genreAd[genre] || (genre ? genre : '');
  const m = moodAd[mood ?? ''] || '';
  if (g && m) return `${g} ${m}`.slice(0, 48);
  if (m) return m.slice(0, 48);
  if (g) return `${g} Akışı`.slice(0, 48);
  if (input.hasReference) return 'Yeni Uyum';

  const pool = [
    'Gece Rüzgarı',
    'Altın Nabız',
    'Mavi Atlas',
    'Kırık Ayna',
    'Yıldız Tozu',
    'Sessiz Fırtına',
    'Turuncu Ufuk',
    'Cam Şehir',
  ];
  let h = 2166136261;
  const raw = input.prompt.trim();
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return pool[Math.abs(h) % pool.length]!;
}

/**
 * Kullanıcı brief'ini ElevenLabs'in takip edebileceği İngilizce müzik promptuna çevir.
 * Sözler Türkçe kalabilir; stil dili İngilizce olmalı.
 */
export function preparePrompt(input: {
  prompt: string;
  genre?: string | null;
  mood?: string | null;
  tempo?: string | null;
  bpm?: number | null;
  language?: string | null;
  instruments?: string[] | null;
  lyricsMode?: 'ai' | 'user' | 'instrumental';
  lyrics?: string | null;
  structure?: string | null;
  hasReference?: boolean;
  voiceGender?: 'female' | 'male' | 'choir' | null;
}): PreparedPrompt {
  const raw = input.prompt.trim();
  const hasReference = !!input.hasReference;
  const lyricsMode = input.lyricsMode ?? 'ai';
  let forceInstrumental = lyricsMode === 'instrumental';

  const styles = extractMusicStyles({
    prompt: raw,
    genre: input.genre,
    mood: input.mood,
    tempo: input.tempo,
    bpm: input.bpm,
    instruments: input.instruments,
    language: input.language,
    voiceGender: input.voiceGender ?? null,
  });

  if (lyricsMode === 'instrumental' || /enstrümantal|enstrumantal|instrumental only/i.test(raw)) {
    forceInstrumental = true;
  }

  const langCode = (input.language ?? '').trim().toLowerCase();
  const langLabel =
    langCode === 'en'
      ? 'English'
      : langCode === 'es'
        ? 'Spanish'
        : langCode === 'tr'
          ? 'Turkish'
          : langCode
            ? langCode
            : 'Turkish';

  const parts: string[] = [];

  // Stil önde — İngilizce üretim dili
  if (styles.styleSentence) {
    parts.push(`Style: ${styles.styleSentence}.`);
  } else {
    parts.push('Style: original contemporary song, great production quality.');
  }

  // Brief = üretim talimatı; ASLA söz satırı değil
  parts.push(
    `Production notes (direction only — NEVER sing, quote, or recite these words as lyrics): ${raw}`,
  );

  if (hasReference) {
    parts.push(
      'Reference audio was uploaded: lightly match its groove; production notes and Style above take priority.',
    );
  }

  if (!forceInstrumental && input.voiceGender === 'female') {
    parts.push('Lead singer: one female vocalist only. Do not use a male voice.');
  } else if (!forceInstrumental && input.voiceGender === 'male') {
    parts.push('Lead singer: one male vocalist only. Do not use a female voice.');
  } else if (!forceInstrumental && input.voiceGender === 'choir') {
    parts.push('Vocals: choir / layered voices.');
  }

  if (input.structure?.trim()) {
    parts.push(`Structure hint: ${input.structure.trim()}.`);
  }

  // Söz dili = yalnızca Dil seçimi
  if (forceInstrumental) {
    parts.push('Instrumental only. No vocals, no singing, no spoken words.');
  } else if (lyricsMode === 'user' && input.lyrics?.trim()) {
    parts.push(
      `Use ONLY these ${langLabel} lyrics (sing them; do not invent different lyrics):\n${input.lyrics.trim().slice(0, 3000)}`,
    );
  } else {
    parts.push(
      `Write and sing ORIGINAL ${langLabel} song lyrics invented by you. Lyrics language MUST be ${langLabel}. Do not use the production notes, prompt text, or style line as lyrics.`,
    );
  }

  parts.push('High production quality, clear mix, original composition — not a cover.');

  const preparedPrompt = parts.join('\n').slice(0, 3900);
  const titleHint = buildMusicTitleHint({
    prompt: raw,
    genre: input.genre,
    mood: input.mood,
    hasReference,
  });

  return {
    preparedPrompt,
    forceInstrumental,
    titleHint,
    positiveStyles: styles.positive,
    negativeStyles: styles.negative,
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hashText(text: string): string {
  // sync-ish via SubtleCrypto needs async; use simple FNV for prompt_hash labels when needed sync
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

export type ElevenLabsComposeResult =
  | {
      ok: true;
      audio: Uint8Array;
      songId: string | null;
      title: string | null;
      compositionPlan: unknown;
      songMetadata: unknown;
      waveform: unknown;
    }
  | { ok: false; code: string; suggestion?: string };

/** Upload short audio/video reference for similar-style generation. */
export async function elevenLabsUploadReference(input: {
  apiKey: string;
  bytes: Uint8Array;
  filename: string;
  mime: string;
  modelId: string;
}): Promise<
  | { ok: true; songId: string }
  | { ok: false; code: string; suggestion?: string }
> {
  try {
    const form = new FormData();
      form.append(
        'file',
        new Blob([input.bytes.buffer.slice(
          input.bytes.byteOffset,
          input.bytes.byteOffset + input.bytes.byteLength,
        ) as ArrayBuffer], { type: input.mime || 'audio/mpeg' }),
        input.filename || 'reference.mp3',
      );
    form.append('extract_composition_plan', input.modelId || 'music_v2');
    form.append('with_waveform_visual', 'false');

    const res = await fetch('https://api.elevenlabs.io/v1/music/upload', {
      method: 'POST',
      headers: { 'xi-api-key': input.apiKey },
      body: form,
    });

    if (!res.ok) {
      let code = 'GENERATION_FAILED';
      try {
        const errBody = await res.json();
        const status = errBody?.detail?.status ?? errBody?.detail?.[0]?.type;
        if (status === 'copyright' || String(errBody?.detail).includes('copyright')) {
          code = 'PROMPT_REJECTED';
        } else if (res.status === 429) {
          code = 'PROVIDER_RATE_LIMIT';
        }
      } catch {
        if (res.status === 429) code = 'PROVIDER_RATE_LIMIT';
      }
      return {
        ok: false,
        code,
        suggestion:
          'Referans yüklenemedi. Kısa bir ses dosyası (mp3/m4a, ~30 sn) dene.',
      };
    }

    const json = (await res.json()) as { song_id?: string };
    if (!json.song_id) {
      return { ok: false, code: 'GENERATION_FAILED', suggestion: 'Referans song_id yok.' };
    }
    return { ok: true, songId: json.song_id };
  } catch {
    return { ok: false, code: 'GENERATION_FAILED' };
  }
}

/** Build music_v2 plan conditioned on uploaded reference (similar song). */
export function buildSimilarCompositionPlan(input: {
  prompt: string;
  musicLengthMs: number;
  referenceSongId: string;
  conditionStrength?: 'low' | 'medium' | 'high' | 'xhigh';
  lyrics?: string | null;
  forceInstrumental?: boolean;
  positiveStyles?: string[];
  negativeStyles?: string[];
  /** UI dil seçimi — otomatik yok */
  language?: string | null;
}): { chunks: Array<Record<string, unknown>> } {
  const total = Math.max(3000, Math.min(input.musicLengthMs, 600_000));
  const refEnd = Math.min(30_000, Math.max(5_000, Math.floor(total * 0.15)));
  const brief = input.prompt.trim().slice(0, 900);
  const lyrics = input.lyrics?.trim().slice(0, 1200) || null;
  const langCode = (input.language ?? 'tr').trim().toLowerCase();
  const langLabel =
    langCode === 'en'
      ? 'English'
      : langCode === 'es'
        ? 'Spanish'
        : langCode === 'tr'
          ? 'Turkish'
          : langCode || 'Turkish';

  const extracted = extractMusicStyles({
    prompt: brief,
    language: langCode,
  });
  const positiveStyles = (
    input.positiveStyles?.length ? input.positiveStyles : extracted.positive
  ).slice(0, 18);
  const negativeStyles = [
    ...(input.negativeStyles?.length ? input.negativeStyles : extracted.negative),
    'sung production notes',
    'spoken prompt',
    'narration',
    'reading instructions',
  ].slice(0, 15);

  // Kullanıcı net stil yazdıysa referans zayıf kalsın — prompt kazansın
  const strongBrief =
    positiveStyles.filter(
      (s) =>
        !/great production|cohesive|original composition|modern studio|lyrics/i.test(
          s,
        ),
    ).length >= 3;
  const strength =
    input.conditionStrength ?? (strongBrief ? 'low' : 'medium');

  const chunks: Array<Record<string, unknown>> = [];
  let remaining = total;
  let first = true;
  let section = 0;
  while (remaining > 0 && chunks.length < 10) {
    const d = Math.min(remaining, first ? Math.min(45_000, remaining) : 45_000);
    section += 1;
    let text: string;
    if (first) {
      if (lyrics) {
        // Kullanıcı kendi sözünü verdi — yalnızca bunlar söylenir
        text = `[Verse 1]\n${lyrics}`;
      } else if (input.forceInstrumental) {
        text = `[Instrumental]\n{${positiveStyles.slice(0, 5).join(', ')}}`;
      } else {
        // Brief'i verse'e YAZMA — model kendi sözünü üretir
        text =
          `[Verse 1]\n` +
          `{invent original ${langLabel} lyrics; never sing production notes or the user prompt}`;
      }
    } else if (section === 2 && !input.forceInstrumental) {
      text = lyrics
        ? `[Chorus]\n${lyrics.slice(0, 400)}`
        : `[Chorus]\n{invent original ${langLabel} chorus; same song, not the prompt text}`;
    } else if (input.forceInstrumental) {
      text = `[Instrumental]\n{continue same groove}`;
    } else {
      text = `[Verse ${section}]\n{continue original ${langLabel} lyrics; do not recite the prompt}`;
    }

    const chunk: Record<string, unknown> = {
      text,
      duration_ms: Math.max(3000, d),
      positive_styles: first
        ? positiveStyles
        : [
            ...positiveStyles.slice(0, 5),
            'great production quality',
            'consistent mix',
          ],
      negative_styles: negativeStyles,
      context_adherence: first ? 'medium' : 'high',
    };
    if (first) {
      chunk.conditioning_ref = {
        song_id: input.referenceSongId,
        range: { start_ms: 0, end_ms: refEnd },
      };
      chunk.condition_strength = strength;
    }
    chunks.push(chunk);
    remaining -= d;
    first = false;
  }
  return { chunks };
}

/**
 * Compose via /v1/music with composition_plan (reference conditioning).
 */
export async function elevenLabsComposeWithPlan(input: {
  apiKey: string;
  compositionPlan: { chunks: Array<Record<string, unknown>> };
  modelId: string;
  forceInstrumental?: boolean;
}): Promise<ElevenLabsComposeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280_000);
  try {
    const res = await fetch(
      'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: {
          'xi-api-key': input.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg, application/json, multipart/mixed',
        },
        body: JSON.stringify({
          composition_plan: input.compositionPlan,
          model_id: input.modelId,
          force_instrumental: !!input.forceInstrumental,
          store_for_inpainting: false,
        }),
        signal: controller.signal,
      },
    );

    const songId =
      res.headers.get('song-id') ??
      res.headers.get('x-song-id') ??
      res.headers.get('request-id');

    if (!res.ok) {
      let code = 'GENERATION_FAILED';
      let suggestion: string | undefined;
      try {
        const errBody = await res.json();
        const status = errBody?.detail?.status ?? errBody?.detail?.[0]?.type;
        if (status === 'bad_prompt') {
          code = 'PROMPT_REJECTED';
          suggestion = errBody?.detail?.data?.prompt_suggestion;
        } else if (res.status === 429) {
          code = 'PROVIDER_RATE_LIMIT';
        }
      } catch {
        if (res.status === 429) code = 'PROVIDER_RATE_LIMIT';
      }
      return { ok: false, code, suggestion };
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('multipart')) {
      const buf = new Uint8Array(await res.arrayBuffer());
      const parsed = parseMultipartMixed(buf, contentType);
      return {
        ok: true,
        audio: parsed.audio ?? new Uint8Array(),
        songId,
        title:
          (parsed.json as { song_metadata?: { title?: string } })?.song_metadata
            ?.title ?? null,
        compositionPlan:
          (parsed.json as { composition_plan?: unknown })?.composition_plan ??
          null,
        songMetadata:
          (parsed.json as { song_metadata?: unknown })?.song_metadata ?? null,
        waveform:
          (parsed.json as { waveform_visual?: unknown })?.waveform_visual ??
          null,
      };
    }

    const audio = new Uint8Array(await res.arrayBuffer());
    return {
      ok: true,
      audio,
      songId,
      title: null,
      compositionPlan: null,
      songMetadata: null,
      waveform: null,
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, code: 'PROVIDER_TIMEOUT' };
    }
    return { ok: false, code: 'GENERATION_FAILED' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Official: POST https://api.elevenlabs.io/v1/music/detailed
 * Auth header: xi-api-key
 * Body: prompt | composition_plan (not both), music_length_ms, model_id, force_instrumental
 */
export async function elevenLabsComposeDetailed(input: {
  apiKey: string;
  prompt: string;
  musicLengthMs: number;
  modelId: string;
  forceInstrumental: boolean;
}): Promise<ElevenLabsComposeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 280_000);

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/music/detailed?output_format=mp3_44100_128', {
      method: 'POST',
      headers: {
        'xi-api-key': input.apiKey,
        'Content-Type': 'application/json',
        Accept: 'multipart/mixed, application/json, audio/mpeg',
      },
      body: JSON.stringify({
        prompt: input.prompt,
        music_length_ms: input.musicLengthMs,
        model_id: input.modelId,
        force_instrumental: input.forceInstrumental,
        with_waveform_visual: true,
        store_for_inpainting: false,
      }),
      signal: controller.signal,
    });

    const songId =
      res.headers.get('song-id') ??
      res.headers.get('x-song-id') ??
      res.headers.get('request-id');

    if (!res.ok) {
      let code = 'GENERATION_FAILED';
      let suggestion: string | undefined;
      try {
        const errBody = await res.json();
        const status = errBody?.detail?.status ?? errBody?.detail?.[0]?.type;
        if (status === 'bad_prompt') {
          code = 'PROMPT_REJECTED';
          suggestion = errBody?.detail?.data?.prompt_suggestion;
        } else if (res.status === 429) {
          code = 'PROVIDER_RATE_LIMIT';
        }
      } catch {
        if (res.status === 429) code = 'PROVIDER_RATE_LIMIT';
      }
      return { ok: false, code, suggestion };
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('multipart')) {
      const buf = new Uint8Array(await res.arrayBuffer());
      const parsed = parseMultipartMixed(buf, contentType);
      return {
        ok: true,
        audio: parsed.audio ?? new Uint8Array(),
        songId,
        title: (parsed.json as { song_metadata?: { title?: string } })?.song_metadata?.title ?? null,
        compositionPlan: (parsed.json as { composition_plan?: unknown })?.composition_plan ?? null,
        songMetadata: (parsed.json as { song_metadata?: unknown })?.song_metadata ?? null,
        waveform: (parsed.json as { waveform_visual?: unknown })?.waveform_visual ?? null,
      };
    }

    // fallback: raw audio
    const audio = new Uint8Array(await res.arrayBuffer());
    return {
      ok: true,
      audio,
      songId,
      title: null,
      compositionPlan: null,
      songMetadata: null,
      waveform: null,
    };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, code: 'PROVIDER_TIMEOUT' };
    }
    return { ok: false, code: 'GENERATION_FAILED' };
  } finally {
    clearTimeout(timeout);
  }
}

function parseMultipartMixed(
  body: Uint8Array,
  contentType: string,
): { json: unknown; audio: Uint8Array | null } {
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
  if (!boundaryMatch) return { json: null, audio: body };

  const boundary = boundaryMatch[1].trim().replace(/^"|"$/g, '');
  const text = new TextDecoder().decode(body);
  const parts = text.split(`--${boundary}`);
  let json: unknown = null;
  let audio: Uint8Array | null = null;

  for (const part of parts) {
    if (part.includes('application/json')) {
      const idx = part.indexOf('\r\n\r\n');
      const idx2 = idx >= 0 ? idx : part.indexOf('\n\n');
      if (idx2 >= 0) {
        const raw = part.slice(idx2).replace(/^\r?\n\r?\n/, '').replace(/\r?\n--$/, '').trim();
        try {
          json = JSON.parse(raw);
        } catch {
          /* ignore */
        }
      }
    } else if (part.includes('audio/') || part.includes('application/octet-stream')) {
      // Binary split is lossy via text decode — prefer raw body if JSON already found via header-only
      // Re-parse binary properly:
    }
  }

  // Binary-safe multipart parse
  const enc = new TextEncoder();
  const sep = enc.encode(`--${boundary}`);
  const slices = splitBy(body, sep);
  for (const slice of slices) {
    const headerEnd = indexOfSub(slice, enc.encode('\r\n\r\n'));
    if (headerEnd < 0) continue;
    const header = new TextDecoder().decode(slice.slice(0, headerEnd)).toLowerCase();
    let content = slice.slice(headerEnd + 4);
    // trim trailing CRLF
    if (content.length >= 2 && content[content.length - 2] === 13 && content[content.length - 1] === 10) {
      content = content.slice(0, -2);
    }
    if (header.includes('application/json')) {
      try {
        json = JSON.parse(new TextDecoder().decode(content));
      } catch {
        /* ignore */
      }
    } else if (header.includes('audio/') || header.includes('octet-stream')) {
      audio = content;
    }
  }

  return { json, audio };
}

function indexOfSub(hay: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function splitBy(data: Uint8Array, sep: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let start = 0;
  let idx = indexOfSub(data, sep);
  while (idx >= 0) {
    if (idx > start) out.push(data.slice(start, idx));
    start = idx + sep.length;
    idx = indexOfSub(data.slice(start), sep);
    if (idx >= 0) idx = start + idx;
  }
  if (start < data.length) out.push(data.slice(start));
  return out;
}

export function downsamplePeaks(waveform: unknown, target = 64): number[] | null {
  if (!waveform) return null;
  let arr: number[] | null = null;
  if (Array.isArray(waveform)) {
    arr = waveform.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  } else if (typeof waveform === 'object' && waveform && 'peaks' in (waveform as object)) {
    const p = (waveform as { peaks: unknown }).peaks;
    if (Array.isArray(p)) arr = p.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  }
  if (!arr || arr.length === 0) return null;
  if (arr.length <= target) {
    const max = Math.max(...arr.map(Math.abs), 1);
    return arr.map((v) => Math.round((Math.abs(v) / max) * 1000) / 1000);
  }
  const out: number[] = [];
  const step = arr.length / target;
  for (let i = 0; i < target; i++) {
    const a = Math.floor(i * step);
    const b = Math.floor((i + 1) * step);
    let m = 0;
    for (let j = a; j < b; j++) m = Math.max(m, Math.abs(arr[j] ?? 0));
    out.push(m);
  }
  const max = Math.max(...out, 1);
  return out.map((v) => Math.round((v / max) * 1000) / 1000);
}
