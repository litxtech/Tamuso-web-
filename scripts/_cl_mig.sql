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

-- ---------------------------------------------------------------------------
-- 10. Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.cl_feature_on(p_key text default 'country_league_enabled')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select enabled from public.feature_flags where key = p_key), false)
    and coalesce((select enabled from public.feature_flags where key = 'country_league_enabled'), false)
    and not coalesce((select active from public.kill_switches where key = 'kill_country_league_display'), false);
$$;

create or replace function public.cl_eligibility_on(p_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from public.country_contribution_eligibility where category = p_category),
    false
  );
$$;

create or replace function public.cl_config_int(p_key text, p_default bigint)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value_int from public.country_league_config where key = p_key),
    p_default
  );
$$;

create or replace function public.cl_ensure_settings(p_user_id uuid)
returns public.country_contribution_user_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.country_contribution_user_settings%rowtype;
begin
  insert into public.country_contribution_user_settings (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  select * into v_row from public.country_contribution_user_settings where user_id = p_user_id;
  return v_row;
end;
$$;

create or replace function public.cl_week_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.sehir_hafta_kodu();
$$;

create or replace function public.cl_resolve_points(p_product_id text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select contribution_points
     from public.country_contribution_product_map
     where product_id = p_product_id and enabled),
    0
  );
$$;

-- Atomic apply event + aggregates
create or replace function public.cl_apply_event(
  p_user_id uuid,
  p_country_code text,
  p_city_id uuid,
  p_source_type text,
  p_source_transaction_id uuid,
  p_product_id text,
  p_points_delta bigint,
  p_event_type text,
  p_week_id text,
  p_related_event_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_affect_weekly boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_settings public.country_contribution_user_settings%rowtype;
  v_include boolean;
  v_cc text;
  v_week text;
  v_prev_user_weekly bigint;
  v_prev_user_all bigint;
  v_was_weekly_contributor boolean := false;
  v_was_alltime_contributor boolean := false;
  v_now_weekly_contributor boolean := false;
  v_now_alltime_contributor boolean := false;
begin
  if p_user_id is null or p_country_code is null or p_points_delta is null then
    return null;
  end if;
  if p_points_delta = 0 then
    return null;
  end if;

  v_cc := upper(trim(p_country_code));
  if length(v_cc) <> 2 then return null; end if;
  if not exists (
    select 1 from public.geo_countries
    where code = v_cc and is_active and league_enabled
  ) then
    return null;
  end if;

  v_week := coalesce(nullif(p_week_id, ''), public.cl_week_id());
  v_settings := public.cl_ensure_settings(p_user_id);
  v_include := coalesce(v_settings.include_in_totals, true);

  begin
    insert into public.country_contribution_events (
      user_id, country_code, city_id, source_type, source_transaction_id,
      product_id, points_delta, event_type, week_id, related_event_id, metadata
    ) values (
      p_user_id, v_cc, p_city_id, p_source_type, p_source_transaction_id,
      p_product_id, p_points_delta, p_event_type, v_week, p_related_event_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning id into v_id;
  exception when unique_violation then
    return null; -- idempotent
  end;

  if not v_include and p_event_type = 'EARN' then
    -- User opted out of totals: keep event for audit but skip aggregates
    return v_id;
  end if;

  -- Ensure country totals row
  insert into public.country_contribution_totals (country_code, week_id)
  values (v_cc, v_week)
  on conflict (country_code) do nothing;

  select weekly_points, all_time_points
    into v_prev_user_weekly, v_prev_user_all
  from public.country_user_contribution_totals
  where user_id = p_user_id and country_code = v_cc;

  v_was_weekly_contributor := coalesce(v_prev_user_weekly, 0) > 0;
  v_was_alltime_contributor := coalesce(v_prev_user_all, 0) > 0;

  insert into public.country_user_contribution_totals as u (
    user_id, country_code, weekly_points, all_time_points, week_id,
    weekly_reached_at, all_time_reached_at, updated_at
  ) values (
    p_user_id, v_cc,
    case when p_affect_weekly then greatest(p_points_delta, 0) else 0 end
      + case when p_affect_weekly and p_points_delta < 0 then p_points_delta else 0 end,
    p_points_delta,
    v_week,
    case when p_affect_weekly and p_points_delta > 0 then now() else null end,
    case when p_points_delta > 0 then now() else null end,
    now()
  )
  on conflict (user_id, country_code) do update set
    weekly_points = case
      when p_affect_weekly then
        greatest(0, public.country_user_contribution_totals.weekly_points + p_points_delta)
      else public.country_user_contribution_totals.weekly_points
    end,
    all_time_points = greatest(0, public.country_user_contribution_totals.all_time_points + p_points_delta),
    week_id = case when p_affect_weekly then v_week else public.country_user_contribution_totals.week_id end,
    weekly_reached_at = case
      when p_affect_weekly and p_points_delta > 0
        and public.country_user_contribution_totals.weekly_points + p_points_delta
            > public.country_user_contribution_totals.weekly_points
      then now()
      else public.country_user_contribution_totals.weekly_reached_at
    end,
    all_time_reached_at = case
      when p_points_delta > 0
        and public.country_user_contribution_totals.all_time_points + p_points_delta
            > public.country_user_contribution_totals.all_time_points
      then now()
      else public.country_user_contribution_totals.all_time_reached_at
    end,
    updated_at = now();

  select weekly_points > 0, all_time_points > 0
    into v_now_weekly_contributor, v_now_alltime_contributor
  from public.country_user_contribution_totals
  where user_id = p_user_id and country_code = v_cc;

  update public.country_contribution_totals t set
    weekly_points = case
      when p_affect_weekly then greatest(0, t.weekly_points + p_points_delta)
      else t.weekly_points
    end,
    all_time_points = greatest(0, t.all_time_points + p_points_delta),
    weekly_contributor_count = case
      when p_affect_weekly and not v_was_weekly_contributor and v_now_weekly_contributor
        then t.weekly_contributor_count + 1
      when p_affect_weekly and v_was_weekly_contributor and not v_now_weekly_contributor
        then greatest(0, t.weekly_contributor_count - 1)
      else t.weekly_contributor_count
    end,
    all_time_contributor_count = case
      when not v_was_alltime_contributor and v_now_alltime_contributor
        then t.all_time_contributor_count + 1
      when v_was_alltime_contributor and not v_now_alltime_contributor
        then greatest(0, t.all_time_contributor_count - 1)
      else t.all_time_contributor_count
    end,
    weekly_reached_at = case
      when p_affect_weekly and p_points_delta > 0 then now()
      else t.weekly_reached_at
    end,
    all_time_reached_at = case
      when p_points_delta > 0 then now()
      else t.all_time_reached_at
    end,
    week_id = case when p_affect_weekly then v_week else t.week_id end,
    updated_at = now()
  where t.country_code = v_cc;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Apply from verified purchases (country snapshot at earn time)
-- ---------------------------------------------------------------------------
create or replace function public.cl_apply_coin_purchase(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.coin_purchases%rowtype;
  v_pkg public.coin_packages%rowtype;
  v_cat text;
  v_src text;
  v_product text;
  v_points bigint;
  v_cc text;
  v_city uuid;
  v_week text;
  v_earn_id uuid;
  v_event_id uuid;
  v_affect_weekly boolean;
begin
  if not public.cl_feature_on('country_league_enabled') then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  select * into r from public.coin_purchases where id = p_purchase_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;

  if lower(coalesce(r.store, '')) in ('manual', 'admin') then
    return jsonb_build_object('ok', false, 'reason', 'excluded_store');
  end if;
  if lower(coalesce(r.provider, '')) in ('manual', 'admin') then
    return jsonb_build_object('ok', false, 'reason', 'excluded_provider');
  end if;
  if r.status not in ('completed', 'refunded') then
    return jsonb_build_object('ok', false, 'reason', 'status');
  end if;

  if lower(coalesce(r.provider, '')) = 'stripe'
     or lower(coalesce(r.store, '')) = 'stripe' then
    v_cat := 'stripe_coin';
    v_src := 'stripe_coin';
  else
    v_cat := 'coin_iap';
    v_src := 'coin_iap';
  end if;
  if not public.cl_eligibility_on(v_cat) then
    return jsonb_build_object('ok', false, 'reason', 'eligibility');
  end if;

  select * into v_pkg from public.coin_packages where id = r.package_id;
  v_product := coalesce(v_pkg.sku, v_pkg.apple_product_id, v_pkg.google_product_id);
  v_points := public.cl_resolve_points(v_product);
  if v_points <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_points_map');
  end if;

  -- Snapshot country at purchase time from profile (immutable for this tx)
  select public.ulke_koduna_normalize(p.country_code), p.primary_city_id
    into v_cc, v_city
  from public.profiles p where p.id = r.user_id;

  if v_cc is null then
    return jsonb_build_object('ok', false, 'reason', 'no_country');
  end if;

  if r.status = 'completed' then
    v_week := public.cl_week_id();
    v_event_id := public.cl_apply_event(
      r.user_id, v_cc, v_city, v_src, r.id, v_product, v_points,
      'EARN', v_week, null,
      jsonb_build_object('coins_added', r.coins_added, 'provider', r.provider),
      true
    );
    return jsonb_build_object(
      'ok', v_event_id is not null,
      'event_id', v_event_id,
      'points', v_points,
      'country_code', v_cc,
      'event_type', 'EARN'
    );
  end if;

  -- Refund / chargeback: reverse original EARN
  select id, country_code, week_id, points_delta
    into v_earn_id, v_cc, v_week, v_points
  from public.country_contribution_events
  where source_type = v_src
    and source_transaction_id = r.id
    and event_type = 'EARN'
  limit 1;

  if v_earn_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_earn');
  end if;

  -- Closed-week policy: all_time always; weekly only if same open week
  v_affect_weekly := (v_week = public.cl_week_id());

  v_event_id := public.cl_apply_event(
    r.user_id, v_cc, v_city, v_src, r.id, v_product, -abs(v_points),
    'REFUND', v_week, v_earn_id,
    jsonb_build_object('refund_of', v_earn_id),
    v_affect_weekly
  );

  return jsonb_build_object(
    'ok', v_event_id is not null,
    'event_id', v_event_id,
    'points', -abs(v_points),
    'country_code', v_cc,
    'event_type', 'REFUND',
    'affect_weekly', v_affect_weekly
  );
end;
$$;

create or replace function public.cl_apply_ai_music_purchase(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.ai_music_purchases%rowtype;
  v_cat text;
  v_src text;
  v_points bigint;
  v_cc text;
  v_city uuid;
  v_week text;
  v_event_id uuid;
begin
  if not public.cl_feature_on('country_league_enabled') then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  select * into r from public.ai_music_purchases where id = p_purchase_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'CREDITED' then
    return jsonb_build_object('ok', false, 'reason', 'status');
  end if;
  if lower(coalesce(r.store, '')) in ('manual', 'admin', 'welcome') then
    return jsonb_build_object('ok', false, 'reason', 'excluded_store');
  end if;

  if lower(coalesce(r.store, '')) = 'stripe' then
    v_cat := 'stripe_ai_music';
    v_src := 'stripe_ai_music';
  else
    v_cat := 'ai_music_iap';
    v_src := 'ai_music_iap';
  end if;
  if not public.cl_eligibility_on(v_cat) then
    return jsonb_build_object('ok', false, 'reason', 'eligibility');
  end if;

  v_points := public.cl_resolve_points(r.product_id);
  if v_points <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_points_map');
  end if;

  select public.ulke_koduna_normalize(p.country_code), p.primary_city_id
    into v_cc, v_city
  from public.profiles p where p.id = r.user_id;

  if v_cc is null then
    return jsonb_build_object('ok', false, 'reason', 'no_country');
  end if;

  v_week := public.cl_week_id();
  v_event_id := public.cl_apply_event(
    r.user_id, v_cc, v_city, v_src, r.id, r.product_id, v_points,
    'EARN', v_week, null,
    jsonb_build_object('seconds', r.seconds_snapshot, 'store', r.store),
    true
  );

  return jsonb_build_object(
    'ok', v_event_id is not null,
    'event_id', v_event_id,
    'points', v_points,
    'country_code', v_cc,
    'event_type', 'EARN'
  );
end;
$$;

create or replace function public.trg_cl_coin_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status) then
      perform public.cl_apply_coin_purchase(NEW.id);
    end if;
  exception when others then
    insert into public.country_league_audit (actor_id, action, entity_type, entity_id, new_value)
    values (NEW.user_id, 'trigger_error', 'coin_purchase', NEW.id::text,
      jsonb_build_object('err', SQLERRM));
  end;
  return NEW;
end;
$$;

drop trigger if exists cl_coin_purchase_trg on public.coin_purchases;
create trigger cl_coin_purchase_trg
  after insert or update of status on public.coin_purchases
  for each row execute function public.trg_cl_coin_purchase();

create or replace function public.trg_cl_ai_music_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if NEW.status = 'CREDITED' and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
      perform public.cl_apply_ai_music_purchase(NEW.id);
    end if;
  exception when others then
    insert into public.country_league_audit (actor_id, action, entity_type, entity_id, new_value)
    values (NEW.user_id, 'trigger_error', 'ai_music_purchase', NEW.id::text,
      jsonb_build_object('err', SQLERRM));
  end;
  return NEW;
end;
$$;

drop trigger if exists cl_ai_music_purchase_trg on public.ai_music_purchases;
create trigger cl_ai_music_purchase_trg
  after insert or update of status on public.ai_music_purchases
  for each row execute function public.trg_cl_ai_music_purchase();

-- ---------------------------------------------------------------------------
-- 12. Public RPCs
-- ---------------------------------------------------------------------------
create or replace function public.get_country_leaderboard(
  p_period text default 'weekly',
  p_limit int default 50,
  p_cursor_rank int default null,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_period text := lower(coalesce(p_period, 'weekly'));
  v_week text := public.cl_week_id();
  v_prev_week text;
  v_rows jsonb;
  v_flag_weekly boolean;
  v_flag_all boolean;
begin
  if not public.cl_feature_on('country_league_enabled') then
    return jsonb_build_object('enabled', false, 'rows', '[]'::jsonb, 'week_id', v_week);
  end if;

  v_flag_weekly := public.cl_feature_on('country_league_weekly_enabled');
  v_flag_all := public.cl_feature_on('country_league_all_time_enabled');

  if v_period = 'weekly' and not v_flag_weekly then
    return jsonb_build_object('enabled', true, 'period', 'weekly', 'rows', '[]'::jsonb, 'week_id', v_week);
  end if;
  if v_period = 'all_time' and not v_flag_all then
    return jsonb_build_object('enabled', true, 'period', 'all_time', 'rows', '[]'::jsonb, 'week_id', v_week);
  end if;

  select week_id into v_prev_week
  from public.country_league_week_snapshots
  where week_id < v_week
  order by week_id desc
  limit 1;

  with ranked as (
    select
      t.country_code,
      case when v_period = 'weekly' then t.weekly_points else t.all_time_points end as points,
      case when v_period = 'weekly' then t.weekly_contributor_count else t.all_time_contributor_count end as contributor_count,
      case when v_period = 'weekly' then t.weekly_reached_at else t.all_time_reached_at end as reached_at,
      row_number() over (
        order by
          case when v_period = 'weekly' then t.weekly_points else t.all_time_points end desc,
          case when v_period = 'weekly' then t.weekly_reached_at else t.all_time_reached_at end asc nulls last,
          t.country_code asc
      )::int as rank
    from public.country_contribution_totals t
    join public.geo_countries g on g.code = t.country_code
    where g.is_active and g.league_enabled
      and (
        case when v_period = 'weekly' then t.weekly_points else t.all_time_points end
      ) > 0
  ),
  with_move as (
    select
      r.*,
      s.rank as prev_rank,
      case
        when s.rank is null then null
        else s.rank - r.rank
      end as rank_delta
    from ranked r
    left join public.country_league_week_snapshots s
      on s.country_code = r.country_code
     and s.week_id = v_prev_week
     and v_period = 'weekly'
  )
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb)
  into v_rows
  from (
    select country_code, points, contributor_count, rank, rank_delta, reached_at
    from with_move
    where (p_cursor_rank is null or rank > p_cursor_rank)
      and (
        p_search is null or length(trim(p_search)) = 0
        or country_code ilike '%' || upper(trim(p_search)) || '%'
      )
    order by rank
    limit v_limit
  ) x;

  return jsonb_build_object(
    'enabled', true,
    'period', v_period,
    'week_id', v_week,
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_country_detail(p_country_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cc text := upper(nullif(trim(p_country_code), ''));
  v_week text := public.cl_week_id();
  t public.country_contribution_totals%rowtype;
  v_weekly_rank int;
  v_alltime_rank int;
  v_gap bigint;
  v_above_points bigint;
begin
  if not public.cl_feature_on('country_league_enabled') then
    return jsonb_build_object('enabled', false);
  end if;
  if v_cc is null or length(v_cc) <> 2 then
    return jsonb_build_object('enabled', true, 'found', false);
  end if;
  if not exists (
    select 1 from public.geo_countries where code = v_cc and is_active and league_enabled
  ) then
    return jsonb_build_object('enabled', true, 'found', false);
  end if;

  select * into t from public.country_contribution_totals where country_code = v_cc;

  select r.rank into v_weekly_rank from (
    select country_code,
      row_number() over (
        order by weekly_points desc, weekly_reached_at asc nulls last, country_code asc
      )::int as rank
    from public.country_contribution_totals tt
    join public.geo_countries g on g.code = tt.country_code
    where g.is_active and g.league_enabled and tt.weekly_points > 0
  ) r where r.country_code = v_cc;

  select r.rank into v_alltime_rank from (
    select country_code,
      row_number() over (
        order by all_time_points desc, all_time_reached_at asc nulls last, country_code asc
      )::int as rank
    from public.country_contribution_totals tt
    join public.geo_countries g on g.code = tt.country_code
    where g.is_active and g.league_enabled and tt.all_time_points > 0
  ) r where r.country_code = v_cc;

  if v_weekly_rank is not null and v_weekly_rank > 1 then
    select weekly_points into v_above_points from (
      select weekly_points,
        row_number() over (
          order by weekly_points desc, weekly_reached_at asc nulls last, country_code asc
        )::int as rank
      from public.country_contribution_totals tt
      join public.geo_countries g on g.code = tt.country_code
      where g.is_active and g.league_enabled and tt.weekly_points > 0
    ) x where x.rank = v_weekly_rank - 1;
    v_gap := greatest(0, coalesce(v_above_points, 0) - coalesce(t.weekly_points, 0) + 1);
  end if;

  return jsonb_build_object(
    'enabled', true,
    'found', true,
    'country_code', v_cc,
    'week_id', v_week,
    'weekly_points', coalesce(t.weekly_points, 0),
    'all_time_points', coalesce(t.all_time_points, 0),
    'weekly_contributor_count', coalesce(t.weekly_contributor_count, 0),
    'all_time_contributor_count', coalesce(t.all_time_contributor_count, 0),
    'weekly_rank', v_weekly_rank,
    'all_time_rank', v_alltime_rank,
    'gap_to_next_weekly', v_gap
  );
end;
$$;

create or replace function public.get_country_contributors(
  p_country_code text,
  p_period text default 'all_time',
  p_limit int default 50,
  p_cursor_points bigint default null,
  p_cursor_user_id uuid default null,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cc text := upper(nullif(trim(p_country_code), ''));
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_period text := lower(coalesce(p_period, 'all_time'));
  v_rows jsonb;
begin
  if not public.cl_feature_on('country_league_enabled')
     or not public.cl_feature_on('country_league_contributors_enabled') then
    return jsonb_build_object('enabled', false, 'rows', '[]'::jsonb);
  end if;
  if v_cc is null then
    return jsonb_build_object('enabled', true, 'rows', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb)
  into v_rows
  from (
    select
      u.user_id,
      case when v_period = 'weekly' then u.weekly_points else u.all_time_points end as points,
      row_number() over (
        order by
          case when v_period = 'weekly' then u.weekly_points else u.all_time_points end desc,
          case when v_period = 'weekly' then u.weekly_reached_at else u.all_time_reached_at end asc nulls last,
          u.user_id
      )::int as rank,
      p.display_name,
      p.username,
      p.avatar_url
    from public.country_user_contribution_totals u
    left join public.country_contribution_user_settings s on s.user_id = u.user_id
    join public.profiles p on p.id = u.user_id
    where u.country_code = v_cc
      and coalesce(s.include_in_totals, true) = true
      and coalesce(s.show_on_leaderboard, true) = true
      and p.deleted_at is null
      and (
        case when v_period = 'weekly' then u.weekly_points else u.all_time_points end
      ) > 0
      and (
        p_search is null or length(trim(p_search)) = 0
        or p.username ilike '%' || trim(p_search) || '%'
        or p.display_name ilike '%' || trim(p_search) || '%'
      )
      and (
        p_cursor_points is null
        or (
          case when v_period = 'weekly' then u.weekly_points else u.all_time_points end < p_cursor_points
          or (
            case when v_period = 'weekly' then u.weekly_points else u.all_time_points end = p_cursor_points
            and u.user_id > p_cursor_user_id
          )
        )
      )
    order by points desc, user_id
    limit v_limit
  ) x;

  return jsonb_build_object(
    'enabled', true,
    'country_code', v_cc,
    'period', v_period,
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_country_cities(
  p_country_code text,
  p_limit int default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cc text := upper(nullif(trim(p_country_code), ''));
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_rows jsonb;
begin
  if not public.cl_feature_on('country_league_enabled')
     or not public.cl_feature_on('country_league_city_integration_enabled') then
    return jsonb_build_object('enabled', false, 'rows', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb)
  into v_rows
  from (
    select
      c.id as city_id,
      c.name,
      c.slug,
      c.power_score,
      c.supporter_count,
      row_number() over (order by c.power_score desc, c.name asc)::int as rank
    from public.geo_cities c
    where c.country_code = v_cc and c.is_active
    order by c.power_score desc, c.name asc
    limit v_limit
  ) x;

  return jsonb_build_object(
    'enabled', true,
    'country_code', v_cc,
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_my_country_contribution()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cc text;
  v_settings public.country_contribution_user_settings%rowtype;
  u public.country_user_contribution_totals%rowtype;
  t public.country_contribution_totals%rowtype;
  v_world_rank int;
  v_country_rank int;
  v_week text := public.cl_week_id();
begin
  if v_uid is null then
    return jsonb_build_object('enabled', false, 'auth', false);
  end if;
  if not public.cl_feature_on('country_league_enabled') then
    return jsonb_build_object('enabled', false);
  end if;

  v_settings := public.cl_ensure_settings(v_uid);
  select public.ulke_koduna_normalize(country_code) into v_cc
  from public.profiles where id = v_uid;

  if v_cc is null then
    return jsonb_build_object(
      'enabled', true,
      'has_country', false,
      'settings', jsonb_build_object(
        'include_in_totals', v_settings.include_in_totals,
        'show_on_leaderboard', v_settings.show_on_leaderboard,
        'show_on_profile', v_settings.show_on_profile,
        'show_country_on_profile', v_settings.show_country_on_profile
      )
    );
  end if;

  select * into u from public.country_user_contribution_totals
  where user_id = v_uid and country_code = v_cc;
  select * into t from public.country_contribution_totals where country_code = v_cc;

  select r.rank into v_world_rank from (
    select country_code,
      row_number() over (
        order by weekly_points desc, weekly_reached_at asc nulls last, country_code asc
      )::int as rank
    from public.country_contribution_totals tt
    join public.geo_countries g on g.code = tt.country_code
    where g.is_active and g.league_enabled and tt.weekly_points > 0
  ) r where r.country_code = v_cc;

  if coalesce(u.all_time_points, 0) > 0 and v_settings.show_on_leaderboard then
    select r.rank into v_country_rank from (
      select user_id,
        row_number() over (
          order by all_time_points desc, all_time_reached_at asc nulls last, user_id
        )::int as rank
      from public.country_user_contribution_totals uu
      join public.country_contribution_user_settings ss on ss.user_id = uu.user_id
      where uu.country_code = v_cc
        and ss.include_in_totals and ss.show_on_leaderboard
        and uu.all_time_points > 0
    ) r where r.user_id = v_uid;
  end if;

  return jsonb_build_object(
    'enabled', true,
    'has_country', true,
    'country_code', v_cc,
    'week_id', v_week,
    'weekly_points', coalesce(u.weekly_points, 0),
    'all_time_points', coalesce(u.all_time_points, 0),
    'country_weekly_points', coalesce(t.weekly_points, 0),
    'country_all_time_points', coalesce(t.all_time_points, 0),
    'world_weekly_rank', v_world_rank,
    'country_rank', v_country_rank,
    'settings', jsonb_build_object(
      'include_in_totals', v_settings.include_in_totals,
      'show_on_leaderboard', v_settings.show_on_leaderboard,
      'show_on_profile', v_settings.show_on_profile,
      'show_country_on_profile', v_settings.show_country_on_profile
    )
  );
end;
$$;

create or replace function public.get_country_contribution_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  s public.country_contribution_user_settings%rowtype;
  v_cooldown int;
  v_changed_at timestamptz;
  v_next timestamptz;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  s := public.cl_ensure_settings(v_uid);
  v_cooldown := public.cl_config_int('country_change_cooldown_days', 30)::int;
  select country_code_changed_at into v_changed_at from public.profiles where id = v_uid;
  if v_changed_at is not null then
    v_next := v_changed_at + make_interval(days => v_cooldown);
  end if;
  return jsonb_build_object(
    'include_in_totals', s.include_in_totals,
    'show_on_leaderboard', s.show_on_leaderboard,
    'show_on_profile', s.show_on_profile,
    'show_country_on_profile', s.show_country_on_profile,
    'country_change_cooldown_days', v_cooldown,
    'country_code_changed_at', v_changed_at,
    'country_change_available_at', v_next,
    'can_change_country', v_next is null or v_next <= now()
  );
end;
$$;

create or replace function public.set_country_contribution_settings(
  p_include_in_totals boolean default null,
  p_show_on_leaderboard boolean default null,
  p_show_on_profile boolean default null,
  p_show_country_on_profile boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  s public.country_contribution_user_settings%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  perform public.cl_ensure_settings(v_uid);
  update public.country_contribution_user_settings set
    include_in_totals = coalesce(p_include_in_totals, include_in_totals),
    show_on_leaderboard = coalesce(p_show_on_leaderboard, show_on_leaderboard),
    show_on_profile = coalesce(p_show_on_profile, show_on_profile),
    show_country_on_profile = coalesce(p_show_country_on_profile, show_country_on_profile),
    updated_at = now()
  where user_id = v_uid
  returning * into s;
  return jsonb_build_object(
    'ok', true,
    'include_in_totals', s.include_in_totals,
    'show_on_leaderboard', s.show_on_leaderboard,
    'show_on_profile', s.show_on_profile,
    'show_country_on_profile', s.show_country_on_profile
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 13. Week close / snapshot
-- ---------------------------------------------------------------------------
create or replace function public.admin_country_league_close_week()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week text := public.cl_week_id();
  v_count int := 0;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  insert into public.country_league_week_snapshots (week_id, country_code, rank, points, contributor_count)
  select
    coalesce(t.week_id, v_week),
    t.country_code,
    row_number() over (
      order by t.weekly_points desc, t.weekly_reached_at asc nulls last, t.country_code asc
    )::int,
    t.weekly_points,
    t.weekly_contributor_count
  from public.country_contribution_totals t
  join public.geo_countries g on g.code = t.country_code
  where g.league_enabled and t.weekly_points > 0
  on conflict (week_id, country_code) do update set
    rank = excluded.rank,
    points = excluded.points,
    contributor_count = excluded.contributor_count;

  get diagnostics v_count = row_count;

  update public.country_contribution_totals set
    weekly_points = 0,
    weekly_contributor_count = 0,
    weekly_reached_at = null,
    week_id = v_week,
    updated_at = now();

  update public.country_user_contribution_totals set
    weekly_points = 0,
    weekly_reached_at = null,
    week_id = v_week,
    updated_at = now();

  insert into public.country_league_audit (actor_id, action, entity_type, entity_id, new_value)
  values (auth.uid(), 'close_week', 'week', v_week, jsonb_build_object('snapshot_rows', v_count));

  return jsonb_build_object('ok', true, 'week_id', v_week, 'snapshot_rows', v_count);
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_country_league_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_elig jsonb;
  v_products jsonb;
  v_countries jsonb;
  v_week text := public.cl_week_id();
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'category', category, 'enabled', enabled
  ) order by category), '[]'::jsonb)
  into v_elig from public.country_contribution_eligibility;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', product_id,
    'contribution_points', contribution_points,
    'enabled', enabled,
    'source_hint', source_hint
  ) order by product_id), '[]'::jsonb)
  into v_products from public.country_contribution_product_map;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.weekly_rank nulls last, x.country_code), '[]'::jsonb)
  into v_countries
  from (
    select
      g.code as country_code,
      g.name,
      g.league_enabled,
      coalesce(t.weekly_points, 0) as weekly_points,
      coalesce(t.all_time_points, 0) as all_time_points,
      coalesce(t.all_time_contributor_count, 0) as contributors,
      case when coalesce(t.weekly_points, 0) > 0 then
        rank() over (
          order by coalesce(t.weekly_points, 0) desc,
                   t.weekly_reached_at asc nulls last,
                   g.code asc
        )
      else null end as weekly_rank
    from public.geo_countries g
    left join public.country_contribution_totals t on t.country_code = g.code
    where g.is_active
    order by coalesce(t.weekly_points, 0) desc, g.code
    limit 300
  ) x;

  return jsonb_build_object(
    'week_id', v_week,
    'eligibility', v_elig,
    'products', v_products,
    'countries', v_countries,
    'event_count', (select count(*) from public.country_contribution_events),
    'cooldown_days', public.cl_config_int('country_change_cooldown_days', 30)
  );
end;
$$;

create or replace function public.admin_country_league_set_eligibility(
  p_category text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old boolean;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  select enabled into v_old from public.country_contribution_eligibility where category = p_category;
  insert into public.country_contribution_eligibility (category, enabled, updated_at)
  values (p_category, coalesce(p_enabled, false), now())
  on conflict (category) do update set enabled = excluded.enabled, updated_at = now();
  insert into public.country_league_audit (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (auth.uid(), 'set_eligibility', 'eligibility', p_category,
    jsonb_build_object('enabled', v_old),
    jsonb_build_object('enabled', p_enabled));
  return jsonb_build_object('ok', true, 'category', p_category, 'enabled', p_enabled);
end;
$$;

create or replace function public.admin_country_league_set_product_points(
  p_product_id text,
  p_points bigint,
  p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_product_id is null or length(trim(p_product_id)) = 0 then
    raise exception 'product_id required';
  end if;
  if coalesce(p_points, -1) < 0 then raise exception 'points must be >= 0'; end if;

  select jsonb_build_object('points', contribution_points, 'enabled', enabled)
    into v_old
  from public.country_contribution_product_map where product_id = p_product_id;

  insert into public.country_contribution_product_map (
    product_id, contribution_points, enabled, updated_at, updated_by
  ) values (
    trim(p_product_id), p_points, coalesce(p_enabled, true), now(), auth.uid()
  )
  on conflict (product_id) do update set
    contribution_points = excluded.contribution_points,
    enabled = excluded.enabled,
    updated_at = now(),
    updated_by = auth.uid();

  insert into public.country_league_audit (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (auth.uid(), 'set_product_points', 'product_map', p_product_id, v_old,
    jsonb_build_object('points', p_points, 'enabled', p_enabled));

  return jsonb_build_object('ok', true, 'product_id', p_product_id, 'points', p_points);
end;
$$;

create or replace function public.admin_country_league_set_country_enabled(
  p_country_code text,
  p_enabled boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cc text := upper(nullif(trim(p_country_code), ''));
  v_old boolean;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if v_cc is null then raise exception 'country_code required'; end if;
  select league_enabled into v_old from public.geo_countries where code = v_cc;
  if not found then raise exception 'country not found'; end if;
  update public.geo_countries set league_enabled = coalesce(p_enabled, false) where code = v_cc;
  insert into public.country_league_audit (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (auth.uid(), 'set_country_enabled', 'country', v_cc,
    jsonb_build_object('league_enabled', v_old),
    jsonb_build_object('league_enabled', p_enabled, 'reason', p_reason));
  return jsonb_build_object('ok', true, 'country_code', v_cc, 'enabled', p_enabled);
end;
$$;

create or replace function public.admin_country_league_promotional_points(
  p_country_code text,
  p_points bigint,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cc text := upper(nullif(trim(p_country_code), ''));
  v_id uuid;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if v_cc is null or coalesce(p_points, 0) = 0 then raise exception 'invalid'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'reason required';
  end if;

  -- System user attribution: actor as user for audit trail; labeled PROMOTIONAL
  v_id := public.cl_apply_event(
    auth.uid(), v_cc, null, 'promotional', gen_random_uuid(), null, p_points,
    'PROMOTIONAL', public.cl_week_id(), null,
    jsonb_build_object('reason', p_reason, 'admin', true),
    true
  );

  insert into public.country_league_audit (actor_id, action, entity_type, entity_id, new_value)
  values (auth.uid(), 'promotional_points', 'country', v_cc,
    jsonb_build_object('points', p_points, 'reason', p_reason, 'event_id', v_id));

  return jsonb_build_object('ok', v_id is not null, 'event_id', v_id);
end;
$$;

create or replace function public.admin_country_league_set_cooldown_days(p_days int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old bigint;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if coalesce(p_days, -1) < 0 then raise exception 'invalid days'; end if;
  select value_int into v_old from public.country_league_config where key = 'country_change_cooldown_days';
  insert into public.country_league_config (key, value_int, updated_at)
  values ('country_change_cooldown_days', p_days, now())
  on conflict (key) do update set value_int = excluded.value_int, updated_at = now();
  insert into public.country_league_audit (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (auth.uid(), 'set_cooldown', 'config', 'country_change_cooldown_days',
    jsonb_build_object('days', v_old), jsonb_build_object('days', p_days));
  return jsonb_build_object('ok', true, 'days', p_days);
end;
$$;

-- ---------------------------------------------------------------------------
-- 15. Patch cl_apply_event: PROMOTIONAL skips user leaderboard identity
--     Fix first-insert weekly_points; country-only for promo
-- ---------------------------------------------------------------------------
create or replace function public.cl_apply_event(
  p_user_id uuid,
  p_country_code text,
  p_city_id uuid,
  p_source_type text,
  p_source_transaction_id uuid,
  p_product_id text,
  p_points_delta bigint,
  p_event_type text,
  p_week_id text,
  p_related_event_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_affect_weekly boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_settings public.country_contribution_user_settings%rowtype;
  v_include boolean := true;
  v_cc text;
  v_week text;
  v_prev_user_weekly bigint := 0;
  v_prev_user_all bigint := 0;
  v_was_weekly_contributor boolean := false;
  v_was_alltime_contributor boolean := false;
  v_now_weekly_contributor boolean := false;
  v_now_alltime_contributor boolean := false;
  v_is_promo boolean;
begin
  if p_user_id is null or p_country_code is null or p_points_delta is null then
    return null;
  end if;
  if p_points_delta = 0 then
    return null;
  end if;

  v_cc := upper(trim(p_country_code));
  if length(v_cc) <> 2 then return null; end if;
  if not exists (
    select 1 from public.geo_countries
    where code = v_cc and is_active and league_enabled
  ) then
    return null;
  end if;

  v_week := coalesce(nullif(p_week_id, ''), public.cl_week_id());
  v_is_promo := (p_event_type = 'PROMOTIONAL');

  if not v_is_promo then
    v_settings := public.cl_ensure_settings(p_user_id);
    v_include := coalesce(v_settings.include_in_totals, true);
  end if;

  begin
    insert into public.country_contribution_events (
      user_id, country_code, city_id, source_type, source_transaction_id,
      product_id, points_delta, event_type, week_id, related_event_id, metadata
    ) values (
      p_user_id, v_cc, p_city_id, p_source_type, p_source_transaction_id,
      p_product_id, p_points_delta, p_event_type, v_week, p_related_event_id,
      coalesce(p_metadata, '{}'::jsonb)
    )
    returning id into v_id;
  exception when unique_violation then
    return null;
  end;

  if not v_include and p_event_type = 'EARN' then
    return v_id;
  end if;

  insert into public.country_contribution_totals (country_code, week_id)
  values (v_cc, v_week)
  on conflict (country_code) do nothing;

  if not v_is_promo then
    select coalesce(weekly_points, 0), coalesce(all_time_points, 0)
      into v_prev_user_weekly, v_prev_user_all
    from public.country_user_contribution_totals
    where user_id = p_user_id and country_code = v_cc;

    v_was_weekly_contributor := v_prev_user_weekly > 0;
    v_was_alltime_contributor := v_prev_user_all > 0;

    insert into public.country_user_contribution_totals as u (
      user_id, country_code, weekly_points, all_time_points, week_id,
      weekly_reached_at, all_time_reached_at, updated_at
    ) values (
      p_user_id, v_cc,
      case when p_affect_weekly then greatest(p_points_delta, 0) else 0 end,
      greatest(p_points_delta, 0),
      v_week,
      case when p_affect_weekly and p_points_delta > 0 then now() else null end,
      case when p_points_delta > 0 then now() else null end,
      now()
    )
    on conflict (user_id, country_code) do update set
      weekly_points = case
        when p_affect_weekly then
          greatest(0, u.weekly_points + p_points_delta)
        else u.weekly_points
      end,
      all_time_points = greatest(0, u.all_time_points + p_points_delta),
      week_id = case when p_affect_weekly then v_week else u.week_id end,
      weekly_reached_at = case
        when p_affect_weekly and p_points_delta > 0 then now()
        else u.weekly_reached_at
      end,
      all_time_reached_at = case
        when p_points_delta > 0 then now()
        else u.all_time_reached_at
      end,
      updated_at = now();

    -- Negative first insert path
    if p_points_delta < 0 then
      update public.country_user_contribution_totals set
        weekly_points = case when p_affect_weekly then greatest(0, weekly_points) else weekly_points end,
        all_time_points = greatest(0, all_time_points)
      where user_id = p_user_id and country_code = v_cc
        and weekly_points = greatest(p_points_delta, 0)
        and all_time_points = greatest(p_points_delta, 0);
    end if;

    select weekly_points > 0, all_time_points > 0
      into v_now_weekly_contributor, v_now_alltime_contributor
    from public.country_user_contribution_totals
    where user_id = p_user_id and country_code = v_cc;
  end if;

  update public.country_contribution_totals t set
    weekly_points = case
      when p_affect_weekly then greatest(0, t.weekly_points + p_points_delta)
      else t.weekly_points
    end,
    all_time_points = greatest(0, t.all_time_points + p_points_delta),
    weekly_contributor_count = case
      when v_is_promo then t.weekly_contributor_count
      when p_affect_weekly and not v_was_weekly_contributor and v_now_weekly_contributor
        then t.weekly_contributor_count + 1
      when p_affect_weekly and v_was_weekly_contributor and not v_now_weekly_contributor
        then greatest(0, t.weekly_contributor_count - 1)
      else t.weekly_contributor_count
    end,
    all_time_contributor_count = case
      when v_is_promo then t.all_time_contributor_count
      when not v_was_alltime_contributor and v_now_alltime_contributor
        then t.all_time_contributor_count + 1
      when v_was_alltime_contributor and not v_now_alltime_contributor
        then greatest(0, t.all_time_contributor_count - 1)
      else t.all_time_contributor_count
    end,
    weekly_reached_at = case
      when p_affect_weekly and p_points_delta > 0 then now()
      else t.weekly_reached_at
    end,
    all_time_reached_at = case
      when p_points_delta > 0 then now()
      else t.all_time_reached_at
    end,
    week_id = case when p_affect_weekly then v_week else t.week_id end,
    updated_at = now()
  where t.country_code = v_cc;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 16. profil_guncelle: country change cooldown (does NOT move contributions)
-- ---------------------------------------------------------------------------
create or replace function public.profil_guncelle(
  p_display_name text default null,
  p_username text default null,
  p_bio text default null,
  p_phone_e164 text default null,
  p_clear_phone boolean default false,
  p_gender text default null,
  p_birth_date date default null,
  p_clear_birth_date boolean default false,
  p_country_code text default null,
  p_region_id uuid default null,
  p_clear_region boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles%rowtype;
  v_username text;
  v_phone text;
  v_gender text;
  v_country text;
  v_country_name text;
  v_region uuid;
  v_region_country text;
  v_old_cc text;
  v_changed_at timestamptz;
  v_cooldown int;
  v_next timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if p_username is not null then
    v_username := lower(trim(p_username));
    if v_username !~ '^[a-z0-9_]{3,24}$' then
      raise exception 'Invalid username';
    end if;
  end if;

  if p_clear_phone then
    v_phone := null;
  elsif p_phone_e164 is not null and length(trim(p_phone_e164)) > 0 then
    v_phone := trim(p_phone_e164);
  end if;

  if p_gender is not null then
    v_gender := lower(trim(p_gender));
    if v_gender not in ('female', 'male', 'other', 'prefer_not') then
      raise exception 'Gecersiz cinsiyet';
    end if;
  end if;

  if p_birth_date is not null then
    if p_birth_date > (current_date - interval '18 years') then
      raise exception 'Platform 18 yas ve uzeri icindir';
    end if;
    if p_birth_date < date '1920-01-01' then
      raise exception 'Gecersiz dogum tarihi';
    end if;
  end if;

  select country_code, country_code_changed_at into v_old_cc, v_changed_at
  from public.profiles where id = v_uid;

  if p_country_code is not null then
    v_country := public.ulke_koduna_normalize(p_country_code);
    if v_country is null then
      select c.code into v_country
      from public.geo_countries c
      where c.is_active and c.profile_enabled
        and (
          lower(c.name) = lower(trim(p_country_code))
          or public.ulke_koduna_normalize(c.name) = public.ulke_koduna_normalize(p_country_code)
        )
      limit 1;
    end if;
    if v_country is null or not exists (
      select 1 from public.geo_countries
      where code = v_country and is_active and profile_enabled
    ) then
      raise exception 'Bu ulke su an secilemez';
    end if;

    if v_old_cc is distinct from v_country then
      v_cooldown := public.cl_config_int('country_change_cooldown_days', 30)::int;
      if v_changed_at is not null and v_cooldown > 0 then
        v_next := v_changed_at + make_interval(days => v_cooldown);
        if v_next > now() then
          raise exception 'Ulke degisikligi beklemeye tabi: %', v_next;
        end if;
      end if;
    end if;

    select name into v_country_name
    from public.geo_countries
    where code = v_country;
  end if;

  if p_clear_region then
    v_region := null;
  elsif p_region_id is not null then
    select r.id, r.country_code into v_region, v_region_country
    from public.geo_regions r
    join public.geo_countries c on c.code = r.country_code
    where r.id = p_region_id
      and r.is_active and r.profile_enabled
      and c.is_active and c.profile_enabled;
    if v_region is null then
      raise exception 'Gecersiz il / bolge';
    end if;
    if v_country is null then
      v_country := v_region_country;
      select name into v_country_name
      from public.geo_countries
      where code = v_country;
    elsif v_country <> v_region_country then
      raise exception 'Il secilen ulkeye ait degil';
    end if;
  end if;

  update public.profiles
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    username = coalesce(v_username, username),
    bio = case when p_bio is null then bio else left(trim(p_bio), 280) end,
    phone_e164 = case
      when p_clear_phone then null
      when p_phone_e164 is not null and length(trim(p_phone_e164)) > 0 then v_phone
      else phone_e164
    end,
    gender = coalesce(v_gender, gender),
    birth_date = case
      when p_clear_birth_date then null
      when p_birth_date is not null then p_birth_date
      else birth_date
    end,
    country_code = coalesce(v_country, country_code),
    country = coalesce(v_country_name, country),
    country_code_changed_at = case
      when v_country is not null and v_old_cc is distinct from v_country then now()
      else country_code_changed_at
    end,
    region_id = case
      when p_clear_region then null
      when p_region_id is not null then v_region
      else region_id
    end,
    is_guest = false,
    updated_at = now()
  where id = v_uid
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Profile not found';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- 17. Grants
-- ---------------------------------------------------------------------------
grant execute on function public.cl_feature_on(text) to authenticated, anon, service_role;
grant execute on function public.cl_week_id() to authenticated, anon, service_role;
grant execute on function public.get_country_leaderboard(text, int, int, text) to authenticated;
grant execute on function public.get_country_detail(text) to authenticated;
grant execute on function public.get_country_contributors(text, text, int, bigint, uuid, text) to authenticated;
grant execute on function public.get_country_cities(text, int) to authenticated;
grant execute on function public.get_my_country_contribution() to authenticated;
grant execute on function public.get_country_contribution_settings() to authenticated;
grant execute on function public.set_country_contribution_settings(boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.admin_country_league_overview() to authenticated;
grant execute on function public.admin_country_league_set_eligibility(text, boolean) to authenticated;
grant execute on function public.admin_country_league_set_product_points(text, bigint, boolean) to authenticated;
grant execute on function public.admin_country_league_set_country_enabled(text, boolean, text) to authenticated;
grant execute on function public.admin_country_league_promotional_points(text, bigint, text) to authenticated;
grant execute on function public.admin_country_league_close_week() to authenticated;
grant execute on function public.admin_country_league_set_cooldown_days(int) to authenticated;
grant execute on function public.cl_apply_coin_purchase(uuid) to service_role;
grant execute on function public.cl_apply_ai_music_purchase(uuid) to service_role;

-- ISO 3166-1 alpha-2 seed (249)
-- Mevcut satÄ±rlarÄ±n name / profile_enabled deÄŸerleri korunur.
insert into public.geo_countries (code, name, is_active, profile_enabled, sort_order, league_enabled)
values
('AD','Andorra',true,false,1,true),
('AE','United Arab Emirates',true,false,2,true),
('AF','Afghanistan',true,false,3,true),
('AG','Antigua and Barbuda',true,false,4,true),
('AI','Anguilla',true,false,5,true),
('AL','Albania',true,false,6,true),
('AM','Armenia',true,false,7,true),
('AO','Angola',true,false,8,true),
('AQ','Antarctica',true,false,9,true),
('AR','Argentina',true,false,10,true),
('AS','American Samoa',true,false,11,true),
('AT','Austria',true,false,12,true),
('AU','Australia',true,false,13,true),
('AW','Aruba',true,false,14,true),
('AX','Aland Islands',true,false,15,true),
('AZ','Azerbaijan',true,false,16,true),
('BA','Bosnia and Herzegovina',true,false,17,true),
('BB','Barbados',true,false,18,true),
('BD','Bangladesh',true,false,19,true),
('BE','Belgium',true,false,20,true),
('BF','Burkina Faso',true,false,21,true),
('BG','Bulgaria',true,false,22,true),
('BH','Bahrain',true,false,23,true),
('BI','Burundi',true,false,24,true),
('BJ','Benin',true,false,25,true),
('BL','Saint Barthelemy',true,false,26,true),
('BM','Bermuda',true,false,27,true),
('BN','Brunei',true,false,28,true),
('BO','Bolivia',true,false,29,true),
('BQ','Caribbean Netherlands',true,false,30,true),
('BR','Brazil',true,false,31,true),
('BS','Bahamas',true,false,32,true),
('BT','Bhutan',true,false,33,true),
('BV','Bouvet Island',true,false,34,true),
('BW','Botswana',true,false,35,true),
('BY','Belarus',true,false,36,true),
('BZ','Belize',true,false,37,true),
('CA','Canada',true,false,38,true),
('CC','Cocos Islands',true,false,39,true),
('CD','DR Congo',true,false,40,true),
('CF','Central African Republic',true,false,41,true),
('CG','Congo',true,false,42,true),
('CH','Switzerland',true,false,43,true),
('CI','Cote d''Ivoire',true,false,44,true),
('CK','Cook Islands',true,false,45,true),
('CL','Chile',true,false,46,true),
('CM','Cameroon',true,false,47,true),
('CN','China',true,false,48,true),
('CO','Colombia',true,false,49,true),
('CR','Costa Rica',true,false,50,true),
('CU','Cuba',true,false,51,true),
('CV','Cabo Verde',true,false,52,true),
('CW','Curacao',true,false,53,true),
('CX','Christmas Island',true,false,54,true),
('CY','Cyprus',true,false,55,true),
('CZ','Czechia',true,false,56,true),
('DE','Germany',true,false,57,true),
('DJ','Djibouti',true,false,58,true),
('DK','Denmark',true,false,59,true),
('DM','Dominica',true,false,60,true),
('DO','Dominican Republic',true,false,61,true),
('DZ','Algeria',true,false,62,true),
('EC','Ecuador',true,false,63,true),
('EE','Estonia',true,false,64,true),
('EG','Egypt',true,false,65,true),
('EH','Western Sahara',true,false,66,true),
('ER','Eritrea',true,false,67,true),
('ES','Spain',true,false,68,true),
('ET','Ethiopia',true,false,69,true),
('FI','Finland',true,false,70,true),
('FJ','Fiji',true,false,71,true),
('FK','Falkland Islands',true,false,72,true),
('FM','Micronesia',true,false,73,true),
('FO','Faroe Islands',true,false,74,true),
('FR','France',true,false,75,true),
('GA','Gabon',true,false,76,true),
('GB','United Kingdom',true,false,77,true),
('GD','Grenada',true,false,78,true),
('GE','Georgia',true,false,79,true),
('GF','French Guiana',true,false,80,true),
('GG','Guernsey',true,false,81,true),
('GH','Ghana',true,false,82,true),
('GI','Gibraltar',true,false,83,true),
('GL','Greenland',true,false,84,true),
('GM','Gambia',true,false,85,true),
('GN','Guinea',true,false,86,true),
('GP','Guadeloupe',true,false,87,true),
('GQ','Equatorial Guinea',true,false,88,true),
('GR','Greece',true,false,89,true),
('GS','South Georgia',true,false,90,true),
('GT','Guatemala',true,false,91,true),
('GU','Guam',true,false,92,true),
('GW','Guinea-Bissau',true,false,93,true),
('GY','Guyana',true,false,94,true),
('HK','Hong Kong',true,false,95,true),
('HM','Heard Island',true,false,96,true),
('HN','Honduras',true,false,97,true),
('HR','Croatia',true,false,98,true),
('HT','Haiti',true,false,99,true),
('HU','Hungary',true,false,100,true),
('ID','Indonesia',true,false,101,true),
('IE','Ireland',true,false,102,true),
('IL','Israel',true,false,103,true),
('IM','Isle of Man',true,false,104,true),
('IN','India',true,false,105,true),
('IO','British Indian Ocean Territory',true,false,106,true),
('IQ','Iraq',true,false,107,true),
('IR','Iran',true,false,108,true),
('IS','Iceland',true,false,109,true),
('IT','Italy',true,false,110,true),
('JE','Jersey',true,false,111,true),
('JM','Jamaica',true,false,112,true),
('JO','Jordan',true,false,113,true),
('JP','Japan',true,false,114,true),
('KE','Kenya',true,false,115,true),
('KG','Kyrgyzstan',true,false,116,true),
('KH','Cambodia',true,false,117,true),
('KI','Kiribati',true,false,118,true),
('KM','Comoros',true,false,119,true),
('KN','Saint Kitts and Nevis',true,false,120,true),
('KP','North Korea',true,false,121,true),
('KR','South Korea',true,false,122,true),
('KW','Kuwait',true,false,123,true),
('KY','Cayman Islands',true,false,124,true),
('KZ','Kazakhstan',true,false,125,true),
('LA','Laos',true,false,126,true),
('LB','Lebanon',true,false,127,true),
('LC','Saint Lucia',true,false,128,true),
('LI','Liechtenstein',true,false,129,true),
('LK','Sri Lanka',true,false,130,true),
('LR','Liberia',true,false,131,true),
('LS','Lesotho',true,false,132,true),
('LT','Lithuania',true,false,133,true),
('LU','Luxembourg',true,false,134,true),
('LV','Latvia',true,false,135,true),
('LY','Libya',true,false,136,true),
('MA','Morocco',true,false,137,true),
('MC','Monaco',true,false,138,true),
('MD','Moldova',true,false,139,true),
('ME','Montenegro',true,false,140,true),
('MF','Saint Martin',true,false,141,true),
('MG','Madagascar',true,false,142,true),
('MH','Marshall Islands',true,false,143,true),
('MK','North Macedonia',true,false,144,true),
('ML','Mali',true,false,145,true),
('MM','Myanmar',true,false,146,true),
('MN','Mongolia',true,false,147,true),
('MO','Macao',true,false,148,true),
('MP','Northern Mariana Islands',true,false,149,true),
('MQ','Martinique',true,false,150,true),
('MR','Mauritania',true,false,151,true),
('MS','Montserrat',true,false,152,true),
('MT','Malta',true,false,153,true),
('MU','Mauritius',true,false,154,true),
('MV','Maldives',true,false,155,true),
('MW','Malawi',true,false,156,true),
('MX','Mexico',true,false,157,true),
('MY','Malaysia',true,false,158,true),
('MZ','Mozambique',true,false,159,true),
('NA','Namibia',true,false,160,true),
('NC','New Caledonia',true,false,161,true),
('NE','Niger',true,false,162,true),
('NF','Norfolk Island',true,false,163,true),
('NG','Nigeria',true,false,164,true),
('NI','Nicaragua',true,false,165,true),
('NL','Netherlands',true,false,166,true),
('NO','Norway',true,false,167,true),
('NP','Nepal',true,false,168,true),
('NR','Nauru',true,false,169,true),
('NU','Niue',true,false,170,true),
('NZ','New Zealand',true,false,171,true),
('OM','Oman',true,false,172,true),
('PA','Panama',true,false,173,true),
('PE','Peru',true,false,174,true),
('PF','French Polynesia',true,false,175,true),
('PG','Papua New Guinea',true,false,176,true),
('PH','Philippines',true,false,177,true),
('PK','Pakistan',true,false,178,true),
('PL','Poland',true,false,179,true),
('PM','Saint Pierre and Miquelon',true,false,180,true),
('PN','Pitcairn',true,false,181,true),
('PR','Puerto Rico',true,false,182,true),
('PS','Palestine',true,false,183,true),
('PT','Portugal',true,false,184,true),
('PW','Palau',true,false,185,true),
('PY','Paraguay',true,false,186,true),
('QA','Qatar',true,false,187,true),
('RE','Reunion',true,false,188,true),
('RO','Romania',true,false,189,true),
('RS','Serbia',true,false,190,true),
('RU','Russia',true,false,191,true),
('RW','Rwanda',true,false,192,true),
('SA','Saudi Arabia',true,false,193,true),
('SB','Solomon Islands',true,false,194,true),
('SC','Seychelles',true,false,195,true),
('SD','Sudan',true,false,196,true),
('SE','Sweden',true,false,197,true),
('SG','Singapore',true,false,198,true),
('SH','Saint Helena',true,false,199,true),
('SI','Slovenia',true,false,200,true),
('SJ','Svalbard and Jan Mayen',true,false,201,true),
('SK','Slovakia',true,false,202,true),
('SL','Sierra Leone',true,false,203,true),
('SM','San Marino',true,false,204,true),
('SN','Senegal',true,false,205,true),
('SO','Somalia',true,false,206,true),
('SR','Suriname',true,false,207,true),
('SS','South Sudan',true,false,208,true),
('ST','Sao Tome and Principe',true,false,209,true),
('SV','El Salvador',true,false,210,true),
('SX','Sint Maarten',true,false,211,true),
('SY','Syria',true,false,212,true),
('SZ','Eswatini',true,false,213,true),
('TC','Turks and Caicos Islands',true,false,214,true),
('TD','Chad',true,false,215,true),
('TF','French Southern Territories',true,false,216,true),
('TG','Togo',true,false,217,true),
('TH','Thailand',true,false,218,true),
('TJ','Tajikistan',true,false,219,true),
('TK','Tokelau',true,false,220,true),
('TL','Timor-Leste',true,false,221,true),
('TM','Turkmenistan',true,false,222,true),
('TN','Tunisia',true,false,223,true),
('TO','Tonga',true,false,224,true),
('TR','Turkiye',true,true,225,true),
('TT','Trinidad and Tobago',true,false,226,true),
('TV','Tuvalu',true,false,227,true),
('TW','Taiwan',true,false,228,true),
('TZ','Tanzania',true,false,229,true),
('UA','Ukraine',true,false,230,true),
('UG','Uganda',true,false,231,true),
('UM','US Minor Outlying Islands',true,false,232,true),
('US','United States',true,false,233,true),
('UY','Uruguay',true,false,234,true),
('UZ','Uzbekistan',true,false,235,true),
('VA','Vatican City',true,false,236,true),
('VC','Saint Vincent and the Grenadines',true,false,237,true),
('VE','Venezuela',true,false,238,true),
('VG','British Virgin Islands',true,false,239,true),
('VI','US Virgin Islands',true,false,240,true),
('VN','Vietnam',true,false,241,true),
('VU','Vanuatu',true,false,242,true),
('WF','Wallis and Futuna',true,false,243,true),
('WS','Samoa',true,false,244,true),
('YE','Yemen',true,false,245,true),
('YT','Mayotte',true,false,246,true),
('ZA','South Africa',true,false,247,true),
('ZM','Zambia',true,false,248,true),
('ZW','Zimbabwe',true,false,249,true)
on conflict (code) do update set
  is_active = true,
  league_enabled = true,
  sort_order = coalesce(public.geo_countries.sort_order, excluded.sort_order);

-- Keep TR display name
update public.geo_countries set name = 'Turkiye' where code = 'TR' and name is distinct from 'Turkiye';
-- Prefer existing Turkish UI name if already Turkiye/Türkiye
update public.geo_countries set name = 'Türkiye' where code = 'TR';

