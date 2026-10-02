#!/usr/bin/env node
/**
 * Apply _fil_value_cache.json to fil.json for keys still equal to EN.
 * Reports leftovers that need manual translation.
 * node scripts/_i18n_apply_fil_cache.mjs
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

function setDeep(obj, keyPath, val) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

function getDeep(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function leaves(o, p = '', a = []) {
  for (const [k, v] of Object.entries(o || {})) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, q, a);
    else a.push([q, v == null ? '' : String(v)]);
  }
  return a;
}

const en = Object.fromEntries(
  leaves(extractTs(path.join(L, 'en.ts'), 'en')),
);
const tr = Object.fromEntries(
  leaves(extractTs(path.join(L, 'tr.ts'), 'tr')),
);
const filPath = path.join(L, 'fil.json');
const fil = JSON.parse(fs.readFileSync(filPath, 'utf8'));
const cache = JSON.parse(
  fs.readFileSync(path.join(L, '_fil_value_cache.json'), 'utf8'),
);

let applied = 0;
const leftovers = [];

for (const [key, enVal] of Object.entries(en)) {
  const cur = getDeep(fil, key);
  if (cur == null) continue;
  const curS = String(cur);
  // only touch values still identical to EN (and EN differs from TR)
  if (curS !== enVal) continue;
  if (enVal === tr[key]) continue; // same in TR too — often brands
  if (!/[A-Za-z]{3,}/.test(enVal)) continue;

  const cached = cache[enVal];
  if (cached && cached !== enVal) {
    setDeep(fil, key, cached);
    applied++;
  } else {
    leftovers.push({ key, en: enVal, tr: tr[key] });
  }
}

// drop keys not in EN
const enKeys = new Set(Object.keys(en));
function prune(obj, prefix = '') {
  for (const k of Object.keys(obj)) {
    const q = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      prune(v, q);
      if (Object.keys(v).length === 0) delete obj[k];
    } else if (!enKeys.has(q)) {
      delete obj[k];
    }
  }
}
prune(fil);

fs.writeFileSync(filPath, JSON.stringify(fil, null, 2) + '\n');
fs.writeFileSync(
  path.join(ROOT, 'scripts', '_i18n_fil_leftovers.json'),
  JSON.stringify(leftovers, null, 2),
);
console.log({ applied, leftovers: leftovers.length });
