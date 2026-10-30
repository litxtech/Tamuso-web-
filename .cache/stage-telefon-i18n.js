const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ek = {
  'src/i18n/locales/tr.ts': [
    '    telefonSms: "Mesaj gönder",',
    '    telefonWhatsapp: "WhatsApp",',
  ],
  'src/i18n/locales/en.ts': [
    '    telefonSms: "Send message",',
    '    telefonWhatsapp: "WhatsApp",',
  ],
  'src/i18n/locales/es.ts': [
    '    telefonSms: "Enviar mensaje",',
    '    telefonWhatsapp: "WhatsApp",',
  ],
  'src/i18n/locales/pt.ts': [
    '    telefonSms: "Enviar mensagem",',
    '    telefonWhatsapp: "WhatsApp",',
  ],
};

for (const [file, linesToAdd] of Object.entries(ek)) {
  const head = execSync(`git show HEAD:${file}`, { encoding: 'utf8' });
  if (head.includes('telefonSms:')) {
    throw new Error(`already present: ${file}`);
  }
  const lines = head.split('\n');
  const i = lines.findIndex((l) => l.includes('tarihDun:'));
  if (i < 0) throw new Error(`no tarihDun in ${file}`);
  lines.splice(i + 1, 0, ...linesToAdd);
  const tmp = path.join('.cache', `stage-${path.basename(file)}`);
  fs.writeFileSync(tmp, lines.join('\n'));
  const hash = execSync(`git hash-object -w --path "${file}" "${tmp}"`, {
    encoding: 'utf8',
  }).trim();
  execSync(`git update-index --cacheinfo 100644,${hash},${file}`);
  console.log('staged', file, hash.slice(0, 8));
}
