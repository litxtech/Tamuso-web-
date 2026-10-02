-- Fruit Wheel — resmi Tamuso oyunu (game_key: fruit_wheel).
-- Sonuç tur açılırken sunucuda üretilir. Seçim dağılımı sonucu değiştirmez.
-- İstemci çarpan, ağırlık veya bakiye yazamaz.
-- Varsayılan ekonomi: TEST_BALANCE. Platform coin yalnızca policy kapısı açıksa.

insert into public.feature_flags (key, enabled, description) values
  ('fruit_wheel_enabled', true, 'Fruit Wheel resmi çark oyunu')
on conflict (key) do nothing;

insert into public.game_catalog (
  game_code, name, description, min_players, max_players, default_duration_seconds, is_active
) values (
  'fruit_wheel',
  'Fruit Wheel',
  '8 meyveli canli cark — global tur, sunucu sonucu',
  1,
  5000,
  12,
  true
)
on conflict (game_code) do nothing;

insert into public.game_control_configs (
  game_code, is_enabled, mode, min_entry, max_entry, coin_rewards_enabled, min_players, max_players
) values (
  'fruit_wheel', true, 'NORMAL', 10, 100000, true, 1, 5000
)
on conflict (game_code) do nothing;

-- ---------------------------------------------------------------------------
create table if not exists public.fruit_wheel_policy (
  id int primary key default 1 check (id = 1),
  economy_mode text not null default 'TEST_BALANCE'
    check (economy_mode in (
      'TEST_BALANCE',
      'CLOSED_LOOP_GAME_BALANCE',
      'PLATFORM_APPROVED_COIN'
    )),
  game_enabled boolean not null default true,
  platform_approved boolean not null default false,
  allowed_regions text[] not null default '{}',
  minimum_age_policy int not null default 18,
  display_name text not null default 'Fruit Wheel',
  open_seconds int not null default 12,
  lock_countdown_seconds int not null default 3,
  spin_seconds int not null default 5,
  result_seconds int not null default 6,
  minimum_selection bigint not null default 10,
  maximum_selection_per_fruit bigint not null default 100000,
  maximum_total_per_round bigint not null default 500000,
  quick_amounts jsonb not null default '[10,50,100,500,1000,5000]'::jsonb,
  force_next_fruit_id text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.fruit_wheel_policy (id) values (1)
on conflict (id) do nothing;

create table if not exists public.fruit_wheel_config_versions (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  fruits jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  is_current boolean not null default false
);

create unique index if not exists fruit_wheel_config_one_current
  on public.fruit_wheel_config_versions (is_current)
  where is_current;

create table if not exists public.fruit_wheel_rounds (
  id uuid primary key default gen_random_uuid(),
  round_no bigint generated always as identity,
  status text not null default 'OPEN',
  config_version int not null,
  economy_mode text not null,
  config_snapshot jsonb not null,
  limits_snapshot jsonb not null,
  opens_at timestamptz not null,
  locks_at timestamptz not null,
  result_at timestamptz not null,
  reveal_until timestamptz not null,
  next_at timestamptz not null,
  winning_fruit_id text not null,
  segment_index int not null,
  multiplier numeric(12, 4) not null,
  presentation_tier text not null,
  rng_seed text not null,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists fruit_wheel_rounds_status_idx
  on public.fruit_wheel_rounds (status, created_at desc);

create table if not exists public.fruit_wheel_selections (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.fruit_wheel_rounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  fruit_id text not null,
  amount bigint not null check (amount > 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'settled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, user_id, fruit_id)
);

create index if not exists fruit_wheel_selections_round_idx
  on public.fruit_wheel_selections (round_id, user_id);

create table if not exists public.fruit_wheel_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  round_id uuid not null references public.fruit_wheel_rounds(id) on delete cascade,
  idempotency_key text not null,
  selections jsonb not null,
  delta bigint not null,
  balance_after bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.fruit_wheel_settlements (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.fruit_wheel_rounds(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  selection_id uuid not null references public.fruit_wheel_selections(id) on delete cascade,
  fruit_id text not null,
  stake bigint not null,
  matched boolean not null,
  multiplier numeric(12, 4) not null,
  payout bigint not null,
  created_at timestamptz not null default now(),
  unique (selection_id)
);

create index if not exists fruit_wheel_settlements_user_idx
  on public.fruit_wheel_settlements (user_id, created_at desc);

create table if not exists public.fruit_wheel_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  test_coins bigint not null default 100000,
  closed_loop_coins bigint not null default 100000,
  updated_at timestamptz not null default now()
);

create table if not exists public.fruit_wheel_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  economy_mode text not null,
  delta bigint not null,
  balance_after bigint not null,
  reason text not null,
  round_id uuid,
  ref_id uuid,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists fruit_wheel_ledger_user_idx
  on public.fruit_wheel_ledger (user_id, created_at desc);

create table if not exists public.fruit_wheel_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen timestamptz not null default now()
);

create table if not exists public.fruit_wheel_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fruit_wheel_live (
  id int primary key default 1 check (id = 1),
  round_id uuid,
  round_no bigint,
  status text,
  opens_at timestamptz,
  locks_at timestamptz,
  result_at timestamptz,
  revealed_fruit_id text,
  updated_at timestamptz not null default now()
);

insert into public.fruit_wheel_live (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
alter table public.fruit_wheel_policy enable row level security;
alter table public.fruit_wheel_config_versions enable row level security;
alter table public.fruit_wheel_rounds enable row level security;
alter table public.fruit_wheel_selections enable row level security;
alter table public.fruit_wheel_commands enable row level security;
alter table public.fruit_wheel_settlements enable row level security;
alter table public.fruit_wheel_balances enable row level security;
alter table public.fruit_wheel_ledger enable row level security;
alter table public.fruit_wheel_presence enable row level security;
alter table public.fruit_wheel_audit enable row level security;
alter table public.fruit_wheel_live enable row level security;

drop policy if exists fruit_wheel_selections_select_own on public.fruit_wheel_selections;
create policy fruit_wheel_selections_select_own on public.fruit_wheel_selections
  for select to authenticated using (user_id = auth.uid());

drop policy if exists fruit_wheel_commands_select_own on public.fruit_wheel_commands;
create policy fruit_wheel_commands_select_own on public.fruit_wheel_commands
  for select to authenticated using (user_id = auth.uid());

drop policy if exists fruit_wheel_settlements_select_own on public.fruit_wheel_settlements;
create policy fruit_wheel_settlements_select_own on public.fruit_wheel_settlements
  for select to authenticated using (user_id = auth.uid());

drop policy if exists fruit_wheel_balances_select_own on public.fruit_wheel_balances;
create policy fruit_wheel_balances_select_own on public.fruit_wheel_balances
  for select to authenticated using (user_id = auth.uid());

drop policy if exists fruit_wheel_ledger_select_own on public.fruit_wheel_ledger;
create policy fruit_wheel_ledger_select_own on public.fruit_wheel_ledger
  for select to authenticated using (user_id = auth.uid());

drop policy if exists fruit_wheel_live_select on public.fruit_wheel_live;
create policy fruit_wheel_live_select on public.fruit_wheel_live
  for select to authenticated using (true);

-- İstemci yazamaz. Kazanan sonucu olan tur tablosu istemciye açılmaz.
revoke all on public.fruit_wheel_policy from public, anon, authenticated;
revoke all on public.fruit_wheel_config_versions from public, anon, authenticated;
revoke all on public.fruit_wheel_rounds from public, anon, authenticated;
revoke all on public.fruit_wheel_audit from public, anon, authenticated;
revoke all on public.fruit_wheel_presence from public, anon, authenticated;

revoke insert, update, delete, truncate on
  public.fruit_wheel_selections,
  public.fruit_wheel_commands,
  public.fruit_wheel_settlements,
  public.fruit_wheel_balances,
  public.fruit_wheel_ledger,
  public.fruit_wheel_live
from public, anon, authenticated;

grant select on
  public.fruit_wheel_selections,
  public.fruit_wheel_commands,
  public.fruit_wheel_settlements,
  public.fruit_wheel_balances,
  public.fruit_wheel_ledger,
  public.fruit_wheel_live
to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.fruit_wheel_admin_mi()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.fruit_wheel_admin_mi() from public, anon, authenticated;

create or replace function public.fruit_wheel_public_fruits(p_fruits jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', f->>'id',
      'multiplier', (f->>'multiplier')::numeric,
      'accent', coalesce(f->>'accent', '#E6CE92'),
      'enabled', coalesce((f->>'enabled')::boolean, true),
      'tier', coalesce(f->>'tier', 'NORMAL')
    )
    order by ord
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_fruits, '[]'::jsonb)) with ordinality as t(f, ord);
$$;

revoke all on function public.fruit_wheel_public_fruits(jsonb) from public, anon, authenticated;

create or replace function public.fruit_wheel_validate_fruits(p_fruits jsonb)
returns text
language plpgsql
immutable
as $$
declare
  v_ids text[] := array['cherry','lemon','orange','watermelon','grape','strawberry','pineapple','kiwi'];
  v_id text;
  v_row jsonb;
  v_weight numeric;
  v_mult numeric;
  v_sum numeric := 0;
  v_enabled int := 0;
  v_seen text[] := '{}';
begin
  if jsonb_typeof(p_fruits) <> 'array' or jsonb_array_length(p_fruits) <> 8 then
    return 'exactly 8 fruits';
  end if;
  for v_row in select value from jsonb_array_elements(p_fruits)
  loop
    v_id := v_row->>'id';
    if v_id is null or not (v_id = any (v_ids)) then
      return 'unknown fruit';
    end if;
    if v_id = any (v_seen) then
      return 'duplicate fruit';
    end if;
    v_seen := v_seen || v_id;
    if (v_row->>'weight') is null or (v_row->>'weight') !~ '^[0-9]+$' then
      return 'invalid weight';
    end if;
    v_weight := (v_row->>'weight')::numeric;
    if v_weight < 0 or v_weight <> trunc(v_weight) then
      return 'invalid weight';
    end if;
    begin
      v_mult := (v_row->>'multiplier')::numeric;
    exception when others then
      return 'invalid multiplier';
    end;
    if v_mult is null or v_mult < 1 or v_mult > 10000 then
      return 'invalid multiplier';
    end if;
    if coalesce((v_row->>'enabled')::boolean, true) then
      v_enabled := v_enabled + 1;
      v_sum := v_sum + v_weight;
    end if;
    if coalesce(v_row->>'tier', 'NORMAL') not in ('NORMAL','GOOD','BIG','RARE') then
      return 'invalid tier';
    end if;
  end loop;
  if coalesce(array_length(v_seen, 1), 0) <> 8 then
    return 'missing fruit';
  end if;
  if v_enabled < 1 or v_sum <= 0 then
    return 'weights must not be all zero';
  end if;
  return null;
end;
$$;

revoke all on function public.fruit_wheel_validate_fruits(jsonb) from public, anon, authenticated;

-- Seçim tablosuna bakmaz. Yalnız snapshot ağırlıkları.
create or replace function public.fruit_wheel_pick(p_fruits jsonb, p_force text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_id text;
  v_weight bigint;
  v_sum bigint := 0;
  v_roll bigint;
  v_acc bigint := 0;
  v_seed text;
  v_index int := 0;
  v_i int := 0;
  v_found boolean := false;
begin
  v_seed := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);

  if p_force is not null then
    for v_row in select value from jsonb_array_elements(p_fruits)
    loop
      if v_row->>'id' = p_force and coalesce((v_row->>'enabled')::boolean, true) then
        return jsonb_build_object(
          'id', p_force,
          'index', v_i,
          'multiplier', (v_row->>'multiplier')::numeric,
          'tier', coalesce(v_row->>'tier', 'NORMAL'),
          'seed', v_seed,
          'forced', true
        );
      end if;
      v_i := v_i + 1;
    end loop;
  end if;

  for v_row in select value from jsonb_array_elements(p_fruits)
  loop
    if coalesce((v_row->>'enabled')::boolean, true) then
      v_sum := v_sum + coalesce((v_row->>'weight')::bigint, 0);
    end if;
  end loop;
  if v_sum <= 0 then
    raise exception 'weights must not be all zero';
  end if;

  v_roll := mod((hashtext(v_seed)::bigint & 2147483647), v_sum);
  v_i := 0;
  for v_row in select value from jsonb_array_elements(p_fruits)
  loop
    if coalesce((v_row->>'enabled')::boolean, true) then
      v_weight := coalesce((v_row->>'weight')::bigint, 0);
      v_acc := v_acc + v_weight;
      if not v_found and v_roll < v_acc and v_weight > 0 then
        v_id := v_row->>'id';
        v_index := v_i;
        v_found := true;
        return jsonb_build_object(
          'id', v_id,
          'index', v_index,
          'multiplier', (v_row->>'multiplier')::numeric,
          'tier', coalesce(v_row->>'tier', 'NORMAL'),
          'seed', v_seed,
          'forced', false
        );
      end if;
    end if;
    v_i := v_i + 1;
  end loop;
  raise exception 'pick failed';
end;
$$;

revoke all on function public.fruit_wheel_pick(jsonb, text) from public, anon, authenticated;

create or replace function public.fruit_wheel_can_open()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pol public.fruit_wheel_policy%rowtype;
begin
  if public.kill_switch_aktif_mi('kill_games') then return false; end if;
  if not public.ozellik_bayragi_aktif_mi('games_enabled') then return false; end if;
  if not public.ozellik_bayragi_aktif_mi('fruit_wheel_enabled') then return false; end if;
  select * into v_pol from public.fruit_wheel_policy where id = 1;
  if not coalesce(v_pol.game_enabled, false) then return false; end if;
  if v_pol.economy_mode = 'PLATFORM_APPROVED_COIN' then
    if not v_pol.platform_approved then return false; end if;
    if public.kill_switch_aktif_mi('kill_game_coin') then return false; end if;
  end if;
  return true;
end;
$$;

revoke all on function public.fruit_wheel_can_open() from public, anon, authenticated;

create or replace function public.fruit_wheel_user_eligible(p_user uuid, p_mode text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pol public.fruit_wheel_policy%rowtype;
  v_birth date;
  v_country text;
begin
  if p_mode <> 'PLATFORM_APPROVED_COIN' then
    return null;
  end if;
  select * into v_pol from public.fruit_wheel_policy where id = 1;
  if not v_pol.platform_approved then
    return 'platform_closed';
  end if;
  if public.kill_switch_aktif_mi('kill_game_coin') then
    return 'coin_disabled';
  end if;
  select birth_date, country into v_birth, v_country
  from public.profiles where id = p_user;
  if v_birth is null or v_birth > (current_date - make_interval(years => v_pol.minimum_age_policy)) then
    return 'age_policy';
  end if;
  if coalesce(array_length(v_pol.allowed_regions, 1), 0) > 0 then
    if v_country is null or not (v_country = any (v_pol.allowed_regions)) then
      return 'region_policy';
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.fruit_wheel_user_eligible(uuid, text) from public, anon, authenticated;

create or replace function public.fruit_wheel_lock_balance(p_user uuid, p_mode text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal bigint;
begin
  if p_mode = 'PLATFORM_APPROVED_COIN' then
    select coins into v_bal from public.wallets where user_id = p_user for update;
    if v_bal is null then
      raise exception 'Wallet not found';
    end if;
    return v_bal;
  end if;

  insert into public.fruit_wheel_balances (user_id)
  values (p_user)
  on conflict (user_id) do nothing;

  if p_mode = 'CLOSED_LOOP_GAME_BALANCE' then
    select closed_loop_coins into v_bal
    from public.fruit_wheel_balances where user_id = p_user for update;
  else
    select test_coins into v_bal
    from public.fruit_wheel_balances where user_id = p_user for update;
  end if;
  return coalesce(v_bal, 0);
end;
$$;

revoke all on function public.fruit_wheel_lock_balance(uuid, text) from public, anon, authenticated;

create or replace function public.fruit_wheel_apply_delta(
  p_user uuid,
  p_mode text,
  p_delta bigint,
  p_reason text,
  p_round uuid,
  p_ref uuid,
  p_idem text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal bigint;
  v_after bigint;
  v_inserted uuid;
begin
  select id into v_inserted
  from public.fruit_wheel_ledger
  where idempotency_key = p_idem;
  if found then
    select balance_after into v_after
    from public.fruit_wheel_ledger where idempotency_key = p_idem;
    return v_after;
  end if;

  v_bal := public.fruit_wheel_lock_balance(p_user, p_mode);
  if v_bal + p_delta < 0 then
    raise exception 'Insufficient coins';
  end if;
  v_after := v_bal + p_delta;

  if p_mode = 'PLATFORM_APPROVED_COIN' then
    update public.wallets
    set coins = v_after, updated_at = now()
    where user_id = p_user;
    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (p_user, 'coins', p_delta, v_after, p_reason, 'fruit_wheel', coalesce(p_ref, p_round));
  elsif p_mode = 'CLOSED_LOOP_GAME_BALANCE' then
    update public.fruit_wheel_balances
    set closed_loop_coins = v_after, updated_at = now()
    where user_id = p_user;
  else
    update public.fruit_wheel_balances
    set test_coins = v_after, updated_at = now()
    where user_id = p_user;
  end if;

  insert into public.fruit_wheel_ledger (
    user_id, economy_mode, delta, balance_after, reason, round_id, ref_id, idempotency_key
  ) values (
    p_user, p_mode, p_delta, v_after, p_reason, p_round, p_ref, p_idem
  );

  return v_after;
end;
$$;

revoke all on function public.fruit_wheel_apply_delta(uuid, text, bigint, text, uuid, uuid, text)
  from public, anon, authenticated;

create or replace function public.fruit_wheel_create_round()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pol public.fruit_wheel_policy%rowtype;
  v_cfg public.fruit_wheel_config_versions%rowtype;
  v_force text;
  v_pick jsonb;
  v_id uuid;
  v_open timestamptz := now();
begin
  select * into v_pol from public.fruit_wheel_policy where id = 1 for update;
  select * into v_cfg from public.fruit_wheel_config_versions where is_current
  order by version desc limit 1;
  if v_cfg.id is null then
    raise exception 'fruit wheel config missing';
  end if;

  v_force := null;
  if v_pol.economy_mode = 'TEST_BALANCE' then
    v_force := v_pol.force_next_fruit_id;
  end if;

  v_pick := public.fruit_wheel_pick(v_cfg.fruits, v_force);

  if v_force is not null then
    update public.fruit_wheel_policy
    set force_next_fruit_id = null, updated_at = now()
    where id = 1;
    insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
    values (
      null,
      'force_consumed',
      jsonb_build_object('force', v_force),
      jsonb_build_object('picked', v_pick->>'id', 'forced', v_pick->'forced')
    );
  end if;

  insert into public.fruit_wheel_rounds (
    status, config_version, economy_mode, config_snapshot, limits_snapshot,
    opens_at, locks_at, result_at, reveal_until, next_at,
    winning_fruit_id, segment_index, multiplier, presentation_tier, rng_seed
  ) values (
    'OPEN',
    v_cfg.version,
    v_pol.economy_mode,
    jsonb_build_object('fruits', v_cfg.fruits, 'version', v_cfg.version),
    jsonb_build_object(
      'minimumSelection', v_pol.minimum_selection,
      'maximumSelectionPerFruit', v_pol.maximum_selection_per_fruit,
      'maximumTotalPerRound', v_pol.maximum_total_per_round,
      'quickAmounts', v_pol.quick_amounts,
      'displayName', v_pol.display_name,
      'openSeconds', v_pol.open_seconds,
      'lockCountdownSeconds', v_pol.lock_countdown_seconds
    ),
    v_open,
    v_open + make_interval(secs => v_pol.open_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds + v_pol.result_seconds),
    v_open + make_interval(secs => v_pol.open_seconds + v_pol.spin_seconds + v_pol.result_seconds + 1),
    v_pick->>'id',
    (v_pick->>'index')::int,
    (v_pick->>'multiplier')::numeric,
    v_pick->>'tier',
    v_pick->>'seed'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.fruit_wheel_create_round() from public, anon, authenticated;

create or replace function public.fruit_wheel_phase(
  p_locks timestamptz,
  p_result timestamptz,
  p_reveal timestamptz,
  p_next timestamptz,
  p_countdown int,
  p_now timestamptz
)
returns text
language sql
immutable
as $$
  select case
    when p_now < p_locks - make_interval(secs => greatest(p_countdown, 0)) then 'OPEN'
    when p_now < p_locks then 'LOCKING'
    when p_now < p_locks + interval '0.45 seconds' then 'LOCKED'
    when p_now < p_result then 'SPINNING'
    when p_now < p_result + interval '0.35 seconds' then 'SETTLING'
    when p_now < p_reveal then 'RESULT'
    when p_now < p_next then 'NEXT_ROUND'
    else 'SETTLED'
  end;
$$;

revoke all on function public.fruit_wheel_phase(timestamptz, timestamptz, timestamptz, timestamptz, int, timestamptz)
  from public, anon, authenticated;

create or replace function public.fruit_wheel_publish_live(p_round uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.fruit_wheel_rounds%rowtype;
  v_status text;
  v_reveal text;
begin
  select * into r from public.fruit_wheel_rounds where id = p_round;
  if not found then return; end if;
  v_status := public.fruit_wheel_phase(
    r.locks_at, r.result_at, r.reveal_until, r.next_at,
    coalesce((r.limits_snapshot->>'lockCountdownSeconds')::int, 3),
    now()
  );
  v_reveal := null;
  if v_status in ('SPINNING','SETTLING','RESULT','NEXT_ROUND','SETTLED') then
    v_reveal := r.winning_fruit_id;
  end if;
  update public.fruit_wheel_rounds set status = v_status where id = r.id;
  insert into public.fruit_wheel_live (
    id, round_id, round_no, status, opens_at, locks_at, result_at, revealed_fruit_id, updated_at
  ) values (
    1, r.id, r.round_no, v_status, r.opens_at, r.locks_at, r.result_at, v_reveal, now()
  )
  on conflict (id) do update set
    round_id = excluded.round_id,
    round_no = excluded.round_no,
    status = excluded.status,
    opens_at = excluded.opens_at,
    locks_at = excluded.locks_at,
    result_at = excluded.result_at,
    revealed_fruit_id = excluded.revealed_fruit_id,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.fruit_wheel_publish_live(uuid) from public, anon, authenticated;

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

create or replace function public.fruit_wheel_advance()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.fruit_wheel_rounds%rowtype;
  v_status text;
  v_countdown int;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(84218421);

  select * into r
  from public.fruit_wheel_rounds
  where status <> 'SETTLED'
  order by created_at desc
  limit 1
  for update;

  if not found then
    if public.fruit_wheel_can_open() then
      v_id := public.fruit_wheel_create_round();
      perform public.fruit_wheel_publish_live(v_id);
      return v_id;
    end if;
    return null;
  end if;

  v_countdown := coalesce((r.limits_snapshot->>'lockCountdownSeconds')::int, 3);
  v_status := public.fruit_wheel_phase(
    r.locks_at, r.result_at, r.reveal_until, r.next_at, v_countdown, now()
  );

  if v_status in ('SETTLING','RESULT','NEXT_ROUND','SETTLED') and r.settled_at is null then
    perform public.fruit_wheel_settle_round(r.id);
    select * into r from public.fruit_wheel_rounds where id = r.id;
    v_status := public.fruit_wheel_phase(
      r.locks_at, r.result_at, r.reveal_until, r.next_at, v_countdown, now()
    );
  end if;

  if v_status = 'SETTLED' or (v_status = 'NEXT_ROUND' and now() >= r.next_at) then
    update public.fruit_wheel_rounds set status = 'SETTLED' where id = r.id;
    perform public.fruit_wheel_publish_live(r.id);
    if public.fruit_wheel_can_open() then
      v_id := public.fruit_wheel_create_round();
      perform public.fruit_wheel_publish_live(v_id);
      return v_id;
    end if;
    return r.id;
  end if;

  update public.fruit_wheel_rounds set status = v_status where id = r.id;
  perform public.fruit_wheel_publish_live(r.id);
  return r.id;
end;
$$;

revoke all on function public.fruit_wheel_advance() from public, anon, authenticated;

create or replace function public.fruit_wheel_balance_value(p_user uuid, p_mode text)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bal bigint;
begin
  if p_mode = 'PLATFORM_APPROVED_COIN' then
    select coins into v_bal from public.wallets where user_id = p_user;
    return coalesce(v_bal, 0);
  end if;
  if p_mode = 'CLOSED_LOOP_GAME_BALANCE' then
    select closed_loop_coins into v_bal from public.fruit_wheel_balances where user_id = p_user;
    return coalesce(v_bal, 100000);
  end if;
  select test_coins into v_bal from public.fruit_wheel_balances where user_id = p_user;
  return coalesce(v_bal, 100000);
end;
$$;

revoke all on function public.fruit_wheel_balance_value(uuid, text) from public, anon, authenticated;

create or replace function public.fruit_wheel_state(p_round uuid, p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.fruit_wheel_rounds%rowtype;
  v_status text;
  v_reveal boolean;
  v_countdown int;
  v_players int;
  v_avatars jsonb;
  v_recent jsonb;
  v_mine jsonb;
  v_settle jsonb;
begin
  if p_round is null then
    return jsonb_build_object(
      'ok', true,
      'gameEnabled', public.fruit_wheel_can_open(),
      'round', null
    );
  end if;

  select * into r from public.fruit_wheel_rounds where id = p_round;
  v_countdown := coalesce((r.limits_snapshot->>'lockCountdownSeconds')::int, 3);
  v_status := public.fruit_wheel_phase(
    r.locks_at, r.result_at, r.reveal_until, r.next_at, v_countdown, now()
  );
  v_reveal := v_status in ('SPINNING','SETTLING','RESULT','NEXT_ROUND','SETTLED');

  select count(*) into v_players
  from public.fruit_wheel_presence
  where last_seen > now() - interval '20 seconds';

  select coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'avatarUrl', q.avatar_url)), '[]'::jsonb)
  into v_avatars
  from (
    select p.id, p.avatar_url
    from public.fruit_wheel_presence pr
    join public.profiles p on p.id = pr.user_id
    where pr.last_seen > now() - interval '20 seconds'
    order by pr.last_seen desc
    limit 4
  ) q;

  select coalesce(jsonb_agg(jsonb_build_object(
    'roundNo', h.round_no,
    'fruitId', h.winning_fruit_id
  ) order by h.settled_at desc nulls last), '[]'::jsonb)
  into v_recent
  from (
    select round_no, winning_fruit_id, settled_at
    from public.fruit_wheel_rounds
    where settled_at is not null
    order by settled_at desc
    limit 8
  ) h;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fruitId', s.fruit_id,
    'amount', s.amount,
    'status', s.status
  )), '[]'::jsonb)
  into v_mine
  from public.fruit_wheel_selections s
  where s.round_id = r.id and s.user_id = p_user;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fruitId', st.fruit_id,
    'stake', st.stake,
    'matched', st.matched,
    'multiplier', st.multiplier,
    'payout', st.payout
  )), '[]'::jsonb)
  into v_settle
  from public.fruit_wheel_settlements st
  where st.round_id = r.id and st.user_id = p_user;

  return jsonb_build_object(
    'ok', true,
    'serverNow', now(),
    'gameEnabled', public.fruit_wheel_can_open() or v_status <> 'SETTLED',
    'devTools', public.fruit_wheel_admin_mi()
      and (select economy_mode from public.fruit_wheel_policy where id = 1) = 'TEST_BALANCE',
    'displayName', coalesce(r.limits_snapshot->>'displayName', 'Fruit Wheel'),
    'economyMode', r.economy_mode,
    'balance', public.fruit_wheel_balance_value(p_user, r.economy_mode),
    'activePlayers', v_players,
    'avatars', v_avatars,
    'recent', v_recent,
    'fruits', public.fruit_wheel_public_fruits(r.config_snapshot->'fruits'),
    'limits', jsonb_build_object(
      'minimumSelection', (r.limits_snapshot->>'minimumSelection')::bigint,
      'maximumSelectionPerFruit', (r.limits_snapshot->>'maximumSelectionPerFruit')::bigint,
      'maximumTotalPerRound', (r.limits_snapshot->>'maximumTotalPerRound')::bigint,
      'quickAmounts', coalesce(r.limits_snapshot->'quickAmounts', '[]'::jsonb)
    ),
    'mySelections', v_mine,
    'mySettlement', case when v_reveal then v_settle else '[]'::jsonb end,
    'round', jsonb_build_object(
      'id', r.id,
      'roundNo', r.round_no,
      'status', v_status,
      'configVersion', r.config_version,
      'opensAt', r.opens_at,
      'locksAt', r.locks_at,
      'resultAt', r.result_at,
      'revealUntil', r.reveal_until,
      'nextAt', r.next_at,
      'winningFruitId', case when v_reveal then r.winning_fruit_id else null end,
      'segmentIndex', case when v_reveal then r.segment_index else null end,
      'multiplier', case when v_reveal then r.multiplier else null end,
      'presentationTier', case when v_reveal then r.presentation_tier else null end
    )
  );
end;
$$;

revoke all on function public.fruit_wheel_state(uuid, uuid) from public, anon, authenticated;

create or replace function public.fruit_wheel_sync()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_round uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  v_round := public.fruit_wheel_advance();
  return public.fruit_wheel_state(v_round, v_uid);
end;
$$;

revoke all on function public.fruit_wheel_sync() from public, anon;
grant execute on function public.fruit_wheel_sync() to authenticated;

create or replace function public.fruit_wheel_heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  insert into public.fruit_wheel_presence (user_id, last_seen)
  values (v_uid, now())
  on conflict (user_id) do update set last_seen = now();
end;
$$;

revoke all on function public.fruit_wheel_heartbeat() from public, anon;
grant execute on function public.fruit_wheel_heartbeat() to authenticated;

create or replace function public.fruit_wheel_confirm(p_round_id uuid, p_key text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.fruit_wheel_rounds%rowtype;
  v_cmd public.fruit_wheel_commands%rowtype;
  v_item jsonb;
  v_id text;
  v_amt bigint;
  v_seen text[] := '{}';
  v_new_total bigint := 0;
  v_old_total bigint := 0;
  v_delta bigint;
  v_after bigint;
  v_min bigint;
  v_max_f bigint;
  v_max_t bigint;
  v_enabled boolean;
  v_cmd_id uuid;
  v_gate text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  if p_key is null or length(trim(p_key)) < 8 or length(p_key) > 80 then
    return jsonb_build_object('ok', false, 'code', 'idempotency');
  end if;
  if public.kill_switch_aktif_mi('kill_games')
     or not public.ozellik_bayragi_aktif_mi('games_enabled')
     or not public.ozellik_bayragi_aktif_mi('fruit_wheel_enabled') then
    return jsonb_build_object('ok', false, 'code', 'feature_disabled');
  end if;

  perform pg_advisory_xact_lock(84218421);
  perform public.fruit_wheel_advance();

  select * into r from public.fruit_wheel_rounds where id = p_round_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'round_closed');
  end if;

  perform public.fruit_wheel_lock_balance(v_uid, r.economy_mode);

  select * into v_cmd
  from public.fruit_wheel_commands
  where user_id = v_uid and idempotency_key = trim(p_key);
  if found then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'balance', v_cmd.balance_after,
      'roundId', v_cmd.round_id
    );
  end if;

  if now() >= r.locks_at or r.settled_at is not null then
    return jsonb_build_object('ok', false, 'code', 'round_closed');
  end if;

  v_gate := public.fruit_wheel_user_eligible(v_uid, r.economy_mode);
  if v_gate is not null then
    return jsonb_build_object('ok', false, 'code', v_gate);
  end if;

  v_min := coalesce((r.limits_snapshot->>'minimumSelection')::bigint, 10);
  v_max_f := coalesce((r.limits_snapshot->>'maximumSelectionPerFruit')::bigint, 100000);
  v_max_t := coalesce((r.limits_snapshot->>'maximumTotalPerRound')::bigint, 500000);

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_id := v_item->>'fruitId';
    if v_id is null or v_id = any (v_seen) then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end if;
    begin
      v_amt := trunc((v_item->>'amount')::numeric)::bigint;
    exception when others then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end;
    if v_amt is null or v_amt < 0 then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end if;
    if v_amt = 0 then
      continue;
    end if;
    select coalesce((f->>'enabled')::boolean, true) into v_enabled
    from jsonb_array_elements(r.config_snapshot->'fruits') f
    where f->>'id' = v_id
    limit 1;
    if v_enabled is null or not v_enabled then
      return jsonb_build_object('ok', false, 'code', 'invalid');
    end if;
    if v_amt < v_min or v_amt > v_max_f then
      return jsonb_build_object('ok', false, 'code', 'limit');
    end if;
    v_seen := v_seen || v_id;
    v_new_total := v_new_total + v_amt;
  end loop;

  if v_new_total > v_max_t then
    return jsonb_build_object('ok', false, 'code', 'limit');
  end if;

  select coalesce(sum(amount), 0) into v_old_total
  from public.fruit_wheel_selections
  where round_id = r.id and user_id = v_uid;

  v_delta := v_old_total - v_new_total;

  begin
    v_after := public.fruit_wheel_apply_delta(
      v_uid,
      r.economy_mode,
      v_delta,
      case when v_delta >= 0 then 'fruit_wheel_selection_refund' else 'fruit_wheel_selection' end,
      r.id,
      null,
      'fw_sel_' || v_uid::text || '_' || trim(p_key)
    );
  exception when others then
    if sqlerrm ilike '%Insufficient%' then
      return jsonb_build_object('ok', false, 'code', 'insufficient_balance');
    end if;
    raise;
  end;

  delete from public.fruit_wheel_selections
  where round_id = r.id and user_id = v_uid;

  insert into public.fruit_wheel_selections (round_id, user_id, fruit_id, amount, status)
  select r.id, v_uid, v_id2, v_amt2, 'confirmed'
  from (
    select item->>'fruitId' as v_id2, trunc((item->>'amount')::numeric)::bigint as v_amt2
    from jsonb_array_elements(p_items) item
  ) q
  where v_amt2 > 0;

  insert into public.fruit_wheel_commands (
    user_id, round_id, idempotency_key, selections, delta, balance_after
  ) values (
    v_uid, r.id, trim(p_key), p_items, v_delta, v_after
  )
  returning id into v_cmd_id;

  update public.fruit_wheel_ledger
  set ref_id = v_cmd_id
  where idempotency_key = 'fw_sel_' || v_uid::text || '_' || trim(p_key);

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'balance', v_after,
    'roundId', r.id,
    'total', v_new_total
  );
end;
$$;

revoke all on function public.fruit_wheel_confirm(uuid, text, jsonb) from public, anon;
grant execute on function public.fruit_wheel_confirm(uuid, text, jsonb) to authenticated;

create or replace function public.fruit_wheel_history(p_limit int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := least(greatest(coalesce(p_limit, 30), 1), 50);
  v_rows jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;

  select coalesce(jsonb_agg(to_jsonb(q) order by q.settled_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      r.id,
      r.settled_at,
      r.round_no as "roundNo",
      r.winning_fruit_id as "winningFruitId",
      r.multiplier,
      r.presentation_tier as "presentationTier",
      r.settled_at as "settledAt",
      coalesce(sum(s.amount), 0) as "stakeTotal",
      coalesce(sum(st.payout), 0) as "payoutTotal",
      coalesce(jsonb_agg(jsonb_build_object(
        'fruitId', s.fruit_id,
        'amount', s.amount,
        'matched', coalesce(st.matched, false),
        'payout', coalesce(st.payout, 0)
      )) filter (where s.id is not null), '[]'::jsonb) as selections
    from public.fruit_wheel_rounds r
    join public.fruit_wheel_selections s
      on s.round_id = r.id and s.user_id = v_uid
    left join public.fruit_wheel_settlements st on st.selection_id = s.id
    where r.settled_at is not null
    group by r.id
    order by r.settled_at desc
    limit v_lim
  ) q;

  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

revoke all on function public.fruit_wheel_history(int) from public, anon;
grant execute on function public.fruit_wheel_history(int) to authenticated;

-- ---------------------------------------------------------------------------
create or replace function public.fruit_wheel_admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pol public.fruit_wheel_policy%rowtype;
  v_cfg public.fruit_wheel_config_versions%rowtype;
  r public.fruit_wheel_rounds%rowtype;
  v_players int;
  v_sels int;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select * into v_pol from public.fruit_wheel_policy where id = 1;
  select * into v_cfg from public.fruit_wheel_config_versions
  where is_current order by version desc limit 1;
  select * into r from public.fruit_wheel_rounds
  where status <> 'SETTLED' order by created_at desc limit 1;
  select count(*) into v_players from public.fruit_wheel_presence
  where last_seen > now() - interval '20 seconds';
  select count(*) into v_sels from public.fruit_wheel_selections
  where round_id is not distinct from r.id;

  return jsonb_build_object(
    'ok', true,
    'gameEnabled', v_pol.game_enabled,
    'canOpen', public.fruit_wheel_can_open(),
    'flag', public.ozellik_bayragi_aktif_mi('fruit_wheel_enabled'),
    'policy', (to_jsonb(v_pol) - 'force_next_fruit_id') || jsonb_build_object(
      'forceArmed', v_pol.force_next_fruit_id is not null
    ),
    'fruits', coalesce(v_cfg.fruits, '[]'::jsonb),
    'configVersion', v_cfg.version,
    'currentRound', case when r.id is null then null else jsonb_build_object(
      'id', r.id,
      'roundNo', r.round_no,
      'status', r.status,
      'configVersion', r.config_version,
      'opensAt', r.opens_at,
      'locksAt', r.locks_at,
      'winningFruitId', case when r.settled_at is not null or r.status in ('SPINNING','SETTLING','RESULT','NEXT_ROUND','SETTLED')
        then r.winning_fruit_id else null end
    ) end,
    'activePlayers', v_players,
    'selectionRows', v_sels
  );
end;
$$;

revoke all on function public.fruit_wheel_admin_dashboard() from public, anon;
grant execute on function public.fruit_wheel_admin_dashboard() to authenticated;

create or replace function public.fruit_wheel_admin_math()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg jsonb;
  v_sum numeric := 0;
  v_rows jsonb;
  v_blend numeric := 0;
  v_n int := 0;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select fruits into v_cfg from public.fruit_wheel_config_versions
  where is_current order by version desc limit 1;

  select coalesce(sum((f->>'weight')::numeric), 0) into v_sum
  from jsonb_array_elements(v_cfg) f
  where coalesce((f->>'enabled')::boolean, true);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f->>'id',
    'multiplier', (f->>'multiplier')::numeric,
    'weight', (f->>'weight')::numeric,
    'enabled', coalesce((f->>'enabled')::boolean, true),
    'probability', case when v_sum > 0 and coalesce((f->>'enabled')::boolean, true)
      then round((f->>'weight')::numeric / v_sum, 6) else 0 end,
    'expectedReturnPerCoin', case when v_sum > 0 and coalesce((f->>'enabled')::boolean, true)
      then round(((f->>'weight')::numeric / v_sum) * (f->>'multiplier')::numeric, 6) else 0 end
  )), '[]'::jsonb)
  into v_rows
  from jsonb_array_elements(v_cfg) f;

  select coalesce(avg(
    case when v_sum > 0 then ((f->>'weight')::numeric / v_sum) * (f->>'multiplier')::numeric else 0 end
  ), 0), count(*)
  into v_blend, v_n
  from jsonb_array_elements(v_cfg) f
  where coalesce((f->>'enabled')::boolean, true);

  return jsonb_build_object(
    'ok', true,
    'fruits', v_rows,
    'equalSpreadExpectedReturn', round(coalesce(v_blend, 0), 6),
    'note', 'Per-coin expected return if the stake is on that fruit only. Not a payout guarantee.'
  );
end;
$$;

revoke all on function public.fruit_wheel_admin_math() from public, anon;
grant execute on function public.fruit_wheel_admin_math() to authenticated;

create or replace function public.fruit_wheel_admin_set_enabled(p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old boolean;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select game_enabled into v_old from public.fruit_wheel_policy where id = 1;
  update public.fruit_wheel_policy
  set game_enabled = coalesce(p_enabled, false), updated_at = now(), updated_by = auth.uid()
  where id = 1;
  update public.game_control_configs
  set is_enabled = coalesce(p_enabled, false), updated_at = now()
  where game_code = 'fruit_wheel';
  update public.feature_flags
  set enabled = coalesce(p_enabled, false)
  where key = 'fruit_wheel_enabled';
  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
  values (auth.uid(), 'game_enabled', jsonb_build_object('enabled', v_old), jsonb_build_object('enabled', p_enabled));
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.fruit_wheel_admin_set_enabled(boolean) from public, anon;
grant execute on function public.fruit_wheel_admin_set_enabled(boolean) to authenticated;

create or replace function public.fruit_wheel_admin_save_policy(p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_mode text;
  v_approved boolean;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select to_jsonb(p.*) into v_old from public.fruit_wheel_policy p where id = 1;
  v_mode := coalesce(p_patch->>'economyMode', v_old->>'economy_mode');
  if v_mode not in ('TEST_BALANCE','CLOSED_LOOP_GAME_BALANCE','PLATFORM_APPROVED_COIN') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  v_approved := coalesce((p_patch->>'platformApproved')::boolean, (v_old->>'platform_approved')::boolean);
  if v_mode = 'PLATFORM_APPROVED_COIN' and not v_approved then
    return jsonb_build_object('ok', false, 'code', 'platform_closed');
  end if;

  update public.fruit_wheel_policy set
    economy_mode = v_mode,
    platform_approved = v_approved,
    allowed_regions = case
      when p_patch ? 'allowedRegions' and jsonb_typeof(p_patch->'allowedRegions') = 'array' then (
        select coalesce(array_agg(value), '{}')
        from jsonb_array_elements_text(p_patch->'allowedRegions')
      )
      else allowed_regions
    end,
    minimum_age_policy = least(120, greatest(18, coalesce((p_patch->>'minimumAgePolicy')::int, minimum_age_policy))),
    display_name = left(coalesce(nullif(trim(p_patch->>'displayName'), ''), display_name), 40),
    open_seconds = least(120, greatest(8, coalesce((p_patch->>'openSeconds')::int, open_seconds))),
    lock_countdown_seconds = least(10, greatest(1, coalesce((p_patch->>'lockCountdownSeconds')::int, lock_countdown_seconds))),
    spin_seconds = least(12, greatest(4, coalesce((p_patch->>'spinSeconds')::int, spin_seconds))),
    result_seconds = least(20, greatest(3, coalesce((p_patch->>'resultSeconds')::int, result_seconds))),
    minimum_selection = greatest(1, coalesce((p_patch->>'minimumSelection')::bigint, minimum_selection)),
    maximum_selection_per_fruit = greatest(1, coalesce((p_patch->>'maximumSelectionPerFruit')::bigint, maximum_selection_per_fruit)),
    maximum_total_per_round = greatest(1, coalesce((p_patch->>'maximumTotalPerRound')::bigint, maximum_total_per_round)),
    quick_amounts = case
      when p_patch ? 'quickAmounts' and jsonb_typeof(p_patch->'quickAmounts') = 'array' then p_patch->'quickAmounts'
      else quick_amounts
    end,
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;

  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
  values (auth.uid(), 'policy_save', v_old, (select to_jsonb(p.*) from public.fruit_wheel_policy p where id = 1));

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.fruit_wheel_admin_save_policy(jsonb) from public, anon;
grant execute on function public.fruit_wheel_admin_save_policy(jsonb) to authenticated;

create or replace function public.fruit_wheel_admin_publish_fruits(p_fruits jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_err text;
  v_ver int;
  v_old jsonb;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  v_err := public.fruit_wheel_validate_fruits(p_fruits);
  if v_err is not null then
    return jsonb_build_object('ok', false, 'code', 'invalid', 'message', v_err);
  end if;
  select fruits into v_old from public.fruit_wheel_config_versions where is_current limit 1;
  select coalesce(max(version), 0) + 1 into v_ver from public.fruit_wheel_config_versions;
  update public.fruit_wheel_config_versions set is_current = false where is_current;
  insert into public.fruit_wheel_config_versions (version, fruits, created_by, is_current)
  values (v_ver, p_fruits, auth.uid(), true);
  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
  values (auth.uid(), 'config_publish', jsonb_build_object('fruits', v_old), jsonb_build_object('version', v_ver, 'fruits', p_fruits));
  return jsonb_build_object('ok', true, 'version', v_ver);
end;
$$;

revoke all on function public.fruit_wheel_admin_publish_fruits(jsonb) from public, anon;
grant execute on function public.fruit_wheel_admin_publish_fruits(jsonb) to authenticated;

create or replace function public.fruit_wheel_admin_force_next(p_fruit_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select economy_mode into v_mode from public.fruit_wheel_policy where id = 1;
  if v_mode <> 'TEST_BALANCE' then
    return jsonb_build_object('ok', false, 'code', 'test_only');
  end if;
  if p_fruit_id is not null and p_fruit_id not in (
    'cherry','lemon','orange','watermelon','grape','strawberry','pineapple','kiwi'
  ) then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  update public.fruit_wheel_policy
  set force_next_fruit_id = p_fruit_id, updated_at = now(), updated_by = auth.uid()
  where id = 1;
  insert into public.fruit_wheel_audit (actor_id, action, old_value, new_value)
  values (auth.uid(), 'force_next', null, jsonb_build_object('fruitId', p_fruit_id));
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.fruit_wheel_admin_force_next(text) from public, anon;
grant execute on function public.fruit_wheel_admin_force_next(text) to authenticated;

create or replace function public.fruit_wheel_admin_audit(p_limit int default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lim int := least(greatest(coalesce(p_limit, 40), 1), 100);
  v_rows jsonb;
begin
  if not public.fruit_wheel_admin_mi() then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'actorId', a.actor_id,
    'action', a.action,
    'oldValue', a.old_value,
    'newValue', a.new_value,
    'createdAt', a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select * from public.fruit_wheel_audit
    order by created_at desc
    limit v_lim
  ) a;
  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

revoke all on function public.fruit_wheel_admin_audit(int) from public, anon;
grant execute on function public.fruit_wheel_admin_audit(int) to authenticated;

-- Başlangıç config. Mevcut tur snapshot'ı sonradan değişmez.
insert into public.fruit_wheel_config_versions (version, fruits, is_current)
select 1, $fw$
[
  {"id":"cherry","multiplier":2,"weight":320,"tier":"NORMAL","enabled":true,"accent":"#C23B4A"},
  {"id":"lemon","multiplier":3,"weight":220,"tier":"NORMAL","enabled":true,"accent":"#E6C44A"},
  {"id":"orange","multiplier":4,"weight":160,"tier":"GOOD","enabled":true,"accent":"#E07A2F"},
  {"id":"watermelon","multiplier":5,"weight":120,"tier":"GOOD","enabled":true,"accent":"#3E9A62"},
  {"id":"grape","multiplier":8,"weight":70,"tier":"BIG","enabled":true,"accent":"#7A45C4"},
  {"id":"strawberry","multiplier":10,"weight":45,"tier":"BIG","enabled":true,"accent":"#D4537E"},
  {"id":"pineapple","multiplier":15,"weight":22,"tier":"RARE","enabled":true,"accent":"#D4A017"},
  {"id":"kiwi","multiplier":25,"weight":8,"tier":"RARE","enabled":true,"accent":"#7CB342"}
]
$fw$::jsonb, true
where not exists (select 1 from public.fruit_wheel_config_versions);

do $$
begin
  alter publication supabase_realtime add table public.fruit_wheel_live;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
