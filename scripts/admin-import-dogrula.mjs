// Taşınmış admin ağacındaki tüm göreli importların gerçekten çözüldüğünü doğrular.
// Hiçbir şeyi değiştirmez.
import fs from 'node:fs';
import path from 'node:path';

const KOK = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const HEDEFLER = [
  path.join(KOK, 'apps', 'super-admin', 'app'),
];

const UZANTILAR = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '.png', '.mp4', '.webm', '.mov', '.txt'];

function dosyalariTopla(dir) {
  if (!fs.existsSync(dir)) return [];
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
    if (fs.existsSync(aday) && fs.statSync(aday).isFile()) return true;
  }
  for (const u of ['.ts', '.tsx', '.js', '.jsx']) {
    if (fs.existsSync(path.join(base, 'index' + u))) return true;
  }
  return false;
}

const SPEC_RE = /(?:from\s*|require\(\s*|import\(\s*)(['"])(\.\.?\/[^'"]*)\1/g;

let toplam = 0;
const hatalar = [];
for (const hedef of HEDEFLER) {
  for (const dosya of dosyalariTopla(hedef)) {
    const dir = path.dirname(dosya);
    const icerik = fs.readFileSync(dosya, 'utf8');
    let m;
    const re = new RegExp(SPEC_RE.source, 'g');
    while ((m = re.exec(icerik)) !== null) {
      toplam += 1;
      if (!cozulurMu(dir, m[2])) {
        hatalar.push(`${path.relative(KOK, dosya)} -> ${m[2]}`);
      }
    }
  }
}

console.log(`Göreli import: ${toplam}`);
console.log(`Çözülmeyen: ${hatalar.length}`);
for (const h of hatalar.slice(0, 40)) console.log('  ✗ ' + h);
process.exit(hatalar.length ? 1 : 0);
