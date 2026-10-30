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

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.ts desc), '[]'::jsonb)
  into v_timeline from (
    select
      wl.id as transaction_id,
      wl.ref_id as reference_id,
      wl.created_at as ts,
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

-- ========== EXPENSES ==========
create or replace function public.admin_finance_expenses_list(p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.expense_date desc, t.created_at desc), '[]'::jsonb)
  into v_rows from (
    select * from public.finance_expenses
    order by expense_date desc, created_at desc
    limit least(greatest(coalesce(p_limit,50),1),200)
    offset greatest(coalesce(p_offset,0),0)
  ) t;
  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.admin_finance_expenses_list(int, int) to authenticated;

create or replace function public.admin_finance_expense_upsert(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_before jsonb;
  v_row public.finance_expenses%rowtype;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;

  if v_id is not null then
    select to_jsonb(fe) into v_before from public.finance_expenses fe where fe.id=v_id;
    update public.finance_expenses set
      amount = coalesce((p->>'amount')::numeric, amount),
      currency = coalesce(nullif(p->>'currency',''), currency),
      category = coalesce(nullif(p->>'category',''), category),
      description = coalesce(p->>'description', description),
      vendor = coalesce(p->>'vendor', vendor),
      expense_date = coalesce((p->>'expense_date')::date, expense_date),
      payment_status = coalesce(nullif(p->>'payment_status',''), payment_status),
      reference = coalesce(p->>'reference', reference),
      updated_at = now()
    where id = v_id
    returning * into v_row;
  else
    insert into public.finance_expenses (
      amount, currency, category, description, vendor, expense_date, payment_status, reference, created_by
    ) values (
      (p->>'amount')::numeric,
      coalesce(nullif(p->>'currency',''),'TRY'),
      p->>'category',
      p->>'description',
      p->>'vendor',
      coalesce((p->>'expense_date')::date, (timezone('Europe/Istanbul', now()))::date),
      coalesce(nullif(p->>'payment_status',''),'paid'),
      p->>'reference',
      auth.uid()
    ) returning * into v_row;
  end if;

  perform public.finance_audit_yaz(
    case when v_id is null then 'expense_create' else 'expense_update' end,
    'finance_expense', v_row.id::text, v_before, to_jsonb(v_row), '{}'::jsonb
  );
  update public.finance_snapshot_state set dirty = true where id = 1;
  return jsonb_build_object('ok', true, 'item', to_jsonb(v_row));
end;
$$;

grant execute on function public.admin_finance_expense_upsert(jsonb) to authenticated;

-- ========== SETTINGS / SIMULATE ==========
create or replace function public.admin_finance_settings_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  return jsonb_build_object('ok', true, 'rates', public.finance_rates());
end;
$$;

grant execute on function public.admin_finance_settings_get() to authenticated;

create or replace function public.admin_finance_settings_update(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;
  select to_jsonb(fs) into v_before from public.finance_settings fs where id=1;
  update public.finance_settings set
    apple_fee_rate = coalesce((p->>'apple_fee_rate')::numeric, apple_fee_rate),
    google_fee_rate = coalesce((p->>'google_fee_rate')::numeric, google_fee_rate),
    payment_processor_rate = coalesce((p->>'payment_processor_rate')::numeric, payment_processor_rate),
    refund_reserve_rate = coalesce((p->>'refund_reserve_rate')::numeric, refund_reserve_rate),
    agency_commission_rate = coalesce((p->>'agency_commission_rate')::numeric, agency_commission_rate),
    platform_commission_rate = coalesce((p->>'platform_commission_rate')::numeric, platform_commission_rate),
    coin_liability_enabled = coalesce((p->>'coin_liability_enabled')::boolean, coin_liability_enabled),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;
  select to_jsonb(fs) into v_after from public.finance_settings fs where id=1;
  perform public.finance_audit_yaz('settings_update','finance_settings','1', v_before, v_after, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'rates', public.finance_rates());
end;
$$;

grant execute on function public.admin_finance_settings_update(jsonb) to authenticated;

create or replace function public.admin_finance_simulate(p_coin_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rates jsonb := public.finance_rates();
  v_coins bigint := greatest(coalesce(p_coin_amount,0),0);
  v_gross numeric;
  v_apple numeric; v_google numeric; v_proc numeric; v_reserve numeric;
  v_agency numeric; v_creator numeric; v_platform numeric;
  v_net numeric;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  v_gross := round(v_coins * (v_rates->>'coin_try')::numeric, 2);
  v_apple := round(v_gross * (v_rates->>'apple_fee_rate')::numeric, 2);
  v_google := round(v_gross * (v_rates->>'google_fee_rate')::numeric, 2);
  v_proc := round(v_gross * (v_rates->>'payment_processor_rate')::numeric, 2);
  v_reserve := round(v_gross * (v_rates->>'refund_reserve_rate')::numeric, 2);
  -- If all gifted path
  v_creator := round(v_gross * (v_rates->>'gift_host_share')::numeric * (1 - (v_rates->>'agency_commission_rate')::numeric), 2);
  v_agency := round(v_gross * (v_rates->>'gift_host_share')::numeric * (v_rates->>'agency_commission_rate')::numeric, 2);
  v_platform := round(v_gross - v_apple - v_proc - v_reserve - v_creator - v_agency, 2);
  v_net := v_platform;

  return jsonb_build_object(
    'ok', true,
    'is_estimate', true,
    'badge', 'TAHMÄ°N',
    'coin_amount', v_coins,
    'gross_sales_try', v_gross,
    'estimated_apple_fee_try', v_apple,
    'estimated_google_fee_try', v_google,
    'estimated_processor_fee_try', v_proc,
    'refund_reserve_try', v_reserve,
    'estimated_creator_liability_try', v_creator,
    'estimated_agency_liability_try', v_agency,
    'estimated_platform_contribution_try', v_platform,
    'estimated_net_try', v_net,
    'rates', v_rates
  );
end;
$$;

grant execute on function public.admin_finance_simulate(bigint) to authenticated;

-- ========== ALERTS ==========
create or replace function public.admin_finance_alerts_list(p_status text default 'open', p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_rows jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_rows from (
    select * from public.finance_alerts
    where (p_status is null or status = p_status)
    order by created_at desc
    limit least(greatest(coalesce(p_limit,50),1),200)
  ) t;
  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.admin_finance_alerts_list(text, int) to authenticated;

create or replace function public.admin_finance_alert_ack(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;
  update public.finance_alerts
  set status='acked', acked_at=now(), acked_by=auth.uid()
  where id=p_id;
  perform public.finance_audit_yaz('alert_ack','finance_alert', p_id::text, null, null, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_finance_alert_ack(uuid) to authenticated;

-- ========== RECONCILE ==========
create or replace function public.admin_finance_reconcile_run(
  p_source text default 'wallet_ledger',
  p_external_amount numeric default null,
  p_period text default 'month'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  v_run_id text;
  v_id uuid;
  v_internal numeric := 0;
  v_matched bigint := 0;
  v_unmatched bigint := 0;
  v_diff numeric := 0;
  v_status text := 'ok';
  v_mismatch_users bigint := 0;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;
  select * into b from public.finance_period_bounds(p_period) limit 1;
  v_run_id := 'REC-' || to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD-HH24MISS')
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  if p_source in ('wallet_ledger','coin_ledger') then
    select count(*) into v_mismatch_users from (
      select w.user_id
      from public.wallets w
      left join lateral (
        select wl.balance_after
        from public.wallet_ledger wl
        where wl.user_id=w.user_id and wl.currency='coins'
        order by wl.created_at desc, wl.id desc limit 1
      ) last_l on true
      where coalesce(w.coins,0) <> coalesce(last_l.balance_after,0)
      limit 5000
    ) x;
    v_unmatched := v_mismatch_users;
    v_matched := (select count(*) from public.wallets) - v_unmatched;
    v_diff := v_unmatched;
    if v_unmatched > 0 then
      v_status := 'review_required';
      insert into public.finance_alerts (alert_type, severity, title, body, meta)
      values (
        'LEDGER_BALANCE_MISMATCH', 'danger',
        'Ledger/Wallet mismatch',
        v_unmatched::text || ' kullanÄ±cÄ±da wallet ile ledger uyuÅŸmazlÄ±ÄŸÄ±',
        jsonb_build_object('mismatch_users', v_unmatched)
      );
    end if;
  elsif p_source in ('apple','google','stripe') then
    select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
    into v_internal
    from public.coin_purchases cp
    where coalesce(cp.status,'completed')='completed'
      and cp.created_at >= b.period_start and cp.created_at <= b.period_end
      and (
        (p_source='apple' and lower(coalesce(cp.store,cp.provider,'')) in ('apple','ios','app_store'))
        or (p_source='google' and lower(coalesce(cp.store,cp.provider,'')) in ('google','android','play'))
        or (p_source='stripe' and lower(coalesce(cp.provider,cp.store,'')) like '%stripe%')
        or true
      );
    v_diff := round(coalesce(p_external_amount,0) - v_internal, 2);
    if abs(v_diff) > 0.01 then
      v_status := 'review_required';
      v_unmatched := 1;
    else
      v_matched := 1;
    end if;
  else
    -- summary vs ledger sales
    perform public.finance_snapshot_yenile('daily');
    select coalesce(s.cash_try,0) into v_internal
    from public.finance_daily_snapshots s
    where s.day = (timezone('Europe/Istanbul', now()))::date;
    select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
    into v_diff
    from public.coin_purchases cp
    where coalesce(cp.status,'completed')='completed'
      and cp.created_at >= public.finance_istanbul_day_start(now());
    v_diff := round(v_internal - v_diff, 2);
    if abs(v_diff) > 0.01 then v_status := 'review_required'; v_unmatched := 1; else v_matched := 1; end if;
  end if;

  insert into public.finance_reconciliation_runs (
    run_id, period_start, period_end, source, matched_count, unmatched_count, difference_try, status, meta, created_by
  ) values (
    v_run_id,
    (timezone('Europe/Istanbul', b.period_start))::date,
    (timezone('Europe/Istanbul', b.period_end))::date,
    p_source, v_matched, v_unmatched, coalesce(v_diff,0), v_status,
    jsonb_build_object('internal_amount', v_internal, 'external_amount', p_external_amount),
    auth.uid()
  ) returning id into v_id;

  insert into public.finance_reconciliation_items (run_id, item_key, external_amount, internal_amount, difference, status)
  values (v_id, p_source, p_external_amount, v_internal, v_diff, v_status);

  perform public.finance_audit_yaz('reconcile_run','finance_reconciliation', v_id::text, null,
    jsonb_build_object('run_id', v_run_id, 'status', v_status, 'difference', v_diff), '{}'::jsonb);

  return jsonb_build_object(
    'ok', true,
    'run_id', v_run_id,
    'id', v_id,
    'source', p_source,
    'matched', v_matched,
    'unmatched', v_unmatched,
    'difference_try', v_diff,
    'internal_amount', v_internal,
    'external_amount', p_external_amount,
    'status', v_status
  );
end;
$$;

grant execute on function public.admin_finance_reconcile_run(text, numeric, text) to authenticated;

-- ========== SEARCH ==========
create or replace function public.admin_finance_search(p_q text, p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := trim(coalesce(p_q,''));
  v_limit int := least(greatest(coalesce(p_limit,20),1),50);
  v_users jsonb; v_agencies jsonb; v_tx jsonb; v_reports jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  if length(v_q) < 2 then
    return jsonb_build_object('ok', true, 'users','[]'::jsonb,'agencies','[]'::jsonb,'transactions','[]'::jsonb,'reports','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) into v_users from (
    select id, username, display_name, public_user_id from public.profiles
    where username ilike '%'||v_q||'%' or display_name ilike '%'||v_q||'%'
       or public_user_id::text ilike '%'||v_q||'%' or id::text ilike v_q||'%'
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) into v_agencies from (
    select id, name, agency_public_id from public.agencies
    where name ilike '%'||v_q||'%' or agency_public_id::text ilike '%'||v_q||'%' or id::text ilike v_q||'%'
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) into v_tx from (
    select id, event_type, title, amount_coin, amount_try, created_at, ref_id
    from public.finance_live_events
    where id::text ilike v_q||'%' or ref_id ilike '%'||v_q||'%' or title ilike '%'||v_q||'%'
    order by created_at desc limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) into v_reports from (
    select id, report_id, report_type, status, created_at from public.finance_report_jobs
    where report_id ilike '%'||v_q||'%' or id::text ilike v_q||'%'
    order by created_at desc limit v_limit
  ) t;

  return jsonb_build_object('ok', true, 'users', v_users, 'agencies', v_agencies, 'transactions', v_tx, 'reports', v_reports);
end;
$$;

grant execute on function public.admin_finance_search(text, int) to authenticated;

-- ========== REPORTS ==========
create or replace function public.admin_finance_report_create(p_report_type text, p_filters jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id text;
  v_id uuid;
  v_payload jsonb;
  v_period text := coalesce(p_filters->>'period', 'month');
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;

  v_report_id := 'FIN-' || to_char(timezone('Europe/Istanbul', now()), 'YYYY') || '-' ||
    lpad(nextval('public.finance_report_seq')::text, 6, '0');

  v_payload := jsonb_build_object(
    'report_type', p_report_type,
    'filters', coalesce(p_filters, '{}'::jsonb),
    'generated_at', now(),
    'overview', public.admin_finance_overview(),
    'coin_economy', public.admin_finance_coin_economy(),
    'liabilities', public.admin_finance_liabilities(),
    'pnl', public.admin_finance_pnl(),
    'revenue', public.admin_finance_revenue(v_period),
    'sales', public.admin_finance_sales(v_period, 30)
  );

  insert into public.finance_report_jobs (
    report_id, report_type, filters, status, payload, created_by, ready_at
  ) values (
    v_report_id, p_report_type, coalesce(p_filters,'{}'::jsonb), 'ready', v_payload, auth.uid(), now()
  ) returning id into v_id;

  insert into public.finance_report_snapshots (report_job_id, period_start, period_end, payload)
  values (
    v_id,
    (timezone('Europe/Istanbul', public.finance_istanbul_month_start(now())))::date,
    (timezone('Europe/Istanbul', now()))::date,
    v_payload
  );

  perform public.finance_audit_yaz('report_create','finance_report', v_id::text, null,
    jsonb_build_object('report_id', v_report_id, 'type', p_report_type, 'filters', p_filters), '{}'::jsonb);

  return jsonb_build_object('ok', true, 'id', v_id, 'report_id', v_report_id, 'status', 'ready', 'payload', v_payload);
end;
$$;

grant execute on function public.admin_finance_report_create(text, jsonb) to authenticated;

create or replace function public.admin_finance_report_list(p_limit int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_rows jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_rows from (
    select id, report_id, report_type, filters, status, storage_path, created_at, ready_at, created_by
    from public.finance_report_jobs
    order by created_at desc
    limit least(greatest(coalesce(p_limit,30),1),100)
  ) t;
  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.admin_finance_report_list(int) to authenticated;

create or replace function public.admin_finance_report_get(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.finance_report_jobs%rowtype;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select * into v_row from public.finance_report_jobs where id=p_id;
  if not found then raise exception 'Report not found'; end if;
  perform public.finance_audit_yaz('report_view','finance_report', p_id::text, null, null,
    jsonb_build_object('report_id', v_row.report_id));
  return jsonb_build_object('ok', true, 'job', to_jsonb(v_row));
end;
$$;

grant execute on function public.admin_finance_report_get(uuid) to authenticated;

create or replace function public.admin_finance_report_attach_storage(p_id uuid, p_storage_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;
  update public.finance_report_jobs
  set storage_path = p_storage_path, status='ready', ready_at=now()
  where id=p_id;
  perform public.finance_audit_yaz('report_pdf_attach','finance_report', p_id::text, null,
    jsonb_build_object('storage_path', p_storage_path), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_finance_report_attach_storage(uuid, text) to authenticated;

-- signed URL helper note: client uses supabase.storage.createSignedUrl after auth check via report_get
create or replace function public.admin_finance_report_signed_url_audit(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_path text;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select storage_path into v_path from public.finance_report_jobs where id=p_id;
  perform public.finance_audit_yaz('report_signed_url','finance_report', p_id::text, null,
    jsonb_build_object('storage_path', v_path), '{}'::jsonb);
  return jsonb_build_object('ok', true, 'storage_path', v_path, 'ttl_seconds', 600);
end;
$$;

grant execute on function public.admin_finance_report_signed_url_audit(uuid) to authenticated;

-- ========== ROLE ADMIN ==========
create or replace function public.admin_finance_role_ayarla(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.finance_yetkisi_var_mi('SUPER_ADMIN') then
    raise exception 'Forbidden: super admin required';
  end if;
  insert into public.finance_admin_roles (user_id, role, created_by, updated_at)
  values (p_user_id, p_role, auth.uid(), now())
  on conflict (user_id) do update set role=excluded.role, updated_at=now();
  perform public.finance_audit_yaz('role_set','finance_admin_roles', p_user_id::text, null,
    jsonb_build_object('role', p_role), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_finance_role_ayarla(uuid, text) to authenticated;

-- ========== anomaly scan ==========
create or replace function public.admin_finance_anomaly_scan()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created int := 0;
  r record;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;

  for r in
    select w.user_id, w.coins
    from public.wallets w
    where w.coins < 0
    limit 50
  loop
    insert into public.finance_alerts (alert_type, severity, title, body, entity_type, entity_id)
    select 'NEGATIVE_BALANCE', 'danger', 'Negative coin balance',
           'User has negative wallet coins: '||r.coins::text, 'user', r.user_id::text
    where not exists (
      select 1 from public.finance_alerts fa
      where fa.alert_type='NEGATIVE_BALANCE' and fa.entity_id=r.user_id::text and fa.status='open'
    );
    v_created := v_created + 1;
  end loop;

  for r in
    select cp.user_id, sum(cp.coins_added) as coins
    from public.coin_purchases cp
    where coalesce(cp.status,'completed')='completed'
      and cp.created_at > now() - interval '1 hour'
    group by cp.user_id
    having sum(cp.coins_added) > 500000
    limit 50
  loop
    insert into public.finance_alerts (alert_type, severity, title, body, entity_type, entity_id, meta)
    select 'UNUSUAL_COIN_PURCHASE', 'warning', 'Unusual coin purchase',
           'Last hour purchases: '||r.coins::text||' coins', 'user', r.user_id::text,
           jsonb_build_object('coins', r.coins)
    where not exists (
      select 1 from public.finance_alerts fa
      where fa.alert_type='UNUSUAL_COIN_PURCHASE' and fa.entity_id=r.user_id::text
        and fa.status='open' and fa.created_at > now() - interval '6 hours'
    );
    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('ok', true, 'alerts_touched', v_created);
end;
$$;

grant execute on function public.admin_finance_anomaly_scan() to authenticated;

