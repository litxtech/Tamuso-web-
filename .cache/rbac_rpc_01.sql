create or replace function public.admin_my_permissions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_keys text[];
  v_is_super boolean;
  v_status text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;
  if not coalesce((select is_admin from public.profiles where id = v_uid), false) then
    return jsonb_build_object('ok', false, 'error', 'not_admin');
  end if;

  select status into v_status from public.admin_accounts where user_id = v_uid;
  v_is_super := public.admin_is_super_admin(v_uid);
  v_keys := public.admin_effective_permission_keys(v_uid);

  return jsonb_build_object(
    'ok', true,
    'user_id', v_uid,
    'status', coalesce(v_status, 'ACTIVE'),
    'is_super', v_is_super,
    'permissions', to_jsonb(v_keys),
    'count', coalesce(cardinality(v_keys), 0)
  );
end;
$$;

grant execute on function public.admin_my_permissions() to authenticated;