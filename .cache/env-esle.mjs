import fs from 'node:fs';
import path from 'node:path';

const yol = path.resolve('.env');
console.log('exists', fs.existsSync(yol));
for (const satir of fs.readFileSync(yol, 'utf8').split(/\n/)) {
  if (!satir.includes('SUPABASE')) continue;
  const es = satir.match(/^([A-Z0-9_]+)=(.*)$/);
  console.log({
    match: Boolean(es),
    key: es?.[1] || satir.slice(0, 24),
    already: es ? process.env[es[1]] != null : null,
    alreadyLen: es && process.env[es[1]] ? process.env[es[1]].length : 0,
    valueLen: es ? es[2].trim().length : 0,
    code0: satir.charCodeAt(0),
  });
}
