import fs from 'fs';
import path from 'path';

const roots = [
  'app/(tabs)/wallet.tsx',
  'app/profil-duzenle/index.tsx',
  'app/kesfet.tsx',
  'app/kisiler',
  'app/mesaj',
  'app/bildirimler',
  'app/bildirim-ayarlari',
  'app/ayarlar/gizlilik.tsx',
  'app/ayarlar/satin-alma-gecmisi.tsx',
  'app/ayarlar/kisiler-aramalar.tsx',
  'app/durum/olustur.tsx',
  'app/durum/duzenle.tsx',
  'app/durum/[id].tsx',
  'src/moduller/kesfet',
  'src/moduller/kisiler-kesif',
  'src/moduller/mesajlasma/bilesenler',
  'src/moduller/gorusme',
  'src/moduller/ses-odalari/bilesenler',
  'src/moduller/durum',
];

function walk(p, acc = []) {
  if (!fs.existsSync(p)) return acc;
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(p)) walk(path.join(p, f), acc);
  } else if (/\.(tsx|ts)$/.test(p) && !p.includes(`${path.sep}admin${path.sep}`)) {
    acc.push(p);
  }
  return acc;
}

const files = [];
for (const r of roots) walk(path.join(process.cwd(), r), files);

const trChars = /[çğıöşüÇĞİÖŞÜ]/;
const re = /(['"`])((?:(?!\1)[^\\]|\\.)*?)\1/g;

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    const trim = line.trim();
    if (trim.startsWith('//') || trim.startsWith('*') || trim.startsWith('import ') || trim.startsWith('export type')) return;
    let s;
    re.lastIndex = 0;
    const strs = [];
    while ((s = re.exec(line))) {
      const v = s[2];
      if (!trChars.test(v)) continue;
      if (/^[a-zA-Z0-9_.]+$/.test(v)) continue;
      if (v.length < 2) continue;
      const before = line.slice(0, s.index);
      if (before.includes('//')) continue;
      // likely already in t('...') if immediately preceded by t(
      if (/t\(\s*$/.test(before.slice(-4))) continue;
      strs.push(v.slice(0, 100));
    }
    if (strs.length) hits.push({ n: i + 1, strs });
  });
  if (hits.length) {
    console.log(`\n=== ${path.relative(process.cwd(), f)} (${hits.length}) ===`);
    for (const h of hits.slice(0, 50)) {
      console.log(`${h.n}: ${h.strs.map((x) => JSON.stringify(x)).join(' | ')}`);
    }
    if (hits.length > 50) console.log(`... +${hits.length - 50} more`);
  }
}
console.log(`\nFiles scanned: ${files.length}`);
