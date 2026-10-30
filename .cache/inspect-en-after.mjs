import fs from 'node:fs';

const s = fs.readFileSync('src/i18n/locales/en.ts', 'utf8');
const lines = s.split(/\n/);
for (const n of [29, 95, 211, 293, 436, 711, 2436, 3709, 3710, 3711, 3712, 3713, 3714]) {
  console.log(lines[n - 1].trim());
}
const m = new Map();
for (const c of s) {
  const cp = c.codePointAt(0);
  if (cp > 127) m.set(cp, (m.get(cp) || 0) + 1);
}
console.log('--- non-ascii ---');
for (const [cp, n] of [...m.entries()].sort((a, b) => b[1] - a[1])) {
  console.log('U+' + cp.toString(16).padStart(4, '0'), JSON.stringify(String.fromCodePoint(cp)), n);
}
