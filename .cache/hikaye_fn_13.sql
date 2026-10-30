create or replace function public.hikaye_sessizi_ac(p_muted_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_muted_user_id is null then raise exception 'user required'; end if;

  delete from public.story_mutes
  where muter_id = v_uid and muted_user_id = p_muted_user_id;

  return jsonb_build_object('ok', true, 'unmuted_user_id', p_muted_user_id);
end;
$$;

grant execute on function public.hikaye_sessizi_ac(uuid) to authenticated;
