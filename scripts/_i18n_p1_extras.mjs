import fs from 'fs';

const EXTRAS = {
  tr: {
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
    gorusme: {
      devamEdiyor: 'Devam ediyor',
      reddedildi: 'Reddedildi',
      giden: 'Giden',
      gelen: 'Gelen',
    },
  },
  en: {
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
    gorusme: {
      devamEdiyor: 'Ongoing',
      reddedildi: 'Declined',
      giden: 'Outgoing',
      gelen: 'Incoming',
    },
  },
  es: {
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
    gorusme: {
      devamEdiyor: 'En curso',
      reddedildi: 'Rechazada',
      giden: 'Saliente',
      gelen: 'Entrante',
    },
  },
  ar: {
    kisilerX: {
      sesliArama: 'مكالمة صوتية',
      coinDk: '{{n}} عملة / دقيقة',
      ucretsizArama: 'مكالمة مجانية',
      bakiyen: 'رصيدك',
      temizle: 'مسح',
      onerilerInfo: 'يمكن تخصيص الاقتراحات وفق تفضيلاتك ونشاطك في Tamuso.',
      ileArama: '{{tur}} مع {{isim}}',
      profilA11y: 'ملف {{isim}}',
    },
    gorusme: {
      devamEdiyor: 'جارٍ',
      reddedildi: 'مرفوضة',
      giden: 'صادرة',
      gelen: 'واردة',
    },
  },
};

function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function insertKeys(src, section, keys) {
  for (const [k, v] of Object.entries(keys)) {
    if (new RegExp(`\\b${k}\\s*:`).test(src.slice(src.indexOf(`  ${section}:`)))) {
      // check if already in this section roughly
      const secStart = src.indexOf(`  ${section}: {`);
      const secEnd = (() => {
        let i = secStart + `  ${section}: {`.length;
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
            if (depth === 0) return i;
          }
        }
        return -1;
      })();
      const chunk = src.slice(secStart, secEnd);
      if (new RegExp(`\\b${k}\\s*:`).test(chunk)) continue;
      src = src.slice(0, secEnd) + `\n    ${k}: '${esc(v)}',` + src.slice(secEnd);
    }
  }
  return src;
}

for (const lang of ['tr', 'en', 'es', 'ar']) {
  let src = fs.readFileSync(`src/i18n/locales/${lang}.ts`, 'utf8');
  const pack = EXTRAS[lang];
  for (const [sec, keys] of Object.entries(pack)) {
    src = insertKeys(src, sec, keys);
  }
  fs.writeFileSync(`src/i18n/locales/${lang}.ts`, src, 'utf8');
  console.log('ok', lang);
}
