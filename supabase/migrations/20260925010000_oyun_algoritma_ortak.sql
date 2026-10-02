-- ============================================================================
-- Ortak oyun algoritma altyapısı (Zeus ilk tüketici; ileride NOX/Kaskad)
--   1) game_math_versions  — oyun kodu + math profili (jsonb config)
--   2) game_rtp_schedule   — zaman aralığına profil atama (tüm oyunculara aynı)
--   3) game_runtime_settings — pause / bakım / bet override / günlük limit
--   4) RPC: gecerli_math, aktif_config, admin CRUD
--   5) Zeus: 3 Olympus profili + max bet 200
-- NOT: Kullanıcı bazlı gizli sonuç manipülasyonu YOKTUR.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Math versiyonları
-- ---------------------------------------------------------------------------
create table if not exists public.game_math_versions (
  id uuid primary key default gen_random_uuid(),
  game_code text not null,
  math_version text not null,
  display_name text not null default '',
  description text not null default '',
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  simulated_rtp numeric,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (game_code, math_version)
);

create index if not exists game_math_versions_aktif_idx
  on public.game_math_versions (game_code, is_active, created_at desc);

alter table public.game_math_versions enable row level security;

-- ---------------------------------------------------------------------------
-- 2) RTP takvimi
-- ---------------------------------------------------------------------------
create table if not exists public.game_rtp_schedule (
  id uuid primary key default gen_random_uuid(),
  game_code text not null,
  math_version text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint game_rtp_schedule_window check (ends_at > starts_at),
  constraint game_rtp_schedule_math_fk
    foreign key (game_code, math_version)
    references public.game_math_versions (game_code, math_version)
);

create index if not exists game_rtp_schedule_aktif_idx
  on public.game_rtp_schedule (game_code, status, starts_at, ends_at);

alter table public.game_rtp_schedule enable row level security;

-- ---------------------------------------------------------------------------
-- 3) Runtime ayarları (oyun başına tek satır)
-- ---------------------------------------------------------------------------
create table if not exists public.game_runtime_settings (
  game_code text primary key,
  game_paused boolean not null default false,
  maintenance_mode boolean not null default false,
  maintenance_message text,
  min_bet bigint,
  max_bet bigint,
  bet_presets jsonb,
  autoplay_enabled boolean,
  turbo_enabled boolean,
  max_daily_wager bigint,
  max_daily_loss bigint,
  max_rounds_per_day integer,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

alter table public.game_runtime_settings enable row level security;

-- ---------------------------------------------------------------------------
-- 4) Zeus math profilleri (balanced / generous / tight)
-- ---------------------------------------------------------------------------
insert into public.game_math_versions (
  game_code, math_version, display_name, description, config, is_active, simulated_rtp
) values
(
  'zeus',
  'olympus-balanced-v1',
  'Dengeli',
  'Varsayılan Olympus matematik. Ortalama RTP ~%%94–96. Değiştirince tüm yeni spinler bu ağırlıklarla üretilir.',
  '{
    "mathVersion":"olympus-balanced-v1",
    "paytableVersion":"zeus-pay-v1",
    "configVersion":"zeus-cfg-v1",
    "columns":6,"rows":5,"minMatchCount":8,
    "paytable":{
      "blueDiamond":{"8":0.25,"10":0.8,"12":2.0},
      "greenEmerald":{"8":0.25,"10":0.8,"12":2.0},
      "purpleGem":{"8":0.4,"10":1.0,"12":2.5},
      "redRuby":{"8":0.4,"10":1.0,"12":2.5},
      "goldCrown":{"8":0.8,"10":2.0,"12":5.0},
      "goldRing":{"8":1.2,"10":3.0,"12":8.0},
      "goldGoblet":{"8":1.6,"10":4.0,"12":10.0},
      "lyre":{"8":2.4,"10":6.0,"12":15.0},
      "pegasus":{"8":4.0,"10":10.0,"12":25.0}
    },
    "symbolWeights":{
      "blueDiamond":18,"greenEmerald":18,"purpleGem":15,"redRuby":15,
      "goldCrown":9,"goldRing":7.5,"goldGoblet":6.5,"lyre":5,"pegasus":3.5
    },
    "multiplierWeights":[
      {"value":2,"weight":40},{"value":3,"weight":24},{"value":4,"weight":12},
      {"value":5,"weight":10},{"value":10,"weight":6},{"value":15,"weight":3.2},
      {"value":25,"weight":1.8},{"value":50,"weight":0.7},{"value":100,"weight":0.22},
      {"value":250,"weight":0.06},{"value":500,"weight":0.02}
    ],
    "multiplierSpawnChance":0.028,
    "scatterSpawnChance":0.0118,
    "freeSpinTriggerCount":4,"freeSpinReward":15,
    "retriggerMinCount":4,"retriggerReward":15,
    "bonus":{"persistentMultiplier":true,"multiplierSpawnChance":0.05},
    "maxCascades":32,"maxEvents":256,"maxPayoutMult":5000,
    "winTiers":{"nice":5,"big":15,"mega":40,"sensational":80},
    "betPresets":[20,50,100,150,200],"minBet":20,"maxBet":200,
    "autoplayEnabled":true,"turboEnabled":true
  }'::jsonb,
  true,
  0.95
),
(
  'zeus',
  'olympus-generous-v1',
  'Kazandırıcı',
  'Daha sık yüksek sembol, scatter ve çarpan. Ortalama kazanç artar; takvim penceresinde tüm oyunculara uygulanır.',
  '{
    "mathVersion":"olympus-generous-v1",
    "paytableVersion":"zeus-pay-generous-v1",
    "configVersion":"zeus-cfg-generous-v1",
    "columns":6,"rows":5,"minMatchCount":8,
    "paytable":{
      "blueDiamond":{"8":0.25,"10":0.8,"12":2.0},
      "greenEmerald":{"8":0.25,"10":0.8,"12":2.0},
      "purpleGem":{"8":0.4,"10":1.0,"12":2.5},
      "redRuby":{"8":0.4,"10":1.0,"12":2.5},
      "goldCrown":{"8":0.8,"10":2.0,"12":5.0},
      "goldRing":{"8":1.2,"10":3.0,"12":8.0},
      "goldGoblet":{"8":1.6,"10":4.0,"12":10.0},
      "lyre":{"8":2.4,"10":6.0,"12":15.0},
      "pegasus":{"8":4.0,"10":10.0,"12":25.0}
    },
    "symbolWeights":{
      "blueDiamond":14,"greenEmerald":14,"purpleGem":13,"redRuby":13,
      "goldCrown":11,"goldRing":9.5,"goldGoblet":8.5,"lyre":7,"pegasus":5.5
    },
    "multiplierWeights":[
      {"value":2,"weight":40},{"value":3,"weight":24},{"value":4,"weight":12},
      {"value":5,"weight":10},{"value":10,"weight":6},{"value":15,"weight":3.2},
      {"value":25,"weight":1.8},{"value":50,"weight":0.7},{"value":100,"weight":0.22},
      {"value":250,"weight":0.06},{"value":500,"weight":0.02}
    ],
    "multiplierSpawnChance":0.038,
    "scatterSpawnChance":0.0155,
    "freeSpinTriggerCount":4,"freeSpinReward":15,
    "retriggerMinCount":4,"retriggerReward":15,
    "bonus":{"persistentMultiplier":true,"multiplierSpawnChance":0.065},
    "maxCascades":32,"maxEvents":256,"maxPayoutMult":5000,
    "winTiers":{"nice":5,"big":15,"mega":40,"sensational":80},
    "betPresets":[20,50,100,150,200],"minBet":20,"maxBet":200,
    "autoplayEnabled":true,"turboEnabled":true
  }'::jsonb,
  false,
  0.98
),
(
  'zeus',
  'olympus-tight-v1',
  'Kaybettirici',
  'Düşük sembol ağırlığı ve seyrek bonus. Ortalama kazanç düşer; takvimde tüm oyunculara uygulanır.',
  '{
    "mathVersion":"olympus-tight-v1",
    "paytableVersion":"zeus-pay-tight-v1",
    "configVersion":"zeus-cfg-tight-v1",
    "columns":6,"rows":5,"minMatchCount":8,
    "paytable":{
      "blueDiamond":{"8":0.25,"10":0.8,"12":2.0},
      "greenEmerald":{"8":0.25,"10":0.8,"12":2.0},
      "purpleGem":{"8":0.4,"10":1.0,"12":2.5},
      "redRuby":{"8":0.4,"10":1.0,"12":2.5},
      "goldCrown":{"8":0.8,"10":2.0,"12":5.0},
      "goldRing":{"8":1.2,"10":3.0,"12":8.0},
      "goldGoblet":{"8":1.6,"10":4.0,"12":10.0},
      "lyre":{"8":2.4,"10":6.0,"12":15.0},
      "pegasus":{"8":4.0,"10":10.0,"12":25.0}
    },
    "symbolWeights":{
      "blueDiamond":22,"greenEmerald":22,"purpleGem":16,"redRuby":16,
      "goldCrown":7,"goldRing":5.5,"goldGoblet":4.5,"lyre":3.5,"pegasus":2.2
    },
    "multiplierWeights":[
      {"value":2,"weight":48},{"value":3,"weight":26},{"value":4,"weight":12},
      {"value":5,"weight":8},{"value":10,"weight":3.5},{"value":15,"weight":1.5},
      {"value":25,"weight":0.7},{"value":50,"weight":0.25},{"value":100,"weight":0.04},
      {"value":250,"weight":0.01},{"value":500,"weight":0.005}
    ],
    "multiplierSpawnChance":0.018,
    "scatterSpawnChance":0.0085,
    "freeSpinTriggerCount":4,"freeSpinReward":15,
    "retriggerMinCount":4,"retriggerReward":15,
    "bonus":{"persistentMultiplier":true,"multiplierSpawnChance":0.032},
    "maxCascades":32,"maxEvents":256,"maxPayoutMult":5000,
    "winTiers":{"nice":5,"big":15,"mega":40,"sensational":80},
    "betPresets":[20,50,100,150,200],"minBet":20,"maxBet":200,
    "autoplayEnabled":true,"turboEnabled":true
  }'::jsonb,
  false,
  0.89
)
on conflict (game_code, math_version) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  config = excluded.config,
  simulated_rtp = excluded.simulated_rtp;

insert into public.game_runtime_settings (game_code, min_bet, max_bet, bet_presets)
values (
  'zeus',
  20,
  200,
  '[20,50,100,150,200]'::jsonb
)
on conflict (game_code) do update set
  max_bet = least(coalesce(public.game_runtime_settings.max_bet, 200), 200),
  bet_presets = coalesce(public.game_runtime_settings.bet_presets, excluded.bet_presets),
  updated_at = now();

-- Katalog max entry 200
update public.game_control_configs
set max_entry = 200,
    min_entry = least(coalesce(min_entry, 20), 200),
    updated_at = now()
where game_code = 'zeus';

-- ---------------------------------------------------------------------------
-- 5) Geçerli math (takvim > aktif)
-- ---------------------------------------------------------------------------
create or replace function public.game_gecerli_math(p_game_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version text;
  v_config jsonb;
  v_source text;
  v_name text;
begin
  select s.math_version, m.config, m.display_name
  into v_version, v_config, v_name
  from public.game_rtp_schedule s
  join public.game_math_versions m
    on m.game_code = s.game_code and m.math_version = s.math_version
  where s.game_code = p_game_code
    and s.status = 'active'
    and now() >= s.starts_at
    and now() < s.ends_at
  order by s.created_at desc
  limit 1;

  if v_version is not null then
    v_source := 'schedule';
  else
    select math_version, config, display_name
    into v_version, v_config, v_name
    from public.game_math_versions
    where game_code = p_game_code and is_active
    order by created_at desc
    limit 1;
    v_source := 'active';
  end if;

  return jsonb_build_object(
    'gameCode', p_game_code,
    'mathVersion', v_version,
    'displayName', coalesce(v_name, ''),
    'config', coalesce(v_config, '{}'::jsonb),
    'source', v_source
  );
end;
$$;

grant execute on function public.game_gecerli_math(text) to authenticated;
grant execute on function public.game_gecerli_math(text) to service_role;

-- ---------------------------------------------------------------------------
-- 6) aktif_config = math + runtime overrides + durum
-- ---------------------------------------------------------------------------
create or replace function public.game_aktif_config(p_game_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v jsonb;
  v_cfg jsonb;
  s public.game_runtime_settings%rowtype;
begin
  v := public.game_gecerli_math(p_game_code);
  v_cfg := v->'config';

  select * into s from public.game_runtime_settings where game_code = p_game_code;
  if found then
    if s.min_bet is not null then
      v_cfg := v_cfg || jsonb_build_object('minBet', s.min_bet);
    end if;
    if s.max_bet is not null then
      -- Zeus sert tavan 200
      v_cfg := v_cfg || jsonb_build_object(
        'maxBet',
        case when p_game_code = 'zeus' then least(s.max_bet, 200) else s.max_bet end
      );
    end if;
    if s.bet_presets is not null then
      v_cfg := v_cfg || jsonb_build_object('betPresets', s.bet_presets);
    end if;
    if s.autoplay_enabled is not null then
      v_cfg := v_cfg || jsonb_build_object('autoplayEnabled', s.autoplay_enabled);
    end if;
    if s.turbo_enabled is not null then
      v_cfg := v_cfg || jsonb_build_object('turboEnabled', s.turbo_enabled);
    end if;
  end if;

  if p_game_code = 'zeus' then
    v_cfg := v_cfg || jsonb_build_object('maxBet', least(coalesce((v_cfg->>'maxBet')::bigint, 200), 200));
  end if;

  return v_cfg || jsonb_build_object(
    'mathVersion', v->>'mathVersion',
    'mathDisplayName', v->>'displayName',
    'mathSource', v->>'source',
    'durum', jsonb_build_object(
      'gamePaused', coalesce(s.game_paused, false),
      'maintenance', coalesce(s.maintenance_mode, false),
      'maintenanceMessage', coalesce(s.maintenance_message, ''),
      'mathSource', v->>'source',
      'mathVersion', v->>'mathVersion'
    )
  );
end;
$$;

grant execute on function public.game_aktif_config(text) to authenticated;
grant execute on function public.game_aktif_config(text) to service_role;

-- ---------------------------------------------------------------------------
-- 7) Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.game_admin_math_list(p_game_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'mathVersion', m.math_version,
      'displayName', m.display_name,
      'description', m.description,
      'isActive', m.is_active,
      'simulatedRtp', m.simulated_rtp,
      'config', m.config,
      'createdAt', m.created_at
    ) order by m.created_at desc)
    from public.game_math_versions m
    where m.game_code = p_game_code
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.game_admin_math_list(text) to authenticated;

create or replace function public.game_admin_math_activate(
  p_game_code text,
  p_math_version text,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if not exists (
    select 1 from public.game_math_versions
    where game_code = p_game_code and math_version = p_math_version
  ) then
    raise exception 'Math version not found';
  end if;

  update public.game_math_versions
  set is_active = (math_version = p_math_version)
  where game_code = p_game_code;

  begin
    insert into public.game_admin_audit_logs (admin_user_id, game_code, action, new_value, reason)
    values (
      auth.uid(),
      p_game_code,
      'math_activate',
      jsonb_build_object('math_version', p_math_version),
      coalesce(p_reason, '')
    );
  exception when others then
    null;
  end;

  return public.game_admin_math_list(p_game_code);
end;
$$;

grant execute on function public.game_admin_math_activate(text, text, text) to authenticated;

create or replace function public.game_admin_settings_get(p_game_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.game_runtime_settings%rowtype;
  v jsonb;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  select * into s from public.game_runtime_settings where game_code = p_game_code;
  v := public.game_gecerli_math(p_game_code);
  return jsonb_build_object(
    'gameCode', p_game_code,
    'gamePaused', coalesce(s.game_paused, false),
    'maintenanceMode', coalesce(s.maintenance_mode, false),
    'maintenanceMessage', coalesce(s.maintenance_message, ''),
    'minBet', s.min_bet,
    'maxBet', s.max_bet,
    'betPresets', s.bet_presets,
    'autoplayEnabled', s.autoplay_enabled,
    'turboEnabled', s.turbo_enabled,
    'maxDailyWager', s.max_daily_wager,
    'maxDailyLoss', s.max_daily_loss,
    'maxRoundsPerDay', s.max_rounds_per_day,
    'activeMath', v,
    'fieldHelp', jsonb_build_object(
      'gamePaused', 'Açıkken yeni spin başlamaz. Devam eden bonus adil biter.',
      'maintenanceMode', 'Oyun tamamen kapalı (admin test hariç).',
      'minBet', 'Minimum bahis (coin). Zeus için genelde 20.',
      'maxBet', 'Maksimum bahis. Zeus için sert tavan 200 coin.',
      'betPresets', 'Oyuncunun seçebileceği bahis basamakları. 200 üstü Zeus''ta reddedilir.',
      'mathVersion', 'Aktif matematik profili. Takvim penceresi varsa takvim kazanır.',
      'schedule', 'Belirli saat aralığında Kazandırıcı/Dengeli/Kaybettirici profil uygular. Tüm oyunculara aynıdır.'
    )
  );
end;
$$;

grant execute on function public.game_admin_settings_get(text) to authenticated;

create or replace function public.game_admin_settings_update(
  p_game_code text,
  p_patch jsonb,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max bigint;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  insert into public.game_runtime_settings (game_code)
  values (p_game_code)
  on conflict (game_code) do nothing;

  v_max := nullif(p_patch->>'maxBet', '')::bigint;
  if p_game_code = 'zeus' and v_max is not null and v_max > 200 then
    v_max := 200;
  end if;

  update public.game_runtime_settings set
    game_paused = coalesce((p_patch->>'gamePaused')::boolean, game_paused),
    maintenance_mode = coalesce((p_patch->>'maintenanceMode')::boolean, maintenance_mode),
    maintenance_message = case
      when p_patch ? 'maintenanceMessage' then p_patch->>'maintenanceMessage'
      else maintenance_message
    end,
    min_bet = coalesce(nullif(p_patch->>'minBet', '')::bigint, min_bet),
    max_bet = coalesce(v_max, max_bet),
    bet_presets = coalesce(p_patch->'betPresets', bet_presets),
    autoplay_enabled = coalesce((p_patch->>'autoplayEnabled')::boolean, autoplay_enabled),
    turbo_enabled = coalesce((p_patch->>'turboEnabled')::boolean, turbo_enabled),
    max_daily_wager = coalesce(nullif(p_patch->>'maxDailyWager', '')::bigint, max_daily_wager),
    max_daily_loss = coalesce(nullif(p_patch->>'maxDailyLoss', '')::bigint, max_daily_loss),
    max_rounds_per_day = coalesce(nullif(p_patch->>'maxRoundsPerDay', '')::int, max_rounds_per_day),
    updated_by = auth.uid(),
    updated_at = now()
  where game_code = p_game_code;

  begin
    insert into public.game_admin_audit_logs (admin_user_id, game_code, action, new_value, reason)
    values (
      auth.uid(),
      p_game_code,
      'settings_update',
      p_patch,
      coalesce(p_reason, '')
    );
  exception when others then
    null;
  end;

  return public.game_admin_settings_get(p_game_code);
end;
$$;

grant execute on function public.game_admin_settings_update(text, jsonb, text) to authenticated;

create or replace function public.game_admin_schedule_list(
  p_game_code text,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.starts_at desc)
    from (
      select
        s.id,
        s.game_code as "gameCode",
        s.math_version as "mathVersion",
        m.display_name as "displayName",
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        s.reason,
        s.status,
        s.created_at as "createdAt",
        (s.status = 'active' and now() >= s.starts_at and now() < s.ends_at) as "isLive"
      from public.game_rtp_schedule s
      left join public.game_math_versions m
        on m.game_code = s.game_code and m.math_version = s.math_version
      where s.game_code = p_game_code
      order by s.starts_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) t
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.game_admin_schedule_list(text, integer) to authenticated;

create or replace function public.game_admin_schedule_create(
  p_game_code text,
  p_math_version text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if p_ends_at <= p_starts_at then raise exception 'Invalid window'; end if;
  if not exists (
    select 1 from public.game_math_versions
    where game_code = p_game_code and math_version = p_math_version
  ) then
    raise exception 'Math version not found';
  end if;

  insert into public.game_rtp_schedule (
    game_code, math_version, starts_at, ends_at, reason, created_by
  ) values (
    p_game_code, p_math_version, p_starts_at, p_ends_at, coalesce(p_reason, ''), auth.uid()
  )
  returning id into v_id;

  begin
    insert into public.game_admin_audit_logs (admin_user_id, game_code, action, new_value, reason)
    values (
      auth.uid(),
      p_game_code,
      'rtp_schedule_create',
      jsonb_build_object(
        'id', v_id,
        'math_version', p_math_version,
        'starts_at', p_starts_at,
        'ends_at', p_ends_at
      ),
      coalesce(p_reason, '')
    );
  exception when others then
    null;
  end;

  return public.game_admin_schedule_list(p_game_code, 50);
end;
$$;

grant execute on function public.game_admin_schedule_create(text, text, timestamptz, timestamptz, text) to authenticated;

create or replace function public.game_admin_schedule_cancel(
  p_id uuid,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.game_rtp_schedule%rowtype;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  select * into v_row from public.game_rtp_schedule where id = p_id for update;
  if not found then raise exception 'Schedule not found'; end if;

  update public.game_rtp_schedule set status = 'cancelled' where id = p_id;

  begin
    insert into public.game_admin_audit_logs (admin_user_id, game_code, action, new_value, reason)
    values (
      auth.uid(),
      v_row.game_code,
      'rtp_schedule_cancel',
      jsonb_build_object('id', p_id),
      coalesce(p_reason, '')
    );
  exception when others then
    null;
  end;

  return public.game_admin_schedule_list(v_row.game_code, 50);
end;
$$;

grant execute on function public.game_admin_schedule_cancel(uuid, text) to authenticated;

-- Gözlenen RTP (Zeus rounds)
create or replace function public.game_admin_observed_rtp(
  p_game_code text,
  p_hours integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wager bigint := 0;
  v_win bigint := 0;
  v_rounds integer := 0;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  if p_game_code = 'zeus' and to_regclass('public.zeus_rounds') is not null then
    select
      coalesce(sum(bet_amount), 0)::bigint,
      coalesce(sum(win_amount), 0)::bigint,
      count(*)::int
    into v_wager, v_win, v_rounds
    from public.zeus_rounds
    where created_at >= now() - make_interval(hours => greatest(1, least(coalesce(p_hours, 24), 720)))
      and coalesce((result_snapshot->>'adminTest')::boolean, false) = false
      and status in ('played', 'settled', 'pending_playback');
  end if;

  return jsonb_build_object(
    'gameCode', p_game_code,
    'hours', p_hours,
    'wager', v_wager,
    'win', v_win,
    'rounds', v_rounds,
    'observedRtp', case when v_wager > 0 then round((v_win::numeric / v_wager::numeric), 4) else null end
  );
end;
$$;

grant execute on function public.game_admin_observed_rtp(text, integer) to authenticated;
