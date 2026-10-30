create or replace function public.admin_role_get_permissions(p_role_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('admin.management.view')
     and not public.admin_is_super_admin(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(permission_code order by permission_code)
    from public.admin_role_permissions
    where role_code = upper(trim(p_role_code))
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_role_get_permissions(text) to authenticated;