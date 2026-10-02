/**
 * Apply flat FR map (from _flat_fr.json or _mt_cache) onto EN skeleton → fr.json
 */
import fs from 'fs';

function leaves(obj, p = '', acc = []) {
  for (const [k, v] of Object.entries(obj)) {
    const nk = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, nk, acc);
    else acc.push([nk, v]);
  }
  return acc;
}

function setPath(root, dotted, value) {
  const parts = dotted.split('.');
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function getPath(root, dotted) {
  let cur = root;
  for (const k of dotted.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

const en = JSON.parse(fs.readFileSync('src/i18n/locales/_en_export.json', 'utf8'));

// Load part files (human FR)
const partsDir = 'scripts/fr_parts';
const partMap = new Map();
for (const f of fs.readdirSync(partsDir)) {
  if (!f.endsWith('.json') || f.startsWith('_')) continue;
  const data = JSON.parse(fs.readFileSync(`${partsDir}/${f}`, 'utf8'));
  for (const [k, v] of leaves(data)) {
    if (typeof v === 'string' && v.length) partMap.set(k, v);
  }
}

// Load value→FR cache from MT if present
let valueCache = {};
const cachePath = `${partsDir}/_mt_cache_fr.json`;
if (fs.existsSync(cachePath)) {
  valueCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

// Load flat key→FR if present
const flatKeyMap = new Map();
const flatPath = `${partsDir}/_flat_fr.json`;
if (fs.existsSync(flatPath)) {
  for (const item of JSON.parse(fs.readFileSync(flatPath, 'utf8'))) {
    flatKeyMap.set(item.k, item.v);
  }
}

const out = {};
const missing = [];
const sources = { part: 0, flat: 0, cache: 0, en: 0 };

for (const [k, enVal] of leaves(en)) {
  let fr;
  if (partMap.has(k)) {
    fr = partMap.get(k);
    sources.part++;
  } else if (flatKeyMap.has(k)) {
    fr = flatKeyMap.get(k);
    sources.flat++;
  } else if (valueCache[enVal]) {
    fr = valueCache[enVal];
    sources.cache++;
  } else {
    fr = enVal;
    sources.en++;
    missing.push(k);
  }
  setPath(out, k, fr);
}

fs.writeFileSync('src/i18n/locales/fr.json', JSON.stringify(out, null, 2) + '\n', 'utf8');

const enSet = new Set(leaves(en).map(([k]) => k));
const frSet = new Set(leaves(out).map(([k]) => k));
console.log(
  JSON.stringify(
    {
      en: enSet.size,
      fr: frSet.size,
      missing: [...enSet].filter((k) => !frSet.has(k)),
      extra: [...frSet].filter((k) => !enSet.has(k)),
      stillEnglish: missing.length,
      sources,
      sampleStillEn: missing.slice(0, 15),
    },
    null,
    2,
  ),
);
