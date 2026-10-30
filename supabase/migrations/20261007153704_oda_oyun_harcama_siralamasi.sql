-- Ses odası sıralaması: bu hafta oyunda harcanan coin.
-- Hediye değil; odada oynanan oyunların bahis toplamı.

create table if not exists public.oda_oyun_harcama (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  spent_coin bigint not null check (spent_coin > 0),
  created_at timestamptz not null default now()
);

create index if not exists oda_oyun_harcama_room_created_idx
  on public.oda_oyun_harcama (room_id, created_at desc);

alter table public.oda_oyun_harcama enable row level security;

revoke all on public.oda_oyun_harcama from public, anon, authenticated;

create or replace function public.kullanici_canli_odasi(p_user uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select rm.room_id
  from public.room_members rm
  join public.rooms r on r.id = rm.room_id
  where rm.user_id = p_user
    and coalesce(r.is_live, false) = true
  order by rm.joined_at desc
  limit 1;
$$;

revoke all on function public.kullanici_canli_odasi(uuid) from public, anon, authenticated;

create or replace function public.oda_oyun_coin_ekle(
  p_room_id uuid,
  p_user_id uuid,
  p_won bigint default 0,
  p_spent bigint default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spent bigint := greatest(coalesce(p_spent, 0), 0);
  v_won bigint := greatest(coalesce(p_won, 0), 0);
begin
  if p_room_id is null or p_user_id is null then return; end if;
  if v_won <= 0 and v_spent <= 0 then return; end if;

  insert into public.oda_oyun_coin_istatistik (room_id, user_id, won_coin, spent_coin)
  values (p_room_id, p_user_id, v_won, v_spent)
  on conflict (room_id, user_id) do update set
    won_coin = oda_oyun_coin_istatistik.won_coin + excluded.won_coin,
    spent_coin = oda_oyun_coin_istatistik.spent_coin + excluded.spent_coin,
    updated_at = now();

  if v_spent > 0 then
    insert into public.oda_oyun_harcama (room_id, user_id, spent_coin)
    values (p_room_id, p_user_id, v_spent);
  end if;
end;
$$;

revoke all on function public.oda_oyun_coin_ekle(uuid, uuid, bigint, bigint) from public, anon, authenticated;
grant execute on function public.oda_oyun_coin_ekle(uuid, uuid, bigint, bigint) to service_role;

-- Geçmiş oda harcaması bu haftanın sıralamasına girsin.
insert into public.oda_oyun_harcama (room_id, user_id, spent_coin, created_at)
select s.room_id, s.user_id, s.spent_coin, now()
from public.oda_oyun_coin_istatistik s
where s.spent_coin > 0
  and not exists (
    select 1 from public.oda_oyun_harcama h
    where h.room_id = s.room_id and h.user_id = s.user_id
  );

create or replace function public.fruit_wheel_oda_harcama_yaz()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spent bigint := greatest(-coalesce(new.delta, 0), 0);
  v_room uuid;
begin
  if v_spent <= 0 then
    return new;
  end if;
  v_room := public.kullanici_canli_odasi(new.user_id);
  if v_room is not null then
    perform public.oda_oyun_coin_ekle(v_room, new.user_id, 0, v_spent);
  end if;
  return new;
end;
$$;

revoke all on function public.fruit_wheel_oda_harcama_yaz() from public, anon, authenticated;

drop trigger if exists fruit_wheel_commands_oda_harcama on public.fruit_wheel_commands;
create trigger fruit_wheel_commands_oda_harcama
  after insert on public.fruit_wheel_commands
  for each row
  execute function public.fruit_wheel_oda_harcama_yaz();
