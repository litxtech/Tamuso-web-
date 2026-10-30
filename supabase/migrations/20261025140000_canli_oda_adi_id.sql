-- Canlı yayın LiveKit oda adı = 'live_' || tiresiz session id.
-- İstemci izleyici ön bağlantısını satır gelmeden bu adla açar (CanliOdaAdi).

create or replace function public.canli_yayin_baslat(
  p_title text,
  p_mode text default 'solo',
  p_category text default null,
  p_topic text default null
)
returns public.live_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_row public.live_sessions%rowtype;
  v_id uuid := gen_random_uuid();
  v_room_name text;
  v_cat text := nullif(trim(coalesce(p_category, '')), '');
  v_topic text := nullif(trim(coalesce(p_topic, '')), '');
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if public.kill_switch_aktif_mi('kill_live') then
    raise exception 'Live temporarily disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('live_enabled') then
    raise exception 'Live feature disabled';
  end if;
  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Guest cannot go live'; end if;
  if length(trim(coalesce(p_title, ''))) < 2 then
    raise exception 'Title required';
  end if;

  update public.live_sessions
    set is_live = false, ended_at = coalesce(ended_at, now())
  where host_id = v_uid and is_live = true;

  v_room_name := 'live_' || replace(v_id::text, '-', '');

  insert into public.live_sessions (
    id, host_id, title, mode, livekit_room_name, is_live, category, topic, started_at
  ) values (
    v_id,
    v_uid,
    left(trim(p_title), 80),
    coalesce(nullif(trim(p_mode), ''), 'solo'),
    v_room_name,
    true,
    left(v_cat, 32),
    left(v_topic, 80),
    now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.canli_yayin_baslat(
  p_title text,
  p_mode text default 'solo'
)
returns public.live_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_row public.live_sessions%rowtype;
  v_id uuid := gen_random_uuid();
  v_room_name text;
  v_host_name text;
  v_follower uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if public.kill_switch_aktif_mi('kill_live') then
    raise exception 'Live temporarily disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('live_enabled') then
    raise exception 'Live feature disabled';
  end if;
  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Guest cannot go live'; end if;

  v_room_name := 'live_' || replace(v_id::text, '-', '');

  insert into public.live_sessions (id, host_id, title, mode, livekit_room_name, is_live)
  values (v_id, v_uid, left(trim(p_title), 80), coalesce(p_mode, 'solo'), v_room_name, true)
  returning * into v_row;

  select coalesce(display_name, username, 'Biri') into v_host_name
  from public.profiles where id = v_uid;

  for v_follower in
    select follower_id from public.follows
    where following_id = v_uid
    limit 200
  loop
    perform public.bildirim_kuyruga_ekle(
      v_follower,
      'live',
      v_host_name || ' canlıda',
      coalesce(nullif(trim(p_title), ''), 'Canlı yayın başladı'),
      '/canli',
      jsonb_build_object(
        'live_id', v_row.id,
        'host_id', v_uid,
        'type', 'live_start'
      )
    );
  end loop;

  return v_row;
end;
$$;
