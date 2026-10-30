create or replace function public.admin_role_create(
  p_role_code text,
  p_name text,
  p_description text default '',
  p_permissions text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(trim(coalesce(p_role_code, '')), '[^A-Za-z0-9_]', '_', 'g'));
begin
  perform public.admin_require_permission('admin.roles.create');
  if length(v_code) < 2 then raise exception 'role_code gerekli'; end if;
  if exists (select 1 from public.admin_roles where role_code = v_code) then
    raise exception 'Rol zaten var';
  end if;

  insert into public.admin_roles (role_code, name, description, is_system, is_super, created_by)
  values (v_code, coalesce(nullif(trim(p_name), ''), v_code), coalesce(p_description, ''), false, false, auth.uid());

  insert into public.admin_role_permissions (role_code, permission_code)
  select v_code, unnest(coalesce(p_permissions, '{}'::text[]))
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'role_code', v_code);
end;
$$;

grant execute on function public.admin_role_create(text, text, text, text[]) to authenticated;