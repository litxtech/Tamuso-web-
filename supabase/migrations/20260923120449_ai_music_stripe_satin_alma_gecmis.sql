-- AI müzik paket açıklama/fiyat + Stripe + birleşik satın alma geçmişi

-- ---------------------------------------------------------------------------
-- Products: açıklama + katalog fiyat + Stripe price
-- ---------------------------------------------------------------------------
alter table public.ai_music_products
  add column if not exists description text,
  add column if not exists price_try numeric(10,2),
  add column if not exists price_usd numeric(10,2),
  add column if not exists stripe_price_id text;

update public.ai_music_products set
  description = '15 dakika üretim hakkı. Yaklaşık 7 şarkı (2 dk) veya 1 uzun parça oluşturabilirsin.',
  price_try = 49.99,
  price_usd = 1.99,
  display_name = 'Mini · 15 dk',
  badge = 'Başlangıç',
  updated_at = now()
where product_id = 'tamuso_ai_music_pack_9';

update public.ai_music_products set
  description = '40 dakika üretim hakkı. Yaklaşık 20 şarkı (2 dk) — sık üretenler için.',
  price_try = 99.99,
  price_usd = 4.99,
  display_name = 'Plus · 40 dk',
  badge = 'Popüler',
  updated_at = now()
where product_id = 'tamuso_ai_music_pack_10';

update public.ai_music_products set
  description = '100 dakika üretim hakkı. Yaklaşık 50 şarkı — yoğun stüdyo kullanımı.',
  price_try = 199.99,
  price_usd = 9.99,
  display_name = 'Pro · 100 dk',
  badge = null,
  updated_at = now()
where product_id = 'tamuso_ai_music_pack_11';

update public.ai_music_products set
  description = '250 dakika üretim hakkı. Yaklaşık 125 şarkı — en iyi birim fiyat.',
  price_try = 399.99,
  price_usd = 19.99,
  display_name = 'Studio · 250 dk',
  badge = 'En iyi değer',
  updated_at = now()
where product_id = 'tamuso_ai_music_pack_12';

create or replace function public.ai_music_products_list()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'product_id', product_id,
      'display_name', display_name,
      'description', description,
      'seconds_granted', seconds_granted,
      'bonus_seconds', bonus_seconds,
      'price_try', price_try,
      'price_usd', price_usd,
      'stripe_price_id', stripe_price_id,
      'apple_product_id', apple_product_id,
      'google_product_id', google_product_id,
      'badge', badge,
      'sort_order', sort_order
    ) order by sort_order
  ), '[]'::jsonb)
  from public.ai_music_products
  where is_active;
$$;

-- ---------------------------------------------------------------------------
-- Purchases: Stripe store + tutar alanları
-- ---------------------------------------------------------------------------
alter table public.ai_music_purchases
  drop constraint if exists ai_music_purchases_store_check;

alter table public.ai_music_purchases
  add constraint ai_music_purchases_store_check
  check (store in ('apple', 'google', 'stripe'));

alter table public.ai_music_purchases
  add column if not exists amount_try numeric(10,2),
  add column if not exists amount_usd numeric(10,2);

-- ---------------------------------------------------------------------------
-- payment_orders: coin + ai_music katalog
-- ---------------------------------------------------------------------------
alter table public.payment_orders
  alter column package_id drop not null;

alter table public.payment_orders
  add column if not exists catalog text not null default 'coin',
  add column if not exists ai_music_product_id text;

do $$ begin
  alter table public.payment_orders
    drop constraint if exists payment_orders_catalog_check;
  alter table public.payment_orders
    add constraint payment_orders_catalog_check
    check (catalog in ('coin', 'ai_music'));
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- Stripe ile AI müzik dakikası tanımla (service role / webhook)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_stripe_satin_al_onayla(
  p_user_id uuid,
  p_product_id text,
  p_idempotency_key text,
  p_provider_tx_id text,
  p_amount_try numeric default null,
  p_amount_usd numeric default null,
  p_receipt jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg public.ai_music_products%rowtype;
  v_seconds int;
  v_bonus int;
  v_purchase_id uuid;
  v_existing public.ai_music_purchases%rowtype;
  v_credit jsonb;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;
  if not public.ozellik_bayragi_aktif_mi('stripe_enabled') then
    raise exception 'Stripe disabled';
  end if;

  select * into v_existing
  from public.ai_music_purchases
  where user_id = p_user_id and idempotency_key = p_idempotency_key
  limit 1;
  if found and v_existing.status = 'CREDITED' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'seconds_added', v_existing.seconds_snapshot + coalesce(v_existing.bonus_seconds_snapshot, 0),
      'purchase_id', v_existing.id
    );
  end if;

  if p_provider_tx_id is not null then
    select * into v_existing
    from public.ai_music_purchases
    where store = 'stripe' and transaction_id = p_provider_tx_id
    limit 1;
    if found and v_existing.status = 'CREDITED' then
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'seconds_added', v_existing.seconds_snapshot + coalesce(v_existing.bonus_seconds_snapshot, 0),
        'purchase_id', v_existing.id
      );
    end if;
  end if;

  select * into v_pkg
  from public.ai_music_products
  where (product_id = p_product_id or id::text = p_product_id) and is_active
  limit 1;
  if not found then raise exception 'AI music product not found'; end if;

  v_seconds := v_pkg.seconds_granted;
  v_bonus := coalesce(v_pkg.bonus_seconds, 0);

  if v_existing.id is not null then
    v_purchase_id := v_existing.id;
    update public.ai_music_purchases set
      status = 'VERIFIED',
      transaction_id = coalesce(p_provider_tx_id, transaction_id),
      amount_try = coalesce(p_amount_try, amount_try, v_pkg.price_try),
      amount_usd = coalesce(p_amount_usd, amount_usd, v_pkg.price_usd),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_receipt, '{}'::jsonb),
      updated_at = now()
    where id = v_purchase_id;
  else
    insert into public.ai_music_purchases (
      user_id, product_id, store, store_product_id, transaction_id,
      idempotency_key, status, seconds_snapshot, bonus_seconds_snapshot,
      display_name_snapshot, amount_try, amount_usd, metadata
    ) values (
      p_user_id, v_pkg.product_id, 'stripe', v_pkg.product_id, p_provider_tx_id,
      p_idempotency_key, 'VERIFIED', v_seconds, v_bonus,
      v_pkg.display_name,
      coalesce(p_amount_try, v_pkg.price_try),
      coalesce(p_amount_usd, v_pkg.price_usd),
      coalesce(p_receipt, '{}'::jsonb)
    )
    returning id into v_purchase_id;
  end if;

  select public.ai_music_credit_purchase(
    p_user_id,
    v_pkg.product_id,
    coalesce(p_provider_tx_id, p_idempotency_key),
    v_seconds,
    v_bonus,
    v_purchase_id,
    v_pkg.display_name
  ) into v_credit;

  update public.payment_orders set
    status = 'paid',
    provider_tx_id = coalesce(p_provider_tx_id, provider_tx_id),
    paid_at = coalesce(paid_at, now()),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('ai_music_purchase_id', v_purchase_id)
  where idempotency_key = p_idempotency_key and user_id = p_user_id;

  return coalesce(v_credit, jsonb_build_object('ok', false)) || jsonb_build_object('purchase_id', v_purchase_id);
end;
$$;

revoke all on function public.ai_music_stripe_satin_al_onayla(uuid, text, text, text, numeric, numeric, jsonb) from public;
grant execute on function public.ai_music_stripe_satin_al_onayla(uuid, text, text, text, numeric, numeric, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Birleşik satın alma geçmişi (coin + AI müzik + payment_orders)
-- ---------------------------------------------------------------------------
create or replace function public.satin_alma_gecmisim(p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select * from (
        select
          cp.id::text as id,
          'coin'::text as kind,
          coalesce(pkg.title, 'Coin paketi') as title,
          ('+' || (cp.coins_added)::text || ' coin') as detail,
          cp.coins_added::numeric as quantity,
          'coin'::text as unit,
          cp.amount_try,
          cp.amount_usd,
          cp.provider as channel,
          cp.store,
          cp.status,
          cp.created_at,
          cp.verified_at as completed_at,
          jsonb_build_object(
            'package_id', cp.package_id,
            'provider_tx_id', cp.provider_tx_id
          ) as meta
        from public.coin_purchases cp
        left join public.coin_packages pkg on pkg.id = cp.package_id
        where cp.user_id = v_uid

        union all

        select
          ap.id::text,
          'ai_music'::text,
          coalesce(ap.display_name_snapshot, ap.product_id),
          (
            '+' ||
            round((ap.seconds_snapshot + coalesce(ap.bonus_seconds_snapshot, 0)) / 60.0)::text ||
            ' dk AI müzik'
          ),
          (ap.seconds_snapshot + coalesce(ap.bonus_seconds_snapshot, 0))::numeric,
          'seconds'::text,
          ap.amount_try,
          ap.amount_usd,
          ap.store,
          ap.store,
          ap.status,
          ap.created_at,
          ap.credited_at,
          jsonb_build_object(
            'product_id', ap.product_id,
            'transaction_id', ap.transaction_id,
            'seconds', ap.seconds_snapshot,
            'bonus_seconds', ap.bonus_seconds_snapshot
          )
        from public.ai_music_purchases ap
        where ap.user_id = v_uid
      ) u
      order by u.created_at desc
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.satin_alma_gecmisim(int) to authenticated;
