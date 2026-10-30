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