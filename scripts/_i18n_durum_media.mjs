import fs from 'fs';

const keys = {
  tr: {
    uploadBan: 'Yükleme cezan aktif. Medya yükleyemezsin.',
    gecersizAdres: 'Geçersiz medya adresi',
    yuklemeBasarisiz: 'Yükleme başarısız',
  },
  en: {
    uploadBan: 'Your upload ban is active. You cannot upload media.',
    gecersizAdres: 'Invalid media address',
    yuklemeBasarisiz: 'Upload failed',
  },
  es: {
    uploadBan: 'Tu sanción de subida está activa. No puedes subir medios.',
    gecersizAdres: 'Dirección de medios no válida',
    yuklemeBasarisiz: 'Error al subir',
  },
  ar: {
    uploadBan: 'حظر الرفع نشط. لا يمكنك رفع الوسائط.',
    gecersizAdres: 'عنوان وسائط غير صالح',
    yuklemeBasarisiz: 'فشل الرفع',
  },
};

function insert(src, section, map) {
  const start = src.indexOf(`  ${section}: {`);
  let i = start + `  ${section}: {`.length;
  let depth = 1;
  let inStr = null;
  let esc = false;
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
      if (depth === 0) {
        let add = '';
        const chunk = src.slice(start, i);
        for (const [k, v] of Object.entries(map)) {
          if (!new RegExp(`\\b${k}\\s*:`).test(chunk)) {
            add += `\n    ${k}: '${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',`;
          }
        }
        let before = src.slice(0, i);
        if (!before.trimEnd().endsWith(',') && !before.trimEnd().endsWith('{')) {
          before = before.replace(/(')(\s*)$/, "',$2");
        }
        return before + add + src.slice(i);
      }
    }
  }
  return src;
}

for (const lang of ['tr', 'en', 'es']) {
  let s = fs.readFileSync(`src/i18n/locales/${lang}.ts`, 'utf8');
  s = insert(s, 'durumX', keys[lang]);
  fs.writeFileSync(`src/i18n/locales/${lang}.ts`, s, 'utf8');
}

// ar via parts
const arPart = JSON.parse(fs.readFileSync('scripts/ar_parts/durumX.json', 'utf8'));
Object.assign(arPart, keys.ar);
fs.writeFileSync('scripts/ar_parts/durumX.json', JSON.stringify(arPart, null, 2) + '\n', 'utf8');
console.log('ok');
