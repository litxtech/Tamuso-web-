
create or replace function public.fruit_wheel_state(p_round uuid, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.fruit_wheel_rounds%rowtype;
  v_status text;
  v_reveal boolean;
  v_countdown int;
  v_players int;
  v_avatars jsonb;
  v_recent jsonb;
  v_mine jsonb;
  v_settle jsonb;
begin
  if p_round is null then
    return jsonb_build_object(
      'ok', true,
      'gameEnabled', public.fruit_wheel_can_open(),
      'round', null
    );
  end if;

  select * into r from public.fruit_wheel_rounds where id = p_round;
  v_countdown := coalesce((r.limits_snapshot->>'lockCountdownSeconds')::int, 3);
  v_status := public.fruit_wheel_phase(
    r.locks_at, r.result_at, r.reveal_until, r.next_at, v_countdown, now()
  );
  v_reveal := v_status in ('SPINNING','SETTLING','RESULT','NEXT_ROUND','SETTLED');

  select count(*) into v_players
  from public.fruit_wheel_presence
  where last_seen > now() - interval '20 seconds';

  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'avatarUrl', q.avatar_url)), '[]'::jsonb)
  into v_avatars
  from (
    select p.id, p.avatar_url
    from public.fruit_wheel_presence pr
    join public.profiles p on p.id = pr.user_id
    where pr.last_seen > now() - interval '20 seconds'
    order by pr.last_seen desc
    limit 4
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'roundNo', h.round_no,
    'fruitId', h.winning_fruit_id
  ) order by h.settled_at desc nulls last), '[]'::jsonb)
  into v_recent
  from (
    select round_no, winning_fruit_id, settled_at
    from public.fruit_wheel_rounds
    where settled_at is not null
    order by settled_at desc
    limit 8
  ) h;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fruitId', s.fruit_id,
    'amount', s.amount,
    'status', s.status
  )), '[]'::jsonb)
  into v_mine
  from public.fruit_wheel_selections s
  where s.round_id = r.id and s.user_id = p_user;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fruitId', st.fruit_id,
    'stake', st.stake,
    'matched', st.matched,
    'multiplier', st.multiplier,
    'payout', st.payout
  )), '[]'::jsonb)
  into v_settle
  from public.fruit_wheel_settlements st
  where st.round_id = r.id and st.user_id = p_user;

  return jsonb_build_object(
    'ok', true,
    'serverNow', now(),
    'gameEnabled', public.fruit_wheel_can_open() or v_status <> 'SETTLED',
    'devTools', public.fruit_wheel_admin_mi()
      and (select economy_mode from public.fruit_wheel_policy where id = 1) = 'TEST_BALANCE',
    'displayName', coalesce(r.limits_snapshot->>'displayName', 'Fruit Wheel'),
    'economyMode', r.economy_mode,
    'balance', public.fruit_wheel_balance_value(p_user, r.economy_mode),
    'activePlayers', v_players,
    'avatars', v_avatars,
    'recent', v_recent,
    'fruits', public.fruit_wheel_public_fruits(r.config_snapshot->'fruits'),
    'limits', jsonb_build_object(
      'minimumSelection', (r.limits_snapshot->>'minimumSelection')::bigint,
      'maximumSelectionPerFruit', (r.limits_snapshot->>'maximumSelectionPerFruit')::bigint,
      'maximumTotalPerRound', (r.limits_snapshot->>'maximumTotalPerRound')::bigint,
      'quickAmounts', coalesce(r.limits_snapshot->'quickAmounts', '[]'::jsonb)
    ),
    'mySelections', v_mine,
    'mySettlement', case when v_reveal then v_settle else '[]'::jsonb end,
    'round', jsonb_build_object(
      'id', r.id,
      'roundNo', r.round_no,
      'status', v_status,
      'configVersion', r.config_version,
      'opensAt', r.opens_at,
      'locksAt', r.locks_at,
      'resultAt', r.result_at,
      'revealUntil', r.reveal_until,
      'nextAt', r.next_at,
      'winningFruitId', case when v_reveal then r.winning_fruit_id else null end,
      'segmentIndex', case when v_reveal then r.segment_index else null end,
      'multiplier', case when v_reveal then r.multiplier else null end,
      'presentationTier', case when v_reveal then r.presentation_tier else null end
    )
  );
end;
$$;

revoke all on function public.fruit_wheel_state(uuid, uuid) from public, anon, authenticated;

create or replace function public.fruit_wheel_sync()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_round uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  v_round := public.fruit_wheel_advance();
  return public.fruit_wheel_state(v_round, v_uid);
end;
$$;

revoke all on function public.fruit_wheel_sync() from public, anon;
grant execute on function public.fruit_wheel_sync() to authenticated;

create or replace function public.fruit_wheel_heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  insert into public.fruit_wheel_presence (user_id, last_seen)
  values (v_uid, now())
  on conflict (user_id) do update set last_seen = now();
end;
$$;

revoke all on function public.fruit_wheel_heartbeat() from public, anon;
grant execute on function public.fruit_wheel_heartbeat() to authenticated;

create or replace function public.fruit_wheel_confirm(p_round_id uuid, p_key text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.fruit_wheel_rounds%rowtype;
  v_cmd public.fruit_wheel_commands%rowtype;
  v_item jsonb;
  v_id text;
  v_amt bigint;
  v_seen text[] := '{}';
  v_new_total bigint := 0;
  v_old_total bigint := 0;
  v_delta bigint;
  v_after bigint;
  v_min bigint;
  v_max_f bigint;
  v_max_t bigint;
  v_enabled boolean;
  v_cmd_id uuid;
  v_gate text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  if p_key is null or length(trim(p_key)) < 8 or length(p_key) > 80 then
    return jsonb_build_object('ok', false, 'code', 'idempotency');
  end if;
  if public.kill_switch_aktif_mi('kill_games')
     or not public.ozellik_bayragi_aktif_mi('games_enabled')
     or not public.ozellik_bayragi_aktif_mi('fruit_wheel_enabled') then
    return jsonb_build_object('ok', false, 'code', 'feature_disabled');
  end if;

  perform pg_advisory_xact_lock(84218421);
  perform public.fruit_wheel_advance();

  select * into r from public.fruit_wheel_rounds where id = p_round_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'round_closed');
  end if;

  perform public.fruit_wheel_lock_balance(v_uid, r.economy_mode);

  select * into v_cmd
  from public.fruit_wheel_commands
  where user_id = v_uid and idempotency_key = trim(p_key);
  if found then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'balance', v_cmd.balance_after,
      'roundId', v_cmd.round_id
    );
  end if;

  if now() >= r.locks_at or r.settled_at is not null then
    return jsonb_build_object('ok', false, 'code', 'round_closed');
  end if;

  v_gate := public.fruit_wheel_user_eligible(v_uid, r.economy_mode);
  if v_gate is not null then
    return jsonb_build_object('ok', false, 'code', v_gate);
  end if;

  v_min := coalesce((r.limits_snapshot->>'minimumSelection')::bigint, 10);
  v_max_f := coalesce((r.limits_snapshot->>'maximumSelectionPerFruit')::bigint, 100000);
  v_max_t := coalesce((r.limits_snapshot->>'maximumTotalPerRound')::bigint, 500000);

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_id := v_item->>'fruitId';
    if v_id is null or v_id = any (v_seen) then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end if;
    begin
      v_amt := trunc((v_item->>'amount')::numeric)::bigint;
    exception when others then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end;
    if v_amt is null or v_amt < 0 then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end if;
    if v_amt = 0 then
      continue;
    end if;
    select coalesce((f->>'enabled')::boolean, true) into v_enabled
    from jsonb_array_elements(r.config_snapshot->'fruits') f
    where f->>'id' = v_id
    limit 1;
    if v_enabled is null or not v_enabled then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end if;
    if v_amt < v_min or v_amt > v_max_f then
      return jsonb_build_object('ok', false, 'code', 'limit');
    end if;
    v_seen := v_seen || v_id;
    v_new_total := v_new_total + v_amt;
  end loop;

  if v_new_total > v_max_t then
    return jsonb_build_object('ok', false, 'code', 'limit');
  end if;

  select coalesce(sum(amount), 0) into v_old_total
  from public.fruit_wheel_selections
  where round_id = r.id and user_id = v_uid;

  v_delta := v_old_total - v_new_total;

  begin
    v_after := public.fruit_wheel_apply_delta(
      v_uid,
      r.economy_mode,
      v_delta,
      case when v_delta >= 0 then 'fruit_wheel_selection_refund' else 'fruit_wheel_selection' end,
      r.id,
      null,
      'fw_sel_' || v_uid::text || '_' || trim(p_key)
    );
  exception when others then
    if sqlerrm ilike '%Insufficient%' then
      return jsonb_build_object('ok', false, 'code', 'insufficient_balance');
    end if;
    raise;
  end;

  delete from public.fruit_wheel_selections
  where round_id = r.id and user_id = v_uid;

  insert into public.fruit_wheel_selections (round_id, user_id, fruit_id, amount, status)
  select r.id, v_uid, v_id2, v_amt2, 'confirmed'
  from (
    select item->>'fruitId' as v_id2, trunc((item->>'amount')::numeric)::bigint as v_amt2
    from jsonb_array_elements(p_items) item
  ) q
  where v_amt2 > 0;

  insert into public.fruit_wheel_commands (
    user_id, round_id, idempotency_key, selections, delta, balance_after
  ) values (
    v_uid, r.id, trim(p_key), p_items, v_delta, v_after
  )
  returning id into v_cmd_id;

  update public.fruit_wheel_ledger
  set ref_id = v_cmd_id
  where idempotency_key = 'fw_sel_' || v_uid::text || '_' || trim(p_key);

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'balance', v_after,
    'roundId', r.id,
    'total', v_new_total
  );
end;
$$;

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