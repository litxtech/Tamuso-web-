import fs from 'fs';

const recover = fs.readFileSync('scripts/_i18n_recover_leftovers.mjs', 'utf8');
function extract(name) {
  const m = recover.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
  if (!m) throw new Error('no ' + name);
  return m[1].replace(/^\n/, '').replace(/\n$/, '\n');
}

function patch(file, gecmisVal, block) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('davetlerAlt:')) {
    console.log(file, 'skip');
    return;
  }
  const re = new RegExp(
    `(    gecmisBolum: '${gecmisVal}')\\r?\\n  \\},\\r?\\n  sehir:`,
  );
  if (!re.test(s)) {
    const i = s.indexOf('gecmisBolum');
    console.log('near', JSON.stringify(s.slice(i, i + 60)));
    throw new Error('no match ' + file);
  }
  s = s.replace(re, `$1,\n${block}  },\n  sehir:`);
  fs.writeFileSync(file, s);
  console.log(file, 'ok', s.includes('gorevlerBaslik'));
}

patch('src/i18n/locales/en.ts', 'History', extract('AJANS_EN'));
patch('src/i18n/locales/es.ts', 'Historial', extract('AJANS_ES'));
