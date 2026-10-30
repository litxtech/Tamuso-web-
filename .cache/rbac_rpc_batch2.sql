create or replace function public.admin_promote_user(
  p_user_id uuid,
  p_role_code text,
  p_status text default 'ACTIVE',
  p_phone text default null,
  p_allow_overrides text[] default null,
  p_deny_overrides text[] default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := upper(trim(coalesce(p_role_code, '')));
  v_status text := upper(trim(coalesce(p_status, 'ACTIVE')));
  v_actor uuid := auth.uid();
  v_old text[];
  v_new text[];
begin
  perform public.admin_require_permission('admin.admins.create');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null) then
    raise exception 'Kullanici bulunamadi';
  end if;
  if not exists (select 1 from public.admin_roles where role_code = v_role) then
    raise exception 'Gecersiz rol';
  end if;
  if v_status not in ('ACTIVE', 'SUSPENDED', 'DISABLED') then
    raise exception 'Gecersiz status';
  end if;

  if v_role = 'SUPER_ADMIN' and not public.admin_is_super_admin(v_actor) then
    raise exception 'SUPER_ADMIN sadece super admin olusturabilir';
  end if;

  v_old := public.admin_effective_permission_keys(p_user_id);

  perform set_config('app.allow_is_admin_change', '1', true);
  update public.profiles set is_admin = true, updated_at = now() where id = p_user_id;

  insert into public.admin_accounts (user_id, status, phone, primary_role_code, created_by, updated_at)
  values (p_user_id, v_status, nullif(trim(coalesce(p_phone, '')), ''), v_role, v_actor, now())
  on conflict (user_id) do update set
    status = excluded.status,
    phone = coalesce(excluded.phone, admin_accounts.phone),
    primary_role_code = excluded.primary_role_code,
    updated_at = now();

  delete from public.admin_staff_roles where user_id = p_user_id;
  insert into public.admin_staff_roles (user_id, role_code, granted_by)
  values (p_user_id, v_role, v_actor)
  on conflict do nothing;

  delete from public.admin_user_permission_overrides where user_id = p_user_id;

  if p_allow_overrides is not null then
    insert into public.admin_user_permission_overrides (user_id, permission_key, effect, reason, granted_by)
    select p_user_id, unnest(p_allow_overrides), 'ALLOW', p_reason, v_actor
    on conflict (user_id, permission_key) do update set
      effect = 'ALLOW', reason = excluded.reason, granted_by = excluded.granted_by, updated_at = now();
  end if;

  if p_deny_overrides is not null then
    insert into public.admin_user_permission_overrides (user_id, permission_key, effect, reason, granted_by)
    select p_user_id, unnest(p_deny_overrides), 'DENY', p_reason, v_actor
    on conflict (user_id, permission_key) do update set
      effect = 'DENY', reason = excluded.reason, granted_by = excluded.granted_by, updated_at = now();
  end if;

  v_new := public.admin_effective_permission_keys(p_user_id);

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, old_permissions, new_permissions,
    added, removed, reason, metadata
  ) values (
    v_actor, p_user_id, 'admin_promote',
    to_jsonb(v_old), to_jsonb(v_new),
    to_jsonb(array(select unnest(v_new) except select unnest(v_old))),
    to_jsonb(array(select unnest(v_old) except select unnest(v_new))),
    p_reason,
    jsonb_build_object('role_code', v_role, 'status', v_status)
  );

  perform public.admin_audit_yaz(
    p_user_id, 'admin_promote',
    'Admin yapildi: ' || v_role,
    jsonb_build_object('role_code', v_role, 'status', v_status)
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'role_code', v_role);
end;
$$;

grant execute on function public.admin_promote_user(uuid, text, text, text, text[], text[], text) to authenticated;

create or replace function public.admin_update_admin_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := upper(trim(coalesce(p_status, '')));
  v_actor uuid := auth.uid();
  v_was_super boolean;
begin
  perform public.admin_require_permission('admin.admins.disable');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if p_user_id = v_actor then raise exception 'Kendini disable/suspendip edemezsin'; end if;
  if v_status not in ('ACTIVE', 'SUSPENDED', 'DISABLED') then
    raise exception 'Gecersiz status';
  end if;

  v_was_super := public.admin_is_super_admin(p_user_id);

  if v_was_super and v_status <> 'ACTIVE' then
    if public.admin_count_active_super_admins(p_user_id) < 1 then
      raise exception 'Son SUPER_ADMIN pasiflestirilemez';
    end if;
  end if;

  insert into public.admin_accounts (user_id, status, primary_role_code, updated_at)
  values (
    p_user_id,
    v_status,
    coalesce((select primary_role_code from public.admin_accounts where user_id = p_user_id), 'SUPER_ADMIN'),
    now()
  )
  on conflict (user_id) do update set status = excluded.status, updated_at = now();

  if v_status = 'DISABLED' then
    -- Keep is_admin true so account record remains, but panel blocked via status
    null;
  end if;

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, reason, metadata
  ) values (
    v_actor, p_user_id, 'admin_status_change', p_reason,
    jsonb_build_object('status', v_status)
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'status', v_status);
end;
$$;

grant execute on function public.admin_update_admin_status(uuid, text, text) to authenticated;

create or replace function public.admin_set_admin_role(
  p_user_id uuid,
  p_role_code text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := upper(trim(coalesce(p_role_code, '')));
  v_actor uuid := auth.uid();
  v_old_role text;
  v_was_super boolean;
  v_old text[];
  v_new text[];
begin
  perform public.admin_require_permission('admin.admins.edit');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if not exists (select 1 from public.admin_roles where role_code = v_role) then
    raise exception 'Gecersiz rol';
  end if;

  v_was_super := public.admin_is_super_admin(p_user_id);
  select primary_role_code into v_old_role from public.admin_accounts where user_id = p_user_id;

  if v_was_super and v_role <> 'SUPER_ADMIN' then
    if public.admin_count_active_super_admins(p_user_id) < 1 then
      raise exception 'Son SUPER_ADMIN rolunden dusurulamaz';
    end if;
  end if;

  if v_role = 'SUPER_ADMIN' and not public.admin_is_super_admin(v_actor) then
    raise exception 'SUPER_ADMIN atamasi icin super admin gerekli';
  end if;

  v_old := public.admin_effective_permission_keys(p_user_id);

  update public.admin_accounts
  set primary_role_code = v_role, updated_at = now()
  where user_id = p_user_id;

  if not found then
    insert into public.admin_accounts (user_id, status, primary_role_code, created_by)
    values (p_user_id, 'ACTIVE', v_role, v_actor);
  end if;

  delete from public.admin_staff_roles where user_id = p_user_id;
  insert into public.admin_staff_roles (user_id, role_code, granted_by)
  values (p_user_id, v_role, v_actor);

  v_new := public.admin_effective_permission_keys(p_user_id);

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, old_permissions, new_permissions,
    added, removed, reason, metadata
  ) values (
    v_actor, p_user_id, 'admin_role_change',
    to_jsonb(v_old), to_jsonb(v_new),
    to_jsonb(array(select unnest(v_new) except select unnest(v_old))),
    to_jsonb(array(select unnest(v_old) except select unnest(v_new))),
    p_reason,
    jsonb_build_object('old_role', v_old_role, 'new_role', v_role)
  );

  return jsonb_build_object('ok', true, 'role_code', v_role);
end;
$$;

grant execute on function public.admin_set_admin_role(uuid, text, text) to authenticated;

create or replace function public.admin_save_permission_overrides(
  p_user_id uuid,
  p_allows text[] default '{}',
  p_denies text[] default '{}',
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old text[];
  v_new text[];
  v_added text[];
  v_removed text[];
begin
  perform public.admin_require_permission('admin.permissions.edit');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if p_user_id = v_actor and not public.admin_is_super_admin(v_actor) then
    raise exception 'Kendi izinlerini degistiremezsin';
  end if;

  if public.admin_is_super_admin(p_user_id)
     and public.admin_count_active_super_admins(p_user_id) < 1 then
    raise exception 'Son SUPER_ADMIN izinleri kisitlanamaz';
  end if;

  -- Prevent locking last super via denies that remove management — super bypasses anyway
  v_old := public.admin_effective_permission_keys(p_user_id);

  delete from public.admin_user_permission_overrides where user_id = p_user_id;

  insert into public.admin_user_permission_overrides (user_id, permission_key, effect, reason, granted_by)
  select p_user_id, k, 'ALLOW', p_reason, v_actor
  from unnest(coalesce(p_allows, '{}'::text[])) k
  where exists (select 1 from public.admin_permission_catalog c where c.permission_key = k)
  on conflict do nothing;

  insert into public.admin_user_permission_overrides (user_id, permission_key, effect, reason, granted_by)
  select p_user_id, k, 'DENY', p_reason, v_actor
  from unnest(coalesce(p_denies, '{}'::text[])) k
  where exists (select 1 from public.admin_permission_catalog c where c.permission_key = k)
  on conflict (user_id, permission_key) do update set
    effect = 'DENY', reason = excluded.reason, granted_by = excluded.granted_by, updated_at = now();

  v_new := public.admin_effective_permission_keys(p_user_id);
  v_added := array(select unnest(v_new) except select unnest(v_old));
  v_removed := array(select unnest(v_old) except select unnest(v_new));

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, old_permissions, new_permissions,
    added, removed, reason
  ) values (
    v_actor, p_user_id, 'permission_overrides_save',
    to_jsonb(v_old), to_jsonb(v_new),
    to_jsonb(v_added), to_jsonb(v_removed), p_reason
  );

  return jsonb_build_object(
    'ok', true,
    'added_count', coalesce(cardinality(v_added), 0),
    'removed_count', coalesce(cardinality(v_removed), 0),
    'permission_count', coalesce(cardinality(v_new), 0)
  );
end;
$$;

grant execute on function public.admin_save_permission_overrides(uuid, text[], text[], text) to authenticated;

create or replace function public.admin_demote_admin(
  p_user_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old text[];
begin
  perform public.admin_require_permission('admin.admins.delete');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if p_user_id = v_actor then raise exception 'Kendini silemezsin'; end if;

  if public.admin_is_super_admin(p_user_id)
     and public.admin_count_active_super_admins(p_user_id) < 1 then
    raise exception 'Son SUPER_ADMIN silinemez';
  end if;

  v_old := public.admin_effective_permission_keys(p_user_id);

  perform set_config('app.allow_is_admin_change', '1', true);
  update public.profiles set is_admin = false, updated_at = now() where id = p_user_id;

  update public.admin_accounts set status = 'DISABLED', updated_at = now() where user_id = p_user_id;
  delete from public.admin_staff_roles where user_id = p_user_id;
  delete from public.admin_user_permission_overrides where user_id = p_user_id;

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, old_permissions, new_permissions,
    added, removed, reason
  ) values (
    v_actor, p_user_id, 'admin_demote',
    to_jsonb(v_old), '[]'::jsonb,
    '[]'::jsonb, to_jsonb(v_old), p_reason
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_demote_admin(uuid, text) to authenticated;

