create or replace function public.hikaye_sessizler_listesi()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', m.muted_user_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'created_at', m.created_at
    )
    order by m.created_at desc
  ), '[]'::jsonb)
  into v_rows
  from public.story_mutes m
  join public.profiles p on p.id = m.muted_user_id
  where m.muter_id = v_uid;

  return jsonb_build_object('ok', true, 'items', coalesce(v_rows, '[]'::jsonb));
end;
$$;

grant execute on function public.hikaye_sessizler_listesi() to authenticated;