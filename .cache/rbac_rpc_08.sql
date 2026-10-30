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