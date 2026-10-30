-- Fırtına Kralı — mevcut wallets.coins defteri.
-- Yeni cüzdan yok. Spin kaydı ve bakiye aynı işlemde yazılır.
-- RPC yalnızca service_role. Kullanıcı geçmişi salt okunur.

insert into public.feature_flags (key, enabled, description) values
  ('storm_king_enabled', true, 'Fırtına Kralı slot'),
  ('storm_king_autoplay_enabled', false, 'Fırtına Kralı otomatik oyun — mağaza politikası kapalı')
on conflict (key) do nothing;

insert into public.game_catalog (
  game_code, name, description, min_players, max_players, default_duration_seconds, is_active
) values (
  'storm_king',
  'Fırtına Kralı',
  '6×5 tumble kristal slot — sunucu sonucu, nakde çevrilemez coin',
  1,
  1,
  0,
  true
)
on conflict (game_code) do nothing;

insert into public.game_control_configs (
  game_code, is_enabled, mode, min_players, max_players, coin_rewards_enabled
) values (
  'storm_king', true, 'NORMAL', 1, 1, true
)
on conflict (game_code) do nothing;

create table if not exists public.storm_king_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  request_id uuid not null,
  room_id uuid references public.rooms(id) on delete set null,
  bet bigint not null check (bet > 0),
  win bigint not null check (win >= 0),
  balance_before bigint not null check (balance_before >= 0),
  balance_after bigint not null check (balance_after >= 0),
  multiplier integer not null check (multiplier >= 1),
  capped boolean not null default false,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create index if not exists storm_king_spins_user_created_idx
  on public.storm_king_spins (user_id, created_at desc);

alter table public.storm_king_spins enable row level security;

drop policy if exists storm_king_spins_select_own on public.storm_king_spins;
create policy storm_king_spins_select_own
  on public.storm_king_spins
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.storm_king_spins from public, anon, authenticated;
grant select on public.storm_king_spins to authenticated;

create or replace function public.storm_king_round_by_request(p_request_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.storm_king_spins%rowtype;
begin
  if v_uid is null or p_request_id is null then
    return null;
  end if;

  select * into v_row
  from public.storm_king_spins
  where user_id = v_uid and request_id = p_request_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'duplicate', true,
    'balance', v_row.balance_after,
    'win', v_row.win,
    'result', v_row.result
  );
end;
$$;

revoke all on function public.storm_king_round_by_request(uuid) from public, anon;
grant execute on function public.storm_king_round_by_request(uuid) to authenticated, service_role;

create or replace function public.storm_king_round_by_request_admin(
  p_user_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.storm_king_spins%rowtype;
begin
  if p_user_id is null or p_request_id is null then
    return null;
  end if;

  select * into v_row
  from public.storm_king_spins
  where user_id = p_user_id and request_id = p_request_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'duplicate', true,
    'balance', v_row.balance_after,
    'win', v_row.win,
    'result', v_row.result
  );
end;
$$;

revoke all on function public.storm_king_round_by_request_admin(uuid, uuid) from public, anon, authenticated;
grant execute on function public.storm_king_round_by_request_admin(uuid, uuid) to service_role;

create or replace function public.storm_king_settle(
  p_user_id uuid,
  p_request_id uuid,
  p_bet bigint,
  p_room_id uuid,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.storm_king_spins%rowtype;
  v_coins bigint;
  v_win bigint;
  v_balance_after bigint;
  v_spin_id uuid;
  v_multiplier integer;
  v_capped boolean;
  v_stored jsonb;
begin
  if p_user_id is null then
    raise exception 'user required';
  end if;
  if p_request_id is null then
    raise exception 'requestId required';
  end if;
  if p_bet is null or p_bet not in (10, 50, 100, 500, 1000) then
    raise exception 'Bet not allowed';
  end if;
  if p_result is null or jsonb_typeof(p_result) <> 'object' then
    raise exception 'result required';
  end if;

  if public.kill_switch_aktif_mi('kill_games') then
    raise exception 'Games temporarily disabled';
  end if;
  if public.kill_switch_aktif_mi('kill_game_coin') then
    raise exception 'Game coin disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('games_enabled') then
    raise exception 'Games feature disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('storm_king_enabled') then
    raise exception 'Storm King disabled';
  end if;

  select coins into v_coins
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_coins is null then
    raise exception 'Wallet not found';
  end if;

  select * into v_existing
  from public.storm_king_spins
  where user_id = p_user_id and request_id = p_request_id;

  if found then
    return jsonb_build_object(
      'duplicate', true,
      'balance', v_existing.balance_after,
      'win', v_existing.win,
      'result', v_existing.result
    );
  end if;

  if v_coins < p_bet then
    raise exception 'Insufficient coins';
  end if;

  v_win := least(
    greatest(floor(coalesce((p_result->>'finalWin')::numeric, -1))::bigint, 0),
    p_bet * 5000
  );
  if coalesce((p_result->>'finalWin')::numeric, -1) < 0 then
    raise exception 'Invalid win';
  end if;

  v_multiplier := greatest(coalesce((p_result->>'multiplierSum')::integer, 1), 1);
  v_capped := coalesce((p_result->>'capped')::boolean, false)
    or floor(coalesce((p_result->>'finalWin')::numeric, 0))::bigint > p_bet * 5000;
  v_balance_after := v_coins - p_bet + v_win;
  v_stored := p_result || jsonb_build_object(
    'finalWin', v_win,
    'multiplierSum', v_multiplier,
    'capped', v_capped
  );

  insert into public.storm_king_spins (
    user_id, request_id, room_id, bet, win,
    balance_before, balance_after, multiplier, capped, result
  ) values (
    p_user_id, p_request_id, p_room_id, p_bet, v_win,
    v_coins, v_balance_after, v_multiplier, v_capped, v_stored
  )
  returning id into v_spin_id;

  update public.wallets
  set coins = v_balance_after, updated_at = now()
  where user_id = p_user_id;

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
  values (p_user_id, 'coins', -p_bet, v_coins - p_bet, 'storm_king_bet', 'storm_king_spin', v_spin_id);

  if v_win > 0 then
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (p_user_id, 'coins', v_win, v_balance_after, 'storm_king_win', 'storm_king_spin', v_spin_id);
  end if;

  if p_room_id is not null then
    perform public.oda_oyun_coin_ekle(p_room_id, p_user_id, v_win, p_bet);
  end if;

  if v_win > 0 then
    perform public.oyun_kazanc_duyuru_yaz(
      p_user_id,
      p_room_id,
      'storm_king',
      'Fırtına Kralı',
      v_win,
      p_bet,
      v_spin_id,
      v_multiplier
    );
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'balance', v_balance_after,
    'win', v_win,
    'result', v_stored
  );
exception
  when unique_violation then
    select * into v_existing
    from public.storm_king_spins
    where user_id = p_user_id and request_id = p_request_id;
    if not found then
      raise;
    end if;
    return jsonb_build_object(
      'duplicate', true,
      'balance', v_existing.balance_after,
      'win', v_existing.win,
      'result', v_existing.result
    );
end;
$$;

revoke all on function public.storm_king_settle(uuid, uuid, bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.storm_king_settle(uuid, uuid, bigint, uuid, jsonb) to service_role;
