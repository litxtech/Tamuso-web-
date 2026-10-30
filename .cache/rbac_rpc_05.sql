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