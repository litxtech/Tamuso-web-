#!/usr/bin/env node
/** Apply remaining FIL pending translations (Taglish). */
import fs from 'node:fs';

const path = 'src/i18n/locales/fil.json';
const cachePath = 'src/i18n/locales/_fil_value_cache.json';
const fil = JSON.parse(fs.readFileSync(path, 'utf8'));
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const pending = JSON.parse(fs.readFileSync('scripts/_i18n_fil_pending.json', 'utf8'));
const enByKey = Object.fromEntries(pending.map((x) => [x.key, x.en]));

function setDeep(obj, keyPath, val) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

/** Taglish UI — keep brands/product names, translate user-facing phrases */
const taglish = {
  'cuzdanX.elmasSatir': '{{adet}} diamante · {{yontem}}',
  'cuzdan.ledgerPurchase': 'Pag-top up ng coin',
  'cuzdan.ledgerStripe': 'Pag-top up gamit ang card',
  'cuzdan.ledgerAgencyDistribution': 'Agency coin top-up',
  'cuzdan.ledgerAdminTopup': 'Admin coin top-up',
  'cuzdan.ledgerAdminDeduct': 'Admin na bawas ng coin',
  'cuzdan.ledgerAdminPenalty': 'Admin na penalty sa coin',
  'cuzdan.ledgerKaskadBet': 'Cosmic Cascade — entry',
  'cuzdan.ledgerKaskadWin': 'Cosmic Cascade — reward',
  'cuzdan.ledgerKaskadRefund': 'Cosmic Cascade — refund',
  'cuzdan.refCoinPurchase': 'Pag-top up ng coin',
  'cuzdan.refKaskadRound': 'Cosmic Cascade round',
  'banner.auto.live_coins': 'Live coin threshold',
  'odaTema.party_neonAlt': 'Live party · pink neon',
  'odaDuzen.premium_tilesAlt': 'VIP tile grid',
  'odaDuzen.planet_orbitAlt': 'Orbital mic ring',
  'odaDuzen.mini_clusterAlt': 'Compact cluster grid',
  'odaDuzen.dropin_tiles': 'Drop-in tiles',
  'gorunum.sampanyaAlt': 'VIP gold noir',
  'gorunum.neon_sehirAlt': 'Cyber pink · mint',
  'sesOda.demoCanliOda': 'Demo live room',
  'odaMuzik.aiStudio': 'AI Music Studio',
  'odaMuzik.sesBilgi': 'Audio: {{ext}} · {{path}}',
  'mesajSohbet.cuzdanNoPaylasMetin': 'MUTA PAY wallet no: {{no}}',
  'mesajSohbet.idPaylasMetin': 'User ID: {{id}}',
  'hediye.coinYukleAlt': '1 coin = ₺0.10 · instant top-up',
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
  'auth.kodHanesi': 'Code ng beripikasyon, digit {{n}}',
  'anaSayfa.menuAiMuzik': 'AI Music Studio',
  'anaSayfa.bolumCountryLeague': 'World Country League',
  'anaSayfa.canliA11y': '{{baslik}}, live stream',
  'anaSayfa.sesA11y': '{{baslik}}, voice room',
  'anaSayfa.sesOdasiA11y': 'Voice room {{baslik}}',
  'anaSayfa.mailKonu': 'Tamuso support / report',
  'ajans.phEposta': 'agency@example.com',
  'ajans.hostBasvuruFormu': 'Host application form',
  'ajans.coinYukleme': 'Pag-top up ng coin',
  'ajans.basvuruSatir': '@{{user}} · {{zaman}}\nStatus: {{status}}',
  'ajans.davetlerAlt': 'Code · QR · analytics',
  'aiMuzik.ornekPrompt2': 'Energetic Black Sea, kemençe + electronic',
  'aiMuzik.kanalAndroid': 'Google Play / card',
  'profil.ayarlarAlt': 'Account · privacy · app',
  'profilTab.galibiyetOrani': 'Win rate {{oran}}%',
  'sehir.gucDestekci': 'Power {{guc}} · {{count}} supporters',
  'ayarlar.pip': 'Picture-in-picture (PiP)',
  'sertifikasyon.altBaslik': 'Store / pre-release control hub',
  'sertifikasyon.hediyeStresAlt': '40-gift queue · drop rate',
  'takas.qrCuzdanOzet': 'Wallet: {{no}}\n{{maskeli}}',
};

// Stronger Taglish where English sentence would look untranslated
Object.assign(taglish, {
  'cuzdan.ledgerAgencyDistribution': 'Pag-top up ng coin mula sa agency',
  'cuzdan.ledgerAdminTopup': 'Admin na pag-top up ng coin',
  'banner.auto.live_coins': 'Live coin threshold',
  'sesOda.demoCanliOda': 'Demo live room',
  'hediye.coinYukleAlt': '1 coin = ₺0.10 · agad na top-up',
  'auth.misafirGirisi': 'Guest sign-in',
  'anaSayfa.bolumCountryLeague': 'World Country League',
  'anaSayfa.mailKonu': 'Tamuso support / report',
  'ajans.hostBasvuruFormu': 'Host application form',
  'profil.ayarlarAlt': 'Account · privacy · app',
  'profilTab.galibiyetOrani': 'Win rate {{oran}}%',
  'sehir.gucDestekci': 'Power {{guc}} · {{count}} supporters',
  'ayarlar.pip': 'Picture-in-picture (PiP)',
  'sertifikasyon.altBaslik': 'Store / pre-release control hub',
  'sertifikasyon.hediyeStresAlt': '40-gift queue · drop rate',
  'takas.qrCuzdanOzet': 'Wallet: {{no}}\n{{maskeli}}',
  'odaDuzen.dropin_tiles': 'Drop-in tiles',
  'odaDuzen.premium_tilesAlt': 'VIP tile grid',
  'odaDuzen.planet_orbitAlt': 'Orbital mic ring',
  'odaDuzen.mini_clusterAlt': 'Compact cluster grid',
  'odaTema.party_neonAlt': 'Live party · pink neon',
  'gorunum.sampanyaAlt': 'VIP gold noir',
  'gorunum.neon_sehirAlt': 'Cyber pink · mint',
});

let n = 0;
for (const [k, v] of Object.entries(taglish)) {
  setDeep(fil, k, v);
  const en = enByKey[k];
  if (en && v !== en) cache[en] = v;
  n++;
}

fs.writeFileSync(path, JSON.stringify(fil, null, 2) + '\n');
fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n');
console.log('patched', n);
