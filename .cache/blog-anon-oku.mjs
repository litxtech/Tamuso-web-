import fs from 'node:fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
const key = env.match(/^EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim();
if (!url || !key) {
  console.log('env-yok');
  process.exit(0);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const taslak = await fetch(`${url}/rest/v1/blog_posts?slug=eq.gizli-taslak-qc&select=slug`, { headers });
const yayin = await fetch(`${url}/rest/v1/blog_posts?slug=eq.trabzon-yayin-qc&select=slug,status,language_code`, { headers });
const taslakGovde = await taslak.json();
const yayinGovde = await yayin.json();
console.log('taslak-anon', taslak.status, Array.isArray(taslakGovde) ? taslakGovde.length : 'hata');
console.log('yayin-anon', yayin.status, Array.isArray(yayinGovde) ? yayinGovde.length : 'hata', Array.isArray(yayinGovde) && yayinGovde[0] ? yayinGovde[0].status : '');
