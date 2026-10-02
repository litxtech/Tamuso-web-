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
