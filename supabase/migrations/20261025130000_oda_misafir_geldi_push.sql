-- Sesli odaya misafir girince oda sahibine (host) push + gelen kutusu bildirimi

insert into public.bildirim_tur_katalog (
  kod, grup, kitle, varsayilan_acik, grup_sira, sira, baslik, aciklama
) values (
  'room_visitor',
  'rooms',
  'kullanici',
  true,
  50,
  20,
  jsonb_build_object('tr', 'Odana misafir geldi', 'en', 'Room visitor'),
  jsonb_build_object('tr', 'Biri sesli odana girince', 'en', 'When someone joins your voice room')
)
on conflict (kod) do update set
  grup = excluded.grup,
  grup_sira = excluded.grup_sira,
  sira = excluded.sira,
  baslik = excluded.baslik,
  aciklama = excluded.aciklama;

create or replace function public.oda_misafir_geldi_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid;
  v_live boolean;
  v_sample boolean;
  v_title text;
  v_name text;
begin
  select host_id, is_live, coalesce(is_sample, false), title
    into v_host, v_live, v_sample, v_title
  from public.rooms
  where id = new.room_id;

  if v_host is null or v_host = new.user_id then return new; end if;
  if v_live is not true or v_sample then return new; end if;
  if coalesce(new.role, '') = 'host' then return new; end if;
  if public.kullanicilar_engelli_mi(new.user_id, v_host) then return new; end if;

  -- Aynı misafir yeniden bağlanınca (çık-gir) tekrar bildirme
  if exists (
    select 1 from public.user_notifications n
    where n.user_id = v_host
      and n.created_at > now() - interval '30 minutes'
      and n.payload->>'type' = 'room_visitor'
      and n.payload->>'room_id' = new.room_id::text
      and n.payload->>'visitor_id' = new.user_id::text
  ) then
    return new;
  end if;

  -- Kalabalık odada host'u bombalama: 10 dk'da en fazla 10 bildirim
  if (
    select count(*) from public.user_notifications n
    where n.user_id = v_host
      and n.created_at > now() - interval '10 minutes'
      and n.payload->>'type' = 'room_visitor'
      and n.payload->>'room_id' = new.room_id::text
  ) >= 10 then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Bir misafir')
    into v_name
  from public.profiles
  where id = new.user_id;

  perform public.bildirim_kuyruga_ekle(
    v_host,
    'rooms',
    'Sesli odana misafir geldi',
    coalesce(v_name, 'Bir misafir') || ' odana katıldı' ||
      case when nullif(trim(v_title), '') is not null
        then ' · ' || left(trim(v_title), 60)
        else ''
      end,
    '/lobi/' || new.room_id::text,
    jsonb_build_object(
      'type', 'room_visitor',
      'room_id', new.room_id,
      'visitor_id', new.user_id,
      'actor_id', new.user_id
    )
  );

  return new;
exception when others then
  -- Bildirim hatası odaya katılmayı asla bozmasın
  return new;
end;
$$;

drop trigger if exists oda_misafir_geldi_push_trg on public.room_members;
create trigger oda_misafir_geldi_push_trg
  after insert on public.room_members
  for each row execute function public.oda_misafir_geldi_push();
