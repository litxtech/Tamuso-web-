create or replace function public.admin_roles_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('admin.management.view')
     and not public.admin_has_permission('admin.roles.create')
     and not public.admin_is_super_admin(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'role_code', r.role_code,
        'name', r.name,
        'description', r.description,
        'is_system', r.is_system,
        'is_super', r.is_super,
        'sort_order', r.sort_order,
        'permission_count', (
          select count(*)::int from public.admin_role_permissions p where p.role_code = r.role_code
        )
      )
      order by r.sort_order, r.name
    )
    from public.admin_roles r
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_roles_list() to authenticated;