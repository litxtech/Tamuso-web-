-- Odayı kuran kişi liderliği devrettikten sonra geri alabilir.
-- kurucu_id host değişse de sabit kalır.

alter table public.rooms
  add column if not exists kurucu_id uuid references public.profiles(id) on delete set null;

update public.rooms
set kurucu_id = host_id
where kurucu_id is null;

create or replace function public.oda_kurucu_koru()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.kurucu_id is null then
      new.kurucu_id := new.host_id;
    end if;
    return new;
  end if;

  if new.kurucu_id is distinct from old.kurucu_id then
    new.kurucu_id := old.kurucu_id;
  end if;
  return new;
end;
$$;

drop trigger if exists oda_kurucu_koru_trg on public.rooms;
create trigger oda_kurucu_koru_trg
before insert or update on public.rooms
for each row execute function public.oda_kurucu_koru();

create or replace function public.oda_liderligi_geri_al(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_eski_host uuid;
  v_kurucu_koltuk int;
  v_host_koltuk int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Oda bulunamadı';
  end if;
  if v_room.is_live is not true then
    raise exception 'Oda canlı değil';
  end if;
  if v_room.kurucu_id is distinct from v_uid then
    raise exception 'Sadece odayı kuran liderliği geri alabilir';
  end if;
  if v_room.host_id = v_uid then
    raise exception 'Liderlik zaten sende';
  end if;
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = v_uid
  ) then
    raise exception 'Odada değilsin';
  end if;

  v_eski_host := v_room.host_id;

  update public.rooms
  set host_id = v_uid, updated_at = now()
  where id = p_room_id;

  update public.room_members
  set role = 'cohost'
  where room_id = p_room_id and user_id = v_eski_host;

  insert into public.room_members (room_id, user_id, role)
  values (p_room_id, v_uid, 'host')
  on conflict (room_id, user_id) do update set role = 'host';

  select seat_index into v_kurucu_koltuk
  from public.room_seats
  where room_id = p_room_id and user_id = v_uid
  limit 1;

  select seat_index into v_host_koltuk
  from public.room_seats
  where room_id = p_room_id and user_id = v_eski_host
  limit 1;

  update public.room_seats
  set user_id = null, is_muted = false
  where room_id = p_room_id
    and user_id in (v_uid, v_eski_host);

  update public.room_seats
  set user_id = v_uid, is_muted = false, is_mic_locked = false, is_locked = false
  where room_id = p_room_id and seat_index = 0;

  if v_kurucu_koltuk is not null and v_kurucu_koltuk <> 0 then
    update public.room_seats
    set user_id = v_eski_host, is_muted = false
    where room_id = p_room_id and seat_index = v_kurucu_koltuk;
  elsif v_host_koltuk is not null and v_host_koltuk <> 0 then
    update public.room_seats
    set user_id = v_eski_host, is_muted = false
    where room_id = p_room_id and seat_index = v_host_koltuk;
  else
    update public.room_seats
    set user_id = v_eski_host, is_muted = false
    where id = (
      select id from public.room_seats
      where room_id = p_room_id and user_id is null and seat_index > 0
      order by seat_index
      limit 1
    );
  end if;
end;
$$;

grant execute on function public.oda_liderligi_geri_al(uuid) to authenticated;

notify pgrst, 'reload schema';
