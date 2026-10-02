-- SİS Spin: bahis ve kazanç yalnızca kullanıcının kendi cüzdanında, tek işlemde.
-- Dilim sırası istemciyle aynıdır. Ağırlıklar toplam 100, beklenen geri dönüş ~%95.

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
