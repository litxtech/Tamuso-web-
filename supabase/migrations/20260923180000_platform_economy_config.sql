-- Platform ekonomi merkezi: küresel oranlar + admin RPC + simülatör

create table if not exists public.platform_economy_config (
  id smallint primary key default 1 check (id = 1),
  coin_try numeric(12,6) not null default 0.10
    check (coin_try > 0 and coin_try <= 1000),
  diamond_try numeric(12,6) not null default 0.10
    check (diamond_try > 0 and diamond_try <= 1000),
  gift_host_share numeric(5,4) not null default 0.8000
    check (gift_host_share >= 0 and gift_host_share <= 1),
  default_agency_share numeric(5,4) not null default 0.2000
    check (default_agency_share >= 0 and default_agency_share <= 0.9),
  iap_store_fee_estimate numeric(5,4) not null default 0.3000
    check (iap_store_fee_estimate >= 0 and iap_store_fee_estimate < 1),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.platform_economy_config (id)
values (1)
on conflict (id) do nothing;

alter table public.platform_economy_config enable row level security;

drop policy if exists platform_economy_config_select on public.platform_economy_config;
create policy platform_economy_config_select
  on public.platform_economy_config for select to authenticated
  using (true);

drop policy if exists platform_economy_config_admin on public.platform_economy_config;
create policy platform_economy_config_admin
  on public.platform_economy_config for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

-- Yeni ajans satırında varsayılan ajans payını config'ten al
create or replace function public.trg_agency_commission_rates_bi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag numeric(5,4);
  v_plat numeric(5,4) := 0.1000;
begin
  select coalesce(default_agency_share, 0.2000)::numeric(5,4)
  into v_ag
  from public.platform_economy_config
  where id = 1;

  v_ag := least(greatest(coalesce(v_ag, 0.2000), 0), 0.9000);
  if v_ag + v_plat > 1 then
    v_ag := (1 - v_plat)::numeric(5,4);
  end if;

  new.agency_share := v_ag;
  new.platform_share := v_plat;
  new.host_share := (1 - v_ag - v_plat)::numeric(5,4);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_agency_commission_rates_bi on public.agency_commission_rates;
create trigger trg_agency_commission_rates_bi
  before insert on public.agency_commission_rates
  for each row
  execute function public.trg_agency_commission_rates_bi();

create or replace function public.ekonomi_config_getir()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.platform_economy_config%rowtype;
begin
  select * into v from public.platform_economy_config where id = 1;
  if not found then
    return jsonb_build_object(
      'coin_try', 0.10,
      'diamond_try', 0.10,
      'gift_host_share', 0.80,
      'default_agency_share', 0.20,
      'iap_store_fee_estimate', 0.30,
      'updated_at', null
    );
  end if;
  return jsonb_build_object(
    'coin_try', v.coin_try,
    'diamond_try', v.diamond_try,
    'gift_host_share', v.gift_host_share,
    'default_agency_share', v.default_agency_share,
    'iap_store_fee_estimate', v.iap_store_fee_estimate,
    'updated_at', v.updated_at
  );
end;
$$;

grant execute on function public.ekonomi_config_getir() to authenticated;
grant execute on function public.ekonomi_config_getir() to anon;

create or replace function public.admin_ekonomi_config_guncelle(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.platform_economy_config%rowtype;
  v_coin numeric;
  v_dia numeric;
  v_host numeric;
  v_ag numeric;
  v_fee numeric;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  select * into v from public.platform_economy_config where id = 1 for update;
  if not found then
    insert into public.platform_economy_config (id) values (1);
    select * into v from public.platform_economy_config where id = 1 for update;
  end if;

  v_coin := coalesce((p->>'coin_try')::numeric, v.coin_try);
  v_dia := coalesce((p->>'diamond_try')::numeric, v.diamond_try);
  v_host := coalesce((p->>'gift_host_share')::numeric, v.gift_host_share);
  v_ag := coalesce((p->>'default_agency_share')::numeric, v.default_agency_share);
  v_fee := coalesce((p->>'iap_store_fee_estimate')::numeric, v.iap_store_fee_estimate);

  if v_coin is null or v_coin <= 0 or v_coin > 1000 then
    raise exception 'coin_try gecersiz';
  end if;
  if v_dia is null or v_dia <= 0 or v_dia > 1000 then
    raise exception 'diamond_try gecersiz';
  end if;
  if v_host is null or v_host < 0 or v_host > 1 then
    raise exception 'gift_host_share 0-1 olmali';
  end if;
  if v_ag is null or v_ag < 0 or v_ag > 0.9 then
    raise exception 'default_agency_share 0-0.9 olmali';
  end if;
  if v_fee is null or v_fee < 0 or v_fee >= 1 then
    raise exception 'iap_store_fee_estimate 0-1 olmali';
  end if;

  update public.platform_economy_config set
    coin_try = round(v_coin, 6),
    diamond_try = round(v_dia, 6),
    gift_host_share = round(v_host, 4),
    default_agency_share = round(v_ag, 4),
    iap_store_fee_estimate = round(v_fee, 4),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1
  returning * into v;

  perform public.admin_audit_yaz(
    null,
    'economy_config',
    'Ekonomi oranlari guncellendi',
    jsonb_build_object(
      'coin_try', v.coin_try,
      'diamond_try', v.diamond_try,
      'gift_host_share', v.gift_host_share,
      'default_agency_share', v.default_agency_share,
      'iap_store_fee_estimate', v.iap_store_fee_estimate
    )
  );

  return public.ekonomi_config_getir();
end;
$$;

grant execute on function public.admin_ekonomi_config_guncelle(jsonb) to authenticated;

create or replace function public.admin_ekonomi_simule_et(p_brut_try numeric)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v public.platform_economy_config%rowtype;
  v_brut numeric;
  v_store numeric;
  v_plat_iap numeric;
  v_coins numeric;
  v_host_elmas numeric;
  v_agency_elmas numeric;
  v_plat_gift_coins numeric;
  v_host_try numeric;
  v_agency_try numeric;
  v_plat_gift_try numeric;
  v_plat_net_after numeric;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  v_brut := coalesce(p_brut_try, 0);
  if v_brut < 0 then
    raise exception 'brut_try negatif olamaz';
  end if;

  select * into v from public.platform_economy_config where id = 1;
  if not found then
    raise exception 'Ekonomi config yok';
  end if;

  v_store := round(v_brut * v.iap_store_fee_estimate, 2);
  v_plat_iap := round(v_brut - v_store, 2);
  v_coins := case
    when v.coin_try > 0 then floor(v_brut / v.coin_try)
    else 0
  end;

  v_host_elmas := floor(v_coins * v.gift_host_share);
  v_agency_elmas := floor(v_host_elmas * v.default_agency_share);
  v_plat_gift_coins := greatest(v_coins - v_host_elmas, 0);

  v_host_try := round((v_host_elmas - v_agency_elmas) * v.diamond_try, 2);
  v_agency_try := round(v_agency_elmas * v.diamond_try, 2);
  v_plat_gift_try := round(v_plat_gift_coins * v.coin_try, 2);
  v_plat_net_after := round(v_plat_iap - v_host_try - v_agency_try, 2);

  return jsonb_build_object(
    'brut_try', v_brut,
    'store_fee_try', v_store,
    'platform_iap_net_try', v_plat_iap,
    'approx_coins', v_coins,
    'if_all_gifted', jsonb_build_object(
      'host_diamonds_gross', v_host_elmas,
      'agency_diamonds', v_agency_elmas,
      'host_diamonds_net', v_host_elmas - v_agency_elmas,
      'platform_gift_coins', v_plat_gift_coins,
      'host_cashout_try', v_host_try,
      'agency_cashout_try', v_agency_try,
      'platform_gift_face_try', v_plat_gift_try,
      'platform_net_after_cashout_try', v_plat_net_after
    ),
    'rates', public.ekonomi_config_getir()
  );
end;
$$;

grant execute on function public.admin_ekonomi_simule_et(numeric) to authenticated;

create or replace function public.admin_hediye_katalog_oran_uygula()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share numeric(5,4);
  v_n int;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  select gift_host_share into v_share
  from public.platform_economy_config
  where id = 1;

  v_share := coalesce(v_share, 0.8000);

  update public.gifts
  set diamond_value = greatest(0, floor(coin_cost * v_share)::bigint)
  where is_active = true;

  get diagnostics v_n = row_count;

  perform public.admin_audit_yaz(
    null,
    'economy_gift_recalc',
    'Hediye katalogu host payina gore yenilendi',
    jsonb_build_object('gift_host_share', v_share, 'updated_rows', v_n)
  );

  return jsonb_build_object('ok', true, 'updated_rows', v_n, 'gift_host_share', v_share);
end;
$$;

grant execute on function public.admin_hediye_katalog_oran_uygula() to authenticated;

create or replace function public.admin_hediye_guncelle(
  p_id uuid,
  p_coin_cost bigint default null,
  p_diamond_value bigint default null,
  p_name text default null,
  p_emoji text default null,
  p_rarity text default null,
  p_is_active boolean default null,
  p_sort_order int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.gifts%rowtype;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  update public.gifts set
    coin_cost = coalesce(p_coin_cost, coin_cost),
    diamond_value = coalesce(p_diamond_value, diamond_value),
    name = coalesce(nullif(trim(p_name), ''), name),
    emoji = coalesce(nullif(trim(p_emoji), ''), emoji),
    rarity = coalesce(nullif(trim(p_rarity), ''), rarity),
    is_active = coalesce(p_is_active, is_active),
    sort_order = coalesce(p_sort_order, sort_order)
  where id = p_id
  returning * into v;

  if not found then
    raise exception 'Hediye bulunamadi';
  end if;

  if v.coin_cost < 0 or v.diamond_value < 0 then
    raise exception 'coin_cost / diamond_value negatif olamaz';
  end if;
  if v.diamond_value > v.coin_cost then
    raise exception 'diamond_value coin_cost uzerinde olamaz';
  end if;

  perform public.admin_audit_yaz(
    null,
    'gift_update',
    'Hediye guncellendi: ' || v.code,
    jsonb_build_object(
      'id', v.id,
      'coin_cost', v.coin_cost,
      'diamond_value', v.diamond_value,
      'is_active', v.is_active
    )
  );

  return jsonb_build_object(
    'ok', true,
    'hediye', jsonb_build_object(
      'id', v.id,
      'code', v.code,
      'name', v.name,
      'emoji', v.emoji,
      'coin_cost', v.coin_cost,
      'diamond_value', v.diamond_value,
      'rarity', v.rarity,
      'is_active', v.is_active,
      'sort_order', v.sort_order
    )
  );
end;
$$;

grant execute on function public.admin_hediye_guncelle(
  uuid, bigint, bigint, text, text, text, boolean, int
) to authenticated;

-- Katalog: config + paket + hediye
create or replace function public.admin_ekonomi_katalogu()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  return jsonb_build_object(
    'config', public.ekonomi_config_getir(),
    'simule_ornek', public.admin_ekonomi_simule_et(4000),
    'paketler', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'sku', sku,
        'title', title,
        'coins', coins,
        'bonus_coins', bonus_coins,
        'price_usd', price_usd,
        'price_try', price_try,
        'is_active', is_active,
        'badge', badge,
        'campaign_text', campaign_text,
        'sort_order', sort_order,
        'apple_product_id', apple_product_id,
        'google_product_id', google_product_id
      ) order by sort_order, price_usd)
      from public.coin_packages
    ), '[]'::jsonb),
    'hediyeler', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'code', code,
        'name', name,
        'emoji', emoji,
        'coin_cost', coin_cost,
        'diamond_value', diamond_value,
        'rarity', rarity,
        'is_active', is_active,
        'sort_order', sort_order,
        'platform_coins', greatest(coin_cost - diamond_value, 0)
      ) order by sort_order, coin_cost)
      from public.gifts
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_ekonomi_katalogu() to authenticated;
