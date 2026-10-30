-- Ajans satış takibi · paylaşılabilir satış linki · dekont · fatura

-- ---------------------------------------------------------------------------
-- RBAC
-- ---------------------------------------------------------------------------
insert into public.agency_permissions (code, description, sort_order) values
  ('agency.manage_sale_links', 'Satış linki oluştur / yönet', 145),
  ('agency.view_sales', 'Satış takibini gör', 146),
  ('agency.review_sales', 'Satışı geçerli/geçersiz işaretle', 147),
  ('agency.manage_invoices', 'Fatura oluştur / düzenle', 148)
on conflict (code) do nothing;

-- OWNER: yeni yetkiler
insert into public.agency_role_default_permissions (role_code, permission_code)
select 'OWNER', p.code
from public.agency_permissions p
where p.code in (
  'agency.manage_sale_links',
  'agency.view_sales',
  'agency.review_sales',
  'agency.manage_invoices'
)
on conflict do nothing;

-- MANAGER
insert into public.agency_role_default_permissions (role_code, permission_code)
select 'MANAGER', x
from unnest(array[
  'agency.manage_sale_links',
  'agency.view_sales',
  'agency.review_sales',
  'agency.manage_invoices'
]) as x
on conflict do nothing;
