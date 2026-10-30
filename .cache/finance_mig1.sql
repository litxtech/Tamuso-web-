-- ============================================================
-- Tamuso Finance Control Center
-- Ledger SoT = existing wallet/host/agency ledgers (no duplicate write ledger)
-- New layer = aggregation, expenses, alerts, reports, RBAC, snapshots
-- ============================================================

-- ---------- helpers: finance RBAC ----------
create table if not exists public.finance_admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in (
    'SUPER_ADMIN','FINANCE_ADMIN','AGENCY_ADMIN','SUPPORT_ADMIN','AUDITOR','READ_ONLY_FINANCE'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.finance_admin_roles enable row level security;

create or replace function public.finance_rolum()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if public.ben_admin_miyim() then
    return 'SUPER_ADMIN';
  end if;
  select role into v_role
  from public.finance_admin_roles
  where user_id = auth.uid();
  return v_role;
end;
$$;

create or replace function public.finance_yetkisi_var_mi(p_min_role text default 'READ_ONLY_FINANCE')
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := public.finance_rolum();
  v_rank int;
  v_need int;
begin
  if v_role is null then
    return false;
  end if;
  v_rank := case v_role
    when 'SUPER_ADMIN' then 100
    when 'FINANCE_ADMIN' then 80
    when 'AUDITOR' then 60
    when 'AGENCY_ADMIN' then 50
    when 'SUPPORT_ADMIN' then 40
    when 'READ_ONLY_FINANCE' then 20
    else 0
  end;
  v_need := case upper(coalesce(p_min_role, 'READ_ONLY_FINANCE'))
    when 'SUPER_ADMIN' then 100
    when 'FINANCE_ADMIN' then 80
    when 'AUDITOR' then 60
    when 'AGENCY_ADMIN' then 50
    when 'SUPPORT_ADMIN' then 40
    when 'WRITE_FINANCE' then 80
    else 20
  end;
  return v_rank >= v_need;
end;
$$;

grant execute on function public.finance_rolum() to authenticated;
grant execute on function public.finance_yetkisi_var_mi(text) to authenticated;

drop policy if exists finance_admin_roles_select on public.finance_admin_roles;
create policy finance_admin_roles_select on public.finance_admin_roles
  for select to authenticated
  using (public.finance_yetkisi_var_mi('AUDITOR') or user_id = auth.uid());

drop policy if exists finance_admin_roles_admin on public.finance_admin_roles;
create policy finance_admin_roles_admin on public.finance_admin_roles
  for all to authenticated
  using (public.finance_yetkisi_var_mi('SUPER_ADMIN'))
  with check (public.finance_yetkisi_var_mi('SUPER_ADMIN'));

-- ---------- audit ----------
create table if not exists public.finance_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  before jsonb,
  after jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists finance_audit_logs_created_idx on public.finance_audit_logs (created_at desc);
create index if not exists finance_audit_logs_admin_idx on public.finance_audit_logs (admin_id, created_at desc);

alter table public.finance_audit_logs enable row level security;

drop policy if exists finance_audit_logs_select on public.finance_audit_logs;
create policy finance_audit_logs_select on public.finance_audit_logs
  for select to authenticated
  using (public.finance_yetkisi_var_mi('AUDITOR'));

create or replace function public.finance_audit_yaz(
  p_action text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_before jsonb default null,
  p_after jsonb default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.finance_audit_logs (admin_id, action, entity_type, entity_id, before, after, meta)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after, coalesce(p_meta, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------- settings (fee rates; coin_try stays in platform_economy_config) ----------
create table if not exists public.finance_settings (
  id smallint primary key default 1 check (id = 1),
  apple_fee_rate numeric(5,4) not null default 0.3000 check (apple_fee_rate >= 0 and apple_fee_rate < 1),
  google_fee_rate numeric(5,4) not null default 0.1500 check (google_fee_rate >= 0 and google_fee_rate < 1),
  payment_processor_rate numeric(5,4) not null default 0.0290 check (payment_processor_rate >= 0 and payment_processor_rate < 1),
  refund_reserve_rate numeric(5,4) not null default 0.0200 check (refund_reserve_rate >= 0 and refund_reserve_rate < 1),
  agency_commission_rate numeric(5,4) not null default 0.2000 check (agency_commission_rate >= 0 and agency_commission_rate <= 0.9),
  platform_commission_rate numeric(5,4) not null default 0.1000 check (platform_commission_rate >= 0 and platform_commission_rate <= 0.5),
  coin_liability_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.finance_settings (id) values (1) on conflict (id) do nothing;

alter table public.finance_settings enable row level security;

drop policy if exists finance_settings_select on public.finance_settings;
create policy finance_settings_select on public.finance_settings
  for select to authenticated
  using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

drop policy if exists finance_settings_write on public.finance_settings;
create policy finance_settings_write on public.finance_settings
  for all to authenticated
  using (public.finance_yetkisi_var_mi('FINANCE_ADMIN'))
  with check (public.finance_yetkisi_var_mi('FINANCE_ADMIN'));

-- ---------- expenses ----------
create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(18,2) not null check (amount >= 0),
  currency text not null default 'TRY',
  category text not null check (category in (
    'SERVER','LIVEKIT','AGORA','CLOUD','STORAGE','AI','MARKETING',
    'APPLE_FEES','GOOGLE_FEES','PAYMENT_PROCESSOR','REFUNDS','SALARY',
    'AGENCY_PAYOUT','CREATOR_PAYOUT','OTHER'
  )),
  description text,
  vendor text,
  expense_date date not null default (timezone('Europe/Istanbul', now()))::date,
  payment_status text not null default 'paid' check (payment_status in ('pending','paid','cancelled')),
  reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_expenses_date_idx on public.finance_expenses (expense_date desc);
create index if not exists finance_expenses_cat_idx on public.finance_expenses (category, expense_date desc);

alter table public.finance_expenses enable row level security;

drop policy if exists finance_expenses_select on public.finance_expenses;
create policy finance_expenses_select on public.finance_expenses
  for select to authenticated
  using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

drop policy if exists finance_expenses_write on public.finance_expenses;
create policy finance_expenses_write on public.finance_expenses
  for all to authenticated
  using (public.finance_yetkisi_var_mi('FINANCE_ADMIN'))
  with check (public.finance_yetkisi_var_mi('FINANCE_ADMIN'));

-- ---------- snapshots ----------
create table if not exists public.finance_daily_snapshots (
  day date primary key,
  coin_sold bigint not null default 0,
  cash_try numeric(18,2) not null default 0,
  cash_try_refunds numeric(18,2) not null default 0,
  cash_try_chargebacks numeric(18,2) not null default 0,
  user_coin_supply bigint not null default 0,
  coin_spent bigint not null default 0,
  coin_bonus bigint not null default 0,
  coin_game bigint not null default 0,
  coin_promo bigint not null default 0,
  gift_volume_coins bigint not null default 0,
  creator_payable_try numeric(18,2) not null default 0,
  agency_payable_try numeric(18,2) not null default 0,
  pending_withdrawals_try numeric(18,2) not null default 0,
  pending_refunds_try numeric(18,2) not null default 0,
  expense_try numeric(18,2) not null default 0,
  platform_revenue_try numeric(18,2) not null default 0,
  net_operational_try numeric(18,2) not null default 0,
  purchase_count bigint not null default 0,
  computed_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.finance_hourly_snapshots (
  hour_start timestamptz primary key,
  coin_sold bigint not null default 0,
  cash_try numeric(18,2) not null default 0,
  coin_spent bigint not null default 0,
  gift_volume_coins bigint not null default 0,
  purchase_count bigint not null default 0,
  computed_at timestamptz not null default now()
);

alter table public.finance_daily_snapshots enable row level security;
alter table public.finance_hourly_snapshots enable row level security;

drop policy if exists finance_daily_snap_select on public.finance_daily_snapshots;
create policy finance_daily_snap_select on public.finance_daily_snapshots
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

drop policy if exists finance_hourly_snap_select on public.finance_hourly_snapshots;
create policy finance_hourly_snap_select on public.finance_hourly_snapshots
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

-- ---------- live events ----------
create table if not exists public.finance_live_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid,
  agency_id uuid,
  amount_coin bigint,
  amount_try numeric(18,2),
  title text,
  subtitle text,
  ref_type text,
  ref_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists finance_live_events_created_idx on public.finance_live_events (created_at desc);

alter table public.finance_live_events enable row level security;

drop policy if exists finance_live_events_select on public.finance_live_events;
create policy finance_live_events_select on public.finance_live_events
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

alter table public.finance_live_events replica identity full;

-- ---------- alerts ----------
create table if not exists public.finance_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null default 'warning' check (severity in ('info','warning','danger')),
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  status text not null default 'open' check (status in ('open','acked','resolved')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acked_at timestamptz,
  acked_by uuid references auth.users(id) on delete set null
);

create index if not exists finance_alerts_status_idx on public.finance_alerts (status, created_at desc);

alter table public.finance_alerts enable row level security;

drop policy if exists finance_alerts_select on public.finance_alerts;
create policy finance_alerts_select on public.finance_alerts
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

drop policy if exists finance_alerts_write on public.finance_alerts;
create policy finance_alerts_write on public.finance_alerts
  for all to authenticated
  using (public.finance_yetkisi_var_mi('FINANCE_ADMIN'))
  with check (public.finance_yetkisi_var_mi('FINANCE_ADMIN'));

-- ---------- reports ----------
create table if not exists public.finance_report_jobs (
  id uuid primary key default gen_random_uuid(),
  report_id text not null unique,
  report_type text not null,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','generating','ready','failed')),
  storage_path text,
  payload jsonb,
  error_text text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  ready_at timestamptz
);

create table if not exists public.finance_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_job_id uuid not null references public.finance_report_jobs(id) on delete cascade,
  period_start date,
  period_end date,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create sequence if not exists public.finance_report_seq start 1;

alter table public.finance_report_jobs enable row level security;
alter table public.finance_report_snapshots enable row level security;

drop policy if exists finance_report_jobs_select on public.finance_report_jobs;
create policy finance_report_jobs_select on public.finance_report_jobs
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

drop policy if exists finance_report_jobs_write on public.finance_report_jobs;
create policy finance_report_jobs_write on public.finance_report_jobs
  for all to authenticated
  using (public.finance_yetkisi_var_mi('FINANCE_ADMIN'))
  with check (public.finance_yetkisi_var_mi('FINANCE_ADMIN'));

drop policy if exists finance_report_snap_select on public.finance_report_snapshots;
create policy finance_report_snap_select on public.finance_report_snapshots
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

-- ---------- reconciliation ----------
create table if not exists public.finance_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique,
  period_start date,
  period_end date,
  source text not null,
  matched_count bigint not null default 0,
  unmatched_count bigint not null default 0,
  difference_try numeric(18,2) not null default 0,
  status text not null default 'ok' check (status in ('ok','review_required','failed')),
  meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.finance_reconciliation_runs(id) on delete cascade,
  item_key text,
  external_amount numeric(18,2),
  internal_amount numeric(18,2),
  difference numeric(18,2),
  status text not null default 'unmatched',
  meta jsonb not null default '{}'::jsonb
);

alter table public.finance_reconciliation_runs enable row level security;
alter table public.finance_reconciliation_items enable row level security;

drop policy if exists finance_recon_runs_select on public.finance_reconciliation_runs;
create policy finance_recon_runs_select on public.finance_reconciliation_runs
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

drop policy if exists finance_recon_runs_write on public.finance_reconciliation_runs;
create policy finance_recon_runs_write on public.finance_reconciliation_runs
  for all to authenticated
  using (public.finance_yetkisi_var_mi('FINANCE_ADMIN'))
  with check (public.finance_yetkisi_var_mi('FINANCE_ADMIN'));

drop policy if exists finance_recon_items_select on public.finance_reconciliation_items;
create policy finance_recon_items_select on public.finance_reconciliation_items
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

-- ---------- forecast snapshots ----------
create table if not exists public.finance_forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  month_key text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists finance_forecast_month_idx on public.finance_forecast_snapshots (month_key, created_at desc);

alter table public.finance_forecast_snapshots enable row level security;

drop policy if exists finance_forecast_select on public.finance_forecast_snapshots;
create policy finance_forecast_select on public.finance_forecast_snapshots
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

-- ---------- dirty flag for snapshots ----------
create table if not exists public.finance_snapshot_state (
  id smallint primary key default 1 check (id = 1),
  dirty boolean not null default true,
  last_refreshed_at timestamptz,
  last_error text
);

insert into public.finance_snapshot_state (id) values (1) on conflict (id) do nothing;

alter table public.finance_snapshot_state enable row level security;

drop policy if exists finance_snap_state_select on public.finance_snapshot_state;
create policy finance_snap_state_select on public.finance_snapshot_state
  for select to authenticated using (public.finance_yetkisi_var_mi('READ_ONLY_FINANCE'));

-- ---------- ledger immutability ----------
create or replace function public.finance_ledger_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Immutable ledger: UPDATE/DELETE forbidden. Use compensating entry.';
end;
$$;

drop trigger if exists trg_wallet_ledger_immutable on public.wallet_ledger;
create trigger trg_wallet_ledger_immutable
  before update or delete on public.wallet_ledger
  for each row execute function public.finance_ledger_immutable();

drop trigger if exists trg_host_earnings_ledger_immutable on public.host_earnings_ledger;
create trigger trg_host_earnings_ledger_immutable
  before update or delete on public.host_earnings_ledger
  for each row execute function public.finance_ledger_immutable();

drop trigger if exists trg_agency_earnings_ledger_immutable on public.agency_earnings_ledger;
create trigger trg_agency_earnings_ledger_immutable
  before update or delete on public.agency_earnings_ledger
  for each row execute function public.finance_ledger_immutable();

drop trigger if exists trg_agency_wallet_ledger_immutable on public.agency_wallet_ledger;
create trigger trg_agency_wallet_ledger_immutable
  before update or delete on public.agency_wallet_ledger
  for each row execute function public.finance_ledger_immutable();

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
    'Coin Purchase ┬À ' || coalesce(new.provider, new.store, 'iap'),
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
    'Gift ┬À -' || new.coins_spent::text || ' Coin',
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
