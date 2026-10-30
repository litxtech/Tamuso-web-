import fs from 'node:fs';

for (const l of fs.readFileSync('.env', 'utf8').split(/\n/)) {
  const t = l.replace(/^\uFEFF/, '').trim();
  const i = t.indexOf('=');
  if (i < 0) continue;
  const k = t.slice(0, i);
  if (!/SUPABASE|APP_ENV/.test(k)) continue;
  const raw = t.slice(i + 1).trim();
  const v = raw.replace(/^["']|["']$/g, '');
  console.log(k, 'len', v.length);
}
