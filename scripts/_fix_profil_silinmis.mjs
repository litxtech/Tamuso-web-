import fs from 'fs';

const p = 'src/moduller/kullanici-profili/yardimcilar/ProfilSilinmis.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  /export const HESAP_SILINDI_ADI = '[^']*'/,
  "export const HESAP_SILINDI_ADI = 'Hesap sil\\u0131ndi'",
);
s = s.replace(
  /ad === 'hesap [^']*'/,
  "ad === 'hesap sil\\u0131ndi'",
);
fs.writeFileSync(p, s);
console.log('done');
console.log(fs.readFileSync(p, 'utf8').split('\n').slice(7, 22).join('\n'));
