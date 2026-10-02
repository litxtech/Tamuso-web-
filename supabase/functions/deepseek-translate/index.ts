/**
 * deepseek-translate — JWT auth → DeepSeek → translate chat text.
 * Secret: DEEPSEEK_API_KEY (never on client).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  corsHeaders,
  deepseekChat,
  json,
  langLabel,
  sha256Hex,
} from '../_shared/deepseek/helpers.ts';

const MAX_TEXT = 500;
const CACHE_TTL_HOURS = 168;

type Body = {
  text?: string;
  target_lang?: string;
  source_lang?: string | null;
  context?: 'live' | 'room' | 'dm' | 'call' | 'other';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim();

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);

  if (!apiKey) return json({ ok: false, code: 'CONFIG_ERROR' }, 503);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const text = (body.text ?? '').trim().slice(0, MAX_TEXT);
  const targetLang = (body.target_lang ?? 'en').trim().toLowerCase().slice(0, 8);
  if (!text) return json({ error: 'empty' }, 400);
  if (!targetLang) return json({ error: 'target_lang' }, 400);

  const admin = createClient(supabaseUrl, service);

  const { data: flag } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'live_chat_translation_enabled')
    .maybeSingle();
  if (flag && flag.enabled === false) {
    return json({ ok: false, code: 'FEATURE_DISABLED' }, 403);
  }

  const { data: kill } = await admin
    .from('kill_switches')
    .select('active')
    .eq('key', 'kill_live_chat_translation')
    .maybeSingle();
  if (kill?.active) {
    return json({ ok: false, code: 'FEATURE_DISABLED' }, 403);
  }

  const textHash = await sha256Hex(`${targetLang}\n${text}`);

  const { data: cached } = await admin
    .from('ai_translation_cache')
    .select('translated, source_lang, same_language, expires_at')
    .eq('text_hash', textHash)
    .eq('target_lang', targetLang)
    .maybeSingle();

  if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
    const src = String(cached.source_lang ?? 'und')
      .toLowerCase()
      .split('-')[0] ?? 'und';
    const tgt = targetLang.toLowerCase().split('-')[0] ?? targetLang;
    const same =
      src === tgt || (src === 'und' && !!cached.same_language);
    return json({
      ok: true,
      translated: same ? text : cached.translated,
      corrected: text,
      source_lang: cached.source_lang,
      same_language: same,
      cached: true,
    });
  }

  const targetName = langLabel(targetLang);
  const hint = body.source_lang
    ? `The text is likely in ${langLabel(body.source_lang)}.`
    : 'Detect the source language yourself.';

  const system = `You are a precise chat translator for a live social app.
Return ONLY valid JSON with keys:
- source_lang: ISO 639-1 code (tr, en, es, pt, ar, fr, fil, …)
- corrected: copy of the original text EXACTLY (no typo fixes, no rewriting). Keep for schema compatibility.
- translated: natural translation into ${targetName} (${targetLang}) ONLY if source language differs from ${targetName}. If same language, translated MUST equal the original text exactly.
- same_language: true if source is already ${targetName}

CRITICAL — when to translate:
- Translation is ONLY for two DIFFERENT languages (e.g. Turkish↔English, Spanish↔Arabic).
- If the reader language is Turkish and the message is Turkish (including typos, slang, missing accents: "nasilsin", "nbr", "slm", "tmm", "napion") → source_lang=tr, same_language=true, translated=original. Do NOT "fix" or rewrite.
- Misspelled / informal Turkish is STILL Turkish — never treat it as another language and never invent a translation.
- Same rule for other languages: same_language → translated equals original, no rewriting.

Other rules:
- Translate EVERYTHING faithfully when languages differ: swearing, insults, sexual talk, slang, vulgarity — NEVER censor, soften, asterisk, or refuse.
- Preserve emojis, @mentions, hashtags, and URLs unchanged.
- Do not add commentary, quotes, warnings, or labels.
- Keep length similar; this is live chat (max ~${MAX_TEXT} chars).
- ${hint}`;

  const result = await deepseekChat({
    apiKey,
    system,
    user: text,
    temperature: 0.1,
    maxTokens: 700,
    jsonMode: true,
  });

  if (!result.ok) {
    const status = result.status === 429 ? 429 : 502;
    return json({ ok: false, code: result.code }, status);
  }

  let parsed: {
    source_lang?: string;
    corrected?: string;
    translated?: string;
    same_language?: boolean;
  };
  try {
    parsed = JSON.parse(result.content);
  } catch {
    return json({ ok: false, code: 'PARSE_ERROR' }, 502);
  }

  // Yazım düzeltmesi UI'da kullanılmaz — corrected = orijinal
  const corrected = text;
  const translated = (parsed.translated ?? '').trim() || text;
  const sourceLang = (parsed.source_lang ?? 'und').trim().slice(0, 8);
  const src = sourceLang.toLowerCase().split('-')[0] ?? 'und';
  const tgt = targetLang.toLowerCase().split('-')[0] ?? targetLang;
  // source≠target ise same_language bayrağına güvenme (model sık hata yapıyor)
  const same =
    src === tgt ||
    (src === 'und' && parsed.same_language === true);

  // Aynı dilde asla "çeviri" üretme
  const finalTranslated = same ? text : translated;

  const expires = new Date(
    Date.now() + CACHE_TTL_HOURS * 3600_000,
  ).toISOString();

  await admin.from('ai_translation_cache').upsert(
    {
      text_hash: textHash,
      target_lang: targetLang,
      source_lang: sourceLang,
      translated: finalTranslated,
      same_language: same,
      context: body.context ?? 'other',
      expires_at: expires,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'text_hash,target_lang' },
  );

  return json({
    ok: true,
    translated: finalTranslated,
    corrected,
    source_lang: sourceLang,
    same_language: same,
    cached: false,
  });
});
