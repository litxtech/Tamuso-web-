-- Oyun şeffaflığı (App Review 5.3 / 5.6)
--
-- 1. Admin tarafından belirlenen sonuç planı (game_cikis_*) gerçek kullanıcı turlarında
--    kalıcı olarak devre dışı. Sonuç yalnızca yayımlanan olasılık tablosundan seçilir.
-- 2. Meyve Çarkı'ndaki gizli "aynı meyve art arda gelmez" kuralı kaldırıldı; olasılık
--    tam olarak ağırlık / toplam ağırlık. force_next yalnızca TEST_BALANCE modunda geçerli.
-- 3. Olasılık ve geri ödeme oranı (RTP) herkese açık RPC ile yayımlanır.
-- 4. Bu sürümde istemcide erişilemeyen oyun motorları sunucuda da çağrılamaz.
-- 5. Storm King: kazanç oyun coin'ine yazılır; iptal, kazancı önce oyun coin'inden geri alır.

-- ---------------------------------------------------------------------------
-- 1. Sonuç planı kapalı
-- ---------------------------------------------------------------------------

update public.game_cikis_oyun set aktif = false where aktif;

create or replace function public.game_cikis_cek(p_game text, p_haric text default null, p_izin text[] default null)
returns text
language sql
stable
set search_path to 'public'
as $$
  select null::text;
$$;

create or replace function public.game_cikis_storm_baslat(p_game text, p_adet integer default 40)
returns jsonb
language sql
stable
set search_path to 'public'
as $$
  select jsonb_build_object('ok', false);
$$;

create or replace function public.game_cikis_storm_bitir(p_token uuid, p_kuyruk integer, p_kurallar jsonb)
returns void
language sql
set search_path to 'public'
as $$
  select;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.game_cikis_sira_kaydet(text,text[])',
    'public.game_cikis_kural_ekle(text,text,text,integer,integer,integer,integer)',
    'public.game_cikis_kural_sil(uuid)',
    'public.game_cikis_taban_kaydet(text,jsonb)',
    'public.game_cikis_bps_kaydet(text,integer)',
    'public.game_cikis_yetki(boolean)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Meyve Çarkı seçimi: yalnızca yayımlanan ağırlıklar
-- ---------------------------------------------------------------------------

create or replace function public.fruit_wheel_pick(p_fruits jsonb, p_force text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row jsonb;
  v_weight bigint;
  v_sum bigint := 0;
  v_roll bigint;
  v_acc bigint := 0;
  v_seed text;
  v_i int := 0;
  v_mode text;
begin
  v_seed := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);

  select economy_mode into v_mode from public.fruit_wheel_policy where id = 1;

  if p_force is not null and v_mode = 'TEST_BALANCE' then
    for v_row in select value from jsonb_array_elements(p_fruits)
    loop
      if v_row->>'id' = p_force and coalesce((v_row->>'enabled')::boolean, true) then
        return jsonb_build_object(
          'id', p_force, 'index', v_i,
          'multiplier', (v_row->>'multiplier')::numeric,
          'tier', coalesce(v_row->>'tier', 'NORMAL'),
          'seed', v_seed, 'forced', true
        );
      end if;
      v_i := v_i + 1;
    end loop;
  end if;

  for v_row in select value from jsonb_array_elements(p_fruits)
  loop
    if coalesce((v_row->>'enabled')::boolean, true) then
      v_sum := v_sum + greatest(coalesce((v_row->>'weight')::bigint, 0), 0);
    end if;
  end loop;
  if v_sum <= 0 then
    raise exception 'weights must not be all zero';
  end if;

  v_roll := floor(random() * v_sum)::bigint;
  v_i := 0;
  for v_row in select value from jsonb_array_elements(p_fruits)
  loop
    if coalesce((v_row->>'enabled')::boolean, true) then
      v_weight := greatest(coalesce((v_row->>'weight')::bigint, 0), 0);
      v_acc := v_acc + v_weight;
      if v_weight > 0 and v_roll < v_acc then
        return jsonb_build_object(
          'id', v_row->>'id', 'index', v_i,
          'multiplier', (v_row->>'multiplier')::numeric,
          'tier', coalesce(v_row->>'tier', 'NORMAL'),
          'seed', v_seed, 'forced', false
        );
      end if;
    end if;
    v_i := v_i + 1;
  end loop;
  raise exception 'pick failed';
end;
$$;

revoke all on function public.fruit_wheel_pick(jsonb, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Olasılık / RTP açıklaması
-- ---------------------------------------------------------------------------

create or replace function public.fruit_wheel_olasiliklar()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  with cfg as (
    select fruits, version from public.fruit_wheel_config_versions
    where is_current order by version desc limit 1
  ),
  f as (
    select
      e.value->>'id' as id,
      (e.value->>'multiplier')::numeric as multiplier,
      greatest(coalesce((e.value->>'weight')::numeric, 0), 0) as weight,
      e.ordinality as ord
    from cfg, jsonb_array_elements(cfg.fruits) with ordinality e
    where coalesce((e.value->>'enabled')::boolean, true)
  ),
  t as (select sum(weight) as total from f)
  select jsonb_build_object(
    'version', (select version from cfg),
    'independent_rounds', true,
    'admin_outcome_control', false,
    'fruits', coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id,
      'multiplier', f.multiplier,
      'probability', round(f.weight / nullif(t.total, 0), 6),
      'return_to_player', round(f.weight / nullif(t.total, 0) * f.multiplier, 6)
    ) order by f.ord), '[]'::jsonb)
  )
  from f, t;
$$;

grant execute on function public.fruit_wheel_olasiliklar() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Bu sürümde erişilemeyen oyun motorları
-- ---------------------------------------------------------------------------

-- Storm King: ödeme tablosu düzeltilene kadar tüm platformlarda kapalı. Açık turların iadesi
-- (storm_king_abort) çalışmaya devam eder.
update public.feature_flags
  set enabled = false, updated_at = now()
  where key in ('zeus_enabled', 'astral_falls_enabled', 'fair_spin_enabled',
                'kozmik_kaskad_enabled', 'nox_reels_enabled', 'storm_king_enabled');

update public.game_control_configs
  set is_enabled = false
  where game_code in ('zeus', 'astral_falls', 'fair_spin', 'kozmik_kaskad', 'nox_reels', 'storm_king');

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.zeus_settle_spin(uuid,text,bigint,uuid,jsonb,boolean,boolean)',
    'public.kozmik_kaskad_settle_spin(uuid,text,bigint,uuid,jsonb,boolean,boolean)',
    'public.nox_settle_spin(uuid,text,bigint,uuid,jsonb,boolean,boolean)',
    'public.fair_spin_settle_spin(uuid,text,bigint,uuid,jsonb,boolean)',
    'public.astral_falls_settle_spin(uuid,text,numeric,uuid,jsonb,boolean,boolean)',
    'public.sis_spin_cevir(bigint)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated, service_role', f);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Storm King: oyun coin'i ayrımı
-- ---------------------------------------------------------------------------

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
set search_path to 'public'
as $$
declare
  v_existing public.storm_king_spins%rowtype;
  v_coins bigint;
  v_game bigint;
  v_win bigint;
  v_after bigint;
  v_game_after bigint;
  v_spin_id uuid;
  v_multiplier integer;
  v_capped boolean;
  v_stored jsonb;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  if p_request_id is null then raise exception 'requestId required'; end if;
  if p_bet is null or p_bet not in (10, 50, 100, 500, 1000) then raise exception 'Bet not allowed'; end if;
  if p_result is null or jsonb_typeof(p_result) <> 'object' then raise exception 'result required'; end if;

  if public.kill_switch_aktif_mi('kill_games') then raise exception 'Games temporarily disabled'; end if;
  if public.kill_switch_aktif_mi('kill_game_coin') then raise exception 'Game coin disabled'; end if;
  if not public.ozellik_bayragi_aktif_mi('games_enabled') then raise exception 'Games feature disabled'; end if;
  if not public.ozellik_bayragi_aktif_mi('storm_king_enabled') then raise exception 'Storm King disabled'; end if;

  select coins, game_coins into v_coins, v_game
  from public.wallets where user_id = p_user_id for update;
  if v_coins is null then raise exception 'Wallet not found'; end if;

  select * into v_existing from public.storm_king_spins
  where user_id = p_user_id and request_id = p_request_id;
  if found then
    if v_existing.refunded_at is not null then
      return jsonb_build_object('cancelled', true, 'duplicate', true, 'balance', v_coins,
        'game_balance', v_game, 'win', 0, 'result', null);
    end if;
    return jsonb_build_object('duplicate', true, 'balance', v_coins, 'game_balance', v_game,
      'win', v_existing.win, 'result', v_existing.result);
  end if;

  if exists (select 1 from public.storm_king_aborts where user_id = p_user_id and request_id = p_request_id) then
    return jsonb_build_object('cancelled', true, 'duplicate', false, 'balance', v_coins,
      'game_balance', v_game, 'win', 0, 'result', null);
  end if;

  if v_coins < p_bet then raise exception 'Insufficient coins'; end if;

  if coalesce((p_result->>'finalWin')::numeric, -1) < 0 then raise exception 'Invalid win'; end if;
  v_win := least(greatest(floor((p_result->>'finalWin')::numeric)::bigint, 0), p_bet * 5000);

  v_multiplier := greatest(coalesce((p_result->>'multiplierSum')::integer, 1), 1);
  v_capped := coalesce((p_result->>'capped')::boolean, false)
    or floor(coalesce((p_result->>'finalWin')::numeric, 0))::bigint > p_bet * 5000;
  v_after := v_coins - p_bet;
  v_game_after := v_game + v_win;
  v_stored := p_result || jsonb_build_object('finalWin', v_win, 'multiplierSum', v_multiplier, 'capped', v_capped);

  insert into public.storm_king_spins (
    user_id, request_id, room_id, bet, win, balance_before, balance_after, multiplier, capped, result
  ) values (
    p_user_id, p_request_id, p_room_id, p_bet, v_win, v_coins, v_after, v_multiplier, v_capped, v_stored
  ) returning id into v_spin_id;

  update public.wallets
    set coins = v_after, game_coins = v_game_after, updated_at = now()
    where user_id = p_user_id;

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
  values (p_user_id, 'coins', -p_bet, v_after, 'storm_king_bet', 'storm_king_spin', v_spin_id);

  if v_win > 0 then
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (p_user_id, 'game_coins', v_win, v_game_after, 'storm_king_win', 'storm_king_spin', v_spin_id);
  end if;

  if p_room_id is not null then
    perform public.oda_oyun_coin_ekle(p_room_id, p_user_id, v_win, p_bet);
  end if;

  if v_win > 0 then
    perform public.oyun_kazanc_duyuru_yaz(
      p_user_id, p_room_id, 'storm_king', 'Fırtına Kralı', v_win, p_bet, v_spin_id, v_multiplier
    );
  end if;

  return jsonb_build_object('duplicate', false, 'balance', v_after, 'game_balance', v_game_after,
    'win', v_win, 'result', v_stored);
exception
  when unique_violation then
    select * into v_existing from public.storm_king_spins
    where user_id = p_user_id and request_id = p_request_id;
    if not found then raise; end if;
    if v_existing.refunded_at is not null then
      return jsonb_build_object('cancelled', true, 'duplicate', true, 'balance', v_coins,
        'game_balance', v_game, 'win', 0, 'result', null);
    end if;
    return jsonb_build_object('duplicate', true, 'balance', v_existing.balance_after,
      'win', v_existing.win, 'result', v_existing.result);
end;
$$;

revoke all on function public.storm_king_settle(uuid, uuid, bigint, uuid, jsonb) from public, anon, authenticated;

create or replace function public.storm_king_abort(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_coins bigint;
  v_game bigint;
  v_spin public.storm_king_spins%rowtype;
  v_from_game bigint;
  v_from_coins bigint;
  v_after bigint;
  v_game_after bigint;
begin
  if v_uid is null or p_request_id is null then raise exception 'request required'; end if;

  select coins, game_coins into v_coins, v_game
  from public.wallets where user_id = v_uid for update;
  if v_coins is null then raise exception 'Wallet not found'; end if;

  insert into public.storm_king_aborts (user_id, request_id)
  values (v_uid, p_request_id)
  on conflict (user_id, request_id) do nothing;

  select * into v_spin from public.storm_king_spins
  where user_id = v_uid and request_id = p_request_id;

  if not found then
    return jsonb_build_object('cancelled', true, 'pending', true, 'duplicate', false,
      'balance', v_coins, 'game_balance', v_game, 'refunded', 0, 'reversed_win', 0);
  end if;

  if v_spin.refunded_at is not null then
    return jsonb_build_object('cancelled', true, 'pending', false, 'duplicate', true,
      'balance', v_coins, 'game_balance', v_game, 'refunded', 0, 'reversed_win', 0);
  end if;

  v_from_game := least(v_spin.win, v_game);
  v_from_coins := least(v_spin.win - v_from_game, v_coins + v_spin.bet);
  v_after := v_coins + v_spin.bet - v_from_coins;
  v_game_after := v_game - v_from_game;

  update public.wallets
    set coins = v_after, game_coins = v_game_after, updated_at = now()
    where user_id = v_uid;

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
  values (v_uid, 'coins', v_spin.bet, v_coins + v_spin.bet, 'storm_king_refund', 'storm_king_spin', v_spin.id);

  if v_from_game > 0 then
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (v_uid, 'game_coins', -v_from_game, v_game_after, 'storm_king_refund_win', 'storm_king_spin', v_spin.id);
  end if;
  if v_from_coins > 0 then
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (v_uid, 'coins', -v_from_coins, v_after, 'storm_king_refund_win', 'storm_king_spin', v_spin.id);
  end if;

  update public.storm_king_spins set refunded_at = now() where id = v_spin.id;

  if v_spin.room_id is not null then
    update public.oda_oyun_coin_istatistik
      set won_coin = greatest(won_coin - v_spin.win, 0),
          spent_coin = greatest(spent_coin - v_spin.bet, 0),
          updated_at = now()
      where room_id = v_spin.room_id and user_id = v_uid;

    delete from public.oda_oyun_harcama
    where id = (
      select id from public.oda_oyun_harcama
      where room_id = v_spin.room_id and user_id = v_uid and spent_coin = v_spin.bet
      order by created_at desc limit 1
    );
  end if;

  return jsonb_build_object('cancelled', true, 'pending', false, 'duplicate', false,
    'balance', v_after, 'game_balance', v_game_after,
    'refunded', v_spin.bet, 'reversed_win', v_from_game + v_from_coins);
end;
$$;

grant execute on function public.storm_king_abort(uuid) to authenticated;
