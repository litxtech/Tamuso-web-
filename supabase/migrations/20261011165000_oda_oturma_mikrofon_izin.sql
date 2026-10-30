-- Oda sahibi: oturma ve mikrofon izinli / izinsiz.
-- Son seçim rooms satırında durur; elle değişene kadar geçerlidir.

alter table public.rooms
  add column if not exists oturma_izinli boolean not null default true,
  add column if not exists mikrofon_izinli boolean not null default false;

comment on column public.rooms.oturma_izinli is
  'true: koltuk host onayı ister. false: boş koltuğa doğrudan oturulur.';
comment on column public.rooms.mikrofon_izinli is
  'true: mikrofon host onayı olmadan açılmaz. false: koltuktaki kullanıcı mikrofonunu kendisi açar.';

alter table public.room_mic_requests
  add column if not exists istek_turu text not null default 'koltuk';

alter table public.room_mic_requests
  drop constraint if exists room_mic_requests_istek_turu_check;

alter table public.room_mic_requests
  add constraint room_mic_requests_istek_turu_check
  check (istek_turu in ('koltuk', 'mikrofon'));

-- ---------------------------------------------------------------------------
-- Oda sahibi ayarı kaydeder
-- ---------------------------------------------------------------------------
create or replace function public.oda_izin_ayarla(
  p_room_id uuid,
  p_oturma_izinli boolean,
  p_mikrofon_izinli boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select host_id into v_host
  from public.rooms
  where id = p_room_id
  for update;

  if v_host is null then raise exception 'Room not found'; end if;
  if v_host <> v_uid then raise exception 'Not authorized'; end if;

  update public.rooms
  set
    oturma_izinli = p_oturma_izinli,
    mikrofon_izinli = p_mikrofon_izinli,
    updated_at = now()
  where id = p_room_id;

  if p_mikrofon_izinli then
    update public.room_seats
    set is_mic_locked = true
    where room_id = p_room_id
      and user_id is not null
      and user_id <> v_host;
  else
    update public.room_seats
    set is_mic_locked = false
    where room_id = p_room_id
      and user_id is not null
      and user_id <> v_host;
  end if;
end;
$$;

grant execute on function public.oda_izin_ayarla(uuid, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- İzinsiz oturma: boş koltuğa doğrudan geç
-- ---------------------------------------------------------------------------
create or replace function public.koltuga_serbest_otur(
  p_room_id uuid,
  p_seat_index int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
  v_oturma_izinli boolean;
  v_mikrofon_izinli boolean;
  v_max int;
  v_guest boolean;
  v_seat_id uuid;
  v_seat_user uuid;
  v_locked boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select host_id,
         coalesce(oturma_izinli, true),
         coalesce(mikrofon_izinli, false),
         max_seats
    into v_host, v_oturma_izinli, v_mikrofon_izinli, v_max
  from public.rooms
  where id = p_room_id
  for update;

  if v_host is null then raise exception 'Room not found'; end if;
  if v_oturma_izinli then raise exception 'Seat requires approval'; end if;
  if v_host = v_uid then raise exception 'Host already seated'; end if;

  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Guest cannot request mic'; end if;

  if exists (
    select 1 from public.room_seats
    where room_id = p_room_id and user_id = v_uid
  ) then
    raise exception 'Already seated';
  end if;

  if p_seat_index is null or p_seat_index <= 0
     or (v_max is not null and p_seat_index >= v_max) then
    raise exception 'Invalid seat';
  end if;

  select id, user_id, coalesce(is_locked, false)
    into v_seat_id, v_seat_user, v_locked
  from public.room_seats
  where room_id = p_room_id and seat_index = p_seat_index
  for update;

  if v_seat_id is null then raise exception 'Seat not found'; end if;
  if v_locked then raise exception 'Seat locked'; end if;
  if v_seat_user is not null then raise exception 'Seat occupied'; end if;

  update public.room_seats
  set
    user_id = v_uid,
    is_muted = false,
    is_mic_locked = v_mikrofon_izinli
  where id = v_seat_id;

  insert into public.room_members (room_id, user_id, role)
  values (p_room_id, v_uid, 'speaker')
  on conflict (room_id, user_id) do update
  set role = case
    when public.room_members.role = 'host' then 'host'
    when public.room_members.role = 'cohost' then 'cohost'
    else 'speaker'
  end;

  return v_seat_id;
end;
$$;

grant execute on function public.koltuga_serbest_otur(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- İstek: izinli oturma veya izinli mikrofon
-- ---------------------------------------------------------------------------
create or replace function public.mikrofon_istegi_gonder(
  p_room_id uuid,
  p_seat_index int default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_guest boolean;
  v_host uuid;
  v_seat_user uuid;
  v_locked boolean;
  v_max int;
  v_oturma_izinli boolean;
  v_mikrofon_izinli boolean;
  v_seated boolean;
  v_tur text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select host_id,
         max_seats,
         coalesce(oturma_izinli, true),
         coalesce(mikrofon_izinli, false)
    into v_host, v_max, v_oturma_izinli, v_mikrofon_izinli
  from public.rooms where id = p_room_id;
  if v_host is null then raise exception 'Room not found'; end if;
  if v_host = auth.uid() then
    raise exception 'Host already has microphone';
  end if;

  select is_guest into v_guest from public.profiles where id = auth.uid();
  if coalesce(v_guest, false) then raise exception 'Guest cannot request mic'; end if;

  select exists (
    select 1 from public.room_seats
    where room_id = p_room_id and user_id = auth.uid()
  ) into v_seated;

  if v_seated then
    if not v_mikrofon_izinli then
      raise exception 'Already seated';
    end if;
    v_tur := 'mikrofon';
    p_seat_index := null;
  else
    if not v_oturma_izinli then
      raise exception 'Seat is open';
    end if;
    v_tur := 'koltuk';
  end if;

  if p_seat_index is not null then
    if p_seat_index < 0 or (v_max is not null and p_seat_index >= v_max) then
      raise exception 'Invalid seat';
    end if;
    if p_seat_index = 0 then
      raise exception 'Throne seat is for host';
    end if;

    select user_id, coalesce(is_locked, false)
      into v_seat_user, v_locked
    from public.room_seats
    where room_id = p_room_id and seat_index = p_seat_index;

    if not found then raise exception 'Seat not found'; end if;
    if v_locked then raise exception 'Seat locked'; end if;
    if v_seat_user is not null then raise exception 'Seat occupied'; end if;
  end if;

  insert into public.room_mic_requests (
    room_id, user_id, status, requested_seat_index, istek_turu
  )
  values (p_room_id, auth.uid(), 'pending', p_seat_index, v_tur)
  on conflict (room_id, user_id) where status = 'pending' do update
  set requested_seat_index = coalesce(
        excluded.requested_seat_index,
        public.room_mic_requests.requested_seat_index
      ),
      istek_turu = excluded.istek_turu,
      created_at = now()
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.room_mic_requests
    where room_id = p_room_id and user_id = auth.uid() and status = 'pending'
    limit 1;
  end if;
  return v_id;
end;
$$;

grant execute on function public.mikrofon_istegi_gonder(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- İstek yanıtla — mikrofon isteği koltuk taşımaz
-- ---------------------------------------------------------------------------
create or replace function public.mikrofon_istegi_yanitla(
  p_request_id uuid,
  p_kabul boolean
)
returns public.room_mic_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.room_mic_requests%rowtype;
  v_role text;
  v_seat_id uuid;
  v_seat_index int;
  v_wanted int;
  v_mikrofon_izinli boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_req
  from public.room_mic_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'Request not found'; end if;
  if v_req.status <> 'pending' then raise exception 'Request already resolved'; end if;

  select role into v_role
  from public.room_members
  where room_id = v_req.room_id and user_id = v_uid;
  if v_role is null or v_role not in ('host', 'cohost') then
    if not exists (
      select 1 from public.rooms r
      where r.id = v_req.room_id and r.host_id = v_uid
    ) then
      raise exception 'Not authorized';
    end if;
  end if;

  if not p_kabul then
    delete from public.room_mic_requests
    where room_id = v_req.room_id
      and user_id = v_req.user_id
      and status = 'rejected'
      and id is distinct from p_request_id;

    update public.room_mic_requests
    set status = 'rejected', resolved_at = now()
    where id = p_request_id
    returning * into v_req;
    return v_req;
  end if;

  if coalesce(v_req.istek_turu, 'koltuk') = 'mikrofon' then
    update public.room_seats
    set is_mic_locked = false, is_muted = false
    where room_id = v_req.room_id and user_id = v_req.user_id;

    if not found then raise exception 'User is not seated'; end if;

    delete from public.room_mic_requests
    where room_id = v_req.room_id
      and user_id = v_req.user_id
      and status = 'accepted'
      and id is distinct from p_request_id;

    update public.room_mic_requests
    set status = 'accepted', resolved_at = now()
    where id = p_request_id
    returning * into v_req;
    return v_req;
  end if;

  v_wanted := v_req.requested_seat_index;

  if v_wanted is not null and v_wanted > 0 then
    select id, seat_index into v_seat_id, v_seat_index
    from public.room_seats
    where room_id = v_req.room_id
      and seat_index = v_wanted
      and user_id is null
      and coalesce(is_locked, false) = false
    for update;
  end if;

  if v_seat_id is null then
    select id, seat_index into v_seat_id, v_seat_index
    from public.room_seats
    where room_id = v_req.room_id
      and user_id is null
      and seat_index > 0
      and coalesce(is_locked, false) = false
    order by seat_index
    limit 1
    for update;
  end if;

  if v_seat_id is null then
    raise exception 'No free mic seat';
  end if;

  select coalesce(mikrofon_izinli, false) into v_mikrofon_izinli
  from public.rooms where id = v_req.room_id;

  update public.room_seats
  set user_id = null, is_muted = false
  where room_id = v_req.room_id
    and user_id = v_req.user_id
    and id is distinct from v_seat_id;

  update public.room_seats
  set
    user_id = v_req.user_id,
    is_muted = false,
    is_mic_locked = coalesce(v_mikrofon_izinli, false)
  where id = v_seat_id;

  insert into public.room_members (room_id, user_id, role)
  values (v_req.room_id, v_req.user_id, 'speaker')
  on conflict (room_id, user_id) do update
  set role = case
    when public.room_members.role = 'host' then 'host'
    when public.room_members.role = 'cohost' then 'cohost'
    else 'speaker'
  end;

  delete from public.room_mic_requests
  where room_id = v_req.room_id
    and user_id = v_req.user_id
    and status = 'accepted'
    and id is distinct from p_request_id;

  update public.room_mic_requests
  set status = 'accepted', resolved_at = now()
  where id = p_request_id
  returning * into v_req;

  return v_req;
end;
$$;

grant execute on function public.mikrofon_istegi_yanitla(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
