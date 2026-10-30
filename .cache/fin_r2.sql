-- ========== USERS ==========
create or replace function public.admin_finance_users(p_limit int default 40, p_offset int default 0, p_q text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit,40),1),100);
  v_offset int := greatest(coalesce(p_offset,0),0);
  v_rows jsonb;
  v_q text := nullif(trim(p_q), '');
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_rows from (
    select
      p.id as user_id,
      coalesce(nullif(trim(p.display_name),''), nullif(trim(p.username),''),'KullanÄ±cÄ±') as display_name,
      p.username,
      p.public_user_id,
      a.id as agency_id,
      a.name as agency_name,
      coalesce(w.coins,0)::bigint as current_coin,
      coalesce((
        select sum(cp.coins_added) from public.coin_purchases cp
        where cp.user_id=p.id and coalesce(cp.status,'completed')='completed'
      ),0)::bigint as coin_purchased,
      coalesce((
        select sum(case when wl.delta<0 then -wl.delta else 0 end)
        from public.wallet_ledger wl where wl.user_id=p.id and wl.currency='coins'
      ),0)::bigint as coin_spent,
      coalesce((
        select sum(case when wl.delta>0 and wl.reason in ('gift_received','gift') then wl.delta else 0 end)
        from public.wallet_ledger wl where wl.user_id=p.id and wl.currency='coins'
      ),0)::bigint as coin_received,
      coalesce((
        select sum(gt.coins_spent) from public.gift_transactions gt where gt.sender_id=p.id
      ),0)::bigint as coin_sent,
      coalesce((
        select sum(gt.diamonds_earned) from public.gift_transactions gt where gt.receiver_id=p.id
      ),0)::bigint as diamonds_generated,
      round(coalesce(he.diamonds,0) * coalesce((public.finance_rates()->>'diamond_try')::numeric,0.10), 2) as creator_earnings_try,
      (
        select max(wl.created_at) from public.wallet_ledger wl where wl.user_id=p.id
      ) as last_transaction_at,
      case
        when coalesce(w.coins,0) < 0 then 'NEGATIVE_BALANCE'
        when coalesce((
          select sum(cp.coins_added) from public.coin_purchases cp
          where cp.user_id=p.id and coalesce(cp.status,'completed')='completed'
            and cp.created_at > now() - interval '1 hour'
        ),0) > 500000 then 'UNUSUAL_COIN_PURCHASE'
        else 'OK'
      end as risk_status
    from public.profiles p
    left join public.wallets w on w.user_id = p.id
    left join public.host_profiles hp on hp.user_id = p.id
    left join public.agencies a on a.id = hp.agency_id
    left join public.host_earnings he on he.user_id = p.id
    where v_q is null
       or p.username ilike '%'||v_q||'%'
       or p.display_name ilike '%'||v_q||'%'
       or p.public_user_id::text ilike '%'||v_q||'%'
       or p.id::text ilike '%'||v_q||'%'
    order by coalesce(w.coins,0) desc
    limit v_limit offset v_offset
  ) t;

  return jsonb_build_object('ok', true, 'items', v_rows, 'limit', v_limit, 'offset', v_offset);
end;
$$;

grant execute on function public.admin_finance_users(int, int, text) to authenticated;

-- ========== USER PROFILE ==========
create or replace function public.admin_finance_user_profile(p_user_id uuid, p_limit int default 80)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit,80),1),200);
  v_user jsonb;
  v_timeline jsonb;
  v_wallet bigint;
  v_ledger bigint;
begin
  if not public.finance_yetkisi_var_mi('SUPPORT_ADMIN') then
    raise exception 'Forbidden: finance access required';
  end if;

  select jsonb_build_object(
    'user_id', p.id,
    'display_name', coalesce(nullif(trim(p.display_name),''), nullif(trim(p.username),''),'KullanÄ±cÄ±'),
    'username', p.username,
    'public_user_id', p.public_user_id,
    'agency_id', a.id,
    'agency_name', a.name,
    'account_status', coalesce(p.account_status, 'active'),
    'current_coin', coalesce(w.coins,0),
    'current_diamonds', coalesce(w.diamonds,0),
    'coin_purchased', coalesce((select sum(cp.coins_added) from public.coin_purchases cp where cp.user_id=p.id and coalesce(cp.status,'completed')='completed'),0),
    'coin_spent', coalesce((select sum(case when wl.delta<0 then -wl.delta else 0 end) from public.wallet_ledger wl where wl.user_id=p.id and wl.currency='coins'),0),
    'coin_received', coalesce((select sum(case when wl.delta>0 then wl.delta else 0 end) from public.wallet_ledger wl where wl.user_id=p.id and wl.currency='coins' and wl.reason ilike '%gift%'),0),
    'coin_sent', coalesce((select sum(gt.coins_spent) from public.gift_transactions gt where gt.sender_id=p.id),0),
    'creator_earnings_try', round(coalesce(he.diamonds,0)*coalesce((public.finance_rates()->>'diamond_try')::numeric,0.10),2)
  )
  into v_user
  from public.profiles p
  left join public.wallets w on w.user_id=p.id
  left join public.host_profiles hp on hp.user_id=p.id
  left join public.agencies a on a.id=hp.agency_id
  left join public.host_earnings he on he.user_id=p.id
  where p.id = p_user_id;

  if v_user is null then
    raise exception 'User not found';
  end if;

  select coalesce(w.coins,0) into v_wallet from public.wallets w where w.user_id=p_user_id;
  select coalesce((
    select wl.balance_after from public.wallet_ledger wl
    where wl.user_id=p_user_id and wl.currency='coins'
    order by wl.created_at desc, wl.id desc limit 1
  ),0) into v_ledger;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_timeline from (
    select
      wl.id as transaction_id,
      wl.ref_id as reference_id,
      wl.created_at as timestamp,
      wl.reason as type,
      wl.delta as amount,
      wl.balance_after - wl.delta as before_balance,
      wl.balance_after as after_balance,
      wl.ref_type as source,
      'posted' as status,
      wl.meta,
      wl.currency
    from public.wallet_ledger wl
    where wl.user_id = p_user_id
    order by wl.created_at desc
    limit v_limit
  ) t;

  return jsonb_build_object(
    'ok', true,
    'profile', v_user,
    'timeline', v_timeline,
    'reconciliation', jsonb_build_object(
      'wallet_balance', v_wallet,
      'ledger_derived_balance', v_ledger,
      'status', case when coalesce(v_wallet,0)=coalesce(v_ledger,0) then 'MATCHED' else 'MISMATCH' end
    )
  );
end;
$$;

grant execute on function public.admin_finance_user_profile(uuid, int) to authenticated;

-- ========== AGENCIES ==========
create or replace function public.admin_finance_agencies(p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit,50),1),100);
  v_offset int := greatest(coalesce(p_offset,0),0);
  v_rows jsonb;
  v_dia numeric := coalesce((public.finance_rates()->>'diamond_try')::numeric,0.10);
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_rows from (
    select
      a.id as agency_id,
      a.name as agency_name,
      a.agency_public_id,
      a.status,
      a.host_count as creators,
      (select count(*) from public.host_profiles hp where hp.agency_id=a.id)::bigint as users,
      coalesce(aw.lifetime_coins_sold,0)::bigint as coin_sold_attributed,
      coalesce(aw.coins,0)::bigint as agency_coins,
      coalesce(aw.diamonds,0)::bigint as agency_diamonds,
      round(coalesce(aw.diamonds,0)*v_dia,2) as agency_earnings_try,
      round(coalesce((
        select sum(gt.coins_spent) from public.gift_transactions gt where gt.agency_id=a.id
      ),0)::numeric,0) as gift_volume,
      round(coalesce((
        select sum(he.diamonds) from public.host_earnings he
        join public.host_profiles hp on hp.user_id=he.user_id where hp.agency_id=a.id
      ),0)*v_dia,2) as creator_earnings_try,
      round(coalesce((
        select sum(wr.diamonds) from public.withdrawal_requests wr
        where wr.agency_id=a.id and wr.status in ('pending','approved','processing')
      ),0)*v_dia,2) as pending_payout_try,
      round(coalesce((
        select sum(wr.diamonds) from public.withdrawal_requests wr
        where wr.agency_id=a.id and wr.status='paid'
      ),0)*v_dia,2) as paid_try,
      round(coalesce(aw.diamonds,0)*v_dia,2) as current_liability_try
    from public.agencies a
    left join public.agency_wallets aw on aw.agency_id=a.id
    order by coalesce(aw.lifetime_coins_sold,0) desc
    limit v_limit offset v_offset
  ) t;

  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.admin_finance_agencies(int, int) to authenticated;

create or replace function public.admin_finance_agency_detail(p_agency_id uuid, p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit,50),1),100);
  v_dia numeric := coalesce((public.finance_rates()->>'diamond_try')::numeric,0.10);
  v_header jsonb;
  v_creators jsonb;
  v_tx jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;

  select jsonb_build_object(
    'agency_id', a.id,
    'agency_name', a.name,
    'agency_public_id', a.agency_public_id,
    'owner_id', a.owner_id,
    'status', a.status,
    'creators', a.host_count,
    'users', (select count(*) from public.host_profiles hp where hp.agency_id=a.id),
    'coin_volume', coalesce(aw.lifetime_coins_sold,0),
    'gift_volume', coalesce((select sum(gt.coins_spent) from public.gift_transactions gt where gt.agency_id=a.id),0),
    'creator_earnings_try', round(coalesce((
      select sum(he.diamonds) from public.host_earnings he
      join public.host_profiles hp on hp.user_id=he.user_id where hp.agency_id=a.id
    ),0)*v_dia,2),
    'agency_commission_try', round(coalesce(aw.diamonds,0)*v_dia,2),
    'pending_payment_try', round(coalesce((
      select sum(wr.diamonds) from public.withdrawal_requests wr
      where wr.agency_id=a.id and wr.status in ('pending','approved','processing')
    ),0)*v_dia,2),
    'paid_try', round(coalesce((
      select sum(wr.diamonds) from public.withdrawal_requests wr
      where wr.agency_id=a.id and wr.status='paid'
    ),0)*v_dia,2),
    'current_liability_try', round(coalesce(aw.diamonds,0)*v_dia,2)
  )
  into v_header
  from public.agencies a
  left join public.agency_wallets aw on aw.agency_id=a.id
  where a.id = p_agency_id;

  if v_header is null then raise exception 'Agency not found'; end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.creator_earnings_try desc), '[]'::jsonb)
  into v_creators from (
    select
      p.id as creator_id,
      coalesce(nullif(trim(p.display_name),''),p.username,'Creator') as creator_name,
      p.username,
      coalesce((select sum(gt.coins_spent) from public.gift_transactions gt where gt.receiver_id=p.id),0)::bigint as gift_volume,
      coalesce((select sum(gt.diamonds_earned) from public.gift_transactions gt where gt.receiver_id=p.id),0)::bigint as coin_generated,
      round(coalesce(he.diamonds,0)*v_dia,2) as creator_earnings_try
    from public.host_profiles hp
    join public.profiles p on p.id=hp.user_id
    left join public.host_earnings he on he.user_id=p.id
    where hp.agency_id = p_agency_id
    order by coalesce(he.diamonds,0) desc
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_tx from (
    select
      awl.id, awl.created_at, awl.currency, awl.delta, awl.balance_after,
      awl.reason, awl.ref_type, awl.ref_id, awl.meta
    from public.agency_wallet_ledger awl
    where awl.agency_id = p_agency_id
    order by awl.created_at desc
    limit v_limit
  ) t;

  return jsonb_build_object('ok', true, 'agency', v_header, 'top_creators', v_creators, 'transactions', v_tx);
end;
$$;

grant execute on function public.admin_finance_agency_detail(uuid, int) to authenticated;

-- ========== CREATORS ==========
create or replace function public.admin_finance_creators(p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit,50),1),100);
  v_offset int := greatest(coalesce(p_offset,0),0);
  v_dia numeric := coalesce((public.finance_rates()->>'diamond_try')::numeric,0.10);
  v_rows jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_rows from (
    select
      p.id as user_id,
      coalesce(nullif(trim(p.display_name),''),p.username,'Creator') as display_name,
      p.username,
      a.name as agency_name,
      a.id as agency_id,
      coalesce(he.diamonds,0)::bigint as diamonds,
      round(coalesce(he.diamonds,0)*v_dia,2) as creator_earnings_try,
      coalesce((select sum(gt.coins_spent) from public.gift_transactions gt where gt.receiver_id=p.id),0)::bigint as gift_volume
    from public.host_earnings he
    join public.profiles p on p.id=he.user_id
    left join public.host_profiles hp on hp.user_id=p.id
    left join public.agencies a on a.id=hp.agency_id
    order by he.diamonds desc
    limit v_limit offset v_offset
  ) t;

  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.admin_finance_creators(int, int) to authenticated;

