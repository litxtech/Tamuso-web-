create or replace function public.hikaye_yakin_arkadas_ayarla(p_friend_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_count int := 0;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  delete from public.story_close_friends where owner_id = v_uid;

  if p_friend_ids is not null then
    foreach v_id in array p_friend_ids loop
      if v_id is null or v_id = v_uid then
        continue;
      end if;
      if not exists (select 1 from public.profiles where id = v_id) then
        continue;
      end if;
      if public.kullanicilar_engelli_mi(v_uid, v_id) then
        continue;
      end if;
      insert into public.story_close_friends (owner_id, friend_id)
      values (v_uid, v_id)
      on conflict do nothing;
      v_count := v_count + 1;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

grant execute on function public.hikaye_yakin_arkadas_ayarla(uuid[]) to authenticated;