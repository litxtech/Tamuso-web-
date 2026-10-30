/**
 * Meyve çarkı: 4 seçim, çarpan tablosu, ödeme, seyrek yüksek çarpan, üst üste yok.
 * Çalıştır: npx tsx scripts/fruit-wheel-secim.test.ts
 */
import assert from 'node:assert/strict';
import {
  MAX_MEYVE_SECIMI,
  MEYVE_CARPANLARI,
  agirlikliMeyveSec,
  meyveKazanci,
  meyveTutariEkle,
  potansiyelKazanc,
  secimSayisi,
} from '../src/moduller/oyunlar/fruit-wheel/math/FruitWheelSecim';

assert.equal(MEYVE_CARPANLARI.length, 8, '8 slot');
assert.equal(MEYVE_CARPANLARI.filter((m) => m.multiplier === 5).length, 4, '4 slot 5x');
assert.deepEqual(
  MEYVE_CARPANLARI.map((m) => m.multiplier).sort((a, b) => a - b),
  [5, 5, 5, 5, 10, 15, 25, 40],
  'çarpan dağılımı',
);

const agirlik = Object.fromEntries(MEYVE_CARPANLARI.map((m) => [m.multiplier, [] as number[]]));
for (const m of MEYVE_CARPANLARI) agirlik[m.multiplier]!.push(m.weight);
assert.ok(Math.max(...agirlik[40]!) < Math.max(...agirlik[25]!), '40x, 25x ten seyrek');
assert.ok(Math.max(...agirlik[25]!) < Math.max(...agirlik[15]!), '25x, 15x ten seyrek');
assert.ok(Math.max(...agirlik[15]!) < Math.max(...agirlik[10]!), '15x, 10x tan seyrek');
assert.ok(Math.max(...agirlik[10]!) < Math.min(...agirlik[5]!), '10x, 5x ten seyrek');

let taslak: Record<string, number> = {};
for (const id of ['cherry', 'lemon', 'orange', 'watermelon']) {
  const r = meyveTutariEkle(taslak, id, 10);
  assert.equal(r.reddedildi, false, `${id} seçilir`);
  taslak = r.tutarlar;
}
assert.equal(secimSayisi(taslak), MAX_MEYVE_SECIMI);
const besinci = meyveTutariEkle(taslak, 'kiwi', 10);
assert.equal(besinci.reddedildi, true, '5. meyve reddedilir');
assert.equal(besinci.tutarlar, taslak);
const ayni = meyveTutariEkle(taslak, 'cherry', 50);
assert.equal(ayni.reddedildi, false, 'aynı meyvenin tutarı artar');
assert.equal(ayni.tutarlar.cherry, 60);
assert.equal(secimSayisi(ayni.tutarlar), 4, 'aynı meyve ikinci slot değildir');
const { cherry: _c, ...uc } = ayni.tutarlar;
const yerine = meyveTutariEkle(uc, 'kiwi', 10);
assert.equal(yerine.reddedildi, false, 'bırakılan slot yeniden seçilir');
assert.equal(secimSayisi(yerine.tutarlar), 4);

assert.equal(meyveKazanci(100, 40, true), 4000, '40x ödeme');
assert.equal(meyveKazanci(100, 5, true), 500, '5x ödeme');
assert.equal(meyveKazanci(100, 40, false), 0, 'eşleşmeyen 0');
assert.equal(meyveKazanci(10.9, 5, true), 54, 'floor');
assert.equal(
  potansiyelKazanc([
    { bahis: 10, carpan: 5 },
    { bahis: 20, carpan: 40 },
  ]),
  800,
  'olası kazanç en yüksek satırdır, bahis toplamı değil',
);

const toplamAgirlik = MEYVE_CARPANLARI.reduce((s, m) => s + m.weight, 0);
const sayac = new Map<string, number>();
let onceki = '';
let ustUste = 0;
for (let i = 0; i < toplamAgirlik * 40; i += 1) {
  const id = agirlikliMeyveSec(MEYVE_CARPANLARI, i, onceki || null);
  if (id === onceki) ustUste += 1;
  onceki = id;
  sayac.set(id, (sayac.get(id) ?? 0) + 1);
}
assert.equal(ustUste, 0, 'aynı meyve üst üste gelmez');
const bes = ['cherry', 'lemon', 'orange', 'watermelon'].reduce((s, id) => s + (sayac.get(id) ?? 0), 0);
const kirk = sayac.get('kiwi') ?? 0;
const on = sayac.get('grape') ?? 0;
assert.ok(kirk < on, '40x, 10x tan az çıkar');
assert.ok(on < bes / 4, '10x, tek bir 5x meyveden az çıkar');

console.log('fruit-wheel secim ok');
