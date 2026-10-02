#!/usr/bin/env node
/**
 * Independent key-count verification for all locales.
 * Counts leaf string keys only (nested objects not counted as keys).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = path.join(ROOT, 'src', 'i18n', 'locales');

function extractTs(file, name) {
  const src = fs.readFileSync(file, 'utf8');
  const marker = `export const ${name}`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`no ${name} in ${file}`);
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
    else a.push(q);
  }
  return a;
}

function topLevelNs(o) {
  return Object.keys(o || {}).length;
}

const langs = [
  ['tr', () => extractTs(path.join(L, 'tr.ts'), 'tr')],
  ['en', () => extractTs(path.join(L, 'en.ts'), 'en')],
  ['es', () => extractTs(path.join(L, 'es.ts'), 'es')],
  ['pt', () => extractTs(path.join(L, 'pt.ts'), 'pt')],
  ['ar', () => JSON.parse(fs.readFileSync(path.join(L, 'ar.json'), 'utf8'))],
  ['fr', () => JSON.parse(fs.readFileSync(path.join(L, 'fr.json'), 'utf8'))],
  ['fil', () => JSON.parse(fs.readFileSync(path.join(L, 'fil.json'), 'utf8'))],
];

const sets = {};
console.log('lang | leaf_keys | top_namespaces | file');
console.log('-----|----------:|---------------:|-----');
for (const [code, load] of langs) {
  const obj = load();
  const keys = leaves(obj).sort();
  sets[code] = new Set(keys);
  const file =
    code === 'ar' || code === 'fr' || code === 'fil'
      ? `${code}.json`
      : `${code}.ts`;
  const size = fs.statSync(path.join(L, file)).size;
  console.log(
    `${code.padEnd(4)} | ${String(keys.length).padStart(9)} | ${String(topLevelNs(obj)).padStart(14)} | ${file} (${(size / 1024).toFixed(0)} KB)`,
  );
}

const en = sets.en;
for (const code of Object.keys(sets)) {
  if (code === 'en') continue;
  const miss = [...en].filter((k) => !sets[code].has(k));
  const extra = [...sets[code]].filter((k) => !en.has(k));
  console.log(
    `\nvs EN → ${code}: missing=${miss.length} extra=${extra.length}`,
  );
  if (miss.length) console.log('  miss sample:', miss.slice(0, 8).join(', '));
  if (extra.length) console.log('  extra sample:', extra.slice(0, 8).join(', '));
}

// namespace breakdown for EN
const byNs = new Map();
for (const k of en) {
  const ns = k.split('.')[0];
  byNs.set(ns, (byNs.get(ns) || 0) + 1);
}
const rows = [...byNs.entries()].sort((a, b) => b[1] - a[1]);
console.log('\nEN leaf keys by namespace (top 25):');
let sum = 0;
for (const [ns, n] of rows.slice(0, 25)) {
  sum += n;
  console.log(`  ${String(n).padStart(4)}  ${ns}`);
}
console.log(`  ... ${rows.length} namespaces total`);
console.log(`  top25 sum=${sum} / all=${en.size}`);
