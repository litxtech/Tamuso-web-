-- Ses odası hediyesi yalnızca oda sahibine veya o an koltukta oturan konuğa yazılır.
-- Dinleyiciye ve oda dışındaki hesaba oda hediyesi gitmez.

create or replace function public.gift_oda_alici_dogrula()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid;
begin
  if new.room_id is null then
    return new;
  end if;

  select host_id into v_host
  from public.rooms
  where id = new.room_id;

  if v_host is null then
    raise exception 'Room not found';
  end if;

  if new.receiver_id = v_host then
    return new;
  end if;

  if exists (
    select 1
    from public.room_seats
    where room_id = new.room_id
      and user_id = new.receiver_id
  ) then
    return new;
  end if;

  raise exception 'Gift receiver must be the room host or a seated guest';
end;
$$;

drop trigger if exists gift_oda_alici_dogrula on public.gift_transactions;

create trigger gift_oda_alici_dogrula
  before insert on public.gift_transactions
  for each row
  execute function public.gift_oda_alici_dogrula();
