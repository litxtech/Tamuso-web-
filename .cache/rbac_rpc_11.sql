create or replace function public.admin_save_permission_overrides(
  p_user_id uuid,
  p_allows text[] default '{}',
  p_denies text[] default '{}',
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old text[];
  v_new text[];
  v_added text[];
  v_removed text[];
begin
  perform public.admin_require_permission('admin.permissions.edit');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if p_user_id = v_actor and not public.admin_is_super_admin(v_actor) then
    raise exception 'Kendi izinlerini degistiremezsin';
  end if;

  if public.admin_is_super_admin(p_user_id)
     and public.admin_count_active_super_admins(p_user_id) < 1 then
    raise exception 'Son SUPER_ADMIN izinleri kisitlanamaz';
  end if;

  -- Prevent locking last super via denies that remove management — super bypasses anyway
  v_old := public.admin_effective_permission_keys(p_user_id);

  delete from public.admin_user_permission_overrides where user_id = p_user_id;

  insert into public.admin_user_permission_overrides (user_id, permission_key, effect, reason, granted_by)
  select p_user_id, k, 'ALLOW', p_reason, v_actor
  from unnest(coalesce(p_allows, '{}'::text[])) k
  where exists (select 1 from public.admin_permission_catalog c where c.permission_key = k)
  on conflict do nothing;

  insert into public.admin_user_permission_overrides (user_id, permission_key, effect, reason, granted_by)
  select p_user_id, k, 'DENY', p_reason, v_actor
  from unnest(coalesce(p_denies, '{}'::text[])) k
  where exists (select 1 from public.admin_permission_catalog c where c.permission_key = k)
  on conflict (user_id, permission_key) do update set
    effect = 'DENY', reason = excluded.reason, granted_by = excluded.granted_by, updated_at = now();

  v_new := public.admin_effective_permission_keys(p_user_id);
  v_added := array(select unnest(v_new) except select unnest(v_old));
  v_removed := array(select unnest(v_old) except select unnest(v_new));

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, old_permissions, new_permissions,
    added, removed, reason
  ) values (
    v_actor, p_user_id, 'permission_overrides_save',
    to_jsonb(v_old), to_jsonb(v_new),
    to_jsonb(v_added), to_jsonb(v_removed), p_reason
  );

  return jsonb_build_object(
    'ok', true,
    'added_count', coalesce(cardinality(v_added), 0),
    'removed_count', coalesce(cardinality(v_removed), 0),
    'permission_count', coalesce(cardinality(v_new), 0)
  );
end;
$$;

grant execute on function public.admin_save_permission_overrides(uuid, text[], text[], text) to authenticated;