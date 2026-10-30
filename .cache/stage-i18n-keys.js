const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const inserts = {
  'src/i18n/locales/tr.ts': {
    oz: '    ozellikEkle: "Uygulama özelliği ekle",',
    dates: ['    tarihBugun: "Bugün",', '    tarihDun: "Dün",'],
  },
  'src/i18n/locales/en.ts': {
    oz: '    ozellikEkle: "Add an app feature",',
    dates: ['    tarihBugun: "Today",', '    tarihDun: "Yesterday",'],
  },
  'src/i18n/locales/es.ts': {
    oz: '    ozellikEkle: "Añadir función de la app",',
    dates: ['    tarihBugun: "Hoy",', '    tarihDun: "Ayer",'],
  },
  'src/i18n/locales/pt.ts': {
    oz: '    ozellikEkle: "Adicionar recurso do app",',
    dates: ['    tarihBugun: "Hoje",', '    tarihDun: "Ontem",'],
  },
};

for (const [file, ins] of Object.entries(inserts)) {
  const buf = execFileSync('git', ['show', `HEAD:${file}`]);
  const s = buf.toString('utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  const lines = s.split(/\r?\n/);
  const hi = lines.findIndex((l) => l.includes('hizliEkleAlt'));
  const bi = lines.findIndex((l) => l.includes('bosChatAlt'));
  if (hi < 0 || bi < 0) throw new Error(`anchor missing ${file}`);
  if (!lines.some((l) => l.includes('ozellikEkle:'))) lines.splice(hi + 1, 0, ins.oz);
  if (!lines.some((l) => l.includes('tarihBugun:'))) {
    const at = lines.findIndex((l) => l.includes('bosChatAlt'));
    lines.splice(at + 1, 0, ...ins.dates);
  }
  const tmp = path.join(os.tmpdir(), `muta-${path.basename(file)}`);
  fs.writeFileSync(tmp, lines.join(nl));
  const hash = execFileSync('git', ['hash-object', '-w', '--path', file, tmp], {
    encoding: 'utf8',
  }).trim();
  execFileSync('git', ['update-index', '--cacheinfo', '100644', hash, file]);
  console.log('indexed', file, hash.slice(0, 8));
}
