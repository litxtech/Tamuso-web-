-- Parça bitince veya sonraki: yalnızca kullanıcının sırası.
-- Sıra boşsa katalogdan rastgele parça seçilmez, müzik kapanır.

create or replace function public.room_music_skip(
  p_room_id uuid,
  p_direction int default 1,
  p_expected_version int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
begin
  if not public.room_music_manage_izin(p_room_id) then
    raise exception 'Forbidden';
  end if;

  if p_direction >= 0 then
    select track_id into v_next
    from public.room_music_queue
    where room_id = p_room_id
    order by sort_order
    limit 1;
    if v_next is not null then
      delete from public.room_music_queue
      where id = (
        select id from public.room_music_queue
        where room_id = p_room_id
        order by sort_order
        limit 1
      );
    end if;
  end if;

  if v_next is null then
    return public.room_music_stop(p_room_id, p_expected_version);
  end if;
  return public.room_music_set(p_room_id, v_next, p_expected_version);
end;
$$;
