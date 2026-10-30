-- Liderlik devri onayı ve geri alma kilidi.
-- Kurucu kendi canlı odasını açtıysa liderliği geri alamaz.
-- Hedefin başka canlı odası varsa devir, kabul kartına düşer.

create table if not exists public.oda_liderlik_teklifleri (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  isteyen_id uuid not null references public.profiles(id) on delete cascade,
  hedef_id uuid not null references public.profiles(id) on delete cascade,
  durum text not null default 'bekliyor'
    check (durum in ('bekliyor', 'kabul', 'red', 'iptal')),
  created_at timestamptz not null default now()
);

create unique index if not exists oda_liderlik_teklif_bekleyen_oda
  on public.oda_liderlik_teklifleri (room_id)
  where durum = 'bekliyor';

create index if not exists oda_liderlik_teklif_hedef_idx
  on public.oda_liderlik_teklifleri (hedef_id, durum);

alter table public.oda_liderlik_teklifleri enable row level security;

drop policy if exists oda_liderlik_teklif_oku on public.oda_liderlik_teklifleri;
create policy oda_liderlik_teklif_oku
  on public.oda_liderlik_teklifleri
  for select
  to authenticated
  using (isteyen_id = auth.uid() or hedef_id = auth.uid());

grant select on public.oda_liderlik_teklifleri to authenticated;
revoke insert, update, delete on public.oda_liderlik_teklifleri from public, anon, authenticated;

create or replace function public.oda_liderlik_uygula(
  p_room_id uuid,
  p_eski_host uuid,
  p_yeni_host uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yeni_seat int;
  v_eski_seat int;
begin
  update public.rooms
  set host_id = p_yeni_host, updated_at = now()
  where id = p_room_id;

  update public.room_members
  set role = 'cohost'
  where room_id = p_room_id and user_id = p_eski_host;

  insert into public.room_members (room_id, user_id, role)
  values (p_room_id, p_yeni_host, 'host')
  on conflict (room_id, user_id) do update set role = 'host';

  select seat_index into v_yeni_seat
  from public.room_seats
  where room_id = p_room_id and user_id = p_yeni_host
  limit 1;

  select seat_index into v_eski_seat
  from public.room_seats
  where room_id = p_room_id and user_id = p_eski_host
  limit 1;

  update public.room_seats
  set user_id = null, is_muted = false
  where room_id = p_room_id
    and user_id in (p_eski_host, p_yeni_host);

  update public.room_seats
  set user_id = p_yeni_host, is_muted = false, is_mic_locked = false, is_locked = false
  where room_id = p_room_id and seat_index = 0;

  if v_yeni_seat is not null and v_yeni_seat <> 0 then
    update public.room_seats
    set user_id = p_eski_host, is_muted = false
    where room_id = p_room_id and seat_index = v_yeni_seat;
  elsif v_eski_seat is not null and v_eski_seat <> 0 then
    update public.room_seats
    set user_id = p_eski_host, is_muted = false
    where room_id = p_room_id and seat_index = v_eski_seat;
  else
    update public.room_seats
    set user_id = p_eski_host, is_muted = false
    where id = (
      select id from public.room_seats
      where room_id = p_room_id and user_id is null and seat_index > 0
      order by seat_index
      limit 1
    );
  end if;
end;
$$;

revoke all on function public.oda_liderlik_uygula(uuid, uuid, uuid) from public, anon, authenticated;

create or replace function public.oda_liderligi_devret(
  p_room_id uuid,
  p_yeni_host_id uuid
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_yeni_host_id is null then
    raise exception 'Yeni host gerekli';
  end if;
  if p_yeni_host_id = v_uid then
    raise exception 'Kendine liderlik devredilemez';
  end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Oda bulunamadı';
  end if;
  if v_room.is_live is not true then
    raise exception 'Oda canlı değil';
  end if;
  if v_room.host_id is distinct from v_uid then
    raise exception 'Sadece oda sahibi liderliği devredebilir';
  end if;

  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = p_yeni_host_id
  ) then
    raise exception 'Hedef kullanıcı odada değil';
  end if;

  if exists (
    select 1 from public.rooms
    where host_id = p_yeni_host_id
      and coalesce(is_live, false) = true
      and id <> p_room_id
  ) then
    raise exception 'LIDERLIK_ONAY_GEREKLI';
  end if;

  perform public.oda_liderlik_uygula(p_room_id, v_uid, p_yeni_host_id);

  select * into v_room from public.rooms where id = p_room_id;
  return v_room;
end;
$$;

create or replace function public.oda_liderlik_devri_baslat(
  p_room_id uuid,
  p_yeni_host_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms%rowtype;
  v_teklif uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_yeni_host_id is null or p_yeni_host_id = v_uid then
    raise exception 'Yeni host gerekli';
  end if;

  select * into v_room from public.rooms where id = p_room_id for update;
  if not found then
    raise exception 'Oda bulunamadı';
  end if;
  if v_room.is_live is not true then
    raise exception 'Oda canlı değil';
  end if;
  if v_room.host_id is distinct from v_uid then
    raise exception 'Sadece oda sahibi liderliği devredebilir';
  end if;
  if not exists (
    select 1 from public.room_members
    where room_id = p_room_id and user_id = p_yeni_host_id
  ) then
    raise exception 'Hedef kullanıcı odada değil';
  end if;

  if exists (
    select 1 from public.rooms
    where host_id = p_yeni_host_id
      and coalesce(is_live, false) = true
      and id <> p_room_id
  ) then
    update public.oda_liderlik_teklifleri
    set durum = 'iptal'
    where room_id = p_room_id and durum = 'bekliyor';

    insert into public.oda_liderlik_teklifleri (room_id, isteyen_id, hedef_id)
    values (p_room_id, v_uid, p_yeni_host_id)
    returning id into v_teklif;

    return jsonb_build_object('durum', 'bekliyor', 'teklif_id', v_teklif);
  end if;

  perform public.oda_liderlik_uygula(p_room_id, v_uid, p_yeni_host_id);
  return jsonb_build_object('durum', 'tamam');
end;
$$;

create or replace function public.oda_liderlik_devri_yanit(
  p_teklif_id uuid,
  p_kabul boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_teklif public.oda_liderlik_teklifleri%rowtype;
  v_room public.rooms%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_teklif
  from public.oda_liderlik_teklifleri
  where id = p_teklif_id
  for update;

  if not found or v_teklif.durum <> 'bekliyor' then
    raise exception 'Teklif bulunamadı';
  end if;
  if v_teklif.hedef_id is distinct from v_uid then
    raise exception 'Bu teklif sana ait değil';
  end if;

  if p_kabul is not true then
    update public.oda_liderlik_teklifleri
    set durum = 'red'
    where id = p_teklif_id;
    return jsonb_build_object('durum', 'red');
  end if;

  select * into v_room from public.rooms where id = v_teklif.room_id for update;
  if not found or v_room.is_live is not true then
    update public.oda_liderlik_teklifleri set durum = 'iptal' where id = p_teklif_id;
    raise exception 'Oda canlı değil';
  end if;
  if v_room.host_id is distinct from v_teklif.isteyen_id then
    update public.oda_liderlik_teklifleri set durum = 'iptal' where id = p_teklif_id;
    raise exception 'Lider değişti';
  end if;
  if not exists (
    select 1 from public.room_members
    where room_id = v_teklif.room_id and user_id = v_uid
  ) then
    update public.oda_liderlik_teklifleri set durum = 'iptal' where id = p_teklif_id;
    raise exception 'Odada değilsin';
  end if;

  update public.rooms
  set is_live = false, ended_at = coalesce(ended_at, now()), updated_at = now()
  where host_id = v_uid
    and coalesce(is_live, false) = true
    and id <> v_teklif.room_id;

  perform public.oda_liderlik_uygula(v_teklif.room_id, v_teklif.isteyen_id, v_uid);

  update public.oda_liderlik_teklifleri
  set durum = 'kabul'
  where id = p_teklif_id;

  return jsonb_build_object('durum', 'kabul', 'room_id', v_teklif.room_id);
end;
$$;

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

  if exists (
    select 1 from public.rooms
    where host_id = v_uid
      and coalesce(is_live, false) = true
      and id <> p_room_id
  ) then
    raise exception 'LIDERLIK_GERI_ALINAMAZ_ODA_ACIK';
  end if;

  v_eski_host := v_room.host_id;
  perform public.oda_liderlik_uygula(p_room_id, v_eski_host, v_uid);
end;
$$;

grant execute on function public.oda_liderligi_devret(uuid, uuid) to authenticated;
grant execute on function public.oda_liderlik_devri_baslat(uuid, uuid) to authenticated;
grant execute on function public.oda_liderlik_devri_yanit(uuid, boolean) to authenticated;
grant execute on function public.oda_liderligi_geri_al(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'oda_liderlik_teklifleri'
  ) then
    alter publication supabase_realtime add table public.oda_liderlik_teklifleri;
  end if;
end $$;

notify pgrst, 'reload schema';
