-- Astral Falls — katalog + settle + free-spin oturum durumu

insert into public.feature_flags (key, enabled, description) values
  ('astral_falls_enabled', true, 'Astral Falls cascade slot')
on conflict (key) do nothing;

insert into public.game_catalog (
  game_code, name, description, min_players, max_players, default_duration_seconds, is_active
) values (
  'astral_falls',
  'Astral Falls',
  '6x5 kozmik kristal cascade — sunucu RNG, coin bahis',
  1, 1, 0, true
)
on conflict (game_code) do nothing;

insert into public.game_control_configs (
  game_code, is_enabled, mode, min_entry, max_entry, coin_rewards_enabled, min_players, max_players
) values (
  'astral_falls', true, 'NORMAL', 1, 500, true, 1, 1
)
on conflict (game_code) do nothing;

insert into public.game_math_versions (
  game_code, math_version, display_name, description, config, is_active, simulated_rtp
) values (
  'astral_falls',
  'astral-falls-demo-port-v1',
  'Referans port',
  'Referans engine kurallari (demo agirliklar). Kullanici bazli gizli mudahale yok.',
  '{
    "mathVersion":"astral-falls-demo-port-v1",
    "configVersion":"astral-falls-cfg-v1",
    "paytableVersion":"astral-falls-pay-v1",
    "minBet":1,
    "maxBet":500
  }'::jsonb,
  true,
  0.96
)
on conflict (game_code, math_version) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  config = excluded.config,
  is_active = excluded.is_active,
  simulated_rtp = excluded.simulated_rtp;

insert into public.game_runtime_settings (game_code, min_bet, max_bet, bet_presets)
values ('astral_falls', 1, 500, '[1,10,20,50,100,250,500]'::jsonb)
on conflict (game_code) do nothing;

create table if not exists public.astral_falls_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  room_id uuid references public.rooms(id) on delete set null,
  status text not null default 'active' check (status in ('active','closed')),
  free_spins_remaining integer not null default 0,
  free_bet numeric not null default 0,
  math_version text not null default 'astral-falls-demo-port-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astral_falls_sessions_user_idx
  on public.astral_falls_sessions (user_id, created_at desc);

create table if not exists public.astral_falls_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.astral_falls_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  idempotency_key text not null,
  status text not null default 'pending_playback'
    check (status in ('pending_playback','played','settled')),
  bet_amount numeric not null,
  win_amount numeric not null default 0,
  is_free_spin boolean not null default false,
  rng_seed text not null default '',
  math_version text not null default 'astral-falls-demo-port-v1',
  config_version text not null default 'astral-falls-cfg-v1',
  paytable_version text not null default 'astral-falls-pay-v1',
  result_snapshot jsonb not null default '{}'::jsonb,
  balance_before bigint not null default 0,
  balance_after bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists astral_falls_rounds_user_status_idx
  on public.astral_falls_rounds (user_id, status, created_at desc);

alter table public.astral_falls_sessions enable row level security;
alter table public.astral_falls_rounds enable row level security;

drop policy if exists astral_falls_sessions_select_own on public.astral_falls_sessions;
create policy astral_falls_sessions_select_own on public.astral_falls_sessions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists astral_falls_rounds_select_own on public.astral_falls_rounds;
create policy astral_falls_rounds_select_own on public.astral_falls_rounds
  for select to authenticated using (auth.uid() = user_id);

grant select on public.astral_falls_sessions to authenticated;
grant select on public.astral_falls_rounds to authenticated;

create or replace function public.astral_falls_spin_context(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean := false;
  v_coins bigint := 0;
  v_free integer := 0;
  v_free_bet numeric := 0;
begin
  select coalesce(is_admin, false) into v_admin from public.profiles where id = p_user_id;
  select coalesce(coins, 0) into v_coins from public.wallets where user_id = p_user_id;
  select coalesce(free_spins_remaining, 0), coalesce(free_bet, 0)
    into v_free, v_free_bet
  from public.astral_falls_sessions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1;
  return jsonb_build_object(
    'isAdmin', v_admin,
    'coins', v_coins,
    'freeSpins', coalesce(v_free, 0),
    'freeBet', coalesce(v_free_bet, 0)
  );
end;
$$;

revoke all on function public.astral_falls_spin_context(uuid) from public;
revoke all on function public.astral_falls_spin_context(uuid) from anon;
grant execute on function public.astral_falls_spin_context(uuid) to service_role;

create or replace function public.astral_falls_round_by_idempotency_admin(
  p_user_id uuid,
  p_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.astral_falls_rounds%rowtype;
begin
  select * into v_row
  from public.astral_falls_rounds
  where user_id = p_user_id and idempotency_key = p_key;
  if not found then return null; end if;
  return jsonb_build_object(
    'result', v_row.result_snapshot,
    'balanceAfter', v_row.balance_after,
    'roundId', v_row.id
  );
end;
$$;

revoke all on function public.astral_falls_round_by_idempotency_admin(uuid, text) from public;
grant execute on function public.astral_falls_round_by_idempotency_admin(uuid, text) to service_role;

create or replace function public.astral_falls_mark_played(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.astral_falls_rounds
  set status = 'played'
  where id = p_round_id and user_id = auth.uid() and status = 'pending_playback';
end;
$$;

grant execute on function public.astral_falls_mark_played(uuid) to authenticated;

create or replace function public.astral_falls_settle_spin(
  p_user_id uuid,
  p_idempotency_key text,
  p_bet_amount numeric,
  p_room_id uuid,
  p_result jsonb,
  p_free_mode boolean default false,
  p_admin_test boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.astral_falls_rounds%rowtype;
  v_session public.astral_falls_sessions%rowtype;
  v_session_id uuid;
  v_coins bigint;
  v_win numeric;
  v_win_floor bigint;
  v_balance_after bigint;
  v_round_id uuid;
  v_debit numeric;
  v_is_admin boolean := false;
  v_admin_test boolean := false;
  v_free integer := 0;
  v_free_bet numeric := 0;
  v_awarded integer := 0;
  v_stake numeric;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  select coalesce(is_admin, false) into v_is_admin from public.profiles where id = p_user_id;
  v_admin_test := v_is_admin and coalesce(p_admin_test, false) and p_room_id is null;

  if public.kill_switch_aktif_mi('kill_games') then raise exception 'Games temporarily disabled'; end if;
  if public.kill_switch_aktif_mi('kill_game_coin') and not v_admin_test then
    raise exception 'Game coin disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('games_enabled') then raise exception 'Games feature disabled'; end if;
  if not public.ozellik_bayragi_aktif_mi('astral_falls_enabled') then
    raise exception 'Astral Falls disabled';
  end if;

  select * into v_existing
  from public.astral_falls_rounds
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

  select * into v_session
  from public.astral_falls_sessions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if not found then
    insert into public.astral_falls_sessions (user_id, room_id, status)
    values (p_user_id, p_room_id, 'active')
    returning * into v_session;
  end if;
  v_session_id := v_session.id;
  v_free := coalesce(v_session.free_spins_remaining, 0);
  v_free_bet := coalesce(v_session.free_bet, 0);

  if coalesce(p_free_mode, false) then
    if v_free <= 0 and not v_admin_test then
      raise exception 'No free spins';
    end if;
    v_stake := case when v_free_bet > 0 then v_free_bet else p_bet_amount end;
    v_debit := 0;
  else
    v_stake := p_bet_amount;
    v_debit := p_bet_amount;
  end if;

  select coins into v_coins from public.wallets where user_id = p_user_id for update;
  if v_coins is null then raise exception 'Wallet not found'; end if;

  v_win := coalesce((p_result->>'payout')::numeric, 0);
  v_awarded := coalesce((p_result->>'freeSpinsAwarded')::integer, 0);

  if v_admin_test then
    v_balance_after := v_coins;
  else
    if v_debit > 0 and v_coins < ceil(v_debit) then
      raise exception 'Insufficient coins';
    end if;
    v_win_floor := floor(v_win)::bigint;
    v_balance_after := v_coins - ceil(v_debit)::bigint + v_win_floor;

    update public.wallets
    set coins = v_balance_after, updated_at = now()
    where user_id = p_user_id;
  end if;

  -- free spin sayacı
  if not v_admin_test then
    if coalesce(p_free_mode, false) and v_free > 0 then
      v_free := v_free - 1;
    end if;
    if v_awarded > 0 then
      v_free := v_free + v_awarded;
      v_free_bet := v_stake;
    end if;
    if v_free <= 0 then
      v_free := 0;
      v_free_bet := 0;
    end if;
    update public.astral_falls_sessions
    set free_spins_remaining = v_free,
        free_bet = v_free_bet,
        updated_at = now()
    where id = v_session_id;
  end if;

  insert into public.astral_falls_rounds (
    session_id, user_id, idempotency_key, status, bet_amount, win_amount,
    is_free_spin, rng_seed, math_version, config_version, paytable_version,
    result_snapshot, balance_before, balance_after
  ) values (
    v_session_id,
    p_user_id,
    p_idempotency_key,
    'pending_playback',
    v_stake,
    v_win,
    coalesce(p_free_mode, false),
    coalesce(p_result->>'rngSeed', ''),
    coalesce(p_result->>'mathVersion', 'astral-falls-demo-port-v1'),
    coalesce(p_result->>'configVersion', 'astral-falls-cfg-v1'),
    coalesce(p_result->>'paytableVersion', 'astral-falls-pay-v1'),
    p_result,
    v_coins,
    v_balance_after
  )
  returning id into v_round_id;

  update public.astral_falls_rounds
  set result_snapshot = result_snapshot || jsonb_build_object(
    'roundId', v_round_id,
    'sessionId', v_session_id,
    'balanceBefore', v_coins,
    'balanceAfter', v_balance_after,
    'remainingFreeSpins', v_free,
    'freeBet', v_free_bet,
    'betAmount', v_stake,
    'adminTest', v_admin_test
  )
  where id = v_round_id;

  if not v_admin_test then
    if ceil(v_debit)::bigint > 0 then
      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (p_user_id, 'coins', -ceil(v_debit)::bigint, v_coins - ceil(v_debit)::bigint, 'astral_falls_bet', 'astral_falls_round', v_round_id);
    end if;
    v_win_floor := floor(v_win)::bigint;
    if v_win_floor > 0 then
      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (p_user_id, 'coins', v_win_floor, v_balance_after, 'astral_falls_win', 'astral_falls_round', v_round_id);
    end if;
    if p_room_id is not null then
      perform public.oda_oyun_coin_ekle(p_room_id, p_user_id, v_win_floor, ceil(v_debit)::bigint);
    end if;
    if v_win_floor > 0 then
      perform public.oyun_kazanc_duyuru_yaz(
        p_user_id, p_room_id, 'astral_falls', 'Astral Falls',
        v_win_floor, ceil(v_stake)::bigint, v_round_id
      );
    end if;
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'roundId', v_round_id,
    'sessionId', v_session_id,
    'balanceAfter', v_balance_after,
    'remainingFreeSpins', v_free,
    'freeBet', v_free_bet,
    'result', (select result_snapshot from public.astral_falls_rounds where id = v_round_id)
  );
end;
$$;

revoke all on function public.astral_falls_settle_spin(uuid, text, numeric, uuid, jsonb, boolean, boolean) from public;
grant execute on function public.astral_falls_settle_spin(uuid, text, numeric, uuid, jsonb, boolean, boolean) to service_role;
