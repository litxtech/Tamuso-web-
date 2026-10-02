-- Uygulama sürüm politikası (zorunlu / isteğe bağlı güncelleme).
-- Doğrudan tablo erişimi yok. Okuma anon RPC, yazma yalnız admin RPC.

create table if not exists public.app_version_policies (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('ios', 'android')),
  latest_version text not null,
  latest_build integer not null check (latest_build >= 0),
  minimum_supported_version text not null,
  minimum_supported_build integer not null check (minimum_supported_build >= 0),
  force_update_enabled boolean not null default false,
  optional_update_enabled boolean not null default false,
  update_title text not null default '',
  update_message text not null default '',
  button_text text not null default '',
  store_url text not null default '',
  maintenance_message text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint app_version_policies_semver_chk check (
    latest_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
    and minimum_supported_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  )
);

create unique index if not exists app_version_policies_active_platform_uidx
  on public.app_version_policies (platform)
  where is_active;

create table if not exists public.app_version_policy_audits (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid,
  actor_id uuid,
  platform text not null,
  old_minimum_version text,
  new_minimum_version text,
  old_minimum_build integer,
  new_minimum_build integer,
  old_force_update boolean,
  new_force_update boolean,
  store_url_changed boolean not null default false,
  message_changed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists app_version_policy_audits_platform_idx
  on public.app_version_policy_audits (platform, created_at desc);

alter table public.app_version_policies enable row level security;
alter table public.app_version_policy_audits enable row level security;

revoke all on table public.app_version_policies from public, anon, authenticated;
revoke all on table public.app_version_policy_audits from public, anon, authenticated;

-- Mağaza adresi: yalnız https ve ilgili mağaza alanı. İçeriden çağrılır.
create or replace function public.surum_magaza_url_gecerli(p_platform text, p_url text)
returns boolean
language plpgsql
immutable
security invoker
set search_path = public
as $$
declare
  u text := lower(trim(coalesce(p_url, '')));
  rest text;
  host text;
begin
  if u !~ '^https://' then
    return false;
  end if;
  if length(u) > 500 then
    return false;
  end if;
  if position('javascript:' in u) > 0
     or position(' ' in u) > 0
     or position(chr(10) in u) > 0
     or position(chr(60) in u) > 0
     or position(chr(62) in u) > 0
     or position(chr(34) in u) > 0
     or position(chr(92) in u) > 0
     or position('@' in u) > 0 then
    return false;
  end if;
  rest := substring(u from 9);
  host := split_part(split_part(rest, '/', 1), ':', 1);
  host := regexp_replace(host, '^www\.', '');
  if p_platform = 'ios' then
    return host in ('apps.apple.com', 'itunes.apple.com')
      and split_part(rest, '/', 2) != '';
  end if;
  if p_platform = 'android' then
    return host = 'play.google.com' and split_part(rest, '/', 2) = 'store';
  end if;
  return false;
end;
$$;

revoke all on function public.surum_magaza_url_gecerli(text, text) from public, anon, authenticated;

-- Oturum gerekmez. Yalnız kamu alanları; updated_by dönmez.
create or replace function public.surum_politikasi_oku(p_platform text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_platform text := lower(trim(coalesce(p_platform, '')));
  v_row public.app_version_policies%rowtype;
begin
  if v_platform not in ('ios', 'android') then
    return null;
  end if;

  select * into v_row
  from public.app_version_policies
  where platform = v_platform
    and is_active
  limit 1;

  if v_row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'platform', v_row.platform,
    'latest_version', v_row.latest_version,
    'latest_build', v_row.latest_build,
    'minimum_supported_version', v_row.minimum_supported_version,
    'minimum_supported_build', v_row.minimum_supported_build,
    'force_update_enabled', v_row.force_update_enabled,
    'optional_update_enabled', v_row.optional_update_enabled,
    'update_title', v_row.update_title,
    'update_message', v_row.update_message,
    'button_text', v_row.button_text,
    'store_url', v_row.store_url,
    'maintenance_message', v_row.maintenance_message,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.surum_politikasi_oku(text) from public;
grant execute on function public.surum_politikasi_oku(text) to anon, authenticated;

create or replace function public.surum_politikasi_kaydet(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_platform text;
  v_latest text;
  v_min text;
  v_latest_build integer;
  v_min_build integer;
  v_latest_parts integer[];
  v_min_parts integer[];
  v_force boolean;
  v_optional boolean;
  v_title text;
  v_message text;
  v_button text;
  v_url text;
  v_maint text;
  v_old public.app_version_policies%rowtype;
  v_row public.app_version_policies%rowtype;
begin
  if v_uid is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;

  v_platform := lower(trim(coalesce(p->>'platform', '')));
  if v_platform not in ('ios', 'android') then
    raise exception 'INVALID_PLATFORM';
  end if;

  v_latest := trim(coalesce(p->>'latest_version', ''));
  v_min := trim(coalesce(p->>'minimum_supported_version', ''));
  if v_latest !~ '^[0-9]+\.[0-9]+\.[0-9]+$'
     or v_min !~ '^[0-9]+\.[0-9]+\.[0-9]+$' then
    raise exception 'INVALID_VERSION';
  end if;

  begin
    v_latest_build := (p->>'latest_build')::integer;
    v_min_build := (p->>'minimum_supported_build')::integer;
  exception
    when others then
      raise exception 'INVALID_BUILD';
  end;

  if v_latest_build is null or v_min_build is null
     or v_latest_build < 0 or v_min_build < 0
     or v_latest_build > 100000000 or v_min_build > 100000000 then
    raise exception 'INVALID_BUILD';
  end if;

  v_latest_parts := string_to_array(v_latest, '.')::integer[];
  v_min_parts := string_to_array(v_min, '.')::integer[];
  if v_min_parts[1] > v_latest_parts[1]
     or (
       v_min_parts[1] = v_latest_parts[1]
       and v_min_parts[2] > v_latest_parts[2]
     )
     or (
       v_min_parts[1] = v_latest_parts[1]
       and v_min_parts[2] = v_latest_parts[2]
       and v_min_parts[3] > v_latest_parts[3]
     ) then
    raise exception 'MINIMUM_ABOVE_LATEST';
  end if;
  if v_min = v_latest and v_min_build > v_latest_build then
    raise exception 'MINIMUM_ABOVE_LATEST';
  end if;

  v_force := coalesce((p->>'force_update_enabled')::boolean, false);
  v_optional := coalesce((p->>'optional_update_enabled')::boolean, false);

  v_title := left(regexp_replace(trim(coalesce(p->>'update_title', '')), chr(60) || '[^' || chr(62) || ']*' || chr(62), '', 'g'), 120);
  v_message := left(regexp_replace(trim(coalesce(p->>'update_message', '')), chr(60) || '[^' || chr(62) || ']*' || chr(62), '', 'g'), 2000);
  v_button := left(regexp_replace(trim(coalesce(p->>'button_text', '')), chr(60) || '[^' || chr(62) || ']*' || chr(62), '', 'g'), 40);
  v_url := trim(coalesce(p->>'store_url', ''));
  v_maint := nullif(
    left(regexp_replace(trim(coalesce(p->>'maintenance_message', '')), chr(60) || '[^' || chr(62) || ']*' || chr(62), '', 'g'), 500),
    ''
  );

  if length(v_title) = 0 or length(v_message) = 0 or length(v_button) = 0 then
    raise exception 'TEXT_REQUIRED';
  end if;

  if length(v_url) > 0 and not public.surum_magaza_url_gecerli(v_platform, v_url) then
    raise exception 'STORE_URL_INVALID';
  end if;
  if v_force and not public.surum_magaza_url_gecerli(v_platform, v_url) then
    raise exception 'STORE_URL_REQUIRED';
  end if;

  select * into v_old
  from public.app_version_policies
  where platform = v_platform
    and is_active
  limit 1;

  if v_old.id is null then
    insert into public.app_version_policies (
      platform,
      latest_version,
      latest_build,
      minimum_supported_version,
      minimum_supported_build,
      force_update_enabled,
      optional_update_enabled,
      update_title,
      update_message,
      button_text,
      store_url,
      maintenance_message,
      is_active,
      updated_by
    ) values (
      v_platform,
      v_latest,
      v_latest_build,
      v_min,
      v_min_build,
      v_force,
      v_optional,
      v_title,
      v_message,
      v_button,
      v_url,
      v_maint,
      true,
      v_uid
    )
    returning * into v_row;
  else
    update public.app_version_policies
    set
      latest_version = v_latest,
      latest_build = v_latest_build,
      minimum_supported_version = v_min,
      minimum_supported_build = v_min_build,
      force_update_enabled = v_force,
      optional_update_enabled = v_optional,
      update_title = v_title,
      update_message = v_message,
      button_text = v_button,
      store_url = v_url,
      maintenance_message = v_maint,
      updated_at = now(),
      updated_by = v_uid
    where id = v_old.id
    returning * into v_row;
  end if;

  insert into public.app_version_policy_audits (
    policy_id,
    actor_id,
    platform,
    old_minimum_version,
    new_minimum_version,
    old_minimum_build,
    new_minimum_build,
    old_force_update,
    new_force_update,
    store_url_changed,
    message_changed
  ) values (
    v_row.id,
    v_uid,
    v_platform,
    v_old.minimum_supported_version,
    v_row.minimum_supported_version,
    v_old.minimum_supported_build,
    v_row.minimum_supported_build,
    v_old.force_update_enabled,
    v_row.force_update_enabled,
    coalesce(v_old.store_url, '') is distinct from v_row.store_url,
    coalesce(v_old.update_message, '') is distinct from v_row.update_message
  );

  return jsonb_build_object(
    'id', v_row.id,
    'platform', v_row.platform,
    'force_update_enabled', v_row.force_update_enabled,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.surum_politikasi_kaydet(jsonb) from public, anon;
grant execute on function public.surum_politikasi_kaydet(jsonb) to authenticated;

create or replace function public.surum_politikasi_admin_liste()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'platform', p.platform,
      'latest_version', p.latest_version,
      'latest_build', p.latest_build,
      'minimum_supported_version', p.minimum_supported_version,
      'minimum_supported_build', p.minimum_supported_build,
      'force_update_enabled', p.force_update_enabled,
      'optional_update_enabled', p.optional_update_enabled,
      'update_title', p.update_title,
      'update_message', p.update_message,
      'button_text', p.button_text,
      'store_url', p.store_url,
      'maintenance_message', p.maintenance_message,
      'is_active', p.is_active,
      'updated_at', p.updated_at,
      'updated_by', p.updated_by,
      'updated_by_name', coalesce(pr.display_name, pr.username)
    ) order by p.platform)
    from public.app_version_policies p
    left join public.profiles pr on pr.id = p.updated_by
    where p.is_active
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.surum_politikasi_admin_liste() from public, anon;
grant execute on function public.surum_politikasi_admin_liste() to authenticated;

create or replace function public.surum_politikasi_denetim_liste(p_platform text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_platform text := lower(trim(coalesce(p_platform, '')));
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  if v_platform not in ('ios', 'android') then
    raise exception 'INVALID_PLATFORM';
  end if;

  return coalesce((
    select jsonb_agg(satir)
    from (
      select jsonb_build_object(
        'id', a.id,
        'actor_id', a.actor_id,
        'actor_name', coalesce(pr.display_name, pr.username),
        'platform', a.platform,
        'old_minimum_version', a.old_minimum_version,
        'new_minimum_version', a.new_minimum_version,
        'old_minimum_build', a.old_minimum_build,
        'new_minimum_build', a.new_minimum_build,
        'old_force_update', a.old_force_update,
        'new_force_update', a.new_force_update,
        'store_url_changed', a.store_url_changed,
        'message_changed', a.message_changed,
        'created_at', a.created_at
      ) as satir
      from public.app_version_policy_audits a
      left join public.profiles pr on pr.id = a.actor_id
      where a.platform = v_platform
      order by a.created_at desc
      limit 12
    ) q
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.surum_politikasi_denetim_liste(text) from public, anon;
grant execute on function public.surum_politikasi_denetim_liste(text) to authenticated;

insert into public.app_version_policies (
  platform,
  latest_version,
  latest_build,
  minimum_supported_version,
  minimum_supported_build,
  force_update_enabled,
  optional_update_enabled,
  update_title,
  update_message,
  button_text,
  store_url,
  is_active
)
select
  x.platform,
  '1.2.4',
  0,
  '1.2.4',
  0,
  false,
  false,
  'Yeni sürüm hazır',
  x.mesaj,
  x.buton,
  '',
  true
from (
  values
    ('ios', 'Tamuso''nun yeni sürümü yayınlandı. Devam etmek için uygulamanı güncelle.', 'Şimdi Güncelle'),
    ('android', 'Daha hızlı ve daha iyi bir Tamuso deneyimi için uygulamanı güncelle.', 'Güncelle')
) as x(platform, mesaj, buton)
where not exists (
  select 1
  from public.app_version_policies p
  where p.platform = x.platform
    and p.is_active
);
