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

