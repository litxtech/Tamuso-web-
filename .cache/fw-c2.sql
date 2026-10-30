create policy fruit_wheel_live_select on public.fruit_wheel_live
  for select to authenticated using (true);

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