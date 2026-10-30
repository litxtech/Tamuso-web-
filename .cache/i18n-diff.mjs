import fs from 'node:fs';
import path from 'node:path';

function extract(src) {
  const start = src.indexOf('= {');
  if (start < 0) throw new Error('no obj');
  let i = start + 2;
  let depth = 0;
  let inStr = false;
  let quote = '';
  let esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inStr = true;
      quote = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(start + 2, i + 1);
    }
  }
  throw new Error('unbalanced');
}

function flatten(obj, prefix = '') {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
      else out[key] = v;
    }
  }
  return out;
}

function load(file) {
  const src = fs.readFileSync(file, 'utf8');
  const body = extract(src);
  const obj = eval('(' + body + ')');
  return flatten(obj);
}

const dir = 'src/i18n/locales';
const tr = load(path.join(dir, 'tr.ts'));
const langs = ['en', 'es', 'pt', 'ar', 'fr', 'fil'];
const trKeys = Object.keys(tr);
console.log('tr keys', trKeys.length);
for (const l of langs) {
  const o = load(path.join(dir, l + '.ts'));
  const keys = new Set(Object.keys(o));
  const extra = [...keys].filter((k) => !(k in tr));
  const missing = trKeys.filter((k) => !keys.has(k));
  const empty = trKeys.filter((k) => keys.has(k) && (o[k] === '' || o[k] == null));
  const sameAsTr = trKeys.filter(
    (k) =>
      keys.has(k) &&
      typeof o[k] === 'string' &&
      o[k] === tr[k] &&
      /[çğıöşüÇĞİÖŞÜ]/.test(String(o[k])),
  );
  const mojibake = Object.entries(o)
    .filter(([, v]) => typeof v === 'string' && /Ã.|Â.|�/.test(v))
    .map(([k, v]) => k + '=' + String(v).slice(0, 80));
  console.log(
    '\n' + l,
    'keys',
    keys.size,
    'missing',
    missing.length,
    'extra',
    extra.length,
    'empty',
    empty.length,
    'tr-leftover',
    sameAsTr.length,
    'mojibake',
    mojibake.length,
  );
  if (missing.length) console.log('  missing', missing.slice(0, 50).join(', '));
  if (mojibake.length) console.log('  mojibake', mojibake.slice(0, 15).join(' | '));
  if (sameAsTr.length) console.log('  leftover', sameAsTr.slice(0, 30).join(', '));
}
