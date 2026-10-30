import fs from 'node:fs';

const p = 'src/moduller/web-tanitim/tanitimMetin.ts';
const lines = fs.readFileSync(p, 'utf8').split(/\n/);
let mode = 'type';
const out = [];
for (const line of lines) {
  if (line.startsWith('export type')) mode = 'type';
  const blok = line.match(/^const ([A-Z]+):/);
  if (blok) mode = blok[1];
  out.push(line);
  if (!line.includes('navPolitika:')) continue;
  if (mode === 'type') out.push('  navBlog: string;');
  else if (mode === 'AR') out.push("  navBlog: 'المدونة',");
  else out.push("  navBlog: 'Blog',");
}
fs.writeFileSync(p, out.join('\n'));
console.log('navBlog', out.filter((l) => l.includes('navBlog')).length);
