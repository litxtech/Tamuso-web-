#!/usr/bin/env node
import fs from 'node:fs';

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
    else a.push([q, String(v ?? '')]);
  }
  return a;
}

const en = Object.fromEntries(leaves(extractTs('src/i18n/locales/en.ts', 'en')));
const langs = {
  es: Object.fromEntries(leaves(extractTs('src/i18n/locales/es.ts', 'es'))),
  pt: Object.fromEntries(leaves(extractTs('src/i18n/locales/pt.ts', 'pt'))),
  ar: Object.fromEntries(leaves(JSON.parse(fs.readFileSync('src/i18n/locales/ar.json', 'utf8')))),
  fr: Object.fromEntries(leaves(JSON.parse(fs.readFileSync('src/i18n/locales/fr.json', 'utf8')))),
  fil: Object.fromEntries(leaves(JSON.parse(fs.readFileSync('src/i18n/locales/fil.json', 'utf8')))),
};

const prefixes = [
  'gorunum.',
  'odaDuzen.',
  'odaTema.',
  'sesOda.',
  'odaMuzik.',
  'mesajlar.',
  'mesajV2.',
  'zeusX.',
  'ajans.',
  'aiMuzik.',
  'anaSayfa.',
  'canliYayin.',
  'hediyeAd.',
  'belge.',
  'sehir.',
];

for (const [name, lang] of Object.entries(langs)) {
  console.log('\n### ' + name.toUpperCase());
  for (const b of prefixes) {
    const keys = Object.keys(en).filter((k) => k.startsWith(b));
    let same = 0;
    let miss = 0;
    for (const k of keys) {
      if (!(k in lang)) miss++;
      else if (lang[k] === en[k] && lang[k].length > 2) same++;
    }
    if (miss || same > 2) {
      console.log(
        b.padEnd(16),
        'tot=' + keys.length,
        'miss=' + miss,
        'sameEN=' + same,
        '(' + (keys.length ? Math.round((100 * same) / keys.length) : 0) + '% copy)',
      );
    }
  }
  const miss = Object.keys(en).filter((k) => !(k in lang));
  if (miss.length) {
    const by = {};
    for (const k of miss) {
      const n = k.split('.')[0];
      by[n] = (by[n] || 0) + 1;
    }
    console.log('MISSING NS:', JSON.stringify(by));
    console.log('ALL MISSING:', miss.join(', '));
  }
}
