-- Push tercihleri: calls + agency kolonlari, bilinmeyen kategori = false,
-- inbox da tercihe bagli, token kaydi all_enabled'i ezmesin, arama = calls.

alter table public.user_push_preferences
  add column if not exists calls boolean not null default true;

alter table public.user_push_preferences
  add column if not exists agency boolean not null default true;

create or replace function public.push_tercihi_aktif_mi(
  p_user_id uuid,
  p_category text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.user_push_preferences%rowtype;
  v_cat text := lower(trim(coalesce(p_category, 'system')));
begin
  if p_user_id is null then return false; end if;
  v_row := public.push_tercih_satiri_al(p_user_id);
  if not v_row.all_enabled then return false; end if;

  return case v_cat
    when 'messages' then v_row.messages
    when 'message' then v_row.messages
    when 'gifts' then v_row.gifts
    when 'gift' then v_row.gifts
    when 'live' then v_row.live
    when 'rooms' then v_row.rooms
    when 'room' then v_row.rooms
    when 'social' then v_row.social
    when 'follow' then v_row.social
    when 'wallet' then v_row.wallet
    when 'system' then v_row.system
    when 'calls' then coalesce(v_row.calls, true)
    when 'call' then coalesce(v_row.calls, true)
    when 'agency' then coalesce(v_row.agency, true)
    when 'agency_announcement' then coalesce(v_row.agency, true)
    else false
  end;
end;
$$;

-- Inbox + push tercihe bagli (mesajlar yine inbox'a yazılmaz)
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

  -- Tercih kapalıysa ne inbox ne push
  if not public.push_tercihi_aktif_mi(p_user_id, v_cat) then
    return null;
  end if;

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

    insert into public.notification_outbox (
      user_id, category, title, body, deep_link, payload, status
    ) values (
      p_user_id, v_cat, v_title, v_body, v_link, v_payload, 'pending'
    )
    returning id into v_outbox_id;
    return v_outbox_id;
  end if;

  insert into public.user_notifications (
    user_id, category, title, body, deep_link, payload, actor_id
  ) values (
    p_user_id, v_cat, v_title, v_body, v_link, v_payload, v_actor
  )
  returning id into v_inbox_id;

  insert into public.notification_outbox (
    user_id, category, title, body, deep_link, payload, status
  ) values (
    p_user_id, v_cat, v_title, v_body, v_link, v_payload, 'pending'
  )
  returning id into v_outbox_id;

  return coalesce(v_outbox_id, v_inbox_id);
end;
$$;

drop function if exists public.benim_push_tercihlerimi_kaydet(
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
);

create or replace function public.benim_push_tercihlerimi_kaydet(
  p_all_enabled boolean default null,
  p_messages boolean default null,
  p_gifts boolean default null,
  p_live boolean default null,
  p_rooms boolean default null,
  p_social boolean default null,
  p_wallet boolean default null,
  p_system boolean default null,
  p_calls boolean default null,
  p_agency boolean default null
)
returns public.user_push_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_push_preferences%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.push_tercih_satiri_al(v_uid);

  update public.user_push_preferences set
    all_enabled = coalesce(p_all_enabled, all_enabled),
    messages = coalesce(p_messages, messages),
    gifts = coalesce(p_gifts, gifts),
    live = coalesce(p_live, live),
    rooms = coalesce(p_rooms, rooms),
    social = coalesce(p_social, social),
    wallet = coalesce(p_wallet, wallet),
    system = coalesce(p_system, system),
    calls = coalesce(p_calls, calls),
    agency = coalesce(p_agency, agency),
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  if p_all_enabled is not null then
    update public.device_push_tokens
    set notification_enabled = p_all_enabled
    where user_id = v_uid;
  end if;

  return v_row;
end;
$$;

grant execute on function public.benim_push_tercihlerimi_kaydet(
  boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean
) to authenticated;

-- Token yenileme kullanıcının master tercihine saygı duyar
create or replace function public.cihaz_push_token_kaydet(
  p_device_id text,
  p_platform text,
  p_push_provider text,
  p_push_token text default null,
  p_app_version text default null,
  p_locale text default null,
  p_timezone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text := nullif(trim(coalesce(p_push_token, '')), '');
  v_provider text := lower(trim(coalesce(p_push_provider, '')));
  v_enabled boolean := true;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if v_token is null or length(v_token) < 8 then
    return null;
  end if;

  if v_provider not in ('apns', 'fcm', 'expo') then
    return null;
  end if;

  select coalesce(all_enabled, true) into v_enabled
  from public.user_push_preferences
  where user_id = auth.uid();

  if not found then
    v_enabled := true;
  end if;

  insert into public.device_push_tokens (
    user_id, device_id, platform, push_provider, push_token,
    app_version, locale, timezone, last_seen_at, active, notification_enabled
  ) values (
    auth.uid(), p_device_id, p_platform, v_provider, v_token,
    p_app_version, p_locale, p_timezone, now(), true, v_enabled
  )
  on conflict (device_id, push_provider) do update set
    user_id = coalesce(auth.uid(), device_push_tokens.user_id),
    push_token = excluded.push_token,
    app_version = coalesce(excluded.app_version, device_push_tokens.app_version),
    locale = coalesce(excluded.locale, device_push_tokens.locale),
    timezone = coalesce(excluded.timezone, device_push_tokens.timezone),
    last_seen_at = now(),
    active = true,
    notification_enabled = v_enabled
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.cihaz_push_token_kaydet(text, text, text, text, text, text, text) to authenticated;

-- Gelen arama → calls kategorisi (mesajlar kapalıyken arama çalışsın)
create or replace function public.gorusme_baslat(
  p_thread_id uuid,
  p_call_type text
)
returns public.direct_calls
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_peer uuid;
  v_guest boolean;
  v_type text := lower(trim(p_call_type));
  v_row public.direct_calls%rowtype;
  v_channel text;
  v_stale public.direct_calls%rowtype;
  v_caller_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_type not in ('audio', 'video') then raise exception 'Gecersiz cagri turu'; end if;

  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir arama yapamaz'; end if;

  if not exists (
    select 1 from public.message_thread_members
    where thread_id = p_thread_id and user_id = v_uid
  ) then
    raise exception 'Not a thread member';
  end if;

  select user_id into v_peer
  from public.message_thread_members
  where thread_id = p_thread_id and user_id <> v_uid
  limit 1;
  if v_peer is null then raise exception 'Karsi taraf yok'; end if;

  perform public.gorusme_stale_temizle();

  update public.direct_calls set
    status = case
      when status = 'ringing' and caller_id = v_uid then 'cancelled'
      when status = 'ringing' then 'missed'
      else 'ended'
    end,
    ended_at = now(),
    ended_by = v_uid,
    end_reason = 'replaced_by_new_call'
  where status in ('ringing', 'active')
    and (
      (caller_id = v_uid and callee_id = v_peer)
      or (caller_id = v_peer and callee_id = v_uid)
    );

  select * into v_stale
  from public.direct_calls
  where status in ('ringing', 'active')
    and (
      (caller_id = v_uid and callee_id = v_peer)
      or (caller_id = v_peer and callee_id = v_uid)
    )
  order by started_at desc
  limit 1;

  if found then
    raise exception 'Zaten aktif bir gorusme var';
  end if;

  v_channel := 'dm_call_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.direct_calls (
    thread_id, caller_id, callee_id, call_type, status, channel_name
  ) values (
    p_thread_id, v_uid, v_peer, v_type, 'ringing', v_channel
  ) returning * into v_row;

  insert into public.direct_messages (thread_id, sender_id, body, message_type)
  values (
    p_thread_id,
    v_uid,
    case when v_type = 'video' then '📹 Görüntülü arama' else '📞 Sesli arama' end,
    'system'
  );

  update public.message_threads set
    updated_at = now(),
    last_message_at = now(),
    last_message_preview = case when v_type = 'video' then 'Görüntülü arama' else 'Sesli arama' end
  where id = p_thread_id;

  begin
    select coalesce(
      nullif(trim(display_name), ''),
      nullif(trim(username), ''),
      'Birisi'
    ) into v_caller_name
    from public.profiles where id = v_uid;

    perform public.bildirim_kuyruga_ekle(
      v_peer,
      'calls',
      v_caller_name || ' arıyor',
      case when v_type = 'video' then 'Görüntülü arama' else 'Sesli arama' end,
      '/gorusme/' || v_row.id::text,
      jsonb_build_object(
        'type', 'incoming_call',
        'call_id', v_row.id,
        'call_type', v_type,
        'caller_id', v_uid,
        'thread_id', p_thread_id,
        'channel_name', v_channel
      )
    );
  exception when others then
    null;
  end;

  return v_row;
end;
$$;

grant execute on function public.gorusme_baslat(uuid, text) to authenticated;
