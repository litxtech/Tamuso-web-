#!/usr/bin/env node
/**
 * Surgical leaf patches for es.ts / pt.ts / fr.json.
 * Avoids rewriting entire locale files.
 * node scripts/_i18n_patch_romance_surgical.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = path.join(ROOT, 'src', 'i18n', 'locales');

/**
 * Replace `leaf: "old"` inside top-level `ns: { ... }` block.
 * Supports nested one level: ns.sub.leaf
 */
function patchTs(code, patches) {
  const file = path.join(L, `${code}.ts`);
  let src = fs.readFileSync(file, 'utf8');
  let changed = 0;

  for (const [fullKey, newVal] of Object.entries(patches)) {
    const parts = fullKey.split('.');
    if (parts.length < 2) continue;

    // Find namespace start
    const ns = parts[0];
    const nsRe = new RegExp(`\\b${ns}\\s*:\\s*\\{`);
    const nsMatch = nsRe.exec(src);
    if (!nsMatch) {
      console.warn(`[${code}] ns not found:`, ns);
      continue;
    }

    const nsStart = nsMatch.index + nsMatch[0].length - 1; // at '{'
    // find matching brace
    let depth = 0;
    let end = nsStart;
    for (let i = nsStart; i < src.length; i++) {
      const c = src[i];
      if (c === '"' || c === "'" || c === '`') {
        const q = c;
        i++;
        while (i < src.length) {
          if (src[i] === '\\') {
            i += 2;
            continue;
          }
          if (src[i] === q) break;
          i++;
        }
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    let block = src.slice(nsStart, end + 1);
    const leafParts = parts.slice(1);

    // If nested object (e.g. belge.admin.toplam), drill into sub-object
    let searchIn = block;
    let searchOffset = 0;
    for (let i = 0; i < leafParts.length - 1; i++) {
      const sub = leafParts[i];
      const subRe = new RegExp(`\\b${sub}\\s*:\\s*\\{`);
      const m = subRe.exec(searchIn);
      if (!m) {
        console.warn(`[${code}] nested ns not found:`, fullKey);
        searchIn = null;
        break;
      }
      const subStart = m.index + m[0].length - 1;
      let d = 0;
      let subEnd = subStart;
      for (let j = subStart; j < searchIn.length; j++) {
        const c = searchIn[j];
        if (c === '"' || c === "'" || c === '`') {
          const q = c;
          j++;
          while (j < searchIn.length) {
            if (searchIn[j] === '\\') {
              j += 2;
              continue;
            }
            if (searchIn[j] === q) break;
            j++;
          }
          continue;
        }
        if (c === '{') d++;
        else if (c === '}') {
          d--;
          if (d === 0) {
            subEnd = j;
            break;
          }
        }
      }
      searchOffset += subStart;
      searchIn = searchIn.slice(subStart, subEnd + 1);
    }
    if (!searchIn) continue;

    const leaf = leafParts[leafParts.length - 1];
    const leafRe = new RegExp(`(\\b${leaf}\\s*:\\s*)("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')`);
    const lm = leafRe.exec(searchIn);
    if (!lm) {
      console.warn(`[${code}] leaf not found:`, fullKey);
      continue;
    }
    const escaped = JSON.stringify(newVal);
    const replacement = lm[1] + escaped;
    if (lm[0] === replacement) continue;

    // Apply into full src via absolute indices
    const absStart = nsStart + searchOffset + lm.index;
    const absEnd = absStart + lm[0].length;
    src = src.slice(0, absStart) + replacement + src.slice(absEnd);
    // re-sync: easier to re-read approach — rebuild by re-applying from original each time is messy.
    // Instead mutate and re-find from scratch next iteration (src updated).
    changed++;
  }

  fs.writeFileSync(file, src);
  return changed;
}

function patchJson(code, patches) {
  const file = path.join(L, `${code}.json`);
  const obj = JSON.parse(fs.readFileSync(file, 'utf8'));
  let n = 0;
  for (const [k, v] of Object.entries(patches)) {
    const parts = k.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    const leaf = parts[parts.length - 1];
    if (cur[leaf] !== v) {
      cur[leaf] = v;
      n++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
  return n;
}

/** PT-BR: translate English leftovers that have clear Portuguese forms */
const ptPatches = {
  'cuzdan.refHost': 'Anfitrião',
  'ajans.hizliCoin': 'Moedas',
  'ajans.statCoin': 'Moedas',
  'ajans.analitik': 'Análises',
  'siralamalar.boardHost': 'Anfitriões',
  'kesfet.evSahibi': 'Anfitrião',
  'anaSayfa.evSahibi': 'Anfitrião',
  'hediyeAd.mic': 'Microfone',
  'canliYayin.fisilti': 'AO VIVO',
  'canliYayin.yayinci': 'Anfitrião',
  'canliYayin.yayinciA': 'Anfitrião A',
  'canliYayin.yayinciB': 'Anfitrião B',
  'canliYayin.rozetYayin': 'AO VIVO',
  'canliYayin.rozetCanli': 'AO VIVO',
  'sesOda.kurucu': 'Anfitrião',
  'sesOda.yardimci': 'Coanfitrião',
  'auth.politikaBaglanti': 'link',
  'olusturTab.duzen': 'Layout',
  'cuzdanX.taban': '{{adet}} base',
};

/** FR: only where EN word is not a natural French cognate */
const frPatches = {
  'gorunum.tumunuGorAlt': '30 looks',
  'sehir.destekciLbl': 'soutiens',
  'sehir.kpiDestekci': 'Soutiens',
  'siralamalar.podiumZirve': 'Sommet',
  'hediyeAd.like': 'J’aime',
  'hediyeAd.clap': 'Applaudissements',
  'odaDuzen.mini_cluster': 'Mini-cluster',
  'anaSayfa.oneriler': 'Suggestions…',
  'pk.skorVarsayilan': 'score',
};

/** ES: minor naturalizations (most cognates are correct Spanish) */
const esPatches = {
  'olusturTab.tema': 'Tema',
  'cuzdanX.taban': '{{adet}} base',
  'ulkeLigi.puanEtiket': 'pts',
};

const nPt = patchTs('pt', ptPatches);
const nEs = patchTs('es', esPatches);
const nFr = patchJson('fr', frPatches);
console.log({ pt: nPt, es: nEs, fr: nFr });
