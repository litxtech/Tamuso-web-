create or replace function public.admin_update_admin_status(
  p_user_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := upper(trim(coalesce(p_status, '')));
  v_actor uuid := auth.uid();
  v_was_super boolean;
begin
  perform public.admin_require_permission('admin.admins.disable');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if p_user_id = v_actor then raise exception 'Kendini disable/suspendip edemezsin'; end if;
  if v_status not in ('ACTIVE', 'SUSPENDED', 'DISABLED') then
    raise exception 'Gecersiz status';
  end if;

  v_was_super := public.admin_is_super_admin(p_user_id);

  if v_was_super and v_status <> 'ACTIVE' then
    if public.admin_count_active_super_admins(p_user_id) < 1 then
      raise exception 'Son SUPER_ADMIN pasiflestirilemez';
    end if;
  end if;

  insert into public.admin_accounts (user_id, status, primary_role_code, updated_at)
  values (
    p_user_id,
    v_status,
    coalesce((select primary_role_code from public.admin_accounts where user_id = p_user_id), 'SUPER_ADMIN'),
    now()
  )
  on conflict (user_id) do update set status = excluded.status, updated_at = now();

  if v_status = 'DISABLED' then
    -- Keep is_admin true so account record remains, but panel blocked via status
    null;
  end if;

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, reason, metadata
  ) values (
    v_actor, p_user_id, 'admin_status_change', p_reason,
    jsonb_build_object('status', v_status)
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'status', v_status);
end;
$$;

grant execute on function public.admin_update_admin_status(uuid, text, text) to authenticated;