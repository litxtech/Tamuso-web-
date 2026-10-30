-- Coin paket tarifesi: büyük paketlerde coin başı fiyat düşmeli.
--
-- Bu migration AKTİF PAKETLERİ DEĞİŞTİRMEZ. App Store Connect ve Google Play'deki ürün
-- fiyatları güncellenmeden uygulamada farklı coin miktarı/fiyat göstermek yanıltıcı olur.
-- Önce mağaza fiyatları güncellenir, sonra admin_coin_paket_tarifesini_uygula(plan) çağrılır.
--
-- İki aday plan hazırlanır (iş kararı gerekir):
--   A_oneri      : Talimattaki başlangıç önerisi (coin değeri bugünkü pack_1'e göre ~%75 düşer).
--   B_deger_koru : Bugünkü pack_1 değerini (400 coin / $2.99) korur, büyük paketlerde artan bonus.

create table if not exists public.coin_package_tariff_plan (
  plan_code text not null,
  sku text not null,
  coins bigint not null check (coins > 0),
  price_usd numeric(10,2) not null check (price_usd > 0),
  price_try numeric(12,2),
  title text not null,
  badge text,
  sort_order int not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (plan_code, sku)
);

alter table public.coin_package_tariff_plan enable row level security;

drop policy if exists coin_package_tariff_plan_admin on public.coin_package_tariff_plan;
create policy coin_package_tariff_plan_admin on public.coin_package_tariff_plan
  for select to authenticated
  using (public.ben_admin_miyim());

insert into public.coin_package_tariff_plan (plan_code, sku, coins, price_usd, title, badge, sort_order, note) values
  ('A_oneri', 'tamuso_coin_pack_1',   100,  2.99, 'Başlangıç Coin Paketi', null,        1, '33,4 coin/$'),
  ('A_oneri', 'tamuso_coin_pack_2',   500,  9.99, 'Popüler Coin Paketi',   'POPÜLER',   2, '50,1 coin/$'),
  ('A_oneri', 'tamuso_coin_pack_3',  1200, 19.99, 'Prestij Coin Paketi',   null,        3, '60,0 coin/$'),
  ('A_oneri', 'tamuso_coin_pack_4',  3200, 49.99, 'Max Coin Paketi',       null,        4, '64,0 coin/$'),
  ('A_oneri', 'tamuso_coin_pack_5',  7000, 99.99, 'Plus Coin Paketi',      'EN AVANTAJLI', 5, '70,0 coin/$'),
  ('B_deger_koru', 'tamuso_coin_pack_1',   400,  2.99, 'Başlangıç Coin Paketi', null,        1, '133,8 coin/$ (bugünkü değer)'),
  ('B_deger_koru', 'tamuso_coin_pack_2',  1400,  9.99, 'Popüler Coin Paketi',   'POPÜLER',   2, '140,1 coin/$'),
  ('B_deger_koru', 'tamuso_coin_pack_3',  2900, 19.99, 'Prestij Coin Paketi',   null,        3, '145,1 coin/$'),
  ('B_deger_koru', 'tamuso_coin_pack_4',  7500, 49.99, 'Max Coin Paketi',       null,        4, '150,0 coin/$'),
  ('B_deger_koru', 'tamuso_coin_pack_5', 15500, 99.99, 'Plus Coin Paketi',      'EN AVANTAJLI', 5, '155,0 coin/$')
on conflict (plan_code, sku) do nothing;

-- Paylaşılabilir gelir parametresi, en düşük coin başı net mağaza gelirini aşamaz.
create or replace function public.coin_basi_en_dusuk_net_usd()
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $$
  select min(p.price_usd * (1 - coalesce(c.iap_store_fee_estimate, 0.30)) / nullif(p.coins + coalesce(p.bonus_coins, 0), 0))
  from public.coin_packages p
  cross join public.platform_economy_config c
  where p.is_active and p.price_usd > 0 and c.id = 1;
$$;

revoke all on function public.coin_basi_en_dusuk_net_usd() from public, anon;
grant execute on function public.coin_basi_en_dusuk_net_usd() to authenticated;

create or replace function public.admin_coin_paket_tarifesini_uygula(
  p_plan_code text,
  p_store_prices_confirmed boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count int;
  v_prev numeric;
  r record;
  v_min_net numeric;
  v_rev numeric;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if not coalesce(p_store_prices_confirmed, false) then
    raise exception 'App Store Connect ve Google Play fiyatları önce güncellenmeli';
  end if;

  select count(*) into v_count from public.coin_package_tariff_plan where plan_code = p_plan_code;
  if v_count = 0 then raise exception 'Plan bulunamadı'; end if;

  v_prev := null;
  for r in
    select * from public.coin_package_tariff_plan where plan_code = p_plan_code order by price_usd
  loop
    if v_prev is not null and (r.coins / r.price_usd) < v_prev then
      raise exception 'Büyük pakette coin başı fiyat daha yüksek olamaz (%).', r.sku;
    end if;
    v_prev := r.coins / r.price_usd;
  end loop;

  update public.coin_packages p
    set coins = t.coins,
        bonus_coins = 0,
        price_usd = t.price_usd,
        price_try = coalesce(t.price_try, p.price_try),
        title = t.title,
        badge = t.badge,
        sort_order = t.sort_order,
        is_active = true,
        updated_at = now()
  from public.coin_package_tariff_plan t
  where t.plan_code = p_plan_code and t.sku = p.sku;

  update public.coin_packages
    set is_active = false, updated_at = now()
  where sku like 'tamuso_coin_pack_%'
    and sku not in (select sku from public.coin_package_tariff_plan where plan_code = p_plan_code);

  v_min_net := public.coin_basi_en_dusuk_net_usd();
  select revenue_usd_per_coin into v_rev from public.platform_economy_config where id = 1;
  if v_min_net is not null and v_rev > v_min_net then
    update public.platform_economy_config
      set revenue_usd_per_coin = floor(v_min_net * 10000) / 10000, updated_at = now(), updated_by = auth.uid()
      where id = 1;
  end if;

  return jsonb_build_object(
    'plan', p_plan_code,
    'packages', v_count,
    'revenue_usd_per_coin', (select revenue_usd_per_coin from public.platform_economy_config where id = 1)
  );
end;
$$;

revoke all on function public.admin_coin_paket_tarifesini_uygula(text, boolean) from public, anon;
grant execute on function public.admin_coin_paket_tarifesini_uygula(text, boolean) to authenticated;
