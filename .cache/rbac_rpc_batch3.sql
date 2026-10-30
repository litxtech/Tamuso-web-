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

create or replace function public.admin_role_update_permissions(
  p_role_code text,
  p_permissions text[],
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(coalesce(p_role_code, '')));
  v_is_super boolean;
begin
  perform public.admin_require_permission('admin.roles.edit');

  select is_super into v_is_super from public.admin_roles where role_code = v_code;
  if not found then raise exception 'Rol yok'; end if;
  if coalesce(v_is_super, false) then
    raise exception 'SUPER_ADMIN rol izinleri degistirilemez (sistem)';
  end if;

  delete from public.admin_role_permissions where role_code = v_code;
  insert into public.admin_role_permissions (role_code, permission_code)
  select v_code, unnest(coalesce(p_permissions, '{}'::text[]))
  on conflict do nothing;

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, new_permissions, reason, metadata
  ) values (
    auth.uid(), null, 'role_permissions_update',
    to_jsonb(coalesce(p_permissions, '{}'::text[])), p_reason,
    jsonb_build_object('role_code', v_code)
  );

  return jsonb_build_object('ok', true, 'role_code', v_code, 'count', coalesce(cardinality(p_permissions), 0));
end;
$$;

grant execute on function public.admin_role_update_permissions(text, text[], text) to authenticated;

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

create or replace function public.admin_role_get_permissions(p_role_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('admin.management.view')
     and not public.admin_is_super_admin(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(permission_code order by permission_code)
    from public.admin_role_permissions
    where role_code = upper(trim(p_role_code))
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_role_get_permissions(text) to authenticated;

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

create or replace function public.admin_permission_audit_list(
  p_target_user_id uuid default null,
  p_limit int default 40
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.admin_require_permission('admin.audit.view');

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'actor_id', l.actor_id,
        'actor_name', coalesce(ap.display_name, ap.username),
        'target_user_id', l.target_user_id,
        'target_name', coalesce(tp.display_name, tp.username),
        'action', l.action,
        'added', l.added,
        'removed', l.removed,
        'reason', l.reason,
        'metadata', l.metadata,
        'created_at', l.created_at
      )
      order by l.created_at desc
    )
    from (
      select * from public.admin_permission_audit_logs
      where p_target_user_id is null or target_user_id = p_target_user_id
      order by created_at desc
      limit greatest(1, least(coalesce(p_limit, 40), 200))
    ) l
    left join public.profiles ap on ap.id = l.actor_id
    left join public.profiles tp on tp.id = l.target_user_id
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_permission_audit_list(uuid, int) to authenticated;

