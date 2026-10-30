/**
 * scripts/i18n/cuzdan-uyum-metinleri.json içindeki ad alanlarını 7 dile ekler.
 * Var olan ad alanı yeniden yazılır (tekrar çalıştırılabilir).
 *   node scripts/i18n/cuzdan-uyum-metinlerini-uygula.cjs
 */
const fs = require('fs');
const path = require('path');

const kok = path.join(__dirname, '..', '..');
const veri = JSON.parse(fs.readFileSync(path.join(__dirname, 'cuzdan-uyum-metinleri.json'), 'utf8'));
const DILLER = ['tr', 'en', 'es', 'pt', 'ar', 'fr', 'fil'];
const TS_DILLER = new Set(['tr', 'en', 'es', 'pt']);

function dilNesnesi(dil) {
  const sonuc = {};
  for (const [ns, anahtarlar] of Object.entries(veri)) {
    sonuc[ns] = {};
    for (const [k, ceviriler] of Object.entries(anahtarlar)) {
      const v = ceviriler[dil];
      if (typeof v !== 'string' || !v.trim()) throw new Error(`eksik çeviri: ${dil}.${ns}.${k}`);
      sonuc[ns][k] = v;
    }
  }
  return sonuc;
}

function tsBlok(nesne) {
  return Object.entries(nesne)
    .map(([ns, a]) => {
      const satirlar = Object.entries(a).map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`);
      return `  ${ns}: {\n${satirlar.join('\n')}\n  }`;
    })
    .join(',\n');
}

function nsSil(c, ns, json) {
  const re = json
    ? new RegExp(`,\\n  "${ns}": \\{[\\s\\S]*?\\n  \\}(?=,?\\n)`, 'g')
    : new RegExp(`,\\n  ${ns}: \\{[\\s\\S]*?\\n  \\}(?=,?\\n)`, 'g');
  return c.replace(re, '');
}

for (const dil of DILLER) {
  const nesne = dilNesnesi(dil);
  if (TS_DILLER.has(dil)) {
    const p = path.join(kok, 'src/i18n/locales', `${dil}.ts`);
    const ham = fs.readFileSync(p, 'utf8');
    const crlf = ham.includes('\r\n');
    let c = crlf ? ham.replace(/\r\n/g, '\n') : ham;
    for (const ns of Object.keys(nesne)) c = nsSil(c, ns, false);
    const bitis = c.search(/\n(\s*\n)*\}( as const)?;\n/);
    if (bitis < 0) throw new Error('nesne sonu bulunamadı: ' + p);
    const once = c.slice(0, bitis).replace(/,?\s*$/, '');
    if (!once.endsWith('}')) throw new Error('beklenmeyen son: ' + p);
    c = `${once},\n${tsBlok(nesne)}${c.slice(bitis)}`;
    fs.writeFileSync(p, crlf ? c.replace(/\n/g, '\r\n') : c);
  } else {
    const p = path.join(kok, 'src/i18n/locales', `${dil}.json`);
    const ham = fs.readFileSync(p, 'utf8');
    let c = ham.replace(/\r\n/g, '\n');
    for (const ns of Object.keys(nesne)) c = nsSil(c, ns, true);
    const son = c.lastIndexOf('\n}');
    if (son < 0) throw new Error('json sonu yok: ' + p);
    const once = c.slice(0, son).replace(/,?\s*$/, '');
    const blok = Object.entries(nesne)
      .map(([ns, a]) => `  ${JSON.stringify(ns)}: ${JSON.stringify(a, null, 2).replace(/\n/g, '\n  ')}`)
      .join(',\n');
    c = `${once},\n${blok}${c.slice(son)}`;
    JSON.parse(c);
    fs.writeFileSync(p, c);
  }
  console.log(`${dil}: ${Object.values(nesne).reduce((n, a) => n + Object.keys(a).length, 0)} anahtar`);
}
