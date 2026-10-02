/**
 * Extract es.ts object literal to scripts/fr_parts/_es_export.json
 */
import fs from 'fs';

function extract(src, name) {
  const marker = `export const ${name}`;
  const start = src.indexOf(marker);
  let i = src.indexOf('{', start);
  let depth = 0;
  let inStr = null;
  let esc = false;
  const begin = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(begin, i + 1);
    }
  }
  throw new Error('fail');
}

const src = fs.readFileSync('src/i18n/locales/es.ts', 'utf8');
const obj = Function(`return (${extract(src, 'es')})`)();
fs.writeFileSync(
  'scripts/fr_parts/_es_export.json',
  JSON.stringify(obj, null, 2),
  'utf8',
);
console.log('es keys', Object.keys(obj).length);
