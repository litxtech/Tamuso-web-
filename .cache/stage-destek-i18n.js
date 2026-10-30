import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

function head(p) {
  return execFileSync('git', ['show', `HEAD:${p}`]);
}

function stage(p, buf) {
  fs.writeFileSync('.cache/_stage.bin', buf);
  const hash = execFileSync('git', ['hash-object', '-w', '--', '.cache/_stage.bin'], { encoding: 'utf8' }).trim();
  execFileSync('git', ['update-index', '--cacheinfo', `100644,${hash},${p}`]);
  console.log('staged', p, hash.slice(0, 8));
}

function degistir(p, from, to) {
  const raw = head(p);
  const s = raw.toString('utf8');
  const lines = s.split('\n');
  let n = 0;
  const out = lines.map((line) => {
    if (line.includes('idleKapandi') && line.includes(from)) {
      n += 1;
      return line.replace(from, to);
    }
    return line;
  });
  if (n !== 1) throw new Error(`${p} eslesme ${n}`);
  stage(p, Buffer.from(out.join('\n'), 'utf8'));
}

degistir('src/i18n/locales/tr.ts', '3 dakika', '30 dakika');
degistir('src/i18n/locales/en.ts', '3 minutes', '30 minutes');
degistir('src/i18n/locales/es.ts', '3 minutos', '30 minutos');
degistir('src/i18n/locales/pt.ts', '3 minutes', '30 minutes');
degistir('src/i18n/locales/ar.json', '3 دقائق', '30 دقيقة');
degistir('src/i18n/locales/fr.json', '3 minutes', '30 minutes');
degistir('src/i18n/locales/fil.json', '3 minutong', '30 minutong');
