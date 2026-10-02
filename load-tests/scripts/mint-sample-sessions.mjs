/**
 * Mevcut is_sample kullanıcılar için JWT session üret (yeni user INSERT yok).
 * Service role yalnızca auth admin session — uygulama tablosuna yazmaz.
 *
 * Rate-limit dostu: kullanıcılar arası gecikme + refresh_token saklama.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const repo = path.join(root, '..');

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvFile(path.join(root, '.env'));
loadEnvFile(path.join(repo, '.env'));
loadEnvFile(path.join(repo, '.env.supabase.local'));

const url = (
  process.env.LOADTEST_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/$/, '');
const mgmt = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || 'vdkqrqtrftzhbtquzked';
const limit = Number(process.env.LOADTEST_SAMPLE_TOKEN_COUNT || 40);
const delayMs = Number(process.env.LOADTEST_MINT_DELAY_MS || 800);
const dest = path.join(root, 'fixtures', 'tokens.json');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

if (!url || !mgmt) {
  console.error('URL + SUPABASE_ACCESS_TOKEN gerekli');
  process.exit(1);
}

async function fetchKeys() {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
    headers: { Authorization: `Bearer ${mgmt}`, Accept: 'application/json' },
  });
  if (!r.ok) throw new Error(`api-keys ${r.status}`);
  const keys = await r.json();
  const byName = Object.fromEntries(
    keys.map((k) => [k.name || k.type, k.api_key || k.key]),
  );
  return {
    anon: byName.anon,
    service: byName.service_role,
  };
}

function jwtExp(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    );
    return Number(payload.exp) || 0;
  } catch {
    return 0;
  }
}

/** Mevcut refresh_token'larla access_token yenile (verifyOtp yok). */
async function refreshExisting(anon) {
  if (!fs.existsSync(dest)) return null;
  let prev;
  try {
    prev = JSON.parse(fs.readFileSync(dest, 'utf8'));
  } catch {
    return null;
  }
  const users = Array.isArray(prev.users) ? prev.users : [];
  if (!users.length) return null;

  const refreshed = [];
  for (const u of users) {
    if (!u.refresh_token) continue;
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.refreshSession({
      refresh_token: u.refresh_token,
    });
    if (error || !data.session?.access_token) {
      console.warn('refresh fail', u.email || u.userId, error?.message);
      continue;
    }
    refreshed.push({
      ...u,
      token: data.session.access_token,
      refresh_token: data.session.refresh_token || u.refresh_token,
    });
    await sleep(120);
  }
  if (refreshed.length < 5) return null;
  return {
    minted_at: new Date().toISOString(),
    note: 'Refreshed sessions for existing is_sample users — no new auth.users',
    tokens: refreshed.map((u) => u.token),
    profileIds: refreshed.map((u) => u.userId),
    users: refreshed,
  };
}

async function mintFresh(anon, service) {
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: samples, error } = await admin
    .from('profiles')
    .select('id, username')
    .eq('is_sample', true)
    .is('deleted_at', null)
    .limit(limit);
  if (error) throw error;
  if (!samples?.length) throw new Error('is_sample profil yok');

  const users = [];
  for (const p of samples) {
    const { data: uData, error: uErr } = await admin.auth.admin.getUserById(p.id);
    if (uErr || !uData?.user?.email) {
      console.warn('skip no email', p.id, uErr?.message);
      continue;
    }
    const email = uData.user.email;

    const { data: link, error: lErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (lErr) {
      console.warn('generateLink', email, lErr.message);
      await sleep(delayMs);
      continue;
    }

    const props = link?.properties || {};
    const tokenHash = props.hashed_token;
    const emailOtp = props.email_otp;
    const anonClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let session = null;
    if (emailOtp) {
      const v = await anonClient.auth.verifyOtp({
        email,
        token: emailOtp,
        type: 'email',
      });
      if (!v.error) session = v.data.session;
      else console.warn('verifyOtp email', email, v.error.message);
    }
    if (!session && tokenHash) {
      const v = await anonClient.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink',
      });
      if (!v.error) session = v.data.session;
      else console.warn('verifyOtp hash', email, v.error.message);
    }
    if (!session?.access_token) {
      console.warn('no session', email);
      await sleep(delayMs);
      continue;
    }

    users.push({
      email,
      userId: p.id,
      username: p.username,
      token: session.access_token,
      refresh_token: session.refresh_token,
      is_sample: true,
    });
    console.log('ok', p.username || email);
    await sleep(delayMs);
  }
  return users;
}

function writeOut(out, anon) {
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  const envPath = path.join(root, '.env');
  const envBody = [
    `LOADTEST_SUPABASE_URL=${url}`,
    `LOADTEST_SUPABASE_ANON_KEY=${anon}`,
    `LOADTEST_ENV=production`,
    `LOADTEST_ALLOW_PROD_READ=1`,
    `LOADTEST_TOKENS_FILE=./fixtures/tokens.json`,
    `LOADTEST_THINK_MIN=2`,
    `LOADTEST_THINK_MAX=5`,
    `LOADTEST_HOLD_SEC=180`,
    `LOADTEST_RAMP_SEC=45`,
    `LOADTEST_ABORT_P95_MS=5000`,
    `LOADTEST_ABORT_FAIL_RATE=0.10`,
    `LOADTEST_ABORT_5XX_RATE=0.05`,
    '',
  ].join('\n');
  fs.writeFileSync(envPath, envBody);
  console.log(`\nWrote ${out.tokens.length} tokens → ${dest}`);
}

async function main() {
  const { anon, service } = await fetchKeys();
  if (!anon || !service) throw new Error('anon/service_role alınamadı');

  const preferRefresh = process.env.LOADTEST_FORCE_FRESH_MINT !== '1';
  if (preferRefresh) {
    const refreshed = await refreshExisting(anon);
    if (refreshed) {
      const minExp = Math.min(...refreshed.tokens.map(jwtExp));
      const ttlMin = Math.floor((minExp * 1000 - Date.now()) / 60000);
      writeOut(refreshed, anon);
      console.log(`Refreshed ${refreshed.tokens.length} sessions (min TTL ~${ttlMin}m)`);
      return;
    }
  }

  console.log('Fresh mint (magiclink/verifyOtp) with delay', delayMs, 'ms...');
  const users = await mintFresh(anon, service);
  const out = {
    minted_at: new Date().toISOString(),
    note: 'Sessions for existing is_sample users only — no new auth.users',
    tokens: users.map((u) => u.token),
    profileIds: users.map((u) => u.userId),
    users,
  };
  writeOut(out, anon);
  if (users.length < 5) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
