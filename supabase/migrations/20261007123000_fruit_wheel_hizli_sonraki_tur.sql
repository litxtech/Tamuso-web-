-- Çark animasyonu bitince sonraki bahis turu açılsın.
-- Sonuç ekranı (result_seconds + 1 sn) beklenmez; spin penceresi 2 sn.

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

  if v_status in ('SETTLING','RESULT','NEXT_ROUND','SETTLED') then
    if r.settled_at is null then
      perform public.fruit_wheel_settle_round(r.id);
    end if;
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

revoke all on function public.fruit_wheel_advance() from public, anon, authenticated;

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
    spin_seconds = least(12, greatest(2, coalesce((p_patch->>'spinSeconds')::int, spin_seconds))),
    result_seconds = least(20, greatest(1, coalesce((p_patch->>'resultSeconds')::int, result_seconds))),
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

revoke all on function public.fruit_wheel_admin_save_policy(jsonb) from public, anon;
grant execute on function public.fruit_wheel_admin_save_policy(jsonb) to authenticated;

update public.fruit_wheel_policy
set spin_seconds = 2,
    result_seconds = 1,
    updated_at = now()
where id = 1;

-- Açık bahis turuna dokunma. Kilitlenmiş turda spin biter bitmez sonraki tur gelsin.
update public.fruit_wheel_rounds
set result_at = least(result_at, locks_at + interval '2 seconds'),
    reveal_until = least(reveal_until, locks_at + interval '2 seconds'),
    next_at = least(next_at, locks_at + interval '2 seconds')
where status <> 'SETTLED'
  and locks_at <= now();
