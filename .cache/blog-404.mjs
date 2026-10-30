import fs from 'node:fs';
import handler from '../api/blog-yol.mjs';

for (const satir of fs.readFileSync('.env', 'utf8').split(/\n/)) {
  const es = satir.replace(/\r$/, '').match(/^([A-Z0-9_]+)=(.*)$/);
  if (!es || process.env[es[1]]) continue;
  process.env[es[1]] = es[2].trim().replace(/^["']|["']$/g, '');
}

function yanit() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(b) { this.body = b || ''; },
  };
}

const yok = yanit();
await handler({ url: 'https://www.tamuso.com/api/blog-yol?slug=boyle-bir-yazi-yok' }, yok);
console.log('yok', yok.statusCode, yok.headers['X-Robots-Tag'], String(yok.body).includes('noindex'));

const taslak = yanit();
await handler({ url: 'https://www.tamuso.com/api/blog-yol?slug=gizli-taslak-qc' }, taslak);
console.log('taslak', taslak.statusCode);
