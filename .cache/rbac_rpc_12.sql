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