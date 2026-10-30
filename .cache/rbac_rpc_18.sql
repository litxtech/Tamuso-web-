create or replace function public.admin_touch_login()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    return jsonb_build_object('ok', false);
  end if;

  insert into public.admin_accounts (user_id, status, primary_role_code, last_login_at, updated_at)
  values (
    auth.uid(),
    'ACTIVE',
    coalesce(
      (select role_code from public.admin_staff_roles where user_id = auth.uid() limit 1),
      'SUPER_ADMIN'
    ),
    now(),
    now()
  )
  on conflict (user_id) do update set last_login_at = now(), updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_touch_login() to authenticated;