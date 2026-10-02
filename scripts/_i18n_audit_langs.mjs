#!/usr/bin/env node
/**
 * Cross-locale gap audit: missing keys + untranslated (still EN/TR) values.
 * Usage: node scripts/_i18n_audit_langs.mjs [es|ar|pt|fr|fil|all]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = path.join(ROOT, 'src', 'i18n', 'locales');

function extractTs(file, name) {
  const src = fs.readFileSync(file, 'utf8');
  const marker = `export const ${name}`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`no export ${name} in ${file}`);
  const objStart = src.indexOf('{', start);
  let i = objStart;
  let depth = 0;
  let inS = null;
  let esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inS) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === inS) inS = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inS = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        return Function(`"use strict"; return (${src.slice(objStart, i + 1)})`)();
      }
    }
  }
  throw new Error(`parse fail ${file}`);
}

function leaves(o, p = '', a = []) {
  for (const [k, v] of Object.entries(o || {})) {
    const q = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, q, a);
    else a.push([q, v == null ? '' : String(v)]);
  }
  return a;
}

function loadLang(code) {
  if (code === 'ar' || code === 'fr' || code === 'fil') {
    return Object.fromEntries(leaves(JSON.parse(fs.readFileSync(path.join(L, `${code}.json`), 'utf8'))));
  }
  return Object.fromEntries(leaves(extractTs(path.join(L, `${code}.ts`), code)));
}

/** Brand / codes / placeholders that are legitimately identical across langs */
const ALLOW_SAME = new Set([
  'ortak.whatsapp',
  'anaSayfa.whatsapp',
  'anaSayfa.bolumPkNow',
  'anaSayfa.grupYonetim',
  'anaSayfa.menuDestekAlt',
  'auth.destek',
  'auth.epostaPlaceholder',
  'misafirHesap.epostaPlaceholder',
  'profilDuzenle.telefonPlaceholder',
  'profil.tecrube',
  'oyun.kaskad',
  'oyun.zeus',
  'oyun.nox',
  'pk.baslik',
  'takas.qr',
  'ajans.phUlke',
  'ajans.phEposta',
  'ajans.statPk',
  'ajans.phIban',
  'ajans.alertCrm',
  'ajans.alertRol',
  'ajans.odemeIban',
  'ajans.programSatir',
  'ajans.etkinlikSatir',
  'ajans.hedefSatir',
  'ajans.programListeSatir',
  'ajans.phSlogan',
  'aiMuzik.kanalIos',
  'aiMuzik.bpm',
  'aiMuzik.populer',
  'aiMuzik.chipTempo',
  'aiMuzik.dilEs',
  'aiMuzik.dilEn',
  'aiMuzik.dilTr',
  'aiMuzik.dilAr',
  'aiMuzik.dkKisa',
  'aiMuzik.etiketMasterSha',
  'host.phDavet',
  'cuzdanX.kanalStripe',
  'cuzdanX.uiHesapOzetiSubtitle',
  'cuzdanXExtra.pdfExcel',
  'cuzdan.ajansPaketVip',
  'cuzdan.ajansPaketElite',
  'cuzdan.ajansPaketMax',
  'cuzdan.ledgerBonus',
  'mesajV2.speedNx',
  'modlar.karaoke',
  'modlar.tekli',
  'hediyeAd.donut',
  'hediyeAd.jet',
  'hediyeAd.perfume',
  'hediyeAd.rose',
  'hediyeAd.champagne',
  'hediyeAd.yacht',
  'hediyeAd.lion',
  'hediyeAd.dragon',
  'hediyeAd.phoenix',
  'hediyeAd.bouquet',
  'sesOda.demo',
  'sesOda.seviyeHandle',
  'odaKapasite.mini',
  'odaKapasite.social',
  'guvenlik.spam',
  'profilTab.combo',
  'profilTab.misafirUsername',
  'olusturTab.rozetStory',
  'hesapSil.onayKelime',
  'belge.whatsapp',
  'belge.excelCsv',
  'belge.dugmeVarsayilan',
  'belge.admin.ciroAlt',
  'banner.whatsappBaslik',
  'banner.instagram',
  // Romance / shared cognates & UI loanwords (correct as identical to EN)
  'ortak.hata',
  'sekmeler.mesaj',
  'sekmeler.durum',
  'sekmeler.profil',
  'sekmeler.mesajlar',
  'gorunum.plasma',
  'gorunum.mercana',
  'gorunum.sampanya',
  'gorunum.bordo',
  'gorunum.grafit',
  'gorunum.buzul',
  'gorunum.krom',
  'gorunum.kategoriDoga',
  'gorunum.gunbatimiAlt',
  'gorunum.tumunuGorAlt',
  'mesajlar.sohbetler',
  'mesajlar.fisilti',
  'mesajlar.baslik',
  'cuzdan.ajansPaketPopuler',
  'cuzdan.ajansPaketStandart',
  'cuzdan.ajansPaketPrestij',
  'cuzdan.refAdmin',
  'bildirimler.kategoriSosyal',
  'bildirimler.baslik',
  'bildirimler.varsayilanBaslik',
  'bildirimAyar.sosyal',
  'bildirimAyar.mesajlar',
  'aiCeviri.gorusmeSohbetKisa',
  'guvenlik.cinsel',
  'guvenlik.siddet',
  'ajans.hata',
  'ajans.formSecSohbet',
  'ajans.dkKisa',
  'ajans.kpiCevrimici',
  'ajans.alertDurum',
  'ajans.izin',
  'ajans.alertYetki',
  'ajans.alertProfil',
  'ajans.phNot',
  'ajans.phMesaj',
  'ajans.phAciklamaKisa',
  'ajans.alertKod',
  'ajans.islemlerBaslik',
  'aiMuzik.dk',
  'aiMuzik.vokalEnstr',
  'aiMuzik.ses',
  'aiMuzik.duraklat',
  'aiMuzik.chipTur',
  'aiMuzik.chipEnstruman',
  'aiMuzik.chipEnstrumanOk',
  'aiMuzik.admin.alertDakika',
  'aiMuzik.admin.etiketDakika',
  'aiMuzik.alertDurum',
  'odaMuzik.tabPopuler',
  'odaMuzik.alertSes',
  'odaMuzik.dashToplam',
  'odaMuzik.sesBilgi',
  'fikirler.baslik',
  'fikirler.sekmePopuler',
  'fikirler.gorsel',
  'fikirler.aciklama',
  'ulkeLigi.puanEtiket',
  'ulkeLigi.adminPuan',
  'satinAlma.kanalManuel',
  'satinAlma.durum',
  'sertifikasyon.internet',
  'sertifikasyon.baslik',
  'sertifikasyon.katPerformans',
  'sertifikasyon.katFinans',
  'anaSayfa.populer',
  'anaSayfa.menu',
  'anaSayfa.yayinci',
  'anaSayfa.istatRozet',
  'anaSayfa.oneriler',
  'cuzdanX.taban',
  'cuzdanX.islemler',
  'olusturTab.tema',
  'olusturTab.duzen',
  'olusturTab.mod',
  'hediye.sekmePopuler',
  'hediye.sekmeNadir',
  'hediyeAd.mic',
  'hediyeAd.like',
  'canliYayin.katSohbet',
  'mesajSohbet.sohbet',
  'mesajSohbet.mesajBaslik',
  'sesOda.dk',
  'sesOda.saDk',
  'sesOda.yonetici',
  'sesOda.aciklama',
  'sesOda.mikrofon',
  'belge.admin.toplam',
  'belge.durum',
  'belge.excelBaslikDurum',
  'belge.baslik',
  'belge.fisilti',
  'belge.islem',
  'belge.aciklama',
  'belge.kaynak',
  'belge.tarih',
  'belge.excelBaslikTarih',
  'belge.excelBaslikIslem',
  'belge.excelBaslikAciklama',
  'belge.admin.islemAdedi',
  'belge.admin.finans',
  'kullanimSuresiFmt.gunSaatKisa',
  'kullanimSuresiFmt.saatDkKisa',
  'ayarlar.uygulama',
  'ayarlar.bildirimler',
  'ayarlar.iletisim',
  'auth.politikaBaglanti',
  'auth.fotograf',
  'durum.baslik',
  'durum.fotograf',
  'profil.baslik',
  'profil.mesajGonder',
  'profilDuzenle.fotograflar',
  'destek.mesaj',
  'aiAsistan.botAd',
  'sehir.lider',
  'sehir.labelMesaj',
  'sehir.puan',
  'kyc.belge',
  'canli.aciklama',
  'hesapSil.onayBaslik',
  'pk.skorVarsayilan',
  'platform.kpiRozet',
  'platform.bildirimler',
  'platform.sertifikasyon',
  'takas.mesajlas',
  'cihazlar.oturumlar',
  'mesajV2.photo',
  'mesajV2.pause',
  'mesajV2.pushPhoto',
  'gorusme.sesli',
  'kisilerX.mesaj',
  'kisilerX.cevrimici',
  'durumX.duraklat',
  'banner.tanitim',
  'banner.uygulamaBaslik',
  'banner.screen.MESSAGES',
  'banner.screen.PROFILE',
  'odaDuzen.kategoriSalon',
  'odaDuzen.kategoriKompakt',
  'odaDuzen.spotlight_pro',
  'odaDuzen.mini_cluster',
  'odaTema.kategoriDoga',
  'odaTema.royal_gold',
  // Intentional EN in Taglish / brand / product / OAuth / theme aesthetics
  'gorunum.sampanyaAlt',
  'gorunum.neon_sehirAlt',
  'ayarlar.pip',
  'auth.appleGirisi',
  'auth.spotifyGirisi',
  'auth.twitchGirisi',
  'auth.xGirisi',
  'auth.googleGirisi',
  'auth.misafirGirisi',
  'auth.spotifyKaydi',
  'auth.twitchKaydi',
  'auth.xKaydi',
  'auth.googleKaydi',
  'auth.destek',
  'auth.epostaPlaceholder',
  'profil.ayarlarAlt',
  'cuzdan.ledgerKaskadBet',
  'cuzdan.ledgerKaskadWin',
  'cuzdan.ledgerKaskadRefund',
  'cuzdan.refKaskadRound',
  'ajans.phEposta',
  'ajans.hostBasvuruFormu',
  'ajans.davetlerAlt',
  'sehir.gucDestekci',
  'aiMuzik.ornekPrompt2',
  'aiMuzik.kanalAndroid',
  'odaMuzik.aiStudio',
  'odaMuzik.sesBilgi',
  'sertifikasyon.altBaslik',
  'sertifikasyon.hediyeStresAlt',
  'takas.qrCuzdanOzet',
  'anaSayfa.menuAiMuzik',
  'anaSayfa.bolumCountryLeague',
  'anaSayfa.canliA11y',
  'anaSayfa.sesA11y',
  'anaSayfa.sesOdasiA11y',
  'anaSayfa.mailKonu',
  'profilTab.galibiyetOrani',
  'canliYayin.a11yCanliYayin',
  'mesajSohbet.cuzdanNoPaylasMetin',
  'mesajSohbet.idPaylasMetin',
  'sesOda.demoCanliOda',
  'banner.auto.live_coins',
  'odaDuzen.premium_tilesAlt',
  'odaDuzen.planet_orbitAlt',
  'odaDuzen.mini_clusterAlt',
  'odaDuzen.dropin_tiles',
  'odaTema.party_neonAlt',
]);

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

/** Common PH/Taglish UI loanwords kept in English on purpose */
const FIL_LOAN = new Set([
  'Error', 'User', 'Guest', 'Media', 'Email', 'Home', 'Status', 'Chat', 'Profile',
  'Wallet', 'OK', 'VIP', 'Admin', 'Online', 'Offline', 'Live', 'Host', 'Coins',
  'Coin', 'Total', 'Manual', 'Internet', 'Social', 'Popular', 'Audio', 'Video',
  'Photo', 'Photos', 'Message', 'Messages', 'Notification', 'Notifications',
  'Support', 'App', 'Menu', 'Layout', 'Theme', 'Mode', 'Solo', 'Standard',
  'Prestige', 'Champagne', 'Plasma', 'Coral', 'Obsidian', 'Graphite', 'Bordeaux',
  'Glacier', 'Chrome', 'Lavender', 'Indigo', 'Neon', 'Instrumental', 'Pause',
  'Mic', 'Like', 'Clap', 'Rose', 'Yacht', 'Lion', 'Dragon', 'Phoenix', 'Bouquet',
  'Document', 'Transaction', 'Transactions', 'Description', 'Source', 'Date',
  'Finance', 'Performance', 'Certification', 'Promotion', 'Compact', 'Royal',
  'Nature', 'Lounge', 'Sessions', 'Contact', 'Assistant', 'Violence', 'Sexual',
  'Permission', 'Code', 'Note', 'Points', 'Badges', 'Top', 'Rare', 'Streamer',
  'Analytics', 'Ideas', 'Chats', 'ADMIN', 'LIVE', 'CHAT', 'Host A', 'Host B',
  'Co-host', 'pts', 'link', 'score', 'base',
]);

function looksUntranslated(code, key, val, enVal, trVal) {
  if (!val || !val.trim()) return 'empty';
  if (ALLOW_SAME.has(key)) return null;
  // skip pure placeholders / numbers / symbols
  if (/^[\s\d\{\}\.\,\:\-\/\+\@\%\#\&\*\!\?\(\)\[\]\|]+$/.test(val)) return null;
  // AR: brand / template-only strings with no letters to translate
  if (code === 'ar' && !hasArabic(enVal) && !/[A-Za-z]{4,}/.test(enVal.replace(/\{\{[^}]+\}\}/g, ''))) {
    return null;
  }
  if (val === enVal && val !== trVal && /[A-Za-z]{3,}/.test(val)) {
    // Filipino Taglish: short EN loanwords are intentional
    if (code === 'fil') {
      const words = (val.match(/[A-Za-z]+/g) || []).length;
      if (words <= 2 || FIL_LOAN.has(val.trim())) return null;
    }
    return 'same_as_en';
  }
  if (val === trVal && val !== enVal && /[A-Za-zÇĞİÖŞÜçğıöşü]{3,}/.test(val)) return 'same_as_tr';
  if (code === 'ar') {
    // Arabic should have Arabic script for most UI strings
    if (!hasArabic(val) && /[A-Za-z]{4,}/.test(val) && !ALLOW_SAME.has(key)) {
      // allow mixed with {{vars}} if has some Arabic
      if (!hasArabic(val)) return 'no_arabic_script';
    }
  }
  if (/\?{3,}/.test(val) || /\uFFFD/.test(val)) return 'corrupted';
  return null;
}

/** Map top-level namespace → likely screen areas */
const NS_SCREENS = {
  ortak: 'shared',
  sekmeler: 'tabs',
  gorunum: 'app/ayarlar/gorunum',
  auth: 'app/(auth)/*',
  anaSayfa: 'app/(tabs)/index',
  durum: 'app/(tabs)/durum + app/durum/*',
  olusturTab: 'app/(tabs)/create',
  mesajlar: 'app/(tabs)/messages',
  mesajV2: 'app/mesaj/[id]',
  profilTab: 'app/(tabs)/profile',
  profil: 'app/kullanici/[id]',
  profilDuzenle: 'app/profil-duzenle',
  cuzdan: 'app/(tabs)/wallet + cuzdan/*',
  cuzdanX: 'wallet extras',
  cuzdanXExtra: 'wallet extras',
  odalar: 'app/(tabs)/rooms',
  cihazlar: 'app/(tabs)/cihazlar',
  ayarlar: 'app/ayarlar/*',
  dil: 'app/ayarlar/dil',
  gizlilik: 'app/ayarlar/gizlilik',
  bildirim: 'bildirimler / bildirim-ayarlari',
  destek: 'app/destek',
  guvenlik: 'app/guvenlik',
  kyc: 'app/kyc',
  host: 'app/host',
  ajans: 'app/ajans/*',
  sehir: 'app/sehir/*',
  ulke: 'app/ulke/*',
  oyun: 'app/oyun/*',
  zeus: 'app/oyun/zeus',
  nox: 'app/oyun/nox',
  kaskad: 'app/oyun/kaskad',
  aiMuzik: 'app/ai-muzik/*',
  fikirler: 'app/fikirler/*',
  canli: 'app/canli/*',
  pk: 'app/pk',
  lobi: 'app/lobi',
  room: 'app/room/[id]',
  sesOda: 'ses odaları modülü',
  odaKapasite: 'oda kapasite',
  takas: 'app/cuzdan/takas',
  takip: 'app/takip/*',
  kisiler: 'app/kisiler',
  hesapSil: 'app/hesap-sil',
  misafirHesap: 'misafir hesabı',
  politika: 'app/politika/*',
  paylas: 'app/paylas*',
  platform: 'app/platform',
  siralamalar: 'app/siralamalar',
  islemHacmi: 'app/islem-hacmi',
  raporlarim: 'app/raporlarim',
  bildir: 'app/bildir',
  engellenen: 'app/engellenen-kullanicilar',
  asistan: 'app/asistan',
  gorusme: 'app/gorusme',
  kesfet: 'app/kesfet',
  sertifikasyon: 'app/sertifikasyon',
  belge: 'belge / admin chrome',
  hediyeAd: 'hediye isimleri',
  modlar: 'oda modları',
  admin: 'app/admin/*',
};

function nsOf(key) {
  return key.split('.')[0];
}

function audit(code, en, tr) {
  const lang = loadLang(code);
  const enKeys = Object.keys(en);
  const missing = enKeys.filter((k) => !(k in lang));
  const extra = Object.keys(lang).filter((k) => !(k in en));
  const byNs = new Map();
  const untranslated = [];
  for (const k of enKeys) {
    if (!(k in lang)) {
      const ns = nsOf(k);
      if (!byNs.has(ns)) byNs.set(ns, { missing: 0, same_en: 0, same_tr: 0, empty: 0, no_ar: 0, corrupt: 0 });
      byNs.get(ns).missing++;
      continue;
    }
    const reason = looksUntranslated(code, k, lang[k], en[k], tr[k]);
    if (!reason) continue;
    untranslated.push({ key: k, reason, val: lang[k].slice(0, 80) });
    const ns = nsOf(k);
    if (!byNs.has(ns)) byNs.set(ns, { missing: 0, same_en: 0, same_tr: 0, empty: 0, no_ar: 0, corrupt: 0 });
    const b = byNs.get(ns);
    if (reason === 'same_as_en') b.same_en++;
    else if (reason === 'same_as_tr') b.same_tr++;
    else if (reason === 'empty') b.empty++;
    else if (reason === 'no_arabic_script') b.no_ar++;
    else if (reason === 'corrupted') b.corrupt++;
  }
  return { code, total: enKeys.length, present: Object.keys(lang).length, missing, extra, untranslated, byNs };
}

function printReport(r) {
  console.log(`\n========== ${r.code.toUpperCase()} ==========`);
  console.log(`Keys: ${r.present}/${r.total}  missing=${r.missing.length}  extra=${r.extra.length}  suspect=${r.untranslated.length}`);

  if (r.missing.length) {
    console.log(`\nMissing keys (${r.missing.length}):`);
    for (const k of r.missing.slice(0, 40)) console.log('  -', k);
    if (r.missing.length > 40) console.log(`  ... +${r.missing.length - 40} more`);
  }

  // group untranslated by namespace
  const grouped = new Map();
  for (const u of r.untranslated) {
    const ns = nsOf(u.key);
    if (!grouped.has(ns)) grouped.set(ns, []);
    grouped.get(ns).push(u);
  }

  const nsRows = [...r.byNs.entries()]
    .map(([ns, c]) => ({
      ns,
      screen: NS_SCREENS[ns] || ns,
      issues: c.missing + c.same_en + c.same_tr + c.empty + c.no_ar + c.corrupt,
      ...c,
    }))
    .filter((x) => x.issues > 0)
    .sort((a, b) => b.issues - a.issues);

  console.log(`\nNamespaces / screens with gaps (${nsRows.length}):`);
  console.log('issues | miss | =EN | =TR | empty | noAR | corrupt | ns → screen');
  for (const row of nsRows) {
    console.log(
      `${String(row.issues).padStart(6)} | ${String(row.missing).padStart(4)} | ${String(row.same_en).padStart(3)} | ${String(row.same_tr).padStart(3)} | ${String(row.empty).padStart(5)} | ${String(row.no_ar).padStart(4)} | ${String(row.corrupt).padStart(7)} | ${row.ns} → ${row.screen}`,
    );
  }

  // sample suspects
  console.log(`\nSample untranslated (up to 25):`);
  for (const u of r.untranslated.slice(0, 25)) {
    console.log(`  [${u.reason}] ${u.key}: "${u.val}"`);
  }
  if (r.untranslated.length > 25) console.log(`  ... +${r.untranslated.length - 25} more`);

  return { code: r.code, missing: r.missing.length, suspect: r.untranslated.length, nsRows };
}

const arg = (process.argv[2] || 'all').toLowerCase();
const order = arg === 'all' ? ['es', 'ar', 'pt', 'fr', 'fil'] : [arg];

const en = loadLang('en');
const tr = loadLang('tr');

console.log('Base EN keys:', Object.keys(en).length, '| TR keys:', Object.keys(tr).length);
const summaries = [];
for (const code of order) {
  summaries.push(printReport(audit(code, en, tr)));
}

console.log('\n========== SUMMARY ==========');
for (const s of summaries) {
  console.log(`${s.code}: missing_keys=${s.missing} suspect_values=${s.suspect} broken_namespaces=${s.nsRows.length}`);
}
