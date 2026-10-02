import fs from 'fs';

const vals = {
  tr: { sen: 'Sen', devamEden: 'Devam eden' },
  en: { sen: 'You', devamEden: 'Ongoing' },
  es: { sen: 'Tú', devamEden: 'En curso' },
  ar: { sen: 'أنت', devamEden: 'جارٍ' },
};

function insert(src, section, keys) {
  const start = src.indexOf(`  ${section}: {`);
  if (start < 0) throw new Error(section);
  let i = start + `  ${section}: {`.length;
  let depth = 1;
  let inStr = null;
  let escape = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
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
      if (depth === 0) {
        const chunk = src.slice(start, i);
        let add = '';
        for (const [k, v] of Object.entries(keys)) {
          if (!new RegExp(`\\b${k}\\s*:`).test(chunk)) {
            add += `\n    ${k}: '${v.replace(/'/g, "\\'")}',`;
          }
        }
        return src.slice(0, i) + add + src.slice(i);
      }
    }
  }
  return src;
}

for (const lang of ['tr', 'en', 'es', 'ar']) {
  let s = fs.readFileSync(`src/i18n/locales/${lang}.ts`, 'utf8');
  s = insert(s, 'gorusme', vals[lang]);
  fs.writeFileSync(`src/i18n/locales/${lang}.ts`, s, 'utf8');
  console.log(lang);
}
