create or replace function public.admin_role_update_permissions(
  p_role_code text,
  p_permissions text[],
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_role_code, '')));
  v_is_super boolean;
begin
  perform public.admin_require_permission('admin.roles.edit');

  select is_super into v_is_super from public.admin_roles where role_code = v_code;
  if not found then raise exception 'Rol yok'; end if;
  if coalesce(v_is_super, false) then
    raise exception 'SUPER_ADMIN rol izinleri degistirilemez (sistem)';
  end if;

  delete from public.admin_role_permissions where role_code = v_code;
  insert into public.admin_role_permissions (role_code, permission_code)
  select v_code, unnest(coalesce(p_permissions, '{}'::text[]))
  on conflict do nothing;

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, new_permissions, reason, metadata
  ) values (
    auth.uid(), null, 'role_permissions_update',
    to_jsonb(coalesce(p_permissions, '{}'::text[])), p_reason,
    jsonb_build_object('role_code', v_code)
  );

  return jsonb_build_object('ok', true, 'role_code', v_code, 'count', coalesce(cardinality(p_permissions), 0));
end;
$$;

grant execute on function public.admin_role_update_permissions(text, text[], text) to authenticated;