#!/usr/bin/env node
/** Filipino quality: empty, Turkish leftovers, still-identical-to-EN mid/long phrases. */
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
      if (depth === 0) {
        return Function(`"use strict"; return (${src.slice(objStart, i + 1)})`)();
      }
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

const fil = Object.fromEntries(
  leaves(JSON.parse(fs.readFileSync(path.join(L, 'fil.json'), 'utf8'))),
);
const en = Object.fromEntries(leaves(extractTs(path.join(L, 'en.ts'), 'en')));
const tr = Object.fromEntries(leaves(extractTs(path.join(L, 'tr.ts'), 'tr')));

const TR = /[ÇĞİÖŞÜçğıöşü]/;
const empty = [];
const turkish = [];
const sameEnLong = [];
const sameTr = [];

for (const [k, enV] of Object.entries(en)) {
  const v = fil[k];
  if (v == null) continue;
  if (!v.trim()) empty.push(k);
  if (TR.test(v)) turkish.push({ k, v });
  if (v === tr[k] && v !== enV && /[A-Za-zÇĞİÖŞÜçğıöşü]{3,}/.test(v)) {
    sameTr.push({ k, v });
  }
  if (v === enV && v !== tr[k]) {
    const words = (v.match(/[A-Za-z]+/g) || []).length;
    if (words >= 3) sameEnLong.push({ k, v });
  }
}

console.log({
  filKeys: Object.keys(fil).length,
  enKeys: Object.keys(en).length,
  empty: empty.length,
  turkishChars: turkish.length,
  sameAsTr: sameTr.length,
  sameAsEn_3plusWords: sameEnLong.length,
});

console.log('\n=== Turkish in FIL ===');
for (const x of turkish.slice(0, 20)) console.log(x.k, ':', JSON.stringify(x.v).slice(0, 90));

console.log('\n=== Same as TR ===');
for (const x of sameTr.slice(0, 25)) console.log(x.k, ':', JSON.stringify(x.v).slice(0, 90));

console.log('\n=== Same as EN (3+ words) sample ===');
for (const x of sameEnLong.slice(0, 35)) console.log(x.k, ':', JSON.stringify(x.v).slice(0, 90));
if (sameEnLong.length > 35) console.log('... +', sameEnLong.length - 35);

// Tab labels spot-check
const tabs = [
  'sekmeler.anaSayfa',
  'sekmeler.durum',
  'sekmeler.mesajlar',
  'sekmeler.profil',
  'sekmeler.cuzdan',
  'ortak.iptal',
  'ortak.kaydet',
  'auth.giris',
];
console.log('\n=== Spot check ===');
for (const k of tabs) console.log(k, '→', fil[k], '| en:', en[k]);
