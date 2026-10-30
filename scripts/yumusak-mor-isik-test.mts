import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  YUMUSAK_MOR_KATMANLAR,
  YUMUSAK_MOR_ZEMIN,
  type MorIsikKatmani,
} from '../src/moduller/ana-sayfa/bilesenler/yumusakMorIsik.ts';

const EKRANLAR = [
  { w: 360, h: 640 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
  { w: 768, h: 1024 },
];

function olcu(deger: number | string | undefined, toplam: number, varsayilan = 0): number {
  if (deger == null) return varsayilan;
  if (typeof deger === 'number') return deger;
  return (Number.parseFloat(deger) / 100) * toplam;
}

function kutu(katman: MorIsikKatmani, w: number, h: number) {
  const width = olcu(katman.yer.width, w);
  const height = olcu(katman.yer.height, h);
  const left =
    katman.yer.left != null
      ? olcu(katman.yer.left, w)
      : w - olcu(katman.yer.right, w) - width;
  const top =
    katman.yer.top != null
      ? olcu(katman.yer.top, h)
      : h - olcu(katman.yer.bottom, h) - height;
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function icinde(k: ReturnType<typeof kutu>, x: number, y: number) {
  return x >= k.left && x <= k.right && y >= k.top && y <= k.bottom;
}

assert.equal(YUMUSAK_MOR_ZEMIN, '#090811');
assert.ok(YUMUSAK_MOR_KATMANLAR.length >= 4);

for (const katman of YUMUSAK_MOR_KATMANLAR) {
  assert.equal(katman.colors.at(-1)?.endsWith(', 0)'), true, katman.id);
  const alfa = Number(katman.colors[0].match(/, ([0-9.]+)\)/)?.[1]);
  assert.ok(alfa > 0 && alfa <= 0.2, `${katman.id} alfa ${alfa}`);
  assert.equal(/232,\s*64,\s*145|#E84091|#FF4D8D/i.test(katman.colors.join(' ')), false);
  assert.ok(
    katman.yer.top === 0 ||
      katman.yer.left === 0 ||
      katman.yer.right === 0 ||
      katman.yer.bottom === 0,
    katman.id,
  );
}

const ustSol = YUMUSAK_MOR_KATMANLAR.find((k) => k.id === 'ust-sol');
const ustSag = YUMUSAK_MOR_KATMANLAR.find((k) => k.id === 'ust-sag');
assert.ok(ustSol && ustSag);
assert.ok(
  Number.parseFloat(ustSol.yer.width) + Number.parseFloat(ustSag.yer.width) < 100,
);

for (const ekran of EKRANLAR) {
  const kutular = YUMUSAK_MOR_KATMANLAR.map((k) => kutu(k, ekran.w, ekran.h));
  for (const k of kutular) {
    assert.ok(k.left >= -0.5 && k.top >= -0.5, 'ekran disi');
    assert.ok(k.right <= ekran.w + 0.5 && k.bottom <= ekran.h + 0.5, 'tasama');
    assert.ok(k.width > 0 && k.height > 0);
  }
  const orta = { x: ekran.w * 0.5, y: ekran.h * 0.52 };
  assert.equal(
    kutular.some((k) => icinde(k, orta.x, orta.y)),
    false,
    `${ekran.w}x${ekran.h} orta isik`,
  );
}

const ana = readFileSync(new URL('../app/(tabs)/index.tsx', import.meta.url), 'utf8');
const kesfet = readFileSync(new URL('../app/kesfet.tsx', import.meta.url), 'utf8');
assert.match(ana, /<AnaSayfaAtmosfer yumusakMorIsik \/>/);
assert.equal(kesfet.includes('yumusakMorIsik'), false);
assert.equal(ana.includes('<AnaSayfaAtmosfer yumusakMorIsik />') , true);
const atmosferSirasi = ana.indexOf('<AnaSayfaAtmosfer yumusakMorIsik />');
const listeSirasi = ana.indexOf('<FlatList\r') === -1 ? ana.indexOf('<FlatList\n') : ana.indexOf('<FlatList\r');
assert.ok(atmosferSirasi > 0 && listeSirasi > atmosferSirasi);

console.log('yumusak-mor-isik: zemin, kenar ve ekran olculeri gecti');
