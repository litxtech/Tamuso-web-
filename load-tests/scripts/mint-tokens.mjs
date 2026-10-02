/**
 * Staging/service_role ile loadtest kullanıcı session mint (LOGIN FLOOD DEĞİL).
 * Production service_role ile çalıştırma — env gate.
 *
 * node load-tests/scripts/mint-tokens.mjs
 *
 * Gerekli:
 *   LOADTEST_SUPABASE_URL
 *   LOADTEST_SERVICE_ROLE_KEY   (yalnızca staging)
 *   LOADTEST_USER_PASSWORD
 *   LOADTEST_USER_COUNT=20
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  for (const f of [path.join(root, '.env'), path.join(root, '..', '.env')]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const k = m[1].trim();
      let v = m[2].trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}
loadEnv();

const url = process.env.LOADTEST_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const service = process.env.LOADTEST_SERVICE_ROLE_KEY;
const anon = process.env.LOADTEST_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.LOADTEST_USER_PASSWORD || 'LoadTest!ChangeMe99';
const count = Number(process.env.LOADTEST_USER_COUNT || 20);
const prodRef = 'vdkqrqtrftzhbtquzked';

if (!url || !service || !anon) {
  console.error('URL + SERVICE_ROLE + ANON gerekli');
  process.exit(1);
}
if (url.includes(prodRef) && process.env.LOADTEST_ALLOW_PROD_MINT !== '1') {
  console.error('Production mint kapalı. Staging kullan veya LOADTEST_ALLOW_PROD_MINT=1 (önerilmez).');
  process.exit(2);
}

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [];

for (let i = 1; i <= count; i++) {
  const n = String(i).padStart(5, '0');
  const email = `loadtest_${n}@loadtest.tamuso.local`;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { is_load_test: true, display_name: `loadtest_${n}` },
  });
  if (error && !String(error.message).includes('already')) {
    console.warn(email, error.message);
    continue;
  }
  const userId = created?.user?.id;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { data: sess, error: sErr } = await client.auth.signInWithPassword({ email, password });
  if (sErr) {
    console.warn('login', email, sErr.message);
    continue;
  }
  users.push({
    email,
    userId: userId || sess.user?.id,
    token: sess.session?.access_token,
  });
  console.log('ok', email);
}

const out = {
  tokens: users.map((u) => u.token).filter(Boolean),
  profileIds: users.map((u) => u.userId).filter(Boolean),
  users,
};
fs.writeFileSync(path.join(root, 'fixtures', 'tokens.json'), JSON.stringify(out, null, 2));
console.log(`Wrote ${out.tokens.length} tokens → fixtures/tokens.json`);
