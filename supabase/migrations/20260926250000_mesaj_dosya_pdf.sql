-- DM dosya mesajı (PDF dekont) + dm-media PDF izni

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/heic',
  'video/mp4','video/quicktime','video/webm',
  'audio/mp4','audio/m4a','audio/aac','audio/mpeg','audio/x-m4a','audio/wav',
  'application/pdf'
]::text[]
where id = 'dm-media';

alter table public.direct_messages
  drop constraint if exists direct_messages_message_type_check;

alter table public.direct_messages
  add constraint direct_messages_message_type_check
  check (message_type = any (array[
    'text'::text, 'image'::text, 'video'::text, 'voice'::text,
    'emoji'::text, 'gift'::text, 'system'::text, 'shared_post'::text,
    'music'::text, 'agency_package_offer'::text, 'agency_package_receipt'::text,
    'file'::text
  ]));

create or replace function public.mesaj_dosya_gonder(
  p_thread_id uuid,
  p_media_url text,
  p_body text default '',
  p_file_name text default 'dosya.pdf',
  p_mime text default 'application/pdf',
  p_client_id uuid default null,
  p_media_meta jsonb default '{}'::jsonb
)
returns public.direct_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.direct_messages%rowtype;
  v_peer uuid;
  v_kind text;
  v_closed timestamptz;
  v_media text := nullif(trim(coalesce(p_media_url, '')), '');
  v_meta jsonb;
  v_preview text;
  v_sender_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_media is null then raise exception 'media_url required'; end if;
  if not public.ozellik_bayragi_aktif_mi('messages_enabled') then
    raise exception 'Messages feature disabled';
  end if;

  if not exists (
    select 1 from public.message_thread_members
    where thread_id = p_thread_id and user_id = v_uid
  ) then
    raise exception 'Not a thread member';
  end if;

  select thread_kind, closed_at into v_kind, v_closed
  from public.message_threads where id = p_thread_id;
  if v_closed is not null then raise exception 'Mahkeme / sohbet kapalı'; end if;

  if coalesce(v_kind, 'dm') <> 'mahkeme' then
    select user_id into v_peer
    from public.message_thread_members
    where thread_id = p_thread_id and user_id <> v_uid
    limit 1;
    if v_peer is not null and public.kullanicilar_engelli_mi(v_uid, v_peer) then
      raise exception 'Bu kullaniciyla iletisim engellenmis';
    end if;
  end if;

  if p_client_id is not null then
    select * into v_msg from public.direct_messages
    where sender_id = v_uid and client_id = p_client_id
    limit 1;
    if found then return v_msg; end if;
  end if;

  v_meta := coalesce(p_media_meta, '{}'::jsonb) || jsonb_build_object(
    'file_name', left(coalesce(nullif(trim(p_file_name), ''), 'dosya.pdf'), 120),
    'mime', left(coalesce(nullif(trim(p_mime), ''), 'application/pdf'), 80),
    'kind', 'file'
  );

  insert into public.direct_messages (
    thread_id, sender_id, body, message_type, media_url, client_id, media_meta
  ) values (
    p_thread_id,
    v_uid,
    left(coalesce(nullif(trim(p_body), ''), coalesce(p_file_name, 'Dosya')), 400),
    'file',
    left(v_media, 2000),
    p_client_id,
    v_meta
  )
  returning * into v_msg;

  select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Birisi')
    into v_sender_name from public.profiles where id = v_uid;
  v_preview := left(coalesce(v_msg.body, 'Dosya'), 80);

  update public.message_threads set
    updated_at = now(),
    last_message_at = now(),
    last_message_preview = v_preview
  where id = p_thread_id;

  for v_peer in
    select user_id from public.message_thread_members
    where thread_id = p_thread_id and user_id <> v_uid
  loop
    if coalesce(v_kind, 'dm') = 'mahkeme'
       or not public.kullanicilar_engelli_mi(v_uid, v_peer) then
      perform public.bildirim_kuyruga_ekle(
        v_peer,
        'messages',
        case when coalesce(v_kind, 'dm') = 'mahkeme' then 'Mahkeme' else v_sender_name end,
        v_preview,
        '/mesaj/' || p_thread_id::text,
        jsonb_build_object(
          'thread_id', p_thread_id,
          'sender_id', v_uid,
          'type', case when coalesce(v_kind, 'dm') = 'mahkeme' then 'mahkeme' else 'dm' end,
          'message_type', 'file',
          'message_id', v_msg.id
        )
      );
    end if;
  end loop;

  return v_msg;
end;
$$;

grant execute on function public.mesaj_dosya_gonder(uuid, text, text, text, text, uuid, jsonb) to authenticated;
