-- Oda sahibi istediği boş koltuğa geçer.
-- Tahttan ayrılınca seat 0 diğer kullanıcılara kilitlenir.

create or replace function public.host_koltuga_gec(
  p_room_id uuid,
  p_seat_index int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
  v_max int;
  v_seat_id uuid;
  v_seat_user uuid;
  v_locked boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select host_id, max_seats into v_host, v_max
  from public.rooms
  where id = p_room_id
  for update;

  if v_host is null then raise exception 'Room not found'; end if;
  if v_host <> v_uid then raise exception 'Not host'; end if;
  if p_seat_index is null or p_seat_index < 0
     or (v_max is not null and p_seat_index >= v_max) then
    raise exception 'Invalid seat';
  end if;

  select id, user_id, coalesce(is_locked, false)
    into v_seat_id, v_seat_user, v_locked
  from public.room_seats
  where room_id = p_room_id and seat_index = p_seat_index
  for update;

  if v_seat_id is null then raise exception 'Seat not found'; end if;
  if v_seat_user is not null and v_seat_user <> v_uid then
    raise exception 'Seat occupied';
  end if;
  if p_seat_index <> 0 and v_locked and v_seat_user is distinct from v_uid then
    raise exception 'Seat locked';
  end if;

  update public.room_seats
  set user_id = null, is_muted = false
  where room_id = p_room_id
    and user_id = v_uid
    and seat_index <> p_seat_index;

  update public.room_seats
  set user_id = v_uid, is_muted = false, is_mic_locked = false
  where id = v_seat_id;

  if p_seat_index = 0 then
    update public.room_seats
    set is_locked = false
    where room_id = p_room_id and seat_index = 0;
  else
    update public.room_seats
    set user_id = null, is_muted = false, is_locked = true
    where room_id = p_room_id and seat_index = 0;
  end if;
end;
$$;

grant execute on function public.host_koltuga_gec(uuid, int) to authenticated;

create or replace function public.host_tahtini_kilitle(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
  v_on_throne boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select host_id into v_host from public.rooms where id = p_room_id;
  if v_host is null then raise exception 'Room not found'; end if;
  if v_host <> v_uid then raise exception 'Not host'; end if;

  select exists (
    select 1 from public.room_seats
    where room_id = p_room_id and seat_index = 0 and user_id = v_uid
  ) into v_on_throne;

  if v_on_throne then
    update public.room_seats
    set is_locked = false
    where room_id = p_room_id and seat_index = 0;
    return;
  end if;

  update public.room_seats
  set
    user_id = case when user_id = v_uid then user_id else null end,
    is_muted = false,
    is_locked = true
  where room_id = p_room_id and seat_index = 0;
end;
$$;

grant execute on function public.host_tahtini_kilitle(uuid) to authenticated;

notify pgrst, 'reload schema';
