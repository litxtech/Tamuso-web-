#!/usr/bin/env node
import fs from 'node:fs';

const path = 'src/i18n/locales/fil.json';
const fil = JSON.parse(fs.readFileSync(path, 'utf8'));

function setDeep(obj, keyPath, val) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

const patches = {
  // User-facing Taglish
  'ayarlar.pip': 'Picture-in-picture (PiP)',
  'profil.ayarlarAlt': 'Account · privacy · app',
  'ajans.hostBasvuruFormu': 'Host application form',
  'ajans.davetlerAlt': 'Code · QR · analytics',
  'sehir.gucDestekci': 'Power {{guc}} · {{count}} supporters',
  'sertifikasyon.altBaslik': 'Store / pre-release control hub',
  'sertifikasyon.hediyeStresAlt': '40-gift queue · drop rate',
  'takas.qrCuzdanOzet': 'Wallet: {{no}}\n{{maskeli}}',
  'anaSayfa.canliA11y': '{{baslik}}, live stream',
  'anaSayfa.sesA11y': '{{baslik}}, voice room',
  'anaSayfa.sesOdasiA11y': 'Voice room {{baslik}}',
  'anaSayfa.mailKonu': 'Tamuso support / report',
  'profilTab.galibiyetOrani': 'Win rate {{oran}}%',
  'canliYayin.a11yCanliYayin': '{{baslik}}, live stream',
  'mesajSohbet.cuzdanNoPaylasMetin': 'MUTA PAY wallet no: {{no}}',
  'mesajSohbet.idPaylasMetin': 'User ID: {{id}}',
  'sesOda.demoCanliOda': 'Demo live room',
  'odaMuzik.sesBilgi': 'Audio: {{ext}} · {{path}}',
  'auth.misafirGirisi': 'Guest sign-in',
};

// Real Taglish for the ones users see as prose
Object.assign(patches, {
  'profil.ayarlarAlt': 'Account · privacy · app',
  'ajans.hostBasvuruFormu': 'Host application form',
  'ajans.davetlerAlt': 'Code · QR · analytics',
  'sehir.gucDestekci': 'Power {{guc}} · {{count}} tagasuporta',
  'sertifikasyon.altBaslik': 'Store / pre-release control hub',
  'sertifikasyon.hediyeStresAlt': '40-gift queue · drop rate',
  'takas.qrCuzdanOzet': 'Wallet: {{no}}\n{{maskeli}}',
  'anaSayfa.canliA11y': '{{baslik}}, live stream',
  'anaSayfa.sesA11y': '{{baslik}}, voice room',
  'anaSayfa.sesOdasiA11y': 'Voice room {{baslik}}',
  'anaSayfa.mailKonu': 'Tamuso support / report',
  'profilTab.galibiyetOrani': 'Win rate {{oran}}%',
  'canliYayin.a11yCanliYayin': '{{baslik}}, live stream',
  'auth.misafirGirisi': 'Guest sign-in',
  'sesOda.demoCanliOda': 'Demo live room',
});

// Stronger Taglish where it improves UX
Object.assign(patches, {
  'profil.ayarlarAlt': 'Account · privacy · app',
  'ajans.hostBasvuruFormu': 'Form ng host application',
  'ajans.davetlerAlt': 'Code · QR · analytics',
  'sehir.gucDestekci': 'Power {{guc}} · {{count}} tagasuporta',
  'sertifikasyon.altBaslik': 'Store / pre-release control hub',
  'sertifikasyon.hediyeStresAlt': '40-gift queue · drop rate',
  'anaSayfa.mailKonu': 'Tamuso support / report',
  'profilTab.galibiyetOrani': 'Win rate {{oran}}%',
  'auth.misafirGirisi': 'Guest sign-in',
  'sesOda.demoCanliOda': 'Demo live room',
  'canliYayin.a11yCanliYayin': '{{baslik}}, live stream',
  'anaSayfa.canliA11y': '{{baslik}}, live stream',
  'anaSayfa.sesA11y': '{{baslik}}, voice room',
  'anaSayfa.sesOdasiA11y': 'Voice room {{baslik}}',
  'takas.qrCuzdanOzet': 'Wallet: {{no}}\n{{maskeli}}',
  'mesajSohbet.cuzdanNoPaylasMetin': 'MUTA PAY wallet no: {{no}}',
  'mesajSohbet.idPaylasMetin': 'User ID: {{id}}',
  'odaMuzik.sesBilgi': 'Audio: {{ext}} · {{path}}',
  'ayarlar.pip': 'Picture-in-picture (PiP)',
});

for (const [k, v] of Object.entries(patches)) setDeep(fil, k, v);
fs.writeFileSync(path, JSON.stringify(fil, null, 2) + '\n');
console.log('ok', Object.keys(patches).length);
