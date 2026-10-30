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