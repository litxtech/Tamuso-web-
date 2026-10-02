-- Ajans cüzdan defteri + satış ciro özeti + 10k→1000 hediye + kısa dekont

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.agency_wallets
  add column if not exists coins bigint not null default 0;

alter table public.agency_wallets
  add column if not exists lifetime_coins_sold bigint not null default 0;

alter table public.agency_wallets
  add column if not exists sale_gift_milestones integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'agency_wallets_coins_nonneg'
  ) then
    alter table public.agency_wallets
      add constraint agency_wallets_coins_nonneg check (coins >= 0);
  end if;
end $$;

create table if not exists public.agency_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  currency text not null check (currency in ('coins', 'diamonds', 'distribution')),
  delta bigint not null,
  balance_after bigint not null,
  reason text not null,
  ref_type text,
  ref_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agency_wallet_ledger_agency_idx
  on public.agency_wallet_ledger (agency_id, created_at desc);

create unique index if not exists agency_wallet_ledger_idem_uidx
  on public.agency_wallet_ledger (agency_id, reason, ref_id)
  where ref_id is not null;

alter table public.agency_wallet_ledger enable row level security;

drop policy if exists agency_wallet_ledger_select on public.agency_wallet_ledger;
create policy agency_wallet_ledger_select
  on public.agency_wallet_ledger for select to authenticated
  using (
    public.agency_has_permission(agency_id, 'agency.view_sales')
    or exists (
      select 1 from public.agencies a
      where a.id = agency_id and a.owner_id = auth.uid()
    )
  );

grant select on public.agency_wallet_ledger to authenticated;

-- Tüm ajanslar için cüzdan satırı
insert into public.agency_wallets (agency_id, diamonds, distribution_balance, coins)
select a.id, 0, 0, 0
from public.agencies a
on conflict (agency_id) do nothing;

-- ---------------------------------------------------------------------------
-- Cüzdan helpers
-- ---------------------------------------------------------------------------
create or replace function public.ajans_cuzdan_emniyet(p_agency_id uuid)
returns public.agency_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w public.agency_wallets%rowtype;
begin
  insert into public.agency_wallets (agency_id, diamonds, distribution_balance, coins)
  values (p_agency_id, 0, 0, 0)
  on conflict (agency_id) do nothing;

  select * into v_w from public.agency_wallets where agency_id = p_agency_id for update;
  return v_w;
end;
$$;

revoke all on function public.ajans_cuzdan_emniyet(uuid) from public;
grant execute on function public.ajans_cuzdan_emniyet(uuid) to service_role;

create or replace function public.ajans_cuzdan_hareket_yaz(
  p_agency_id uuid,
  p_currency text,
  p_delta bigint,
  p_reason text,
  p_ref_type text default null,
  p_ref_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns public.agency_wallet_ledger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w public.agency_wallets%rowtype;
  v_after bigint;
  v_row public.agency_wallet_ledger%rowtype;
begin
  if p_currency not in ('coins', 'diamonds', 'distribution') then
    raise exception 'Invalid currency';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reason required';
  end if;

  -- Idempotent: aynı ref + reason
  if p_ref_id is not null then
    select * into v_row
    from public.agency_wallet_ledger
    where agency_id = p_agency_id and reason = p_reason and ref_id = p_ref_id
    limit 1;
    if found then return v_row; end if;
  end if;

  v_w := public.ajans_cuzdan_emniyet(p_agency_id);

  if p_currency = 'coins' then
    if v_w.coins + p_delta < 0 then raise exception 'Insufficient agency coins'; end if;
    update public.agency_wallets
      set coins = coins + p_delta, updated_at = now()
      where agency_id = p_agency_id
      returning coins into v_after;
  elsif p_currency = 'diamonds' then
    if v_w.diamonds + p_delta < 0 then raise exception 'Insufficient agency diamonds'; end if;
    update public.agency_wallets
      set diamonds = diamonds + p_delta, updated_at = now()
      where agency_id = p_agency_id
      returning diamonds into v_after;
  else
    if v_w.distribution_balance + p_delta < 0 then
      raise exception 'Insufficient distribution balance';
    end if;
    update public.agency_wallets
      set distribution_balance = distribution_balance + p_delta, updated_at = now()
      where agency_id = p_agency_id
      returning distribution_balance into v_after;
  end if;

  insert into public.agency_wallet_ledger (
    agency_id, currency, delta, balance_after, reason, ref_type, ref_id, meta
  ) values (
    p_agency_id, p_currency, p_delta, v_after, p_reason, p_ref_type, p_ref_id,
    coalesce(p_meta, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.ajans_cuzdan_hareket_yaz(uuid, text, bigint, text, text, uuid, jsonb) from public;
grant execute on function public.ajans_cuzdan_hareket_yaz(uuid, text, bigint, text, text, uuid, jsonb) to service_role;

-- Satış sonrası: kayıt + her 10.000 coin satışta 1.000 coin hediye
create or replace function public.ajans_satis_ciro_hediye_isle(p_sale_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.agency_tracked_sales%rowtype;
  v_w public.agency_wallets%rowtype;
  v_old bigint;
  v_new bigint;
  v_old_m int;
  v_new_m int;
  v_gift bigint;
  v_buyer text;
begin
  select * into v_sale from public.agency_tracked_sales where id = p_sale_id;
  if not found then raise exception 'Sale not found'; end if;
  if v_sale.payment_status not in ('paid', 'manual') then
    return jsonb_build_object('ok', false, 'reason', 'not_paid');
  end if;

  -- Aynı satış tekrar işlenmesin
  if exists (
    select 1 from public.agency_wallet_ledger
    where reason = 'package_sale' and ref_id = p_sale_id
  ) then
    return jsonb_build_object('ok', true, 'idempotent', true, 'sale_id', p_sale_id);
  end if;

  v_w := public.ajans_cuzdan_emniyet(v_sale.agency_id);
  v_buyer := coalesce(
    nullif(trim(v_sale.buyer_display_name), ''),
    nullif(trim(v_sale.buyer_label), ''),
    nullif(trim(v_sale.buyer_email), ''),
    'Alici'
  );

  -- Satış kaydı (bakiye değişmez; deftere işlenir)
  perform public.ajans_cuzdan_hareket_yaz(
    v_sale.agency_id,
    'coins',
    0,
    'package_sale',
    'agency_tracked_sale',
    v_sale.id,
    jsonb_build_object(
      'amount_try', v_sale.amount_try,
      'coins_sold', v_sale.coins,
      'buyer_id', v_sale.buyer_id,
      'buyer_name', v_buyer,
      'package_title', v_sale.package_title,
      'payment_status', v_sale.payment_status
    )
  );

  v_old := coalesce(v_w.lifetime_coins_sold, 0);
  v_new := v_old + coalesce(v_sale.coins, 0);
  v_old_m := coalesce(v_w.sale_gift_milestones, 0);
  v_new_m := (v_new / 10000)::int;
  if v_new_m < v_old_m then v_new_m := v_old_m; end if;
  v_gift := (v_new_m - v_old_m) * 1000;

  update public.agency_wallets set
    lifetime_coins_sold = v_new,
    sale_gift_milestones = v_new_m,
    updated_at = now()
  where agency_id = v_sale.agency_id;

  if v_gift > 0 then
    perform public.ajans_cuzdan_hareket_yaz(
      v_sale.agency_id,
      'coins',
      v_gift,
      'sale_volume_gift',
      'agency_tracked_sale',
      v_sale.id,
      jsonb_build_object(
        'per_milestone', 1000,
        'coins_per_threshold', 10000,
        'milestones', v_new_m - v_old_m,
        'lifetime_coins_sold', v_new
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'lifetime_coins_sold', v_new,
    'gift_coins', v_gift,
    'milestones', v_new_m
  );
end;
$$;

revoke all on function public.ajans_satis_ciro_hediye_isle(uuid) from public;
grant execute on function public.ajans_satis_ciro_hediye_isle(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Satış özeti (ciro + top alıcılar)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satis_ozeti(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_toplam_try numeric;
  v_toplam_coin bigint;
  v_adet int;
  v_top jsonb;
  v_w public.agency_wallets%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.agency_has_permission(p_agency_id, 'agency.view_sales')
    or public.agency_has_permission(p_agency_id, 'agency.review_sales')
    or exists (select 1 from public.agencies a where a.id = p_agency_id and a.owner_id = auth.uid())
  ) then
    raise exception 'Forbidden';
  end if;

  select
    coalesce(sum(amount_try), 0),
    coalesce(sum(coins), 0)::bigint,
    count(*)::int
  into v_toplam_try, v_toplam_coin, v_adet
  from public.agency_tracked_sales
  where agency_id = p_agency_id
    and payment_status in ('paid', 'manual')
    and validation_status is distinct from 'invalid';

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_top
  from (
    select
      buyer_id,
      coalesce(
        nullif(max(buyer_display_name), ''),
        nullif(max(buyer_label), ''),
        nullif(max(buyer_email), ''),
        'Alıcı'
      ) as buyer_name,
      coalesce(sum(amount_try), 0) as toplam_try,
      coalesce(sum(coins), 0)::bigint as toplam_coin,
      count(*)::int as islem_adet
    from public.agency_tracked_sales
    where agency_id = p_agency_id
      and payment_status in ('paid', 'manual')
      and validation_status is distinct from 'invalid'
    group by buyer_id,
      coalesce(
        buyer_id::text,
        lower(coalesce(buyer_email, '')),
        lower(coalesce(buyer_label, buyer_display_name, 'guest'))
      )
    order by sum(coins) desc nulls last, sum(amount_try) desc nulls last
    limit 20
  ) t;

  select * into v_w from public.agency_wallets where agency_id = p_agency_id;

  return jsonb_build_object(
    'ok', true,
    'toplam_try', v_toplam_try,
    'toplam_coin', v_toplam_coin,
    'islem_adet', v_adet,
    'top_alicilar', v_top,
    'cuzdan', jsonb_build_object(
      'coins', coalesce(v_w.coins, 0),
      'diamonds', coalesce(v_w.diamonds, 0),
      'distribution_balance', coalesce(v_w.distribution_balance, 0),
      'lifetime_coins_sold', coalesce(v_w.lifetime_coins_sold, 0),
      'sale_gift_milestones', coalesce(v_w.sale_gift_milestones, 0),
      'sonraki_hediye_icin', greatest(0, 10000 - (coalesce(v_w.lifetime_coins_sold, 0) % 10000))
    )
  );
end;
$$;

grant execute on function public.ajans_satis_ozeti(uuid) to authenticated;

create or replace function public.ajans_cuzdan_hareketleri(
  p_agency_id uuid,
  p_limit int default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w public.agency_wallets%rowtype;
  v_rows jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.agency_has_permission(p_agency_id, 'agency.view_sales')
    or exists (select 1 from public.agencies a where a.id = p_agency_id and a.owner_id = auth.uid())
  ) then
    raise exception 'Forbidden';
  end if;

  v_w := public.ajans_cuzdan_emniyet(p_agency_id);

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select id, currency, delta, balance_after, reason, ref_type, ref_id, meta, created_at
    from public.agency_wallet_ledger
    where agency_id = p_agency_id
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 300))
  ) x;

  return jsonb_build_object(
    'ok', true,
    'wallet', jsonb_build_object(
      'coins', v_w.coins,
      'diamonds', v_w.diamonds,
      'distribution_balance', v_w.distribution_balance,
      'lifetime_coins_sold', v_w.lifetime_coins_sold,
      'sale_gift_milestones', v_w.sale_gift_milestones,
      'sonraki_hediye_icin', greatest(0, 10000 - (v_w.lifetime_coins_sold % 10000)),
      'updated_at', v_w.updated_at
    ),
    'hareketler', v_rows
  );
end;
$$;

grant execute on function public.ajans_cuzdan_hareketleri(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Stripe onay: kısa dekont + cüzdan/hediye
-- (önceki gövde + patch)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satis_stripe_onayla(
  p_sale_link_code text,
  p_idempotency_key text,
  p_provider_tx_id text,
  p_stripe_session_id text default null,
  p_amount_try numeric default null,
  p_buyer_user_id uuid default null,
  p_buyer_email text default null,
  p_buyer_name text default null,
  p_receipt jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.agency_sale_links%rowtype;
  v_sale public.agency_tracked_sales%rowtype;
  v_existing uuid;
  v_buyer uuid;
  v_email text;
  v_name text;
  v_amount numeric;
  v_coins bigint;
  v_title text;
  v_owner uuid;
  v_agency_name text;
  v_note text;
  v_payload jsonb;
  v_staff uuid;
  v_hediye jsonb;
begin
  if p_sale_link_code is null or length(trim(p_sale_link_code)) = 0 then
    raise exception 'sale_link_code required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  if p_stripe_session_id is not null then
    select * into v_sale from public.agency_tracked_sales
    where stripe_session_id = p_stripe_session_id limit 1;
    if found then
      perform public.ajans_satis_ciro_hediye_isle(v_sale.id);
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'sale_id', v_sale.id,
        'agency_id', v_sale.agency_id,
        'buyer_id', v_sale.buyer_id,
        'coins', v_sale.coins,
        'amount_try', v_sale.amount_try,
        'package_title', v_sale.package_title,
        'buyer_name', v_sale.buyer_display_name,
        'buyer_email', v_sale.buyer_email,
        'sale_link_code', p_sale_link_code,
        'receipt_url', v_sale.receipt_url,
        'pdf_path', v_sale.receipt_payload->>'pdf_path'
      );
    end if;
  end if;
  if p_provider_tx_id is not null then
    select * into v_sale from public.agency_tracked_sales
    where stripe_payment_intent_id = p_provider_tx_id limit 1;
    if found then
      perform public.ajans_satis_ciro_hediye_isle(v_sale.id);
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'sale_id', v_sale.id,
        'agency_id', v_sale.agency_id,
        'buyer_id', v_sale.buyer_id,
        'coins', v_sale.coins,
        'amount_try', v_sale.amount_try,
        'package_title', v_sale.package_title,
        'buyer_name', v_sale.buyer_display_name,
        'buyer_email', v_sale.buyer_email,
        'sale_link_code', p_sale_link_code,
        'receipt_url', v_sale.receipt_url,
        'pdf_path', v_sale.receipt_payload->>'pdf_path'
      );
    end if;
  end if;

  select * into v_link
  from public.agency_sale_links
  where upper(code) = upper(trim(p_sale_link_code))
  limit 1;
  if not found then raise exception 'Sale link not found'; end if;
  if not v_link.is_active then raise exception 'Sale link inactive'; end if;

  v_amount := coalesce(p_amount_try, v_link.liste_fiyat_try, 0);
  v_coins := coalesce(v_link.coins, 0);
  v_title := coalesce(nullif(trim(v_link.title), ''), 'Ajans paket satışı');

  v_buyer := p_buyer_user_id;
  v_email := nullif(lower(trim(coalesce(p_buyer_email, ''))), '');
  v_name := nullif(trim(coalesce(p_buyer_name, '')), '');

  if v_buyer is null and v_email is not null then
    select u.id into v_buyer from auth.users u where lower(u.email) = v_email limit 1;
  end if;
  if v_name is null and v_buyer is not null then
    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''))
      into v_name from public.profiles where id = v_buyer;
  end if;
  if v_email is null and v_buyer is not null then
    select lower(email) into v_email from auth.users where id = v_buyer;
  end if;

  v_payload := coalesce(p_receipt, '{}'::jsonb) || jsonb_build_object(
    'sale_link_id', v_link.id,
    'sale_link_code', v_link.code,
    'agency_id', v_link.agency_id,
    'package_id', v_link.package_id,
    'buyer_id', v_buyer,
    'buyer_email', v_email,
    'buyer_name', v_name,
    'amount_try', v_amount,
    'coins', v_coins,
    'provider', 'stripe',
    'stripe_session_id', p_stripe_session_id,
    'stripe_payment_intent_id', p_provider_tx_id
  );

  -- Kısa dekont notu
  v_note := format(
    '%s · %s ₺ · %s coin',
    coalesce(v_name, v_email, 'Alıcı'),
    to_char(v_amount, 'FM999,999,990.00'),
    to_char(v_coins, 'FM999,999,999')
  );

  insert into public.agency_tracked_sales (
    agency_id, sale_link_id, buyer_id, buyer_label, buyer_email, buyer_display_name,
    package_title, liste_fiyat_try, amount_try, coins, selling_platform,
    payment_status, validation_status, receipt_note, receipt_payload,
    stripe_session_id, stripe_payment_intent_id
  ) values (
    v_link.agency_id,
    v_link.id,
    v_buyer,
    left(coalesce(v_name, v_email, 'Alıcı'), 120),
    left(coalesce(v_email, ''), 200),
    left(coalesce(v_name, ''), 200),
    left(v_title, 120),
    v_link.liste_fiyat_try,
    v_amount,
    v_coins,
    v_link.selling_platform,
    'paid',
    'valid',
    left(v_note, 400),
    v_payload,
    p_stripe_session_id,
    p_provider_tx_id
  )
  returning * into v_sale;

  if v_buyer is not null and v_coins > 0 then
    if public.kill_switch_aktif_mi('kill_coin_purchase') then
      raise exception 'Coin purchase temporarily disabled';
    end if;

    select result_ref into v_existing
    from public.finance_idempotency_keys
    where idempotency_key = p_idempotency_key and user_id = v_buyer;

    if v_existing is null then
      insert into public.wallets (user_id, coins, diamonds)
      values (v_buyer, 0, 0)
      on conflict (user_id) do nothing;

      update public.wallets set coins = coins + v_coins, updated_at = now()
      where user_id = v_buyer;

      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (
        v_buyer, 'coins', v_coins,
        (select coins from public.wallets where user_id = v_buyer),
        'agency_sale_link_purchase', 'agency_tracked_sale', v_sale.id
      );

      insert into public.coin_purchases (
        user_id, package_id, coins_added, amount_usd, amount_try,
        provider, provider_tx_id, status, idempotency_key, store,
        receipt_payload, verified_at
      ) values (
        v_buyer, null, v_coins, null, v_amount,
        'stripe', p_provider_tx_id, 'completed', p_idempotency_key, 'manual',
        v_payload, now()
      );

      insert into public.finance_idempotency_keys (
        idempotency_key, user_id, operation, result_ref, result_payload
      ) values (
        p_idempotency_key, v_buyer, 'agency_sale_link_purchase', v_sale.id,
        jsonb_build_object('sale_id', v_sale.id, 'coins', v_coins)
      )
      on conflict (idempotency_key) do nothing;
    end if;
  end if;

  -- Ajans cüzdan + hediye
  v_hediye := public.ajans_satis_ciro_hediye_isle(v_sale.id);

  select owner_id, name into v_owner, v_agency_name
  from public.agencies where id = v_link.agency_id;

  if v_owner is not null then
    perform public.bildirim_kuyruga_ekle(
      v_owner,
      'agency',
      'Yeni Stripe satış',
      left(format('%s · %s ₺ · %s coin · %s', v_title, to_char(v_amount, 'FM999,999,990.00'), to_char(v_coins, 'FM999,999,999'), coalesce(v_name, v_email, 'Alıcı')), 400),
      '/ajans/' || v_link.agency_id::text || '/dekontlar',
      jsonb_build_object(
        'type', 'agency_sale_paid',
        'agency_id', v_link.agency_id,
        'sale_id', v_sale.id,
        'gift_coins', v_hediye->>'gift_coins'
      )
    );
  end if;

  for v_staff in
    select distinct s.user_id
    from public.agency_staff_roles s
    where s.agency_id = v_link.agency_id
      and s.user_id is distinct from v_owner
      and (
        s.role_code in ('OWNER', 'MANAGER')
        or exists (
          select 1 from public.agency_role_default_permissions d
          where d.role_code = s.role_code and d.permission_code = 'agency.view_sales'
        )
        or exists (
          select 1 from public.agency_staff_permission_overrides o
          where o.agency_id = v_link.agency_id
            and o.user_id = s.user_id
            and o.permission_code = 'agency.view_sales'
            and o.granted = true
        )
      )
  loop
    perform public.bildirim_kuyruga_ekle(
      v_staff,
      'agency',
      'Yeni Stripe satış',
      left(format('%s · %s ₺ · %s', coalesce(v_agency_name, 'Ajans'), to_char(v_amount, 'FM999,999,990.00'), coalesce(v_name, v_email, 'Alıcı')), 400),
      '/ajans/' || v_link.agency_id::text || '/dekontlar',
      jsonb_build_object('type', 'agency_sale_paid', 'agency_id', v_link.agency_id, 'sale_id', v_sale.id)
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'sale_id', v_sale.id,
    'agency_id', v_link.agency_id,
    'buyer_id', v_buyer,
    'coins', v_coins,
    'amount_try', v_amount,
    'package_title', v_title,
    'buyer_name', v_name,
    'buyer_email', v_email,
    'sale_link_code', v_link.code,
    'agency_name', v_agency_name,
    'stripe_pi', p_provider_tx_id,
    'receipt_url', v_sale.receipt_url,
    'pdf_path', v_sale.receipt_payload->>'pdf_path',
    'gift_coins', v_hediye->>'gift_coins'
  );
end;
$$;

revoke all on function public.ajans_satis_stripe_onayla(text, text, text, text, numeric, uuid, text, text, jsonb) from public;
grant execute on function public.ajans_satis_stripe_onayla(text, text, text, text, numeric, uuid, text, text, jsonb) to service_role;

-- Transfer: distribution deftere yaz
create or replace function public.ajans_coin_transfer(
  p_agency_id uuid,
  p_to_user_id uuid,
  p_coins bigint,
  p_idempotency_key text
)
returns public.agency_coin_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_agency public.agencies%rowtype;
  v_limits public.agency_transfer_limits%rowtype;
  v_wallet public.agency_wallets%rowtype;
  v_tx public.agency_coin_transfers%rowtype;
  v_daily bigint;
  v_monthly bigint;
  v_unlimited boolean := false;
  v_agency_name text;
  v_reason text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if public.kill_switch_aktif_mi('kill_agency_coin_transfer') then
    raise exception 'Agency transfers temporarily disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('agency_enabled') then
    raise exception 'Agency feature disabled';
  end if;
  if p_coins is null or p_coins <= 0 then raise exception 'Invalid coins'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  select * into v_tx from public.agency_coin_transfers where idempotency_key = p_idempotency_key;
  if found then return v_tx; end if;

  select * into v_agency from public.agencies where id = p_agency_id for update;
  if not found then raise exception 'Agency not found'; end if;
  if v_agency.owner_id <> v_uid and not public.ben_admin_miyim() then
    raise exception 'Not agency owner';
  end if;
  if not v_agency.is_coin_distributor then raise exception 'Not authorized distributor'; end if;
  if v_agency.trust_tier in ('Restricted','Suspended') or v_agency.status <> 'active' then
    raise exception 'Agency not allowed to transfer';
  end if;

  v_agency_name := coalesce(nullif(trim(v_agency.name), ''), 'Ajans');
  v_reason := 'agency_distribution:' || left(v_agency_name, 80);

  select * into v_limits from public.agency_transfer_limits where agency_id = p_agency_id;
  if not found then raise exception 'Limits missing'; end if;
  v_unlimited := coalesce(v_limits.unlimited, false);

  if not v_unlimited then
    if p_coins > v_limits.single_transfer_limit then raise exception 'Tek sefer limit asildi'; end if;
    if p_coins > v_limits.per_user_limit then raise exception 'Kullanici limit asildi'; end if;

    select coalesce(sum(coins),0) into v_daily from public.agency_coin_transfers
    where agency_id = p_agency_id and status = 'completed'
      and created_at >= date_trunc('day', now());
    if v_daily + p_coins > v_limits.daily_limit then raise exception 'Gunluk limit asildi'; end if;

    select coalesce(sum(coins),0) into v_monthly from public.agency_coin_transfers
    where agency_id = p_agency_id and status = 'completed'
      and created_at >= date_trunc('month', now());
    if v_monthly + p_coins > v_limits.monthly_limit then raise exception 'Aylik limit asildi'; end if;
  end if;

  insert into public.agency_coin_transfers (
    agency_id, from_user_id, to_user_id, coins, idempotency_key, status
  ) values (
    p_agency_id, v_uid, p_to_user_id, p_coins, p_idempotency_key, 'completed'
  ) returning * into v_tx;

  perform public.ajans_cuzdan_hareket_yaz(
    p_agency_id,
    'distribution',
    -p_coins,
    'distribution_out',
    'agency_transfer',
    v_tx.id,
    jsonb_build_object('to_user_id', p_to_user_id, 'coins', p_coins)
  );

  insert into public.wallets (user_id, coins)
  values (p_to_user_id, 0)
  on conflict (user_id) do nothing;

  update public.wallets set coins = coins + p_coins, updated_at = now()
  where user_id = p_to_user_id;

  insert into public.wallet_ledger (
    user_id, currency, delta, balance_after, reason, ref_type, ref_id, meta
  ) values (
    p_to_user_id,
    'coins',
    p_coins,
    (select coins from public.wallets where user_id = p_to_user_id),
    v_reason,
    'agency_transfer',
    v_tx.id,
    jsonb_build_object(
      'agency_id', p_agency_id,
      'agency_name', v_agency_name,
      'from_user_id', v_uid,
      'coins', p_coins,
      'type', 'agency_topup'
    )
  );

  perform public.bildirim_kuyruga_ekle(
    p_to_user_id,
    'wallet',
    'Ajans coin yüklemesi',
    v_agency_name || ' sana ' || p_coins::text || ' coin yükledi',
    '/(tabs)/wallet',
    jsonb_build_object(
      'agency_id', p_agency_id,
      'coins', p_coins,
      'transfer_id', v_tx.id
    )
  );

  return v_tx;
end;
$$;

-- Backfill: mevcut satışlardan lifetime + hediye (bir kez)
do $$
declare
  r record;
  v_sold bigint;
  v_m int;
  v_gift bigint;
  v_w public.agency_wallets%rowtype;
begin
  for r in select id from public.agencies loop
    select coalesce(sum(coins), 0)::bigint into v_sold
    from public.agency_tracked_sales
    where agency_id = r.id
      and payment_status in ('paid', 'manual')
      and validation_status is distinct from 'invalid';

    v_w := public.ajans_cuzdan_emniyet(r.id);
    if v_w.lifetime_coins_sold > 0 then
      continue; -- daha önce işlenmiş
    end if;

    v_m := (v_sold / 10000)::int;
    v_gift := v_m * 1000;

    update public.agency_wallets set
      lifetime_coins_sold = v_sold,
      sale_gift_milestones = v_m,
      updated_at = now()
    where agency_id = r.id;

    if v_gift > 0 then
      perform public.ajans_cuzdan_hareket_yaz(
        r.id,
        'coins',
        v_gift,
        'sale_volume_gift_backfill',
        'agency_backfill',
        r.id,
        jsonb_build_object('lifetime_coins_sold', v_sold, 'milestones', v_m)
      );
    end if;

    -- Her satış için defter satırı (delta 0)
    insert into public.agency_wallet_ledger (
      agency_id, currency, delta, balance_after, reason, ref_type, ref_id, meta
    )
    select
      s.agency_id,
      'coins',
      0,
      (select coins from public.agency_wallets w where w.agency_id = s.agency_id),
      'package_sale',
      'agency_tracked_sale',
      s.id,
      jsonb_build_object(
        'amount_try', s.amount_try,
        'coins_sold', s.coins,
        'buyer_name', coalesce(s.buyer_display_name, s.buyer_label, s.buyer_email, 'Alici'),
        'backfill', true
      )
    from public.agency_tracked_sales s
    where s.agency_id = r.id
      and s.payment_status in ('paid', 'manual')
      and s.validation_status is distinct from 'invalid'
    and not exists (
      select 1 from public.agency_wallet_ledger l
      where l.agency_id = s.agency_id
        and l.reason = 'package_sale'
        and l.ref_id = s.id
    );
  end loop;
end $$;
