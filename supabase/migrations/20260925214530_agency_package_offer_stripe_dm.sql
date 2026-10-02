-- Ajans coin paket teklifi → DM kartı → Stripe uygulama içi ödeme → coin yükleme

-- ---------------------------------------------------------------------------
-- 1) Offers
-- ---------------------------------------------------------------------------
create table if not exists public.agency_package_offers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  thread_id uuid references public.message_threads(id) on delete set null,
  message_id uuid references public.direct_messages(id) on delete set null,
  package_key text not null,
  title text not null,
  liste_fiyat_try numeric(12,2) not null check (liste_fiyat_try > 0),
  amount_try numeric(12,2) not null check (amount_try > 0),
  coins bigint not null check (coins > 0),
  indirim_yuzde int not null default 20 check (indirim_yuzde >= 0 and indirim_yuzde < 100),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'expired')),
  stripe_payment_intent_id text,
  paid_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_package_offers_buyer_idx
  on public.agency_package_offers (buyer_id, created_at desc);
create index if not exists agency_package_offers_agency_idx
  on public.agency_package_offers (agency_id, created_at desc);
create index if not exists agency_package_offers_status_idx
  on public.agency_package_offers (status, expires_at)
  where status = 'pending';

alter table public.agency_package_offers enable row level security;

drop policy if exists "agency_package_offers_select" on public.agency_package_offers;
create policy "agency_package_offers_select"
  on public.agency_package_offers for select to authenticated
  using (
    buyer_id = auth.uid()
    or created_by = auth.uid()
    or exists (
      select 1 from public.agencies a
      where a.id = agency_id and a.owner_id = auth.uid()
    )
  );

grant select on public.agency_package_offers to authenticated;

-- ---------------------------------------------------------------------------
-- 2) payment_orders catalog + offer ref
-- ---------------------------------------------------------------------------
alter table public.payment_orders
  add column if not exists agency_package_offer_id uuid
    references public.agency_package_offers(id) on delete set null;

do $$ begin
  alter table public.payment_orders
    drop constraint if exists payment_orders_catalog_check;
  alter table public.payment_orders
    add constraint payment_orders_catalog_check
    check (catalog in ('coin', 'ai_music', 'agency_package'));
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- 3) message_type: agency_package_offer
-- ---------------------------------------------------------------------------
alter table public.direct_messages
  drop constraint if exists direct_messages_message_type_check;

alter table public.direct_messages
  add constraint direct_messages_message_type_check
  check (message_type = any (array[
    'text'::text, 'image'::text, 'video'::text, 'voice'::text,
    'emoji'::text, 'gift'::text, 'system'::text, 'shared_post'::text,
    'music'::text, 'agency_package_offer'::text
  ]));

create index if not exists direct_messages_agency_offer_ref_idx
  on public.direct_messages (ref_id)
  where message_type = 'agency_package_offer' and ref_id is not null;

-- ---------------------------------------------------------------------------
-- 4) Katalog hesabı (sunucu — istemci fiyatına güvenilmez)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_paket_katalog_hesapla(p_liste_fiyat_try numeric)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_liste numeric;
  v_oran numeric;
  v_coins bigint;
  v_amount numeric;
  v_title text;
  v_indirim int := 20;
begin
  v_liste := round(coalesce(p_liste_fiyat_try, 0)::numeric, 2);
  if v_liste not in (
    99, 249, 499, 999, 2499, 4999, 9999, 24999, 49999, 99999, 199999, 300000
  ) then
    raise exception 'Gecersiz ajans paketi';
  end if;

  select coalesce(
    (select coin_try from public.platform_economy_config limit 1),
    0.10
  ) into v_oran;
  if v_oran is null or v_oran <= 0 then v_oran := 0.10; end if;

  v_coins := greatest(1, round(v_liste / v_oran)::bigint);
  v_amount := round(v_liste * (1 - v_indirim::numeric / 100), 2);

  v_title := case
    when v_liste <= 99 then 'Başlangıç'
    when v_liste <= 499 then 'Standart'
    when v_liste <= 2499 then 'Popüler'
    when v_liste <= 9999 then 'Prestij'
    when v_liste <= 49999 then 'VIP'
    when v_liste <= 99999 then 'Elite'
    else 'Max'
  end;

  return jsonb_build_object(
    'package_key', 'ajans_try_' || trim(to_char(v_liste, 'FM999999999')),
    'title', v_title,
    'liste_fiyat_try', v_liste,
    'amount_try', v_amount,
    'coins', v_coins,
    'indirim_yuzde', v_indirim
  );
end;
$$;

grant execute on function public.ajans_paket_katalog_hesapla(numeric) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Teklif oluştur + DM kartı
-- ---------------------------------------------------------------------------
create or replace function public.ajans_paket_teklif_olustur(
  p_agency_id uuid,
  p_liste_fiyat_try numeric,
  p_buyer_id uuid default null,
  p_thread_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_name text;
  v_buyer uuid;
  v_thread uuid;
  v_kat jsonb;
  v_offer public.agency_package_offers%rowtype;
  v_msg public.direct_messages%rowtype;
  v_body text;
  v_preview text;
  v_guest boolean;
  v_meta jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_agency_id is null then raise exception 'Agency required'; end if;
  if public.kill_switch_aktif_mi('kill_coin_purchase') then
    raise exception 'Coin purchase temporarily disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('messages_enabled') then
    raise exception 'Messages feature disabled';
  end if;

  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then
    raise exception 'Guest cannot create package offer';
  end if;

  select owner_id, name into v_owner, v_name
  from public.agencies
  where id = p_agency_id
    and status = 'active'
    and is_coin_distributor = true;
  if v_owner is null then raise exception 'Agency not found or not distributor'; end if;

  -- Alıcı: sahip gönderiyorsa zorunlu; kullanıcı talep ediyorsa kendisi
  if v_uid = v_owner then
    v_buyer := coalesce(p_buyer_id, null);
    if v_buyer is null and p_thread_id is not null then
      select m.user_id into v_buyer
      from public.message_thread_members m
      where m.thread_id = p_thread_id
        and m.user_id <> v_uid
      limit 1;
    end if;
    if v_buyer is null then raise exception 'Buyer required'; end if;
    if v_buyer = v_uid then raise exception 'Cannot offer to self'; end if;
  else
    v_buyer := v_uid;
  end if;

  if public.kullanicilar_engelli_mi(v_buyer, v_owner) then
    raise exception 'Bu kullaniciyla iletisim engellenmis';
  end if;

  v_kat := public.ajans_paket_katalog_hesapla(p_liste_fiyat_try);

  -- Thread
  if p_thread_id is not null then
    if not exists (
      select 1 from public.message_thread_members
      where thread_id = p_thread_id and user_id = v_uid
    ) then
      raise exception 'Not a thread member';
    end if;
    if not exists (
      select 1 from public.message_thread_members
      where thread_id = p_thread_id and user_id = v_buyer
    ) then
      raise exception 'Buyer not in thread';
    end if;
    v_thread := p_thread_id;
  else
    v_thread := public.ajans_sohbet_ac_veya_getir(p_agency_id);
  end if;

  insert into public.agency_package_offers (
    agency_id, buyer_id, created_by, thread_id,
    package_key, title, liste_fiyat_try, amount_try, coins, indirim_yuzde
  ) values (
    p_agency_id, v_buyer, v_uid, v_thread,
    v_kat->>'package_key',
    v_kat->>'title',
    (v_kat->>'liste_fiyat_try')::numeric,
    (v_kat->>'amount_try')::numeric,
    (v_kat->>'coins')::bigint,
    (v_kat->>'indirim_yuzde')::int
  )
  returning * into v_offer;

  v_body := format(
    '%s paket teklifi · %s coin · %s ₺ (%%%s ajans indirimi)',
    v_offer.title,
    to_char(v_offer.coins, 'FM999,999,999'),
    to_char(v_offer.amount_try, 'FM999,999,990.00'),
    v_offer.indirim_yuzde
  );
  v_preview := left(v_body, 120);

  v_meta := jsonb_build_object(
    'offer_id', v_offer.id,
    'agency_id', v_offer.agency_id,
    'agency_name', coalesce(nullif(trim(v_name), ''), 'Ajans'),
    'buyer_id', v_offer.buyer_id,
    'package_key', v_offer.package_key,
    'title', v_offer.title,
    'liste_fiyat_try', v_offer.liste_fiyat_try,
    'amount_try', v_offer.amount_try,
    'coins', v_offer.coins,
    'indirim_yuzde', v_offer.indirim_yuzde,
    'status', v_offer.status,
    'expires_at', v_offer.expires_at
  );

  insert into public.direct_messages (
    thread_id, sender_id, body, message_type, ref_id, media_meta
  ) values (
    v_thread, v_owner, left(v_body, 4000), 'agency_package_offer', v_offer.id, v_meta
  )
  returning * into v_msg;

  update public.agency_package_offers
  set message_id = v_msg.id, updated_at = now()
  where id = v_offer.id;

  update public.message_threads set
    last_message_at = now(),
    last_message_preview = v_preview,
    updated_at = now()
  where id = v_thread;

  return jsonb_build_object(
    'ok', true,
    'offer_id', v_offer.id,
    'thread_id', v_thread,
    'message_id', v_msg.id,
    'amount_try', v_offer.amount_try,
    'coins', v_offer.coins,
    'title', v_offer.title,
    'status', v_offer.status
  );
end;
$$;

grant execute on function public.ajans_paket_teklif_olustur(uuid, numeric, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Teklif getir (kart yenileme)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_paket_teklif_getir(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_o public.agency_package_offers%rowtype;
  v_agency_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_offer_id is null then raise exception 'Offer required'; end if;

  select * into v_o from public.agency_package_offers where id = p_offer_id;
  if not found then raise exception 'Offer not found'; end if;

  if v_o.buyer_id <> v_uid
     and v_o.created_by <> v_uid
     and not exists (
       select 1 from public.agencies a
       where a.id = v_o.agency_id and a.owner_id = v_uid
     )
  then
    raise exception 'Forbidden';
  end if;

  -- Süresi dolmuş pending → expired (lazy)
  if v_o.status = 'pending' and v_o.expires_at < now() then
    update public.agency_package_offers
    set status = 'expired', updated_at = now()
    where id = v_o.id and status = 'pending';
    v_o.status := 'expired';
  end if;

  select name into v_agency_name from public.agencies where id = v_o.agency_id;

  return jsonb_build_object(
    'id', v_o.id,
    'agency_id', v_o.agency_id,
    'agency_name', v_agency_name,
    'buyer_id', v_o.buyer_id,
    'thread_id', v_o.thread_id,
    'package_key', v_o.package_key,
    'title', v_o.title,
    'liste_fiyat_try', v_o.liste_fiyat_try,
    'amount_try', v_o.amount_try,
    'coins', v_o.coins,
    'indirim_yuzde', v_o.indirim_yuzde,
    'status', v_o.status,
    'expires_at', v_o.expires_at,
    'paid_at', v_o.paid_at,
    'created_at', v_o.created_at
  );
end;
$$;

grant execute on function public.ajans_paket_teklif_getir(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Stripe webhook fulfillment (service_role)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_paket_teklif_stripe_onayla(
  p_user_id uuid,
  p_offer_id uuid,
  p_idempotency_key text,
  p_provider_tx_id text,
  p_amount_try numeric default null,
  p_receipt jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_o public.agency_package_offers%rowtype;
  v_existing uuid;
  v_purchase public.coin_purchases%rowtype;
  v_amount numeric;
begin
  if p_user_id is null or p_offer_id is null then
    raise exception 'user/offer required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;
  if public.kill_switch_aktif_mi('kill_coin_purchase') then
    raise exception 'Coin purchase temporarily disabled';
  end if;

  select result_ref into v_existing
  from public.finance_idempotency_keys
  where idempotency_key = p_idempotency_key and user_id = p_user_id;
  if v_existing is not null then
    select * into v_purchase from public.coin_purchases where id = v_existing;
    if found then
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'coins', v_purchase.coins_added, 'purchase_id', v_purchase.id
      );
    end if;
  end if;

  if p_provider_tx_id is not null then
    select * into v_purchase from public.coin_purchases
    where provider = 'stripe' and provider_tx_id = p_provider_tx_id limit 1;
    if found then
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'coins', v_purchase.coins_added, 'purchase_id', v_purchase.id
      );
    end if;
  end if;

  select * into v_o from public.agency_package_offers where id = p_offer_id for update;
  if not found then raise exception 'Offer not found'; end if;
  if v_o.buyer_id <> p_user_id then raise exception 'Buyer mismatch'; end if;

  if v_o.status = 'paid' then
    return jsonb_build_object('ok', true, 'idempotent', true, 'coins', v_o.coins, 'offer_id', v_o.id);
  end if;
  if v_o.status <> 'pending' then
    raise exception 'Offer not payable (%)', v_o.status;
  end if;
  if v_o.expires_at < now() then
    update public.agency_package_offers
    set status = 'expired', updated_at = now()
    where id = v_o.id;
    raise exception 'Offer expired';
  end if;

  v_amount := coalesce(p_amount_try, v_o.amount_try);
  -- Stripe tutarı teklifle uyumlu olmalı (±0.5 ₺)
  if abs(v_amount - v_o.amount_try) > 0.5 then
    raise exception 'Amount mismatch';
  end if;

  insert into public.wallets (user_id, coins, diamonds)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;

  update public.wallets set coins = coins + v_o.coins, updated_at = now()
  where user_id = p_user_id;

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
  values (
    p_user_id, 'coins', v_o.coins,
    (select coins from public.wallets where user_id = p_user_id),
    'agency_package_purchase', 'agency_package_offer', v_o.id
  );

  insert into public.coin_purchases (
    user_id, package_id, coins_added, amount_usd, amount_try,
    provider, provider_tx_id, status, idempotency_key, store,
    receipt_payload, verified_at
  ) values (
    p_user_id, null, v_o.coins, null, v_o.amount_try,
    'stripe', p_provider_tx_id, 'completed', p_idempotency_key, 'manual',
    coalesce(p_receipt, '{}'::jsonb) || jsonb_build_object(
      'agency_package_offer_id', v_o.id,
      'agency_id', v_o.agency_id,
      'package_key', v_o.package_key
    ),
    now()
  )
  returning * into v_purchase;

  insert into public.finance_idempotency_keys (
    idempotency_key, user_id, operation, result_ref, result_payload
  ) values (
    p_idempotency_key, p_user_id, 'agency_package_purchase', v_purchase.id,
    jsonb_build_object('coins', v_o.coins, 'offer_id', v_o.id)
  )
  on conflict (idempotency_key) do nothing;

  update public.agency_package_offers set
    status = 'paid',
    paid_at = now(),
    stripe_payment_intent_id = coalesce(p_provider_tx_id, stripe_payment_intent_id),
    updated_at = now()
  where id = v_o.id;

  update public.payment_orders set
    status = 'paid',
    provider_tx_id = coalesce(p_provider_tx_id, provider_tx_id),
    paid_at = coalesce(paid_at, now()),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'agency_package_offer_id', v_o.id,
      'purchase_id', v_purchase.id
    )
  where idempotency_key = p_idempotency_key and user_id = p_user_id;

  -- DM kart meta güncelle
  update public.direct_messages set
    media_meta = coalesce(media_meta, '{}'::jsonb) || jsonb_build_object(
      'status', 'paid',
      'paid_at', now()
    )
  where id = v_o.message_id;

  return jsonb_build_object(
    'ok', true,
    'coins', v_o.coins,
    'purchase_id', v_purchase.id,
    'offer_id', v_o.id
  );
end;
$$;

revoke all on function public.ajans_paket_teklif_stripe_onayla(uuid, uuid, text, text, numeric, jsonb) from public;
grant execute on function public.ajans_paket_teklif_stripe_onayla(uuid, uuid, text, text, numeric, jsonb) to service_role;
