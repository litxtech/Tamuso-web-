-- Mevcut hesap girişi güvenlik taraması ve bildirim göndermesin.
-- Tarama (platform uyarısı + push) yalnızca kullanıcının ilk cihaz oturumunda kalsın
-- (yeni kayıt). Sonraki girişler yalnızca oturumu yeniler.

create or replace function public.cihaz_oturumu_kaydet(
  p_device_id text,
  p_platform text default 'unknown',
  p_device_model text default null,
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
  v_uid uuid := auth.uid();
  v_id uuid;
  v_ilk_oturum boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_device_id is null or length(trim(p_device_id)) = 0 then
    raise exception 'device_id required';
  end if;

  select not exists (
    select 1
    from public.device_sessions ds
    where ds.user_id = v_uid
  ) into v_ilk_oturum;

  insert into public.device_sessions (
    user_id, device_id, platform, device_model, app_version, locale, timezone, last_seen_at
  ) values (
    v_uid, p_device_id, coalesce(p_platform, 'unknown'),
    p_device_model, p_app_version, p_locale, p_timezone, now()
  )
  on conflict (user_id, device_id) do update set
    platform = excluded.platform,
    device_model = coalesce(excluded.device_model, device_sessions.device_model),
    app_version = coalesce(excluded.app_version, device_sessions.app_version),
    locale = coalesce(excluded.locale, device_sessions.locale),
    timezone = coalesce(excluded.timezone, device_sessions.timezone),
    last_seen_at = now(),
    revoked_at = null
  returning id into v_id;

  if v_ilk_oturum then
    begin
      perform public.platform_guvenlik_kayit_tara(p_device_id);
    exception when others then
      raise warning 'cihaz_oturumu_kaydet tarama: %', sqlerrm;
    end;
  end if;

  return v_id;
end;
$$;

grant execute on function public.cihaz_oturumu_kaydet(text, text, text, text, text, text) to authenticated;
