#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = path.join(ROOT, 'src', 'i18n', 'locales');

function extractTs(file, name) {
  const src = fs.readFileSync(file, 'utf8');
  const marker = `export const ${name}`;
  const start = src.indexOf(marker);
  const objStart = src.indexOf('{', start);
  let i = objStart;
  let depth = 0;
  let inS = null;
  let esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inS) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === inS) inS = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inS = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return Function(`return (${src.slice(objStart, i + 1)})`)();
    }
  }
}

function leaves(o, p = '', a = []) {
  for (const [k, v] of Object.entries(o || {})) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, q, a);
    else a.push([q, v == null ? '' : String(v)]);
  }
  return a;
}

function load(code) {
  if (['ar', 'fr', 'fil'].includes(code)) {
    return Object.fromEntries(leaves(JSON.parse(fs.readFileSync(path.join(L, `${code}.json`), 'utf8'))));
  }
  return Object.fromEntries(leaves(extractTs(path.join(L, `${code}.ts`), code)));
}

const en = load('en');
const tr = load('tr');
const fil = load('fil');
const suspects = [];
for (const [k, enVal] of Object.entries(en)) {
  const val = fil[k];
  if (val == null) continue;
  if (val === enVal && val !== tr[k] && /[A-Za-z]{3,}/.test(val)) {
    const words = (val.match(/[A-Za-z]+/g) || []).length;
    if (words <= 2) continue;
    suspects.push({ key: k, en: enVal });
  }
}
fs.writeFileSync('scripts/_i18n_fil_midlong.json', JSON.stringify(suspects, null, 2));
console.log(suspects.length);
for (const s of suspects) console.log(s.key);
