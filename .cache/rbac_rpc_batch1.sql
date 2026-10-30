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

