-- Cüzdanım: satın alınan / oyun / ödül coin bakiyelerinin muhasebe düzeyinde ayrılması.
--
--   wallets.coins        → Satın alınan coin (IAP, Google Play, doğrulanmış web ödemesi).
--                          Hediyede kullanıldığında yayıncı gelirine katılabilir.
--   wallets.game_coins   → Oyunlardan kazanılan coin. Nakde çevrilemez; hediye gönderilebilir,
--                          alıcıya çekilebilir gelir oluşturmaz.
--   wallets.bonus_coins  → Ödül / promosyon coin'i (hoş geldin, görev, admin, ajans promosyonu,
--                          kaynağı doğrulanamayan eski bakiye). Nakde çevrilemez; gelir oluşturmaz.
--
-- Mevcut bakiyeler SIFIRLANMAZ; toplam korunur, yalnızca kovalara ayrılır.
-- Kaynağı doğrulanamayan kısım satın alınmış sayılmaz ve inceleme tablosuna yazılır.

alter table public.wallets
  add column if not exists game_coins bigint not null default 0,
  add column if not exists bonus_coins bigint not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wallets_game_coins_check') then
    alter table public.wallets add constraint wallets_game_coins_check check (game_coins >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wallets_bonus_coins_check') then
    alter table public.wallets add constraint wallets_bonus_coins_check check (bonus_coins >= 0);
  end if;
end $$;

comment on column public.wallets.coins is
  'Satın alınan coin (Apple IAP, Google Play, doğrulanmış web ödemesi). Nakde çevrilemez.';
comment on column public.wallets.game_coins is
  'Oyunlardan kazanılan coin. Nakde çevrilemez; hediye olarak gönderilebilir, alıcıya çekilebilir gelir oluşturmaz.';
comment on column public.wallets.bonus_coins is
  'Ödül/promosyon coin. Nakde çevrilemez; gelir oluşturmaz.';
comment on column public.wallets.diamonds is
  'Alınan hediye puanı (elmas). Parasal değeri yoktur; yayıncı kazancı creator_earning_entries tablosunda USD olarak tutulur.';

alter table public.wallet_ledger drop constraint if exists wallet_ledger_currency_check;
alter table public.wallet_ledger add constraint wallet_ledger_currency_check
  check (currency = any (array['coins', 'diamonds', 'game_coins', 'bonus_coins']));

-- Ledger nedeni → hedef kova. NULL = satın alınan kovada kalır.
create or replace function public.cuzdan_coin_hedef_kova(p_reason text, p_ref_type text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case
    when p_reason in (
      'zeus_win', 'kaskad_win', 'slot_win', 'storm_king_win', 'fruit_wheel_payout',
      'astral_falls_win', 'fair_spin_win', 'nox_win', 'sis_spin_win', 'game_reward'
    ) then 'game_coins'
    when p_reason in (
      'welcome_bonus', 'mission_reward', 'city_mission_reward', 'city_season_reward',
      'feedback_reward', 'wallet_transfer_in'
    ) then 'bonus_coins'
    when p_reason like 'admin_topup%' then 'bonus_coins'
    when p_reason like 'agency_distribution%' then 'bonus_coins'
    when p_ref_type = 'admin' then 'bonus_coins'
    else null
  end;
$$;

-- Satın alınan kovaya yazılmış oyun/ödül kredilerini işlem sonunda doğru kovaya taşır.
-- Ertelenmiş (commit anında) çalışır; böylece ledger ile cüzdan güncellemesinin sırası önemsizdir.
create or replace function public.cuzdan_coin_kaynak_ayir()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_kova text;
  v_coins bigint;
  v_move bigint;
  v_after bigint;
begin
  v_kova := public.cuzdan_coin_hedef_kova(new.reason, new.ref_type);
  if v_kova is null then
    return null;
  end if;

  select coins into v_coins from public.wallets where user_id = new.user_id for update;
  if v_coins is null then
    return null;
  end if;

  v_move := least(new.delta, v_coins);
  if v_move <= 0 then
    return null;
  end if;

  if v_kova = 'game_coins' then
    update public.wallets
      set coins = coins - v_move, game_coins = game_coins + v_move, updated_at = now()
      where user_id = new.user_id
      returning game_coins into v_after;
  else
    update public.wallets
      set coins = coins - v_move, bonus_coins = bonus_coins + v_move, updated_at = now()
      where user_id = new.user_id
      returning bonus_coins into v_after;
  end if;

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id, meta)
  values
    (new.user_id, 'coins', -v_move, v_coins - v_move, 'source_reclass_out', 'wallet_ledger', new.id,
      jsonb_build_object('target', v_kova, 'source_reason', new.reason,
        'shortfall', new.delta - v_move)),
    (new.user_id, v_kova, v_move, v_after, 'source_reclass_in', 'wallet_ledger', new.id,
      jsonb_build_object('source_reason', new.reason));

  return null;
end;
$$;

revoke all on function public.cuzdan_coin_kaynak_ayir() from public, anon, authenticated;

drop trigger if exists wallet_ledger_coin_kaynak_trg on public.wallet_ledger;
create constraint trigger wallet_ledger_coin_kaynak_trg
  after insert on public.wallet_ledger
  deferrable initially deferred
  for each row
  when (new.currency = 'coins' and new.delta > 0)
  execute function public.cuzdan_coin_kaynak_ayir();

-- ---------------------------------------------------------------------------
-- Eski bakiyelerin güvenli ayrımı
-- ---------------------------------------------------------------------------

create table if not exists public.coin_bakiye_gecis_incelemesi (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  coins_before bigint not null,
  purchased_verified bigint not null,
  purchased_unverified bigint not null,
  game_wins bigint not null,
  promo_credits bigint not null,
  purchased_after bigint not null,
  game_after bigint not null,
  bonus_after bigint not null,
  needs_review boolean not null,
  review_reasons text[] not null default '{}',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

alter table public.coin_bakiye_gecis_incelemesi enable row level security;

drop policy if exists coin_bakiye_gecis_admin on public.coin_bakiye_gecis_incelemesi;
create policy coin_bakiye_gecis_admin on public.coin_bakiye_gecis_incelemesi
  for select to authenticated
  using (public.ben_admin_miyim());

do $$
declare
  r record;
  v_verified bigint;
  v_unverified bigint;
  v_game bigint;
  v_promo bigint;
  v_admin bigint;
  v_purchased bigint;
  v_rest bigint;
  v_game_after bigint;
  v_bonus_after bigint;
  v_reasons text[];
begin
  for r in
    select w.user_id, w.coins
    from public.wallets w
    where w.coins > 0
      and not exists (select 1 from public.coin_bakiye_gecis_incelemesi g where g.user_id = w.user_id)
    for update
  loop
    -- Doğrulanmış satın alma: Stripe (webhook onaylı) veya sunucu doğrulaması kaydı olan mağaza alımı.
    select
      coalesce(sum(cp.coins_added) filter (
        where cp.provider = 'stripe'
           or coalesce(cp.receipt_payload->>'verified', '') in ('apple_server_api', 'google_play_api')
      ), 0),
      coalesce(sum(cp.coins_added) filter (
        where not (cp.provider = 'stripe'
           or coalesce(cp.receipt_payload->>'verified', '') in ('apple_server_api', 'google_play_api'))
      ), 0)
    into v_verified, v_unverified
    from public.coin_purchases cp
    where cp.user_id = r.user_id and cp.status = 'completed';

    select
      coalesce(sum(l.delta) filter (
        where public.cuzdan_coin_hedef_kova(l.reason, l.ref_type) = 'game_coins'), 0),
      coalesce(sum(l.delta) filter (
        where public.cuzdan_coin_hedef_kova(l.reason, l.ref_type) = 'bonus_coins'), 0),
      coalesce(sum(l.delta) filter (
        where l.reason like 'admin_topup%' or l.ref_type = 'admin'), 0)
    into v_game, v_promo, v_admin
    from public.wallet_ledger l
    where l.user_id = r.user_id and l.currency = 'coins' and l.delta > 0;

    v_purchased := least(r.coins, v_verified);
    v_rest := r.coins - v_purchased;
    v_game_after := least(v_rest, v_game);
    v_bonus_after := v_rest - v_game_after;

    v_reasons := '{}';
    if v_unverified > 0 then
      v_reasons := array_append(v_reasons, 'dogrulanmamis_magaza_alimi');
    end if;
    if v_game > 0 then
      v_reasons := array_append(v_reasons, 'oyun_kazanci_var');
    end if;
    if v_admin > 0 then
      v_reasons := array_append(v_reasons, 'admin_yuklemesi_var');
    end if;
    if r.coins > v_verified + v_game + v_promo then
      v_reasons := array_append(v_reasons, 'kaynagi_aciklanamayan_bakiye');
    end if;

    insert into public.coin_bakiye_gecis_incelemesi (
      user_id, coins_before, purchased_verified, purchased_unverified, game_wins, promo_credits,
      purchased_after, game_after, bonus_after, needs_review, review_reasons
    ) values (
      r.user_id, r.coins, v_verified, v_unverified, v_game, v_promo,
      v_purchased, v_game_after, v_bonus_after, cardinality(v_reasons) > 0, v_reasons
    );

    if v_game_after > 0 or v_bonus_after > 0 then
      update public.wallets
        set coins = v_purchased,
            game_coins = game_coins + v_game_after,
            bonus_coins = bonus_coins + v_bonus_after,
            updated_at = now()
        where user_id = r.user_id;

      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, meta)
      values (r.user_id, 'coins', -(v_game_after + v_bonus_after), v_purchased,
        'legacy_source_split', 'migration',
        jsonb_build_object('game', v_game_after, 'bonus', v_bonus_after));

      if v_game_after > 0 then
        insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type)
        values (r.user_id, 'game_coins', v_game_after,
          (select game_coins from public.wallets where user_id = r.user_id),
          'legacy_source_split', 'migration');
      end if;
      if v_bonus_after > 0 then
        insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type)
        values (r.user_id, 'bonus_coins', v_bonus_after,
          (select bonus_coins from public.wallets where user_id = r.user_id),
          'legacy_source_split', 'migration');
      end if;
    end if;
  end loop;
end $$;

-- Cüzdan özeti (istemci tek çağrıyla üç kovayı alır)
create or replace function public.cuzdan_bakiye_ozeti()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'purchased_coins', coalesce(w.coins, 0),
    'game_coins', coalesce(w.game_coins, 0),
    'bonus_coins', coalesce(w.bonus_coins, 0),
    'diamonds', coalesce(w.diamonds, 0),
    'updated_at', w.updated_at
  )
  from (select auth.uid() as uid) u
  left join public.wallets w on w.user_id = u.uid;
$$;

grant execute on function public.cuzdan_bakiye_ozeti() to authenticated;
