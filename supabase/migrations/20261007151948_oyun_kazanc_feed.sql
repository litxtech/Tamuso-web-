-- Oyun kazançları ses odaları akışında görünsün.
-- Çarpan (15x) saklanır. Meyve çarkı ve Sis Spin de duyuru yazar.

alter table public.oyun_kazanc_duyurulari
  add column if not exists multiplier numeric;

drop function if exists public.oyun_kazanc_duyuru_yaz(uuid, uuid, text, text, bigint, bigint, uuid);

create or replace function public.oyun_kazanc_duyuru_yaz(
  p_user_id uuid,
  p_room_id uuid,
  p_game_code text,
  p_game_title text,
  p_win bigint,
  p_bet bigint default 0,
  p_round_id uuid default null,
  p_multiplier numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_win bigint := floor(coalesce(p_win, 0))::bigint;
  v_mult numeric := p_multiplier;
begin
  if p_user_id is null or v_win < 100 then
    return;
  end if;

  if v_mult is null and coalesce(p_bet, 0) > 0 then
    v_mult := round(v_win::numeric / p_bet::numeric, 2);
  end if;
  if v_mult is not null and v_mult < 1 then
    v_mult := null;
  end if;

  insert into public.oyun_kazanc_duyurulari (
    user_id, room_id, game_code, game_title, win_amount, bet_amount, round_id, multiplier
  ) values (
    p_user_id,
    p_room_id,
    coalesce(nullif(trim(p_game_code), ''), 'oyun'),
    coalesce(nullif(trim(p_game_title), ''), 'Oyun'),
    v_win,
    greatest(coalesce(p_bet, 0), 0),
    p_round_id,
    v_mult
  );
end;
$$;

revoke all on function public.oyun_kazanc_duyuru_yaz(uuid, uuid, text, text, bigint, bigint, uuid, numeric) from public, anon, authenticated;
grant execute on function public.oyun_kazanc_duyuru_yaz(uuid, uuid, text, text, bigint, bigint, uuid, numeric) to service_role;

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
        perform public.oyun_kazanc_duyuru_yaz(
          s.user_id,
          null,
          'fruit_wheel',
          'Meyve',
          v_payout,
          s.amount,
          r.id,
          r.multiplier
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

create or replace function public.sis_spin_cevir(p_bet bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_coins bigint;
  v_roll int;
  v_id int;
  v_mult numeric;
  v_label text;
  v_payout bigint;
  v_after bigint;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_bet not in (10, 50, 100, 250, 500, 1000) then
    raise exception 'Invalid bet';
  end if;

  if public.kill_switch_aktif_mi('kill_games') then
    raise exception 'Games temporarily disabled';
  end if;
  if public.kill_switch_aktif_mi('kill_game_coin') then
    raise exception 'Game coin disabled';
  end if;

  select coins into v_coins
  from public.wallets
  where user_id = v_uid
  for update;

  if v_coins is null then
    raise exception 'Wallet not found';
  end if;
  if v_coins < p_bet then
    raise exception 'Insufficient coins';
  end if;

  v_roll := floor(random() * 100)::int;

  if v_roll < 38 then
    v_id := 0; v_mult := 0; v_label := '0';
  elsif v_roll < 60 then
    v_id := 1; v_mult := 0.5; v_label := '0.5x';
  elsif v_roll < 80 then
    v_id := 2; v_mult := 1; v_label := '1x';
  elsif v_roll < 92 then
    v_id := 3; v_mult := 2; v_label := '2x';
  elsif v_roll < 96 then
    v_id := 4; v_mult := 3; v_label := '3x';
  elsif v_roll < 98 then
    v_id := 5; v_mult := 5; v_label := '5x';
  elsif v_roll < 99 then
    v_id := 6; v_mult := 8; v_label := '8x';
  else
    v_id := 7; v_mult := 10; v_label := '10x';
  end if;

  v_payout := floor(p_bet * v_mult)::bigint;
  v_after := v_coins - p_bet + v_payout;

  update public.wallets
  set coins = v_after,
      updated_at = now()
  where user_id = v_uid;

  if v_payout > 0 then
    perform public.oyun_kazanc_duyuru_yaz(
      v_uid,
      null,
      'sis_spin',
      'Sis Spin',
      v_payout,
      p_bet,
      null,
      v_mult
    );
  end if;

  return jsonb_build_object(
    'segmentId', v_id,
    'label', v_label,
    'multiplier', v_mult,
    'bet', p_bet,
    'payout', v_payout,
    'balanceBefore', v_coins,
    'balanceAfter', v_after
  );
end;
$$;

revoke all on function public.sis_spin_cevir(bigint) from public;
grant execute on function public.sis_spin_cevir(bigint) to authenticated;
