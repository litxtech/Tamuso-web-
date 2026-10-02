-- Ajans paket teklifi: kesinleşen Stripe ödemesinde ajansa detaylı fiş DM

alter table public.direct_messages
  drop constraint if exists direct_messages_message_type_check;

alter table public.direct_messages
  add constraint direct_messages_message_type_check
  check (message_type = any (array[
    'text'::text, 'image'::text, 'video'::text, 'voice'::text,
    'emoji'::text, 'gift'::text, 'system'::text, 'shared_post'::text,
    'music'::text, 'agency_package_offer'::text, 'agency_package_receipt'::text
  ]));

create index if not exists direct_messages_agency_receipt_ref_idx
  on public.direct_messages (ref_id)
  where message_type = 'agency_package_receipt' and ref_id is not null;

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
  v_owner uuid;
  v_agency_name text;
  v_buyer_name text;
  v_buyer_username text;
  v_paid_at timestamptz;
  v_fis_body text;
  v_fis_preview text;
  v_fis_meta jsonb;
  v_fis_msg public.direct_messages%rowtype;
  v_tarih text;
  v_saat text;
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

  v_paid_at := now();

  update public.agency_package_offers set
    status = 'paid',
    paid_at = v_paid_at,
    stripe_payment_intent_id = coalesce(p_provider_tx_id, stripe_payment_intent_id),
    updated_at = now()
  where id = v_o.id;

  update public.payment_orders set
    status = 'paid',
    provider_tx_id = coalesce(p_provider_tx_id, provider_tx_id),
    paid_at = coalesce(paid_at, v_paid_at),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'agency_package_offer_id', v_o.id,
      'purchase_id', v_purchase.id
    )
  where idempotency_key = p_idempotency_key and user_id = p_user_id;

  update public.direct_messages set
    media_meta = coalesce(media_meta, '{}'::jsonb) || jsonb_build_object(
      'status', 'paid',
      'paid_at', v_paid_at,
      'purchase_id', v_purchase.id
    )
  where id = v_o.message_id;

  -- Kesinleşen ödeme sonrası ajansa detaylı fiş (yalnızca bir kez)
  if v_o.thread_id is not null
     and not exists (
       select 1 from public.direct_messages
       where message_type = 'agency_package_receipt'
         and ref_id = v_o.id
     )
  then
    select owner_id, name into v_owner, v_agency_name
    from public.agencies where id = v_o.agency_id;

    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Alıcı'),
           nullif(trim(username), '')
      into v_buyer_name, v_buyer_username
    from public.profiles where id = v_o.buyer_id;

    v_tarih := to_char(v_paid_at at time zone 'Europe/Istanbul', 'DD.MM.YYYY');
    v_saat := to_char(v_paid_at at time zone 'Europe/Istanbul', 'HH24:MI');

    v_fis_body := format(
      E'SATIN ALMA FİŞİ\n'
      || 'Paket: %s\n'
      || 'Coin: %s\n'
      || 'Ödenen: %s ₺\n'
      || 'Liste: %s ₺ · İndirim %%%s\n'
      || 'Alıcı: %s%s\n'
      || 'Tarih: %s\n'
      || 'Saat: %s (TR)\n'
      || 'Fiş no: %s\n'
      || 'Ödeme: Stripe · kesinleşti',
      v_o.title,
      to_char(v_o.coins, 'FM999,999,999'),
      to_char(v_o.amount_try, 'FM999,999,990.00'),
      to_char(v_o.liste_fiyat_try, 'FM999,999,990.00'),
      v_o.indirim_yuzde,
      v_buyer_name,
      case when v_buyer_username is not null then ' (@' || v_buyer_username || ')' else '' end,
      v_tarih,
      v_saat,
      left(replace(v_purchase.id::text, '-', ''), 12)
    );
    v_fis_preview := left(
      format('Fiş · %s · %s coin · %s ₺', v_o.title, to_char(v_o.coins, 'FM999,999,999'), to_char(v_o.amount_try, 'FM999,999,990.00')),
      120
    );

    v_fis_meta := jsonb_build_object(
      'offer_id', v_o.id,
      'purchase_id', v_purchase.id,
      'agency_id', v_o.agency_id,
      'agency_name', coalesce(nullif(trim(v_agency_name), ''), 'Ajans'),
      'buyer_id', v_o.buyer_id,
      'buyer_name', v_buyer_name,
      'buyer_username', v_buyer_username,
      'package_key', v_o.package_key,
      'title', v_o.title,
      'liste_fiyat_try', v_o.liste_fiyat_try,
      'amount_try', v_o.amount_try,
      'coins', v_o.coins,
      'indirim_yuzde', v_o.indirim_yuzde,
      'paid_at', v_paid_at,
      'provider', 'stripe',
      'provider_tx_id', p_provider_tx_id,
      'receipt_no', left(replace(v_purchase.id::text, '-', ''), 12),
      'status', 'paid'
    );

    insert into public.direct_messages (
      thread_id, sender_id, body, message_type, ref_id, media_meta
    ) values (
      v_o.thread_id,
      v_o.buyer_id,
      left(v_fis_body, 4000),
      'agency_package_receipt',
      v_o.id,
      v_fis_meta
    )
    returning * into v_fis_msg;

    update public.message_threads set
      last_message_at = now(),
      last_message_preview = v_fis_preview,
      updated_at = now()
    where id = v_o.thread_id;

    update public.message_thread_members set
      archived_at = null,
      deleted_at = null
    where thread_id = v_o.thread_id
      and (archived_at is not null or deleted_at is not null);

    -- Ajans sahibine anlık push (ödeme kesinleştiyse)
    if v_owner is not null and v_owner <> v_o.buyer_id then
      perform public.bildirim_kuyruga_ekle(
        v_owner,
        'messages',
        'Satın alma fişi',
        v_fis_preview,
        '/mesaj/' || v_o.thread_id::text,
        jsonb_build_object(
          'thread_id', v_o.thread_id,
          'sender_id', v_o.buyer_id,
          'type', 'dm',
          'message_type', 'agency_package_receipt',
          'message_id', v_fis_msg.id,
          'offer_id', v_o.id,
          'purchase_id', v_purchase.id
        )
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'coins', v_o.coins,
    'purchase_id', v_purchase.id,
    'offer_id', v_o.id,
    'paid_at', v_paid_at
  );
end;
$$;

revoke all on function public.ajans_paket_teklif_stripe_onayla(uuid, uuid, text, text, numeric, jsonb) from public;
grant execute on function public.ajans_paket_teklif_stripe_onayla(uuid, uuid, text, text, numeric, jsonb) to service_role;
