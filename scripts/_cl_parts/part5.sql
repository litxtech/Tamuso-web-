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
