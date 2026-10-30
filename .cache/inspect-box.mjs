import fs from 'node:fs';

const s = fs.readFileSync('src/i18n/locales/en.ts', 'utf8');
const lines = s.split(/\n/);
let n = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('─') || lines[i].includes('ñ') || lines[i].includes('ç') || lines[i].includes('é')) {
    console.log(i + 1, lines[i].trim().slice(0, 200));
    n++;
    if (n > 40) break;
  }
}
console.log('shown', n);
