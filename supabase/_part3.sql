-- ---------------------------------------------------------------------------
-- Faturalar
-- ---------------------------------------------------------------------------
create table if not exists public.agency_invoices (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  tracked_sale_id uuid references public.agency_tracked_sales(id) on delete set null,
  invoice_no text not null,
  buyer_name text not null default '',
  buyer_tax_id text not null default '',
  buyer_address text not null default '',
  line_title text not null default '',
  coins bigint,
  amount_try numeric(12,2) not null default 0,
  notes text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'cancelled')),
  issued_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, invoice_no)
);

create index if not exists agency_invoices_agency_idx
  on public.agency_invoices (agency_id, created_at desc);

alter table public.agency_invoices enable row level security;

drop policy if exists agency_invoices_select on public.agency_invoices;
create policy agency_invoices_select
  on public.agency_invoices for select to authenticated
  using (
    public.agency_has_permission(agency_id, 'agency.manage_invoices')
    or public.agency_has_permission(agency_id, 'agency.view_sales')
  );

grant select on public.agency_invoices to authenticated;
