-- Push duplicate fix:
-- 1) outbox claim (processing) — trigger + client worker yarışını kes
-- 2) aynı push_token birden fazla satırda aktif olmasın

alter table public.notification_outbox
  drop constraint if exists notification_outbox_status_check;

alter table public.notification_outbox
  add constraint notification_outbox_status_check
  check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled'));

-- Takılı processing (worker crash) → tekrar pending
create or replace function public.notification_outbox_stuck_reclaim(
  p_older_than_seconds int default 120
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
  v_sec int := greatest(coalesce(p_older_than_seconds, 120), 30);
begin
  update public.notification_outbox
  set status = 'pending',
      processed_at = null
  where status = 'processing'
    and coalesce(processed_at, created_at) < now() - make_interval(secs => v_sec);

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.notification_outbox_stuck_reclaim(int) from public;
grant execute on function public.notification_outbox_stuck_reclaim(int) to service_role;

-- Atomik claim: FOR UPDATE SKIP LOCKED
create or replace function public.notification_outbox_claim(p_limit int default 50)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  perform public.notification_outbox_stuck_reclaim(120);

  return query
  with picked as (
    select o.id
    from public.notification_outbox o
    where o.status = 'pending'
    order by o.created_at asc
    for update skip locked
    limit v_limit
  ),
  claimed as (
    update public.notification_outbox n
    set status = 'processing',
        processed_at = now()
    from picked p
    where n.id = p.id
    returning n.*
  )
  select * from claimed
  order by created_at asc;
end;
$$;

revoke all on function public.notification_outbox_claim(int) from public;
grant execute on function public.notification_outbox_claim(int) to service_role;

-- Aynı token: en yeni satırı tut, diğerlerini kapat
with ranked as (
  select
    id,
    row_number() over (
      partition by push_token
      order by last_seen_at desc nulls last, created_at desc
    ) as rn
  from public.device_push_tokens
  where active = true
    and notification_enabled = true
    and coalesce(trim(push_token), '') <> ''
)
update public.device_push_tokens d
set
  active = false,
  notification_enabled = false
from ranked r
where d.id = r.id
  and r.rn > 1;

-- Token kaydında aynı push_token'ı tekilleştir
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

  -- Aynı token başka device_id satırlarında aktif kalmasın (çift push)
  update public.device_push_tokens
  set
    active = false,
    notification_enabled = false
  where push_token = v_token
    and id <> v_id
    and active = true;

  -- Android: FCM kaydı varsa aynı cihazdaki expo yedğini kapat (çift kanal)
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

-- Mevcut Android çift kanal: FCM aktifse aynı device expo'yu kapat
update public.device_push_tokens e
set
  active = false,
  notification_enabled = false
from public.device_push_tokens f
where e.device_id = f.device_id
  and e.push_provider = 'expo'
  and f.push_provider = 'fcm'
  and f.active = true
  and f.notification_enabled = true
  and coalesce(trim(f.push_token), '') <> ''
  and e.active = true;
