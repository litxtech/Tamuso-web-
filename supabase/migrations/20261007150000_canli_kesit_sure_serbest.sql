-- Kesit süresi kullanıcı durdurana kadar; 1–30 sn. 15/20/30 zorunluluğu kalkar.

alter table public.live_clip_requests
  drop constraint if exists live_clip_requests_sure_chk;

alter table public.live_clip_requests
  add constraint live_clip_requests_sure_chk
  check (duration_ms between 1000 and 30000);

create or replace function public.canli_kesit_istek_ac(
  p_live_id uuid,
  p_pk_id uuid default null,
  p_saniye int default 30,
  p_host_ad text default null,
  p_rakip_ad text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_live public.live_sessions%rowtype;
  v_pk public.pk_matches%rowtype;
  v_guest boolean;
  v_ayar public.live_clip_settings%rowtype;
  v_adet int;
  v_id uuid;
  v_room text;
  v_ms int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.hikaye_aktif_mi() then raise exception 'Stories disabled'; end if;
  if not coalesce(public.ozellik_bayragi_aktif_mi('live_clip_story_enabled'), false) then
    raise exception 'Clip disabled';
  end if;
  if not coalesce(public.ozellik_bayragi_aktif_mi('story_creation_enabled'), false) then
    raise exception 'Story creation disabled';
  end if;
  if not coalesce(public.ozellik_bayragi_aktif_mi('story_video_enabled'), false) then
    raise exception 'Story video disabled';
  end if;

  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir hikaye paylasamaz'; end if;
  if public.kullanici_yaptirim_aktif_mi(v_uid, 'upload_ban') then
    raise exception 'Upload banned';
  end if;

  if p_saniye is null or p_saniye < 1 or p_saniye > 30 then
    raise exception 'Invalid duration';
  end if;
  v_ms := p_saniye * 1000;

  select * into v_live from public.live_sessions where id = p_live_id;
  if not found or v_live.host_id is distinct from v_uid then
    raise exception 'Not host';
  end if;
  if not coalesce(v_live.is_live, false) then
    raise exception 'Not found';
  end if;
  if lower(coalesce(v_live.mode, '')) in ('private', 'secret') then
    raise exception 'Private live';
  end if;

  if p_pk_id is not null then
    select * into v_pk from public.pk_matches where id = p_pk_id;
    if not found or v_pk.status is distinct from 'live' then
      raise exception 'PK mismatch';
    end if;
    if v_live.id is distinct from v_pk.live_a_id and v_live.id is distinct from v_pk.live_b_id then
      raise exception 'PK mismatch';
    end if;
  end if;

  select * into v_ayar from public.live_clip_settings where id = 1;
  select count(*)::int into v_adet
  from public.live_clip_requests
  where user_id = v_uid
    and created_at > now() - interval '1 minute'
    and status <> 'failed';
  if v_adet >= coalesce(v_ayar.max_per_minute, 3) then
    raise exception 'Rate limited';
  end if;

  v_room := nullif(trim(coalesce(v_live.livekit_room_name, '')), '');
  if v_room is null then
    v_room := 'live_' || v_live.id::text;
  end if;

  insert into public.live_clip_requests (
    user_id, live_session_id, pk_match_id, room_name, duration_ms,
    status, host_label, rival_label
  ) values (
    v_uid,
    v_live.id,
    p_pk_id,
    left(v_room, 128),
    v_ms,
    'recording',
    nullif(left(trim(coalesce(p_host_ad, '')), 80), ''),
    nullif(left(trim(coalesce(p_rakip_ad, '')), 80), '')
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_id,
    'duration_ms', v_ms,
    'max_bytes', coalesce(v_ayar.max_bytes, 18874368)
  );
end;
$$;
