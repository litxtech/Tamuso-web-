create extension if not exists pgcrypto with schema extensions;

-- Tek global RTC sağlayıcı. Varsayılan ve migration sonucu: LIVEKIT.
-- Agora otomatik aktif edilmez. Değişim yalnız yetkili admin + sunucu kodu ile.

create table if not exists public.rtc_provider_config (
  id int primary key default 1 check (id = 1),
  active_provider text not null default 'LIVEKIT'
    check (active_provider in ('LIVEKIT', 'AGORA')),
  previous_provider text
    check (previous_provider is null or previous_provider in ('LIVEKIT', 'AGORA')),
  version int not null default 1,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  change_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.rtc_provider_config (id, active_provider, version)
values (1, 'LIVEKIT', 1)
on conflict (id) do nothing;

create table if not exists public.rtc_provider_kod (
  id int primary key default 1 check (id = 1),
  code_hash text not null
);

insert into public.rtc_provider_kod (id, code_hash)
values (1, '07ee921d284eed86c9bf03c9e7fb1fd811b5ca857734fe5ccf589325bcb13e9f')
on conflict (id) do update set code_hash = excluded.code_hash;

create table if not exists public.rtc_provider_audit (
  id uuid primary key default gen_random_uuid(),
  previous_provider text,
  new_provider text not null,
  admin_user_id uuid,
  reason text,
  config_version int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rtc_provider_deneme (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  basarili boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rtc_provider_deneme_user_idx
  on public.rtc_provider_deneme (user_id, created_at desc);

create table if not exists public.admin_ozel_yetki (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kod text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kod)
);

insert into public.admin_ozel_yetki (user_id, kod)
select p.id, 'rtc.provider.switch'
from public.profiles p
where coalesce(p.is_admin, false) = true
  and p.deleted_at is null
on conflict do nothing;

alter table public.rooms
  add column if not exists rtc_provider text;

alter table public.live_sessions
  add column if not exists rtc_provider text;

alter table public.direct_calls
  add column if not exists rtc_provider text;

alter table public.rtc_provider_config enable row level security;
alter table public.rtc_provider_kod enable row level security;
alter table public.rtc_provider_audit enable row level security;
alter table public.rtc_provider_deneme enable row level security;
alter table public.admin_ozel_yetki enable row level security;

drop policy if exists rtc_provider_config_oku on public.rtc_provider_config;
create policy rtc_provider_config_oku
  on public.rtc_provider_config
  for select to authenticated
  using (true);

revoke all on public.rtc_provider_kod from public, anon, authenticated;
revoke all on public.rtc_provider_deneme from public, anon, authenticated;
revoke all on public.rtc_provider_audit from public, anon, authenticated;

grant select on public.rtc_provider_config to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rtc_provider_config'
  ) then
    alter publication supabase_realtime add table public.rtc_provider_config;
  end if;
end $$;

create or replace function public.rtc_provider_aktif()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select c.active_provider from public.rtc_provider_config c where c.id = 1),
    'LIVEKIT'
  );
$$;

revoke all on function public.rtc_provider_aktif() from public, anon;
grant execute on function public.rtc_provider_aktif() to authenticated, service_role;

create or replace function public.rtc_provider_durum()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'active_provider', coalesce(c.active_provider, 'LIVEKIT'),
    'previous_provider', c.previous_provider,
    'version', coalesce(c.version, 1),
    'changed_at', c.changed_at
  )
  from public.rtc_provider_config c
  where c.id = 1;
$$;

revoke all on function public.rtc_provider_durum() from public, anon;
grant execute on function public.rtc_provider_durum() to authenticated, service_role;

create or replace function public.rtc_saglayici_kilit_kontrol(p_saglayici text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_aktif text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  v_aktif := public.rtc_provider_aktif();
  if upper(coalesce(p_saglayici, '')) is distinct from v_aktif then
    raise exception 'RTC provider uyusmuyor';
  end if;
end;
$$;

revoke all on function public.rtc_saglayici_kilit_kontrol(text) from public, anon;
grant execute on function public.rtc_saglayici_kilit_kontrol(text) to authenticated, service_role;

create or replace function public.rtc_agora_kanal_hazirla(
  p_kanal text,
  p_rol text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kanal text := left(trim(coalesce(p_kanal, '')), 64);
  v_istenilen text := lower(coalesce(p_rol, 'listener'));
  v_max text := 'listener';
  v_room public.rooms%rowtype;
  v_live public.live_sessions%rowtype;
  v_call public.direct_calls%rowtype;
  v_kaynak text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.rtc_provider_aktif() is distinct from 'AGORA' then
    raise exception 'RTC provider uyusmuyor';
  end if;
  if v_kanal = '' then
    raise exception 'Invalid roomName';
  end if;
  if v_istenilen not in ('listener', 'speaker', 'host', 'publisher') then
    raise exception 'Invalid role';
  end if;

  select * into v_room
  from public.rooms r
  where r.livekit_room_name = v_kanal
     or ('voice_' || r.id::text) = v_kanal
  limit 1;

  if v_room.id is not null then
    v_kaynak := 'VOICE_ROOM';
    if exists (
      select 1 from public.room_bans b
      where b.room_id = v_room.id and b.user_id = v_uid
    ) then
      raise exception 'USER_BANNED';
    end if;
    if v_room.host_id = v_uid
       or exists (
         select 1 from public.room_members m
         where m.room_id = v_room.id
           and m.user_id = v_uid
           and m.role in ('host', 'cohost', 'speaker')
       )
       or exists (
         select 1 from public.room_seats s
         where s.room_id = v_room.id and s.user_id = v_uid
       )
    then
      v_max := 'speaker';
      if v_room.host_id = v_uid then
        v_max := 'host';
      end if;
    end if;
  else
    select * into v_live
    from public.live_sessions s
    where s.livekit_room_name = v_kanal
       or ('live_' || s.id::text) = v_kanal
    limit 1;

    if v_live.id is not null then
      v_kaynak := 'LIVE';
      if exists (
        select 1 from public.live_session_bans b
        where b.session_id = v_live.id
          and b.user_id = v_uid
          and b.action = 'ban'
          and (b.expires_at is null or b.expires_at > now())
      ) then
        raise exception 'USER_BANNED';
      end if;
      if v_live.host_id = v_uid then
        v_max := 'host';
      end if;
    else
      select * into v_call
      from public.direct_calls c
      where c.channel_name = v_kanal
      limit 1;

      if v_call.id is null then
        raise exception 'ROOM_NOT_FOUND';
      end if;
      v_kaynak := case when v_call.call_type = 'video' then 'VIDEO_CALL' else 'VOICE_CALL' end;
      if v_call.caller_id is distinct from v_uid and v_call.callee_id is distinct from v_uid then
        raise exception 'Forbidden';
      end if;
      if v_call.status not in ('ringing', 'active') then
        raise exception 'ROOM_NOT_FOUND';
      end if;
      v_max := 'host';
    end if;
  end if;

  if v_istenilen = 'listener' or v_max = 'listener' then
    v_istenilen := 'listener';
  elsif v_max = 'speaker' and v_istenilen in ('host', 'publisher') then
    v_istenilen := 'speaker';
  elsif v_max = 'host' and v_istenilen = 'listener' then
    v_istenilen := 'listener';
  end if;

  if v_kaynak = 'VOICE_ROOM' then
    update public.rooms
      set rtc_provider = 'AGORA'
    where id = v_room.id;
  elsif v_kaynak = 'LIVE' then
    update public.live_sessions
      set rtc_provider = 'AGORA'
    where id = v_live.id;
  else
    update public.direct_calls
      set rtc_provider = 'AGORA'
    where id = v_call.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'kanal', v_kanal,
    'rol', v_istenilen,
    'kaynak', v_kaynak,
    'provider', 'AGORA'
  );
end;
$$;

revoke all on function public.rtc_agora_kanal_hazirla(text, text) from public, anon;
grant execute on function public.rtc_agora_kanal_hazirla(text, text) to authenticated, service_role;

create or replace function public.rtc_provider_gecmis()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  if not exists (
    select 1 from public.admin_ozel_yetki y
    where y.user_id = auth.uid() and y.kod = 'rtc.provider.switch'
  ) then
    raise exception 'Forbidden: rtc.provider.switch';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.created_at desc)
    from (
      select a.previous_provider, a.new_provider, a.reason, a.config_version, a.created_at
      from public.rtc_provider_audit a
      order by a.created_at desc
      limit 20
    ) t
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.rtc_provider_gecmis() from public, anon;
grant execute on function public.rtc_provider_gecmis() to authenticated;

create or replace function public.rtc_provider_degistir(
  p_hedef text,
  p_kod text,
  p_neden text,
  p_beklenen_surum int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hedef text := upper(trim(coalesce(p_hedef, '')));
  v_hash text;
  v_beklenen text;
  v_row public.rtc_provider_config%rowtype;
  v_hatali int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  if not exists (
    select 1 from public.admin_ozel_yetki y
    where y.user_id = v_uid and y.kod = 'rtc.provider.switch'
  ) then
    raise exception 'Forbidden: rtc.provider.switch';
  end if;
  if v_hedef not in ('LIVEKIT', 'AGORA') then
    raise exception 'Invalid provider';
  end if;

  perform pg_advisory_xact_lock(hashtext('rtc_provider_switch'));

  select count(*)::int into v_hatali
  from public.rtc_provider_deneme d
  where d.user_id = v_uid
    and d.basarili = false
    and d.created_at > now() - interval '15 minutes';

  if v_hatali >= 5 then
    raise exception 'COOLDOWN';
  end if;

  v_hash := encode(
    extensions.digest(convert_to('tamuso-rtc-v1|' || coalesce(p_kod, ''), 'UTF8'), 'sha256'),
    'hex'
  );
  select k.code_hash into v_beklenen from public.rtc_provider_kod k where k.id = 1;

  if v_hash is distinct from v_beklenen then
    insert into public.rtc_provider_deneme (user_id, basarili)
    values (v_uid, false);
    raise exception 'KOD_HATALI';
  end if;

  select * into v_row from public.rtc_provider_config where id = 1 for update;
  if v_row.version is distinct from p_beklenen_surum then
    raise exception 'VERSION_CONFLICT';
  end if;
  if v_row.active_provider = v_hedef then
    return jsonb_build_object(
      'ok', true,
      'active_provider', v_row.active_provider,
      'version', v_row.version,
      'degismedi', true
    );
  end if;

  update public.rtc_provider_config
  set
    previous_provider = active_provider,
    active_provider = v_hedef,
    version = version + 1,
    changed_by = v_uid,
    changed_at = now(),
    change_reason = left(nullif(trim(coalesce(p_neden, '')), ''), 240),
    updated_at = now()
  where id = 1
  returning * into v_row;

  insert into public.rtc_provider_audit (
    previous_provider, new_provider, admin_user_id, reason, config_version
  ) values (
    v_row.previous_provider,
    v_row.active_provider,
    v_uid,
    v_row.change_reason,
    v_row.version
  );

  insert into public.rtc_provider_deneme (user_id, basarili)
  values (v_uid, true);

  return jsonb_build_object(
    'ok', true,
    'active_provider', v_row.active_provider,
    'previous_provider', v_row.previous_provider,
    'version', v_row.version,
    'changed_at', v_row.changed_at
  );
end;
$$;

revoke all on function public.rtc_provider_degistir(text, text, text, int) from public, anon;
grant execute on function public.rtc_provider_degistir(text, text, text, int) to authenticated;
