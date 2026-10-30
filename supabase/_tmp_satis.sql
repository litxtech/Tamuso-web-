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

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satis_kod_uret()
returns text
language plpgsql
as $$
declare
  v_kod text;
  v_i int := 0;
begin
  loop
    v_kod := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.agency_sale_links where code = v_kod);
    v_i := v_i + 1;
    if v_i > 20 then
      raise exception 'Kod uretilemedi';
    end if;
  end loop;
  return v_kod;
end;
$$;

create or replace function public.ajans_distributor_kontrol(p_agency_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dist boolean;
begin
  select is_coin_distributor into v_dist
  from public.agencies
  where id = p_agency_id and status = 'active';
  if v_dist is null then raise exception 'Agency not found'; end if;
  if not coalesce(v_dist, false) then
    raise exception 'Agency is not a coin distributor';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Link RPCs
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satis_linki_olustur(
  p_agency_id uuid,
  p_title text,
  p_description text,
  p_selling_platform text,
  p_package_id uuid default null,
  p_liste_fiyat_try numeric default null,
  p_coins bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_sale_links%rowtype;
  v_pkg public.agency_coin_packages%rowtype;
  v_plat text;
  v_title text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.ajans_distributor_kontrol(p_agency_id);
  if not public.agency_has_permission(p_agency_id, 'agency.manage_sale_links') then
    raise exception 'Forbidden';
  end if;

  v_plat := lower(coalesce(nullif(trim(p_selling_platform), ''), 'diger'));
  if v_plat not in ('whatsapp', 'instagram', 'telegram', 'web', 'uygulama', 'diger') then
    v_plat := 'diger';
  end if;

  if p_package_id is not null then
    select * into v_pkg
    from public.agency_coin_packages
    where id = p_package_id
      and (agency_id = p_agency_id or agency_id is null)
      and is_active = true;
    if v_pkg.id is null then raise exception 'Paket bulunamadi'; end if;
  end if;

  v_title := coalesce(nullif(trim(p_title), ''), v_pkg.title, 'Ajans paketi');

  insert into public.agency_sale_links (
    agency_id, code, title, description, selling_platform,
    package_id, liste_fiyat_try, coins, created_by
  ) values (
    p_agency_id,
    public.ajans_satis_kod_uret(),
    left(v_title, 120),
    left(coalesce(p_description, ''), 2000),
    v_plat,
    v_pkg.id,
    coalesce(p_liste_fiyat_try, v_pkg.liste_fiyat_try),
    coalesce(p_coins, v_pkg.coins),
    v_uid
  )
  returning * into v_row;

  return jsonb_build_object('ok', true, 'link', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_linki_olustur(uuid, text, text, text, uuid, numeric, bigint) to authenticated;

create or replace function public.ajans_satis_linkleri_liste(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.agency_has_permission(p_agency_id, 'agency.manage_sale_links')
    or public.agency_has_permission(p_agency_id, 'agency.view_sales')
  ) then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select *
      from public.agency_sale_links
      where agency_id = p_agency_id
      order by created_at desc
      limit 200
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_satis_linkleri_liste(uuid) to authenticated;

create or replace function public.ajans_satis_linki_getir(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.agency_sale_links%rowtype;
  v_agency_name text;
begin
  select * into v_row
  from public.agency_sale_links
  where code = upper(trim(p_code)) and is_active = true;

  if v_row.id is null then
    raise exception 'Link bulunamadi';
  end if;

  update public.agency_sale_links
  set click_count = click_count + 1, updated_at = now()
  where id = v_row.id;

  select name into v_agency_name from public.agencies where id = v_row.agency_id;

  return jsonb_build_object(
    'ok', true,
    'link', jsonb_build_object(
      'id', v_row.id,
      'code', v_row.code,
      'title', v_row.title,
      'description', v_row.description,
      'selling_platform', v_row.selling_platform,
      'package_id', v_row.package_id,
      'liste_fiyat_try', v_row.liste_fiyat_try,
      'coins', v_row.coins,
      'agency_id', v_row.agency_id,
      'agency_name', coalesce(v_agency_name, 'Ajans')
    )
  );
end;
$$;

grant execute on function public.ajans_satis_linki_getir(text) to authenticated, anon;

create or replace function public.ajans_satis_linki_aktiflik(
  p_agency_id uuid,
  p_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.agency_sale_links%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.agency_has_permission(p_agency_id, 'agency.manage_sale_links') then
    raise exception 'Forbidden';
  end if;

  update public.agency_sale_links set
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id and agency_id = p_agency_id
  returning * into v_row;

  if not found then raise exception 'Link bulunamadi'; end if;
  return jsonb_build_object('ok', true, 'link', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_linki_aktiflik(uuid, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Satış listesi / doğrulama
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satislari_liste(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.agency_has_permission(p_agency_id, 'agency.view_sales')
    or public.agency_has_permission(p_agency_id, 'agency.review_sales')
  ) then
    raise exception 'Forbidden';
  end if;

  -- Ödenen Stripe tekliflerini takip tablosuna senkronize et (idempotent)
  insert into public.agency_tracked_sales (
    agency_id, offer_id, buyer_id, package_title,
    liste_fiyat_try, amount_try, coins, payment_status,
    validation_status, created_by
  )
  select
    o.agency_id,
    o.id,
    o.buyer_id,
    o.title,
    o.liste_fiyat_try,
    o.amount_try,
    o.coins,
    'paid',
    'pending',
    o.created_by
  from public.agency_package_offers o
  where o.agency_id = p_agency_id
    and o.status = 'paid'
    and not exists (
      select 1 from public.agency_tracked_sales t where t.offer_id = o.id
    );

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select *
      from public.agency_tracked_sales
      where agency_id = p_agency_id
      order by created_at desc
      limit 300
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_satislari_liste(uuid) to authenticated;

create or replace function public.ajans_satis_dogrula(
  p_agency_id uuid,
  p_sale_id uuid,
  p_validation_status text,
  p_invalid_reason text default null,
  p_receipt_note text default null,
  p_receipt_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_tracked_sales%rowtype;
  v_st text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.agency_has_permission(p_agency_id, 'agency.review_sales') then
    raise exception 'Forbidden';
  end if;

  v_st := lower(trim(coalesce(p_validation_status, '')));
  if v_st not in ('pending', 'valid', 'invalid') then
    raise exception 'Gecersiz dogrulama durumu';
  end if;

  update public.agency_tracked_sales set
    validation_status = v_st,
    invalid_reason = case when v_st = 'invalid' then left(coalesce(p_invalid_reason, ''), 500) else null end,
    receipt_note = coalesce(nullif(trim(p_receipt_note), ''), receipt_note),
    receipt_url = coalesce(nullif(trim(p_receipt_url), ''), receipt_url),
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where id = p_sale_id and agency_id = p_agency_id
  returning * into v_row;

  if not found then raise exception 'Satis bulunamadi'; end if;
  return jsonb_build_object('ok', true, 'sale', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_dogrula(uuid, uuid, text, text, text, text) to authenticated;

create or replace function public.ajans_satis_manuel_ekle(
  p_agency_id uuid,
  p_buyer_label text,
  p_package_title text,
  p_amount_try numeric,
  p_coins bigint,
  p_selling_platform text default 'diger',
  p_sale_link_id uuid default null,
  p_receipt_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_tracked_sales%rowtype;
  v_plat text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.ajans_distributor_kontrol(p_agency_id);
  if not public.agency_has_permission(p_agency_id, 'agency.review_sales') then
    raise exception 'Forbidden';
  end if;

  v_plat := lower(coalesce(nullif(trim(p_selling_platform), ''), 'diger'));

  insert into public.agency_tracked_sales (
    agency_id, sale_link_id, buyer_label, package_title,
    amount_try, coins, selling_platform, payment_status,
    validation_status, receipt_note, created_by
  ) values (
    p_agency_id,
    p_sale_link_id,
    left(coalesce(p_buyer_label, ''), 120),
    left(coalesce(p_package_title, 'Paket'), 120),
    coalesce(p_amount_try, 0),
    coalesce(p_coins, 0),
    v_plat,
    'manual',
    'pending',
    left(coalesce(p_receipt_note, ''), 1000),
    v_uid
  )
  returning * into v_row;

  return jsonb_build_object('ok', true, 'sale', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_manuel_ekle(uuid, text, text, numeric, bigint, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Fatura RPCs
-- ---------------------------------------------------------------------------
create or replace function public.ajans_faturalari_liste(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.agency_has_permission(p_agency_id, 'agency.manage_invoices')
    or public.agency_has_permission(p_agency_id, 'agency.view_sales')
  ) then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select *
      from public.agency_invoices
      where agency_id = p_agency_id
      order by created_at desc
      limit 200
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_faturalari_liste(uuid) to authenticated;

create or replace function public.ajans_fatura_kaydet(
  p_agency_id uuid,
  p_id uuid default null,
  p_tracked_sale_id uuid default null,
  p_buyer_name text default null,
  p_buyer_tax_id text default null,
  p_buyer_address text default null,
  p_line_title text default null,
  p_coins bigint default null,
  p_amount_try numeric default null,
  p_notes text default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_invoices%rowtype;
  v_no text;
  v_st text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.agency_has_permission(p_agency_id, 'agency.manage_invoices') then
    raise exception 'Forbidden';
  end if;

  if p_id is null then
    v_no := 'AF-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    insert into public.agency_invoices (
      agency_id, tracked_sale_id, invoice_no, buyer_name, buyer_tax_id,
      buyer_address, line_title, coins, amount_try, notes, status, created_by,
      issued_at
    ) values (
      p_agency_id,
      p_tracked_sale_id,
      v_no,
      left(coalesce(p_buyer_name, ''), 200),
      left(coalesce(p_buyer_tax_id, ''), 64),
      left(coalesce(p_buyer_address, ''), 500),
      left(coalesce(p_line_title, 'Coin paketi'), 200),
      coalesce(p_coins, 0),
      coalesce(p_amount_try, 0),
      left(coalesce(p_notes, ''), 2000),
      case when lower(coalesce(p_status, 'draft')) = 'issued' then 'issued' else 'draft' end,
      v_uid,
      case when lower(coalesce(p_status, 'draft')) = 'issued' then now() else null end
    )
    returning * into v_row;
  else
    v_st := lower(coalesce(p_status, ''));
    update public.agency_invoices set
      buyer_name = coalesce(nullif(trim(p_buyer_name), ''), buyer_name),
      buyer_tax_id = coalesce(nullif(trim(p_buyer_tax_id), ''), buyer_tax_id),
      buyer_address = coalesce(nullif(trim(p_buyer_address), ''), buyer_address),
      line_title = coalesce(nullif(trim(p_line_title), ''), line_title),
      coins = coalesce(p_coins, coins),
      amount_try = coalesce(p_amount_try, amount_try),
      notes = coalesce(nullif(trim(p_notes), ''), notes),
      status = case
        when v_st in ('draft', 'issued', 'cancelled') then v_st
        else status
      end,
      issued_at = case
        when v_st = 'issued' and issued_at is null then now()
        else issued_at
      end,
      updated_at = now()
    where id = p_id and agency_id = p_agency_id
    returning * into v_row;
    if not found then raise exception 'Fatura bulunamadi'; end if;
  end if;

  return jsonb_build_object('ok', true, 'invoice', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_fatura_kaydet(
  uuid, uuid, uuid, text, text, text, text, bigint, numeric, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- Linkten satış kaydı (alıcı talep)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satis_linkten_kayit(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_link public.agency_sale_links%rowtype;
  v_row public.agency_tracked_sales%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_link
  from public.agency_sale_links
  where code = upper(trim(p_code)) and is_active = true;
  if v_link.id is null then raise exception 'Link bulunamadi'; end if;

  insert into public.agency_tracked_sales (
    agency_id, sale_link_id, buyer_id, package_title,
    liste_fiyat_try, amount_try, coins, selling_platform,
    payment_status, validation_status, created_by
  ) values (
    v_link.agency_id,
    v_link.id,
    v_uid,
    v_link.title,
    v_link.liste_fiyat_try,
    round(coalesce(v_link.liste_fiyat_try, 0) * 0.8, 2),
    v_link.coins,
    v_link.selling_platform,
    'pending',
    'pending',
    v_uid
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'sale', row_to_json(v_row),
    'agency_id', v_link.agency_id,
    'liste_fiyat_try', v_link.liste_fiyat_try
  );
end;
$$;

grant execute on function public.ajans_satis_linkten_kayit(text) to authenticated;
