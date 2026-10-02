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
const ns = process.argv[2] || 'canliYayin';
const en = extractTs('src/i18n/locales/en.ts', 'en');
const fil = JSON.parse(fs.readFileSync('src/i18n/locales/fil.json', 'utf8'));
const es = extractTs('src/i18n/locales/es.ts', 'es');
let n = 0;
for (const [k, v] of Object.entries(en[ns] || {})) {
  if ((fil[ns] || {})[k] === v) {
    n++;
    console.log(`${k}\t${JSON.stringify(v)}\tES=${JSON.stringify((es[ns] || {})[k])}`);
  }
}
console.error('still', n);
