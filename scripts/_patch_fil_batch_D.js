/**
 * Patch only keys from _i18n_fil_batch_D.json into fil.json + EN→FIL cache.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const filPath = path.join(root, 'src/i18n/locales/fil.json');
const cachePath = path.join(root, 'src/i18n/locales/_fil_value_cache.json');
const batchPath = path.join(__dirname, '_i18n_fil_batch_D.json');

const translations = {
  'misafirHesap.epostaPlaceholder': 'pangalan@gmail.com',
  'guvenlik.adminKuyruk': 'Pila ng admin moderation',
  'siralamalar.altYuklemeTumu': 'Mga top-up sa lahat ng oras',
  'ulkeLigi.baslik': 'Pandaigdigang Liga ng Bansa',
  'ulkeLigi.adminUlkeKodu': 'Kodigo ng bansa (ISO)',
  'takas.qrCuzdanOzet': 'Wallet: {{no}}\n{{maskeli}}',
  'kisilerX.cagriIdYok': 'Walang call ID',
  'kisilerX.baslatilamadi': 'Hindi masimulan',
  'kisilerX.coinDk': '{{n}} coin / minuto',
  'durumX.onizlemedeCal': 'I-play sa preview',
  'durumX.onizlemedeDinle': 'Pakinggan sa preview',
  'durumX.paylasimYok': 'Wala pang post',
  'durumX.yanitlaniyor': 'Tumutugon kay {{ad}}',
  'durumX.yorumYaz': 'Mag-type ng komento…',
  'cocukKoruma.btnDegilim': 'Wala pa akong 18',
  'moderasyon.sebepSec': 'Pumili ng dahilan.',
  'kullanimSuresiFmt.gunSaatKisa': '{{gun}}a {{saat}}o',
  'kullanimSuresiFmt.saatDkKisa': '{{saat}}o {{dk}}m',
};

const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const fil = JSON.parse(fs.readFileSync(filPath, 'utf8'));
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

function setDot(obj, dotPath, value) {
  const parts = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object') {
      cur[p] = {};
    }
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

let patched = 0;
for (const item of batch) {
  const key = item.key;
  const filVal = translations[key];
  if (filVal == null) {
    console.error('Missing translation for', key);
    process.exit(1);
  }
  // Preserve {{placeholders}}
  const enPh = (item.en.match(/\{\{[^}]+\}\}/g) || []).sort().join(',');
  const filPh = (filVal.match(/\{\{[^}]+\}\}/g) || []).sort().join(',');
  if (enPh !== filPh) {
    console.error('Placeholder mismatch for', key, enPh, 'vs', filPh);
    process.exit(1);
  }
  setDot(fil, key, filVal);
  cache[item.en] = filVal;
  patched++;
}

fs.writeFileSync(filPath, JSON.stringify(fil, null, 2) + '\n', 'utf8');
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n', 'utf8');
console.log('patched', patched);
