-- Finansal kilit: mevcut ajans_coin_transfer gövdesine gate ekler (flag OFF = no-op).
-- Kaynak gövde: 20260926240000_ajans_cuzdan_ciro_hediye.sql

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

  -- V2: flag kapalıysa true; LEGACY_* ajanslar bypass
  if not public.agency_verification_financial_gate(p_agency_id, 'can_manage_financial_distribution') then
    raise exception 'Ajans dogrulama gerekli (finansal dagitim)';
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

grant execute on function public.ajans_coin_transfer(uuid, uuid, bigint, text) to authenticated;

create or replace function public.agency_assert_financial_feature(
  p_agency_id uuid,
  p_feature text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.agency_verification_financial_gate(p_agency_id, p_feature) then
    raise exception 'Ajans dogrulama gerekli (%)', p_feature;
  end if;
end;
$$;

grant execute on function public.agency_assert_financial_feature(uuid, text) to authenticated;

create or replace function public.agency_payment_account_changed_signal(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.verification_raise_risk_signal(
    'AGENCY', p_agency_id, 'PAYMENT_ACCOUNT_CHANGED', 'MEDIUM',
    jsonb_build_object('note', 'Odeme hesabi degisti')
  );
  update public.agency_verification_profiles set
    payment_account_verified = false,
    overall_status = case
      when overall_status in ('LEGACY_ACTIVE', 'LEGACY_VERIFIED') then overall_status
      else 'FINANCIAL_REVERIFICATION_REQUIRED'
    end,
    updated_at = now()
  where subject_type = 'AGENCY' and subject_id = p_agency_id;
end;
$$;
