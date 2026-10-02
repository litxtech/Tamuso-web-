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
