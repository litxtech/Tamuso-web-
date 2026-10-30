import fs from 'node:fs';

const s = fs.readFileSync('src/i18n/locales/en.ts', 'utf8');
const lines = s.split(/\n/);
for (const n of [29, 95, 211, 711, 2436, 3709, 3713]) {
  const line = lines[n - 1];
  console.log(n, line.trim().slice(0, 140));
  console.log(
    [...line]
      .filter((c) => c.codePointAt(0) > 127)
      .map((c) => 'U+' + c.codePointAt(0).toString(16))
      .join(' '),
  );
  console.log('---');
}
