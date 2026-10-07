/**
 * Public SEO ilk HTML denetimi. Tarayıcı açmaz.
 * PUBLIC_SEO_ORIGIN verilirse canlı adresi, verilmezse yerel API fonksiyonunu dener.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlDenetle } from './public-seo-motor.mjs';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function envYukle() {
  const yol = path.join(kok, '.env');
  if (!fs.existsSync(yol)) return;
  for (const satir of fs.readFileSync(yol, 'utf8').split(/\n/)) {
    const es = satir.replace(/\r$/, '').match(/^([A-Z0-9_]+)=(.*)$/);
    if (!es || process.env[es[1]]) continue;
    process.env[es[1]] = es[2].trim().replace(/^["']|["']$/g, '');
  }
}

envYukle();

function ozet(html, kod, robot) {
  const d = htmlDenetle(html);
  return {
    kod,
    robot: robot || d.robots,
    h1: d.h1.length,
    title: Boolean(d.title),
    description: Boolean(d.description),
    canonical: d.canonical,
    json: d.json.length,
    script: /<script>alert/i.test(html),
  };
}

async function yerel(yol) {
  const { default: handler } = await import('../api/public-icerik.mjs');
  let kod = 0;
  let robot = '';
  let govde = '';
  const yanit = {
    setHeader(anahtar, deger) {
      if (anahtar === 'X-Robots-Tag') robot = deger;
    },
    end(icerik) {
      govde = icerik || '';
    },
  };
  Object.defineProperty(yanit, 'statusCode', {
    set(deger) { kod = deger; },
    get() { return kod; },
  });
  await handler({ url: `https://www.tamuso.com${yol}` }, yanit);
  return ozet(govde, kod, robot);
}

const hedef = process.argv[2] || '/api/public-icerik?tur=post&slug=boyle-bir-yazi-yok';
const sonuc = process.env.PUBLIC_SEO_ORIGIN
  ? await (async () => {
      const yanit = await fetch(`${process.env.PUBLIC_SEO_ORIGIN}${hedef}`);
      return ozet(await yanit.text(), yanit.status, yanit.headers.get('x-robots-tag') || '');
    })()
  : await yerel(hedef);
console.log(JSON.stringify(sonuc));
