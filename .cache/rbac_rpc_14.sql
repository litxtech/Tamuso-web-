create or replace function public.admin_role_copy(
  p_source_role text,
  p_new_role_code text,
  p_new_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src text := upper(trim(coalesce(p_source_role, '')));
  v_new text := upper(regexp_replace(trim(coalesce(p_new_role_code, '')), '[^A-Za-z0-9_]', '_', 'g'));
  v_perms text[];
begin
  perform public.admin_require_permission('admin.roles.create');
  if not exists (select 1 from public.admin_roles where role_code = v_src) then
    raise exception 'Kaynak rol yok';
  end if;

  select coalesce(array_agg(permission_code), '{}'::text[])
  into v_perms
  from public.admin_role_permissions where role_code = v_src;

  return public.admin_role_create(v_new, coalesce(nullif(trim(p_new_name), ''), v_new), 'Kopya: ' || v_src, v_perms);
end;
$$;

grant execute on function public.admin_role_copy(text, text, text) to authenticated;