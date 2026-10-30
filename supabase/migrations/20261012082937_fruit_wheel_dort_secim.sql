-- Meyve çarkı: 5/5/5/5/10/15/25/40 çarpan, en fazla 4 farklı meyve,
-- yüksek çarpan daha seyrek, bir önceki kazanan hemen tekrar etmez.
-- Ödeme kuralı değişmez: floor(bahis × kazanan çarpan), eşleşmeyen satır 0.
-- Açık turun snapshot'ı durur; yeni tur yeni config ile açılır.

create or replace function public.fruit_wheel_pick(p_fruits jsonb, p_force text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_id text;
  v_weight bigint;
  v_sum bigint := 0;
  v_roll bigint;
  v_acc bigint := 0;
  v_seed text;
  v_index int := 0;
  v_i int := 0;
  v_found boolean := false;
  v_exclude text;
begin
  v_seed := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);

  if p_force is not null then
    for v_row in select value from jsonb_array_elements(p_fruits)
    loop
      if v_row->>'id' = p_force and coalesce((v_row->>'enabled')::boolean, true) then
        return jsonb_build_object(
          'id', p_force,
          'index', v_i,
          'multiplier', (v_row->>'multiplier')::numeric,
          'tier', coalesce(v_row->>'tier', 'NORMAL'),
          'seed', v_seed,
          'forced', true
        );
      end if;
      v_i := v_i + 1;
    end loop;
  end if;

  select winning_fruit_id into v_exclude
  from public.fruit_wheel_rounds
  order by created_at desc
  limit 1;

  for v_row in select value from jsonb_array_elements(p_fruits)
  loop
    if coalesce((v_row->>'enabled')::boolean, true)
       and (v_exclude is null or v_row->>'id' is distinct from v_exclude) then
      v_sum := v_sum + coalesce((v_row->>'weight')::bigint, 0);
    end if;
  end loop;
  if v_sum <= 0 then
    v_exclude := null;
    v_sum := 0;
    for v_row in select value from jsonb_array_elements(p_fruits)
    loop
      if coalesce((v_row->>'enabled')::boolean, true) then
        v_sum := v_sum + coalesce((v_row->>'weight')::bigint, 0);
      end if;
    end loop;
  end if;
  if v_sum <= 0 then
    raise exception 'weights must not be all zero';
  end if;

  v_roll := mod((hashtext(v_seed)::bigint & 2147483647), v_sum);
  v_i := 0;
  for v_row in select value from jsonb_array_elements(p_fruits)
  loop
    if coalesce((v_row->>'enabled')::boolean, true)
       and (v_exclude is null or v_row->>'id' is distinct from v_exclude) then
      v_weight := coalesce((v_row->>'weight')::bigint, 0);
      v_acc := v_acc + v_weight;
      if not v_found and v_roll < v_acc and v_weight > 0 then
        v_id := v_row->>'id';
        v_index := v_i;
        v_found := true;
        return jsonb_build_object(
          'id', v_id,
          'index', v_index,
          'multiplier', (v_row->>'multiplier')::numeric,
          'tier', coalesce(v_row->>'tier', 'NORMAL'),
          'seed', v_seed,
          'forced', false
        );
      end if;
    end if;
    v_i := v_i + 1;
  end loop;
  raise exception 'pick failed';
end;
$$;

revoke all on function public.fruit_wheel_pick(jsonb, text) from public, anon, authenticated;

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

  if coalesce(array_length(v_seen, 1), 0) > 4 then
    return jsonb_build_object('ok', false, 'code', 'limit');
  end if;

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

do $$
declare
  v_old jsonb;
  v_new jsonb := $fw$
[
  {"id":"cherry","multiplier":5,"weight":120,"tier":"NORMAL","enabled":true,"accent":"#C23B4A"},
  {"id":"lemon","multiplier":5,"weight":120,"tier":"NORMAL","enabled":true,"accent":"#E6C44A"},
  {"id":"orange","multiplier":5,"weight":120,"tier":"NORMAL","enabled":true,"accent":"#E07A2F"},
  {"id":"watermelon","multiplier":5,"weight":120,"tier":"GOOD","enabled":true,"accent":"#3E9A62"},
  {"id":"grape","multiplier":10,"weight":60,"tier":"GOOD","enabled":true,"accent":"#7A45C4"},
  {"id":"strawberry","multiplier":15,"weight":40,"tier":"BIG","enabled":true,"accent":"#D4537E"},
  {"id":"pineapple","multiplier":25,"weight":24,"tier":"RARE","enabled":true,"accent":"#D4A017"},
  {"id":"kiwi","multiplier":40,"weight":15,"tier":"RARE","enabled":true,"accent":"#7CB342"}
]
$fw$::jsonb;
  v_err text;
  v_ver int;
begin
  v_err := public.fruit_wheel_validate_fruits(v_new);
  if v_err is not null then
    raise exception 'fruit config invalid: %', v_err;
  end if;
  select fruits into v_old from public.fruit_wheel_config_versions where is_current limit 1;
  select coalesce(max(version), 0) + 1 into v_ver from public.fruit_wheel_config_versions;
  update public.fruit_wheel_config_versions set is_current = false where is_current;
  insert into public.fruit_wheel_config_versions (version, fruits, is_current)
  values (v_ver, v_new, true);
  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
  values (
    null,
    'config_publish',
    jsonb_build_object('fruits', v_old),
    jsonb_build_object('version', v_ver, 'fruits', v_new, 'reason', 'dort_secim')
  );
end $$;
