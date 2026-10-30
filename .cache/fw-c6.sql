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