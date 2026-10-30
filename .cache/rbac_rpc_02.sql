create or replace function public.admin_permission_catalog_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('admin.permissions.view')
     and not public.admin_has_permission('admin.management.view')
     and not public.admin_has_permission('admin.admins.create') then
    -- Allow any active admin to see catalog when creating? require management view
    if not public.admin_account_active(auth.uid()) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
    -- non-management admins: empty (they don't need catalog)
    if not public.admin_is_super_admin(auth.uid()) then
      raise exception 'Forbidden: missing permission admin.permissions.view' using errcode = '42501';
    end if;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'permission_key', c.permission_key,
        'label', c.label,
        'description', c.description,
        'category', c.category,
        'risk', c.risk,
        'module_href', c.module_href,
        'sort_order', c.sort_order
      )
      order by c.category, c.sort_order, c.permission_key
    )
    from public.admin_permission_catalog c
    where c.is_active
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_permission_catalog_list() to authenticated;