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
const es = Object.fromEntries(leaves(extractTs('src/i18n/locales/es.ts', 'es')));
const tr = Object.fromEntries(leaves(extractTs('src/i18n/locales/tr.ts', 'tr')));
for (const k of Object.keys(en)) {
  if (es[k] === en[k] && es[k] !== tr[k] && /[A-Za-z]{3,}/.test(es[k])) {
    console.log(`${k}\t${JSON.stringify(es[k])}\tTR=${JSON.stringify(tr[k])}`);
  }
}
