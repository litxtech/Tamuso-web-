-- Yayıncı / platform gelir paylaşımı: %40 içerik üreticisi, %60 Tamuso.
--
-- Paylaşılabilir gelir (USD) = harcanan SATIN ALINAN coin × revenue_usd_per_coin.
-- Oyun ve ödül coin'i ile gönderilen hediyeler alıcıya sanal destek (elmas puanı) olarak
-- ulaşır, ancak çekilebilir USD kazancı oluşturmaz.
-- Ajans komisyonu yayıncının %40 payından KESİLMEZ; platform payından ödenir.
-- Yeni oran yalnızca bu migration'dan sonraki işlemlere uygulanır; geçmiş kayıtlar değiştirilmez.

alter table public.platform_economy_config
  add column if not exists creator_share numeric(5,4) not null default 0.40,
  add column if not exists revenue_usd_per_coin numeric(12,6) not null default 0.005000,
  add column if not exists payout_min_usd numeric(12,2) not null default 25.00,
  add column if not exists payout_transfer_fee_usd numeric(12,2) not null default 0.00;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'platform_economy_creator_share_check') then
    alter table public.platform_economy_config
      add constraint platform_economy_creator_share_check check (creator_share > 0 and creator_share <= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'platform_economy_rev_per_coin_check') then
    alter table public.platform_economy_config
      add constraint platform_economy_rev_per_coin_check check (revenue_usd_per_coin > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'platform_economy_payout_min_check') then
    alter table public.platform_economy_config
      add constraint platform_economy_payout_min_check check (payout_min_usd > 0 and payout_transfer_fee_usd >= 0);
  end if;
end $$;

insert into public.platform_economy_config (id) values (1) on conflict (id) do nothing;
-- revenue_usd_per_coin: aktif paketler içinde en düşük coin başı net gelir (mağaza payı sonrası)
-- aşılmaz. Bugünkü tarife: 400 coin / $2.99 → 2.99 × 0.70 / 400 ≈ 0.00523 → 0.005.
update public.platform_economy_config
  set creator_share = 0.40, payout_min_usd = 25.00, revenue_usd_per_coin = 0.005, updated_at = now()
  where id = 1;

comment on column public.platform_economy_config.revenue_usd_per_coin is
  'Hediye ile harcanan 1 satın alınan coin için paylaşılabilir gelir (USD, mağaza komisyonu sonrası, en düşük paket bazında).';

create or replace function public.ekonomi_config_getir()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v public.platform_economy_config%rowtype;
begin
  select * into v from public.platform_economy_config where id = 1;
  if not found then
    return jsonb_build_object(
      'coin_try', 0.10, 'diamond_try', 0.10, 'gift_host_share', 0.80,
      'default_agency_share', 0.20, 'iap_store_fee_estimate', 0.30,
      'creator_share', 0.40, 'platform_share', 0.60, 'revenue_usd_per_coin', 0.005,
      'payout_min_usd', 25.00, 'payout_transfer_fee_usd', 0, 'updated_at', null
    );
  end if;
  return jsonb_build_object(
    'coin_try', v.coin_try,
    'diamond_try', v.diamond_try,
    'gift_host_share', v.gift_host_share,
    'default_agency_share', v.default_agency_share,
    'iap_store_fee_estimate', v.iap_store_fee_estimate,
    'creator_share', v.creator_share,
    'platform_share', 1 - v.creator_share,
    'revenue_usd_per_coin', v.revenue_usd_per_coin,
    'payout_min_usd', v.payout_min_usd,
    'payout_transfer_fee_usd', v.payout_transfer_fee_usd,
    'updated_at', v.updated_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Ödeme dönemi: ayın 1–15'i ve 16'sı–son günü (UTC)
-- ---------------------------------------------------------------------------

create or replace function public.odeme_donemi_bas(p_at timestamptz)
returns date
language sql
immutable
as $$
  select case
    when extract(day from (p_at at time zone 'UTC')) <= 15
      then date_trunc('month', (p_at at time zone 'UTC'))::date
    else date_trunc('month', (p_at at time zone 'UTC'))::date + 15
  end;
$$;

create or replace function public.odeme_donemi_bit(p_at timestamptz)
returns date
language sql
immutable
as $$
  select case
    when extract(day from (p_at at time zone 'UTC')) <= 15
      then date_trunc('month', (p_at at time zone 'UTC'))::date + 14
    else (date_trunc('month', (p_at at time zone 'UTC')) + interval '1 month - 1 day')::date
  end;
$$;

-- ---------------------------------------------------------------------------
-- Güvenlik bayrakları
-- ---------------------------------------------------------------------------

create table if not exists public.finance_risk_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  ref_type text,
  ref_id uuid,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'cleared', 'confirmed')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

create index if not exists finance_risk_flags_user_open_idx
  on public.finance_risk_flags (user_id) where status = 'open';

alter table public.finance_risk_flags enable row level security;

drop policy if exists finance_risk_flags_admin on public.finance_risk_flags;
create policy finance_risk_flags_admin on public.finance_risk_flags
  for select to authenticated
  using (public.ben_admin_miyim());

-- İki hesabın aynı cihazı veya aynı ağ izini paylaşıp paylaşmadığı.
create or replace function public.finans_iliskili_hesap_nedeni(p_a uuid, p_b uuid)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_a is null or p_b is null or p_a = p_b then
    return null;
  end if;

  if exists (
    select 1
    from public.device_sessions a
    join public.device_sessions b on b.device_id = a.device_id
    where a.user_id = p_a and b.user_id = p_b and a.device_id is not null
  ) or exists (
    select 1
    from public.device_push_tokens a
    join public.device_push_tokens b on b.device_id = a.device_id
    where a.user_id = p_a and b.user_id = p_b and a.device_id is not null
  ) then
    return 'shared_device';
  end if;

  if exists (
    select 1
    from public.device_sessions a
    join public.device_sessions b on b.ip_hash = a.ip_hash
    where a.user_id = p_a and b.user_id = p_b and a.ip_hash is not null
      and a.last_seen_at > now() - interval '30 days'
      and b.last_seen_at > now() - interval '30 days'
  ) then
    return 'shared_network';
  end if;

  return null;
end;
$$;

revoke all on function public.finans_iliskili_hesap_nedeni(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Yayıncı kazanç defteri (tek doğruluk kaynağı)
-- ---------------------------------------------------------------------------

create table if not exists public.creator_earning_entries (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  payer_id uuid references public.profiles(id) on delete set null,
  source_type text not null check (source_type in ('gift', 'call')),
  source_id uuid not null,
  channel text not null check (channel in ('live', 'voice_room', 'message', 'post', 'call', 'other')),
  coin_source text not null check (coin_source in ('purchased', 'game', 'bonus')),
  coins bigint not null check (coins >= 0),
  revenue_usd_per_coin numeric(12,6) not null,
  gross_usd numeric(14,4) not null check (gross_usd >= 0),
  creator_rate numeric(5,4) not null,
  creator_usd numeric(14,4) not null check (creator_usd >= 0),
  agency_id uuid references public.agencies(id) on delete set null,
  agency_rate numeric(6,4) not null default 0,
  agency_usd numeric(14,4) not null default 0 check (agency_usd >= 0),
  platform_usd numeric(14,4) not null check (platform_usd >= 0),
  deductions_usd numeric(14,4) not null default 0 check (deductions_usd >= 0),
  net_usd numeric(14,4) not null check (net_usd >= 0),
  eligible boolean not null,
  ineligible_reason text,
  hold_reason text,
  period_start date not null,
  period_end date not null,
  payout_request_id uuid,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint creator_earning_entries_source_uniq unique (source_type, source_id),
  constraint creator_earning_entries_split_check
    check (round(creator_usd + agency_usd + platform_usd, 4) = round(gross_usd, 4))
);

create index if not exists creator_earning_entries_creator_idx
  on public.creator_earning_entries (creator_id, created_at desc);
create index if not exists creator_earning_entries_payout_idx
  on public.creator_earning_entries (payout_request_id) where payout_request_id is not null;

alter table public.creator_earning_entries enable row level security;

drop policy if exists creator_earning_entries_own on public.creator_earning_entries;
create policy creator_earning_entries_own on public.creator_earning_entries
  for select to authenticated
  using (creator_id = auth.uid() or public.ben_admin_miyim());

create or replace function public.creator_earning_immutable()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'creator_earning_entries silinemez';
  end if;
  if new.gross_usd <> old.gross_usd or new.creator_usd <> old.creator_usd
     or new.agency_usd <> old.agency_usd or new.platform_usd <> old.platform_usd
     or new.creator_id <> old.creator_id or new.source_id <> old.source_id
     or new.coin_source <> old.coin_source then
    raise exception 'creator_earning_entries tutarları değiştirilemez';
  end if;
  return new;
end;
$$;

drop trigger if exists creator_earning_immutable_trg on public.creator_earning_entries;
create trigger creator_earning_immutable_trg
  before update or delete on public.creator_earning_entries
  for each row execute function public.creator_earning_immutable();

-- Tek bir kazanç kaydı oluşturur. Aynı kaynak ikinci kez kazanca dönüşmez (unique).
create or replace function public.yayinci_kazanc_kaydi_olustur(
  p_source_type text,
  p_source_id uuid,
  p_creator_id uuid,
  p_payer_id uuid,
  p_channel text,
  p_coin_source text,
  p_coins bigint
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_cfg public.platform_economy_config%rowtype;
  v_rate numeric(5,4);
  v_per_coin numeric(12,6);
  v_gross numeric(14,4);
  v_creator numeric(14,4);
  v_agency_id uuid;
  v_agency_rate numeric(6,4) := 0;
  v_agency numeric(14,4) := 0;
  v_platform numeric(14,4);
  v_eligible boolean := true;
  v_reason text;
  v_hold text;
  v_id uuid;
  v_ag record;
begin
  select * into v_cfg from public.platform_economy_config where id = 1;
  v_rate := coalesce(v_cfg.creator_share, 0.40);
  v_per_coin := coalesce(v_cfg.revenue_usd_per_coin, 0.005);

  if p_coin_source <> 'purchased' then
    v_eligible := false;
    v_reason := case p_coin_source when 'game' then 'game_coins' else 'bonus_coins' end;
  elsif p_creator_id = p_payer_id then
    v_eligible := false;
    v_reason := 'self_gift';
  end if;

  if v_eligible then
    v_gross := round(p_coins * v_per_coin, 4);
    v_creator := round(v_gross * v_rate, 4);

    select hp.agency_id, coalesce(acr.agency_share, 0) as share,
           coalesce(a.gift_earn_disabled, false) as disabled,
           coalesce(a.earnings_penalty_pct, 0) as penalty
      into v_ag
    from public.host_profiles hp
    left join public.agency_commission_rates acr on acr.agency_id = hp.agency_id
    left join public.agencies a on a.id = hp.agency_id
    where hp.user_id = p_creator_id and hp.status = 'agency' and hp.agency_id is not null;

    if v_ag.agency_id is not null and not v_ag.disabled then
      v_agency_id := v_ag.agency_id;
      v_agency_rate := greatest(0, least(1, v_ag.share * (1 - least(greatest(v_ag.penalty, 0), 100) / 100.0)));
      v_agency := least(round(v_creator * v_agency_rate, 4), v_gross - v_creator);
    end if;

    v_platform := v_gross - v_creator - v_agency;
    v_hold := public.finans_iliskili_hesap_nedeni(p_payer_id, p_creator_id);

    -- Test (sandbox) ödemesiyle alınmış coin gerçek gelir değildir.
    if v_hold is null
       and exists (
         select 1 from public.coin_purchases cp
         where cp.user_id = p_payer_id and cp.status = 'completed'
           and cp.receipt_payload->>'environment' = 'sandbox'
       )
       and not exists (
         select 1 from public.coin_purchases cp
         where cp.user_id = p_payer_id and cp.status = 'completed'
           and (cp.provider = 'stripe' or cp.receipt_payload->>'environment' = 'production')
       ) then
      v_hold := 'sandbox_funds';
    end if;
  else
    v_gross := 0;
    v_creator := 0;
    v_platform := 0;
  end if;

  insert into public.creator_earning_entries (
    creator_id, payer_id, source_type, source_id, channel, coin_source, coins,
    revenue_usd_per_coin, gross_usd, creator_rate, creator_usd,
    agency_id, agency_rate, agency_usd, platform_usd, deductions_usd, net_usd,
    eligible, ineligible_reason, hold_reason, period_start, period_end
  ) values (
    p_creator_id, p_payer_id, p_source_type, p_source_id, p_channel, p_coin_source, p_coins,
    v_per_coin, v_gross, v_rate, v_creator,
    v_agency_id, v_agency_rate, v_agency, v_platform, 0, v_creator,
    v_eligible, v_reason, v_hold, public.odeme_donemi_bas(now()), public.odeme_donemi_bit(now())
  )
  on conflict (source_type, source_id) do nothing
  returning id into v_id;

  if v_id is not null and v_hold is not null then
    insert into public.finance_risk_flags (user_id, kind, severity, ref_type, ref_id, details)
    values (p_creator_id, v_hold, case when v_hold = 'sandbox_funds' then 'low' else 'medium' end,
      'creator_earning', v_id,
      jsonb_build_object('payer_id', p_payer_id, 'source_type', p_source_type, 'source_id', p_source_id));
  end if;

  return v_id;
end;
$$;

revoke all on function public.yayinci_kazanc_kaydi_olustur(text, uuid, uuid, uuid, text, text, bigint)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Hediye işlemleri: coin kaynağı + kanal
-- ---------------------------------------------------------------------------

alter table public.gift_transactions
  add column if not exists coin_source text not null default 'purchased',
  add column if not exists channel text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gift_transactions_coin_source_check') then
    alter table public.gift_transactions add constraint gift_transactions_coin_source_check
      check (coin_source in ('purchased', 'game', 'bonus'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'gift_transactions_channel_check') then
    alter table public.gift_transactions add constraint gift_transactions_channel_check
      check (channel is null or channel in ('live', 'voice_room', 'message', 'post', 'other'));
  end if;
end $$;

-- Ajans komisyonu artık elmas üzerinden yayıncıdan kesilmiyor; USD olarak platform payından
-- creator_earning_entries.agency_usd alanına yazılıyor.
drop trigger if exists gift_tx_agency_commission_trg on public.gift_transactions;

drop function if exists public.send_gift(uuid, uuid, uuid, integer, text, uuid);
drop function if exists public.send_gift(uuid, uuid, uuid, integer, text, uuid, uuid);

create or replace function public.send_gift(
  p_room_id uuid,
  p_receiver_id uuid,
  p_gift_id uuid,
  p_quantity integer default 1,
  p_idempotency_key text default null,
  p_status_id uuid default null,
  p_live_session_id uuid default null,
  p_coin_source text default 'purchased',
  p_channel text default null
)
returns public.gift_transactions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sender uuid := auth.uid();
  v_gift public.gifts%rowtype;
  v_cost bigint;
  v_diamonds bigint;
  v_balance bigint;
  v_tx public.gift_transactions%rowtype;
  v_is_guest boolean;
  v_existing uuid;
  v_pk_id uuid;
  v_pk_side text;
  v_status_owner uuid;
  v_status_deleted timestamptz;
  v_live_id uuid;
  v_explicit_live uuid;
  v_recv_live uuid;
  v_source text := coalesce(nullif(trim(p_coin_source), ''), 'purchased');
  v_currency text;
  v_channel text;
  v_agency_id uuid;
begin
  if v_sender is null then
    raise exception 'Not authenticated';
  end if;
  if public.kill_switch_aktif_mi('kill_gift_send') then
    raise exception 'Gift send temporarily disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('gifts_enabled') then
    raise exception 'Gifts feature disabled';
  end if;
  if v_source not in ('purchased', 'game', 'bonus') then
    raise exception 'Invalid coin source';
  end if;
  v_currency := case v_source when 'purchased' then 'coins' when 'game' then 'game_coins' else 'bonus_coins' end;

  select is_guest into v_is_guest from public.profiles where id = v_sender;
  if coalesce(v_is_guest, false) then
    raise exception 'Guest cannot send gifts';
  end if;
  if p_quantity < 1 then
    raise exception 'Invalid quantity';
  end if;
  if v_sender = p_receiver_id then
    raise exception 'Cannot gift yourself';
  end if;

  if p_status_id is not null then
    select user_id, deleted_at into v_status_owner, v_status_deleted
    from public.status_posts where id = p_status_id;
    if v_status_owner is null or v_status_deleted is not null then
      raise exception 'Status not found';
    end if;
    if v_status_owner <> p_receiver_id then
      raise exception 'Gift receiver must be status owner';
    end if;
  end if;

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select result_ref into v_existing
    from public.finance_idempotency_keys
    where idempotency_key = p_idempotency_key and user_id = v_sender;
    if v_existing is not null then
      select * into v_tx from public.gift_transactions where id = v_existing;
      if found then
        return v_tx;
      end if;
    end if;
  end if;

  select * into v_gift from public.gifts where id = p_gift_id and is_active;
  if not found then
    raise exception 'Gift not found';
  end if;

  v_cost := v_gift.coin_cost * p_quantity;
  v_diamonds := v_gift.diamond_value * p_quantity;

  select case v_source when 'purchased' then coins when 'game' then game_coins else bonus_coins end
    into v_balance
  from public.wallets where user_id = v_sender for update;
  if v_balance is null or v_balance < v_cost then
    raise exception 'Insufficient coins';
  end if;

  insert into public.wallets (user_id, coins, diamonds)
  values (p_receiver_id, 0, 0)
  on conflict (user_id) do nothing;
  perform 1 from public.wallets where user_id = p_receiver_id for update;

  if v_source = 'purchased' then
    update public.wallets set coins = coins - v_cost, updated_at = now() where user_id = v_sender
      returning coins into v_balance;
  elsif v_source = 'game' then
    update public.wallets set game_coins = game_coins - v_cost, updated_at = now() where user_id = v_sender
      returning game_coins into v_balance;
  else
    update public.wallets set bonus_coins = bonus_coins - v_cost, updated_at = now() where user_id = v_sender
      returning bonus_coins into v_balance;
  end if;

  update public.wallets
    set diamonds = diamonds + v_diamonds, updated_at = now()
    where user_id = p_receiver_id;

  if p_room_id is not null then
    update public.rooms
      set total_coins_earned = total_coins_earned + v_cost
      where id = p_room_id;
  end if;

  -- Hediye hangi yayına işlensin: açıkça verilen veya alıcının aktif yayını (yalnızca istatistik)
  if p_live_session_id is not null and exists (
    select 1 from public.live_sessions
    where id = p_live_session_id and host_id = p_receiver_id and is_live = true
  ) then
    v_explicit_live := p_live_session_id;
  end if;
  v_live_id := v_explicit_live;
  if v_live_id is null then
    select id into v_live_id
    from public.live_sessions
    where host_id = p_receiver_id and is_live = true
    order by started_at desc
    limit 1;
  end if;

  if v_live_id is not null then
    update public.live_sessions
      set gift_count = gift_count + p_quantity,
          total_coins_earned = total_coins_earned + v_cost,
          score = score + v_cost
    where id = v_live_id;
  end if;

  v_channel := case
    when p_status_id is not null then 'post'
    when v_explicit_live is not null then 'live'
    when p_room_id is not null then 'voice_room'
    when p_channel = 'message' then 'message'
    when p_channel = 'live' and v_live_id is not null then 'live'
    else 'other'
  end;

  select hp.agency_id into v_agency_id
  from public.host_profiles hp
  where hp.user_id = p_receiver_id and hp.status = 'agency' and hp.agency_id is not null;

  insert into public.gift_transactions (
    room_id, sender_id, receiver_id, gift_id, quantity,
    coins_spent, diamonds_earned, idempotency_key, agency_commission_snapshot,
    status_id, live_session_id, coin_source, channel, agency_id
  ) values (
    p_room_id, v_sender, p_receiver_id, p_gift_id, p_quantity,
    v_cost, v_diamonds, nullif(trim(p_idempotency_key), ''), 0,
    p_status_id, v_live_id, v_source, v_channel, v_agency_id
  ) returning * into v_tx;

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id, meta)
  values (v_sender, v_currency, -v_cost, v_balance, 'gift_sent', 'gift', v_tx.id,
    jsonb_build_object('coin_source', v_source, 'channel', v_channel));

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id, meta)
  values (
    p_receiver_id, 'diamonds', v_diamonds,
    (select diamonds from public.wallets where user_id = p_receiver_id),
    'gift_received', 'gift', v_tx.id,
    jsonb_build_object('coin_source', v_source, 'channel', v_channel)
  );

  perform public.yayinci_kazanc_kaydi_olustur(
    'gift', v_tx.id, p_receiver_id, v_sender, v_channel, v_source, v_cost
  );

  if v_agency_id is not null then
    update public.agencies set total_gifts = total_gifts + v_cost where id = v_agency_id;
  end if;

  if p_status_id is not null then
    update public.status_posts
      set gift_count = gift_count + p_quantity,
          updated_at = now()
      where id = p_status_id and deleted_at is null;
  end if;

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    insert into public.finance_idempotency_keys (
      idempotency_key, user_id, operation, result_ref, result_payload
    ) values (
      p_idempotency_key, v_sender, 'gift_send', v_tx.id,
      jsonb_build_object('coins_spent', v_cost, 'diamonds', v_diamonds, 'coin_source', v_source)
    )
    on conflict (idempotency_key) do nothing;
  end if;

  -- PK skor: oda veya canlı — alıcının tarafına
  if not public.kill_switch_aktif_mi('kill_pk') then
    v_pk_id := null;
    v_pk_side := null;

    if p_room_id is not null then
      select m.id,
        case when m.room_a_id = p_room_id then 'a' when m.room_b_id = p_room_id then 'b' else null end
      into v_pk_id, v_pk_side
      from public.pk_matches m
      where m.status = 'live'
        and (m.room_a_id = p_room_id or m.room_b_id = p_room_id)
        and (m.ends_at is null or m.ends_at > now())
      order by m.started_at desc
      limit 1;
    end if;

    if v_pk_id is null then
      v_recv_live := v_live_id;
      if v_recv_live is not null then
        select m.id,
          case when m.live_a_id = v_recv_live then 'a' when m.live_b_id = v_recv_live then 'b' else null end
        into v_pk_id, v_pk_side
        from public.pk_matches m
        where m.status = 'live'
          and (m.live_a_id = v_recv_live or m.live_b_id = v_recv_live)
          and (m.ends_at is null or m.ends_at > now())
        order by m.started_at desc
        limit 1;
      end if;
    end if;

    if v_pk_id is null then
      select m.id,
        case when la.host_id = p_receiver_id then 'a' when lb.host_id = p_receiver_id then 'b' else null end
      into v_pk_id, v_pk_side
      from public.pk_matches m
      left join public.live_sessions la on la.id = m.live_a_id
      left join public.live_sessions lb on lb.id = m.live_b_id
      where m.status = 'live'
        and (m.ends_at is null or m.ends_at > now())
        and (la.host_id = p_receiver_id or lb.host_id = p_receiver_id)
      order by m.started_at desc
      limit 1;
    end if;

    if v_pk_id is not null and v_pk_side is not null then
      begin
        perform public.pk_skor_ekle(v_pk_id, v_pk_side, v_cost, 'gift', v_tx.id);
      exception when others then
        null;
      end;
    end if;
  end if;

  return v_tx;
end;
$$;

grant execute on function public.send_gift(uuid, uuid, uuid, integer, text, uuid, uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Ücretli görüşmeler: aynı %40 / %60 kuralı, kazanç USD defterine yazılır
-- ---------------------------------------------------------------------------

update public.people_discovery_config set platform_call_fee = 0.60 where id = 1;

create or replace function public.kisiler_gorusme_billing_finalize(p_call_id uuid)
returns public.direct_calls
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_row public.direct_calls%rowtype;
  v_cfg public.people_discovery_config%rowtype;
  v_caller public.people_call_settings%rowtype;
  v_seconds int;
  v_free_on_call int;
  v_free_target int;
  v_free_delta int;
  v_paid_seconds int;
  v_gross bigint;
  v_fee bigint;
  v_creator bigint;
  v_balance bigint;
  v_charge bigint;
begin
  select * into v_row from public.direct_calls where id = p_call_id for update;
  if not found then raise exception 'Cagri yok'; end if;

  if not v_row.is_paid then return v_row; end if;
  if v_row.billing_status in ('FINALIZED', 'RELEASED') then return v_row; end if;

  select * into v_cfg from public.people_discovery_config where id = 1;

  if v_row.answered_at is null or v_row.status in ('rejected', 'missed', 'cancelled') then
    update public.direct_calls set
      billing_status = 'RELEASED',
      billable_seconds = 0,
      free_seconds_consumed = 0,
      gross_coin_amount = 0,
      platform_fee_coins = 0,
      creator_share_coins = 0,
      reserved_coins = 0,
      billing_finalized_at = now()
    where id = p_call_id
    returning * into v_row;
    return v_row;
  end if;

  v_seconds := greatest(
    0,
    floor(extract(epoch from (coalesce(v_row.ended_at, now()) - v_row.answered_at)))::int
  );

  v_caller := public.kisiler_ayar_ensure(v_row.caller_id);
  perform 1 from public.people_call_settings where user_id = v_row.caller_id for update;
  select * into v_caller from public.people_call_settings where user_id = v_row.caller_id;

  v_free_target := least(
    v_seconds,
    coalesce(v_row.free_seconds_consumed, 0) + greatest(0, coalesce(v_caller.free_call_seconds_remaining, 0))
  );
  v_free_delta := greatest(0, v_free_target - coalesce(v_row.free_seconds_consumed, 0));
  if v_free_delta > 0 then
    update public.people_call_settings set
      free_call_seconds_remaining = greatest(0, free_call_seconds_remaining - v_free_delta),
      updated_at = now()
    where user_id = v_row.caller_id;
    update public.direct_calls set free_seconds_consumed = v_free_target where id = p_call_id;
    v_row.free_seconds_consumed := v_free_target;
  end if;

  v_free_on_call := least(v_seconds, coalesce(v_row.free_seconds_consumed, 0));
  v_paid_seconds := greatest(0, v_seconds - v_free_on_call);

  v_gross := public.kisiler_billable_coins(
    v_paid_seconds,
    coalesce(v_row.price_per_minute_snapshot, 0),
    coalesce(v_cfg.billing_mode, 'per_second_ceil')
  );

  insert into public.wallets (user_id, coins, diamonds)
  values (v_row.caller_id, 0, 0) on conflict (user_id) do nothing;
  insert into public.wallets (user_id, coins, diamonds)
  values (v_row.callee_id, 0, 0) on conflict (user_id) do nothing;

  select coins into v_balance from public.wallets where user_id = v_row.caller_id for update;
  perform 1 from public.wallets where user_id = v_row.callee_id for update;

  v_charge := least(v_gross, greatest(coalesce(v_balance, 0), 0));
  v_gross := v_charge;
  v_fee := floor(v_gross::numeric * coalesce(v_cfg.platform_call_fee, 0.60))::bigint;
  v_creator := greatest(v_gross - v_fee, 0);

  if v_charge > 0 then
    update public.wallets
      set coins = coins - v_charge, updated_at = now()
      where user_id = v_row.caller_id;

    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (
      v_row.caller_id, 'coins', -v_charge,
      (select coins from public.wallets where user_id = v_row.caller_id),
      'people_call_spend', 'direct_call', p_call_id
    );

    if v_creator > 0 then
      update public.wallets
        set diamonds = diamonds + v_creator, updated_at = now()
        where user_id = v_row.callee_id;

      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (
        v_row.callee_id, 'diamonds', v_creator,
        (select diamonds from public.wallets where user_id = v_row.callee_id),
        'people_call_earn', 'direct_call', p_call_id
      );
    end if;

    perform public.yayinci_kazanc_kaydi_olustur(
      'call', p_call_id, v_row.callee_id, v_row.caller_id, 'call', 'purchased', v_charge
    );
  end if;

  update public.direct_calls set
    billing_status = 'FINALIZED',
    billable_seconds = v_paid_seconds,
    free_seconds_consumed = v_free_on_call,
    gross_coin_amount = v_gross,
    platform_fee_coins = v_fee,
    creator_share_coins = v_creator,
    reserved_coins = 0,
    billing_finalized_at = now()
  where id = p_call_id
  returning * into v_row;

  return v_row;
end;
$$;
