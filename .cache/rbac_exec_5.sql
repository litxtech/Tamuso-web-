insert into public.admin_permission_catalog (permission_key, label, category, risk, sort_order)
select distinct p.permission_code, p.permission_code, 'LEGACY', 'MEDIUM', 900
from public.admin_role_permissions p
where not exists (select 1 from public.admin_permission_catalog c where c.permission_key = p.permission_code)
on conflict do nothing;