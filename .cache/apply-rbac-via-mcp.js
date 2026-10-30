const fs = require('fs');
const path = require('path');

const chunks = [];
for (let i = 0; i < 5; i++) {
  chunks.push(fs.readFileSync(path.join(__dirname, `rbac_cat_${i}.sql`), 'utf8'));
}
chunks.push(`insert into public.admin_permission_catalog (permission_key, label, category, risk, sort_order)
select distinct p.permission_code, p.permission_code, 'LEGACY', 'MEDIUM', 900
from public.admin_role_permissions p
where not exists (select 1 from public.admin_permission_catalog c where c.permission_key = p.permission_code)
on conflict do nothing;`);

fs.writeFileSync(path.join(__dirname, 'rbac_catalog_all.sql'), chunks.join('\n'));
console.log('wrote', chunks.join('\n').length);
console.log('CHUNK_COUNT', chunks.length);
for (let i = 0; i < chunks.length; i++) {
  fs.writeFileSync(path.join(__dirname, `rbac_exec_${i}.sql`), chunks[i]);
  console.log(i, chunks[i].length);
}
