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