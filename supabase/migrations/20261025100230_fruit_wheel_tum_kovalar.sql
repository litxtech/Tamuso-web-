-- Fruit Wheel (PLATFORM_APPROVED_COIN): cüzdan ayrımı sonrası bakiye üç kovanın toplamıdır.
--   Harcama sırası: coins (satın alınan) → game_coins → bonus_coins.
--   Tur içi iade, o turda net harcanan kovalara ters sırayla döner (bonus satın alınana dönüşmez).
--   Kazanç doğrudan game_coins'e yazılır.

create or replace function public.fruit_wheel_balance_value(p_user uuid, p_mode text)
returns bigint
language plpgsql
stable security definer
set search_path to 'public'
as $$
declare v_bal bigint;
begin
  if p_mode = 'PLATFORM_APPROVED_COIN' then
    select coins + game_coins + bonus_coins into v_bal from public.wallets where user_id = p_user;
    return coalesce(v_bal, 0);
  elsif p_mode = 'CLOSED_LOOP_GAME_BALANCE' then
    select closed_loop_coins into v_bal from public.fruit_wheel_balances where user_id = p_user;
    return coalesce(v_bal, 100000);
  else
    select test_coins into v_bal from public.fruit_wheel_balances where user_id = p_user;
    return coalesce(v_bal, 100000);
  end if;
end; $$;

create or replace function public.fruit_wheel_lock_balance(p_user uuid, p_mode text)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_bal bigint;
begin
  if p_mode = 'PLATFORM_APPROVED_COIN' then
    select coins + game_coins + bonus_coins into v_bal from public.wallets where user_id = p_user for update;
    if v_bal is null then raise exception 'Wallet not found'; end if;
    return v_bal;
  end if;
  insert into public.fruit_wheel_balances (user_id) values (p_user) on conflict (user_id) do nothing;
  if p_mode = 'CLOSED_LOOP_GAME_BALANCE' then
    select closed_loop_coins into v_bal from public.fruit_wheel_balances where user_id = p_user for update;
  else
    select test_coins into v_bal from public.fruit_wheel_balances where user_id = p_user for update;
  end if;
  return coalesce(v_bal, 0);
end; $$;

create or replace function public.fruit_wheel_apply_delta(
  p_user uuid, p_mode text, p_delta bigint, p_reason text, p_round uuid, p_ref uuid, p_idem text
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_bal bigint;
  v_after bigint;
  v_c bigint;
  v_g bigint;
  v_b bigint;
  v_dc bigint := 0;
  v_dg bigint := 0;
  v_db bigint := 0;
  v_nc bigint;
  v_ng bigint;
  v_nb bigint;
  v_kalan bigint;
  v_ref uuid := coalesce(p_ref, p_round);
begin
  if exists (select 1 from public.fruit_wheel_ledger where idempotency_key = p_idem) then
    select balance_after into v_after from public.fruit_wheel_ledger where idempotency_key = p_idem;
    return v_after;
  end if;

  if p_mode = 'PLATFORM_APPROVED_COIN' then
    select coins, game_coins, bonus_coins into v_c, v_g, v_b
    from public.wallets where user_id = p_user for update;
    if v_c is null then raise exception 'Wallet not found'; end if;
    v_bal := v_c + v_g + v_b;
    if v_bal + p_delta < 0 then raise exception 'Insufficient coins'; end if;
    v_after := v_bal + p_delta;

    if p_delta < 0 then
      v_kalan := -p_delta;
      v_dc := least(v_c, v_kalan);
      v_kalan := v_kalan - v_dc;
      v_dg := least(v_g, v_kalan);
      v_db := v_kalan - v_dg;
      v_dc := -v_dc;
      v_dg := -v_dg;
      v_db := -v_db;
    elsif p_delta > 0 and p_reason = 'fruit_wheel_payout' then
      v_dg := p_delta;
    elsif p_delta > 0 then
      select
        coalesce(-sum(l.delta) filter (where l.currency = 'coins'), 0),
        coalesce(-sum(l.delta) filter (where l.currency = 'game_coins'), 0),
        coalesce(-sum(l.delta) filter (where l.currency = 'bonus_coins'), 0)
      into v_nc, v_ng, v_nb
      from public.wallet_ledger l
      where l.user_id = p_user
        and l.ref_type = 'fruit_wheel'
        and l.ref_id = p_round
        and l.reason in ('fruit_wheel_selection', 'fruit_wheel_selection_refund');
      v_kalan := p_delta;
      v_db := least(greatest(v_nb, 0), v_kalan);
      v_kalan := v_kalan - v_db;
      v_dg := least(greatest(v_ng, 0), v_kalan);
      v_kalan := v_kalan - v_dg;
      v_dc := least(greatest(v_nc, 0), v_kalan);
      v_db := v_db + (v_kalan - v_dc);
    end if;

    update public.wallets
      set coins = coins + v_dc,
          game_coins = game_coins + v_dg,
          bonus_coins = bonus_coins + v_db,
          updated_at = now()
      where user_id = p_user;

    if v_dc <> 0 then
      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (p_user, 'coins', v_dc, v_c + v_dc, p_reason, 'fruit_wheel', v_ref);
    end if;
    if v_dg <> 0 then
      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (p_user, 'game_coins', v_dg, v_g + v_dg, p_reason, 'fruit_wheel', v_ref);
    end if;
    if v_db <> 0 then
      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (p_user, 'bonus_coins', v_db, v_b + v_db, p_reason, 'fruit_wheel', v_ref);
    end if;
  else
    v_bal := public.fruit_wheel_lock_balance(p_user, p_mode);
    if v_bal + p_delta < 0 then raise exception 'Insufficient coins'; end if;
    v_after := v_bal + p_delta;
    if p_mode = 'CLOSED_LOOP_GAME_BALANCE' then
      update public.fruit_wheel_balances set closed_loop_coins = v_after, updated_at = now() where user_id = p_user;
    else
      update public.fruit_wheel_balances set test_coins = v_after, updated_at = now() where user_id = p_user;
    end if;
  end if;

  insert into public.fruit_wheel_ledger (user_id, economy_mode, delta, balance_after, reason, round_id, ref_id, idempotency_key)
  values (p_user, p_mode, p_delta, v_after, p_reason, p_round, p_ref, p_idem);
  return v_after;
end; $$;

revoke all on function public.fruit_wheel_balance_value(uuid, text) from public, anon, authenticated;
revoke all on function public.fruit_wheel_lock_balance(uuid, text) from public, anon, authenticated;
revoke all on function public.fruit_wheel_apply_delta(uuid, text, bigint, text, uuid, uuid, text) from public, anon, authenticated;
