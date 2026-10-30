// Belirtilen dizindeki .ts/.tsx dosyalarında göreli importlara N seviye ekler.
// Kullanım: node scripts/import-derinlestir.mjs <dizin> <seviye>
import fs from 'node:fs';
import path from 'node:path';

const [, , dizinArg, seviyeArg] = process.argv;
if (!dizinArg) {
  console.error('Kullanım: node scripts/import-derinlestir.mjs <dizin> <seviye>');
  process.exit(1);
}
const EK = Math.max(0, Number(seviyeArg ?? 2));
const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const HEDEF = path.resolve(KOK, dizinArg);

function dosyalar(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...dosyalar(p));
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

const SPEC_RE = /(from\s*|require\(\s*|import\(\s*)(['"])(\.\.?\/[^'"]*)\2/g;
const ONEK = '../'.repeat(EK);

let degisen = 0;
for (const dosya of dosyalar(HEDEF)) {
  const eski = fs.readFileSync(dosya, 'utf8');
  const yeni = eski.replace(SPEC_RE, (m, on, q, spec) =>
    spec.startsWith('../') ? `${on}${q}${ONEK}${spec}${q}` : m,
  );
  if (yeni !== eski) {
    fs.writeFileSync(dosya, yeni, 'utf8');
    degisen += 1;
  }
}
console.log(`Değişen dosya: ${degisen} (ek seviye: ${EK})`);
