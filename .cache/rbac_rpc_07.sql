create or replace function public.admin_preview_menu(p_permissions text[] default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_keys text[];
begin
  if not public.admin_account_active(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_permissions is null then
    v_keys := public.admin_effective_permission_keys(auth.uid());
  else
    v_keys := p_permissions;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'permission_key', c.permission_key,
        'label', c.label,
        'category', c.category,
        'module_href', c.module_href
      )
      order by c.category, c.sort_order
    )
    from public.admin_permission_catalog c
    where c.is_active
      and c.module_href is not null
      and (
        c.permission_key = any (v_keys)
        or exists (
          select 1 from unnest(v_keys) k
          where k = c.permission_key
        )
      )
      and (
        c.permission_key like '%.view'
        or c.permission_key like '%.read'
        or c.permission_key in (
          'dashboard.view','admin.management.view','kyc.view','verification.view'
        )
      )
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_preview_menu(text[]) to authenticated;

-- Promote existing user to admin with role + optional overrides