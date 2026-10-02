#!/usr/bin/env node
/** Scan app screens for missing i18n / leftover Turkish UI text. */
import fs from 'node:fs';
import path from 'node:path';

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) a.push(p);
  }
  return a;
}

const TR = /[ÇĞİÖŞÜçğıöşü]/;
const files = walk('app').filter((f) => !f.includes('node_modules'));
const rows = [];

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const usesI18n = /useCeviri|useTranslation|\bt\(|i18n\.t\(/.test(src);
  const isAdmin = /[/\\]admin[/\\]/.test(f);
  const trHits = (src.match(/[ÇĞİÖŞÜçğıöşü]/g) || []).length;
  // JSX text / string literals with Turkish (heuristic)
  const hardJsx = [];
  const re = /(?:>|'|"|`)([^"'`<>{}\n]{2,80})(?:<|'|"|`)/g;
  let m;
  while ((m = re.exec(src))) {
    const s = m[1].trim();
    if (s.length < 3) continue;
    if (TR.test(s) && !/^\s*\/\//.test(s) && !s.includes('import ')) {
      hardJsx.push(s.slice(0, 60));
    }
  }
  rows.push({
    f: f.replace(/\\/g, '/'),
    usesI18n,
    isAdmin,
    trHits,
    hardSample: [...new Set(hardJsx)].slice(0, 5),
  });
}

const user = rows.filter((r) => !r.isAdmin);
const noI18n = user.filter((r) => !r.usesI18n);
const heavy = user.filter((r) => r.trHits >= 8).sort((a, b) => b.trHits - a.trHits);

console.log('User screens:', user.length);
console.log('Admin screens:', rows.filter((r) => r.isAdmin).length);
console.log('User WITHOUT useCeviri/t():', noI18n.length);
for (const r of noI18n) {
  console.log(`  NO_I18N tr=${r.trHits} ${r.f}`);
  if (r.hardSample.length) console.log('    samples:', r.hardSample.join(' | '));
}
console.log('\nUser screens heavy Turkish chars (>=8):', heavy.length);
for (const r of heavy.slice(0, 50)) {
  console.log(`  TR=${String(r.trHits).padStart(4)} i18n=${r.usesI18n ? 'Y' : 'N'} ${r.f}`);
  if (r.hardSample.length) console.log('    samples:', r.hardSample.join(' | '));
}
