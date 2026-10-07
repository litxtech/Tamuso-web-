/**
 * blog-asistan — yönetici JWT → DeepSeek → blog alanı, SEO, çeviri.
 * Kapak için Wikimedia Commons’tan gerçek fotoğraf aranır.
 * Secret: DEEPSEEK_API_KEY
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders });
}

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-chat';

const LANG_NAMES: Record<string, string> = {
  tr: 'Turkish',
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  ar: 'Arabic',
  de: 'German',
  ru: 'Russian',
  fr: 'French',
  fil: 'Filipino',
};

function langLabel(code: string): string {
  const c = code.trim().toLowerCase().split('-')[0] ?? 'en';
  return LANG_NAMES[c] ?? code;
}

type Taslak = {
  title?: string;
  excerpt?: string;
  content_html?: string;
  seo_title?: string;
  meta_description?: string;
  og_title?: string;
  og_description?: string;
  keywords?: string;
  focus_topic?: string;
  search_intent?: string;
  cover_alt?: string;
  slug?: string;
  etiketler?: string[];
  faqs?: { question?: string; answer?: string }[];
};

type Body = {
  mod?: 'doldur' | 'oner' | 'gorsel' | 'cevir';
  alan?: string;
  istek?: string;
  dil?: string;
  taslak?: Taslak & { sehirler?: string[] };
};

const DILLER = new Set(['tr', 'en', 'de', 'es', 'ar', 'ru']);

function metin(deger: unknown, limit: number) {
  return String(deger ?? '').trim().slice(0, limit);
}

function htmlTemiz(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<h1(\s[^>]*)?>/gi, '<h2>')
    .replace(/<\/h1>/gi, '</h2>')
    .trim();
}

function jsonAyikla(ham: string): Record<string, unknown> | null {
  const temiz = ham.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(temiz) as Record<string, unknown>;
  } catch {
    const bas = temiz.indexOf('{');
    const son = temiz.lastIndexOf('}');
    if (bas < 0 || son <= bas) return null;
    try {
      return JSON.parse(temiz.slice(bas, son + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

async function deepseekJson(apiKey: string, system: string, user: string, maxTokens: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 429) return { ok: false as const, code: 'RATE_LIMIT' };
      if (res.status === 401 || res.status === 403) return { ok: false as const, code: 'CONFIG_ERROR' };
      return { ok: false as const, code: 'PROVIDER_ERROR' };
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false as const, code: 'EMPTY_RESPONSE' };
    const parsed = jsonAyikla(content);
    if (!parsed) return { ok: false as const, code: 'BAD_JSON' };
    return { ok: true as const, parsed };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return { ok: false as const, code: 'TIMEOUT' };
    return { ok: false as const, code: 'PROVIDER_ERROR' };
  } finally {
    clearTimeout(timeout);
  }
}

function dizi(deger: unknown, limit = 12) {
  if (!Array.isArray(deger)) return [];
  return deger.map((x) => metin(x, 80)).filter(Boolean).slice(0, limit);
}

function faqlar(deger: unknown) {
  if (!Array.isArray(deger)) return [];
  return deger
    .map((x) => {
      const satir = x as { question?: string; answer?: string };
      return { question: metin(satir?.question, 180), answer: metin(satir?.answer, 500) };
    })
    .filter((x) => x.question && x.answer)
    .slice(0, 6);
}

function taslakCikti(kaynak: Record<string, unknown>) {
  const html = metin(kaynak.content_html, 20000);
  return {
    title: metin(kaynak.title, 140) || null,
    excerpt: metin(kaynak.excerpt, 320) || null,
    content_html: html ? htmlTemiz(html) : null,
    seo_title: metin(kaynak.seo_title, 70) || null,
    meta_description: metin(kaynak.meta_description, 180) || null,
    og_title: metin(kaynak.og_title, 90) || null,
    og_description: metin(kaynak.og_description, 200) || null,
    keywords: metin(kaynak.keywords, 240) || null,
    focus_topic: metin(kaynak.focus_topic, 120) || null,
    search_intent: metin(kaynak.search_intent, 160) || null,
    cover_alt: metin(kaynak.cover_alt, 180) || null,
    slug: metin(kaynak.slug, 90) || null,
    etiketler: dizi(kaynak.etiketler),
    faqs: faqlar(kaynak.faqs),
  };
}

async function vikiGorseller(sorgular: string[]) {
  const bulunan: { url: string; alt: string; credit: string }[] = [];
  const gorulen = new Set<string>();
  for (const sorgu of sorgular.slice(0, 3)) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrsearch', sorgu);
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrlimit', '4');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|mime|extmetadata');
    url.searchParams.set('iiurlwidth', '1400');
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TamusoBlog/1.0 (https://www.tamuso.com; editorial)' },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        query?: { pages?: Record<string, { title?: string; imageinfo?: Array<Record<string, unknown>> }> };
      };
      for (const sayfa of Object.values(data.query?.pages ?? {})) {
        const bilgi = sayfa.imageinfo?.[0];
        if (!bilgi) continue;
        const mime = String(bilgi.mime ?? '');
        if (!/^image\/(jpeg|png|webp)$/i.test(mime)) continue;
        const adres = String(bilgi.thumburl || bilgi.url || '');
        if (!adres.startsWith('https://') || gorulen.has(adres)) continue;
        gorulen.add(adres);
        const meta = (bilgi.extmetadata ?? {}) as Record<string, { value?: string }>;
        const sanatci = metin(meta.Artist?.value?.replace(/<[^>]+>/g, ''), 80);
        const lisans = metin(meta.LicenseShortName?.value, 40);
        const aciklama = metin(meta.ImageDescription?.value?.replace(/<[^>]+>/g, ''), 160);
        bulunan.push({
          url: adres,
          alt: aciklama || sayfa.title?.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ') || sorgu,
          credit: [sanatci || 'Wikimedia Commons', lisans].filter(Boolean).join(' · '),
        });
      }
    } catch {
      /* bir sorgu düşerse diğerleri sürer */
    }
    if (bulunan.length >= 8) break;
  }
  return bulunan.slice(0, 8);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY')?.trim();
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);
  const { data: adminMi, error: adminHata } = await userClient.rpc('ben_admin_miyim');
  if (adminHata || adminMi !== true) return json({ ok: false, code: 'FORBIDDEN' }, 403);
  if (!apiKey) return json({ ok: false, code: 'CONFIG_ERROR' }, 503);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const mod = body.mod ?? 'doldur';
  const taslak = body.taslak ?? {};
  const istek = metin(body.istek, 800) || 'Mevcut yazıyı SEO’ya uygun, okunaklı ve ilgili önerilerle tamamla.';
  const ozet = {
    alan: metin(body.alan, 40),
    title: metin(taslak.title, 180),
    excerpt: metin(taslak.excerpt, 400),
    content_html: metin(taslak.content_html, 8000),
    seo_title: metin(taslak.seo_title, 80),
    meta_description: metin(taslak.meta_description, 200),
    keywords: metin(taslak.keywords, 240),
    focus_topic: metin(taslak.focus_topic, 120),
    sehirler: dizi(taslak.sehirler, 8),
    etiketler: dizi(taslak.etiketler, 12),
  };

  if (mod === 'cevir') {
    const dil = metin(body.dil, 8).toLowerCase();
    if (!DILLER.has(dil) || dil === 'tr') return json({ error: 'dil' }, 400);
    const sonuc = await deepseekJson(
      apiKey,
      `You are the Tamuso blog editor. Translate the Turkish post into ${langLabel(dil)} for search, not word-by-word.
Return JSON only with keys: title, slug, excerpt, content_html, seo_title, meta_description, og_title, og_description, keywords, focus_topic, search_intent, cover_alt, etiketler, faqs.
Rules: natural ${langLabel(dil)}; keep facts; do not invent numbers; spaces between every word; content_html uses <p>, <h2>, <h3>, <ul><li> only; slug is latin kebab-case; seo_title 45-60 characters; meta_description 120-160 characters; faqs is an array of {question, answer}.`,
      JSON.stringify({ instruction: istek, source: ozet }),
      3500,
    );
    if (!sonuc.ok) return json({ ok: false, code: sonuc.code }, sonuc.code === 'RATE_LIMIT' ? 429 : 502);
    return json({ ok: true, ceviri: taslakCikti(sonuc.parsed) });
  }

  const dar = mod === 'oner' || mod === 'gorsel';
  const sonuc = await deepseekJson(
    apiKey,
    `You are the Tamuso blog editor for a Turkish social app about Black Sea cities, fishing, and city life.
Return JSON only.
Keys: title, excerpt, content_html, seo_title, meta_description, og_title, og_description, keywords, focus_topic, search_intent, cover_alt, slug, etiketler, faqs, sehir_adlari, baliklar, gorsel_sorgulari.
Rules:
- ${dar ? 'Return null for title, excerpt, content_html and other prose fields. Only fill suggestion arrays and gorsel_sorgulari.' : 'Fill every field the instruction touches. Use null for fields that must stay unchanged.'}
- Normal sentences with spaces between words. Never glue words together.
- content_html: <p>, <h2>, <h3>, <ul>, <li> only. No h1, no script.
- seo_title 45-60 characters. meta_description 120-160 characters. excerpt about 140 characters.
- etiketler: short SEO tags in the post language.
- sehir_adlari: real Turkish city names relevant to the text (Trabzon, Rize, Samsun…).
- baliklar: real fish species relevant to the text (hamsi, palamut, lüfer…).
- gorsel_sorgulari: 2 or 3 English Wikimedia search phrases for real photographs of the subject.
- faqs: up to 4 {question, answer}. Do not invent statistics or quotes.
- slug: latin kebab-case.`,
    JSON.stringify({ field: ozet.alan, instruction: istek, draft: ozet }),
    dar ? 900 : 3200,
  );
  if (!sonuc.ok) return json({ ok: false, code: sonuc.code }, sonuc.code === 'RATE_LIMIT' ? 429 : 502);

  const parsed = sonuc.parsed;
  const oneriler = {
    etiketler: dizi(parsed.etiketler),
    sehir_adlari: dizi(parsed.sehir_adlari),
    baliklar: dizi(parsed.baliklar),
  };
  const sorgular = dizi(parsed.gorsel_sorgulari, 3);
  const gorseller = await vikiGorseller(
    sorgular.length ? sorgular : [metin(parsed.focus_topic, 80) || ozet.title || istek].filter(Boolean),
  );

  return json({
    ok: true,
    taslak: dar ? null : taslakCikti(parsed),
    oneriler,
    gorseller,
  });
});
