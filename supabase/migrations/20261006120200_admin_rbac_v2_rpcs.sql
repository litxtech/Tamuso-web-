-- =============================================================================
-- Admin RBAC V2: management RPCs (security definer, permission-gated)
-- =============================================================================

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

create or replace function public.admin_permission_catalog_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('admin.permissions.view')
     and not public.admin_has_permission('admin.management.view')
     and not public.admin_has_permission('admin.admins.create') then
    -- Allow any active admin to see catalog when creating? require management view
    if not public.admin_account_active(auth.uid()) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;
    -- non-management admins: empty (they don't need catalog)
    if not public.admin_is_super_admin(auth.uid()) then
      raise exception 'Forbidden: missing permission admin.permissions.view' using errcode = '42501';
    end if;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'permission_key', c.permission_key,
        'label', c.label,
        'description', c.description,
        'category', c.category,
        'risk', c.risk,
        'module_href', c.module_href,
        'sort_order', c.sort_order
      )
      order by c.category, c.sort_order, c.permission_key
    )
    from public.admin_permission_catalog c
    where c.is_active
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_permission_catalog_list() to authenticated;

create or replace function public.admin_roles_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('admin.management.view')
     and not public.admin_has_permission('admin.roles.create')
     and not public.admin_is_super_admin(auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'role_code', r.role_code,
        'name', r.name,
        'description', r.description,
        'is_system', r.is_system,
        'is_super', r.is_super,
        'sort_order', r.sort_order,
        'permission_count', (
          select count(*)::int from public.admin_role_permissions p where p.role_code = r.role_code
        )
      )
      order by r.sort_order, r.name
    )
    from public.admin_roles r
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_roles_list() to authenticated;

create or replace function public.admin_list_admins(
  p_search text default null,
  p_role text default null,
  p_status text default null,
  p_permission text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
  v_items jsonb;
  v_total int;
begin
  perform public.admin_require_permission('admin.management.view');

  with base as (
    select
      p.id as user_id,
      coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), left(p.id::text, 8)) as display_name,
      p.username,
      p.avatar_url,
      au.email,
      coalesce(a.status, 'ACTIVE') as status,
      coalesce(a.primary_role_code, 'SUPER_ADMIN') as primary_role_code,
      ar.name as role_name,
      a.last_login_at,
      coalesce(a.created_at, p.created_at) as created_at,
      public.admin_is_super_admin(p.id) as is_super,
      public.admin_effective_permission_keys(p.id) as perm_keys
    from public.profiles p
    left join public.admin_accounts a on a.user_id = p.id
    left join public.admin_roles ar on ar.role_code = coalesce(a.primary_role_code, 'SUPER_ADMIN')
    left join auth.users au on au.id = p.id
    where coalesce(p.is_admin, false) = true
      and p.deleted_at is null
  ),
  filtered as (
    select b.*
    from base b
    where (p_role is null or b.primary_role_code = p_role)
      and (p_status is null or b.status = p_status)
      and (
        v_q is null
        or lower(b.display_name) like '%' || v_q || '%'
        or lower(coalesce(b.username, '')) like '%' || v_q || '%'
        or lower(coalesce(b.email, '')) like '%' || v_q || '%'
      )
      and (
        p_permission is null
        or p_permission = any (b.perm_keys)
        or b.is_super
      )
  )
  select
    count(*)::int,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'user_id', f.user_id,
            'display_name', f.display_name,
            'username', f.username,
            'email', f.email,
            'avatar_url', f.avatar_url,
            'status', f.status,
            'role_code', f.primary_role_code,
            'role_name', f.role_name,
            'is_super', f.is_super,
            'last_login_at', f.last_login_at,
            'created_at', f.created_at,
            'permission_count', coalesce(cardinality(f.perm_keys), 0),
            'permission_summary', case
              when f.is_super then 'ALL PERMISSIONS'
              else coalesce(cardinality(f.perm_keys), 0)::text || ' permissions'
            end
          )
          order by f.created_at desc
        )
        from (
          select * from filtered
          order by created_at desc
          limit v_limit offset v_offset
        ) f
      ),
      '[]'::jsonb
    )
  into v_total, v_items
  from filtered;

  return jsonb_build_object(
    'ok', true,
    'total', coalesce(v_total, 0),
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_list_admins(text, text, text, text, int, int) to authenticated;

create or replace function public.admin_get_admin_detail(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_keys text[];
  v_row record;
  v_overrides jsonb;
  v_by_cat jsonb;
  v_high_risk jsonb;
begin
  perform public.admin_require_permission('admin.management.view');
  if p_user_id is null then raise exception 'user_id gerekli'; end if;

  select
    p.id as user_id,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), left(p.id::text, 8)) as display_name,
    p.username,
    p.avatar_url,
    au.email,
    coalesce(a.status, 'ACTIVE') as status,
    a.phone,
    coalesce(a.primary_role_code, 'SUPER_ADMIN') as primary_role_code,
    ar.name as role_name,
    ar.is_super,
    a.last_login_at,
    coalesce(a.created_at, p.created_at) as created_at,
    a.notes
  into v_row
  from public.profiles p
  left join public.admin_accounts a on a.user_id = p.id
  left join public.admin_roles ar on ar.role_code = coalesce(a.primary_role_code, 'SUPER_ADMIN')
  left join auth.users au on au.id = p.id
  where p.id = p_user_id and coalesce(p.is_admin, false) = true;

  if v_row.user_id is null then
    raise exception 'Admin bulunamadi';
  end if;

  v_keys := public.admin_effective_permission_keys(p_user_id);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'permission_key', o.permission_key,
      'effect', o.effect,
      'reason', o.reason
    ) order by o.permission_key
  ), '[]'::jsonb)
  into v_overrides
  from public.admin_user_permission_overrides o
  where o.user_id = p_user_id;

  select coalesce(jsonb_object_agg(category, cnt), '{}'::jsonb)
  into v_by_cat
  from (
    select c.category, count(*)::int as cnt
    from unnest(v_keys) k(permission_key)
    join public.admin_permission_catalog c on c.permission_key = k.permission_key
    group by c.category
  ) s;

  select coalesce(jsonb_agg(c.permission_key order by c.permission_key), '[]'::jsonb)
  into v_high_risk
  from unnest(v_keys) k(permission_key)
  join public.admin_permission_catalog c on c.permission_key = k.permission_key
  where c.risk in ('HIGH', 'CRITICAL');

  return jsonb_build_object(
    'ok', true,
    'admin', jsonb_build_object(
      'user_id', v_row.user_id,
      'display_name', v_row.display_name,
      'username', v_row.username,
      'email', v_row.email,
      'avatar_url', v_row.avatar_url,
      'status', v_row.status,
      'phone', v_row.phone,
      'role_code', v_row.primary_role_code,
      'role_name', v_row.role_name,
      'is_super', coalesce(v_row.is_super, false) or public.admin_is_super_admin(p_user_id),
      'last_login_at', v_row.last_login_at,
      'created_at', v_row.created_at,
      'notes', v_row.notes
    ),
    'permissions', to_jsonb(v_keys),
    'permission_count', coalesce(cardinality(v_keys), 0),
    'by_category', v_by_cat,
    'high_risk', v_high_risk,
    'overrides', v_overrides,
    'role_permissions', coalesce((
      select jsonb_agg(p.permission_code order by p.permission_code)
      from public.admin_role_permissions p
      where p.role_code = v_row.primary_role_code
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.admin_get_admin_detail(uuid) to authenticated;

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
create or replace function public.admin_promote_user(
  p_user_id uuid,
  p_role_code text,
  p_status text default 'ACTIVE',
  p_phone text default null,
  p_allow_overrides text[] default null,
  p_deny_overrides text[] default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := upper(trim(coalesce(p_role_code, '')));
  v_status text := upper(trim(coalesce(p_status, 'ACTIVE')));
  v_actor uuid := auth.uid();
  v_old text[];
  v_new text[];
begin
  perform public.admin_require_permission('admin.admins.create');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null) then
    raise exception 'Kullanici bulunamadi';
  end if;
  if not exists (select 1 from public.admin_roles where role_code = v_role) then
    raise exception 'Gecersiz rol';
  end if;
  if v_status not in ('ACTIVE', 'SUSPENDED', 'DISABLED') then
    raise exception 'Gecersiz status';
  end if;

  if v_role = 'SUPER_ADMIN' and not public.admin_is_super_admin(v_actor) then
    raise exception 'SUPER_ADMIN sadece super admin olusturabilir';
  end if;

  v_old := public.admin_effective_permission_keys(p_user_id);

  perform set_config('app.allow_is_admin_change', '1', true);
  update public.profiles set is_admin = true, updated_at = now() where id = p_user_id;

  insert into public.admin_accounts (user_id, status, phone, primary_role_code, created_by, updated_at)
  values (p_user_id, v_status, nullif(trim(coalesce(p_phone, '')), ''), v_role, v_actor, now())
  on conflict (user_id) do update set
    status = excluded.status,
    phone = coalesce(excluded.phone, admin_accounts.phone),
    primary_role_code = excluded.primary_role_code,
    updated_at = now();

  delete from public.admin_staff_roles where user_id = p_user_id;
  insert into public.admin_staff_roles (user_id, role_code, granted_by)
  values (p_user_id, v_role, v_actor)
  on conflict do nothing;

  delete from public.admin_user_permission_overrides where user_id = p_user_id;

  if p_allow_overrides is not null then
    insert into public.admin_user_permission_overrides (user_id, permission_key, effect, reason, granted_by)
    select p_user_id, unnest(p_allow_overrides), 'ALLOW', p_reason, v_actor
    on conflict (user_id, permission_key) do update set
      effect = 'ALLOW', reason = excluded.reason, granted_by = excluded.granted_by, updated_at = now();
  end if;

  if p_deny_overrides is not null then
    insert into public.admin_user_permission_overrides (user_id, permission_key, effect, reason, granted_by)
    select p_user_id, unnest(p_deny_overrides), 'DENY', p_reason, v_actor
    on conflict (user_id, permission_key) do update set
      effect = 'DENY', reason = excluded.reason, granted_by = excluded.granted_by, updated_at = now();
  end if;

  v_new := public.admin_effective_permission_keys(p_user_id);

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, old_permissions, new_permissions,
    added, removed, reason, metadata
  ) values (
    v_actor, p_user_id, 'admin_promote',
    to_jsonb(v_old), to_jsonb(v_new),
    to_jsonb(array(select unnest(v_new) except select unnest(v_old))),
    to_jsonb(array(select unnest(v_old) except select unnest(v_new))),
    p_reason,
    jsonb_build_object('role_code', v_role, 'status', v_status)
  );

  perform public.admin_audit_yaz(
    p_user_id, 'admin_promote',
    'Admin yapildi: ' || v_role,
    jsonb_build_object('role_code', v_role, 'status', v_status)
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'role_code', v_role);
end;
$$;

grant execute on function public.admin_promote_user(uuid, text, text, text, text[], text[], text) to authenticated;

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

create or replace function public.admin_set_admin_role(
  p_user_id uuid,
  p_role_code text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := upper(trim(coalesce(p_role_code, '')));
  v_actor uuid := auth.uid();
  v_old_role text;
  v_was_super boolean;
  v_old text[];
  v_new text[];
begin
  perform public.admin_require_permission('admin.admins.edit');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if not exists (select 1 from public.admin_roles where role_code = v_role) then
    raise exception 'Gecersiz rol';
  end if;

  v_was_super := public.admin_is_super_admin(p_user_id);
  select primary_role_code into v_old_role from public.admin_accounts where user_id = p_user_id;

  if v_was_super and v_role <> 'SUPER_ADMIN' then
    if public.admin_count_active_super_admins(p_user_id) < 1 then
      raise exception 'Son SUPER_ADMIN rolunden dusurulamaz';
    end if;
  end if;

  if v_role = 'SUPER_ADMIN' and not public.admin_is_super_admin(v_actor) then
    raise exception 'SUPER_ADMIN atamasi icin super admin gerekli';
  end if;

  v_old := public.admin_effective_permission_keys(p_user_id);

  update public.admin_accounts
  set primary_role_code = v_role, updated_at = now()
  where user_id = p_user_id;

  if not found then
    insert into public.admin_accounts (user_id, status, primary_role_code, created_by)
    values (p_user_id, 'ACTIVE', v_role, v_actor);
  end if;

  delete from public.admin_staff_roles where user_id = p_user_id;
  insert into public.admin_staff_roles (user_id, role_code, granted_by)
  values (p_user_id, v_role, v_actor);

  v_new := public.admin_effective_permission_keys(p_user_id);

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, old_permissions, new_permissions,
    added, removed, reason, metadata
  ) values (
    v_actor, p_user_id, 'admin_role_change',
    to_jsonb(v_old), to_jsonb(v_new),
    to_jsonb(array(select unnest(v_new) except select unnest(v_old))),
    to_jsonb(array(select unnest(v_old) except select unnest(v_new))),
    p_reason,
    jsonb_build_object('old_role', v_old_role, 'new_role', v_role)
  );

  return jsonb_build_object('ok', true, 'role_code', v_role);
end;
$$;

grant execute on function public.admin_set_admin_role(uuid, text, text) to authenticated;

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

create or replace function public.admin_demote_admin(
  p_user_id uuid,
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
begin
  perform public.admin_require_permission('admin.admins.delete');

  if p_user_id is null then raise exception 'user_id gerekli'; end if;
  if p_user_id = v_actor then raise exception 'Kendini silemezsin'; end if;

  if public.admin_is_super_admin(p_user_id)
     and public.admin_count_active_super_admins(p_user_id) < 1 then
    raise exception 'Son SUPER_ADMIN silinemez';
  end if;

  v_old := public.admin_effective_permission_keys(p_user_id);

  perform set_config('app.allow_is_admin_change', '1', true);
  update public.profiles set is_admin = false, updated_at = now() where id = p_user_id;

  update public.admin_accounts set status = 'DISABLED', updated_at = now() where user_id = p_user_id;
  delete from public.admin_staff_roles where user_id = p_user_id;
  delete from public.admin_user_permission_overrides where user_id = p_user_id;

  insert into public.admin_permission_audit_logs (
    actor_id, target_user_id, action, old_permissions, new_permissions,
    added, removed, reason
  ) values (
    v_actor, p_user_id, 'admin_demote',
    to_jsonb(v_old), '[]'::jsonb,
    '[]'::jsonb, to_jsonb(v_old), p_reason
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_demote_admin(uuid, text) to authenticated;

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
