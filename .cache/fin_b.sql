-- ---------- period helpers ----------
create or replace function public.finance_istanbul_day_start(p_ts timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select date_trunc('day', timezone('Europe/Istanbul', p_ts)) at time zone 'Europe/Istanbul';
$$;

create or replace function public.finance_istanbul_month_start(p_ts timestamptz default now())
returns timestamptz
language sql
stable
as $$
  select date_trunc('month', timezone('Europe/Istanbul', p_ts)) at time zone 'Europe/Istanbul';
$$;

create or replace function public.finance_period_bounds(p_period text)
returns table (period_key text, period_start timestamptz, period_end timestamptz)
language plpgsql
stable
as $$
declare
  v text := lower(trim(coalesce(p_period, 'today')));
  v_now timestamptz := now();
  v_start timestamptz;
  v_end timestamptz := v_now;
begin
  if v in ('today','bugun','day','gun') then
    period_key := 'today';
    v_start := public.finance_istanbul_day_start(v_now);
  elsif v in ('yesterday','dun') then
    period_key := 'yesterday';
    v_start := public.finance_istanbul_day_start(v_now) - interval '1 day';
    v_end := public.finance_istanbul_day_start(v_now);
  elsif v in ('7d','last_7_days','son_7_gun','week') then
    period_key := '7d';
    v_start := v_now - interval '7 days';
  elsif v in ('30d','last_30_days','son_30_gun') then
    period_key := '30d';
    v_start := v_now - interval '30 days';
  elsif v in ('month','bu_ay','this_month') then
    period_key := 'month';
    v_start := public.finance_istanbul_month_start(v_now);
  elsif v in ('last_month','gecen_ay') then
    period_key := 'last_month';
    v_start := public.finance_istanbul_month_start(v_now) - interval '1 month';
    v_end := public.finance_istanbul_month_start(v_now);
  else
    period_key := 'all';
    v_start := '1970-01-01'::timestamptz;
  end if;
  period_start := v_start;
  period_end := v_end;
  return next;
end;
$$;

-- ---------- economy rates helper ----------
create or replace function public.finance_rates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e public.platform_economy_config%rowtype;
  f public.finance_settings%rowtype;
begin
  select * into e from public.platform_economy_config where id = 1;
  select * into f from public.finance_settings where id = 1;
  return jsonb_build_object(
    'coin_try', coalesce(e.coin_try, 0.10),
    'diamond_try', coalesce(e.diamond_try, 0.10),
    'gift_host_share', coalesce(e.gift_host_share, 0.80),
    'default_agency_share', coalesce(e.default_agency_share, 0.20),
    'iap_store_fee_estimate', coalesce(e.iap_store_fee_estimate, 0.30),
    'apple_fee_rate', coalesce(f.apple_fee_rate, 0.30),
    'google_fee_rate', coalesce(f.google_fee_rate, 0.15),
    'payment_processor_rate', coalesce(f.payment_processor_rate, 0.029),
    'refund_reserve_rate', coalesce(f.refund_reserve_rate, 0.02),
    'agency_commission_rate', coalesce(f.agency_commission_rate, 0.20),
    'platform_commission_rate', coalesce(f.platform_commission_rate, 0.10),
    'coin_liability_enabled', coalesce(f.coin_liability_enabled, false)
  );
end;
$$;

-- ---------- snapshot refresh ----------
create or replace function public.finance_snapshot_yenile(p_grain text default 'daily')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (timezone('Europe/Istanbul', now()))::date;
  v_day_start timestamptz := public.finance_istanbul_day_start(now());
  v_month_start timestamptz := public.finance_istanbul_month_start(now());
  v_coin_try numeric;
  v_dia_try numeric;
  v_coin_sold bigint;
  v_cash numeric;
  v_refunds numeric := 0;
  v_chargebacks numeric := 0;
  v_supply bigint;
  v_spent bigint;
  v_bonus bigint;
  v_game bigint;
  v_promo bigint;
  v_gift bigint;
  v_creator_pay numeric;
  v_agency_pay numeric;
  v_pending_wd numeric;
  v_pending_ref numeric;
  v_expense numeric;
  v_purchases bigint;
  v_rev numeric;
  v_net numeric;
  v_hour timestamptz;
begin
  select coalesce(coin_try, 0.10), coalesce(diamond_try, 0.10)
  into v_coin_try, v_dia_try
  from public.platform_economy_config where id = 1;

  select
    coalesce(sum(cp.coins_added), 0)::bigint,
    coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0),
    count(*)::bigint
  into v_coin_sold, v_cash, v_purchases
  from public.coin_purchases cp
  where coalesce(cp.status, 'completed') = 'completed'
    and cp.created_at >= v_day_start;

  select coalesce(sum(w.coins), 0)::bigint into v_supply from public.wallets w;

  select coalesce(sum(case when wl.delta < 0 then -wl.delta else 0 end), 0)::bigint
  into v_spent
  from public.wallet_ledger wl
  where wl.currency = 'coins'
    and wl.created_at >= v_day_start
    and wl.reason in ('gift','game_spend','game','send_gift','transfer_out','admin_deduct','admin_penalty');

  select coalesce(sum(case when wl.delta > 0 then wl.delta else 0 end), 0)::bigint
  into v_bonus
  from public.wallet_ledger wl
  where wl.currency = 'coins'
    and wl.created_at >= v_day_start
    and wl.reason in ('bonus','bonus_coin','admin_topup','promotional','promo');

  select coalesce(sum(case when wl.delta > 0 then wl.delta else 0 end), 0)::bigint
  into v_game
  from public.wallet_ledger wl
  where wl.currency = 'coins'
    and wl.created_at >= v_day_start
    and wl.reason in ('game_reward','game_win','fruit_wheel_win');

  select coalesce(sum(case when wl.delta > 0 then wl.delta else 0 end), 0)::bigint
  into v_promo
  from public.wallet_ledger wl
  where wl.currency = 'coins'
    and wl.created_at >= v_day_start
    and wl.reason in ('promotional','promo','promotional_coin');

  select coalesce(sum(gt.coins_spent), 0)::bigint
  into v_gift
  from public.gift_transactions gt
  where gt.created_at >= v_day_start;

  select coalesce(sum(he.diamonds), 0) * v_dia_try into v_creator_pay from public.host_earnings he;
  select coalesce(sum(aw.diamonds), 0) * v_dia_try into v_agency_pay from public.agency_wallets aw;

  select coalesce(sum(coalesce(wr.amount_usd, 0) * 34.0), 0) -- fallback USD*FX if no try; prefer diamonds*rate
  into v_pending_wd
  from public.withdrawal_requests wr
  where wr.status in ('pending', 'approved', 'processing');

  -- Prefer diamond-based pending withdrawal valuation
  select coalesce(sum(wr.diamonds), 0) * v_dia_try
  into v_pending_wd
  from public.withdrawal_requests wr
  where wr.status in ('pending', 'approved', 'processing');

  select coalesce(sum(
    coalesce((pd.purchase_snapshot->>'amount_try')::numeric, 0)
  ), 0)
  into v_pending_ref
  from public.purchase_disputes pd
  where pd.status in ('pending', 'open', 'review');

  select coalesce(sum(fe.amount), 0)
  into v_expense
  from public.finance_expenses fe
  where fe.payment_status = 'paid'
    and fe.expense_date = v_day
    and fe.currency = 'TRY';

  -- Monthly refunds/chargebacks approximation from ledger reasons / disputes resolved
  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0)
  into v_refunds
  from public.coin_purchases cp
  where cp.status in ('refunded', 'reversed')
    and cp.created_at >= v_day_start;

  select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0)
  into v_chargebacks
  from public.coin_purchases cp
  where cp.status in ('chargeback')
    and cp.created_at >= v_day_start;

  v_rev := v_cash - v_refunds - v_chargebacks;
  v_net := v_rev - v_expense;

  insert into public.finance_daily_snapshots as s (
    day, coin_sold, cash_try, cash_try_refunds, cash_try_chargebacks,
    user_coin_supply, coin_spent, coin_bonus, coin_game, coin_promo,
    gift_volume_coins, creator_payable_try, agency_payable_try,
    pending_withdrawals_try, pending_refunds_try, expense_try,
    platform_revenue_try, net_operational_try, purchase_count, computed_at
  ) values (
    v_day, v_coin_sold, v_cash, v_refunds, v_chargebacks,
    v_supply, v_spent, v_bonus, v_game, v_promo,
    v_gift, round(v_creator_pay, 2), round(v_agency_pay, 2),
    round(v_pending_wd, 2), round(v_pending_ref, 2), round(v_expense, 2),
    round(v_rev, 2), round(v_net, 2), v_purchases, now()
  )
  on conflict (day) do update set
    coin_sold = excluded.coin_sold,
    cash_try = excluded.cash_try,
    cash_try_refunds = excluded.cash_try_refunds,
    cash_try_chargebacks = excluded.cash_try_chargebacks,
    user_coin_supply = excluded.user_coin_supply,
    coin_spent = excluded.coin_spent,
    coin_bonus = excluded.coin_bonus,
    coin_game = excluded.coin_game,
    coin_promo = excluded.coin_promo,
    gift_volume_coins = excluded.gift_volume_coins,
    creator_payable_try = excluded.creator_payable_try,
    agency_payable_try = excluded.agency_payable_try,
    pending_withdrawals_try = excluded.pending_withdrawals_try,
    pending_refunds_try = excluded.pending_refunds_try,
    expense_try = excluded.expense_try,
    platform_revenue_try = excluded.platform_revenue_try,
    net_operational_try = excluded.net_operational_try,
    purchase_count = excluded.purchase_count,
    computed_at = now();

  if lower(coalesce(p_grain, 'daily')) in ('hourly', 'all') then
    v_hour := date_trunc('hour', now());
    insert into public.finance_hourly_snapshots as h (
      hour_start, coin_sold, cash_try, coin_spent, gift_volume_coins, purchase_count, computed_at
    )
    select
      v_hour,
      coalesce(sum(cp.coins_added), 0)::bigint,
      coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)), 0),
      coalesce((
        select sum(case when wl.delta < 0 then -wl.delta else 0 end)
        from public.wallet_ledger wl
        where wl.currency = 'coins' and wl.created_at >= v_hour
      ), 0)::bigint,
      coalesce((
        select sum(gt.coins_spent) from public.gift_transactions gt where gt.created_at >= v_hour
      ), 0)::bigint,
      count(*)::bigint,
      now()
    from public.coin_purchases cp
    where coalesce(cp.status, 'completed') = 'completed'
      and cp.created_at >= v_hour
    on conflict (hour_start) do update set
      coin_sold = excluded.coin_sold,
      cash_try = excluded.cash_try,
      coin_spent = excluded.coin_spent,
      gift_volume_coins = excluded.gift_volume_coins,
      purchase_count = excluded.purchase_count,
      computed_at = now();
  end if;

  update public.finance_snapshot_state
  set dirty = false, last_refreshed_at = now(), last_error = null
  where id = 1;

  return jsonb_build_object('ok', true, 'day', v_day, 'refreshed_at', now());
exception when others then
  update public.finance_snapshot_state
  set last_error = SQLERRM, dirty = true
  where id = 1;
  raise;
end;
$$;

create or replace function public.finance_snapshot_ensure_fresh()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_state public.finance_snapshot_state%rowtype;
begin
  select * into v_state from public.finance_snapshot_state where id = 1;
  if v_state.dirty or v_state.last_refreshed_at is null
     or v_state.last_refreshed_at < now() - interval '5 minutes' then
    perform public.finance_snapshot_yenile('all');
  end if;
end;
$$;

-- ---------- live event projection triggers ----------
create or replace function public.finance_live_on_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_try numeric;
begin
  if coalesce(new.status, 'completed') <> 'completed' then
    return new;
  end if;
  select coalesce(nullif(trim(p.username), ''), nullif(trim(p.display_name), ''), 'user')
  into v_name from public.profiles p where p.id = new.user_id;
  v_try := public.ciro_try_hesapla(new.amount_try, new.package_id, new.amount_usd);
  insert into public.finance_live_events (
    event_type, user_id, amount_coin, amount_try, title, subtitle, ref_type, ref_id
  ) values (
    'COIN_PURCHASE', new.user_id, new.coins_added, v_try,
    coalesce(v_name, 'user'),
    'Coin Purchase · ' || coalesce(new.provider, new.store, 'iap'),
    'coin_purchase', new.id::text
  );
  update public.finance_snapshot_state set dirty = true where id = 1;
  return new;
end;
$$;

drop trigger if exists trg_finance_live_purchase on public.coin_purchases;
create trigger trg_finance_live_purchase
  after insert or update of status on public.coin_purchases
  for each row execute function public.finance_live_on_purchase();

create or replace function public.finance_live_on_gift()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(nullif(trim(p.username), ''), nullif(trim(p.display_name), ''), 'user')
  into v_name from public.profiles p where p.id = new.sender_id;
  insert into public.finance_live_events (
    event_type, user_id, agency_id, amount_coin, title, subtitle, ref_type, ref_id
  ) values (
    'GIFT_SENT', new.sender_id, new.agency_id, new.coins_spent,
    coalesce(v_name, 'user'),
    'Gift · -' || new.coins_spent::text || ' Coin',
    'gift', new.id::text
  );
  update public.finance_snapshot_state set dirty = true where id = 1;
  return new;
end;
$$;

drop trigger if exists trg_finance_live_gift on public.gift_transactions;
create trigger trg_finance_live_gift
  after insert on public.gift_transactions
  for each row execute function public.finance_live_on_gift();

-- ---------- storage bucket (private) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('finance-reports', 'finance-reports', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists finance_reports_storage_select on storage.objects;
create policy finance_reports_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'finance-reports' and public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

drop policy if exists finance_reports_storage_insert on storage.objects;
create policy finance_reports_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'finance-reports' and public.finance_yetkisi_var_mi('FINANCE_ADMIN'));

drop policy if exists finance_reports_storage_update on storage.objects;
create policy finance_reports_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'finance-reports' and public.finance_yetkisi_var_mi('FINANCE_ADMIN'))
  with check (bucket_id = 'finance-reports' and public.finance_yetkisi_var_mi('FINANCE_ADMIN'));

-- Enable realtime for live events (idempotent)
do $$
begin
  begin
    alter publication supabase_realtime add table public.finance_live_events;
  exception when duplicate_object then
    null;
  when undefined_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.finance_hourly_snapshots;
  exception when duplicate_object then
    null;
  when undefined_object then
    null;
  end;
end $$;
