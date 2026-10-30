-- VoIP PushKit token: ayrı provider (normal Expo/APNs ile karışmaz)
-- Live Activity feature flags seed (admin remote config)

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

  -- voip = PushKit VoIP; apns/fcm/expo = normal notifications
  if v_provider not in ('apns', 'fcm', 'expo', 'voip') then
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

  update public.device_push_tokens
  set
    active = false,
    notification_enabled = false
  where push_token = v_token
    and id <> v_id
    and active = true
    and push_provider = v_provider;

  if v_provider = 'fcm' then
    update public.device_push_tokens
    set
      active = false,
      notification_enabled = false
    where device_id = p_device_id
      and push_provider = 'expo'
      and active = true;
  end if;

  return v_id;
end;
$$;

grant execute on function public.cihaz_push_token_kaydet(text, text, text, text, text, text, text) to authenticated;

-- Feature flags seed
insert into public.feature_flags (key, enabled, description)
values
  ('ios_dynamic_island_enabled', true, 'iOS Dynamic Island / Live Activities master'),
  ('live_activity_enabled', true, 'ActivityKit Live Activities'),
  ('callkit_enabled', true, 'CallKit + PushKit VoIP incoming calls'),
  ('voice_room_live_activity_enabled', true, 'Voice room Live Activity'),
  ('live_stream_activity_enabled', true, 'Live stream Live Activity'),
  ('upload_activity_enabled', true, 'Video upload Live Activity'),
  ('ai_music_activity_enabled', true, 'AI Music generation Live Activity'),
  ('tournament_activity_enabled', false, 'Long-running tournament Live Activity')
on conflict (key) do nothing;
