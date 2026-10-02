import fs from 'fs';

function extract(src, name) {
  const marker = `export const ${name}`;
  const start = src.indexOf(marker);
  let i = src.indexOf('{', start);
  let depth = 0;
  let inStr = null;
  let esc = false;
  const begin = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(begin, i + 1);
    }
  }
  throw new Error('fail ' + name);
}

function leaves(obj, p = '', acc = []) {
  for (const [k, v] of Object.entries(obj)) {
    const nk = p ? `${p}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) leaves(v, nk, acc);
    else acc.push(nk);
  }
  return acc;
}

const tr = Function(
  `return (${extract(fs.readFileSync('src/i18n/locales/tr.ts', 'utf8'), 'tr')})`,
)();
const en = Function(
  `return (${extract(fs.readFileSync('src/i18n/locales/en.ts', 'utf8'), 'en')})`,
)();
const es = Function(
  `return (${extract(fs.readFileSync('src/i18n/locales/es.ts', 'utf8'), 'es')})`,
)();
const pt = Function(
  `return (${extract(fs.readFileSync('src/i18n/locales/pt.ts', 'utf8'), 'pt')})`,
)();
const ar = JSON.parse(fs.readFileSync('src/i18n/locales/ar.json', 'utf8'));
const fr = JSON.parse(fs.readFileSync('src/i18n/locales/fr.json', 'utf8'));
const fil = JSON.parse(fs.readFileSync('src/i18n/locales/fil.json', 'utf8'));

const tl = new Set(leaves(tr));
const el = new Set(leaves(en));
const sl = new Set(leaves(es));
const pl = new Set(leaves(pt));
const al = new Set(leaves(ar));
const fl = new Set(leaves(fr));
const fill = new Set(leaves(fil));

const missEn = [...tl].filter((k) => !el.has(k));
const missEs = [...tl].filter((k) => !sl.has(k));
const missPt = [...tl].filter((k) => !pl.has(k));
const missAr = [...tl].filter((k) => !al.has(k));
const missFr = [...tl].filter((k) => !fl.has(k));
const missFil = [...tl].filter((k) => !fill.has(k));
const extraEn = [...el].filter((k) => !tl.has(k));
const extraPt = [...pl].filter((k) => !tl.has(k));
const extraFr = [...fl].filter((k) => !tl.has(k));
const extraFil = [...fill].filter((k) => !tl.has(k));

console.log(
  JSON.stringify(
    {
      counts: {
        tr: tl.size,
        en: el.size,
        es: sl.size,
        pt: pl.size,
        ar: al.size,
        fr: fl.size,
        fil: fill.size,
      },
      missingInEn: missEn.length,
      missingInEs: missEs.length,
      missingInPt: missPt.length,
      missingInAr: missAr.length,
      missingInFr: missFr.length,
      missingInFil: missFil.length,
      extraInEn: extraEn.length,
      extraInPt: extraPt.length,
      extraInFr: extraFr.length,
      extraInFil: extraFil.length,
      sampleMissEn: missEn.slice(0, 20),
      sampleMissPt: missPt.slice(0, 20),
      sampleMissAr: missAr.slice(0, 20),
      sampleMissFr: missFr.slice(0, 20),
      sampleMissFil: missFil.slice(0, 20),
      sampleExtraEn: extraEn.slice(0, 20),
    },
    null,
    2,
  ),
);
