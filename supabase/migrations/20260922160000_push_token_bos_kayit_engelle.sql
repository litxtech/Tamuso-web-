-- Push token temizligi: bos/olu kayitlari kapat, RPC bos token kabul etmesin

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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Bos token ile apns/fcm/expo satiri yazma (olu kayit uretme)
  if v_token is null or length(v_token) < 8 then
    return null;
  end if;

  if v_provider not in ('apns', 'fcm', 'expo') then
    return null;
  end if;

  -- iOS icin tercih: expo (APNs Expo uzerinden). Bos apns engellendi zaten.
  insert into public.device_push_tokens (
    user_id, device_id, platform, push_provider, push_token,
    app_version, locale, timezone, last_seen_at, active, notification_enabled
  ) values (
    auth.uid(), p_device_id, p_platform, v_provider, v_token,
    p_app_version, p_locale, p_timezone, now(), true, true
  )
  on conflict (device_id, push_provider) do update set
    user_id = coalesce(auth.uid(), device_push_tokens.user_id),
    push_token = excluded.push_token,
    app_version = coalesce(excluded.app_version, device_push_tokens.app_version),
    locale = coalesce(excluded.locale, device_push_tokens.locale),
    timezone = coalesce(excluded.timezone, device_push_tokens.timezone),
    last_seen_at = now(),
    active = true,
    notification_enabled = true
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.cihaz_push_token_kaydet(text, text, text, text, text, text, text) to authenticated;

-- Olu / bos tokenlari deaktif et
update public.device_push_tokens
set
  active = false,
  notification_enabled = false,
  push_token = null
where coalesce(trim(push_token), '') = ''
   or (
     push_provider = 'apns'
     and (push_token is null or length(trim(push_token)) < 8)
   );

-- notification_enabled false ama tokenu olan eski expo: dokunma (kullanici tercihi)
-- Sadece tamamen bos olanlari kapattik
