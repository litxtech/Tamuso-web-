import fs from 'node:fs';

const satir = fs.readFileSync('.env', 'utf8').split(/\n/).find((l) => l.includes('SUPABASE_URL'));
const codes = [...satir.slice(0, 40)].map((c) => c.charCodeAt(0));
console.log(codes.join(','));
console.log('eq', satir.includes('='));
console.log('re1', /^([A-Z0-9_]+)=/.test(satir));
console.log('re2', /^([A-Z0-9_]+)=(.*)$/.test(satir));
