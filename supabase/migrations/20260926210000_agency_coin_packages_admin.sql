-- Ajans coin paket kataloğu — admin fiyat/coin güncelleyebilir
-- Mevcut ajans_paket_teklif_olustur(uuid,numeric,uuid,uuid) korunur; hesapla tabloya bağlanır.

create table if not exists public.agency_coin_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  title text not null,
  liste_fiyat_try numeric(12,2) not null check (liste_fiyat_try > 0),
  coins bigint not null check (coins > 0),
  indirim_yuzde int not null default 20
    check (indirim_yuzde >= 0 and indirim_yuzde < 100),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_coin_packages_active_sort_idx
  on public.agency_coin_packages (is_active, sort_order, liste_fiyat_try);

alter table public.agency_coin_packages enable row level security;

drop policy if exists agency_coin_packages_select on public.agency_coin_packages;
create policy agency_coin_packages_select
  on public.agency_coin_packages for select to authenticated
  using (true);

grant select on public.agency_coin_packages to authenticated;

insert into public.agency_coin_packages (
  package_key, title, liste_fiyat_try, coins, indirim_yuzde, sort_order, is_active
)
values
  ('ajans_p01', 'Başlangıç', 99,     990,    20, 1,  true),
  ('ajans_p02', 'Standart',  249,    2490,   20, 2,  true),
  ('ajans_p03', 'Standart',  499,    4990,   20, 3,  true),
  ('ajans_p04', 'Popüler',   999,    9990,   20, 4,  true),
  ('ajans_p05', 'Popüler',   2499,   24990,  20, 5,  true),
  ('ajans_p06', 'Prestij',   4999,   49990,  20, 6,  true),
  ('ajans_p07', 'Prestij',   9999,   99990,  20, 7,  true),
  ('ajans_p08', 'VIP',       24999,  249990, 20, 8,  true),
  ('ajans_p09', 'VIP',       49999,  499990, 20, 9,  true),
  ('ajans_p10', 'Elite',     99999,  999990, 20, 10, true),
  ('ajans_p11', 'Max',       199999, 1999990,20, 11, true),
  ('ajans_p12', 'Max',       300000, 3000000,20, 12, true)
on conflict (package_key) do nothing;

-- coin_try oranına göre seed coin’leri hizala (henüz elle değiştirilmemişse)
do $$
declare
  v_oran numeric;
begin
  select coalesce(
    (select coin_try from public.platform_economy_config limit 1),
    0.10
  ) into v_oran;
  if v_oran is null or v_oran <= 0 then v_oran := 0.10; end if;

  update public.agency_coin_packages p
  set coins = greatest(1, round(p.liste_fiyat_try / v_oran)::bigint),
      updated_at = now()
  where p.package_key like 'ajans_p%';
end $$;

-- ---------------------------------------------------------------------------
-- Public liste (cüzdan / teklif sheet)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_paket_katalog_liste()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        id,
        package_key,
        title,
        liste_fiyat_try,
        round(liste_fiyat_try * (1 - indirim_yuzde::numeric / 100), 2) as odenecek_try,
        coins,
        indirim_yuzde,
        sort_order,
        is_active
      from public.agency_coin_packages
      where is_active = true
      order by sort_order asc, liste_fiyat_try asc
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_paket_katalog_liste() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Hesapla: sabit fiyat listesi yerine tablo
-- ---------------------------------------------------------------------------
create or replace function public.ajans_paket_katalog_hesapla(p_liste_fiyat_try numeric)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_p public.agency_coin_packages%rowtype;
  v_liste numeric;
  v_amount numeric;
begin
  v_liste := round(coalesce(p_liste_fiyat_try, 0)::numeric, 2);

  select * into v_p
  from public.agency_coin_packages
  where is_active = true
    and liste_fiyat_try = v_liste
  order by sort_order
  limit 1;

  if v_p.id is null then
    raise exception 'Gecersiz ajans paketi';
  end if;

  v_amount := round(
    v_p.liste_fiyat_try * (1 - v_p.indirim_yuzde::numeric / 100),
    2
  );

  return jsonb_build_object(
    'package_key', v_p.package_key,
    'title', v_p.title,
    'liste_fiyat_try', v_p.liste_fiyat_try,
    'amount_try', v_amount,
    'coins', v_p.coins,
    'indirim_yuzde', v_p.indirim_yuzde
  );
end;
$$;

grant execute on function public.ajans_paket_katalog_hesapla(numeric) to authenticated, service_role;

-- package_id ile hesapla (teklif sheet / yeni istemci)
create or replace function public.ajans_paket_katalog_hesapla_id(p_package_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_p public.agency_coin_packages%rowtype;
  v_amount numeric;
begin
  select * into v_p
  from public.agency_coin_packages
  where id = p_package_id and is_active = true;

  if v_p.id is null then
    raise exception 'Gecersiz ajans paketi';
  end if;

  v_amount := round(
    v_p.liste_fiyat_try * (1 - v_p.indirim_yuzde::numeric / 100),
    2
  );

  return jsonb_build_object(
    'package_key', v_p.package_key,
    'title', v_p.title,
    'liste_fiyat_try', v_p.liste_fiyat_try,
    'amount_try', v_amount,
    'coins', v_p.coins,
    'indirim_yuzde', v_p.indirim_yuzde
  );
end;
$$;

grant execute on function public.ajans_paket_katalog_hesapla_id(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_paket_katalogu()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        id,
        package_key,
        title,
        liste_fiyat_try,
        round(liste_fiyat_try * (1 - indirim_yuzde::numeric / 100), 2) as odenecek_try,
        coins,
        indirim_yuzde,
        sort_order,
        is_active
      from public.agency_coin_packages
      order by sort_order asc, liste_fiyat_try asc
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_ajans_paket_katalogu() to authenticated;

create or replace function public.admin_ajans_paket_guncelle(
  p_id uuid,
  p_title text default null,
  p_liste_fiyat_try numeric default null,
  p_coins bigint default null,
  p_indirim_yuzde int default null,
  p_sort_order int default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.agency_coin_packages%rowtype;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  update public.agency_coin_packages set
    title = coalesce(nullif(trim(p_title), ''), title),
    liste_fiyat_try = coalesce(p_liste_fiyat_try, liste_fiyat_try),
    coins = coalesce(p_coins, coins),
    indirim_yuzde = coalesce(p_indirim_yuzde, indirim_yuzde),
    sort_order = coalesce(p_sort_order, sort_order),
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'Paket bulunamadi';
  end if;

  if v_row.is_active and coalesce(v_row.coins, 0) <= 0 then
    raise exception 'Aktif paket icin coin miktari > 0 olmali';
  end if;
  if v_row.is_active and coalesce(v_row.liste_fiyat_try, 0) <= 0 then
    raise exception 'Aktif paket icin fiyat > 0 olmali';
  end if;

  return jsonb_build_object(
    'ok', true,
    'paket', jsonb_build_object(
      'id', v_row.id,
      'package_key', v_row.package_key,
      'title', v_row.title,
      'liste_fiyat_try', v_row.liste_fiyat_try,
      'odenecek_try', round(v_row.liste_fiyat_try * (1 - v_row.indirim_yuzde::numeric / 100), 2),
      'coins', v_row.coins,
      'indirim_yuzde', v_row.indirim_yuzde,
      'sort_order', v_row.sort_order,
      'is_active', v_row.is_active
    )
  );
end;
$$;

grant execute on function public.admin_ajans_paket_guncelle(
  uuid, text, numeric, bigint, int, int, boolean
) to authenticated;
