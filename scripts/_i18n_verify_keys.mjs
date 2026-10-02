import fs from 'fs';

function extract(src, name) {
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
  throw new Error(name);
}

function collect(o, p = '', a = []) {
  for (const [k, v] of Object.entries(o)) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object') collect(v, q, a);
    else a.push(q);
  }
  return a.sort();
}

const tr = collect(extract(fs.readFileSync('src/i18n/locales/tr.ts', 'utf8'), 'tr'));
const en = collect(extract(fs.readFileSync('src/i18n/locales/en.ts', 'utf8'), 'en'));
const es = collect(extract(fs.readFileSync('src/i18n/locales/es.ts', 'utf8'), 'es'));
const arSrc = fs.readFileSync('src/i18n/locales/ar.ts', 'utf8');
const ar = collect(extract(arSrc, 'ar'));
console.log({
  tr: tr.length,
  en: en.length,
  es: es.length,
  ar: ar.length,
  missingEn: tr.filter((k) => !en.includes(k)),
  missingEs: tr.filter((k) => !es.includes(k)),
  missingAr: tr.filter((k) => !ar.includes(k)),
  arabicChars: (arSrc.match(/[\u0600-\u06FF]/g) || []).length,
  corrupted: (arSrc.match(/:\s*'[^']*\?{3}/g) || []).length,
});
