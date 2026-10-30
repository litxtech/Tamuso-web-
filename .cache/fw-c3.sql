revoke all on function public.fruit_wheel_lock_balance(uuid, text) from public, anon, authenticated;

create or replace function public.fruit_wheel_apply_delta(
  p_user uuid,
  p_mode text,
  p_delta bigint,
  p_reason text,
  p_round uuid,
  p_ref uuid,
  p_idem text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal bigint;
  v_after bigint;
  v_inserted uuid;
begin
  select id into v_inserted
  from public.fruit_wheel_ledger
  where idempotency_key = p_idem;
  if found then
    select balance_after into v_after
    from public.fruit_wheel_ledger where idempotency_key = p_idem;
    return v_after;
  end if;

  v_bal := public.fruit_wheel_lock_balance(p_user, p_mode);
  if v_bal + p_delta < 0 then
    raise exception 'Insufficient coins';
  end if;
  v_after := v_bal + p_delta;

  if p_mode = 'PLATFORM_APPROVED_COIN' then
    update public.wallets
    set coins = v_after, updated_at = now()
    where user_id = p_user;
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (p_user, 'coins', p_delta, v_after, p_reason, 'fruit_wheel', coalesce(p_ref, p_round));
  elsif p_mode = 'CLOSED_LOOP_GAME_BALANCE' then
    update public.fruit_wheel_balances
    set closed_loop_coins = v_after, updated_at = now()
    where user_id = p_user;
  else
    update public.fruit_wheel_balances
    set test_coins = v_after, updated_at = now()
    where user_id = p_user;
  end if;

  insert into public.fruit_wheel_ledger (
    user_id, economy_mode, delta, balance_after, reason, round_id, ref_id, idempotency_key
  ) values (
    p_user, p_mode, p_delta, v_after, p_reason, p_round, p_ref, p_idem
  );

  return v_after;
end;
$$;

revoke all on function public.fruit_wheel_apply_delta(uuid, text, bigint, text, uuid, uuid, text)
  from public, anon, authenticated;

create or replace function public.fruit_wheel_create_round()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pol public.fruit_wheel_policy%rowtype;
  v_cfg public.fruit_wheel_config_versions%rowtype;
  v_force text;
  v_pick jsonb;
  v_id uuid;
  v_open timestamptz := now();
begin
  select * into v_pol from public.fruit_wheel_policy where id = 1 for update;
  select * into v_cfg from public.fruit_wheel_config_versions where is_current
  order by version desc limit 1;
  if v_cfg.id is null then
    raise exception 'fruit wheel config missing';
  end if;

  v_force := null;
  if v_pol.economy_mode = 'TEST_BALANCE' then
    v_force := v_pol.force_next_fruit_id;
  end if;

  v_pick := public.fruit_wheel_pick(v_cfg.fruits, v_force);

  if v_force is not null then
    update public.fruit_wheel_policy
    set force_next_fruit_id = null, updated_at = now()
    where id = 1;
    insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
    values (
      null,
      'force_consumed',
      jsonb_build_object('force', v_force),
      jsonb_build_object('picked', v_pick->>'id', 'forced', v_pick->'forced')
    );
  end if;

  insert into public.fruit_wheel_rounds (
    status, config_version, economy_mode, config_snapshot, limits_snapshot,
    opens_at, locks_at, result_at, reveal_until, next_at,
    winning_fruit_id, segment_index, multiplier, presentation_tier, rng_seed
  ) values (
    'OPEN',
    v_cfg.version,
    v_pol.economy_mode,
    jsonb_build_object('fruits', v_cfg.fruits, 'version', v_cfg.version),
    jsonb_build_object(
      'minimumSelection', v_pol.minimum_selection,
      'maximumSelectionPerFruit', v_pol.maximum_selection_per_fruit,
      'maximumTotalPerRound', v_pol.maximum_total_per_round,
      'quickAmounts', v_pol.quick_amounts,
      'displayName', v_pol.display_name,
      'openSeconds', v_pol.open_seconds,
      'lockCountdownSeconds', v_pol.lock_countdown_seconds
    ),
    v_open,
    v_open + make_interval(secs => v_pol.open_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds + v_pol.result_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds + v_pol.result_seconds + 1),
    v_pick->>'id',
    (v_pick->>'index')::int,
    (v_pick->>'multiplier')::numeric,
    v_pick->>'tier',
    v_pick->>'seed'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.fruit_wheel_create_round() from public, anon, authenticated;

create or replace function public.fruit_wheel_phase(
  p_locks timestamptz,
  p_result timestamptz,
  p_reveal timestamptz,
  p_next timestamptz,
  p_countdown int,
  p_now timestamptz
)
returns text
language sql
immutable
as $$
  select case
    when p_now < p_locks - make_interval(secs => greatest(p_countdown, 0)) then 'OPEN'
    when p_now < p_locks then 'LOCKING'
    when p_now < p_locks + interval '0.45 seconds' then 'LOCKED'
    when p_now < p_result then 'SPINNING'
    when p_now < p_result + interval '0.35 seconds' then 'SETTLING'
    when p_now < p_reveal then 'RESULT'
    when p_now < p_next then 'NEXT_ROUND'
    else 'SETTLED'
  end;
$$;

revoke all on function public.fruit_wheel_phase(timestamptz, timestamptz, timestamptz, timestamptz, int, timestamptz)
  from public, anon, authenticated;

create or replace function public.fruit_wheel_publish_live(p_round uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.fruit_wheel_rounds%rowtype;
  v_status text;
  v_reveal text;
begin
  select * into r from public.fruit_wheel_rounds where id = p_round;
  if not found then return; end if;
  v_status := public.fruit_wheel_phase(
    r.locks_at, r.result_at, r.reveal_until, r.next_at,
    coalesce((r.limits_snapshot->>'lockCountdownSeconds')::int, 3),
    now()
  );
  v_reveal := null;
  if v_status in ('SPINNING','SETTLING','RESULT','NEXT_ROUND','SETTLED') then
    v_reveal := r.winning_fruit_id;
  end if;
  update public.fruit_wheel_rounds set status = v_status where id = r.id;
  insert into public.fruit_wheel_live (
    id, round_id, round_no, status, opens_at, locks_at, result_at, revealed_fruit_id, updated_at
  ) values (
    1, r.id, r.round_no, v_status, r.opens_at, r.locks_at, r.result_at, v_reveal, now()
  )
  on conflict (id) do update set
    round_id = excluded.round_id,
    round_no = excluded.round_no,
    status = excluded.status,
    opens_at = excluded.opens_at,
    locks_at = excluded.locks_at,
    result_at = excluded.result_at,
    revealed_fruit_id = excluded.revealed_fruit_id,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.fruit_wheel_publish_live(uuid) from public, anon, authenticated;

create or replace function public.fruit_wheel_settle_round(p_round uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.fruit_wheel_rounds%rowtype;
  s public.fruit_wheel_selections%rowtype;
  v_payout bigint;
  v_match boolean;
  v_sid uuid;
begin
  select * into r from public.fruit_wheel_rounds where id = p_round for update;
  if not found then return; end if;

  for s in
    select * from public.fruit_wheel_selections
    where round_id = p_round
    for update
  loop
    v_match := s.fruit_id = r.winning_fruit_id;
    v_payout := case when v_match then floor(s.amount * r.multiplier)::bigint else 0 end;

    insert into public.fruit_wheel_settlements (
      round_id, user_id, selection_id, fruit_id, stake, matched, multiplier, payout
    ) values (
      r.id, s.user_id, s.id, s.fruit_id, s.amount, v_match, r.multiplier, v_payout
    )
    on conflict (selection_id) do nothing
    returning id into v_sid;

    if v_sid is not null then
      update public.fruit_wheel_selections
      set status = 'settled', updated_at = now()
      where id = s.id;
      if v_payout > 0 then
        perform public.fruit_wheel_apply_delta(
          s.user_id,
          r.economy_mode,
          v_payout,
          'fruit_wheel_payout',
          r.id,
          s.id,
          'fw_payout_' || s.id::text
        );
      end if;
    end if;
    v_sid := null;
  end loop;

  update public.fruit_wheel_rounds
  set settled_at = coalesce(settled_at, now())
  where id = r.id;
end;
$$;

revoke all on function public.fruit_wheel_settle_round(uuid) from public, anon, authenticated;

create or replace function public.fruit_wheel_advance()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.fruit_wheel_rounds%rowtype;
  v_status text;
  v_countdown int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(84218421);

  select * into r
  from public.fruit_wheel_rounds
  where status <> 'SETTLED'
  order by created_at desc
  limit 1
  for update;

  if not found then
    if public.fruit_wheel_can_open() then
      v_id := public.fruit_wheel_create_round();
      perform public.fruit_wheel_publish_live(v_id);
      return v_id;
    end if;
    return null;
  end if;

  v_countdown := coalesce((r.limits_snapshot->>'lockCountdownSeconds')::int, 3);
  v_status := public.fruit_wheel_phase(
    r.locks_at, r.result_at, r.reveal_until, r.next_at, v_countdown, now()
  );

  if v_status in ('SETTLING','RESULT','NEXT_ROUND','SETTLED') and r.settled_at is null then
    perform public.fruit_wheel_settle_round(r.id);
    select * into r from public.fruit_wheel_rounds where id = r.id;
    v_status := public.fruit_wheel_phase(
      r.locks_at, r.result_at, r.reveal_until, r.next_at, v_countdown, now()
    );
  end if;

  if v_status = 'SETTLED' or (v_status = 'NEXT_ROUND' and now() >= r.next_at) then
    update public.fruit_wheel_rounds set status = 'SETTLED' where id = r.id;
    perform public.fruit_wheel_publish_live(r.id);
    if public.fruit_wheel_can_open() then
      v_id := public.fruit_wheel_create_round();
      perform public.fruit_wheel_publish_live(v_id);
      return v_id;
    end if;
    return r.id;
  end if;

  update public.fruit_wheel_rounds set status = v_status where id = r.id;
  perform public.fruit_wheel_publish_live(r.id);
  return r.id;
end;
$$;