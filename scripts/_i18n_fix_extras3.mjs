import fs from 'fs';

const PACK = {
  tr: {
    gorusme: {
      devamEdiyor: 'Devam ediyor',
      reddedildi: 'Reddedildi',
      giden: 'Giden',
      gelen: 'Gelen',
    },
    kisilerX: {
      sesliArama: 'Sesli Arama',
      coinDk: '{{n}} coin / dakika',
      ucretsizArama: 'Ücretsiz arama',
      bakiyen: 'Bakiyen',
      temizle: 'Temizle',
      onerilerInfo:
        'Öneriler; tercihlerin ve Tamuso’daki etkileşimlerine göre kişiselleştirilebilir.',
      ileArama: '{{isim}} ile {{tur}}',
      profilA11y: '{{isim}} profili',
    },
  },
  en: {
    gorusme: {
      devamEdiyor: 'Ongoing',
      reddedildi: 'Declined',
      giden: 'Outgoing',
      gelen: 'Incoming',
    },
    kisilerX: {
      sesliArama: 'Voice call',
      coinDk: '{{n}} coin / min',
      ucretsizArama: 'Free call',
      bakiyen: 'Your balance',
      temizle: 'Clear',
      onerilerInfo:
        'Suggestions can be personalized from your preferences and activity on Tamuso.',
      ileArama: '{{tur}} with {{isim}}',
      profilA11y: '{{isim}} profile',
    },
  },
  es: {
    gorusme: {
      devamEdiyor: 'En curso',
      reddedildi: 'Rechazada',
      giden: 'Saliente',
      gelen: 'Entrante',
    },
    kisilerX: {
      sesliArama: 'Llamada de voz',
      coinDk: '{{n}} coin / min',
      ucretsizArama: 'Llamada gratis',
      bakiyen: 'Tu saldo',
      temizle: 'Limpiar',
      onerilerInfo:
        'Las sugerencias pueden personalizarse según tus preferencias y actividad en Tamuso.',
      ileArama: '{{tur}} con {{isim}}',
      profilA11y: 'Perfil de {{isim}}',
    },
  },
};

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function insertKeys(src, section, keys) {
  const start = src.indexOf(`  ${section}: {`);
  if (start < 0) throw new Error('missing ' + section);
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
            add += `\n    ${k}: '${esc(v)}',`;
          }
        }
        // ensure previous line has comma
        let before = src.slice(0, i);
        const lastNonWs = before.trimEnd();
        if (!lastNonWs.endsWith(',') && !lastNonWs.endsWith('{')) {
          // find last quote end and add comma
          const m = before.match(/(')(\s*)$/);
          if (m) {
            before = before.replace(/(')(\s*)$/, "',$2");
          }
        }
        return before + add + src.slice(i);
      }
    }
  }
  return src;
}

for (const lang of ['tr', 'en', 'es']) {
  let src = fs.readFileSync(`src/i18n/locales/${lang}.ts`, 'utf8');
  for (const [sec, keys] of Object.entries(PACK[lang])) {
    src = insertKeys(src, sec, keys);
  }
  fs.writeFileSync(`src/i18n/locales/${lang}.ts`, src, 'utf8');
  console.log('patched', lang);
}

// rebuild ar from parts
import('./build_ar_locale.mjs');
