create or replace function public.hikaye_yakin_arkadas_getir()
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
      'user_id', cf.friend_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'created_at', cf.created_at
    )
    order by p.display_name nulls last, p.username
  ), '[]'::jsonb)
  into v_rows
  from public.story_close_friends cf
  join public.profiles p on p.id = cf.friend_id
  where cf.owner_id = v_uid;

  return jsonb_build_object('ok', true, 'items', coalesce(v_rows, '[]'::jsonb));
end;
$$;

grant execute on function public.hikaye_yakin_arkadas_getir() to authenticated;