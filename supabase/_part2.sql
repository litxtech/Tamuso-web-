-- ---------------------------------------------------------------------------
-- Takip edilen satışlar (geçerli / geçersiz)
-- ---------------------------------------------------------------------------
create table if not exists public.agency_tracked_sales (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  sale_link_id uuid references public.agency_sale_links(id) on delete set null,
  offer_id uuid references public.agency_package_offers(id) on delete set null,
  buyer_id uuid references auth.users(id) on delete set null,
  buyer_label text,
  package_title text,
  liste_fiyat_try numeric(12,2),
  amount_try numeric(12,2),
  coins bigint,
  selling_platform text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'cancelled', 'expired', 'manual')),
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'invalid')),
  invalid_reason text,
  receipt_note text,
  receipt_url text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_tracked_sales_agency_idx
  on public.agency_tracked_sales (agency_id, created_at desc);

alter table public.agency_tracked_sales enable row level security;

drop policy if exists agency_tracked_sales_select on public.agency_tracked_sales;
create policy agency_tracked_sales_select
  on public.agency_tracked_sales for select to authenticated
  using (
    public.agency_has_permission(agency_id, 'agency.view_sales')
    or public.agency_has_permission(agency_id, 'agency.review_sales')
    or buyer_id = auth.uid()
  );

grant select on public.agency_tracked_sales to authenticated;
