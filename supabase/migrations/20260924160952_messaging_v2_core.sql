-- =============================================================================
-- MESSAGING V2 CORE
-- Reply / Edit / Pin / Voice meta / Music / Mute / View-once / Link preview /
-- Feature flags / Edit window config / Idempotent send extensions
-- Backward-compatible with existing direct_messages + mesaj_gonder callers.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Feature flags + kill switch + config
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, description) values
  ('message_reply_enabled', true, 'DM mesaja yanit'),
  ('message_edit_enabled', true, 'DM mesaj duzenleme'),
  ('message_pin_enabled', true, 'DM mesaj sabitleme'),
  ('voice_message_enabled', true, 'DM sesli mesaj'),
  ('music_message_enabled', true, 'DM muzik paylasimi'),
  ('conversation_mute_enabled', true, 'Sohbet bildirim sessize alma'),
  ('view_once_enabled', true, 'Tek goruntulemelik medya'),
  ('offline_outbox_enabled', true, 'Offline mesaj kuyrugu (acil kapatma)'),
  ('link_preview_enabled', true, 'DM link onizleme')
on conflict (key) do nothing;

insert into public.kill_switches (key, active, reason) values
  ('kill_offline_outbox', false, null)
on conflict (key) do nothing;

create table if not exists public.messaging_system_config (
  key text primary key,
  value_int int,
  value_text text,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.messaging_system_config enable row level security;

drop policy if exists "messaging_config_read" on public.messaging_system_config;
create policy "messaging_config_read"
  on public.messaging_system_config for select to authenticated
  using (true);

grant select on public.messaging_system_config to authenticated;

insert into public.messaging_system_config (key, value_int) values
  ('message_edit_window_minutes', 15),
  ('mute_option_1h_minutes', 60),
  ('mute_option_8h_minutes', 480),
  ('mute_option_1d_minutes', 1440),
  ('mute_option_1w_minutes', 10080),
  ('link_preview_cache_ttl_hours', 168),
  ('view_once_retention_hours', 72)
on conflict (key) do nothing;

create or replace function public.messaging_config_int(
  p_key text,
  p_default int default 0
)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value_int from public.messaging_system_config where key = p_key),
    p_default
  );
$$;

grant execute on function public.messaging_config_int(text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 1) direct_messages column extensions
-- ---------------------------------------------------------------------------
alter table public.direct_messages
  add column if not exists edited_at timestamptz,
  add column if not exists edit_version int not null default 0,
  add column if not exists updated_at timestamptz,
  add column if not exists view_once boolean not null default false,
  add column if not exists view_once_opened_at timestamptz,
  add column if not exists view_once_opened_by uuid references public.profiles(id) on delete set null,
  add column if not exists music_track_id uuid references public.music_tracks(id) on delete set null,
  add column if not exists media_meta jsonb not null default '{}'::jsonb,
  add column if not exists link_url text,
  add column if not exists link_preview jsonb;

-- message_type: add music (keep existing values)
alter table public.direct_messages
  drop constraint if exists direct_messages_message_type_check;

alter table public.direct_messages
  add constraint direct_messages_message_type_check
  check (message_type = any (array[
    'text'::text, 'image'::text, 'video'::text, 'voice'::text,
    'emoji'::text, 'gift'::text, 'system'::text, 'shared_post'::text,
    'music'::text
  ]));

create index if not exists direct_messages_reply_to_idx
  on public.direct_messages (reply_to_id)
  where reply_to_id is not null;

create index if not exists direct_messages_music_track_idx
  on public.direct_messages (music_track_id)
  where music_track_id is not null;

create index if not exists direct_messages_view_once_cleanup_idx
  on public.direct_messages (view_once_opened_at)
  where view_once and view_once_opened_at is not null;

-- ---------------------------------------------------------------------------
-- 2) Edit history (moderation only — no public select policy for clients)
-- ---------------------------------------------------------------------------
create table if not exists public.message_edit_history (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  editor_id uuid not null references public.profiles(id) on delete cascade,
  old_text text,
  new_text text,
  edited_at timestamptz not null default now()
);

create index if not exists message_edit_history_msg_idx
  on public.message_edit_history (message_id, edited_at desc);

alter table public.message_edit_history enable row level security;
-- No SELECT for authenticated — moderator via service_role / admin RPCs only

-- ---------------------------------------------------------------------------
-- 3) Conversation pins
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_pins (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  pinned_by uuid not null references public.profiles(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  unique (thread_id, message_id)
);

create index if not exists conversation_pins_thread_idx
  on public.conversation_pins (thread_id, pinned_at desc);

alter table public.conversation_pins enable row level security;

drop policy if exists "conversation_pins_select" on public.conversation_pins;
create policy "conversation_pins_select"
  on public.conversation_pins for select to authenticated
  using (
    exists (
      select 1 from public.message_thread_members m
      where m.thread_id = conversation_pins.thread_id
        and m.user_id = auth.uid()
    )
  );

grant select on public.conversation_pins to authenticated;

-- Soft-delete message → remove pins (hard FK already cascades on hard delete)
create or replace function public.trg_dm_soft_delete_clear_pins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from public.conversation_pins where message_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dm_soft_delete_clear_pins on public.direct_messages;
create trigger trg_dm_soft_delete_clear_pins
  after update of deleted_at on public.direct_messages
  for each row
  execute function public.trg_dm_soft_delete_clear_pins();

-- ---------------------------------------------------------------------------
-- 4) Member settings (mute)
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_member_settings (
  thread_id uuid not null references public.message_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index if not exists conversation_member_settings_mute_idx
  on public.conversation_member_settings (user_id, muted_until)
  where muted_until is not null;

alter table public.conversation_member_settings enable row level security;

drop policy if exists "conversation_member_settings_own" on public.conversation_member_settings;
create policy "conversation_member_settings_own"
  on public.conversation_member_settings for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.conversation_member_settings to authenticated;

create or replace function public.mesaj_thread_muted_mi(
  p_user_id uuid,
  p_thread_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_member_settings s
    where s.user_id = p_user_id
      and s.thread_id = p_thread_id
      and s.muted_until is not null
      and (s.muted_until = 'infinity'::timestamptz or s.muted_until > now())
  );
$$;

-- ---------------------------------------------------------------------------
-- 5) Link preview cache
-- ---------------------------------------------------------------------------
create table if not exists public.link_preview_cache (
  url_hash text primary key,
  url text not null,
  title text,
  description text,
  image_url text,
  site_name text,
  status text not null default 'ok'
    check (status in ('ok', 'failed', 'blocked')),
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  raw_meta jsonb not null default '{}'::jsonb
);

create index if not exists link_preview_cache_expires_idx
  on public.link_preview_cache (expires_at);

alter table public.link_preview_cache enable row level security;

drop policy if exists "link_preview_cache_select" on public.link_preview_cache;
create policy "link_preview_cache_select"
  on public.link_preview_cache for select to authenticated
  using (status = 'ok' and expires_at > now());

grant select on public.link_preview_cache to authenticated;
-- writes via service_role / edge function only

-- ---------------------------------------------------------------------------
-- 6) Storage: allow audio for voice messages
-- ---------------------------------------------------------------------------
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/x-m4a', 'audio/wav'
]
where id = 'dm-media';

-- ---------------------------------------------------------------------------
-- 7) Mute helper + push gate
-- ---------------------------------------------------------------------------
create or replace function public.bildirim_kuyruga_ekle(
  p_user_id uuid,
  p_category text,
  p_title text,
  p_body text default null,
  p_deep_link text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inbox_id uuid;
  v_outbox_id uuid;
  v_cat text := lower(trim(coalesce(p_category, 'system')));
  v_title text;
  v_body text;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_actor uuid;
  v_link text;
  v_mesaj_mi boolean := v_cat in ('messages', 'message');
  v_thread uuid;
begin
  if p_user_id is null then return null; end if;
  if p_title is null or length(trim(p_title)) = 0 then return null; end if;
  if not public.hesap_aktif_mi(p_user_id) then return null; end if;

  v_title := left(trim(p_title), 120);
  v_body := case when p_body is null then null else left(trim(p_body), 400) end;
  v_actor := public.bildirim_payload_actor_id(v_payload);
  v_link := public.bildirim_hedef_link(v_cat, p_deep_link, v_payload);

  if v_actor is not null and (v_payload->>'actor_id') is null then
    v_payload := v_payload || jsonb_build_object('actor_id', v_actor);
  end if;

  -- DM mute: suppress push only (in-app message still delivered via realtime)
  if v_mesaj_mi then
    begin
      v_thread := nullif(v_payload->>'thread_id', '')::uuid;
    exception when others then
      v_thread := null;
    end;
    if v_thread is not null
       and public.ozellik_bayragi_aktif_mi('conversation_mute_enabled')
       and public.mesaj_thread_muted_mi(p_user_id, v_thread) then
      return null;
    end if;

    if public.push_tercihi_aktif_mi(p_user_id, v_cat) then
      insert into public.notification_outbox (
        user_id, category, title, body, deep_link, payload, status
      ) values (
        p_user_id, v_cat, v_title, v_body, v_link, v_payload, 'pending'
      )
      returning id into v_outbox_id;
      return v_outbox_id;
    end if;
    return null;
  end if;

  insert into public.user_notifications (
    user_id, category, title, body, deep_link, payload, actor_id
  ) values (
    p_user_id, v_cat, v_title, v_body, v_link, v_payload, v_actor
  )
  returning id into v_inbox_id;

  if public.push_tercihi_aktif_mi(p_user_id, v_cat) then
    insert into public.notification_outbox (
      user_id, category, title, body, deep_link, payload, status
    ) values (
      p_user_id, v_cat, v_title, v_body, v_link, v_payload, 'pending'
    )
    returning id into v_outbox_id;
  end if;

  return coalesce(v_outbox_id, v_inbox_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Music access check for DM share
-- ---------------------------------------------------------------------------
create or replace function public.mesaj_muzik_erisim_var_mi(
  p_track_id uuid,
  p_viewer uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.music_tracks%rowtype;
begin
  if p_track_id is null or p_viewer is null then return false; end if;
  select * into v_row from public.music_tracks where id = p_track_id;
  if not found then return false; end if;
  if v_row.soft_deleted_at is not null then return false; end if;
  if coalesce(v_row.status, '') <> 'READY' then return false; end if;
  if coalesce(v_row.moderation_status, 'approved') in ('rejected', 'removed', 'blocked') then
    return false;
  end if;
  -- Public library track
  if coalesce(v_row.is_active, false)
     and coalesce(v_row.source, 'library') <> 'ai_user' then
    return true;
  end if;
  -- Owner AI track
  if v_row.owner_user_id = p_viewer then return true; end if;
  -- Shared to recipient: allow play if message exists in a shared thread (checked at consume time)
  -- For send: only owner or public library
  return false;
end;
$$;

-- Recipient may play a music message if they are thread members and track still accessible
create or replace function public.mesaj_muzik_alici_erisim_var_mi(
  p_track_id uuid,
  p_viewer uuid default auth.uid()
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.music_tracks%rowtype;
begin
  if p_track_id is null or p_viewer is null then return false; end if;
  select * into v_row from public.music_tracks where id = p_track_id;
  if not found then return false; end if;
  if v_row.soft_deleted_at is not null then return false; end if;
  if coalesce(v_row.status, '') <> 'READY' then return false; end if;
  if coalesce(v_row.moderation_status, 'approved') in ('rejected', 'removed', 'blocked') then
    return false;
  end if;
  if coalesce(v_row.is_active, false) then return true; end if;
  if v_row.owner_user_id = p_viewer then return true; end if;
  -- Shared via DM: any thread member who received a music message for this track
  return exists (
    select 1
    from public.direct_messages dm
    join public.message_thread_members m on m.thread_id = dm.thread_id
    where dm.music_track_id = p_track_id
      and dm.message_type = 'music'
      and dm.deleted_at is null
      and m.user_id = p_viewer
  );
end;
$$;

grant execute on function public.mesaj_muzik_erisim_var_mi(uuid, uuid) to authenticated;
grant execute on function public.mesaj_muzik_alici_erisim_var_mi(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) mesaj_gonder — extended (reply / music / view_once / media_meta)
-- ---------------------------------------------------------------------------
drop function if exists public.mesaj_gonder(uuid, text, text, text, uuid);

create or replace function public.mesaj_gonder(
  p_thread_id uuid,
  p_body text default '',
  p_message_type text default 'text',
  p_media_url text default null,
  p_client_id uuid default null,
  p_reply_to_id uuid default null,
  p_music_track_id uuid default null,
  p_view_once boolean default false,
  p_media_meta jsonb default null
)
returns public.direct_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_guest boolean;
  v_msg public.direct_messages%rowtype;
  v_peer uuid;
  v_sender_name text;
  v_preview text;
  v_type text := lower(coalesce(nullif(trim(p_message_type), ''), 'text'));
  v_body text := coalesce(p_body, '');
  v_media text := nullif(trim(coalesce(p_media_url, '')), '');
  v_kind text;
  v_closed timestamptz;
  v_reply public.direct_messages%rowtype;
  v_view_once boolean := coalesce(p_view_once, false);
  v_meta jsonb := coalesce(p_media_meta, '{}'::jsonb);
  v_track public.music_tracks%rowtype;
  v_link text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_type not in ('text','image','video','voice','emoji','gift','system','music') then
    raise exception 'Invalid message type';
  end if;
  if public.kill_switch_aktif_mi('kill_gift_send') and v_type = 'gift' then
    raise exception 'Gift messages disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('messages_enabled') then
    raise exception 'Messages feature disabled';
  end if;
  if v_type = 'voice' and not public.ozellik_bayragi_aktif_mi('voice_message_enabled') then
    raise exception 'Voice messages disabled';
  end if;
  if v_type = 'music' and not public.ozellik_bayragi_aktif_mi('music_message_enabled') then
    raise exception 'Music messages disabled';
  end if;
  if v_view_once and not public.ozellik_bayragi_aktif_mi('view_once_enabled') then
    raise exception 'View once disabled';
  end if;
  if p_reply_to_id is not null and not public.ozellik_bayragi_aktif_mi('message_reply_enabled') then
    raise exception 'Reply disabled';
  end if;

  select is_guest into v_is_guest from public.profiles where id = v_uid;
  if coalesce(v_is_guest, false) then
    raise exception 'Guest cannot send messages';
  end if;

  if not exists (
    select 1 from public.message_thread_members
    where thread_id = p_thread_id and user_id = v_uid
  ) then
    raise exception 'Not a thread member';
  end if;

  select thread_kind, closed_at into v_kind, v_closed
  from public.message_threads where id = p_thread_id;

  if v_closed is not null then
    raise exception 'Mahkeme / sohbet kapalı';
  end if;

  if coalesce(v_kind, 'dm') <> 'mahkeme' then
    select user_id into v_peer
    from public.message_thread_members
    where thread_id = p_thread_id and user_id <> v_uid
    limit 1;
    if v_peer is not null and public.kullanicilar_engelli_mi(v_uid, v_peer) then
      raise exception 'Bu kullaniciyla iletisim engellenmis';
    end if;
  end if;

  -- Idempotency
  if p_client_id is not null then
    select * into v_msg from public.direct_messages
    where sender_id = v_uid and client_id = p_client_id
    limit 1;
    if found then return v_msg; end if;
  end if;

  -- Reply: same thread only
  if p_reply_to_id is not null then
    select * into v_reply from public.direct_messages where id = p_reply_to_id;
    if not found then
      raise exception 'Reply target not found';
    end if;
    if v_reply.thread_id <> p_thread_id then
      raise exception 'Reply must be same conversation';
    end if;
  end if;

  -- View once only for image/video
  if v_view_once and v_type not in ('image', 'video') then
    raise exception 'View once only for image/video';
  end if;

  if v_type = 'music' then
    if p_music_track_id is null then raise exception 'Music track required'; end if;
    if not public.mesaj_muzik_erisim_var_mi(p_music_track_id, v_uid) then
      raise exception 'Music access denied';
    end if;
    select * into v_track from public.music_tracks where id = p_music_track_id;
    v_meta := v_meta || jsonb_build_object(
      'music_snapshot', jsonb_build_object(
        'title', v_track.title,
        'cover_url', v_track.cover_url,
        'artist_name', coalesce(v_track.artist_name, ''),
        'duration_ms', v_track.duration_ms
      )
    );
  elsif v_type in ('image','video','voice') then
    if v_media is null then raise exception 'Media required'; end if;
  elsif length(trim(v_body)) = 0 then
    raise exception 'Empty message';
  end if;

  -- Extract first http(s) URL for link preview hook (client/edge fills later)
  if v_type = 'text' then
    v_link := substring(v_body from $re$https?://[^\s<>"']+$re$);
    if v_link is not null then
      v_link := left(v_link, 2048);
    end if;
  end if;

  v_preview := case
    when v_view_once and v_type = 'image' then '① Fotoğraf'
    when v_view_once and v_type = 'video' then '① Video'
    when v_type = 'image' then '📷 Fotoğraf'
    when v_type = 'video' then '🎥 Video'
    when v_type = 'voice' then '🎤 Ses'
    when v_type = 'music' then '🎵 ' || left(coalesce(v_track.title, 'Müzik'), 100)
    when v_type = 'system' then left(trim(v_body), 120)
    else left(trim(v_body), 120)
  end;

  insert into public.direct_messages (
    thread_id, sender_id, body, message_type, media_url, client_id,
    reply_to_id, music_track_id, view_once, media_meta, link_url, updated_at
  ) values (
    p_thread_id,
    v_uid,
    case when length(trim(v_body)) = 0 then null else left(trim(v_body), 4000) end,
    v_type,
    v_media,
    p_client_id,
    p_reply_to_id,
    p_music_track_id,
    v_view_once,
    v_meta,
    v_link,
    now()
  )
  returning * into v_msg;

  update public.message_threads set
    updated_at = now(),
    last_message_at = now(),
    last_message_preview = v_preview
  where id = p_thread_id;

  update public.message_thread_members set
    archived_at = null,
    deleted_at = null
  where thread_id = p_thread_id
    and (archived_at is not null or deleted_at is not null);

  select coalesce(display_name, username, 'Birisi') into v_sender_name
  from public.profiles where id = v_uid;

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
          'message_type', v_type,
          'message_id', v_msg.id
        )
      );
    end if;
  end loop;

  return v_msg;
end;
$$;

grant execute on function public.mesaj_gonder(uuid, text, text, text, uuid, uuid, uuid, boolean, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Edit message
-- ---------------------------------------------------------------------------
create or replace function public.mesaj_duzenle(
  p_message_id uuid,
  p_new_body text,
  p_expected_version int default null
)
returns public.direct_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.direct_messages%rowtype;
  v_window int;
  v_new text := left(trim(coalesce(p_new_body, '')), 4000);
  v_link text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.ozellik_bayragi_aktif_mi('message_edit_enabled') then
    raise exception 'Edit disabled';
  end if;
  if length(v_new) = 0 then raise exception 'Empty message'; end if;

  select * into v_msg from public.direct_messages where id = p_message_id for update;
  if not found then raise exception 'Not found'; end if;
  if v_msg.sender_id <> v_uid then raise exception 'Forbidden'; end if;
  if v_msg.deleted_at is not null then raise exception 'Deleted'; end if;
  if v_msg.message_type <> 'text' then raise exception 'Only text editable'; end if;

  if p_expected_version is not null and v_msg.edit_version <> p_expected_version then
    raise exception 'Version conflict';
  end if;

  v_window := public.messaging_config_int('message_edit_window_minutes', 15);
  if v_msg.created_at < now() - make_interval(mins => v_window) then
    raise exception 'Edit window expired';
  end if;

  insert into public.message_edit_history (message_id, editor_id, old_text, new_text)
  values (v_msg.id, v_uid, v_msg.body, v_new);

  v_link := substring(v_new from $re$https?://[^\s<>"']+$re$);
  if v_link is not null then v_link := left(v_link, 2048); end if;

  update public.direct_messages set
    body = v_new,
    edited_at = now(),
    edit_version = edit_version + 1,
    updated_at = now(),
    link_url = v_link,
    link_preview = case
      when v_link is null then null
      when link_url is distinct from v_link then null
      else link_preview
    end
  where id = v_msg.id
  returning * into v_msg;

  -- Refresh thread preview if this was last message
  update public.message_threads t set
    last_message_preview = left(v_new, 120),
    updated_at = now()
  where t.id = v_msg.thread_id
    and t.last_message_at is not distinct from v_msg.created_at;

  return v_msg;
end;
$$;

grant execute on function public.mesaj_duzenle(uuid, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 11) Pin / unpin
-- ---------------------------------------------------------------------------
create or replace function public.mesaj_sabitle(
  p_message_id uuid
)
returns public.conversation_pins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.direct_messages%rowtype;
  v_pin public.conversation_pins%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.ozellik_bayragi_aktif_mi('message_pin_enabled') then
    raise exception 'Pin disabled';
  end if;

  select * into v_msg from public.direct_messages where id = p_message_id;
  if not found or v_msg.deleted_at is not null then raise exception 'Not found'; end if;

  if not exists (
    select 1 from public.message_thread_members
    where thread_id = v_msg.thread_id and user_id = v_uid
  ) then
    raise exception 'Forbidden';
  end if;

  insert into public.conversation_pins (thread_id, message_id, pinned_by)
  values (v_msg.thread_id, v_msg.id, v_uid)
  on conflict (thread_id, message_id) do update
    set pinned_by = excluded.pinned_by,
        pinned_at = now()
  returning * into v_pin;

  return v_pin;
end;
$$;

create or replace function public.mesaj_sabitlemeyi_kaldir(
  p_message_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.direct_messages%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_msg from public.direct_messages where id = p_message_id;
  if not found then return false; end if;

  if not exists (
    select 1 from public.message_thread_members
    where thread_id = v_msg.thread_id and user_id = v_uid
  ) then
    raise exception 'Forbidden';
  end if;

  delete from public.conversation_pins
  where message_id = p_message_id and thread_id = v_msg.thread_id;

  return true;
end;
$$;

create or replace function public.mesaj_sabitlenenleri_getir(p_thread_id uuid)
returns setof public.conversation_pins
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not exists (
    select 1 from public.message_thread_members
    where thread_id = p_thread_id and user_id = v_uid
  ) then
    raise exception 'Forbidden';
  end if;

  return query
  select p.*
  from public.conversation_pins p
  join public.direct_messages m on m.id = p.message_id
  where p.thread_id = p_thread_id
    and m.deleted_at is null
  order by p.pinned_at desc;
end;
$$;

grant execute on function public.mesaj_sabitle(uuid) to authenticated;
grant execute on function public.mesaj_sabitlemeyi_kaldir(uuid) to authenticated;
grant execute on function public.mesaj_sabitlenenleri_getir(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 12) Mute / unmute
-- ---------------------------------------------------------------------------
create or replace function public.mesaj_thread_sessize_al(
  p_thread_id uuid,
  p_minutes int default null,
  p_forever boolean default false
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_until timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.ozellik_bayragi_aktif_mi('conversation_mute_enabled') then
    raise exception 'Mute disabled';
  end if;
  if not exists (
    select 1 from public.message_thread_members
    where thread_id = p_thread_id and user_id = v_uid
  ) then
    raise exception 'Forbidden';
  end if;

  if coalesce(p_forever, false) then
    v_until := 'infinity'::timestamptz;
  elsif p_minutes is null or p_minutes <= 0 then
    raise exception 'Invalid mute duration';
  else
    v_until := now() + make_interval(mins => p_minutes);
  end if;

  insert into public.conversation_member_settings (thread_id, user_id, muted_until, updated_at)
  values (p_thread_id, v_uid, v_until, now())
  on conflict (thread_id, user_id) do update
    set muted_until = excluded.muted_until,
        updated_at = now();

  return v_until;
end;
$$;

create or replace function public.mesaj_thread_sessizi_ac(p_thread_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  update public.conversation_member_settings
  set muted_until = null, updated_at = now()
  where thread_id = p_thread_id and user_id = v_uid;
  return true;
end;
$$;

create or replace function public.mesaj_thread_mute_get(p_thread_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_until timestamptz;
begin
  if v_uid is null then return null; end if;
  select muted_until into v_until
  from public.conversation_member_settings
  where thread_id = p_thread_id and user_id = v_uid;
  if v_until is null then return null; end if;
  if v_until <> 'infinity'::timestamptz and v_until <= now() then
    return null;
  end if;
  return v_until;
end;
$$;

grant execute on function public.mesaj_thread_sessize_al(uuid, int, boolean) to authenticated;
grant execute on function public.mesaj_thread_sessizi_ac(uuid) to authenticated;
grant execute on function public.mesaj_thread_mute_get(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 13) View-once atomic consume
-- ---------------------------------------------------------------------------
create or replace function public.mesaj_view_once_ac(p_message_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.direct_messages%rowtype;
  v_media text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.ozellik_bayragi_aktif_mi('view_once_enabled') then
    raise exception 'View once disabled';
  end if;

  select * into v_msg
  from public.direct_messages
  where id = p_message_id
  for update;

  if not found then
    return jsonb_build_object('state', 'UNAVAILABLE');
  end if;

  if not exists (
    select 1 from public.message_thread_members
    where thread_id = v_msg.thread_id and user_id = v_uid
  ) then
    raise exception 'Forbidden';
  end if;

  if not v_msg.view_once or v_msg.message_type not in ('image', 'video') then
    return jsonb_build_object('state', 'UNAVAILABLE');
  end if;

  if v_msg.deleted_at is not null then
    return jsonb_build_object('state', 'UNAVAILABLE');
  end if;

  -- Sender may see consumed state but not re-open media after peer opened
  if v_msg.view_once_opened_at is not null then
    return jsonb_build_object(
      'state', 'CONSUMED',
      'opened_at', v_msg.view_once_opened_at,
      'opened_by', v_msg.view_once_opened_by,
      'is_sender', v_msg.sender_id = v_uid
    );
  end if;

  -- Only recipient consumes
  if v_msg.sender_id = v_uid then
    return jsonb_build_object(
      'state', 'AVAILABLE',
      'media_url', v_msg.media_url,
      'message_type', v_msg.message_type,
      'is_sender', true
    );
  end if;

  update public.direct_messages set
    view_once_opened_at = now(),
    view_once_opened_by = v_uid,
    updated_at = now()
  where id = v_msg.id
    and view_once_opened_at is null
  returning * into v_msg;

  if v_msg.view_once_opened_by is distinct from v_uid then
    -- Lost race
    return jsonb_build_object('state', 'CONSUMED');
  end if;

  v_media := v_msg.media_url;
  return jsonb_build_object(
    'state', 'OPENING',
    'media_url', v_media,
    'message_type', v_msg.message_type,
    'opened_at', v_msg.view_once_opened_at
  );
end;
$$;

grant execute on function public.mesaj_view_once_ac(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 14) Fetch around message (reply / pin jump)
-- ---------------------------------------------------------------------------
create or replace function public.mesajlari_hedef_cevresinde_getir(
  p_thread_id uuid,
  p_message_id uuid,
  p_before_limit int default 30,
  p_after_limit int default 30
)
returns setof public.direct_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_clear timestamptz;
  v_kind text;
  v_peer uuid;
  v_target public.direct_messages%rowtype;
  v_before int := least(greatest(coalesce(p_before_limit, 30), 0), 50);
  v_after int := least(greatest(coalesce(p_after_limit, 30), 0), 50);
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select clear_before into v_clear
  from public.message_thread_members
  where thread_id = p_thread_id and user_id = v_uid;
  if not found then raise exception 'Forbidden'; end if;

  select coalesce(t.thread_kind, 'dm') into v_kind
  from public.message_threads t where t.id = p_thread_id;

  if coalesce(v_kind, 'dm') <> 'mahkeme' then
    select m.user_id into v_peer
    from public.message_thread_members m
    where m.thread_id = p_thread_id and m.user_id <> v_uid
    limit 1;
    if v_peer is not null and public.kullanicilar_engelli_mi(v_uid, v_peer) then
      raise exception 'Bu kullaniciyla iletisim engellenmis';
    end if;
  end if;

  select * into v_target from public.direct_messages
  where id = p_message_id and thread_id = p_thread_id;
  if not found then raise exception 'Not found'; end if;

  return query
  with base as (
    select m.*
    from public.direct_messages m
    where m.thread_id = p_thread_id
      and m.deleted_at is null
      and (v_clear is null or m.created_at > v_clear)
      and not exists (
        select 1 from public.direct_message_hidden h
        where h.user_id = v_uid and h.message_id = m.id
      )
  ),
  before_rows as (
    select * from base
    where created_at < v_target.created_at
       or (created_at = v_target.created_at and id < v_target.id)
    order by created_at desc, id desc
    limit v_before
  ),
  after_rows as (
    select * from base
    where created_at > v_target.created_at
       or (created_at = v_target.created_at and id > v_target.id)
    order by created_at asc, id asc
    limit v_after
  ),
  target_row as (
    select * from base where id = v_target.id
  )
  select * from before_rows
  union all
  select * from target_row
  union all
  select * from after_rows
  order by created_at asc, id asc;
end;
$$;

grant execute on function public.mesajlari_hedef_cevresinde_getir(uuid, uuid, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 15) Attach link preview (edge / trusted caller via service role typically)
--    Authenticated member may attach only OK cached preview for own-thread msg
-- ---------------------------------------------------------------------------
create or replace function public.mesaj_link_preview_bagla(
  p_message_id uuid,
  p_preview jsonb
)
returns public.direct_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.direct_messages%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.ozellik_bayragi_aktif_mi('link_preview_enabled') then
    raise exception 'Link preview disabled';
  end if;

  select * into v_msg from public.direct_messages where id = p_message_id for update;
  if not found then raise exception 'Not found'; end if;

  if not exists (
    select 1 from public.message_thread_members
    where thread_id = v_msg.thread_id and user_id = v_uid
  ) then
    raise exception 'Forbidden';
  end if;

  if v_msg.link_url is null then raise exception 'No link'; end if;

  update public.direct_messages set
    link_preview = p_preview,
    updated_at = now()
  where id = v_msg.id
  returning * into v_msg;

  return v_msg;
end;
$$;

grant execute on function public.mesaj_link_preview_bagla(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 16) Soft-delete clears view-once media path hint (moderation keeps history row)
-- ---------------------------------------------------------------------------
create or replace function public.mesaj_view_once_cleanup_batch(p_limit int default 100)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours int := public.messaging_config_int('view_once_retention_hours', 72);
  v_n int := 0;
begin
  with doomed as (
    select id
    from public.direct_messages
    where view_once
      and view_once_opened_at is not null
      and view_once_opened_at < now() - make_interval(hours => v_hours)
      and media_url is not null
    limit least(greatest(coalesce(p_limit, 100), 1), 500)
  )
  update public.direct_messages d set
    media_url = null,
    media_meta = coalesce(media_meta, '{}'::jsonb) || jsonb_build_object('cleaned', true),
    updated_at = now()
  from doomed
  where d.id = doomed.id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- service_role only intended; no grant to authenticated
