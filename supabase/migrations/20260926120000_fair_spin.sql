-- Fair Spin — katalog + settle + public config
-- Client sonucu üretmez; coin otoritesi sunucuda.

insert into public.feature_flags (key, enabled, description) values
  ('fair_spin_enabled', true, 'Fair Spin çark oyunu')
on conflict (key) do nothing;

insert into public.game_catalog (
  game_code, name, description, min_players, max_players, default_duration_seconds, is_active
) values (
  'fair_spin',
  'Fair Spin',
  '8 dilimli adil cark — sunucu RNG, coin bahis',
  1,
  1,
  0,
  true
)
on conflict (game_code) do nothing;

insert into public.game_control_configs (
  game_code, is_enabled, mode, min_entry, max_entry, coin_rewards_enabled, min_players, max_players
) values (
  'fair_spin', true, 'NORMAL', 10, 10000, true, 1, 1
)
on conflict (game_code) do nothing;

insert into public.game_math_versions (
  game_code, math_version, display_name, description, config, is_active, simulated_rtp
) values (
  'fair_spin',
  'fair-spin-balanced-v1',
  'Dengeli',
  '8 dilimli agirlikli cark. Tahmini RTP ~%%96.5. Kullanici bazli gizli mudahale yok.',
  '{
    "mathVersion":"fair-spin-balanced-v1",
    "configVersion":"fair-spin-cfg-v1",
    "paytableVersion":"fair-spin-pay-v1",
    "segments":[
      {"id":"fs-0","multiplier":0,"weight":480,"color":"#3a3a4a","label":"0x"},
      {"id":"fs-05","multiplier":0.5,"weight":220,"color":"#1e3a5f","label":"0.5x"},
      {"id":"fs-1","multiplier":1,"weight":120,"color":"#0e4d5c","label":"1x"},
      {"id":"fs-2","multiplier":2,"weight":80,"color":"#2d4a3e","label":"2x"},
      {"id":"fs-3","multiplier":3,"weight":50,"color":"#3d2d5c","label":"3x"},
      {"id":"fs-5","multiplier":5,"weight":30,"color":"#5c4a1e","label":"5x"},
      {"id":"fs-10","multiplier":10,"weight":15,"color":"#5c2d1e","label":"10x"},
      {"id":"fs-25","multiplier":25,"weight":5,"color":"#5c1e3a","label":"25x"}
    ],
    "betPresets":[10,50,100,500,1000],
    "minBet":10,
    "maxBet":10000,
    "highWinMult":15,
    "highWinPayoutMult":5
  }'::jsonb,
  true,
  0.965
)
on conflict (game_code, math_version) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  config = excluded.config,
  is_active = excluded.is_active,
  simulated_rtp = excluded.simulated_rtp;

insert into public.game_runtime_settings (game_code, min_bet, max_bet, bet_presets)
values (
  'fair_spin',
  10,
  10000,
  '[10,50,100,500,1000]'::jsonb
)
on conflict (game_code) do nothing;

create table if not exists public.fair_spin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  room_id uuid references public.rooms(id) on delete set null,
  status text not null default 'active'
    check (status in ('active','closed')),
  math_version text not null default 'fair-spin-balanced-v1',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists fair_spin_sessions_user_idx
  on public.fair_spin_sessions (user_id, created_at desc);

create table if not exists public.fair_spin_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.fair_spin_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  idempotency_key text not null,
  status text not null default 'pending_playback'
    check (status in ('pending_playback','played','settled','failed')),
  bet_amount bigint not null,
  win_amount numeric(18,2) not null default 0,
  multiplier numeric(12,4) not null default 0,
  segment_id text not null default '',
  rng_seed text not null,
  math_version text not null,
  config_version text not null,
  paytable_version text not null,
  result_snapshot jsonb not null,
  balance_before bigint not null,
  balance_after bigint not null,
  created_at timestamptz not null default now(),
  played_at timestamptz,
  unique (user_id, idempotency_key)
);

create index if not exists fair_spin_rounds_user_status_idx
  on public.fair_spin_rounds (user_id, status, created_at desc);

alter table public.fair_spin_sessions enable row level security;
alter table public.fair_spin_rounds enable row level security;

drop policy if exists fair_spin_sessions_select_own on public.fair_spin_sessions;
create policy fair_spin_sessions_select_own on public.fair_spin_sessions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists fair_spin_rounds_select_own on public.fair_spin_rounds;
create policy fair_spin_rounds_select_own on public.fair_spin_rounds
  for select to authenticated using (user_id = auth.uid());

grant select on public.fair_spin_sessions to authenticated;
grant select on public.fair_spin_rounds to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.fair_spin_spin_context(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin boolean := false;
  v_coins bigint := 0;
begin
  if p_user_id is null then
    return jsonb_build_object('error', 'user required');
  end if;

  select coalesce(is_admin, false) into v_admin
  from public.profiles where id = p_user_id;

  select coalesce(coins, 0) into v_coins
  from public.wallets where user_id = p_user_id;

  return jsonb_build_object(
    'isAdmin', coalesce(v_admin, false),
    'coins', coalesce(v_coins, 0)
  );
end;
$$;

revoke all on function public.fair_spin_spin_context(uuid) from public;
revoke all on function public.fair_spin_spin_context(uuid) from anon;
grant execute on function public.fair_spin_spin_context(uuid) to service_role;

-- ---------------------------------------------------------------------------
create or replace function public.fair_spin_public_config()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_aktif jsonb;
  v_cfg jsonb;
  v_durum jsonb;
  v_coins bigint := 0;
  v_segments jsonb;
  v_presets jsonb;
  v_min bigint := 10;
  v_max bigint := 10000;
begin
  if v_uid is null then
    return jsonb_build_object('error', 'auth required');
  end if;

  select coalesce(coins, 0) into v_coins
  from public.wallets where user_id = v_uid;

  -- game_aktif_config düz obje döner (segments/minBet + durum)
  v_aktif := public.game_aktif_config('fair_spin');
  v_cfg := coalesce(v_aktif, '{}'::jsonb);
  v_durum := coalesce(v_aktif->'durum', '{}'::jsonb);

  v_segments := coalesce(v_cfg->'segments', '[]'::jsonb);
  -- weight istemciye sızmasın
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s->>'id',
      'multiplier', (s->>'multiplier')::numeric,
      'color', coalesce(s->>'color', '#3a3a4a'),
      'label', coalesce(s->>'label', (s->>'multiplier') || 'x')
    )
  ), '[]'::jsonb)
  into v_segments
  from jsonb_array_elements(v_segments) s;

  v_min := coalesce((v_cfg->>'minBet')::bigint, 10);
  v_max := coalesce((v_cfg->>'maxBet')::bigint, 10000);
  v_presets := coalesce(v_cfg->'betPresets', '[10,50,100,500,1000]'::jsonb);

  return jsonb_build_object(
    'segments', v_segments,
    'minBet', v_min,
    'maxBet', v_max,
    'betPresets', v_presets,
    'mathVersion', coalesce(v_cfg->>'mathVersion', 'fair-spin-balanced-v1'),
    'balance', v_coins,
    'gamePaused', coalesce((v_durum->>'gamePaused')::boolean, false),
    'maintenance', coalesce((v_durum->>'maintenance')::boolean, false),
    'maintenanceMessage', coalesce(v_durum->>'maintenanceMessage', '')
  );
end;
$$;

grant execute on function public.fair_spin_public_config() to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.fair_spin_round_by_idempotency(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.fair_spin_rounds%rowtype;
begin
  if v_uid is null or p_key is null or length(trim(p_key)) = 0 then
    return null;
  end if;

  select * into v_row
  from public.fair_spin_rounds
  where user_id = v_uid and idempotency_key = trim(p_key);

  if not found then return null; end if;

  return jsonb_build_object(
    'round_id', v_row.id,
    'status', v_row.status,
    'result_snapshot', v_row.result_snapshot
  );
end;
$$;

grant execute on function public.fair_spin_round_by_idempotency(text) to authenticated;
grant execute on function public.fair_spin_round_by_idempotency(text) to service_role;

create or replace function public.fair_spin_round_by_idempotency_admin(
  p_user_id uuid,
  p_key text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.fair_spin_rounds%rowtype;
begin
  if p_user_id is null or p_key is null or length(trim(p_key)) = 0 then
    return null;
  end if;

  select * into v_row
  from public.fair_spin_rounds
  where user_id = p_user_id and idempotency_key = trim(p_key);

  if not found then return null; end if;

  return jsonb_build_object(
    'roundId', v_row.id,
    'sessionId', v_row.session_id,
    'balanceAfter', v_row.balance_after,
    'result', v_row.result_snapshot,
    'duplicate', true
  );
end;
$$;

revoke all on function public.fair_spin_round_by_idempotency_admin(uuid, text) from public;
revoke all on function public.fair_spin_round_by_idempotency_admin(uuid, text) from anon;
grant execute on function public.fair_spin_round_by_idempotency_admin(uuid, text) to service_role;

create or replace function public.fair_spin_unfinished_round()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.fair_spin_rounds%rowtype;
begin
  if v_uid is null then return null; end if;

  select * into v_row
  from public.fair_spin_rounds
  where user_id = v_uid and status = 'pending_playback'
  order by created_at desc
  limit 1;

  if not found then return null; end if;

  return jsonb_build_object(
    'round_id', v_row.id,
    'status', v_row.status,
    'result_snapshot', v_row.result_snapshot
  );
end;
$$;

grant execute on function public.fair_spin_unfinished_round() to authenticated;

create or replace function public.fair_spin_mark_played(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_round_id is null then return; end if;
  update public.fair_spin_rounds
  set status = 'played', played_at = coalesce(played_at, now())
  where id = p_round_id and user_id = v_uid and status = 'pending_playback';
end;
$$;

grant execute on function public.fair_spin_mark_played(uuid) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.fair_spin_settle_spin(
  p_user_id uuid,
  p_idempotency_key text,
  p_bet_amount bigint,
  p_room_id uuid,
  p_result jsonb,
  p_admin_test boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.fair_spin_rounds%rowtype;
  v_session_id uuid;
  v_coins bigint;
  v_win numeric;
  v_balance_after bigint;
  v_round_id uuid;
  v_debit bigint;
  v_is_admin boolean := false;
  v_admin_test boolean := false;
  v_win_floor bigint;
  v_pending integer;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  select coalesce(is_admin, false) into v_is_admin
  from public.profiles where id = p_user_id;

  v_admin_test := v_is_admin and coalesce(p_admin_test, false) and p_room_id is null;

  if public.kill_switch_aktif_mi('kill_games') then raise exception 'Games temporarily disabled'; end if;
  if public.kill_switch_aktif_mi('kill_game_coin') and not v_admin_test then
    raise exception 'Game coin disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('games_enabled') then raise exception 'Games feature disabled'; end if;
  if not public.ozellik_bayragi_aktif_mi('fair_spin_enabled') then
    raise exception 'Fair Spin disabled';
  end if;

  select * into v_existing
  from public.fair_spin_rounds
  where user_id = p_user_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'duplicate', true,
      'result', v_existing.result_snapshot,
      'roundId', v_existing.id,
      'sessionId', v_existing.session_id,
      'balanceAfter', v_existing.balance_after
    );
  end if;

  select count(*) into v_pending
  from public.fair_spin_rounds
  where user_id = p_user_id and status = 'pending_playback';
  if v_pending > 2 then
    raise exception 'Spin in progress';
  end if;

  select id into v_session_id
  from public.fair_spin_sessions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1;

  if v_session_id is null then
    insert into public.fair_spin_sessions (user_id, room_id, status)
    values (p_user_id, p_room_id, 'active')
    returning id into v_session_id;
  end if;

  select coins into v_coins from public.wallets where user_id = p_user_id for update;
  if v_coins is null then raise exception 'Wallet not found'; end if;

  if v_admin_test then
    v_debit := 0;
    v_win := coalesce((p_result->>'payout')::numeric, 0);
    v_balance_after := v_coins;
  else
    v_debit := p_bet_amount;
    if v_coins < v_debit then raise exception 'Insufficient coins'; end if;
    v_win := coalesce((p_result->>'payout')::numeric, 0);
    v_balance_after := v_coins - v_debit + floor(v_win)::bigint;

    update public.wallets
    set coins = v_balance_after, updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.fair_spin_rounds (
    session_id, user_id, idempotency_key, status, bet_amount, win_amount,
    multiplier, segment_id, rng_seed, math_version, config_version, paytable_version,
    result_snapshot, balance_before, balance_after
  ) values (
    v_session_id,
    p_user_id,
    p_idempotency_key,
    'pending_playback',
    p_bet_amount,
    v_win,
    coalesce((p_result->>'multiplier')::numeric, 0),
    coalesce(p_result->>'segmentId', ''),
    coalesce(p_result->>'rngSeed', ''),
    coalesce(p_result->>'mathVersion', 'fair-spin-balanced-v1'),
    coalesce(p_result->>'configVersion', 'fair-spin-cfg-v1'),
    coalesce(p_result->>'paytableVersion', 'fair-spin-pay-v1'),
    p_result || jsonb_build_object(
      'roundId', null,
      'sessionId', v_session_id,
      'balanceAfter', v_balance_after,
      'adminTest', v_admin_test
    ),
    v_coins,
    v_balance_after
  )
  returning id into v_round_id;

  update public.fair_spin_rounds
  set result_snapshot = result_snapshot
    || jsonb_build_object(
      'roundId', v_round_id,
      'sessionId', v_session_id,
      'balanceAfter', v_balance_after,
      'payout', v_win
    )
  where id = v_round_id;

  if not v_admin_test then
    if v_debit > 0 then
      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (p_user_id, 'coins', -v_debit, v_coins - v_debit, 'fair_spin_bet', 'fair_spin_round', v_round_id);
    end if;

    v_win_floor := floor(v_win)::bigint;
    if v_win_floor > 0 then
      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (p_user_id, 'coins', v_win_floor, v_balance_after, 'fair_spin_win', 'fair_spin_round', v_round_id);
    end if;

    if p_room_id is not null then
      perform public.oda_oyun_coin_ekle(p_room_id, p_user_id, v_win_floor, v_debit);
    end if;
    if v_win_floor > 0 then
      perform public.oyun_kazanc_duyuru_yaz(
        p_user_id,
        p_room_id,
        'fair_spin',
        'Fair Spin',
        v_win_floor,
        p_bet_amount,
        v_round_id
      );
    end if;
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'roundId', v_round_id,
    'sessionId', v_session_id,
    'balanceAfter', v_balance_after,
    'result', (
      select result_snapshot from public.fair_spin_rounds where id = v_round_id
    )
  );
end;
$$;

revoke all on function public.fair_spin_settle_spin(uuid, text, bigint, uuid, jsonb, boolean) from public;
revoke all on function public.fair_spin_settle_spin(uuid, text, bigint, uuid, jsonb, boolean) from anon;
revoke all on function public.fair_spin_settle_spin(uuid, text, bigint, uuid, jsonb, boolean) from authenticated;
grant execute on function public.fair_spin_settle_spin(uuid, text, bigint, uuid, jsonb, boolean) to service_role;
