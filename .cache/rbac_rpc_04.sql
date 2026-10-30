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