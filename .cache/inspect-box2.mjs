import fs from 'node:fs';

const s = fs.readFileSync('src/i18n/locales/en.ts', 'utf8');
const lines = s.split(/\n/);
for (let i = 0; i < lines.length; i++) {
  const count = [...lines[i]].filter((c) => c === '─').length;
  if (count) console.log(i + 1, 'count', count, lines[i].trim().slice(0, 160));
}
