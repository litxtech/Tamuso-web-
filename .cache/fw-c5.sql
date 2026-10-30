revoke all on function public.fruit_wheel_confirm(uuid, text, jsonb) from public, anon;
grant execute on function public.fruit_wheel_confirm(uuid, text, jsonb) to authenticated;

create or replace function public.fruit_wheel_history(p_limit int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := least(greatest(coalesce(p_limit, 30), 1), 50);
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;

  select coalesce(jsonb_agg(to_jsonb(q) order by q.settled_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      r.id,
      r.settled_at,
      r.round_no as "roundNo",
      r.winning_fruit_id as "winningFruitId",
      r.multiplier,
      r.presentation_tier as "presentationTier",
      r.settled_at as "settledAt",
      coalesce(sum(s.amount), 0) as "stakeTotal",
      coalesce(sum(st.payout), 0) as "payoutTotal",
      coalesce(jsonb_agg(jsonb_build_object(
        'fruitId', s.fruit_id,
        'amount', s.amount,
        'matched', coalesce(st.matched, false),
        'payout', coalesce(st.payout, 0)
      )) filter (where s.id is not null), '[]'::jsonb) as selections
    from public.fruit_wheel_rounds r
    join public.fruit_wheel_selections s
      on s.round_id = r.id and s.user_id = v_uid
    left join public.fruit_wheel_settlements st on st.selection_id = s.id
    where r.settled_at is not null
    group by r.id
    order by r.settled_at desc
    limit v_lim
  ) q;

  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

revoke all on function public.fruit_wheel_history(int) from public, anon;
grant execute on function public.fruit_wheel_history(int) to authenticated;

create or replace function public.fruit_wheel_admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pol public.fruit_wheel_policy%rowtype;
  v_cfg public.fruit_wheel_config_versions%rowtype;
  r public.fruit_wheel_rounds%rowtype;
  v_players int;
  v_sels int;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into v_pol from public.fruit_wheel_policy where id = 1;
  select * into v_cfg from public.fruit_wheel_config_versions
  where is_current order by version desc limit 1;
  select * into r from public.fruit_wheel_rounds
  where status <> 'SETTLED' order by created_at desc limit 1;
  select count(*) into v_players from public.fruit_wheel_presence
  where last_seen > now() - interval '20 seconds';
  select count(*) into v_sels from public.fruit_wheel_selections
  where round_id is not distinct from r.id;

  return jsonb_build_object(
    'ok', true,
    'gameEnabled', v_pol.game_enabled,
    'canOpen', public.fruit_wheel_can_open(),
    'flag', public.ozellik_bayragi_aktif_mi('fruit_wheel_enabled'),
    'policy', (to_jsonb(v_pol) - 'force_next_fruit_id') || jsonb_build_object(
      'forceArmed', v_pol.force_next_fruit_id is not null
    ),
    'fruits', coalesce(v_cfg.fruits, '[]'::jsonb),
    'configVersion', v_cfg.version,
    'currentRound', case when r.id is null then null else jsonb_build_object(
      'id', r.id,
      'roundNo', r.round_no,
      'status', r.status,
      'configVersion', r.config_version,
      'opensAt', r.opens_at,
      'locksAt', r.locks_at,
      'winningFruitId', case when r.settled_at is not null or r.status in ('SPINNING','SETTLING','RESULT','NEXT_ROUND','SETTLED')
        then r.winning_fruit_id else null end
    ) end,
    'activePlayers', v_players,
    'selectionRows', v_sels
  );
end;
$$;

revoke all on function public.fruit_wheel_admin_dashboard() from public, anon;
grant execute on function public.fruit_wheel_admin_dashboard() to authenticated;

create or replace function public.fruit_wheel_admin_math()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
  v_sum numeric := 0;
  v_rows jsonb;
  v_blend numeric := 0;
  v_n int := 0;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select fruits into v_cfg from public.fruit_wheel_config_versions
  where is_current order by version desc limit 1;

  select coalesce(sum((f->>'weight')::numeric), 0) into v_sum
  from jsonb_array_elements(v_cfg) f
  where coalesce((f->>'enabled')::boolean, true);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f->>'id',
    'multiplier', (f->>'multiplier')::numeric,
    'weight', (f->>'weight')::numeric,
    'enabled', coalesce((f->>'enabled')::boolean, true),
    'probability', case when v_sum > 0 and coalesce((f->>'enabled')::boolean, true)
      then round((f->>'weight')::numeric / v_sum, 6) else 0 end,
    'expectedReturnPerCoin', case when v_sum > 0 and coalesce((f->>'enabled')::boolean, true)
      then round(((f->>'weight')::numeric / v_sum) * (f->>'multiplier')::numeric, 6) else 0 end
  )), '[]'::jsonb)
  into v_rows
  from jsonb_array_elements(v_cfg) f;

  select coalesce(avg(
    case when v_sum > 0 then ((f->>'weight')::numeric / v_sum) * (f->>'multiplier')::numeric else 0 end
  ), 0), count(*)
  into v_blend, v_n
  from jsonb_array_elements(v_cfg) f
  where coalesce((f->>'enabled')::boolean, true);

  return jsonb_build_object(
    'ok', true,
    'fruits', v_rows,
    'equalSpreadExpectedReturn', round(coalesce(v_blend, 0), 6),
    'note', 'Per-coin expected return if the stake is on that fruit only. Not a payout guarantee.'
  );
end;
$$;

revoke all on function public.fruit_wheel_admin_math() from public, anon;
grant execute on function public.fruit_wheel_admin_math() to authenticated;

create or replace function public.fruit_wheel_admin_set_enabled(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old boolean;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select game_enabled into v_old from public.fruit_wheel_policy where id = 1;
  update public.fruit_wheel_policy
  set game_enabled = coalesce(p_enabled, false), updated_at = now(), updated_by = auth.uid()
  where id = 1;
  update public.game_control_configs
  set is_enabled = coalesce(p_enabled, false), updated_at = now()
  where game_code = 'fruit_wheel';
  update public.feature_flags
  set enabled = coalesce(p_enabled, false)
  where key = 'fruit_wheel_enabled';
  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
  values (auth.uid(), 'game_enabled', jsonb_build_object('enabled', v_old), jsonb_build_object('enabled', p_enabled));
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.fruit_wheel_admin_set_enabled(boolean) from public, anon;
grant execute on function public.fruit_wheel_admin_set_enabled(boolean) to authenticated;

create or replace function public.fruit_wheel_admin_save_policy(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_mode text;
  v_approved boolean;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select to_jsonb(p.*) into v_old from public.fruit_wheel_policy p where id = 1;
  v_mode := coalesce(p_patch->>'economyMode', v_old->>'economy_mode');
  if v_mode not in ('TEST_BALANCE','CLOSED_LOOP_GAME_BALANCE','PLATFORM_APPROVED_COIN') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  v_approved := coalesce((p_patch->>'platformApproved')::boolean, (v_old->>'platform_approved')::boolean);
  if v_mode = 'PLATFORM_APPROVED_COIN' and not v_approved then
    return jsonb_build_object('ok', false, 'code', 'platform_closed');
  end if;

  update public.fruit_wheel_policy set
    economy_mode = v_mode,
    platform_approved = v_approved,
    allowed_regions = case
      when p_patch ? 'allowedRegions' and jsonb_typeof(p_patch->'allowedRegions') = 'array' then (
        select coalesce(array_agg(value), '{}')
        from jsonb_array_elements_text(p_patch->'allowedRegions')
      )
      else allowed_regions
    end,
    minimum_age_policy = least(120, greatest(18, coalesce((p_patch->>'minimumAgePolicy')::int, minimum_age_policy))),
    display_name = left(coalesce(nullif(trim(p_patch->>'displayName'), ''), display_name), 40),
    open_seconds = least(120, greatest(8, coalesce((p_patch->>'openSeconds')::int, open_seconds))),
    lock_countdown_seconds = least(10, greatest(1, coalesce((p_patch->>'lockCountdownSeconds')::int, lock_countdown_seconds))),
    spin_seconds = least(12, greatest(4, coalesce((p_patch->>'spinSeconds')::int, spin_seconds))),
    result_seconds = least(20, greatest(3, coalesce((p_patch->>'resultSeconds')::int, result_seconds))),
    minimum_selection = greatest(1, coalesce((p_patch->>'minimumSelection')::bigint, minimum_selection)),
    maximum_selection_per_fruit = greatest(1, coalesce((p_patch->>'maximumSelectionPerFruit')::bigint, maximum_selection_per_fruit)),
    maximum_total_per_round = greatest(1, coalesce((p_patch->>'maximumTotalPerRound')::bigint, maximum_total_per_round)),
    quick_amounts = case
      when p_patch ? 'quickAmounts' and jsonb_typeof(p_patch->'quickAmounts') = 'array' then p_patch->'quickAmounts'
      else quick_amounts
    end,
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;

  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
  values (auth.uid(), 'policy_save', v_old, (select to_jsonb(p.*) from public.fruit_wheel_policy p where id = 1));

  return jsonb_build_object('ok', true);
end;
$$;