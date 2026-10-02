/**
 * Merge scripts/fr_parts/*.json (skip _en_* / _es_*) into src/i18n/locales/fr.json
 * using _en_export.json as the key skeleton. Every leaf must be filled from parts.
 */
import fs from 'fs';
import path from 'path';

const partsDir = 'scripts/fr_parts';
const enPath = 'src/i18n/locales/_en_export.json';
const outPath = 'src/i18n/locales/fr.json';

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
  const parts = dotted.split('.');
  let cur = root;
  for (const k of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k];
  }
  return cur;
}

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enLeaves = leaves(en);

const mergedFlat = new Map();
const files = fs
  .readdirSync(partsDir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_en_') && !f.startsWith('_es_'));

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(partsDir, f), 'utf8'));
  for (const [k, v] of leaves(data)) {
    if (typeof v === 'string' && v.length > 0 && !/\?{3,}/.test(v)) {
      mergedFlat.set(k, v);
    }
  }
}

const out = {};
const missing = [];
const untranslated = [];

for (const [k, enVal] of enLeaves) {
  const frVal = mergedFlat.get(k);
  if (frVal == null) {
    missing.push(k);
    setPath(out, k, enVal);
  } else {
    setPath(out, k, frVal);
    if (frVal === enVal && /[a-zA-Z]{4,}/.test(enVal) && !/^[A-Z0-9_.\s/-]+$/.test(enVal)) {
      // same as EN — may be intentional (brands) or unfinished
      untranslated.push(k);
    }
  }
}

fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');

const frLeaves = new Set(leaves(out).map(([k]) => k));
const enSet = new Set(enLeaves.map(([k]) => k));
const missKeys = [...enSet].filter((k) => !frLeaves.has(k));
const extraKeys = [...frLeaves].filter((k) => !enSet.has(k));

console.log(
  JSON.stringify(
    {
      en: enSet.size,
      fr: frLeaves.size,
      partsFiles: files.length,
      filledFromParts: mergedFlat.size,
      missingAtBuild: missing.length,
      leafMissing: missKeys.length,
      leafExtra: extraKeys.length,
      sameAsEnSample: untranslated.slice(0, 15),
      sameAsEnCount: untranslated.length,
      sampleMissing: missing.slice(0, 20),
    },
    null,
    2,
  ),
);
