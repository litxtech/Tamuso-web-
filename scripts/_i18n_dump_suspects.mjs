#!/usr/bin/env node
/**
 * Dump suspect untranslated keys per language.
 * node scripts/_i18n_dump_suspects.mjs
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
    return Object.fromEntries(
      leaves(JSON.parse(fs.readFileSync(path.join(L, `${code}.json`), 'utf8'))),
    );
  }
  return Object.fromEntries(leaves(extractTs(path.join(L, `${code}.ts`), code)));
}

const ALLOW = new Set([
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
  'pk.baslik',
  'takas.qr',
  'ajans.phUlke',
  'ajans.phEposta',
  'ajans.statPk',
  'ajans.phIban',
  'ajans.alertCrm',
  'ajans.alertRol',
  'ajans.odemeIban',
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
  'cuzdanXExtra.pdfExcel',
  'cuzdan.ajansPaketVip',
  'cuzdan.ajansPaketElite',
  'cuzdan.ajansPaketMax',
  'cuzdan.ledgerBonus',
  'mesajV2.speedNx',
  'modlar.karaoke',
  'hediyeAd.donut',
  'hediyeAd.jet',
  'hediyeAd.perfume',
  'sesOda.demo',
  'odaKapasite.mini',
  'odaKapasite.social',
  'guvenlik.spam',
  'profilTab.combo',
  'profilTab.misafirUsername',
  'olusturTab.rozetStory',
  'hesapSil.onayKelime',
]);

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function looks(code, key, val, enVal, trVal) {
  if (!val || !val.trim()) return 'empty';
  if (ALLOW.has(key)) return null;
  if (/^[\s\d\{\}\.\,\:\-\/\+\@\%\#\&\*\!\?\(\)\[\]\|]+$/.test(val)) return null;
  if (val === enVal && val !== trVal && /[A-Za-z]{3,}/.test(val)) return 'same_as_en';
  if (val === trVal && val !== enVal && /[A-Za-zÇĞİÖŞÜçğıöşü]{3,}/.test(val)) return 'same_as_tr';
  if (code === 'ar' && !hasArabic(val) && /[A-Za-z]{4,}/.test(val)) return 'no_arabic_script';
  if (/\?{3,}/.test(val) || /\uFFFD/.test(val)) return 'corrupted';
  return null;
}

const en = loadLang('en');
const tr = loadLang('tr');
const outDir = path.join(ROOT, 'scripts');

for (const code of ['es', 'ar', 'pt', 'fr', 'fil']) {
  const lang = loadLang(code);
  const list = [];
  for (const k of Object.keys(en)) {
    if (!(k in lang)) continue;
    const r = looks(code, k, lang[k], en[k], tr[k]);
    if (r) list.push({ key: k, reason: r, en: en[k], val: lang[k], tr: tr[k] });
  }
  const out = path.join(outDir, `_i18n_suspect_${code}.json`);
  fs.writeFileSync(out, JSON.stringify(list, null, 2));
  console.log(code, list.length, '→', out);
}
