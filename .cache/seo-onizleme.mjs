import fs from 'node:fs';
import http from 'node:http';
import handler from '../api/public-icerik.mjs';

for (const satir of fs.readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\n/)) {
  const es = satir.replace(/\r$/, '').match(/^([A-Z0-9_]+)=(.*)$/);
  if (es && !process.env[es[1]]) process.env[es[1]] = es[2].trim().replace(/^["']|["']$/g, '');
}

const sunucu = http.createServer(async (istek, yanit) => {
  let kod = 200;
  const sarmal = {
    setHeader(anahtar, deger) { yanit.setHeader(anahtar, deger); },
    end(govde) {
      yanit.statusCode = kod;
      yanit.end(govde || '');
    },
  };
  Object.defineProperty(sarmal, 'statusCode', {
    set(deger) { kod = deger; },
    get() { return kod; },
  });
  await handler({ url: `https://www.tamuso.com${istek.url}` }, sarmal);
});
sunucu.listen(8765, '127.0.0.1');
