// Admin route aÄŸacÄ±nÄ± app/ -> apps/super-admin/app/ altÄ±na taÅŸÄ±dÄ±ktan sonra
// gÃ¶reli import derinliklerini dÃ¼zeltir ve her birinin gerÃ§ekten Ã§Ã¶zÃ¼ldÃ¼ÄŸÃ¼nÃ¼ doÄŸrular.
// KullanÄ±m: node scripts/admin-tasima-import-duzelt.mjs [--uygula]
import fs from 'node:fs';
import path from 'node:path';

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')), '..');
const HEDEF = path.join(KOK, 'apps', 'super-admin', 'app', 'admin');
const UYGULA = process.argv.includes('--uygula');

const UZANTILAR = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.png', '.mp4', '.webm', '.mov', '.txt'];

function dosyalariTopla(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...dosyalariTopla(p));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

function cozulurMu(fromDir, spec) {
  const base = path.resolve(fromDir, spec);
  for (const u of UZANTILAR) {
    const aday = base + u;
    if (fs.existsSync(aday) && fs.statSync(aday).isFile()) return aday;
  }
  for (const u of ['.ts', '.tsx', '.js', '.jsx']) {
    const aday = path.join(base, 'index' + u);
    if (fs.existsSync(aday)) return aday;
  }
  return null;
}

// GÃ¶reli specifier'larda baÅŸtaki ../ sayÄ±sÄ±nÄ± hedef derinliÄŸe gÃ¶re artÄ±r.
const SPEC_RE = /(from\s*|require\(\s*|import\(\s*)(['"])(\.\.?\/[^'"]*)\2/g;

let degisen = 0;
const cozulmeyen = [];

for (const dosya of dosyalariTopla(HEDEF)) {
  const dir = path.dirname(dosya);
  const eski = fs.readFileSync(dosya, 'utf8');
  let yeni = eski;

  yeni = yeni.replace(SPEC_RE, (m, on, tirnak, spec) => {
    if (!spec.startsWith('../')) return m; // './' aynÄ± kalÄ±r
    const duzeltilmis = '../'.repeat(2) + spec;
    return `${on}${tirnak}${duzeltilmis}${tirnak}`;
  });

  if (yeni !== eski) {
    degisen += 1;
    if (UYGULA) fs.writeFileSync(dosya, yeni, 'utf8');
  }

  // DoÄŸrulama: nihai iÃ§erikteki tÃ¼m gÃ¶reli importlar Ã§Ã¶zÃ¼lÃ¼yor mu?
  const kontrol = UYGULA ? yeni : yeni;
  let mm;
  const re = new RegExp(SPEC_RE.source, 'g');
  while ((mm = re.exec(kontrol)) !== null) {
    const spec = mm[3];
    if (!cozulurMu(dir, spec)) {
      cozulmeyen.push(`${path.relative(KOK, dosya)} -> ${spec}`);
    }
  }
}

console.log(`Mod: ${UYGULA ? 'UYGULA' : 'KURU Ã‡ALIÅMA'}`);
console.log(`DeÄŸiÅŸen dosya: ${degisen}`);
console.log(`Ã‡Ã¶zÃ¼lmeyen gÃ¶reli import: ${cozulmeyen.length}`);
for (const c of cozulmeyen.slice(0, 40)) console.log('  âœ— ' + c);

