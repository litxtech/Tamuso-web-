#!/usr/bin/env node
/** Dump same-as-EN leftovers for a language (skip short cognates optionally). */
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
function load(code) {
  if (code === 'ar' || code === 'fr' || code === 'fil') {
    return Object.fromEntries(leaves(JSON.parse(fs.readFileSync(`src/i18n/locales/${code}.json`, 'utf8'))));
  }
  return Object.fromEntries(leaves(extractTs(`src/i18n/locales/${code}.ts`, code)));
}

const code = process.argv[2] || 'es';
const minLen = Number(process.argv[3] || 0);
const en = load('en');
const lang = load(code);
const byNs = new Map();
const rows = [];
for (const [k, v] of Object.entries(en)) {
  if (!(k in lang)) continue;
  if (lang[k] !== v) continue;
  if (v.length < minLen) continue;
  if (!/[A-Za-z]{3,}/.test(v)) continue;
  rows.push([k, v]);
  const ns = k.split('.')[0];
  byNs.set(ns, (byNs.get(ns) || 0) + 1);
}
console.log(`# ${code.toUpperCase()} sameEN=${rows.length} (minLen=${minLen})`);
for (const [ns, n] of [...byNs.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`NS ${ns}: ${n}`);
}
console.log('---');
for (const [k, v] of rows) console.log(`${k}\t${JSON.stringify(v)}`);
