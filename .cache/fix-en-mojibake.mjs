import fs from 'node:fs';

/** Windows-1254 (Turkish) code point → byte. 1252 artı ĞİŞğış. */
const CP1254 = new Map([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
  [0x011e, 0xd0],
  [0x0130, 0xdd],
  [0x015e, 0xde],
  [0x011f, 0xf0],
  [0x0131, 0xfd],
  [0x015f, 0xfe],
]);

function toByte(ch) {
  const cp = ch.codePointAt(0);
  if (cp <= 0x7f) return cp;
  if (CP1254.has(cp)) return CP1254.get(cp);
  if (cp >= 0x80 && cp <= 0x9f) return cp;
  if (cp >= 0xa0 && cp <= 0xff) return cp;
  return null;
}

function isCont(b) {
  return b != null && b >= 0x80 && b <= 0xbf;
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

function fix(s) {
  const chars = [...s];
  let out = '';
  let i = 0;
  while (i < chars.length) {
    const b0 = toByte(chars[i]);
    const len =
      b0 >= 0xf0 && b0 <= 0xf4 ? 4 : b0 >= 0xe0 && b0 <= 0xef ? 3 : b0 >= 0xc2 && b0 <= 0xdf ? 2 : 0;
    if (len && i + len <= chars.length) {
      const bytes = [b0];
      let ok = true;
      for (let k = 1; k < len; k++) {
        const b = toByte(chars[i + k]);
        if (!isCont(b)) {
          ok = false;
          break;
        }
        bytes.push(b);
      }
      if (ok) {
        try {
          out += utf8.decode(Uint8Array.from(bytes));
          i += len;
          continue;
        } catch {
          /* keep original chars */
        }
      }
    }
    out += chars[i];
    i++;
  }
  return out;
}

const path = 'src/i18n/locales/en.ts';
const before = fs.readFileSync(path, 'utf8');
const after = fix(before);
fs.writeFileSync(path, after);
let e2 = 0;
let c2 = 0;
let g = 0;
for (const c of after) {
  const cp = c.codePointAt(0);
  if (cp === 0xe2) e2++;
  if (cp === 0xc2) c2++;
  if (cp === 0x11f) g++;
}
console.log('changed', before !== after, 'remaining â', e2, 'Â', c2, 'ğ', g);
