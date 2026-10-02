#!/usr/bin/env node
import fs from 'node:fs';

function countLeaves(o) {
  let n = 0;
  for (const v of Object.values(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) n += countLeaves(v);
    else n++;
  }
  return n;
}

const src = fs.readFileSync('src/i18n/locales/en.ts', 'utf8');
const re = /^\s+\w[\w$]*:\s*"(?:\\.|[^"\\])*"/gm;
const m = src.match(re) || [];
console.log('Regex string-leaf lines en.ts:', m.length);

const tr = fs.readFileSync('src/i18n/locales/tr.ts', 'utf8');
console.log('Regex string-leaf lines tr.ts:', (tr.match(re) || []).length);

for (const code of ['ar', 'fr', 'fil']) {
  const o = JSON.parse(fs.readFileSync(`src/i18n/locales/${code}.json`, 'utf8'));
  console.log(`JSON recursive ${code}:`, countLeaves(o));
}
