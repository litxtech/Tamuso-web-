import fs from 'node:fs';

const s = fs.readFileSync('src/i18n/locales/en.ts', 'utf8');
const i = s.indexOf('communityGovde');
const chunk = s.slice(i, i + 900);
const at = chunk.indexOf('─');
console.log(chunk.slice(Math.max(0, at - 80), at + 80));
console.log('---codepoints around---');
console.log(
  [...chunk.slice(at - 20, at + 20)]
    .map((c) => 'U+' + c.codePointAt(0).toString(16))
    .join(' '),
);
