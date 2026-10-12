import assert from 'node:assert/strict';
import {
  aciklamaOlcusu,
  baslikOlcusu,
  htmlSoy,
  kelimeAnaliz,
  kelimeleriAyikla,
  siniflandir,
} from '../src/moduller/seo/seoAnahtarMotor.ts';

const tek = kelimeleriAyikla('  Canlı Yayın  ');
assert.deepEqual(tek, ['canlı yayın']);

const toplu = kelimeleriAyikla('tamuso, tanuso\nsesli sohbet, tamuso\ncoin');
assert.deepEqual(toplu, ['tamuso', 'tanuso', 'sesli sohbet', 'coin']);

const tr = kelimeleriAyikla('İstanbul, ŞEHİR');
assert.equal(tr[0], 'istanbul');
assert.equal(tr[1], 'şehir');

const tekrar = kelimeleriAyikla('coin, coin, coins');
assert.equal(tekrar.filter((k) => k === 'coin').length, 1);

const yanlis = kelimeAnaliz('tanuso');
assert.equal(yanlis.sinif.kategori, 'marka');
assert.match(yanlis.sinif.yazimUyarisi, /Ayrı sayfa açılmaz/);
assert.equal(yanlis.oneriler.some((o) => o.yeniSayfa), false);
assert.ok(yanlis.oneriler.every((o) => !o.onerilen.toLocaleLowerCase('tr-TR').includes('tanuso')));

const cok = kelimeAnaliz('sesli sohbet');
assert.equal(cok.sinif.kategori, 'ses');
assert.ok(cok.oneriler[0].hedefYol.startsWith('/'));
const baslik = cok.oneriler.find((o) => o.alan === 'title');
const aciklama = cok.oneriler.find((o) => o.alan === 'description');
assert.ok(baslik);
assert.ok(aciklama);
assert.ok([...baslik.onerilen].length <= 60);
assert.ok([...aciklama.onerilen].length <= 160);
assert.equal(cok.oneriler.filter((o) => o.alan === 'h1').length, 1);

const yok = kelimeAnaliz('xyzqwerty');
assert.equal(yok.oneriler[0].yeniSayfa, true);
assert.equal(yok.oneriler[0].hedefYol, '');

assert.equal(htmlSoy('<b>Merhaba</b>', 20), 'Merhaba');
assert.ok(!htmlSoy('<img src=x onerror=alert(1)>', 40).includes('<'));

const sinif = siniflandir('coins');
assert.equal(sinif.dil, 'en');
assert.equal(sinif.kategori, 'hediye');

const olcu = kelimeAnaliz('canlı yayın').oneriler.find((o) => o.alan === 'title');
assert.ok(olcu);
assert.ok(['kisa', 'hedef', 'uzun'].includes(baslikOlcusu(olcu.onerilen)));
const aciklamaOlcu = kelimeAnaliz('hediye').oneriler.find((o) => o.alan === 'description');
assert.ok(aciklamaOlcu);
assert.notEqual(aciklamaOlcusu(aciklamaOlcu.onerilen), 'uzun');

const ayni = kelimeAnaliz('coin');
const basliklar = new Set(ayni.oneriler.filter((o) => o.alan === 'title').map((o) => o.hedefYol));
assert.equal(basliklar.size, 1);

console.log('seo-anahtar: tek, toplu, türkçe, tekrar, yazım, çakışma, ölçü ve taslak testleri geçti');
