create or replace function public.admin_permission_holders(p_permission text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_key text := lower(trim(coalesce(p_permission, '')));
begin
  perform public.admin_require_permission('admin.permissions.view');
  if v_key = '' then raise exception 'permission gerekli'; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'display_name', coalesce(nullif(trim(p.display_name), ''), p.username, left(p.id::text, 8)),
        'role_code', coalesce(a.primary_role_code, 'SUPER_ADMIN'),
        'role_name', ar.name,
        'is_super', public.admin_is_super_admin(p.id)
      )
      order by p.display_name
    )
    from public.profiles p
    left join public.admin_accounts a on a.user_id = p.id
    left join public.admin_roles ar on ar.role_code = coalesce(a.primary_role_code, 'SUPER_ADMIN')
    where coalesce(p.is_admin, false) = true
      and p.deleted_at is null
      and public.admin_account_active(p.id)
      and (
        public.admin_is_super_admin(p.id)
        or v_key = any (public.admin_effective_permission_keys(p.id))
      )
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_permission_holders(text) to authenticated;