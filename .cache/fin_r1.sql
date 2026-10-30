-- Finance Control Center RPCs (server-side only; client display)

-- ========== OVERVIEW ==========
create or replace function public.admin_finance_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_start timestamptz := public.finance_istanbul_day_start(now());
  v_month_start timestamptz := public.finance_istanbul_month_start(now());
  v_yest_start timestamptz := v_today_start - interval '1 day';
  v_prev_month_start timestamptz := v_month_start - interval '1 month';
  v_coin_try numeric;
  v_dia_try numeric;
  v_sales_all numeric; v_sales_today numeric; v_sales_month numeric; v_sales_yest numeric; v_sales_prev_month numeric;
  v_coins_all bigint; v_coins_today bigint; v_coins_month bigint;
  v_supply bigint;
  v_expense_month numeric; v_expense_prev numeric;
  v_creator numeric; v_agency numeric; v_pending_wd numeric; v_pending_ref numeric;
  v_refunds_month numeric; v_chargebacks_month numeric;
  v_revenue_month numeric; v_revenue_prev numeric;
  v_net_month numeric;
  v_liability numeric;
  v_days_elapsed numeric;
  v_days_in_month numeric;
  v_est_revenue numeric; v_est_expense numeric; v_est_liability numeric; v_est_net numeric;
  v_live jsonb;
  v_alerts jsonb;
  v_rates jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;

  perform public.finance_snapshot_ensure_fresh();
  v_rates := public.finance_rates();
  v_coin_try := (v_rates->>'coin_try')::numeric;
  v_dia_try := (v_rates->>'diamond_try')::numeric;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0),
         coalesce(sum(cp.coins_added), 0)::bigint
  into v_sales_all, v_coins_all
  from public.coin_purchases cp where coalesce(cp.status,'completed')='completed';

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0),
         coalesce(sum(cp.coins_added), 0)::bigint
  into v_sales_today, v_coins_today
  from public.coin_purchases cp
  where coalesce(cp.status,'completed')='completed' and cp.created_at >= v_today_start;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0),
         coalesce(sum(cp.coins_added), 0)::bigint
  into v_sales_month, v_coins_month
  from public.coin_purchases cp
  where coalesce(cp.status,'completed')='completed' and cp.created_at >= v_month_start;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0)
  into v_sales_yest
  from public.coin_purchases cp
  where coalesce(cp.status,'completed')='completed'
    and cp.created_at >= v_yest_start and cp.created_at < v_today_start;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0)
  into v_sales_prev_month
  from public.coin_purchases cp
  where coalesce(cp.status,'completed')='completed'
    and cp.created_at >= v_prev_month_start and cp.created_at < v_month_start;

  select coalesce(sum(w.coins), 0)::bigint into v_supply from public.wallets w;

  select coalesce(sum(fe.amount), 0) into v_expense_month
  from public.finance_expenses fe
  where fe.payment_status='paid' and fe.currency='TRY'
    and fe.expense_date >= (timezone('Europe/Istanbul', v_month_start))::date;

  select coalesce(sum(fe.amount), 0) into v_expense_prev
  from public.finance_expenses fe
  where fe.payment_status='paid' and fe.currency='TRY'
    and fe.expense_date >= (timezone('Europe/Istanbul', v_prev_month_start))::date
    and fe.expense_date < (timezone('Europe/Istanbul', v_month_start))::date;

  select coalesce(sum(he.diamonds),0) * v_dia_try into v_creator from public.host_earnings he;
  select coalesce(sum(aw.diamonds),0) * v_dia_try into v_agency from public.agency_wallets aw;

  select coalesce(sum(wr.diamonds),0) * v_dia_try into v_pending_wd
  from public.withdrawal_requests wr where wr.status in ('pending','approved','processing');

  select coalesce(sum(coalesce((pd.purchase_snapshot->>'amount_try')::numeric,0)),0)
  into v_pending_ref
  from public.purchase_disputes pd where pd.status in ('pending','open','review');

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
  into v_refunds_month from public.coin_purchases cp
  where cp.status in ('refunded','reversed') and cp.created_at >= v_month_start;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
  into v_chargebacks_month from public.coin_purchases cp
  where cp.status='chargeback' and cp.created_at >= v_month_start;

  v_revenue_month := v_sales_month - v_refunds_month - v_chargebacks_month;
  v_revenue_prev := v_sales_prev_month;
  v_net_month := v_revenue_month - v_expense_month;
  v_liability := round(coalesce(v_creator,0)+coalesce(v_agency,0)+coalesce(v_pending_wd,0)+coalesce(v_pending_ref,0), 2);

  v_days_elapsed := greatest(extract(day from timezone('Europe/Istanbul', now()))::numeric, 1);
  v_days_in_month := extract(day from (date_trunc('month', timezone('Europe/Istanbul', now())) + interval '1 month - 1 day'))::numeric;
  v_est_revenue := round((v_revenue_month / v_days_elapsed) * v_days_in_month, 2);
  v_est_expense := round((v_expense_month / v_days_elapsed) * v_days_in_month, 2);
  v_est_liability := round(v_liability + (v_pending_wd / greatest(v_days_elapsed,1)) * (v_days_in_month - v_days_elapsed), 2);
  v_est_net := round(v_est_revenue - v_est_expense, 2);

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_live from (
    select id, event_type, user_id, agency_id, amount_coin, amount_try, title, subtitle, created_at
    from public.finance_live_events order by created_at desc limit 30
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_alerts from (
    select id, alert_type, severity, title, body, status, created_at
    from public.finance_alerts where status='open' order by created_at desc limit 20
  ) t;

  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'timezone', 'Europe/Istanbul',
    'rates', v_rates,
    'kpis', jsonb_build_object(
      'total_coin_sales_try', round(v_sales_all,2),
      'total_coin_sold', v_coins_all,
      'today_sales_try', round(v_sales_today,2),
      'today_coins', v_coins_today,
      'today_delta_pct', case when v_sales_yest>0 then round(((v_sales_today-v_sales_yest)/v_sales_yest)*100,1) else null end,
      'month_sales_try', round(v_sales_month,2),
      'month_coins', v_coins_month,
      'month_delta_pct', case when v_sales_prev_month>0 then round(((v_sales_month-v_sales_prev_month)/v_sales_prev_month)*100,1) else null end,
      'user_coin_supply', v_supply,
      'platform_revenue_try', round(v_revenue_month,2),
      'platform_expense_try', round(v_expense_month,2),
      'platform_net_try', round(v_net_month,2),
      'net_delta_pct', case when (v_revenue_prev-v_expense_prev)<>0 then round(((v_net_month-(v_revenue_prev-v_expense_prev))/abs(v_revenue_prev-v_expense_prev))*100,1) else null end,
      'total_liability_try', v_liability,
      'creator_payable_try', round(v_creator,2),
      'agency_payable_try', round(v_agency,2),
      'pending_withdrawals_try', round(v_pending_wd,2),
      'pending_refunds_try', round(v_pending_ref,2)
    ),
    'month_end_estimate', jsonb_build_object(
      'is_estimate', true,
      'expected_revenue_try', v_est_revenue,
      'expected_expense_try', v_est_expense,
      'expected_liability_try', v_est_liability,
      'expected_net_try', v_est_net
    ),
    'live_activity', v_live,
    'alerts', v_alerts
  );
end;
$$;

grant execute on function public.admin_finance_overview() to authenticated;

-- ========== COIN ECONOMY ==========
create or replace function public.admin_finance_coin_economy()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sold bigint; v_supply bigint; v_spent bigint; v_refunded bigint;
  v_bonus bigint; v_game bigint; v_promo bigint; v_transferred bigint;
  v_purchased_in_wallets bigint;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;

  select coalesce(sum(cp.coins_added),0)::bigint into v_sold
  from public.coin_purchases cp where coalesce(cp.status,'completed')='completed';

  select coalesce(sum(w.coins),0)::bigint into v_supply from public.wallets w;

  select coalesce(sum(case when wl.delta<0 then -wl.delta else 0 end),0)::bigint into v_spent
  from public.wallet_ledger wl where wl.currency='coins' and wl.delta < 0;

  select coalesce(sum(cp.coins_added),0)::bigint into v_refunded
  from public.coin_purchases cp where cp.status in ('refunded','reversed');

  select coalesce(sum(case when wl.delta>0 then wl.delta else 0 end),0)::bigint into v_bonus
  from public.wallet_ledger wl
  where wl.currency='coins' and wl.reason in ('bonus','bonus_coin','admin_topup');

  select coalesce(sum(case when wl.delta>0 then wl.delta else 0 end),0)::bigint into v_game
  from public.wallet_ledger wl
  where wl.currency='coins' and wl.reason in ('game_reward','game_win','fruit_wheel_win');

  select coalesce(sum(case when wl.delta>0 then wl.delta else 0 end),0)::bigint into v_promo
  from public.wallet_ledger wl
  where wl.currency='coins' and wl.reason in ('promotional','promo','promotional_coin');

  select coalesce(sum(abs(wl.delta)),0)::bigint into v_transferred
  from public.wallet_ledger wl
  where wl.currency='coins' and wl.reason in ('transfer','transfer_out','transfer_in','p2p_transfer','agency_transfer');

  v_purchased_in_wallets := greatest(v_supply - v_bonus - v_game - v_promo, 0);

  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'total_coin_sold', v_sold,
    'user_coin_supply', v_supply,
    'total_coin_spent', v_spent,
    'total_coin_transferred', v_transferred,
    'total_coin_refunded', v_refunded,
    'total_bonus_coin', v_bonus,
    'total_game_coin', v_game,
    'total_promotional_coin', v_promo,
    'supply_breakdown', jsonb_build_object(
      'purchased', v_purchased_in_wallets,
      'bonus', v_bonus,
      'game', v_game,
      'other', greatest(v_supply - v_purchased_in_wallets - v_bonus - v_game, 0)
    )
  );
end;
$$;

grant execute on function public.admin_finance_coin_economy() to authenticated;

-- ========== LIABILITIES ==========
create or replace function public.admin_finance_liabilities()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia numeric; v_creator numeric; v_agency numeric; v_wd numeric; v_ref numeric; v_other numeric := 0;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  v_dia := coalesce((public.finance_rates()->>'diamond_try')::numeric, 0.10);
  select coalesce(sum(he.diamonds),0)*v_dia into v_creator from public.host_earnings he;
  select coalesce(sum(aw.diamonds),0)*v_dia into v_agency from public.agency_wallets aw;
  select coalesce(sum(wr.diamonds),0)*v_dia into v_wd
  from public.withdrawal_requests wr where wr.status in ('pending','approved','processing');
  select coalesce(sum(coalesce((pd.purchase_snapshot->>'amount_try')::numeric,0)),0)
  into v_ref from public.purchase_disputes pd where pd.status in ('pending','open','review');
  select coalesce(sum(fe.amount),0) into v_other
  from public.finance_expenses fe where fe.payment_status='pending' and fe.currency='TRY';

  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'is_estimate', false,
    'total_liability_try', round(v_creator+v_agency+v_wd+v_ref+v_other,2),
    'breakdown', jsonb_build_object(
      'creator_payable_try', round(v_creator,2),
      'agency_payable_try', round(v_agency,2),
      'pending_withdrawals_try', round(v_wd,2),
      'pending_refunds_try', round(v_ref,2),
      'other_payables_try', round(v_other,2)
    )
  );
end;
$$;

grant execute on function public.admin_finance_liabilities() to authenticated;

-- ========== FORECAST ==========
create or replace function public.admin_finance_forecast()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ov jsonb;
  v_liab jsonb;
  v_payload jsonb;
  v_month text := to_char(timezone('Europe/Istanbul', now()), 'YYYY-MM');
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  v_ov := public.admin_finance_overview();
  v_liab := public.admin_finance_liabilities();
  v_payload := jsonb_build_object(
    'ok', true,
    'is_estimate', true,
    'badge', 'TAHMÄ°N',
    'generated_at', now(),
    'current_payable_try', v_liab->'breakdown'->'creator_payable_try',
    'pending_payout_try', (coalesce((v_liab->'breakdown'->>'pending_withdrawals_try')::numeric,0)
      + coalesce((v_liab->'breakdown'->>'agency_payable_try')::numeric,0)),
    'expected_creator_payout_try', v_ov->'month_end_estimate'->'expected_liability_try',
    'estimated_month_end_liability_try', v_ov->'month_end_estimate'->'expected_liability_try',
    'estimated_month_end_revenue_try', v_ov->'month_end_estimate'->'expected_revenue_try',
    'estimated_month_end_expense_try', v_ov->'month_end_estimate'->'expected_expense_try',
    'estimated_month_end_net_try', v_ov->'month_end_estimate'->'expected_net_try',
    'current', v_liab,
    'month_end_estimate', v_ov->'month_end_estimate'
  );
  insert into public.finance_forecast_snapshots (month_key, payload, created_by)
  values (v_month, v_payload, auth.uid());
  return v_payload;
end;
$$;

grant execute on function public.admin_finance_forecast() to authenticated;

-- ========== P&L ==========
create or replace function public.admin_finance_pnl()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start timestamptz := public.finance_istanbul_month_start(now());
  v_sales numeric; v_refunds numeric; v_chargebacks numeric;
  v_expense numeric; v_rev numeric; v_net numeric;
  v_rates jsonb; v_store_fee numeric; v_processor numeric;
  v_days_elapsed numeric; v_days_in_month numeric;
  v_est_rev numeric; v_est_exp numeric; v_est_net numeric;
  v_creator numeric; v_agency numeric;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  v_rates := public.finance_rates();

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
  into v_sales from public.coin_purchases cp
  where coalesce(cp.status,'completed')='completed' and cp.created_at >= v_month_start;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
  into v_refunds from public.coin_purchases cp
  where cp.status in ('refunded','reversed') and cp.created_at >= v_month_start;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
  into v_chargebacks from public.coin_purchases cp
  where cp.status='chargeback' and cp.created_at >= v_month_start;

  select coalesce(sum(fe.amount),0) into v_expense
  from public.finance_expenses fe
  where fe.payment_status='paid' and fe.currency='TRY'
    and fe.expense_date >= (timezone('Europe/Istanbul', v_month_start))::date;

  v_store_fee := round(v_sales * coalesce((v_rates->>'iap_store_fee_estimate')::numeric,0.3), 2);
  v_processor := round(v_sales * coalesce((v_rates->>'payment_processor_rate')::numeric,0.029), 2);
  v_rev := v_sales - v_refunds - v_chargebacks;
  v_net := v_rev - v_expense - v_store_fee;

  select coalesce(sum(he.diamonds),0) * (v_rates->>'diamond_try')::numeric into v_creator from public.host_earnings he;
  select coalesce(sum(aw.diamonds),0) * (v_rates->>'diamond_try')::numeric into v_agency from public.agency_wallets aw;

  v_days_elapsed := greatest(extract(day from timezone('Europe/Istanbul', now()))::numeric, 1);
  v_days_in_month := extract(day from (date_trunc('month', timezone('Europe/Istanbul', now())) + interval '1 month - 1 day'))::numeric;
  v_est_rev := round((v_rev / v_days_elapsed) * v_days_in_month, 2);
  v_est_exp := round(((v_expense + v_store_fee) / v_days_elapsed) * v_days_in_month, 2);
  v_est_net := round(v_est_rev - v_est_exp, 2);

  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'note', 'Operational finance â€” not tax accounting',
    'current', jsonb_build_object(
      'revenue_try', round(v_rev,2),
      'gross_sales_try', round(v_sales,2),
      'refunds_try', round(v_refunds,2),
      'chargebacks_try', round(v_chargebacks,2),
      'store_fees_estimate_try', v_store_fee,
      'processor_fees_estimate_try', v_processor,
      'operating_expenses_try', round(v_expense,2),
      'creator_payable_try', round(v_creator,2),
      'agency_payable_try', round(v_agency,2),
      'gross_result_try', round(v_rev - v_store_fee - v_processor, 2),
      'operating_result_try', round(v_net,2),
      'net_operational_result_try', round(v_net,2)
    ),
    'month_end_estimate', jsonb_build_object(
      'is_estimate', true,
      'badge', 'TAHMÄ°N',
      'expected_revenue_try', v_est_rev,
      'expected_expense_try', v_est_exp,
      'expected_net_try', v_est_net
    )
  );
end;
$$;

grant execute on function public.admin_finance_pnl() to authenticated;

-- ========== TRANSACTIONS / LIVE ==========
create or replace function public.admin_finance_transactions(
  p_limit int default 50,
  p_cursor timestamptz default null,
  p_event_type text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit,50),1),200);
  v_rows jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_rows from (
    select e.*
    from public.finance_live_events e
    where (p_cursor is null or e.created_at < p_cursor)
      and (p_event_type is null or e.event_type = p_event_type)
      and (p_user_id is null or e.user_id = p_user_id)
    order by e.created_at desc
    limit v_limit
  ) t;

  return jsonb_build_object('ok', true, 'items', v_rows, 'limit', v_limit);
end;
$$;

grant execute on function public.admin_finance_transactions(int, timestamptz, text, uuid) to authenticated;

-- ========== REVENUE ==========
create or replace function public.admin_finance_revenue(p_period text default 'month')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  v_sales numeric; v_refunds numeric; v_chargebacks numeric;
  v_expense numeric; v_rates jsonb; v_store numeric;
  v_creator numeric; v_agency numeric;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select * into b from public.finance_period_bounds(p_period) limit 1;
  v_rates := public.finance_rates();

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
  into v_sales from public.coin_purchases cp
  where coalesce(cp.status,'completed')='completed'
    and cp.created_at >= b.period_start and cp.created_at <= b.period_end;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
  into v_refunds from public.coin_purchases cp
  where cp.status in ('refunded','reversed')
    and cp.created_at >= b.period_start and cp.created_at <= b.period_end;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
  into v_chargebacks from public.coin_purchases cp
  where cp.status='chargeback'
    and cp.created_at >= b.period_start and cp.created_at <= b.period_end;

  select coalesce(sum(fe.amount),0) into v_expense
  from public.finance_expenses fe
  where fe.payment_status='paid' and fe.currency='TRY'
    and fe.expense_date >= (timezone('Europe/Istanbul', b.period_start))::date
    and fe.expense_date <= (timezone('Europe/Istanbul', b.period_end))::date;

  v_store := round(v_sales * coalesce((v_rates->>'iap_store_fee_estimate')::numeric,0.3), 2);
  select coalesce(sum(he.diamonds),0)*(v_rates->>'diamond_try')::numeric into v_creator from public.host_earnings he;
  select coalesce(sum(aw.diamonds),0)*(v_rates->>'diamond_try')::numeric into v_agency from public.agency_wallets aw;

  return jsonb_build_object(
    'ok', true,
    'period', b.period_key,
    'period_start', b.period_start,
    'period_end', b.period_end,
    'brut_revenue_try', round(v_sales,2),
    'coin_sales_try', round(v_sales,2),
    'refunds_try', round(-v_refunds,2),
    'chargebacks_try', round(-v_chargebacks,2),
    'platform_costs_try', round(-v_expense,2),
    'store_fees_estimate_try', round(-v_store,2),
    'agency_payable_try', round(-v_agency,2),
    'creator_payable_try', round(-v_creator,2),
    'net_operational_result_try', round(v_sales - v_refunds - v_chargebacks - v_expense - v_store, 2),
    'note', 'Operational finance â€” not tax accounting'
  );
end;
$$;

grant execute on function public.admin_finance_revenue(text) to authenticated;

-- ========== SALES ==========
create or replace function public.admin_finance_sales(p_period text default 'today', p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  v_limit int := least(greatest(coalesce(p_limit,50),1),200);
  v_agencies jsonb;
  v_users jsonb;
  v_total numeric; v_coins bigint;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select * into b from public.finance_period_bounds(p_period) limit 1;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0),
         coalesce(sum(cp.coins_added),0)::bigint
  into v_total, v_coins
  from public.coin_purchases cp
  where coalesce(cp.status,'completed')='completed'
    and cp.created_at >= b.period_start and cp.created_at <= b.period_end;

  -- Agency attributed: via host_profiles.agency_id of purchaser OR agency_tracked_sales / agency_coin_transfers
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.sales_try desc), '[]'::jsonb)
  into v_agencies from (
    select
      a.id as agency_id,
      a.name as agency_name,
      a.agency_public_id,
      coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0) as sales_try,
      coalesce(sum(cp.coins_added),0)::bigint as coins,
      count(*)::bigint as purchase_count
    from public.coin_purchases cp
    join public.host_profiles hp on hp.user_id = cp.user_id
    join public.agencies a on a.id = hp.agency_id
    where coalesce(cp.status,'completed')='completed'
      and cp.created_at >= b.period_start and cp.created_at <= b.period_end
      and hp.agency_id is not null
    group by a.id, a.name, a.agency_public_id
    order by 4 desc
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.sales_try desc), '[]'::jsonb)
  into v_users from (
    select
      p.id as user_id,
      coalesce(nullif(trim(p.display_name),''), nullif(trim(p.username),''), 'KullanÄ±cÄ±') as display_name,
      p.username,
      p.public_user_id,
      a.name as agency_name,
      a.id as agency_id,
      coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0) as sales_try,
      coalesce(sum(cp.coins_added),0)::bigint as coins,
      count(*)::bigint as purchase_count
    from public.coin_purchases cp
    join public.profiles p on p.id = cp.user_id
    left join public.host_profiles hp on hp.user_id = p.id
    left join public.agencies a on a.id = hp.agency_id
    where coalesce(cp.status,'completed')='completed'
      and cp.created_at >= b.period_start and cp.created_at <= b.period_end
    group by p.id, p.display_name, p.username, p.public_user_id, a.name, a.id
    order by 7 desc
    limit v_limit
  ) t;

  return jsonb_build_object(
    'ok', true,
    'period', b.period_key,
    'period_start', b.period_start,
    'period_end', b.period_end,
    'total_sales_try', round(v_total,2),
    'total_coins', v_coins,
    'top_agencies', v_agencies,
    'user_sales', v_users
  );
end;
$$;

grant execute on function public.admin_finance_sales(text, int) to authenticated;

