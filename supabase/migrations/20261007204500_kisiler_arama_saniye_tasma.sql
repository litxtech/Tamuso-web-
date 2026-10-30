-- Kisi arama onizlemesi: dev coin bakiyesi * 60 / fiyat int4 sinirini asinca
-- integer out of range (22003) firlatiyordu. Tahmini sureyi sinirla.

create or replace function public.kisiler_arama_onizleme(
  p_callee_id uuid,
  p_call_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_feat jsonb;
  v_type text := lower(trim(p_call_type));
  v_cfg public.people_discovery_config%rowtype;
  v_callee public.people_call_settings%rowtype;
  v_caller public.people_call_settings%rowtype;
  v_price int;
  v_balance bigint;
  v_free int := 0;
  v_prof record;
  v_calls_open boolean;
  v_voice_ok boolean;
  v_video_ok boolean;
  v_block boolean;
  v_reason text := null;
  v_can boolean := true;
  v_paid boolean;
  v_est int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_callee_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_callee', 'error_code', 'invalid_callee');
  end if;

  v_feat := public.kisiler_feature_effective();
  if not coalesce((v_feat->>'people_discovery_enabled')::boolean, false) then
    return jsonb_build_object(
      'ok', false,
      'error', 'feature_unavailable',
      'error_code', 'feature_unavailable',
      'can_start', false
    );
  end if;

  if v_type not in ('audio', 'video') then
    return jsonb_build_object('ok', false, 'error', 'invalid_type', 'error_code', 'invalid_type', 'can_start', false);
  end if;

  select * into v_cfg from public.people_discovery_config where id = 1;
  v_callee := public.kisiler_ayar_ensure(p_callee_id);
  v_caller := public.kisiler_ayar_ensure(v_uid);
  v_free := greatest(0, coalesce(v_caller.free_call_seconds_remaining, 0));

  insert into public.wallets (user_id, coins, diamonds)
  values (v_uid, 0, 0)
  on conflict (user_id) do nothing;
  select coalesce(coins, 0) into v_balance
  from public.wallets
  where user_id = v_uid;

  if v_type = 'audio' then
    v_price := public.kisiler_clamp_price(
      v_callee.voice_price_per_minute, coalesce(v_cfg.voice_price_min, 25), coalesce(v_cfg.voice_price_max, 70)
    );
  else
    v_price := public.kisiler_clamp_price(
      v_callee.video_price_per_minute, coalesce(v_cfg.video_price_min, 25), coalesce(v_cfg.video_price_max, 70)
    );
  end if;

  select display_name, username, avatar_url into v_prof
  from public.profiles where id = p_callee_id;

  v_block := public.kullanicilar_engelli_mi(v_uid, p_callee_id);
  v_calls_open := coalesce(v_callee.calls_open, true);
  v_voice_ok := coalesce(v_callee.voice_calls_enabled, true);
  v_video_ok := coalesce(v_callee.video_calls_enabled, true);
  v_paid := coalesce((v_feat->>'paid_calling_enabled')::boolean, false);

  if v_block then
    v_can := false;
    v_reason := 'blocked';
  elsif not v_calls_open then
    v_can := false;
    v_reason := 'calls_closed';
  elsif v_type = 'audio' and not v_voice_ok then
    v_can := false;
    v_reason := 'voice_disabled';
  elsif v_type = 'video' and not v_video_ok then
    v_can := false;
    v_reason := 'video_disabled';
  elsif v_callee.call_permission = 'nobody' then
    v_can := false;
    v_reason := 'permission_nobody';
  elsif v_paid and v_free <= 0 and coalesce(v_balance, 0) < v_price then
    v_can := false;
    v_reason := 'insufficient_coins';
  end if;

  if v_type = 'audio' and not coalesce((v_feat->>'voice_call_enabled')::boolean, false) then
    v_can := false;
    v_reason := 'feature_voice_off';
  end if;
  if v_type = 'video' and not coalesce((v_feat->>'video_call_enabled')::boolean, false) then
    v_can := false;
    v_reason := 'feature_video_off';
  end if;

  -- Buyuk coin bakiyesi (balance*60/fiyat) int4 sinirini asar.
  v_est := least(
    2000000000::bigint,
    coalesce(v_free, 0)::bigint + case
      when coalesce(v_price, 0) > 0 then
        floor((greatest(coalesce(v_balance, 0), 0)::numeric * 60) / v_price)::bigint
      else 0::bigint
    end
  )::int;

  return jsonb_build_object(
    'ok', true,
    'callee_id', p_callee_id,
    'display_name', v_prof.display_name,
    'username', v_prof.username,
    'avatar_url', v_prof.avatar_url,
    'call_type', v_type,
    'price_per_minute', v_price,
    'is_paid', v_paid,
    'caller_balance', coalesce(v_balance, 0),
    'free_seconds_remaining', v_free,
    'estimated_seconds', v_est,
    'billing_mode', v_cfg.billing_mode,
    'platform_call_fee', v_cfg.platform_call_fee,
    'calls_open', v_calls_open,
    'can_start', v_can,
    'block_reason', v_reason,
    'message', case v_reason
      when 'calls_closed' then 'Bu kullanıcı aramalara kendini kapattı.'
      when 'insufficient_coins' then 'Yetersiz coin bakiyesi — ücretsiz hak veya en az 1 dakika için coin gerekir.'
      when 'voice_disabled' then 'Bu kullanıcı sesli arama kabul etmiyor.'
      when 'video_disabled' then 'Bu kullanıcı görüntülü arama kabul etmiyor.'
      when 'permission_nobody' then 'Bu kullanıcı arama kabul etmiyor.'
      when 'blocked' then 'Bu kullanıcıyla iletişim engellenmiş.'
      else null
    end
  );
end;
$$;

create or replace function public.kisiler_gorusme_billing_heartbeat(p_call_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.direct_calls%rowtype;
  v_cfg public.people_discovery_config%rowtype;
  v_caller public.people_call_settings%rowtype;
  v_seconds int;
  v_price int;
  v_balance bigint;
  v_free_remaining int;
  v_free_target int;
  v_free_delta int;
  v_paid_seconds int;
  v_coin_afford_sec int;
  v_remaining_sec int;
  v_need_coins bigint;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_row from public.direct_calls where id = p_call_id for update;
  if not found then raise exception 'Cagri yok'; end if;
  if v_uid <> v_row.caller_id and v_uid <> v_row.callee_id then
    raise exception 'Forbidden';
  end if;

  update public.direct_calls set last_billing_heartbeat_at = now() where id = p_call_id;

  if not v_row.is_paid or v_row.status <> 'active' or v_row.answered_at is null then
    return jsonb_build_object(
      'ok', true,
      'continue', true,
      'low_balance', false,
      'estimated_remaining_sec', null,
      'free_seconds_remaining', null
    );
  end if;

  select * into v_cfg from public.people_discovery_config where id = 1;
  v_price := coalesce(v_row.price_per_minute_snapshot, 0);
  v_seconds := greatest(0, floor(extract(epoch from (now() - v_row.answered_at)))::int);

  -- Caller free sync
  perform 1 from public.people_call_settings where user_id = v_row.caller_id for update;
  v_caller := public.kisiler_ayar_ensure(v_row.caller_id);
  select * into v_caller from public.people_call_settings where user_id = v_row.caller_id;
  v_free_remaining := greatest(0, coalesce(v_caller.free_call_seconds_remaining, 0));

  v_free_target := least(
    v_seconds,
    coalesce(v_row.free_seconds_consumed, 0) + v_free_remaining
  );
  v_free_delta := greatest(0, v_free_target - coalesce(v_row.free_seconds_consumed, 0));
  if v_free_delta > 0 then
    update public.people_call_settings set
      free_call_seconds_remaining = greatest(0, free_call_seconds_remaining - v_free_delta),
      updated_at = now()
    where user_id = v_row.caller_id
    returning free_call_seconds_remaining into v_free_remaining;

    update public.direct_calls set
      free_seconds_consumed = v_free_target
    where id = p_call_id;
    v_row.free_seconds_consumed := v_free_target;
  else
    v_free_remaining := greatest(0, coalesce(v_caller.free_call_seconds_remaining, 0));
  end if;

  v_paid_seconds := greatest(0, v_seconds - coalesce(v_row.free_seconds_consumed, 0));

  select coalesce(coins, 0) into v_balance
  from public.wallets where user_id = v_row.caller_id;

  -- +5 sn için yeterli mi? (free + coin)
  v_need_coins := public.kisiler_billable_coins(
    greatest(0, (v_seconds + 5) - (
      least(
        v_seconds + 5,
        coalesce(v_row.free_seconds_consumed, 0) + v_free_remaining
      )
    )),
    v_price,
    coalesce(v_cfg.billing_mode, 'per_second_ceil')
  );

  if v_need_coins > coalesce(v_balance, 0) then
    update public.direct_calls set
      status = 'ended',
      ended_at = now(),
      ended_by = v_row.caller_id,
      end_reason = 'insufficient_balance',
      billing_status = 'FINALIZING'
    where id = p_call_id and status = 'active';

    perform public.kisiler_gorusme_billing_finalize(p_call_id);

    return jsonb_build_object(
      'ok', true,
      'continue', false,
      'low_balance', true,
      'ended', true,
      'reason', 'insufficient_balance',
      'estimated_remaining_sec', 0,
      'free_seconds_remaining', v_free_remaining,
      'billable_seconds_so_far', v_paid_seconds
    );
  end if;

  if v_price <= 0 then
    v_coin_afford_sec := 999999;
  else
    v_coin_afford_sec := least(
      2000000000::bigint,
      floor((greatest(coalesce(v_balance, 0), 0)::numeric * 60) / v_price)::bigint
    )::int;
  end if;

  v_remaining_sec := least(
    2000000000::bigint,
    coalesce(v_free_remaining, 0)::bigint
      + greatest(0, coalesce(v_coin_afford_sec, 0)::bigint - coalesce(v_paid_seconds, 0))
  )::int;

  return jsonb_build_object(
    'ok', true,
    'continue', true,
    'low_balance', v_remaining_sec <= 60,
    'estimated_remaining_sec', v_remaining_sec,
    'free_seconds_remaining', v_free_remaining,
    'billable_seconds_so_far', v_paid_seconds,
    'paid_seconds_so_far', v_paid_seconds,
    'free_seconds_consumed', coalesce(v_row.free_seconds_consumed, 0)
  );
end;
$$;

grant execute on function public.kisiler_arama_onizleme(uuid, text) to authenticated;
grant execute on function public.kisiler_gorusme_billing_heartbeat(uuid) to authenticated;
