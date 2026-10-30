-- ---------------------------------------------------------------------------
-- Satış linkleri
-- ---------------------------------------------------------------------------
create table if not exists public.agency_sale_links (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  code text not null,
  title text not null default '',
  description text not null default '',
  selling_platform text not null default 'diger'
    check (selling_platform in (
      'whatsapp', 'instagram', 'telegram', 'web', 'uygulama', 'diger'
    )),
  package_id uuid references public.agency_coin_packages(id) on delete set null,
  liste_fiyat_try numeric(12,2),
  coins bigint,
  created_by uuid not null references auth.users(id),
  is_active boolean not null default true,
  click_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code)
);

create index if not exists agency_sale_links_agency_idx
  on public.agency_sale_links (agency_id, created_at desc);

alter table public.agency_sale_links enable row level security;

drop policy if exists agency_sale_links_select on public.agency_sale_links;
create policy agency_sale_links_select
  on public.agency_sale_links for select to authenticated
  using (
    is_active = true
    or public.agency_has_permission(agency_id, 'agency.view_sales')
    or public.agency_has_permission(agency_id, 'agency.manage_sale_links')
  );

grant select on public.agency_sale_links to authenticated;
