create or replace function public.hikaye_sessize_al(p_muted_user_id uuid)
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
  if p_muted_user_id = v_uid then raise exception 'Kendini sessize alamazsin'; end if;

  insert into public.story_mutes (muter_id, muted_user_id)
  values (v_uid, p_muted_user_id)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'muted_user_id', p_muted_user_id);
end;
$$;

grant execute on function public.hikaye_sessize_al(uuid) to authenticated;