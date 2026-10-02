-- ============================================================================
-- Country Contribution / World Country League
-- Gamification contribution_points — NOT currency, NOT wallet
-- Snapshot country_code at earn time; country change does not move history
-- Week: Europe/Istanbul via sehir_hafta_kodu()
-- Refund closed-week policy: all_time corrected; weekly snapshot archived immutable;
--   live weekly totals only adjust if event.week_id = current week
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Feature flags + kill + config
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, description) values
  ('country_league_enabled', true, 'Dunya Ulke Ligi / Ulke Katkisi'),
  ('country_league_weekly_enabled', true, 'Haftalik ulke siralamasi'),
  ('country_league_all_time_enabled', true, 'Tum zamanlar ulke siralamasi'),
  ('country_league_contributors_enabled', true, 'Ulke katkici listesi'),
  ('country_league_city_integration_enabled', true, 'Ulke detay sehirler sekmesi'),
  ('country_league_badges_enabled', true, 'Haftalik ulke rozetleri'),
  ('country_league_rank_notifications_enabled', false, 'Ulke sira bildirimleri')
on conflict (key) do update set description = excluded.description;

insert into public.kill_switches (key, active, reason) values
  ('kill_country_league_display', false, 'Ulke ligi public gosterimini kapat (veri silinmez)')
on conflict (key) do nothing;

create table if not exists public.country_league_config (
  key text primary key,
  value_int bigint,
  value_text text,
  updated_at timestamptz not null default now()
);

insert into public.country_league_config (key, value_int) values
  ('country_change_cooldown_days', 30),
  ('leaderboard_default_limit', 50),
  ('contributors_default_limit', 50)
on conflict (key) do nothing;

alter table public.country_league_config enable row level security;
drop policy if exists "cl_config_admin" on public.country_league_config;
create policy "cl_config_admin" on public.country_league_config
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());
drop policy if exists "cl_config_read" on public.country_league_config;
create policy "cl_config_read" on public.country_league_config
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2. geo_countries: league_enabled + ISO seed (appended below)
-- ---------------------------------------------------------------------------
alter table public.geo_countries
  add column if not exists league_enabled boolean not null default true;

-- profiles: country change tracking for cooldown
alter table public.profiles
  add column if not exists country_code_changed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. Eligibility (admin-controlled source categories)
-- ---------------------------------------------------------------------------
create table if not exists public.country_contribution_eligibility (
  category text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.country_contribution_eligibility (category, enabled) values
  ('coin_iap', true),
  ('stripe_coin', true),
  ('ai_music_iap', true),
  ('stripe_ai_music', true),
  ('admin_grant', false),
  ('promo_reward', false),
  ('game_win', false),
  ('gift', false),
  ('welcome_bonus', false)
on conflict (category) do nothing;

alter table public.country_contribution_eligibility enable row level security;
drop policy if exists "cl_elig_admin" on public.country_contribution_eligibility;
create policy "cl_elig_admin" on public.country_contribution_eligibility
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());
drop policy if exists "cl_elig_read" on public.country_contribution_eligibility;
create policy "cl_elig_read" on public.country_contribution_eligibility
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Product → contribution_points mapping (admin managed)
-- ---------------------------------------------------------------------------
create table if not exists public.country_contribution_product_map (
  product_id text primary key,
  contribution_points bigint not null check (contribution_points >= 0),
  enabled boolean not null default true,
  source_hint text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.country_contribution_product_map enable row level security;
drop policy if exists "cl_pmap_admin" on public.country_contribution_product_map;
create policy "cl_pmap_admin" on public.country_contribution_product_map
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());
drop policy if exists "cl_pmap_read" on public.country_contribution_product_map;
create policy "cl_pmap_read" on public.country_contribution_product_map
  for select to authenticated using (true);

-- Seed from catalog: points = coins (gamification, not TRY). Admin can edit.
insert into public.country_contribution_product_map (product_id, contribution_points, enabled, source_hint)
select coalesce(nullif(p.sku, ''), p.apple_product_id, p.google_product_id),
       greatest(coalesce(p.coins, 0) + coalesce(p.bonus_coins, 0), 0),
       (coalesce(p.coins, 0) + coalesce(p.bonus_coins, 0)) > 0,
       'coin_package'
from public.coin_packages p
where coalesce(nullif(p.sku, ''), p.apple_product_id, p.google_product_id) is not null
on conflict (product_id) do nothing;

insert into public.country_contribution_product_map (product_id, contribution_points, enabled, source_hint)
select p.product_id,
       greatest(coalesce(p.seconds_granted, 0) + coalesce(p.bonus_seconds, 0), 0),
       (coalesce(p.seconds_granted, 0) + coalesce(p.bonus_seconds, 0)) > 0,
       'ai_music_product'
from public.ai_music_products p
where p.product_id is not null
on conflict (product_id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Privacy settings
-- ---------------------------------------------------------------------------
create table if not exists public.country_contribution_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  include_in_totals boolean not null default true,
  show_on_leaderboard boolean not null default true,
  show_on_profile boolean not null default true,
  show_country_on_profile boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.country_contribution_user_settings enable row level security;
drop policy if exists "cl_uset_own" on public.country_contribution_user_settings;
create policy "cl_uset_own" on public.country_contribution_user_settings
  for all to authenticated
  using (auth.uid() = user_id or public.ben_admin_miyim())
  with check (auth.uid() = user_id or public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- 6. Immutable events ledger
-- ---------------------------------------------------------------------------
create table if not exists public.country_contribution_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  country_code text not null references public.geo_countries(code),
  city_id uuid references public.geo_cities(id),
  source_type text not null,
  source_transaction_id uuid,
  product_id text,
  points_delta bigint not null,
  event_type text not null check (event_type in (
    'EARN', 'REFUND', 'REVERSAL', 'ADJUSTMENT', 'PROMOTIONAL'
  )),
  week_id text not null,
  related_event_id uuid references public.country_contribution_events(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint country_contribution_events_earn_source_chk
    check (
      event_type not in ('EARN') or source_transaction_id is not null
    )
);

-- Idempotency for EARN from same purchase
create unique index if not exists country_contribution_events_earn_uidx
  on public.country_contribution_events (source_type, source_transaction_id)
  where event_type = 'EARN' and source_transaction_id is not null;

create unique index if not exists country_contribution_events_refund_uidx
  on public.country_contribution_events (source_type, source_transaction_id, event_type)
  where event_type in ('REFUND', 'REVERSAL') and source_transaction_id is not null;

create index if not exists country_contribution_events_country_week_idx
  on public.country_contribution_events (country_code, week_id, created_at desc);
create index if not exists country_contribution_events_user_idx
  on public.country_contribution_events (user_id, created_at desc);
create index if not exists country_contribution_events_country_created_idx
  on public.country_contribution_events (country_code, created_at desc);

alter table public.country_contribution_events enable row level security;
-- Raw events: admin only (private purchase projection)
drop policy if exists "cl_events_admin" on public.country_contribution_events;
create policy "cl_events_admin" on public.country_contribution_events
  for select to authenticated using (public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- 7. Aggregates
-- ---------------------------------------------------------------------------
create table if not exists public.country_contribution_totals (
  country_code text primary key references public.geo_countries(code),
  weekly_points bigint not null default 0,
  all_time_points bigint not null default 0,
  weekly_contributor_count int not null default 0,
  all_time_contributor_count int not null default 0,
  weekly_reached_at timestamptz,
  all_time_reached_at timestamptz,
  week_id text,
  updated_at timestamptz not null default now()
);

create index if not exists country_contribution_totals_weekly_rank_idx
  on public.country_contribution_totals (weekly_points desc, weekly_reached_at asc nulls last, country_code asc);
create index if not exists country_contribution_totals_alltime_rank_idx
  on public.country_contribution_totals (all_time_points desc, all_time_reached_at asc nulls last, country_code asc);

alter table public.country_contribution_totals enable row level security;
drop policy if exists "cl_totals_read" on public.country_contribution_totals;
create policy "cl_totals_read" on public.country_contribution_totals
  for select to authenticated using (true);
-- Writes only via security definer functions

create table if not exists public.country_user_contribution_totals (
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code text not null references public.geo_countries(code),
  weekly_points bigint not null default 0,
  all_time_points bigint not null default 0,
  week_id text,
  weekly_reached_at timestamptz,
  all_time_reached_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, country_code)
);

create index if not exists country_user_contrib_country_weekly_idx
  on public.country_user_contribution_totals (country_code, weekly_points desc, weekly_reached_at asc nulls last, user_id);
create index if not exists country_user_contrib_country_alltime_idx
  on public.country_user_contribution_totals (country_code, all_time_points desc, all_time_reached_at asc nulls last, user_id);

alter table public.country_user_contribution_totals enable row level security;
drop policy if exists "cl_user_tot_own" on public.country_user_contribution_totals;
create policy "cl_user_tot_own" on public.country_user_contribution_totals
  for select to authenticated
  using (auth.uid() = user_id or public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- 8. Weekly snapshots (history + rank movement)
-- ---------------------------------------------------------------------------
create table if not exists public.country_league_week_snapshots (
  week_id text not null,
  country_code text not null references public.geo_countries(code),
  rank int not null,
  points bigint not null default 0,
  contributor_count int not null default 0,
  created_at timestamptz not null default now(),
  primary key (week_id, country_code)
);

create index if not exists country_league_week_snapshots_week_rank_idx
  on public.country_league_week_snapshots (week_id, rank);

alter table public.country_league_week_snapshots enable row level security;
drop policy if exists "cl_snap_read" on public.country_league_week_snapshots;
create policy "cl_snap_read" on public.country_league_week_snapshots
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 9. Audit
-- ---------------------------------------------------------------------------
create table if not exists public.country_league_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists country_league_audit_created_idx
  on public.country_league_audit (created_at desc);

alter table public.country_league_audit enable row level security;
drop policy if exists "cl_audit_admin" on public.country_league_audit;
create policy "cl_audit_admin" on public.country_league_audit
  for select to authenticated using (public.ben_admin_miyim());

-- Realtime: safe aggregates only
do $$ begin
  alter publication supabase_realtime add table public.country_contribution_totals;
exception when duplicate_object then null;
end $$;
alter table public.country_contribution_totals replica identity full;
