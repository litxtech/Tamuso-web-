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
