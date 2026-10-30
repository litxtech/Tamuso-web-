const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = {
  'src/i18n/locales/en.ts': [
    '    yanitHikayesine: "Replied to their story",',
    '    yanitHikayene: "Replied to your story",',
  ],
  'src/i18n/locales/es.ts': [
    '    yanitHikayesine: "Respondiste a su historia",',
    '    yanitHikayene: "Respondió a tu historia",',
  ],
  'src/i18n/locales/pt.ts': [
    '    yanitHikayesine: "Respondeu ao story",',
    '    yanitHikayene: "Respondeu ao seu story",',
  ],
  'src/i18n/locales/tr.ts': [
    '    yanitHikayesine: "Hikayesine yanıt",',
    '    yanitHikayene: "Hikayene yanıt",',
  ],
};

for (const [file, lines] of Object.entries(files)) {
  const src = execSync(`git show HEAD:${file}`, { encoding: 'buffer' }).toString('utf8');
  const marker = 'yanitGonderildi:';
  const hits = src.split(marker).length - 1;
  if (hits !== 1) throw new Error(`${file} marker count ${hits}`);
  const at = src.indexOf(marker);
  const eol = src.indexOf('\n', at);
  const nl = src[eol - 1] === '\r' ? '\r\n' : '\n';
  const next = `${src.slice(0, eol)}${nl}${lines.join(nl)}${src.slice(eol)}`;
  const out = path.join('.cache', `stage-${path.basename(file)}`);
  fs.writeFileSync(out, next);
  const hash = execSync(`git hash-object -w ${out}`).toString().trim();
  execSync(`git update-index --cacheinfo 100644,${hash},${file}`);
  console.log(file, hash.slice(0, 8));
}
