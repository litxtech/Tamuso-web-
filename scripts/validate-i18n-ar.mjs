#!/usr/bin/env node
/**
 * Arabic locale sanity check.
 *
 *   node scripts/validate-i18n-ar.mjs
 *
 * Verifies that src/i18n/locales/ar.ts:
 *   - parses (after stripping TS-only syntax) and exports an object
 *   - has exactly the same leaf-key set as en.ts (and tr.ts)
 *   - contains real Arabic codepoints (> MIN_ARABIC_CHARS in total)
 *   - has zero values that are only '?' / punctuation (the corruption signature)
 *   - has zero values containing U+FFFD replacement characters
 *   - keeps every {{placeholder}} that en.ts uses for the same key
 *   - has no BOM and is valid UTF-8
 *
 * Exit code 1 on any failure so it can run in CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES = path.join(ROOT, 'src', 'i18n', 'locales');
const MIN_ARABIC_CHARS = 10_000;

/** Leaf values that are legitimately Latin-only (brand names, codes, placeholders). */
const LATIN_ALLOWLIST = new Set([
  'ortak.whatsapp',
  'anaSayfa.whatsapp',
  'anaSayfa.bolumPkNow',
  'auth.destek',
  'auth.epostaPlaceholder',
  'misafirHesap.epostaPlaceholder',
  'profilDuzenle.telefonPlaceholder',
  'profil.tecrube',
  'oyun.kaskad',
  'oyun.zeus',
  'oyun.nox',
  'hesapSil.onayKelime',
  'pk.baslik',
  'profilTab.misafirUsername',
  'cuzdanXExtra.pdfExcel',
  'ajans.phUlke',
  'ajans.phEposta',
  'ajans.statPk',
  'aiMuzik.kanalIos',
  'aiMuzik.bpm',
  'host.phDavet',
  'takas.qr',
  'cuzdanX.kanalStripe',
  'ajans.phIban',
  'ajans.alertCrm',
  'ajans.alertRol',
  'ajans.odemeIban',
  'aiMuzik.etiketMasterSha',
  'aiMuzik.populer',
  'aiMuzik.chipTempo',
  'aiMuzik.dilEs',
  'aiMuzik.dilEn',
  'aiMuzik.dilTr',
  'aiMuzik.dilAr',
  'aiMuzik.dkKisa',
  'cuzdan.ajansPaketVip',
  'cuzdan.ajansPaketElite',
  'cuzdan.ajansPaketMax',
  'cuzdan.ledgerBonus',
  'mesajV2.speedNx',
  'belge.admin.ciroAlt',
  'modlar.karaoke',
  'hediyeAd.donut',
  'hediyeAd.jet',
  'hediyeAd.perfume',
  'sesOda.demo',
  'odaKapasite.mini',
  'odaKapasite.social',
  'guvenlik.spam',
  'anaSayfa.grupYonetim',
  'profilTab.combo',
  'olusturTab.rozetStory',
  'cuzdanX.uiHesapOzetiSubtitle',
  'belge.whatsapp',
  'belge.excelCsv',
  'belge.dugmeVarsayilan',
  'banner.whatsappBaslik',
  'banner.instagram',
  'belge.admin.ciroAlt',
  'siralamalar.boardVip',
  'odaTema.kategoriVip',
  'gorunum.kategoriVip',
]);

function loadLocale(file) {
  const buf = fs.readFileSync(file);
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  let src = buf.toString('utf8');
  // Strip TS-only syntax so the object literal can be evaluated as JS.
  src = src.replace(/^import[^\n]*\n/gm, '');
  src = src.replace(/export const (\w+)(: \w+)? =/, 'globalThis.__locale =');
  const asConst = src.indexOf('as const;');
  if (asConst >= 0) src = src.slice(0, asConst) + ';';
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: file });
  return { obj: ctx.__locale, raw: buf.toString('utf8'), hasBom, bytes: buf.length };
}

function leaves(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') leaves(v, key, out);
    else out.set(key, v);
  }
  return out;
}

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const PLACEHOLDER_RE = /\{\{\s*[\w.]+\s*\}\}/g;

const failures = [];
const fail = (msg) => failures.push(msg);

const en = loadLocale(path.join(LOCALES, 'en.ts'));
const tr = loadLocale(path.join(LOCALES, 'tr.ts'));

/** Prefer ar.json (UTF-8 source of truth); fall back to fat ar.ts if present */
function loadAr() {
  const jsonPath = path.join(LOCALES, 'ar.json');
  if (fs.existsSync(jsonPath)) {
    const buf = fs.readFileSync(jsonPath);
    const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    const raw = buf.toString('utf8');
    return { obj: JSON.parse(raw), raw, hasBom, bytes: buf.length, source: 'ar.json' };
  }
  const loaded = loadLocale(path.join(LOCALES, 'ar.ts'));
  return { ...loaded, source: 'ar.ts' };
}

const ar = loadAr();

const enLeaves = leaves(en.obj);
const trLeaves = leaves(tr.obj);
const arLeaves = leaves(ar.obj);

// 1. Encoding
if (ar.hasBom) fail(`${ar.source} starts with a UTF-8 BOM`);
if (ar.raw.includes('\uFFFD')) fail(`${ar.source} contains U+FFFD replacement characters (mojibake)`);

// 2. Key parity
for (const key of enLeaves.keys()) if (!arLeaves.has(key)) fail(`missing in ar: ${key}`);
for (const key of arLeaves.keys()) if (!enLeaves.has(key)) fail(`extra in ar: ${key}`);
for (const key of trLeaves.keys()) if (!arLeaves.has(key)) fail(`missing in ar (vs tr): ${key}`);

// 3. Per-value checks
let arabicChars = 0;
let questionOnly = 0;
let nonString = 0;
let latinOnly = [];
for (const [key, val] of arLeaves) {
  if (typeof val !== 'string') {
    nonString++;
    fail(`non-string value: ${key}`);
    continue;
  }
  arabicChars += (val.match(ARABIC_RE) || []).length;

  const stripped = val.replace(PLACEHOLDER_RE, '').replace(/[\s\p{P}\p{S}\d]/gu, '');
  if (stripped.length === 0 && /\?/.test(val)) {
    questionOnly++;
    fail(`question-mark-only value: ${key} = ${JSON.stringify(val)}`);
  }
  if (val.includes('\uFFFD')) fail(`U+FFFD in value: ${key}`);

  const hasArabic = ARABIC_RE.test(val);
  ARABIC_RE.lastIndex = 0;
  if (!hasArabic && stripped.length > 0 && !LATIN_ALLOWLIST.has(key)) {
    latinOnly.push(key);
  }

  // Placeholder parity with en
  const enVal = enLeaves.get(key);
  if (typeof enVal === 'string') {
    const enPh = new Set(enVal.match(PLACEHOLDER_RE) || []);
    const arPh = new Set(val.match(PLACEHOLDER_RE) || []);
    for (const p of enPh) if (!arPh.has(p)) fail(`placeholder ${p} missing in ar: ${key}`);
    for (const p of arPh) if (!enPh.has(p)) fail(`placeholder ${p} extra in ar: ${key}`);
  }
}

if (arabicChars <= MIN_ARABIC_CHARS) fail(`Arabic codepoint count ${arabicChars} <= ${MIN_ARABIC_CHARS}`);
if (latinOnly.length) fail(`Latin-only values not in allowlist: ${latinOnly.join(', ')}`);

// Report
console.log(`ar validation (${ar.source})`);
console.log(`  file size (bytes):        ${ar.bytes}`);
console.log(`  BOM:                      ${ar.hasBom ? 'yes' : 'no'}`);
console.log(`  leaf keys en/tr/ar:       ${enLeaves.size}/${trLeaves.size}/${arLeaves.size}`);
console.log(`  Arabic codepoints:        ${arabicChars}`);
console.log(`  question-mark-only:       ${questionOnly}`);
console.log(`  non-string values:        ${nonString}`);
console.log(`  Latin-only (allowlisted): ${[...arLeaves.keys()].filter((k) => LATIN_ALLOWLIST.has(k)).length}`);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nOK');
