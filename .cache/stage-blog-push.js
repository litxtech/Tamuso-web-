import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

function head(p) {
  return execFileSync('git', ['show', `HEAD:${p}`]);
}

function stage(p, buf) {
  const tmp = '.cache/_stage.bin';
  fs.writeFileSync(tmp, buf);
  const hash = execFileSync('git', ['hash-object', '-w', '--', tmp], { encoding: 'utf8' }).trim();
  execFileSync('git', ['update-index', '--cacheinfo', `100644,${hash},${p}`]);
  console.log('staged', p, hash.slice(0, 8));
}

const pairs = [
  ['src/i18n/locales/tr.ts', 'Yazılar ve şehir rehberleri', 'Yayınlanan yazılar'],
  ['src/i18n/locales/en.ts', 'Stories and city guides', 'Published articles'],
  ['src/i18n/locales/es.ts', 'Artículos y guías de ciudades', 'Artículos publicados'],
  ['src/i18n/locales/pt.ts', 'Artigos e guias de cidades', 'Artigos publicados'],
];

for (const [p, from, to] of pairs) {
  const s = head(p).toString('utf8');
  if (!s.includes(from)) throw new Error(`missing string in ${p}`);
  const n = s.replace(from, to);
  stage(p, Buffer.from(n, 'utf8'));
}

const hp = 'src/moduller/ana-sayfa/menu/HamburgerMenuKatalogu.ts';
const h = head(hp).toString('utf8');
const old = "href: 'https://www.tamuso.com/blog'";
if (!h.includes(old)) throw new Error('blog href missing');
stage(hp, Buffer.from(h.replace(old, "href: '/blog'"), 'utf8'));
