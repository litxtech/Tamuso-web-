#!/usr/bin/env node
/** Audit English locale quality: TR leftovers, empty, same-as-TR. */
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
  throw new Error(`parse fail ${file}`);
}

function leaves(o, p = '', a = []) {
  for (const [k, v] of Object.entries(o || {})) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, q, a);
    else a.push([q, v == null ? '' : String(v)]);
  }
  return a;
}

const ALLOW_SAME_TR = new Set([
  // brands / codes legitimately identical
  'oyun.kaskad',
  'oyun.zeus',
  'oyun.nox',
  'pk.baslik',
  'takas.qr',
  'ortak.whatsapp',
  'anaSayfa.whatsapp',
  'auth.destek',
  'auth.epostaPlaceholder',
  'misafirHesap.epostaPlaceholder',
  'aiMuzik.bpm',
  'aiMuzik.kanalIos',
  'aiMuzik.dilEs',
  'aiMuzik.dilEn',
  'aiMuzik.dilTr',
  'aiMuzik.dilAr',
  'modlar.karaoke',
  'hediyeAd.donut',
  'hediyeAd.jet',
  'hediyeAd.perfume',
  'cuzdan.ajansPaketVip',
  'cuzdan.ajansPaketElite',
  'cuzdan.ajansPaketMax',
  'cuzdan.ledgerBonus',
  'belge.whatsapp',
  'banner.whatsappBaslik',
  'banner.instagram',
  'hesapSil.onayKelime',
  'guvenlik.spam',
]);

const tr = Object.fromEntries(leaves(extractTs(path.join(L, 'tr.ts'), 'tr')));
const en = Object.fromEntries(leaves(extractTs(path.join(L, 'en.ts'), 'en')));
const TR = /[ÇĞİÖŞÜçğıöşü]/;

const onlyTr = Object.keys(tr).filter((k) => !(k in en));
const onlyEn = Object.keys(en).filter((k) => !(k in tr));
const empty = [];
const turkishChars = [];
const sameAsTr = [];

for (const [k, v] of Object.entries(en)) {
  if (!v.trim()) empty.push(k);
  if (TR.test(v)) turkishChars.push({ k, v });
  if (
    v === tr[k] &&
    v !== k &&
    /[A-Za-zÇĞİÖŞÜçğıöşü]{3,}/.test(v) &&
    !ALLOW_SAME_TR.has(k)
  ) {
    // skip pure placeholders
    if (/^[\s\d\{\}\.\,\:\-\/\+\@\%\#\&\*\!\?\(\)\[\]\|]+$/.test(v)) continue;
    sameAsTr.push({ k, v });
  }
}

console.log('EN', Object.keys(en).length, 'TR', Object.keys(tr).length);
console.log('onlyTr', onlyTr.length, 'onlyEn', onlyEn.length, 'empty', empty.length);
console.log('turkishCharsInEn', turkishChars.length);
console.log('sameAsTr (suspect)', sameAsTr.length);

console.log('\n=== Turkish chars in EN values ===');
for (const x of turkishChars) console.log(`  ${x.k}: ${JSON.stringify(x.v).slice(0, 100)}`);

console.log('\n=== Same as TR (sample 60) ===');
for (const x of sameAsTr.slice(0, 60)) console.log(`  ${x.k}: ${JSON.stringify(x.v).slice(0, 90)}`);
if (sameAsTr.length > 60) console.log(`  ... +${sameAsTr.length - 60}`);

fs.writeFileSync(
  path.join(ROOT, 'scripts', '_i18n_en_same_tr.json'),
  JSON.stringify(sameAsTr, null, 2),
);
fs.writeFileSync(
  path.join(ROOT, 'scripts', '_i18n_en_turkish_chars.json'),
  JSON.stringify(turkishChars, null, 2),
);
