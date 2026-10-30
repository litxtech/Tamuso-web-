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