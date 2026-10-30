-- Uygulamadan çıkınca açık Fırtına Kralı turu iptal edilir.
-- Bahis iade edilir, yazılmış kazanç geri alınır, cüzdan defterine düşer.
-- İptal, settle ile aynı cüzdan kilidinde sıraya girer.

alter table public.storm_king_spins
  add column if not exists refunded_at timestamptz;

create table if not exists public.storm_king_aborts (
  user_id uuid not null references public.profiles(id),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table public.storm_king_aborts enable row level security;
revoke all on public.storm_king_aborts from public, anon, authenticated;

create or replace function public.storm_king_abort(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_coins bigint;
  v_spin public.storm_king_spins%rowtype;
  v_after bigint;
  v_mid bigint;
begin
  if v_uid is null or p_request_id is null then
    raise exception 'request required';
  end if;

  select coins into v_coins
  from public.wallets
  where user_id = v_uid
  for update;

  if v_coins is null then
    raise exception 'Wallet not found';
  end if;

  insert into public.storm_king_aborts (user_id, request_id)
  values (v_uid, p_request_id)
  on conflict (user_id, request_id) do nothing;

  select * into v_spin
  from public.storm_king_spins
  where user_id = v_uid and request_id = p_request_id;

  if not found then
    return jsonb_build_object(
      'cancelled', true,
      'pending', true,
      'duplicate', false,
      'balance', v_coins,
      'refunded', 0,
      'reversed_win', 0
    );
  end if;

  if v_spin.refunded_at is not null then
    return jsonb_build_object(
      'cancelled', true,
      'pending', false,
      'duplicate', true,
      'balance', v_coins,
      'refunded', 0,
      'reversed_win', 0
    );
  end if;

  v_after := greatest(v_coins + v_spin.bet - v_spin.win, 0);
  v_mid := v_coins + v_spin.bet;

  if v_spin.win = 0 then
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (v_uid, 'coins', v_spin.bet, v_mid, 'storm_king_refund', 'storm_king_spin', v_spin.id);
  elsif v_mid >= v_spin.win and v_after = v_mid - v_spin.win then
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (v_uid, 'coins', v_spin.bet, v_mid, 'storm_king_refund', 'storm_king_spin', v_spin.id);
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (v_uid, 'coins', -v_spin.win, v_after, 'storm_king_refund_win', 'storm_king_spin', v_spin.id);
  else
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (v_uid, 'coins', v_after - v_coins, v_after, 'storm_king_refund', 'storm_king_spin', v_spin.id);
  end if;

  update public.wallets
  set coins = v_after, updated_at = now()
  where user_id = v_uid;

  update public.storm_king_spins
  set refunded_at = now()
  where id = v_spin.id;

  if v_spin.room_id is not null then
    update public.oda_oyun_coin_istatistik
    set won_coin = greatest(won_coin - v_spin.win, 0),
        spent_coin = greatest(spent_coin - v_spin.bet, 0),
        updated_at = now()
    where room_id = v_spin.room_id and user_id = v_uid;

    delete from public.oda_oyun_harcama
    where id = (
      select id
      from public.oda_oyun_harcama
      where room_id = v_spin.room_id
        and user_id = v_uid
        and spent_coin = v_spin.bet
      order by created_at desc
      limit 1
    );
  end if;

  return jsonb_build_object(
    'cancelled', true,
    'pending', false,
    'duplicate', false,
    'balance', v_after,
    'refunded', v_spin.bet,
    'reversed_win', v_spin.win
  );
end;
$$;

revoke all on function public.storm_king_abort(uuid) from public, anon;
grant execute on function public.storm_king_abort(uuid) to authenticated, service_role;

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
  v_coins bigint;
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

  if v_row.refunded_at is not null then
    select coins into v_coins from public.wallets where user_id = v_uid;
    return jsonb_build_object(
      'cancelled', true,
      'duplicate', true,
      'balance', coalesce(v_coins, v_row.balance_before),
      'win', 0,
      'result', null
    );
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
  v_coins bigint;
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

  if v_row.refunded_at is not null then
    select coins into v_coins from public.wallets where user_id = p_user_id;
    return jsonb_build_object(
      'cancelled', true,
      'duplicate', true,
      'balance', coalesce(v_coins, v_row.balance_before),
      'win', 0,
      'result', null
    );
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
    if v_existing.refunded_at is not null then
      return jsonb_build_object(
        'cancelled', true,
        'duplicate', true,
        'balance', v_coins,
        'win', 0,
        'result', null
      );
    end if;
    return jsonb_build_object(
      'duplicate', true,
      'balance', v_existing.balance_after,
      'win', v_existing.win,
      'result', v_existing.result
    );
  end if;

  if exists (
    select 1
    from public.storm_king_aborts
    where user_id = p_user_id and request_id = p_request_id
  ) then
    return jsonb_build_object(
      'cancelled', true,
      'duplicate', false,
      'balance', v_coins,
      'win', 0,
      'result', null
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
    if v_existing.refunded_at is not null then
      return jsonb_build_object(
        'cancelled', true,
        'duplicate', true,
        'balance', v_coins,
        'win', 0,
        'result', null
      );
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
