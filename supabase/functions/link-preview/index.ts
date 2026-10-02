/**
 * Link preview fetcher — SSRF-safe server-side OG metadata.
 * Does NOT forward user cookies/auth to remote sites.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 512_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;
const TTL_HOURS_DEFAULT = 168;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPrivateIp(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true;
  if (BLOCKED_HOSTS.has(h)) return true;
  // IPv4
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (m) {
    const a = +m[1], b = +m[2];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reserved
  }
  // IPv6 local / link-local / ULA
  if (h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  if (h === "::" || h.startsWith("::ffff:127.") || h.startsWith("::ffff:10.")) return true;
  if (h.includes("metadata")) return true;
  return false;
}

function parseAndValidateUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!u.hostname || isPrivateIp(u.hostname)) return null;
  // Block credentials in URL
  if (u.username || u.password) return null;
  return u;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(
    `${name}\\s*=\\s*["']([^"']*)["']`,
    "i",
  );
  const m = re.exec(tag);
  return m?.[1]?.trim() || null;
}

function extractOg(html: string, pageUrl: string): {
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
} {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const map = new Map<string, string>();
  for (const tag of metas) {
    const prop = (attr(tag, "property") || attr(tag, "name") || "").toLowerCase();
    const content = attr(tag, "content");
    if (prop && content) map.set(prop, content);
  }
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || null;
  let image = map.get("og:image") || map.get("twitter:image") || null;
  if (image) {
    try {
      image = new URL(image, pageUrl).toString();
      const iu = parseAndValidateUrl(image);
      if (!iu) image = null;
    } catch {
      image = null;
    }
  }
  return {
    title: map.get("og:title") || titleTag,
    description: map.get("og:description") || map.get("description") || null,
    image_url: image,
    site_name: map.get("og:site_name") || null,
  };
}

async function fetchSafe(startUrl: URL): Promise<{ url: string; html: string } | { blocked: true } | { failed: true }> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (isPrivateIp(current.hostname)) return { blocked: true };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": "TamusoLinkPreview/1.0",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
        },
      });
      clearTimeout(timer);

      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        if (!loc) return { failed: true };
        const next = parseAndValidateUrl(new URL(loc, current).toString());
        if (!next) return { blocked: true };
        current = next;
        continue;
      }

      if (!res.ok) return { failed: true };
      const ctype = (res.headers.get("content-type") || "").toLowerCase();
      if (!ctype.includes("text/html") && !ctype.includes("application/xhtml")) {
        return { failed: true };
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) return { failed: true };
      const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      return { url: current.toString(), html };
    } catch {
      clearTimeout(timer);
      return { failed: true };
    }
  }
  return { failed: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

  let body: { url?: string; message_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const parsed = body.url ? parseAndValidateUrl(body.url) : null;
  if (!parsed) return json({ ok: false, status: "blocked" });

  // Feature flag
  const admin = createClient(supabaseUrl, service);
  const { data: flag } = await admin
    .from("feature_flags")
    .select("enabled")
    .eq("key", "link_preview_enabled")
    .maybeSingle();
  if (flag && flag.enabled === false) {
    return json({ ok: false, status: "disabled" });
  }

  const urlNorm = parsed.toString();
  const urlHash = await sha256Hex(urlNorm);

  const { data: cached } = await admin
    .from("link_preview_cache")
    .select("*")
    .eq("url_hash", urlHash)
    .maybeSingle();

  const now = Date.now();
  if (cached && new Date(cached.expires_at).getTime() > now) {
    if (cached.status === "ok") {
      const preview = {
        title: cached.title,
        description: cached.description,
        image_url: cached.image_url,
        site_name: cached.site_name,
        url: cached.url,
      };
      if (body.message_id) {
        await userClient.rpc("mesaj_link_preview_bagla", {
          p_message_id: body.message_id,
          p_preview: preview,
        });
      }
      return json({ ok: true, preview, cached: true });
    }
    return json({ ok: false, status: cached.status });
  }

  const fetched = await fetchSafe(parsed);
  const { data: ttlRow } = await admin
    .from("messaging_system_config")
    .select("value_int")
    .eq("key", "link_preview_cache_ttl_hours")
    .maybeSingle();
  const ttlH = ttlRow?.value_int ?? TTL_HOURS_DEFAULT;
  const expires = new Date(Date.now() + ttlH * 3600_000).toISOString();

  if ("blocked" in fetched) {
    await admin.from("link_preview_cache").upsert({
      url_hash: urlHash,
      url: urlNorm,
      status: "blocked",
      fetched_at: new Date().toISOString(),
      expires_at: expires,
    });
    return json({ ok: false, status: "blocked" });
  }
  if ("failed" in fetched) {
    await admin.from("link_preview_cache").upsert({
      url_hash: urlHash,
      url: urlNorm,
      status: "failed",
      fetched_at: new Date().toISOString(),
      expires_at: expires,
    });
    return json({ ok: false, status: "failed" });
  }

  const meta = extractOg(fetched.html, fetched.url);
  let title = meta.title;
  let description = meta.description;
  let image_url = meta.image_url;
  let site_name = meta.site_name;

  // OG yoksa bile hostname ile minimal önizleme — her link açılabilir kart
  if (!title && !description && !image_url) {
    try {
      const host = new URL(fetched.url).hostname.replace(/^www\./i, "");
      title = host;
      site_name = host;
    } catch {
      title = fetched.url;
    }
  }

  await admin.from("link_preview_cache").upsert({
    url_hash: urlHash,
    url: fetched.url,
    title,
    description,
    image_url,
    site_name,
    status: "ok",
    fetched_at: new Date().toISOString(),
    expires_at: expires,
    raw_meta: meta,
  });

  const preview = {
    title,
    description,
    image_url,
    site_name,
    url: fetched.url,
  };

  if (body.message_id) {
    await userClient.rpc("mesaj_link_preview_bagla", {
      p_message_id: body.message_id,
      p_preview: preview,
    });
  }

  return json({ ok: true, preview, cached: false });
});
