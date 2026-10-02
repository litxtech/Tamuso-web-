-- Ajans satış linki Stripe ödemesi: dekont alanları + onay RPC + bildirim

alter table public.agency_tracked_sales
  add column if not exists buyer_email text,
  add column if not exists buyer_display_name text,
  add column if not exists stripe_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists receipt_payload jsonb not null default '{}'::jsonb;

create unique index if not exists agency_tracked_sales_stripe_session_uidx
  on public.agency_tracked_sales (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists agency_tracked_sales_stripe_pi_uidx
  on public.agency_tracked_sales (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ---------------------------------------------------------------------------
-- Stripe ödeme kesinleşince: satış + dekont + coin (varsa) + bildirimler
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
begin
  if p_sale_link_code is null or length(trim(p_sale_link_code)) = 0 then
    raise exception 'sale_link_code required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  -- Idempotency: aynı Stripe session / PI
  if p_stripe_session_id is not null then
    select * into v_sale from public.agency_tracked_sales
    where stripe_session_id = p_stripe_session_id limit 1;
    if found then
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

  -- E-posta ile profil eşleştir
  if v_buyer is null and v_email is not null then
    select u.id into v_buyer
    from auth.users u
    where lower(u.email) = v_email
    limit 1;
  end if;

  if v_name is null and v_buyer is not null then
    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''))
      into v_name
    from public.profiles where id = v_buyer;
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

  v_note := format(
    E'DEKONT (Stripe)\n'
    || 'Paket: %s\n'
    || 'Tutar: %s ₺\n'
    || 'Coin: %s\n'
    || 'Alıcı ID: %s\n'
    || 'Alıcı ad: %s\n'
    || 'Alıcı e-posta: %s\n'
    || 'Stripe session: %s\n'
    || 'Stripe PI: %s\n'
    || 'Link kodu: %s',
    v_title,
    to_char(v_amount, 'FM999,999,990.00'),
    to_char(v_coins, 'FM999,999,999'),
    coalesce(v_buyer::text, '—'),
    coalesce(v_name, '—'),
    coalesce(v_email, '—'),
    coalesce(p_stripe_session_id, '—'),
    coalesce(p_provider_tx_id, '—'),
    v_link.code
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
    left(v_note, 4000),
    v_payload,
    p_stripe_session_id,
    p_provider_tx_id
  )
  returning * into v_sale;

  -- Coin yükle (bilinen kullanıcı)
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

  select owner_id, name into v_owner, v_agency_name
  from public.agencies where id = v_link.agency_id;

  -- Ajans sahibi bildirimi
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
        'sale_link_code', v_link.code,
        'buyer_id', v_buyer,
        'buyer_email', v_email,
        'amount_try', v_amount,
        'coins', v_coins
      )
    );
  end if;

  -- Satış görme yetkisi olan personel (sahip hariç)
  for v_staff in
    select distinct s.user_id
    from public.agency_staff_roles s
    where s.agency_id = v_link.agency_id
      and s.user_id is distinct from v_owner
      and (
        s.role_code in ('OWNER', 'MANAGER')
        or exists (
          select 1 from public.agency_role_default_permissions d
          where d.role_code = s.role_code
            and d.permission_code = 'agency.view_sales'
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
      jsonb_build_object(
        'type', 'agency_sale_paid',
        'agency_id', v_link.agency_id,
        'sale_id', v_sale.id
      )
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
    'pdf_path', v_sale.receipt_payload->>'pdf_path'
  );
end;
$$;

revoke all on function public.ajans_satis_stripe_onayla(text, text, text, text, numeric, uuid, text, text, jsonb) from public;
grant execute on function public.ajans_satis_stripe_onayla(text, text, text, text, numeric, uuid, text, text, jsonb) to service_role;
