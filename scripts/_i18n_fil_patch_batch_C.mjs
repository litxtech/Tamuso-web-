#!/usr/bin/env node
/**
 * Patch fil.json with Taglish translations for batch C keys only.
 * Also updates _fil_value_cache.json EN→FIL.
 * node scripts/_i18n_fil_patch_batch_C.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = path.join(ROOT, 'src', 'i18n', 'locales');

const translations = {
  'mesajSohbet.engelliComposer':
    'Na-block ang pakikipag-ugnayan sa user na ito. Sarado ang messages, calls, at gifts.',
  'mesajSohbet.engellenenleriYonet': 'I-manage ang na-block na users',
  'mesajSohbet.misafirArama': 'Kumpletuhin ang account mo para makatawag.',
  'mesajSohbet.misafirMedya': 'Kumpletuhin ang account mo para magpadala ng media.',
  'mesajSohbet.cuzdanNoYok': 'Hindi nahanap ang wallet number.',
  'mesajSohbet.cuzdanNoPaylasMetin': 'MUTA PAY wallet no: {{no}}',
  'mesajSohbet.idYok': 'Hindi pa ready ang User ID.',
  'mesajSohbet.idPaylasMetin': 'User ID: {{id}}',
  'mesajSohbet.bendenSil': 'Tanggalin para sa akin',
  'mesajSohbet.herkestenSil': 'Tanggalin para sa lahat',
  'mesajSohbet.paylasilanGonderi': 'Nag-share ng post',
  'mesajSohbet.platformHesaplari': 'Mga platform account (blue check)',
  'mesajSohbet.karaAcSoru':
    'Bubuksan ang blacklist para kay {{ad}}.\\nMaaaring ma-suspend / isara ang account. Kumpirmahin?',
  'mesajSohbet.karaAcildiBody': 'Na-post ang desisyon sa court group.',
  'mesajSohbet.karaSebep':
    'Court decision: misconduct / fraud / walang sagot',
  'mesajSohbet.mahkemeyiKapatSoru':
    'Sasara ang group; walang bagong messages. Kumpirmahin?',
  'mesajSohbet.mahkemeKapatNot': 'Isinara ng platform ang court.',
  'mesajSohbet.mahkemeKapali': 'Sarado na ang court na ito.',
  'mesajSohbet.yargicPanel': 'Judge panel · defenses sa group na ito',
  'mesajSohbet.hediyeGonderdi':
    '{{emoji}} {{ad}}{{adet}} nagpadala ng gift',
  'mesajSohbet.arsivlendiBody': 'Nilipat ang chat sa archive.',
  'mesajSohbet.sohbetiSilBody':
    'Tinatanggal ang chat na ito para sa iyo. Magki-clear ang history; hindi apektado ang kabila.',
  'mesajSohbet.sohbetAcilamadi': 'Hindi mabuksan ang chat',
  'mesajSohbet.sohbetBulunamadi': 'Hindi nahanap ang chat',
  'mesajSohbet.sohbetBulunamadiAlt': 'Bumalik at subukan ulit',
  'mesajSohbet.mahkemeKapaliFisilti': 'sarado ang court · judge',
  'mesajSohbet.yargicFisilti': 'judge · blue check · i-tap',
  'mesajSohbet.ajansFisilti': 'agency · i-tap para sa profile',
  'mesajSohbet.cevrimiciFisilti': 'online · i-tap para sa menu',
  'mesajSohbet.bosChatAlt':
    'Magpadala ng text, photo, o video — agad dumating.',
  'mesajSohbet.mahkemeKapaliComposer':
    'Sarado na ang court na ito. Walang bagong messages.',
  'mesajSohbet.yazPlaceholder': 'Sumulat ng message…',
  'mesajSohbet.medyaGonderA11y': 'Magpadala ng photo o video',

  'gorusme.karsiBekleniyor': 'Hinihintay ang kabila…',
  'gorusme.gorusmeYok': 'Wala pang calls',
  'gorusme.gorusmeyiSilBody':
    'Tinatanggal ang record na ito para sa iyo lang. Hindi apektado ang history nila.',
  'gorusme.coinAzaliyor': 'Paubos na ang coin balance mo',
  'gorusme.baglanilamadi': 'Hindi makakonekta',
  'gorusme.demoSesYok': 'Demo — walang audio/video',
  'gorusme.gecmisHesapGerekli':
    'Kumpletuhin ang account mo para makita ang call history',
  'gorusme.demoNativeGerekli':
    'Kailangan ng native build na may LiveKit para sa live audio/video. Demo mode ka ngayon.',

  'hediye.coinYukleAlt': '1 coin = ₺0.10 · instant top-up',
  'hediye.hediyeyeDon': 'Bumalik sa gifts',
  'hediye.aliciBulunamadi': 'Hindi nahanap ang recipient.',
  'hediye.kendineGonderemezsin': 'Hindi ka pwedeng magpadala ng gift sa sarili mo.',
  'hediye.katalogYukleniyor': 'Naglo-load ang catalog — subukan ulit sandali.',
  'hediye.yetersizCoin': 'Kulang ang coins',
  'hediye.yetersizCoinBody': 'Mag-top up ng coins para magpatuloy.',
  'hediye.gonderilemedi': 'Hindi maipadala ang gift',
  'hediye.gonderimKapali': 'Pansamantalang naka-disable ang gift sending.',
  'hediye.ozellikKapali': 'Naka-disable ang gifts.',

  'canliYayin.a11yCanliYayin': '{{baslik}}, live stream',

  'auth.appleGirisi': 'Apple sign-in',
  'auth.spotifyGirisi': 'Spotify sign-in',
  'auth.twitchGirisi': 'Twitch sign-in',
  'auth.xGirisi': 'X sign-in',
  'auth.googleGirisi': 'Google sign-in',
  'auth.misafirGirisi': 'Guest sign-in',
  'auth.destek': 'Support: support@litxtech.com',
  'auth.spotifyKaydi': 'Spotify sign-up',
  'auth.twitchKaydi': 'Twitch sign-up',
  'auth.xKaydi': 'X sign-up',
  'auth.googleKaydi': 'Google sign-up',
  'auth.epostaPlaceholder': 'you@mail.com',
  'auth.kodHanesi': 'Verification code, digit {{n}}',

  'anaSayfa.menuAiMuzik': 'AI Music Studio',
  'anaSayfa.bolumCountryLeague': 'World Country League',
  'anaSayfa.canliA11y': '{{baslik}}, live stream',
  'anaSayfa.sesA11y': '{{baslik}}, voice room',
  'anaSayfa.sesOdasiA11y': 'Voice room {{baslik}}',
  'anaSayfa.mailKonu': 'Tamuso support / report',

  'ajans.phEposta': 'agency@example.com',
  'ajans.hostBasvuruFormu': 'Host application form',
  'ajans.coinYukleme': 'Coin top-up',
  'ajans.basvuruSatir': '@{{user}} · {{zaman}}\\nStatus: {{status}}',
  'ajans.davetlerAlt': 'Code · QR · analytics',

  'aiMuzik.ornekPrompt2': 'Energetic Black Sea, kemençe + electronic',
  'aiMuzik.kanalAndroid': 'Google Play / card',

  'profil.ayarlarAlt': 'Account · privacy · app',

  'profilTab.misafirBio':
    'Guest account — kumpletuhin ang account mo para sa full profile.',
  'profilTab.varsayilanBio':
    'Voice, gifts, at live streams sa Tamuso.',
  'profilTab.cuzdanAlt': 'Ang iyong coin at diamond balance',
  'profilTab.oyunAlt': '{{lig}} · profile card mo',
  'profilTab.galibiyetOrani': 'Win rate {{oran}}%',
  'profilTab.oyunIpucu':
    'Maglaro sa voice rooms — kumita ng XP at trophies.',
  'profilTab.misafirPaylasimBos':
    'Kumpletuhin ang account mo para mag-post.',
  'profilTab.paylasimBos':
    'Wala pang posts — idagdag ang unang status mo.',

  'cihazlar.altBaslik':
    'Mag-sign out sa isang device o sa lahat',
  'cihazlar.migrationHint':
    'Siguraduhing na-run na ang migration 003.',
  'cihazlar.kapatilamadi': 'Hindi maisara',
  'cihazlar.digerCikisYapildi': 'Na-sign out sa ibang devices.',
  'cihazlar.kayitliCihazYok': 'Wala pang devices',
  'cihazlar.kayitliCihazYokBody':
    'Naka-list dito ang devices na pinag-sign in mo.',
  'cihazlar.tumCihazlardanCikis':
    'Mag-sign out sa lahat ng ibang devices',

  'sehir.gucDestekci': 'Power {{guc}} · {{count}} supporters',

  'ayarlar.pip': 'Picture-in-picture (PiP)',

  'sertifikasyon.altBaslik': 'Store / pre-release control hub',
  'sertifikasyon.hediyeStresAlt': '40-gift queue · drop rate',
};

function setDeep(obj, keyPath, val) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

function getDeep(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

const batch = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts', '_i18n_fil_batch_C.json'), 'utf8'),
);
const filPath = path.join(L, 'fil.json');
const cachePath = path.join(L, '_fil_value_cache.json');
const fil = JSON.parse(fs.readFileSync(filPath, 'utf8'));
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

let patched = 0;
const missing = [];

for (const item of batch) {
  const filVal = translations[item.key];
  if (!filVal) {
    missing.push(item.key);
    continue;
  }
  const prev = getDeep(fil, item.key);
  setDeep(fil, item.key, filVal);
  cache[item.en] = filVal;
  if (prev !== filVal) patched++;
  else patched++; // count all batch keys as patched per task
}

if (missing.length) {
  console.error('Missing translations:', missing);
  process.exit(1);
}

fs.writeFileSync(filPath, JSON.stringify(fil, null, 2) + '\n', 'utf8');
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n', 'utf8');

console.log(`Patched ${Object.keys(translations).length} keys (batch C).`);
console.log(`Batch size: ${batch.length}`);
