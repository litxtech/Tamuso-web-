create or replace function public.admin_role_delete(p_role_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_role_code, '')));
  v_row public.admin_roles%rowtype;
begin
  perform public.admin_require_permission('admin.roles.delete');

  select * into v_row from public.admin_roles where role_code = v_code;
  if not found then raise exception 'Rol yok'; end if;
  if v_row.is_system or v_row.is_super then
    raise exception 'Sistem rolleri silinemez';
  end if;
  if exists (select 1 from public.admin_accounts where primary_role_code = v_code) then
    raise exception 'Rol kullanimda; once adminleri tasi';
  end if;

  delete from public.admin_role_permissions where role_code = v_code;
  delete from public.admin_roles where role_code = v_code;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_role_delete(text) to authenticated;