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
  akim?: boolean;
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

const SAPMA = /karadeniz|black\s*sea|hamsi|anchovy|balıkçılık|balikcilik/i;

function sapmaVar(deger: string) {
  return SAPMA.test(deger);
}

function kismiAlan(ham: string, anahtar: string): string {
  const im = ham.indexOf(`"${anahtar}"`);
  if (im < 0) return '';
  let i = ham.indexOf(':', im + anahtar.length + 2);
  if (i < 0) return '';
  i += 1;
  while (i < ham.length && /\s/.test(ham[i])) i += 1;
  if (ham[i] !== '"') return '';
  i += 1;
  let out = '';
  while (i < ham.length) {
    const c = ham[i];
    if (c === '\\') {
      if (i + 1 >= ham.length) break;
      const n = ham[i + 1];
      if (n === 'n') out += '\n';
      else if (n === 'r') out += '\r';
      else if (n === 't') out += '\t';
      else if (n === '"' || n === '\\' || n === '/') out += n;
      else if (n === 'u') {
        if (i + 5 >= ham.length) break;
        const hex = ham.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      } else out += n;
      i += 2;
      continue;
    }
    if (c === '"') break;
    out += c;
    i += 1;
  }
  return out;
}

function modelGovdesi(parsed: Record<string, unknown>) {
  const parcalar = [
    parsed.title,
    parsed.excerpt,
    parsed.content_html,
    parsed.keywords,
    parsed.focus_topic,
    parsed.seo_title,
    parsed.meta_description,
    parsed.og_title,
    parsed.og_description,
  ];
  if (Array.isArray(parsed.etiketler)) parcalar.push(parsed.etiketler.join(' '));
  if (Array.isArray(parsed.gorsel_sorgulari)) parcalar.push(parsed.gorsel_sorgulari.join(' '));
  if (Array.isArray(parsed.faqs)) parcalar.push(JSON.stringify(parsed.faqs));
  return parcalar.map((x) => String(x ?? '')).join('\n');
}

async function deepseekAkim(
  apiKey: string,
  system: string,
  user: string,
  maxTokens: number,
  onMetin: (ham: string) => void,
): Promise<{ ok: true; metin: string } | { ok: false; code: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 140_000);
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
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: true,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      if (res.status === 429) return { ok: false, code: 'RATE_LIMIT' };
      if (res.status === 401 || res.status === 403) return { ok: false, code: 'CONFIG_ERROR' };
      return { ok: false, code: 'PROVIDER_ERROR' };
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let metin = '';
    let son = 0;
    while (true) {
      const parca = await reader.read();
      if (parca.done) break;
      buf += decoder.decode(parca.value, { stream: true });
      const satirlar = buf.split('\n');
      buf = satirlar.pop() ?? '';
      for (const satir of satirlar) {
        const s = satir.trim();
        if (!s.startsWith('data:')) continue;
        const data = s.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const json = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const delta = json.choices?.[0]?.delta?.content ?? '';
          if (!delta) continue;
          metin += delta;
          const simdi = Date.now();
          if (simdi - son >= 50) {
            son = simdi;
            onMetin(metin);
          }
        } catch {
          /* yarım satır bir sonraki parçayla tamamlanır */
        }
      }
    }
    if (metin) onMetin(metin);
    if (!metin) return { ok: false, code: 'EMPTY_RESPONSE' };
    return { ok: true, metin };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return { ok: false, code: 'TIMEOUT' };
    return { ok: false, code: 'PROVIDER_ERROR' };
  } finally {
    clearTimeout(timeout);
  }
}

async function deepseekJson(apiKey: string, system: string, user: string, maxTokens: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 140_000);
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
        temperature: 0.3,
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
  const html = metin(kaynak.content_html, 120000);
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

async function uretilmisFoto(prompt: string): Promise<{ url: string; alt: string; credit: string } | null> {
  const tarif = `${prompt}. Photorealistic photograph, shot on a full-frame camera, natural light, sharp detail, real skin and materials, no text, no watermark, no logo, no illustration, no cartoon.`;
  const adres = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(tarif)}`);
  adres.searchParams.set('width', '1280');
  adres.searchParams.set('height', '720');
  adres.searchParams.set('nologo', 'true');
  adres.searchParams.set('model', 'flux');
  adres.searchParams.set('enhance', 'true');
  adres.searchParams.set('seed', String(Math.floor(Math.random() * 1_000_000_000)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(adres, { signal: controller.signal, headers: { Accept: 'image/jpeg,image/png,image/webp' } });
    if (!res.ok) return null;
    const tip = res.headers.get('content-type') || '';
    if (!/^image\/(jpeg|png|webp)/i.test(tip)) return null;
    const bayt = new Uint8Array(await res.arrayBuffer());
    if (bayt.byteLength < 12_000 || bayt.byteLength > 4_500_000) return null;
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !service) return null;
    const admin = createClient(supabaseUrl, service);
    const uzanti = /png/i.test(tip) ? 'png' : /webp/i.test(tip) ? 'webp' : 'jpg';
    const yol = `ai/${crypto.randomUUID()}.${uzanti}`;
    const { error } = await admin.storage.from('blog-gorseller').upload(yol, bayt, {
      contentType: tip.split(';')[0] || 'image/jpeg',
      upsert: false,
    });
    if (error) return null;
    const { data } = admin.storage.from('blog-gorseller').getPublicUrl(yol);
    if (!data.publicUrl) return null;
    return { url: data.publicUrl, alt: metin(prompt, 160), credit: 'Fotoğraf üretimi' };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function kapakGetir(parsed: Record<string, unknown>, yedekKonu: string, uret: boolean) {
  if (uret) {
    const prompt = metin(parsed.foto_prompt, 400) || metin(parsed.title, 180) || yedekKonu;
    if (prompt) {
      const foto = await uretilmisFoto(prompt);
      if (foto) return [foto];
    }
  }
  const sorgular = dizi(parsed.gorsel_sorgulari, 3).map((sorgu) => `${sorgu} photograph`);
  const yedek = `${yedekKonu} photograph`;
  return vikiGorseller((sorgular.length ? sorgular : [yedek]).slice(0, 3));
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
  const kullaniciIstek = metin(body.istek, 4000);
  const istek = kullaniciIstek ||
    'Taslakta başlık veya metin varsa o konuyu tam bir yazıya genişlet. Taslak boşsa Tamuso’da canlı yayın, ses odası, hikâye, mesaj ve hediye kullanımını anlat.';
  const ozet = {
    alan: metin(body.alan, 40),
    title: metin(taslak.title, 180),
    excerpt: metin(taslak.excerpt, 400),
    content_html: metin(taslak.content_html, 16000),
    seo_title: metin(taslak.seo_title, 80),
    meta_description: metin(taslak.meta_description, 200),
    keywords: metin(taslak.keywords, 240),
    focus_topic: metin(taslak.focus_topic, 120),
    etiketler: dizi(taslak.etiketler, 12),
  };
  const konuIzin = kullaniciIstek || [ozet.title, ozet.excerpt, ozet.focus_topic].join('\n');
  const modeleTaslak = { ...ozet, etiketler: [...ozet.etiketler] };
  if (kullaniciIstek && !sapmaVar(kullaniciIstek)) {
    if (sapmaVar(modeleTaslak.title)) modeleTaslak.title = '';
    if (sapmaVar(modeleTaslak.excerpt)) modeleTaslak.excerpt = '';
    if (sapmaVar(modeleTaslak.content_html)) modeleTaslak.content_html = '';
    if (sapmaVar(modeleTaslak.seo_title)) modeleTaslak.seo_title = '';
    if (sapmaVar(modeleTaslak.meta_description)) modeleTaslak.meta_description = '';
    if (sapmaVar(modeleTaslak.keywords)) modeleTaslak.keywords = '';
    if (sapmaVar(modeleTaslak.focus_topic)) modeleTaslak.focus_topic = '';
    modeleTaslak.etiketler = modeleTaslak.etiketler.filter((ad) => !sapmaVar(ad));
  }

  if (mod === 'cevir') {
    const dil = metin(body.dil, 8).toLowerCase();
    if (!DILLER.has(dil) || dil === 'tr') return json({ error: 'dil' }, 400);
    const sonuc = await deepseekJson(
      apiKey,
      `You are Tamuso's blog editor. Translate the Turkish post into ${langLabel(dil)} for search, not word-by-word.
Return JSON only with keys: title, slug, excerpt, content_html, seo_title, meta_description, og_title, og_description, keywords, focus_topic, search_intent, cover_alt, etiketler, faqs.
Rules: keep the same subject; natural ${langLabel(dil)}; do not invent numbers or rename Tamuso; spaces between every word; content_html uses <p>, <h2>, <h3>, <ul><li> only; slug is latin kebab-case; seo_title 45-60 characters; meta_description 120-160 characters; faqs is an array of {question, answer}.`,
      JSON.stringify({ instruction: istek, source: ozet }),
      5000,
    );
    if (!sonuc.ok) return json({ ok: false, code: sonuc.code }, sonuc.code === 'RATE_LIMIT' ? 429 : 502);
    return json({ ok: true, ceviri: taslakCikti(sonuc.parsed) });
  }

  const dar = mod === 'oner' || mod === 'gorsel';
  const sistem = `You are Tamuso's editorial assistant. You have full authority to write, expand, and finish the blog post the editor asked for.

What Tamuso is
Tamuso is an 18+ live social app. People open voice rooms, go live, post stories, send direct messages, send gifts, use coins and diamonds, join agencies, play games, compete in leagues, and make AI music. Profiles and follow are part of the app. Explain these product behaviors with concrete steps.

How you work
- The assignment is the only subject. Obey it, then expand it with structure, steps, examples, SEO, and FAQs that stay on that subject.
- When assignment_wins is true, ignore any different topic already sitting in the draft. The draft is leftover text, not a new assignment.
- When assignment_wins is false, expand the draft title and body. If those are empty, explain how to use Tamuso: live streams, voice rooms, stories, messages, and gifts.
- Write a long article when asked to fill the post: at least four h2 sections and eight paragraphs. The first paragraph answers the assignment immediately. Do not stop after a short intro.
- Do not invent user counts, revenue, awards, rankings, or quotes.

Return JSON only.
Keys, in this order: title, content_html, excerpt, seo_title, meta_description, og_title, og_description, keywords, focus_topic, search_intent, cover_alt, slug, etiketler, faqs, foto_prompt, gorsel_sorgulari.
Rules:
- ${dar ? 'Return null for title, excerpt, content_html and every other prose field. etiketler and gorsel_sorgulari must match the draft subject.' : 'Write every prose field so the post is complete. If focus_field names one box, make that box the strongest, and still complete the empty companion fields (SEO, tags, FAQ) on the same subject.'}
- Normal sentences with spaces between words. Never glue words together.
- content_html: several <p> blocks plus <h2>, <h3>, <ul>, <li>. No h1, no script. Turkish unless the assignment asks for another language.
- seo_title 45-60 characters. meta_description 120-160 characters. excerpt about 140-180 characters.
- etiketler: short tags in the post language that match the assignment.
- foto_prompt: one English sentence describing a single photorealistic photograph of the article subject. Real place, object, or person. No words in the picture.
- gorsel_sorgulari: 2 or 3 English search phrases for real photographs of the assignment.
- faqs: 3 or 4 {question, answer} about the same subject.
- slug: latin kebab-case.`;
  const kullanici = JSON.stringify({
    focus_field: ozet.alan || null,
    assignment: istek,
    assignment_wins: Boolean(kullaniciIstek),
    draft: modeleTaslak,
  });

  if (body.akim === true && !dar) {
    const encoder = new TextEncoder();
    const akis = new ReadableStream({
      async start(controller) {
        const gonder = (olay: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(olay)}\n\n`));
        };
        const yaz = (ham: string) => {
          gonder({
            tur: 'yazi',
            baslik: kismiAlan(ham, 'title'),
            html: kismiAlan(ham, 'content_html'),
            ozet: kismiAlan(ham, 'excerpt'),
          });
        };
        try {
          let akimSonuc = await deepseekAkim(apiKey, sistem, kullanici, 8000, yaz);
          if (!akimSonuc.ok) {
            gonder({ tur: 'hata', code: akimSonuc.code });
            return;
          }
          let parsedAkim = jsonAyikla(akimSonuc.metin);
          if (!parsedAkim) {
            gonder({ tur: 'hata', code: 'BAD_JSON' });
            return;
          }
          if (sapmaVar(modelGovdesi(parsedAkim)) && !sapmaVar(konuIzin)) {
            gonder({ tur: 'sifirla' });
            akimSonuc = await deepseekAkim(
              apiKey,
              `${sistem}\nThe assignment is the only allowed subject. Discard the previous draft completely.`,
              JSON.stringify({
                focus_field: ozet.alan || null,
                assignment: istek,
                assignment_wins: true,
                instruction: 'Write a fresh complete article about the assignment. The first paragraph answers it. Stay on that subject.',
              }),
              8000,
              yaz,
            );
            if (!akimSonuc.ok) {
              gonder({ tur: 'hata', code: akimSonuc.code });
              return;
            }
            parsedAkim = jsonAyikla(akimSonuc.metin);
            if (!parsedAkim || (sapmaVar(modelGovdesi(parsedAkim)) && !sapmaVar(konuIzin))) {
              gonder({ tur: 'hata', code: 'OFF_TOPIC' });
              return;
            }
          }
          const konuSerbestAkim = sapmaVar(konuIzin);
          const onerilerAkim = {
            etiketler: dizi(parsedAkim.etiketler).filter((ad) => konuSerbestAkim || !sapmaVar(ad)),
            sehir_adlari: [] as string[],
            baliklar: [] as string[],
          };
          const gorselYedekAkim = [metin(parsedAkim.focus_topic, 80), ozet.title, kullaniciIstek, 'live streaming']
            .find((sorgu) => sorgu && (konuSerbestAkim || !sapmaVar(sorgu))) ?? 'live streaming';
          gonder({
            tur: 'bitti',
            taslak: taslakCikti(parsedAkim),
            oneriler: onerilerAkim,
            gorseller: await kapakGetir(parsedAkim, gorselYedekAkim, true),
          });
        } catch {
          gonder({ tur: 'hata', code: 'PROVIDER_ERROR' });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(akis, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }

  const sonuc = await deepseekJson(
    apiKey,
    sistem,
    kullanici,
    dar ? 1200 : 8000,
  );
  if (!sonuc.ok) return json({ ok: false, code: sonuc.code }, sonuc.code === 'RATE_LIMIT' ? 429 : 502);

  let parsed = sonuc.parsed;
  if (!dar && sapmaVar(modelGovdesi(parsed)) && !sapmaVar(konuIzin)) {
    const tekrar = await deepseekJson(
      apiKey,
      `${sistem}\nThe assignment is the only allowed subject. Discard the previous draft completely.`,
      JSON.stringify({
        focus_field: ozet.alan || null,
        assignment: istek,
        assignment_wins: true,
        instruction: 'Write a fresh complete article about the assignment. Stay on that subject. Do not turn Tamuso into a regional tourism or fishing product.',
      }),
      8000,
    );
    if (!tekrar.ok) return json({ ok: false, code: tekrar.code }, tekrar.code === 'RATE_LIMIT' ? 429 : 502);
    parsed = tekrar.parsed;
    if (sapmaVar(modelGovdesi(parsed)) && !sapmaVar(konuIzin)) {
      return json({ ok: false, code: 'OFF_TOPIC' });
    }
  }

  const konuSerbest = sapmaVar(konuIzin);
  const oneriler = {
    etiketler: dizi(parsed.etiketler).filter((ad) => konuSerbest || !sapmaVar(ad)),
    sehir_adlari: [] as string[],
    baliklar: [] as string[],
  };
  const gorselYedek = [metin(parsed.focus_topic, 80), ozet.title, kullaniciIstek, 'live streaming']
    .find((sorgu) => sorgu && (konuSerbest || !sapmaVar(sorgu))) ?? 'live streaming';
  const gorseller = dar && mod !== 'gorsel' ? [] : await kapakGetir(parsed, gorselYedek, true);

  return json({
    ok: true,
    taslak: dar ? null : taslakCikti(parsed),
    oneriler,
    gorseller,
  });
});
