-- Tamuso duyuru merkezi.
-- Mevcut public.announcements satırını genişletir; ikinci bir duyuru tablosu açmaz.
-- Ajans duyuruları (agency_announcements) ve şehir duyuruları (city_announcements) ayrı kalır.

-- ---------------------------------------------------------------------------
-- Kategoriler
-- ---------------------------------------------------------------------------
create table if not exists public.announcement_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  icon text not null default 'megaphone-outline',
  theme_color text not null default '#7C5CFF',
  enabled boolean not null default true,
  is_system boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

create unique index if not exists announcement_categories_code_uidx
  on public.announcement_categories (code);

insert into public.announcement_categories (code, name, icon, theme_color, is_system, sort_order)
values
  ('GENERAL', 'Genel', 'megaphone-outline', '#7C5CFF', true, 10),
  ('NEW_FEATURE', 'Yeni özellik', 'sparkles-outline', '#3DDC97', true, 20),
  ('EVENT', 'Etkinlik', 'calendar-outline', '#FF5C8A', true, 30),
  ('MAINTENANCE', 'Bakım', 'construct-outline', '#F5A524', true, 40),
  ('SECURITY', 'Güvenlik', 'shield-checkmark-outline', '#FF4D4F', true, 50),
  ('IMPORTANT', 'Önemli', 'alert-circle-outline', '#FF8A00', true, 60),
  ('CAMPAIGN', 'Kampanya', 'gift-outline', '#E85DFF', true, 70),
  ('COMMUNITY', 'Topluluk', 'people-outline', '#4C9AFF', true, 80),
  ('CREATOR', 'İçerik üretici', 'star-outline', '#FFD60A', true, 90),
  ('AGENCY', 'Ajans', 'briefcase-outline', '#C77DFF', true, 100),
  ('SYSTEM', 'Sistem', 'settings-outline', '#8E8E93', true, 110)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- announcements genişletme
-- ---------------------------------------------------------------------------
alter table public.announcements
  add column if not exists summary text,
  add column if not exists body_doc jsonb not null default '{"blocks":[]}'::jsonb,
  add column if not exists status text,
  add column if not exists severity text,
  add column if not exists category_id uuid references public.announcement_categories(id),
  add column if not exists publish_at timestamptz,
  add column if not exists expire_at timestamptz,
  add column if not exists dismissible boolean not null default true,
  add column if not exists show_until_read boolean not null default false,
  add column if not exists pinned boolean not null default false,
  add column if not exists pin_priority int not null default 0,
  add column if not exists show_on_home boolean not null default false,
  add column if not exists home_display text,
  add column if not exists show_on_launch boolean not null default false,
  add column if not exists launch_frequency text,
  add column if not exists allow_reactions boolean not null default false,
  add column if not exists allow_comments boolean not null default false,
  add column if not exists show_view_count boolean not null default false,
  add column if not exists send_push boolean not null default false,
  add column if not exists push_title text,
  add column if not exists push_body text,
  add column if not exists push_image_url text,
  add column if not exists target_mode text,
  add column if not exists target_logic text,
  add column if not exists impression_count bigint not null default 0,
  add column if not exists unique_view_count bigint not null default 0,
  add column if not exists open_count bigint not null default 0,
  add column if not exists read_count bigint not null default 0,
  add column if not exists cta_click_count bigint not null default 0,
  add column if not exists video_start_count bigint not null default 0,
  add column if not exists video_complete_count bigint not null default 0,
  add column if not exists audio_listen_count bigint not null default 0,
  add column if not exists reaction_counts jsonb not null default '{}'::jsonb,
  add column if not exists comment_count int not null default 0,
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists published_once boolean not null default false;

update public.announcements
set
  status = case
    when coalesce(is_active, false) = false then 'archived'
    when ends_at is not null and ends_at <= now() then 'expired'
    when starts_at > now() then 'scheduled'
    else 'published'
  end,
  severity = case priority
    when 'urgent' then 'CRITICAL'
    when 'high' then 'IMPORTANT'
    else 'NORMAL'
  end,
  publish_at = coalesce(publish_at, starts_at, created_at, now()),
  expire_at = coalesce(expire_at, ends_at),
  target_mode = coalesce(target_mode, 'all'),
  target_logic = coalesce(target_logic, 'AND'),
  home_display = coalesce(home_display, 'CARD'),
  launch_frequency = coalesce(launch_frequency, 'ONCE_PER_USER'),
  published_once = coalesce(is_active, false) or starts_at <= now()
where status is null or target_mode is null or severity is null;

alter table public.announcements alter column status set default 'draft';
alter table public.announcements alter column severity set default 'NORMAL';
alter table public.announcements alter column target_mode set default 'all';
alter table public.announcements alter column target_logic set default 'AND';
alter table public.announcements alter column home_display set default 'CARD';
alter table public.announcements alter column launch_frequency set default 'ONCE_PER_USER';

update public.announcements set status = 'draft' where status is null;
update public.announcements set severity = 'NORMAL' where severity is null;
update public.announcements set target_mode = 'all' where target_mode is null;
update public.announcements set target_logic = 'AND' where target_logic is null;
update public.announcements set publish_at = coalesce(starts_at, created_at, now()) where publish_at is null;

alter table public.announcements alter column status set not null;
alter table public.announcements alter column severity set not null;
alter table public.announcements alter column target_mode set not null;
alter table public.announcements alter column target_logic set not null;
alter table public.announcements alter column publish_at set not null;

alter table public.announcements drop constraint if exists announcements_status_chk;
alter table public.announcements add constraint announcements_status_chk
  check (status in ('draft', 'scheduled', 'published', 'expired', 'archived'));

alter table public.announcements drop constraint if exists announcements_severity_chk;
alter table public.announcements add constraint announcements_severity_chk
  check (severity in ('NORMAL', 'IMPORTANT', 'CRITICAL'));

alter table public.announcements drop constraint if exists announcements_target_mode_chk;
alter table public.announcements add constraint announcements_target_mode_chk
  check (target_mode in ('all', 'targeted'));

alter table public.announcements drop constraint if exists announcements_target_logic_chk;
alter table public.announcements add constraint announcements_target_logic_chk
  check (target_logic in ('AND', 'OR'));

alter table public.announcements drop constraint if exists announcements_home_display_chk;
alter table public.announcements add constraint announcements_home_display_chk
  check (home_display in ('CARD', 'BANNER', 'CAROUSEL'));

alter table public.announcements drop constraint if exists announcements_launch_frequency_chk;
alter table public.announcements add constraint announcements_launch_frequency_chk
  check (launch_frequency in ('ONCE_PER_USER', 'EVERY_APP_OPEN_UNTIL_READ'));

create index if not exists announcements_status_publish_idx
  on public.announcements (status, publish_at desc)
  where deleted_at is null;

create index if not exists announcements_live_feed_idx
  on public.announcements (pinned desc, pin_priority desc, publish_at desc, id)
  where deleted_at is null and status = 'published';

create index if not exists announcements_expire_idx
  on public.announcements (expire_at)
  where deleted_at is null and status in ('published', 'scheduled');

create index if not exists announcements_category_idx
  on public.announcements (category_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Çeviri, medya, hedef, CTA
-- ---------------------------------------------------------------------------
create table if not exists public.announcement_translations (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  locale text not null,
  title text not null default '',
  summary text not null default '',
  body_doc jsonb not null default '{"blocks":[]}'::jsonb,
  body_plain text not null default '',
  button_text text,
  primary key (announcement_id, locale)
);

create table if not exists public.announcement_media (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  locale text,
  kind text not null,
  storage_path text,
  public_url text,
  mime_type text,
  byte_size bigint,
  duration_ms int,
  width int,
  height int,
  thumbnail_path text,
  thumbnail_url text,
  sort_order int not null default 0,
  caption text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.announcement_media drop constraint if exists announcement_media_kind_chk;
alter table public.announcement_media add constraint announcement_media_kind_chk
  check (kind in ('IMAGE', 'VIDEO', 'AUDIO', 'VOICE_RECORDING'));

create index if not exists announcement_media_ann_idx
  on public.announcement_media (announcement_id, sort_order)
  where deleted_at is null;

create table if not exists public.announcement_targets (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  dimension text not null,
  values jsonb not null default '[]'::jsonb,
  primary key (announcement_id, dimension)
);

alter table public.announcement_targets drop constraint if exists announcement_targets_dim_chk;
alter table public.announcement_targets add constraint announcement_targets_dim_chk
  check (dimension in (
    'country', 'city', 'language', 'platform', 'app_version', 'account_type',
    'creator', 'agency', 'agency_member', 'vip_level', 'user_level',
    'verified', 'user_ids'
  ));

create table if not exists public.announcement_ctas (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  sort_order int not null default 0,
  destination_type text not null,
  destination jsonb not null default '{}'::jsonb,
  labels jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.announcement_ctas drop constraint if exists announcement_ctas_dest_chk;
alter table public.announcement_ctas add constraint announcement_ctas_dest_chk
  check (destination_type in (
    'INTERNAL_ROUTE', 'PROFILE', 'VOICE_ROOM', 'LIVE', 'STATUS',
    'AGENCY', 'CREATOR', 'GAME', 'WEBVIEW', 'EXTERNAL_URL'
  ));

create index if not exists announcement_ctas_ann_idx
  on public.announcement_ctas (announcement_id, sort_order);

create table if not exists public.announcement_user_state (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_impression_at timestamptz,
  last_impression_at timestamptz,
  last_impression_day date,
  opened_at timestamptz,
  read_at timestamptz,
  read_source text,
  dismissed_at timestamptz,
  launch_shown_at timestamptz,
  primary key (announcement_id, user_id)
);

create index if not exists announcement_user_state_user_idx
  on public.announcement_user_state (user_id, read_at);

create index if not exists announcement_user_state_ann_read_idx
  on public.announcement_user_state (announcement_id, read_at);

create table if not exists public.announcement_events (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id text,
  event_type text not null,
  media_id uuid,
  cta_id uuid,
  platform text,
  app_version text,
  dedupe_key text not null,
  created_at timestamptz not null default now()
);

alter table public.announcement_events drop constraint if exists announcement_events_type_chk;
alter table public.announcement_events add constraint announcement_events_type_chk
  check (event_type in (
    'IMPRESSION', 'OPEN', 'READ',
    'MEDIA_START', 'MEDIA_25', 'MEDIA_50', 'MEDIA_75', 'MEDIA_COMPLETE',
    'CTA_CLICK', 'DISMISS'
  ));

create unique index if not exists announcement_events_dedupe_uidx
  on public.announcement_events (dedupe_key);

create index if not exists announcement_events_ann_type_idx
  on public.announcement_events (announcement_id, event_type, created_at desc);

create index if not exists announcement_events_user_idx
  on public.announcement_events (user_id, created_at desc);

create index if not exists announcement_events_ann_user_idx
  on public.announcement_events (announcement_id, user_id);

create table if not exists public.announcement_reactions (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null,
  updated_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcement_reactions drop constraint if exists announcement_reactions_kind_chk;
alter table public.announcement_reactions add constraint announcement_reactions_kind_chk
  check (reaction in ('heart', 'fire', 'clap', 'party'));

create table if not exists public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists announcement_comments_ann_idx
  on public.announcement_comments (announcement_id, created_at)
  where deleted_at is null;

create table if not exists public.announcement_analytics_daily (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  day date not null,
  impressions bigint not null default 0,
  unique_viewers bigint not null default 0,
  opens bigint not null default 0,
  reads bigint not null default 0,
  cta_clicks bigint not null default 0,
  video_starts bigint not null default 0,
  video_completes bigint not null default 0,
  audio_listens bigint not null default 0,
  primary key (announcement_id, day)
);

create table if not exists public.announcement_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid references public.profiles(id),
  announcement_id uuid references public.announcements(id) on delete set null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists announcement_audit_ann_idx
  on public.announcement_audit_log (announcement_id, created_at desc);

create table if not exists public.announcement_push_log (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  outbox_id uuid,
  created_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create table if not exists public.announcement_push_jobs (
  announcement_id uuid primary key references public.announcements(id) on delete cascade,
  cursor_user_id uuid,
  status text not null default 'pending',
  sent_count int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.announcement_settings (
  id int primary key default 1 check (id = 1),
  allowed_hosts text[] not null default '{}',
  updated_at timestamptz not null default now()
);

insert into public.announcement_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.announcement_signals (
  id int primary key default 1 check (id = 1),
  version bigint not null default 0,
  announcement_id uuid,
  kind text,
  updated_at timestamptz not null default now()
);

insert into public.announcement_signals (id) values (1) on conflict (id) do nothing;

-- Eski düz duyurular için TR çeviri
insert into public.announcement_translations (announcement_id, locale, title, summary, body_plain, body_doc)
select a.id, 'tr', a.title, coalesce(a.summary, left(a.body, 180)), a.body,
  jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'text', a.body)))
from public.announcements a
where not exists (
  select 1 from public.announcement_translations t
  where t.announcement_id = a.id and t.locale = 'tr'
);

-- ---------------------------------------------------------------------------
-- Yetki
-- ---------------------------------------------------------------------------
insert into public.admin_role_permissions (role_code, permission_code) values
  ('SUPER_ADMIN', 'announcement.create'),
  ('SUPER_ADMIN', 'announcement.edit'),
  ('SUPER_ADMIN', 'announcement.publish'),
  ('SUPER_ADMIN', 'announcement.delete'),
  ('SUPER_ADMIN', 'announcement.analytics'),
  ('SUPER_ADMIN', 'announcement.view_users'),
  ('SUPER_ADMIN', 'announcement.export'),
  ('COMPLIANCE', 'announcement.analytics'),
  ('SUPPORT', 'announcement.analytics')
on conflict do nothing;

insert into public.admin_staff_roles (user_id, role_code)
select id, 'SUPER_ADMIN' from public.profiles where is_admin = true
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Fonksiyonlar
-- ---------------------------------------------------------------------------
create or replace function public.announcement_izin(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  if p_permission in ('announcement.view_users', 'announcement.export') then
    return exists (
      select 1
      from public.admin_staff_roles r
      join public.admin_role_permissions p on p.role_code = r.role_code
      where r.user_id = v_uid
        and p.permission_code = p_permission
    );
  end if;
  return public.admin_has_permission(p_permission);
end;
$$;

revoke all on function public.announcement_izin(text) from public, anon, authenticated;
grant execute on function public.announcement_izin(text) to authenticated;

create or replace function public.announcement_sinyal(p_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.announcement_signals (id, version, announcement_id, kind, updated_at)
  values (1, 1, p_id, left(coalesce(p_kind, ''), 32), now())
  on conflict (id) do update
    set version = public.announcement_signals.version + 1,
        announcement_id = excluded.announcement_id,
        kind = excluded.kind,
        updated_at = now();
end;
$$;

revoke all on function public.announcement_sinyal(uuid, text) from public, anon, authenticated;

create or replace function public.announcement_audit(
  p_id uuid,
  p_action text,
  p_before jsonb,
  p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.announcement_audit_log (actor_admin_id, announcement_id, action, before, after)
  values (auth.uid(), p_id, left(p_action, 40), p_before, p_after);
  perform public.admin_audit_yaz(
    null,
    'announcement_' || lower(p_action),
    'Duyuru ' || p_action,
    jsonb_build_object('announcement_id', p_id)
  );
end;
$$;

revoke all on function public.announcement_audit(uuid, text, jsonb, jsonb) from public, anon, authenticated;

create or replace function public.announcement_durum_yenile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.announcements
  set status = 'published', is_active = true, updated_at = now(), published_once = true
  where deleted_at is null
    and status = 'scheduled'
    and publish_at <= now()
    and (expire_at is null or expire_at > now());

  update public.announcements
  set status = 'expired', is_active = false, updated_at = now()
  where deleted_at is null
    and status = 'published'
    and expire_at is not null
    and expire_at <= now();
end;
$$;

revoke all on function public.announcement_durum_yenile() from public, anon, authenticated;

create or replace function public.announcement_body_duz(p_doc jsonb)
returns text
language plpgsql
immutable
as $$
declare
  v_block jsonb;
  v_text text := '';
  v_item text;
begin
  if p_doc is null or jsonb_typeof(p_doc->'blocks') <> 'array' then
    return '';
  end if;
  for v_block in select value from jsonb_array_elements(p_doc->'blocks')
  loop
    if (v_block->>'type') = 'list' and jsonb_typeof(v_block->'items') = 'array' then
      for v_item in select value from jsonb_array_elements_text(v_block->'items')
      loop
        v_text := v_text || v_item || E'\n';
      end loop;
    elsif coalesce(v_block->>'text', '') <> '' then
      v_text := v_text || (v_block->>'text') || E'\n';
    end if;
  end loop;
  return left(trim(v_text), 8000);
end;
$$;

create or replace function public.announcement_body_temizle(p_doc jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_in jsonb;
  v_out jsonb := '[]'::jsonb;
  v_block jsonb;
  v_type text;
  v_n int := 0;
begin
  if p_doc is null or jsonb_typeof(p_doc->'blocks') <> 'array' then
    return '{"blocks":[]}'::jsonb;
  end if;
  for v_in in select value from jsonb_array_elements(p_doc->'blocks')
  loop
    exit when v_n >= 80;
    v_type := lower(coalesce(v_in->>'type', ''));
    if v_type = 'divider' then
      v_block := jsonb_build_object('type', 'divider');
    elsif v_type = 'list' then
      v_block := jsonb_build_object(
        'type', 'list',
        'ordered', coalesce((v_in->>'ordered')::boolean, false),
        'items', coalesce(v_in->'items', '[]'::jsonb)
      );
    elsif v_type in ('heading', 'paragraph', 'quote', 'link') then
      v_block := jsonb_build_object(
        'type', v_type,
        'text', left(coalesce(v_in->>'text', ''), 2000),
        'bold', coalesce((v_in->>'bold')::boolean, false),
        'italic', coalesce((v_in->>'italic')::boolean, false)
      );
      if v_type = 'link' then
        if coalesce(v_in->>'url', '') !~ '^https://' then
          continue;
        end if;
        v_block := v_block || jsonb_build_object('url', left(v_in->>'url', 500));
      end if;
      if v_type = 'heading' then
        v_block := v_block || jsonb_build_object(
          'level', least(greatest(coalesce((v_in->>'level')::int, 2), 1), 3)
        );
      end if;
    else
      continue;
    end if;
    v_out := v_out || jsonb_build_array(v_block);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('blocks', v_out);
end;
$$;

create or replace function public.announcement_host_izinli_mi(p_url text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_host text;
  v_hosts text[];
begin
  if p_url is null or p_url !~ '^https://' then return false; end if;
  v_host := lower(split_part(split_part(substring(p_url from 9), '/', 1), ':', 1));
  if v_host = '' or v_host like '%@%' then return false; end if;
  select allowed_hosts into v_hosts from public.announcement_settings where id = 1;
  return v_host = any (coalesce(v_hosts, '{}'));
end;
$$;

revoke all on function public.announcement_host_izinli_mi(text) from public, anon, authenticated;

create or replace function public.announcement_cta_guvenli_mi(p_type text, p_dest jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_path text := coalesce(p_dest->>'path', '');
  v_id text := coalesce(p_dest->>'id', '');
  v_url text := coalesce(p_dest->>'url', '');
begin
  if p_type = 'INTERNAL_ROUTE' then
    return v_path ~ '^/(duyuru|kullanici|room|lobi|canli|durum|ajans|oyun|kesfet|sehir|ulke|platform|ayarlar|\(tabs\))(/|$)'
      and v_path !~ '\.\.'
      and position('://' in v_path) = 0;
  elsif p_type in ('PROFILE', 'CREATOR', 'VOICE_ROOM', 'LIVE', 'STATUS', 'AGENCY', 'GAME') then
    return v_id ~ '^[A-Za-z0-9_-]{1,80}$';
  elsif p_type in ('WEBVIEW', 'EXTERNAL_URL') then
    return public.announcement_host_izinli_mi(v_url);
  end if;
  return false;
end;
$$;

revoke all on function public.announcement_cta_guvenli_mi(text, jsonb) from public, anon, authenticated;

create or replace function public.announcement_boyut_eslesir(
  p_user_id uuid,
  p_dimension text,
  p_values jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_p public.profiles%rowtype;
  v_stats public.user_profile_stats%rowtype;
  v_platform text;
  v_version text;
  v_min int;
  v_max int;
  v_arr text[];
begin
  if p_user_id is null then return false; end if;
  if auth.uid() is distinct from p_user_id
     and not public.admin_has_permission('announcement.analytics')
     and not public.admin_has_permission('announcement.publish') then
    return false;
  end if;

  select * into v_p from public.profiles where id = p_user_id;
  if v_p.id is null or v_p.deleted_at is not null then return false; end if;
  select * into v_stats from public.user_profile_stats where user_id = p_user_id;

  select ds.platform, ds.app_version into v_platform, v_version
  from public.device_sessions ds
  where ds.user_id = p_user_id and ds.revoked_at is null
  order by ds.last_seen_at desc
  limit 1;

  select coalesce(array_agg(value), '{}') into v_arr
  from jsonb_array_elements_text(case when jsonb_typeof(p_values) = 'array' then p_values else '[]'::jsonb end);

  if p_dimension = 'country' then
    return upper(coalesce(v_p.country_code, v_p.country, '')) = any (
      select upper(x) from unnest(v_arr) x
    );
  elsif p_dimension = 'city' then
    return v_p.primary_city_id::text = any (v_arr);
  elsif p_dimension = 'language' then
    return lower(coalesce(v_p.language, '')) = any (select lower(x) from unnest(v_arr) x);
  elsif p_dimension = 'platform' then
    if 'all' = any (select lower(x) from unnest(v_arr) x) then return true; end if;
    return lower(coalesce(v_platform, '')) = any (select lower(x) from unnest(v_arr) x);
  elsif p_dimension = 'app_version' then
    return coalesce(v_version, '') = any (v_arr);
  elsif p_dimension = 'account_type' then
    return (
      ('guest' = any (v_arr) and coalesce(v_p.is_guest, false))
      or ('creator' = any (v_arr) and (coalesce(v_p.is_host, false) or coalesce(v_stats.host_status, '') in ('independent', 'agency')))
      or ('agency' = any (v_arr) and exists (select 1 from public.agencies ag where ag.owner_id = p_user_id and ag.status = 'active'))
      or ('agency_member' = any (v_arr) and coalesce(v_stats.agency_id, (select hp.agency_id from public.host_profiles hp where hp.user_id = p_user_id)) is not null)
      or ('user' = any (v_arr) and not coalesce(v_p.is_guest, false))
    );
  elsif p_dimension = 'creator' then
    return coalesce(v_p.is_host, false)
      or coalesce(v_stats.host_status, '') in ('independent', 'agency')
      or v_p.id::text = any (v_arr);
  elsif p_dimension = 'agency' then
    return exists (
      select 1 from public.agencies ag
      where ag.id::text = any (v_arr)
        and (ag.owner_id = p_user_id or ag.id = v_stats.agency_id
             or ag.id = (select hp.agency_id from public.host_profiles hp where hp.user_id = p_user_id))
    );
  elsif p_dimension = 'agency_member' then
    return exists (
      select 1 from public.host_profiles hp
      where hp.user_id = p_user_id
        and hp.agency_id is not null
        and (cardinality(v_arr) = 0 or hp.agency_id::text = any (v_arr) or 'yes' = any (v_arr))
    ) or (
      v_stats.agency_id is not null
      and (cardinality(v_arr) = 0 or v_stats.agency_id::text = any (v_arr) or 'yes' = any (v_arr))
    );
  elsif p_dimension = 'vip_level' then
    v_min := coalesce((p_values->>'min')::int, nullif(v_arr[1], '')::int, 0);
    v_max := coalesce((p_values->>'max')::int, 999);
    return coalesce(v_stats.vip_level, 0) between v_min and v_max;
  elsif p_dimension = 'user_level' then
    v_min := coalesce((p_values->>'min')::int, nullif(v_arr[1], '')::int, 1);
    v_max := coalesce((p_values->>'max')::int, 9999);
    return coalesce(v_p.level, 1) between v_min and v_max;
  elsif p_dimension = 'verified' then
    if 'false' = any (select lower(x) from unnest(v_arr) x) then
      return not coalesce(v_p.is_verified, false);
    end if;
    return coalesce(v_p.is_verified, false);
  elsif p_dimension = 'user_ids' then
    return v_p.id::text = any (v_arr) or coalesce(v_p.public_user_id, '') = any (v_arr);
  end if;
  return false;
exception when others then
  return false;
end;
$$;

revoke all on function public.announcement_boyut_eslesir(uuid, text, jsonb) from public, anon;
grant execute on function public.announcement_boyut_eslesir(uuid, text, jsonb) to authenticated;

create or replace function public.announcement_hedef_uygun_mu(p_announcement_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_logic text;
  v_dim record;
  v_ok boolean;
  v_dims int := 0;
  v_hit int := 0;
begin
  if p_user_id is null then return false; end if;
  select target_mode, target_logic into v_mode, v_logic
  from public.announcements where id = p_announcement_id and deleted_at is null;
  if v_mode is null then return false; end if;
  if v_mode = 'all' then return true; end if;

  for v_dim in
    select dimension, values from public.announcement_targets
    where announcement_id = p_announcement_id
  loop
    v_dims := v_dims + 1;
    v_ok := public.announcement_boyut_eslesir(p_user_id, v_dim.dimension, v_dim.values);
    if v_logic = 'OR' and v_ok then return true; end if;
    if v_logic = 'AND' and not v_ok then return false; end if;
    if v_ok then v_hit := v_hit + 1; end if;
  end loop;

  if v_dims = 0 then return false; end if;
  if v_logic = 'OR' then return false; end if;
  return v_hit = v_dims;
end;
$$;

revoke all on function public.announcement_hedef_uygun_mu(uuid, uuid) from public, anon;
grant execute on function public.announcement_hedef_uygun_mu(uuid, uuid) to authenticated;

create or replace function public.announcement_gorunur_mu(p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_a public.announcements%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  select * into v_a from public.announcements where id = p_id;
  if v_a.id is null or v_a.deleted_at is not null then return false; end if;
  if public.announcement_izin('announcement.edit')
     or public.announcement_izin('announcement.create')
     or public.announcement_izin('announcement.publish')
     or public.announcement_izin('announcement.analytics') then
    return true;
  end if;
  if not public.ozellik_bayragi_aktif_mi('announcements_enabled') then return false; end if;
  if v_a.status <> 'published' then return false; end if;
  if v_a.publish_at > now() then return false; end if;
  if v_a.expire_at is not null and v_a.expire_at <= now() then return false; end if;
  return public.announcement_hedef_uygun_mu(v_a.id, v_uid);
end;
$$;

revoke all on function public.announcement_gorunur_mu(uuid) from public, anon;
grant execute on function public.announcement_gorunur_mu(uuid) to authenticated;

create or replace function public.announcement_ceviri(p_id uuid, p_locale text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_loc text := lower(left(coalesce(p_locale, 'tr'), 8));
  v_row public.announcement_translations%rowtype;
  v_fb public.announcement_translations%rowtype;
begin
  select * into v_row from public.announcement_translations
  where announcement_id = p_id and locale = v_loc and length(trim(title)) > 0;
  if v_row.announcement_id is not null then
    return jsonb_build_object(
      'locale', v_row.locale, 'title', v_row.title, 'summary', v_row.summary,
      'body_doc', v_row.body_doc, 'body_plain', v_row.body_plain,
      'button_text', v_row.button_text, 'fallback', false
    );
  end if;
  select * into v_fb from public.announcement_translations
  where announcement_id = p_id and locale = 'tr';
  if v_fb.announcement_id is null then
    select * into v_fb from public.announcement_translations
    where announcement_id = p_id
    order by locale
    limit 1;
  end if;
  if v_fb.announcement_id is null then
    return jsonb_build_object('locale', v_loc, 'title', '', 'summary', '', 'body_doc', '{"blocks":[]}'::jsonb, 'body_plain', '', 'fallback', true);
  end if;
  return jsonb_build_object(
    'locale', v_fb.locale, 'title', v_fb.title, 'summary', v_fb.summary,
    'body_doc', v_fb.body_doc, 'body_plain', v_fb.body_plain,
    'button_text', v_fb.button_text, 'fallback', true
  );
end;
$$;

revoke all on function public.announcement_ceviri(uuid, text) from public, anon, authenticated;

create or replace function public.announcement_medya_dil_uygun(
  p_announcement_id uuid,
  p_locale text,
  p_media_locale text,
  p_sort_order int
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_media_locale is not distinct from nullif(lower(left(coalesce(p_locale, 'tr'), 8)), '')
    or (
      p_media_locale is null
      and not exists (
        select 1
        from public.announcement_media o
        where o.announcement_id = p_announcement_id
          and o.deleted_at is null
          and o.public_url is not null
          and o.locale = nullif(lower(left(coalesce(p_locale, 'tr'), 8)), '')
          and o.sort_order = p_sort_order
      )
    );
$$;

revoke all on function public.announcement_medya_dil_uygun(uuid, text, text, int) from public, anon;

create or replace function public.duyuru_liste(
  p_locale text default 'tr',
  p_filter text default 'all',
  p_cursor text default null,
  p_limit int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 40);
  v_pin int := 1;
  v_pri int := 2147483647;
  v_ts timestamptz := 'infinity';
  v_id uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_items jsonb := '[]'::jsonb;
  v_rec record;
  v_n int := 0;
  v_next text := null;
  v_tr jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('items', '[]'::jsonb, 'next_cursor', null);
  end if;
  perform public.announcement_durum_yenile();

  if p_cursor is not null and split_part(p_cursor, '|', 4) <> '' then
    begin
      v_pin := split_part(p_cursor, '|', 1)::int;
      v_pri := split_part(p_cursor, '|', 2)::int;
      v_ts := split_part(p_cursor, '|', 3)::timestamptz;
      v_id := split_part(p_cursor, '|', 4)::uuid;
    exception when others then
      null;
    end;
  end if;

  for v_rec in
    select a.id, a.severity, a.pinned, a.pin_priority, a.publish_at, a.show_view_count, a.unique_view_count,
           c.code as category_code, c.name as category_name, c.icon as category_icon, c.theme_color
    from public.announcements a
    left join public.announcement_categories c on c.id = a.category_id
    where a.deleted_at is null
      and a.status = 'published'
      and a.publish_at <= now()
      and (a.expire_at is null or a.expire_at > now())
      and public.ozellik_bayragi_aktif_mi('announcements_enabled')
      and public.announcement_hedef_uygun_mu(a.id, v_uid)
      and (
        coalesce(p_filter, 'all') in ('all', '')
        or (p_filter = 'important' and a.severity in ('IMPORTANT', 'CRITICAL'))
        or (p_filter = 'feature' and c.code = 'NEW_FEATURE')
        or (p_filter = 'event' and c.code = 'EVENT')
      )
      and (
        (case when a.pinned then 1 else 0 end), a.pin_priority, a.publish_at, a.id
      ) < (v_pin, v_pri, v_ts, v_id)
    order by a.pinned desc, a.pin_priority desc, a.publish_at desc, a.id desc
    limit v_limit + 1
  loop
    v_n := v_n + 1;
    if v_n > v_limit then
      v_next := (case when v_rec.pinned then '1' else '0' end) || '|' || v_rec.pin_priority || '|' || v_rec.publish_at || '|' || v_rec.id;
      exit;
    end if;
    v_tr := public.announcement_ceviri(v_rec.id, p_locale);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id', v_rec.id,
      'severity', v_rec.severity,
      'pinned', v_rec.pinned,
      'publish_at', v_rec.publish_at,
      'category_code', v_rec.category_code,
      'category_name', v_rec.category_name,
      'category_icon', v_rec.category_icon,
      'theme_color', v_rec.theme_color,
      'title', v_tr->>'title',
      'summary', v_tr->>'summary',
      'content_locale', v_tr->>'locale',
      'unread', not exists (
        select 1 from public.announcement_user_state s
        where s.announcement_id = v_rec.id and s.user_id = v_uid and s.read_at is not null
      ),
      'show_view_count', v_rec.show_view_count,
      'unique_view_count', case when v_rec.show_view_count then v_rec.unique_view_count else null end,
      'cover', (
        select jsonb_build_object(
          'kind', m.kind,
          'thumbnail_url', coalesce(m.thumbnail_url, case when m.kind = 'IMAGE' then m.public_url else null end),
          'duration_ms', m.duration_ms
        )
        from public.announcement_media m
        where m.announcement_id = v_rec.id and m.deleted_at is null
          and public.announcement_medya_dil_uygun(v_rec.id, p_locale, m.locale, m.sort_order)
        order by (m.locale is not null) desc, m.sort_order, m.created_at
        limit 1
      )
    ));
  end loop;

  return jsonb_build_object('items', v_items, 'next_cursor', v_next);
end;
$$;

revoke all on function public.duyuru_liste(text, text, text, int) from public, anon;
grant execute on function public.duyuru_liste(text, text, text, int) to authenticated;

create or replace function public.duyuru_detay(p_id uuid, p_locale text default 'tr')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_a public.announcements%rowtype;
  v_tr jsonb;
  v_state public.announcement_user_state%rowtype;
  v_reaction text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.announcement_durum_yenile();
  if not public.announcement_gorunur_mu(p_id) then
    raise exception 'Not found';
  end if;
  select * into v_a from public.announcements where id = p_id;
  v_tr := public.announcement_ceviri(p_id, p_locale);
  select * into v_state from public.announcement_user_state
  where announcement_id = p_id and user_id = v_uid;
  select reaction into v_reaction from public.announcement_reactions
  where announcement_id = p_id and user_id = v_uid;

  return jsonb_build_object(
    'id', v_a.id,
    'severity', v_a.severity,
    'status', v_a.status,
    'publish_at', v_a.publish_at,
    'pinned', v_a.pinned,
    'allow_reactions', v_a.allow_reactions,
    'allow_comments', v_a.allow_comments,
    'show_view_count', v_a.show_view_count,
    'unique_view_count', case when v_a.show_view_count then v_a.unique_view_count else null end,
    'reaction_counts', v_a.reaction_counts,
    'my_reaction', v_reaction,
    'read_at', v_state.read_at,
    'category', (
      select jsonb_build_object('code', c.code, 'name', c.name, 'icon', c.icon, 'theme_color', c.theme_color)
      from public.announcement_categories c where c.id = v_a.category_id
    ),
    'translation', v_tr,
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'kind', m.kind, 'public_url', m.public_url,
        'thumbnail_url', m.thumbnail_url, 'duration_ms', m.duration_ms,
        'width', m.width, 'height', m.height, 'caption', m.caption, 'sort_order', m.sort_order
      ) order by m.sort_order, m.created_at)
      from public.announcement_media m
      where m.announcement_id = p_id and m.deleted_at is null
        and m.public_url is not null
        and public.announcement_medya_dil_uygun(p_id, p_locale, m.locale, m.sort_order)
    ), '[]'::jsonb),
    'ctas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'destination_type', c.destination_type, 'destination', c.destination,
        'label', coalesce(c.labels->>lower(left(coalesce(p_locale,'tr'),8)), c.labels->>'tr', c.labels->>'en', '')
      ) order by c.sort_order)
      from public.announcement_ctas c where c.announcement_id = p_id
    ), '[]'::jsonb),
    'comments', case when v_a.allow_comments then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cm.id, 'body', cm.body, 'created_at', cm.created_at,
        'user_id', cm.user_id, 'display_name', p.display_name, 'username', p.username,
        'avatar_url', p.avatar_url, 'is_mine', cm.user_id = v_uid
      ) order by cm.created_at)
      from public.announcement_comments cm
      join public.profiles p on p.id = cm.user_id
      where cm.announcement_id = p_id and cm.deleted_at is null
        and not public.kullanicilar_engelli_mi(v_uid, cm.user_id)
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end;
$$;

revoke all on function public.duyuru_detay(uuid, text) from public, anon;
grant execute on function public.duyuru_detay(uuid, text) to authenticated;

create or replace function public.duyuru_rozet()
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n int;
begin
  if v_uid is null then return 0; end if;
  if not public.ozellik_bayragi_aktif_mi('announcements_enabled') then return 0; end if;
  select count(*)::int into v_n
  from public.announcements a
  where a.deleted_at is null
    and a.status = 'published'
    and a.publish_at <= now()
    and (a.expire_at is null or a.expire_at > now())
    and public.announcement_hedef_uygun_mu(a.id, v_uid)
    and not exists (
      select 1 from public.announcement_user_state s
      where s.announcement_id = a.id and s.user_id = v_uid and s.read_at is not null
    );
  return coalesce(v_n, 0);
end;
$$;

revoke all on function public.duyuru_rozet() from public, anon;
grant execute on function public.duyuru_rozet() to authenticated;

create or replace function public.duyuru_ana_sayfa(p_locale text default 'tr')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;
  perform public.announcement_durum_yenile();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'home_display', a.home_display,
      'theme_color', c.theme_color,
      'title', (public.announcement_ceviri(a.id, p_locale)->>'title'),
      'summary', (public.announcement_ceviri(a.id, p_locale)->>'summary'),
      'thumbnail_url', (
        select coalesce(m.thumbnail_url, case when m.kind = 'IMAGE' then m.public_url else null end)
        from public.announcement_media m
        where m.announcement_id = a.id and m.deleted_at is null
          and public.announcement_medya_dil_uygun(a.id, p_locale, m.locale, m.sort_order)
        order by (m.locale is not null) desc, m.sort_order limit 1
      )
    ) order by a.pin_priority desc, a.publish_at desc)
    from public.announcements a
    left join public.announcement_categories c on c.id = a.category_id
    where a.deleted_at is null
      and a.status = 'published'
      and a.show_on_home
      and a.publish_at <= now()
      and (a.expire_at is null or a.expire_at > now())
      and public.ozellik_bayragi_aktif_mi('announcements_enabled')
      and public.announcement_hedef_uygun_mu(a.id, v_uid)
    limit 8
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.duyuru_ana_sayfa(text) from public, anon;
grant execute on function public.duyuru_ana_sayfa(text) to authenticated;

create or replace function public.duyuru_acilis(p_locale text default 'tr')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_a public.announcements%rowtype;
  v_tr jsonb;
begin
  if v_uid is null then return null; end if;
  perform public.announcement_durum_yenile();
  select a.* into v_a
  from public.announcements a
  left join public.announcement_user_state s
    on s.announcement_id = a.id and s.user_id = v_uid
  where a.deleted_at is null
    and a.status = 'published'
    and a.show_on_launch
    and a.publish_at <= now()
    and (a.expire_at is null or a.expire_at > now())
    and public.ozellik_bayragi_aktif_mi('announcements_enabled')
    and public.announcement_hedef_uygun_mu(a.id, v_uid)
    and (
      (coalesce(a.launch_frequency, 'ONCE_PER_USER') = 'ONCE_PER_USER' and s.launch_shown_at is null and s.read_at is null)
      or (a.launch_frequency = 'EVERY_APP_OPEN_UNTIL_READ' and s.read_at is null)
    )
  order by case a.severity when 'CRITICAL' then 0 when 'IMPORTANT' then 1 else 2 end,
           a.pin_priority desc, a.publish_at desc
  limit 1;
  if v_a.id is null then return null; end if;
  v_tr := public.announcement_ceviri(v_a.id, p_locale);
  return jsonb_build_object(
    'id', v_a.id,
    'severity', v_a.severity,
    'dismissible', v_a.dismissible,
    'show_until_read', v_a.show_until_read,
    'launch_frequency', v_a.launch_frequency,
    'title', v_tr->>'title',
    'summary', v_tr->>'summary',
    'body_plain', left(v_tr->>'body_plain', 400),
    'content_locale', v_tr->>'locale',
    'hero', (
      select coalesce(m.thumbnail_url, case when m.kind = 'IMAGE' then m.public_url else null end)
      from public.announcement_media m
      where m.announcement_id = v_a.id and m.deleted_at is null
        and public.announcement_medya_dil_uygun(v_a.id, p_locale, m.locale, m.sort_order)
      order by (m.locale is not null) desc, m.sort_order limit 1
    ),
    'ctas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'destination_type', c.destination_type, 'destination', c.destination,
        'label', coalesce(c.labels->>lower(left(coalesce(p_locale,'tr'),8)), c.labels->>'tr', '')
      ) order by c.sort_order)
      from public.announcement_ctas c where c.announcement_id = v_a.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.duyuru_acilis(text) from public, anon;
grant execute on function public.duyuru_acilis(text) to authenticated;

create or replace function public.duyuru_olay_yaz(p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item jsonb;
  v_n int := 0;
  v_ok int := 0;
  v_skip int := 0;
  v_recent int;
  v_type text;
  v_ann uuid;
  v_media uuid;
  v_cta uuid;
  v_key text;
  v_bucket bigint;
  v_inserted uuid;
  v_kind text;
  v_day date := (now() at time zone 'utc')::date;
  v_first boolean;
  v_state public.announcement_user_state%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if jsonb_typeof(p_events) <> 'array' then
    return jsonb_build_object('ok', false, 'accepted', 0);
  end if;

  select count(*) into v_recent
  from public.announcement_events e
  where e.user_id = v_uid and e.created_at > now() - interval '1 minute';
  if v_recent > 40 then
    return jsonb_build_object('ok', false, 'accepted', 0, 'reason', 'rate');
  end if;

  for v_item in select value from jsonb_array_elements(p_events)
  loop
    exit when v_n >= 20;
    v_n := v_n + 1;
    v_type := upper(coalesce(v_item->>'event_type', ''));
    begin
      v_ann := (v_item->>'announcement_id')::uuid;
    exception when others then
      v_skip := v_skip + 1;
      continue;
    end;
    if v_type not in (
      'IMPRESSION','OPEN','READ','MEDIA_START','MEDIA_25','MEDIA_50','MEDIA_75','MEDIA_COMPLETE','CTA_CLICK','DISMISS'
    ) then
      v_skip := v_skip + 1;
      continue;
    end if;
    if not public.announcement_gorunur_mu(v_ann) then
      v_skip := v_skip + 1;
      continue;
    end if;

    v_media := null;
    v_cta := null;
    if coalesce(v_item->>'media_id', '') <> '' then
      begin
        v_media := (v_item->>'media_id')::uuid;
      exception when others then v_media := null; end;
      if not exists (
        select 1 from public.announcement_media m
        where m.id = v_media and m.announcement_id = v_ann and m.deleted_at is null
      ) then
        v_skip := v_skip + 1;
        continue;
      end if;
    end if;
    if coalesce(v_item->>'cta_id', '') <> '' then
      begin
        v_cta := (v_item->>'cta_id')::uuid;
      exception when others then v_cta := null; end;
      if not exists (select 1 from public.announcement_ctas c where c.id = v_cta and c.announcement_id = v_ann) then
        v_skip := v_skip + 1;
        continue;
      end if;
    end if;

    v_bucket := case v_type
      when 'IMPRESSION' then floor(extract(epoch from now()) / 600)
      when 'OPEN' then floor(extract(epoch from now()) / 3600)
      when 'CTA_CLICK' then floor(extract(epoch from now()) / 60)
      when 'DISMISS' then floor(extract(epoch from now()) / 3600)
      else 0
    end;
    v_key := v_uid::text || '|' || v_ann::text || '|' || v_type || '|' ||
      coalesce(v_media::text, '') || '|' || coalesce(v_cta::text, '') || '|' || v_bucket::text;

    insert into public.announcement_events (
      announcement_id, user_id, session_id, event_type, media_id, cta_id, platform, app_version, dedupe_key
    ) values (
      v_ann, v_uid,
      left(coalesce(v_item->>'session_id', ''), 64),
      v_type, v_media, v_cta,
      case when lower(coalesce(v_item->>'platform', '')) in ('ios','android','web') then lower(v_item->>'platform') else null end,
      left(coalesce(v_item->>'app_version', ''), 32),
      v_key
    )
    on conflict (dedupe_key) do nothing
    returning id into v_inserted;

    if v_inserted is null then
      v_skip := v_skip + 1;
      continue;
    end if;
    v_ok := v_ok + 1;

    insert into public.announcement_user_state (announcement_id, user_id)
    values (v_ann, v_uid)
    on conflict (announcement_id, user_id) do nothing;

    select * into v_state from public.announcement_user_state
    where announcement_id = v_ann and user_id = v_uid;
    v_first := v_state.first_impression_at is null;

    if v_type = 'IMPRESSION' then
      update public.announcements set impression_count = impression_count + 1,
        unique_view_count = unique_view_count + case when v_first then 1 else 0 end
      where id = v_ann;
      update public.announcement_user_state
      set first_impression_at = coalesce(first_impression_at, now()),
          last_impression_at = now(),
          last_impression_day = v_day
      where announcement_id = v_ann and user_id = v_uid;
      insert into public.announcement_analytics_daily (announcement_id, day, impressions, unique_viewers)
      values (v_ann, v_day, 1, case when v_state.last_impression_day is distinct from v_day then 1 else 0 end)
      on conflict (announcement_id, day) do update
        set impressions = public.announcement_analytics_daily.impressions + 1,
            unique_viewers = public.announcement_analytics_daily.unique_viewers
              + case when v_state.last_impression_day is distinct from v_day then 1 else 0 end;
    elsif v_type = 'OPEN' then
      update public.announcements set open_count = open_count + 1 where id = v_ann;
      update public.announcement_user_state set opened_at = coalesce(opened_at, now())
      where announcement_id = v_ann and user_id = v_uid;
      insert into public.announcement_analytics_daily (announcement_id, day, opens)
      values (v_ann, v_day, 1)
      on conflict (announcement_id, day) do update
        set opens = public.announcement_analytics_daily.opens + 1;
    elsif v_type = 'READ' then
      update public.announcements set read_count = read_count + case when v_state.read_at is null then 1 else 0 end
      where id = v_ann;
      update public.announcement_user_state
      set read_at = coalesce(read_at, now()),
          read_source = coalesce(read_source, left(coalesce(v_item->>'read_source', 'criteria'), 16))
      where announcement_id = v_ann and user_id = v_uid;
      if v_state.read_at is null then
        insert into public.announcement_analytics_daily (announcement_id, day, reads)
        values (v_ann, v_day, 1)
        on conflict (announcement_id, day) do update
          set reads = public.announcement_analytics_daily.reads + 1;
      end if;
    elsif v_type = 'CTA_CLICK' then
      update public.announcements set cta_click_count = cta_click_count + 1 where id = v_ann;
      insert into public.announcement_analytics_daily (announcement_id, day, cta_clicks)
      values (v_ann, v_day, 1)
      on conflict (announcement_id, day) do update
        set cta_clicks = public.announcement_analytics_daily.cta_clicks + 1;
    elsif v_type in ('MEDIA_START', 'MEDIA_COMPLETE') then
      select kind into v_kind from public.announcement_media where id = v_media;
      if v_type = 'MEDIA_START' and v_kind = 'VIDEO' then
        update public.announcements set video_start_count = video_start_count + 1 where id = v_ann;
        insert into public.announcement_analytics_daily (announcement_id, day, video_starts)
        values (v_ann, v_day, 1)
        on conflict (announcement_id, day) do update
          set video_starts = public.announcement_analytics_daily.video_starts + 1;
      elsif v_type = 'MEDIA_COMPLETE' and v_kind = 'VIDEO' then
        update public.announcements set video_complete_count = video_complete_count + 1 where id = v_ann;
        insert into public.announcement_analytics_daily (announcement_id, day, video_completes)
        values (v_ann, v_day, 1)
        on conflict (announcement_id, day) do update
          set video_completes = public.announcement_analytics_daily.video_completes + 1;
      elsif v_type = 'MEDIA_START' and v_kind in ('AUDIO', 'VOICE_RECORDING') then
        update public.announcements set audio_listen_count = audio_listen_count + 1 where id = v_ann;
        insert into public.announcement_analytics_daily (announcement_id, day, audio_listens)
        values (v_ann, v_day, 1)
        on conflict (announcement_id, day) do update
          set audio_listens = public.announcement_analytics_daily.audio_listens + 1;
      end if;
    elsif v_type = 'DISMISS' then
      update public.announcement_user_state set dismissed_at = now()
      where announcement_id = v_ann and user_id = v_uid;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'accepted', v_ok, 'skipped', v_skip);
end;
$$;

revoke all on function public.duyuru_olay_yaz(jsonb) from public, anon;
grant execute on function public.duyuru_olay_yaz(jsonb) to authenticated;

create or replace function public.duyuru_okundu_isaretle(p_announcement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.announcement_gorunur_mu(p_announcement_id) then
    raise exception 'Not found';
  end if;
  perform public.duyuru_olay_yaz(jsonb_build_array(jsonb_build_object(
    'announcement_id', p_announcement_id,
    'event_type', 'READ',
    'read_source', 'manual'
  )));
end;
$$;

revoke all on function public.duyuru_okundu_isaretle(uuid) from public, anon;
grant execute on function public.duyuru_okundu_isaretle(uuid) to authenticated;

create or replace function public.duyuru_acilis_goruldu(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_freq text;
begin
  if v_uid is null then return; end if;
  if not public.announcement_gorunur_mu(p_id) then return; end if;
  select launch_frequency into v_freq from public.announcements where id = p_id;
  if coalesce(v_freq, 'ONCE_PER_USER') <> 'ONCE_PER_USER' then return; end if;
  insert into public.announcement_user_state (announcement_id, user_id, launch_shown_at)
  values (p_id, v_uid, now())
  on conflict (announcement_id, user_id) do update
    set launch_shown_at = coalesce(public.announcement_user_state.launch_shown_at, now());
end;
$$;

revoke all on function public.duyuru_acilis_goruldu(uuid) from public, anon;
grant execute on function public.duyuru_acilis_goruldu(uuid) to authenticated;

create or replace function public.duyuru_tepki(p_id uuid, p_reaction text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := lower(coalesce(p_reaction, ''));
  v_prev text;
  v_counts jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.announcement_gorunur_mu(p_id) then raise exception 'Not found'; end if;
  if not exists (select 1 from public.announcements a where a.id = p_id and a.allow_reactions) then
    raise exception 'Reactions disabled';
  end if;
  if v_code <> '' and v_code not in ('heart', 'fire', 'clap', 'party') then
    raise exception 'Invalid reaction';
  end if;

  select reaction into v_prev from public.announcement_reactions
  where announcement_id = p_id and user_id = v_uid;

  if v_prev is not null and exists (
    select 1 from public.announcement_reactions
    where announcement_id = p_id and user_id = v_uid
      and updated_at > now() - interval '2 seconds'
      and reaction is distinct from nullif(v_code, '')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'rate');
  end if;

  if v_code = '' then
    delete from public.announcement_reactions where announcement_id = p_id and user_id = v_uid;
  else
    insert into public.announcement_reactions (announcement_id, user_id, reaction, updated_at)
    values (p_id, v_uid, v_code, now())
    on conflict (announcement_id, user_id) do update
      set reaction = excluded.reaction, updated_at = now();
  end if;

  select coalesce(jsonb_object_agg(reaction, n), '{}'::jsonb) into v_counts
  from (
    select reaction, count(*)::int as n
    from public.announcement_reactions
    where announcement_id = p_id
    group by reaction
  ) t;
  update public.announcements set reaction_counts = coalesce(v_counts, '{}'::jsonb) where id = p_id;
  return jsonb_build_object('ok', true, 'reaction', nullif(v_code, ''), 'counts', coalesce(v_counts, '{}'::jsonb));
end;
$$;

revoke all on function public.duyuru_tepki(uuid, text) from public, anon;
grant execute on function public.duyuru_tepki(uuid, text) to authenticated;

create or replace function public.duyuru_yorum_ekle(p_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_body text := left(trim(coalesce(p_body, '')), 500);
  v_id uuid;
  v_recent int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.announcement_gorunur_mu(p_id) then raise exception 'Not found'; end if;
  if not exists (select 1 from public.announcements a where a.id = p_id and a.allow_comments and a.deleted_at is null) then
    raise exception 'Comments disabled';
  end if;
  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir yorum yapamaz'; end if;
  if not public.hesap_aktif_mi(v_uid) then raise exception 'Forbidden'; end if;
  if length(v_body) < 1 then raise exception 'Yorum bos olamaz'; end if;
  perform public.ugc_metin_zorunlu_filtre(v_body);
  if exists (
    select 1 from public.announcements a
    where a.id = p_id
      and a.created_by is not null
      and public.kullanicilar_engelli_mi(v_uid, a.created_by)
  ) then
    raise exception 'Forbidden';
  end if;
  select count(*) into v_recent from public.announcement_comments
  where user_id = v_uid and created_at > now() - interval '1 minute' and deleted_at is null;
  if v_recent >= 5 then raise exception 'Rate limited'; end if;

  insert into public.announcement_comments (announcement_id, user_id, body)
  values (p_id, v_uid, v_body)
  returning id into v_id;
  update public.announcements
  set comment_count = (
    select count(*)::int from public.announcement_comments c
    where c.announcement_id = p_id and c.deleted_at is null
  )
  where id = p_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.duyuru_yorum_ekle(uuid, text) from public, anon;
grant execute on function public.duyuru_yorum_ekle(uuid, text) to authenticated;

create or replace function public.duyuru_yorum_sil(p_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_c public.announcement_comments%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_c from public.announcement_comments where id = p_comment_id and deleted_at is null;
  if v_c.id is null then raise exception 'Not found'; end if;
  if v_c.user_id <> v_uid and not public.announcement_izin('announcement.edit') then
    raise exception 'Forbidden';
  end if;
  update public.announcement_comments set deleted_at = now() where id = p_comment_id;
  update public.announcements
  set comment_count = (
    select count(*)::int from public.announcement_comments c
    where c.announcement_id = v_c.announcement_id and c.deleted_at is null
  )
  where id = v_c.announcement_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.duyuru_yorum_sil(uuid) from public, anon;
grant execute on function public.duyuru_yorum_sil(uuid) to authenticated;

create or replace function public.duyuru_yorum_bildir(p_comment_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_c public.announcement_comments%rowtype;
  v_row public.user_reports;
begin
  select * into v_c from public.announcement_comments where id = p_comment_id and deleted_at is null;
  if v_c.id is null then raise exception 'Not found'; end if;
  v_row := public.kullanici_bildir(
    p_reason,
    v_c.user_id,
    null,
    null,
    'other',
    p_comment_id,
    jsonb_build_object('kind', 'announcement_comment', 'announcement_id', v_c.announcement_id, 'body', left(v_c.body, 240))
  );
  return jsonb_build_object('ok', true, 'report_id', v_row.id);
end;
$$;

revoke all on function public.duyuru_yorum_bildir(uuid, text) from public, anon;
grant execute on function public.duyuru_yorum_bildir(uuid, text) to authenticated;

create or replace function public.admin_duyuru_kaydet(p_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_id;
  v_before jsonb;
  v_after jsonb;
  v_action text := lower(coalesce(p_payload->>'action', 'draft'));
  v_status text;
  v_severity text := upper(coalesce(p_payload->>'severity', 'NORMAL'));
  v_publish timestamptz;
  v_expire timestamptz;
  v_tr jsonb;
  v_loc text;
  v_doc jsonb;
  v_plain text;
  v_title text;
  v_cta jsonb;
  v_tgt jsonb;
  v_dim text;
  v_dest_type text;
  v_old_targets jsonb;
  v_old_status text;
  v_cat uuid;
begin
  if p_id is null then
    if not public.announcement_izin('announcement.create') then raise exception 'Forbidden'; end if;
  else
    if not public.announcement_izin('announcement.edit') then raise exception 'Forbidden'; end if;
  end if;
  if v_action = 'publish' and not public.announcement_izin('announcement.publish') then
    raise exception 'Forbidden';
  end if;
  if v_severity not in ('NORMAL', 'IMPORTANT', 'CRITICAL') then v_severity := 'NORMAL'; end if;

  begin
    v_publish := nullif(p_payload->>'publish_at', '')::timestamptz;
  exception when others then v_publish := null; end;
  begin
    v_expire := nullif(p_payload->>'expire_at', '')::timestamptz;
  exception when others then v_expire := null; end;
  if v_publish is null then v_publish := now(); end if;

  if v_action = 'publish' then
    v_status := case when v_publish > now() then 'scheduled' else 'published' end;
  else
    v_status := 'draft';
  end if;

  begin
    v_cat := nullif(p_payload->>'category_id', '')::uuid;
  exception when others then v_cat := null; end;

  if v_id is null then
    insert into public.announcements (
      title, body, priority, status, severity, category_id, publish_at, expire_at,
      starts_at, ends_at, is_active, dismissible, show_until_read, pinned, pin_priority,
      show_on_home, home_display, show_on_launch, launch_frequency, allow_reactions,
      allow_comments, show_view_count, send_push, push_title, push_body, push_image_url,
      target_mode, target_logic, created_by, deep_link
    ) values (
      'Taslak', '', 
      case v_severity when 'CRITICAL' then 'urgent' when 'IMPORTANT' then 'high' else 'normal' end,
      'draft', v_severity, v_cat, v_publish, v_expire, v_publish, v_expire, false,
      coalesce((p_payload->>'dismissible')::boolean, true),
      coalesce((p_payload->>'show_until_read')::boolean, false),
      coalesce((p_payload->>'pinned')::boolean, false),
      coalesce((p_payload->>'pin_priority')::int, 0),
      coalesce((p_payload->>'show_on_home')::boolean, false),
      case when coalesce(p_payload->>'home_display','CARD') in ('CARD','BANNER','CAROUSEL') then p_payload->>'home_display' else 'CARD' end,
      coalesce((p_payload->>'show_on_launch')::boolean, false),
      case when coalesce(p_payload->>'launch_frequency','ONCE_PER_USER') in ('ONCE_PER_USER','EVERY_APP_OPEN_UNTIL_READ') then coalesce(p_payload->>'launch_frequency','ONCE_PER_USER') else 'ONCE_PER_USER' end,
      coalesce((p_payload->>'allow_reactions')::boolean, false),
      coalesce((p_payload->>'allow_comments')::boolean, false),
      coalesce((p_payload->>'show_view_count')::boolean, false),
      coalesce((p_payload->>'send_push')::boolean, false),
      left(coalesce(p_payload->>'push_title',''), 120),
      left(coalesce(p_payload->>'push_body',''), 180),
      nullif(left(coalesce(p_payload->>'push_image_url',''), 500), ''),
      case when coalesce(p_payload->>'target_mode','all') = 'targeted' then 'targeted' else 'all' end,
      case when coalesce(p_payload->>'target_logic','AND') = 'OR' then 'OR' else 'AND' end,
      auth.uid(),
      null
    ) returning id into v_id;
    perform public.announcement_audit(v_id, 'CREATE', null, p_payload);
  else
    select status, (
      select coalesce(jsonb_agg(jsonb_build_object('dimension', dimension, 'values', values)), '[]'::jsonb)
      from public.announcement_targets t where t.announcement_id = v_id
    ) into v_old_status, v_old_targets
    from public.announcements where id = v_id and deleted_at is null;
    if v_old_status is null then raise exception 'Not found'; end if;
    v_before := jsonb_build_object('status', v_old_status, 'targets', v_old_targets);
  end if;

  if jsonb_typeof(p_payload->'translations') = 'array' then
    for v_tr in select value from jsonb_array_elements(p_payload->'translations')
    loop
      v_loc := lower(left(coalesce(v_tr->>'locale', ''), 8));
      if v_loc not in ('tr','en','es','pt','ar','fr','fil') then continue; end if;
      v_doc := public.announcement_body_temizle(v_tr->'body_doc');
      v_plain := public.announcement_body_duz(v_doc);
      if v_plain = '' then v_plain := left(coalesce(v_tr->>'summary', ''), 2000); end if;
      insert into public.announcement_translations (announcement_id, locale, title, summary, body_doc, body_plain, button_text)
      values (
        v_id, v_loc,
        left(trim(coalesce(v_tr->>'title','')), 160),
        left(trim(coalesce(v_tr->>'summary','')), 280),
        v_doc, v_plain,
        nullif(left(trim(coalesce(v_tr->>'button_text','')), 40), '')
      )
      on conflict (announcement_id, locale) do update
        set title = excluded.title, summary = excluded.summary, body_doc = excluded.body_doc,
            body_plain = excluded.body_plain, button_text = excluded.button_text;
    end loop;
  end if;

  select t.title, t.body_plain, t.summary into v_title, v_plain, v_loc
  from public.announcement_translations t
  where t.announcement_id = v_id
  order by case t.locale when 'tr' then 0 else 1 end, t.locale
  limit 1;

  delete from public.announcement_targets where announcement_id = v_id;
  if coalesce(p_payload->>'target_mode','all') = 'targeted' and jsonb_typeof(p_payload->'targets') = 'array' then
    for v_tgt in select value from jsonb_array_elements(p_payload->'targets')
    loop
      v_dim := lower(coalesce(v_tgt->>'dimension', ''));
      if v_dim not in (
        'country','city','language','platform','app_version','account_type','creator',
        'agency','agency_member','vip_level','user_level','verified','user_ids'
      ) then continue; end if;
      insert into public.announcement_targets (announcement_id, dimension, values)
      values (v_id, v_dim, coalesce(v_tgt->'values', '[]'::jsonb))
      on conflict (announcement_id, dimension) do update set values = excluded.values;
    end loop;
  end if;

  delete from public.announcement_ctas where announcement_id = v_id;
  if jsonb_typeof(p_payload->'ctas') = 'array' then
    for v_cta in select value from jsonb_array_elements(p_payload->'ctas')
    loop
      v_dest_type := upper(coalesce(v_cta->>'destination_type', ''));
      if not public.announcement_cta_guvenli_mi(v_dest_type, coalesce(v_cta->'destination', '{}'::jsonb)) then
        raise exception 'Unsafe CTA';
      end if;
      insert into public.announcement_ctas (announcement_id, sort_order, destination_type, destination, labels)
      values (
        v_id,
        coalesce((v_cta->>'sort_order')::int, 0),
        v_dest_type,
        coalesce(v_cta->'destination', '{}'::jsonb),
        coalesce(v_cta->'labels', '{}'::jsonb)
      );
    end loop;
  end if;

  update public.announcements set
    title = coalesce(nullif(v_title, ''), title),
    body = coalesce(nullif(v_plain, ''), body),
    summary = coalesce((select summary from public.announcement_translations where announcement_id = v_id and locale = 'tr'), summary),
    body_doc = coalesce((select body_doc from public.announcement_translations where announcement_id = v_id and locale = 'tr'), body_doc),
    priority = case v_severity when 'CRITICAL' then 'urgent' when 'IMPORTANT' then 'high' else 'normal' end,
    status = v_status,
    severity = v_severity,
    category_id = v_cat,
    publish_at = v_publish,
    expire_at = v_expire,
    starts_at = v_publish,
    ends_at = v_expire,
    is_active = (v_status = 'published'),
    dismissible = coalesce((p_payload->>'dismissible')::boolean, true),
    show_until_read = coalesce((p_payload->>'show_until_read')::boolean, false),
    pinned = coalesce((p_payload->>'pinned')::boolean, false),
    pin_priority = coalesce((p_payload->>'pin_priority')::int, 0),
    show_on_home = coalesce((p_payload->>'show_on_home')::boolean, false),
    home_display = case when coalesce(p_payload->>'home_display','CARD') in ('CARD','BANNER','CAROUSEL') then coalesce(p_payload->>'home_display','CARD') else 'CARD' end,
    show_on_launch = coalesce((p_payload->>'show_on_launch')::boolean, false),
    launch_frequency = case when coalesce(p_payload->>'launch_frequency','ONCE_PER_USER') in ('ONCE_PER_USER','EVERY_APP_OPEN_UNTIL_READ') then coalesce(p_payload->>'launch_frequency','ONCE_PER_USER') else 'ONCE_PER_USER' end,
    allow_reactions = coalesce((p_payload->>'allow_reactions')::boolean, false),
    allow_comments = coalesce((p_payload->>'allow_comments')::boolean, false),
    show_view_count = coalesce((p_payload->>'show_view_count')::boolean, false),
    send_push = coalesce((p_payload->>'send_push')::boolean, false),
    push_title = left(coalesce(p_payload->>'push_title',''), 120),
    push_body = left(coalesce(p_payload->>'push_body',''), 180),
    push_image_url = nullif(left(coalesce(p_payload->>'push_image_url',''), 500), ''),
    target_mode = case when coalesce(p_payload->>'target_mode','all') = 'targeted' then 'targeted' else 'all' end,
    target_logic = case when coalesce(p_payload->>'target_logic','AND') = 'OR' then 'OR' else 'AND' end,
    deep_link = '/duyuru/' || v_id::text,
    updated_at = now(),
    published_once = published_once or v_status in ('published', 'scheduled')
  where id = v_id;

  v_after := jsonb_build_object('status', v_status, 'targets', p_payload->'targets', 'severity', v_severity);
  if p_id is not null then
    perform public.announcement_audit(v_id, 'EDIT', v_before, v_after);
    if v_old_status in ('published', 'scheduled') and v_old_targets is distinct from coalesce(p_payload->'targets', '[]'::jsonb) then
      perform public.announcement_audit(v_id, 'TARGET_CHANGE', v_before, v_after);
    end if;
    if v_action = 'publish' then
      perform public.announcement_audit(v_id, 'PUBLISH', v_before, v_after);
    end if;
  end if;

  if v_status = 'published' and coalesce((p_payload->>'send_push')::boolean, false) then
    insert into public.announcement_push_jobs (announcement_id, status, updated_at)
    values (v_id, 'pending', now())
    on conflict (announcement_id) do update
      set status = 'pending', updated_at = now()
      where public.announcement_push_jobs.status = 'done'
        and not exists (
          select 1 from public.announcement_push_log l where l.announcement_id = v_id
        );
    perform public.announcement_push_isle(v_id, 400);
  end if;

  perform public.announcement_sinyal(v_id, v_status);
  return jsonb_build_object('ok', true, 'id', v_id, 'status', v_status);
end;
$$;

revoke all on function public.admin_duyuru_kaydet(uuid, jsonb) from public, anon;
grant execute on function public.admin_duyuru_kaydet(uuid, jsonb) to authenticated;

create or replace function public.announcement_push_isle(p_id uuid, p_limit int default 400)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 400), 1), 500);
  v_cursor uuid;
  v_user uuid;
  v_last uuid;
  v_n int := 0;
  v_sent int := 0;
  v_scanned int := 0;
  v_title text;
  v_body text;
  v_image text;
  v_link text;
  v_out uuid;
  v_a public.announcements%rowtype;
begin
  if not public.announcement_izin('announcement.publish') then
    raise exception 'Forbidden';
  end if;
  select * into v_a from public.announcements where id = p_id and deleted_at is null;
  if v_a.id is null or not v_a.send_push or v_a.status <> 'published' then
    return jsonb_build_object('ok', true, 'sent', 0, 'done', true);
  end if;
  select cursor_user_id into v_cursor from public.announcement_push_jobs where announcement_id = p_id;
  v_title := left(coalesce(nullif(v_a.push_title, ''), v_a.title), 120);
  v_body := left(coalesce(nullif(v_a.push_body, ''), v_a.summary, ''), 180);
  v_image := coalesce(v_a.push_image_url, (
    select coalesce(m.thumbnail_url, m.public_url) from public.announcement_media m
    where m.announcement_id = p_id and m.deleted_at is null and m.kind = 'IMAGE'
    order by m.sort_order limit 1
  ));
  v_link := '/duyuru/' || p_id::text;

  for v_user in
    select p.id from public.profiles p
    where p.deleted_at is null
      and (v_cursor is null or p.id > v_cursor)
    order by p.id
    limit v_limit
  loop
    v_scanned := v_scanned + 1;
    v_last := v_user;
    if not public.hesap_aktif_mi(v_user) then continue; end if;
    if not public.announcement_hedef_uygun_mu(p_id, v_user) then continue; end if;
    insert into public.announcement_push_log (announcement_id, user_id)
    values (p_id, v_user)
    on conflict do nothing;
    if not found then continue; end if;
    if to_regprocedure('public.bildirim_kuyruga_ekle(uuid,text,text,text,text,jsonb)') is not null then
      v_out := public.bildirim_kuyruga_ekle(
        v_user,
        'announcement',
        v_title,
        nullif(v_body, ''),
        v_link,
        jsonb_build_object(
          'type', 'announcement',
          'announcement_id', p_id,
          'image', v_image
        )
      );
    else
      insert into public.notification_outbox (user_id, category, title, body, deep_link, payload, status)
      values (
        v_user, 'announcement', v_title, nullif(v_body, ''), v_link,
        jsonb_build_object(
          'type', 'announcement',
          'announcement_id', p_id,
          'image', v_image
        ),
        'pending'
      )
      returning id into v_out;
    end if;
    update public.announcement_push_log set outbox_id = v_out
    where announcement_id = p_id and user_id = v_user;
    v_sent := v_sent + 1;
  end loop;

  update public.announcement_push_jobs
  set cursor_user_id = coalesce(v_last, cursor_user_id),
      sent_count = sent_count + v_sent,
      status = case when v_scanned < v_limit then 'done' else 'pending' end,
      updated_at = now()
  where announcement_id = p_id;

  return jsonb_build_object(
    'ok', true,
    'sent', v_sent,
    'scanned', v_scanned,
    'done', v_scanned < v_limit
  );
end;
$$;

revoke all on function public.announcement_push_isle(uuid, int) from public, anon;
grant execute on function public.announcement_push_isle(uuid, int) to authenticated;

create or replace function public.admin_duyuru_durum(p_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text := lower(coalesce(p_action, ''));
  v_before text;
begin
  select status into v_before from public.announcements where id = p_id and deleted_at is null;
  if v_before is null then raise exception 'Not found'; end if;
  if v_action = 'delete' then
    if not public.announcement_izin('announcement.delete') then raise exception 'Forbidden'; end if;
    update public.announcements set deleted_at = now(), status = 'archived', is_active = false, updated_at = now()
    where id = p_id;
    perform public.announcement_audit(p_id, 'DELETE', jsonb_build_object('status', v_before), jsonb_build_object('deleted', true));
  elsif v_action = 'archive' then
    if not public.announcement_izin('announcement.publish') then raise exception 'Forbidden'; end if;
    update public.announcements set status = 'archived', is_active = false, updated_at = now() where id = p_id;
    perform public.announcement_audit(p_id, 'ARCHIVE', jsonb_build_object('status', v_before), jsonb_build_object('status', 'archived'));
  elsif v_action = 'unpublish' then
    if not public.announcement_izin('announcement.publish') then raise exception 'Forbidden'; end if;
    update public.announcements set status = 'draft', is_active = false, updated_at = now() where id = p_id;
    perform public.announcement_audit(p_id, 'UNPUBLISH', jsonb_build_object('status', v_before), jsonb_build_object('status', 'draft'));
  elsif v_action = 'publish' then
    if not public.announcement_izin('announcement.publish') then raise exception 'Forbidden'; end if;
    update public.announcements set
      status = case when publish_at > now() then 'scheduled' else 'published' end,
      is_active = publish_at <= now() and (expire_at is null or expire_at > now()),
      published_once = true,
      updated_at = now()
    where id = p_id;
    perform public.announcement_audit(p_id, 'PUBLISH', jsonb_build_object('status', v_before), jsonb_build_object('status', 'published'));
    if exists (select 1 from public.announcements a where a.id = p_id and a.send_push and a.status = 'published') then
      insert into public.announcement_push_jobs (announcement_id, status) values (p_id, 'pending')
      on conflict (announcement_id) do nothing;
      perform public.announcement_push_isle(p_id, 400);
    end if;
  else
    raise exception 'Unknown action';
  end if;
  perform public.announcement_sinyal(p_id, v_action);
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_duyuru_durum(uuid, text) from public, anon;
grant execute on function public.admin_duyuru_durum(uuid, text) to authenticated;

create or replace function public.admin_duyuru_kopyala(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new uuid;
  v_a public.announcements%rowtype;
begin
  if not public.announcement_izin('announcement.create') then raise exception 'Forbidden'; end if;
  select * into v_a from public.announcements where id = p_id and deleted_at is null;
  if v_a.id is null then raise exception 'Not found'; end if;
  insert into public.announcements (
    title, body, summary, body_doc, priority, status, severity, category_id,
    publish_at, expire_at, starts_at, ends_at, is_active, dismissible, show_until_read,
    pinned, pin_priority, show_on_home, home_display, show_on_launch, launch_frequency,
    allow_reactions, allow_comments, show_view_count, send_push, push_title, push_body,
    push_image_url, target_mode, target_logic, created_by
  ) values (
    v_a.title, v_a.body, v_a.summary, v_a.body_doc, v_a.priority, 'draft', v_a.severity, v_a.category_id,
    now(), v_a.expire_at, now(), v_a.expire_at, false, v_a.dismissible, v_a.show_until_read,
    false, 0, false, v_a.home_display, false, v_a.launch_frequency,
    v_a.allow_reactions, v_a.allow_comments, v_a.show_view_count, false, v_a.push_title, v_a.push_body,
    v_a.push_image_url, v_a.target_mode, v_a.target_logic, auth.uid()
  ) returning id into v_new;
  insert into public.announcement_translations (announcement_id, locale, title, summary, body_doc, body_plain, button_text)
  select v_new, locale, title, summary, body_doc, body_plain, button_text
  from public.announcement_translations where announcement_id = p_id;
  insert into public.announcement_media (
    announcement_id, locale, kind, storage_path, public_url, mime_type, byte_size, duration_ms,
    width, height, thumbnail_path, thumbnail_url, sort_order, caption
  )
  select v_new, locale, kind, storage_path, public_url, mime_type, byte_size, duration_ms,
    width, height, thumbnail_path, thumbnail_url, sort_order, caption
  from public.announcement_media where announcement_id = p_id and deleted_at is null;
  insert into public.announcement_targets (announcement_id, dimension, values)
  select v_new, dimension, values from public.announcement_targets where announcement_id = p_id;
  insert into public.announcement_ctas (announcement_id, sort_order, destination_type, destination, labels)
  select v_new, sort_order, destination_type, destination, labels from public.announcement_ctas where announcement_id = p_id;
  update public.announcements set deep_link = '/duyuru/' || v_new::text where id = v_new;
  perform public.announcement_audit(v_new, 'CREATE', jsonb_build_object('copied_from', p_id), null);
  return v_new;
end;
$$;

revoke all on function public.admin_duyuru_kopyala(uuid) from public, anon;
grant execute on function public.admin_duyuru_kopyala(uuid) to authenticated;

create or replace function public.admin_duyuru_medya_kaydet(
  p_announcement_id uuid,
  p_kind text,
  p_path text,
  p_public_url text,
  p_mime text,
  p_bytes bigint,
  p_duration_ms int,
  p_width int,
  p_height int,
  p_thumb_path text,
  p_thumb_url text,
  p_locale text,
  p_caption text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_kind text := upper(coalesce(p_kind, ''));
  v_mime text := lower(coalesce(p_mime, ''));
  v_size bigint;
  v_obj_mime text;
  v_max bigint;
begin
  if not (public.announcement_izin('announcement.edit') or public.announcement_izin('announcement.create')) then
    raise exception 'Forbidden';
  end if;
  if p_path is null or p_path !~ '^[A-Za-z0-9_./-]{8,240}$' or p_path like '%..%' then
    raise exception 'Invalid path';
  end if;
  if not exists (select 1 from public.announcements where id = p_announcement_id and deleted_at is null) then
    raise exception 'Not found';
  end if;
  select coalesce((metadata->>'size')::bigint, 0), lower(coalesce(metadata->>'mimetype', ''))
    into v_size, v_obj_mime
  from storage.objects
  where bucket_id = 'announcement-media' and name = p_path;
  if v_size is null then raise exception 'Object missing'; end if;
  if v_obj_mime <> '' then v_mime := v_obj_mime; end if;
  v_max := case
    when v_kind = 'IMAGE' then 8388608
    when v_kind = 'VIDEO' then 83886080
    else 20971520
  end;
  if v_size <= 0 or v_size > v_max then raise exception 'Size rejected'; end if;
  if v_kind = 'IMAGE' and v_mime not in ('image/jpeg', 'image/jpg', 'image/png', 'image/webp') then
    raise exception 'MIME rejected';
  elsif v_kind = 'VIDEO' and v_mime not in ('video/mp4') then
    raise exception 'MIME rejected';
  elsif v_kind in ('AUDIO', 'VOICE_RECORDING') and v_mime not in ('audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a', 'audio/mp3') then
    raise exception 'MIME rejected';
  elsif v_kind not in ('IMAGE', 'VIDEO', 'AUDIO', 'VOICE_RECORDING') then
    raise exception 'Kind rejected';
  end if;
  if p_public_url is null or p_public_url !~ '^https://' or position(p_path in p_public_url) = 0 then
    raise exception 'URL rejected';
  end if;

  insert into public.announcement_media (
    announcement_id, locale, kind, storage_path, public_url, mime_type, byte_size,
    duration_ms, width, height, thumbnail_path, thumbnail_url, caption, sort_order
  ) values (
    p_announcement_id,
    case when lower(coalesce(p_locale, '')) in ('tr','en','es','pt','ar','fr','fil') then lower(p_locale) else null end,
    v_kind, p_path, p_public_url, v_mime, v_size,
    case when p_duration_ms between 0 and 21600000 then p_duration_ms else null end,
    p_width, p_height, nullif(p_thumb_path, ''), nullif(p_thumb_url, ''),
    left(coalesce(p_caption, ''), 180),
    coalesce((select max(sort_order) + 1 from public.announcement_media where announcement_id = p_announcement_id), 0)
  ) returning id into v_id;
  perform public.announcement_audit(p_announcement_id, 'MEDIA_CHANGE', null, jsonb_build_object('media_id', v_id, 'kind', v_kind));
  return v_id;
end;
$$;

revoke all on function public.admin_duyuru_medya_kaydet(uuid, text, text, text, text, bigint, int, int, int, text, text, text, text) from public, anon;
grant execute on function public.admin_duyuru_medya_kaydet(uuid, text, text, text, text, bigint, int, int, int, text, text, text, text) to authenticated;

create or replace function public.admin_duyuru_medya_sil(p_media_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ann uuid;
  v_path text;
begin
  if not public.announcement_izin('announcement.edit') then raise exception 'Forbidden'; end if;
  select announcement_id, storage_path into v_ann, v_path
  from public.announcement_media where id = p_media_id and deleted_at is null;
  if v_ann is null then return; end if;
  update public.announcement_media
  set deleted_at = now(), public_url = null, thumbnail_url = null
  where id = p_media_id;
  if v_path is not null then
    delete from storage.objects where bucket_id = 'announcement-media' and name = v_path;
  end if;
  perform public.announcement_audit(v_ann, 'MEDIA_CHANGE', jsonb_build_object('removed', p_media_id), null);
end;
$$;

revoke all on function public.admin_duyuru_medya_sil(uuid) from public, anon;
grant execute on function public.admin_duyuru_medya_sil(uuid) to authenticated;

create or replace function public.admin_duyuru_liste(p_status text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.announcement_izin('announcement.create')
    or public.announcement_izin('announcement.edit')
    or public.announcement_izin('announcement.publish')
    or public.announcement_izin('announcement.analytics')
  ) then raise exception 'Forbidden'; end if;
  perform public.announcement_durum_yenile();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'title', a.title, 'summary', a.summary, 'status', a.status,
      'severity', a.severity, 'publish_at', a.publish_at, 'expire_at', a.expire_at,
      'pinned', a.pinned, 'unique_view_count', a.unique_view_count,
      'open_count', a.open_count, 'read_count', a.read_count,
      'category_code', c.code
    ) order by a.updated_at desc)
    from public.announcements a
    left join public.announcement_categories c on c.id = a.category_id
    where a.deleted_at is null
      and (
        coalesce(p_status, 'all') in ('all', '')
        or a.status = p_status
      )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_duyuru_liste(text) from public, anon;
grant execute on function public.admin_duyuru_liste(text) to authenticated;

create or replace function public.admin_duyuru_get(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.announcements%rowtype;
begin
  if not (
    public.announcement_izin('announcement.edit')
    or public.announcement_izin('announcement.create')
    or public.announcement_izin('announcement.analytics')
  ) then raise exception 'Forbidden'; end if;
  select * into v_a from public.announcements where id = p_id and deleted_at is null;
  if v_a.id is null then raise exception 'Not found'; end if;
  return jsonb_build_object(
    'announcement', to_jsonb(v_a),
    'translations', coalesce((select jsonb_agg(to_jsonb(t)) from public.announcement_translations t where t.announcement_id = p_id), '[]'::jsonb),
    'media', coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order) from public.announcement_media m where m.announcement_id = p_id and m.deleted_at is null), '[]'::jsonb),
    'targets', coalesce((select jsonb_agg(jsonb_build_object('dimension', dimension, 'values', values)) from public.announcement_targets where announcement_id = p_id), '[]'::jsonb),
    'ctas', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order) from public.announcement_ctas c where c.announcement_id = p_id), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object('action', l.action, 'created_at', l.created_at, 'actor_admin_id', l.actor_admin_id) order by l.created_at desc)
      from (select * from public.announcement_audit_log where announcement_id = p_id order by created_at desc limit 30) l
    ), '[]'::jsonb),
    'allowed_hosts', (select allowed_hosts from public.announcement_settings where id = 1)
  );
end;
$$;

revoke all on function public.admin_duyuru_get(uuid) from public, anon;
grant execute on function public.admin_duyuru_get(uuid) to authenticated;

create or replace function public.admin_duyuru_kategoriler()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(c) order by c.sort_order, c.name), '[]'::jsonb)
  from public.announcement_categories c
  where public.announcement_izin('announcement.create')
     or public.announcement_izin('announcement.edit')
     or c.enabled;
$$;

revoke all on function public.admin_duyuru_kategoriler() from public, anon;
grant execute on function public.admin_duyuru_kategoriler() to authenticated;

create or replace function public.admin_duyuru_kategori_kaydet(
  p_id uuid,
  p_name text,
  p_icon text,
  p_color text,
  p_enabled boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := p_id;
  v_code text;
begin
  if not public.announcement_izin('announcement.edit') then raise exception 'Forbidden'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Name required'; end if;
  if v_id is null then
    v_code := 'CUSTOM_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    insert into public.announcement_categories (code, name, icon, theme_color, enabled, is_system)
    values (
      v_code, left(trim(p_name), 40),
      left(coalesce(nullif(p_icon, ''), 'pricetag-outline'), 40),
      left(coalesce(nullif(p_color, ''), '#7C5CFF'), 16),
      coalesce(p_enabled, true), false
    ) returning id into v_id;
  else
    update public.announcement_categories
    set name = left(trim(p_name), 40),
        icon = left(coalesce(nullif(p_icon, ''), icon), 40),
        theme_color = left(coalesce(nullif(p_color, ''), theme_color), 16),
        enabled = coalesce(p_enabled, enabled)
    where id = v_id;
  end if;
  return v_id;
end;
$$;

revoke all on function public.admin_duyuru_kategori_kaydet(uuid, text, text, text, boolean) from public, anon;
grant execute on function public.admin_duyuru_kategori_kaydet(uuid, text, text, text, boolean) to authenticated;

create or replace function public.admin_duyuru_host_kaydet(p_hosts text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean text[] := '{}';
  v_h text;
begin
  if not public.announcement_izin('announcement.publish') then raise exception 'Forbidden'; end if;
  foreach v_h in array coalesce(p_hosts, '{}')
  loop
    v_h := lower(trim(v_h));
    if v_h ~ '^[a-z0-9.-]{3,120}$' and v_h not like '%..%' then
      v_clean := v_clean || v_h;
    end if;
  end loop;
  update public.announcement_settings set allowed_hosts = v_clean, updated_at = now() where id = 1;
end;
$$;

revoke all on function public.admin_duyuru_host_kaydet(text[]) from public, anon;
grant execute on function public.admin_duyuru_host_kaydet(text[]) to authenticated;

create or replace function public.admin_duyuru_analitik_ozet()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.announcement_izin('announcement.analytics') then raise exception 'Forbidden'; end if;
  perform public.announcement_durum_yenile();
  return jsonb_build_object(
    'total', (select count(*) from public.announcements where deleted_at is null),
    'active', (select count(*) from public.announcements where deleted_at is null and status = 'published'),
    'scheduled', (select count(*) from public.announcements where deleted_at is null and status = 'scheduled'),
    'impressions_7d', coalesce((select sum(impressions) from public.announcement_analytics_daily where day >= (now() at time zone 'utc')::date - 6), 0),
    'unique_viewers', coalesce((select sum(unique_view_count) from public.announcements where deleted_at is null), 0),
    'reads', coalesce((select sum(read_count) from public.announcements where deleted_at is null), 0),
    'opens', coalesce((select sum(open_count) from public.announcements where deleted_at is null), 0),
    'cta_clicks', coalesce((select sum(cta_click_count) from public.announcements where deleted_at is null), 0),
    'video_starts', coalesce((select sum(video_start_count) from public.announcements where deleted_at is null), 0),
    'video_completes', coalesce((select sum(video_complete_count) from public.announcements where deleted_at is null), 0),
    'audio_listens', coalesce((select sum(audio_listen_count) from public.announcements where deleted_at is null), 0)
  );
end;
$$;

revoke all on function public.admin_duyuru_analitik_ozet() from public, anon;
grant execute on function public.admin_duyuru_analitik_ozet() to authenticated;

create or replace function public.admin_duyuru_analitik(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.announcements%rowtype;
  v_hedef bigint;
begin
  if not public.announcement_izin('announcement.analytics') then raise exception 'Forbidden'; end if;
  select * into v_a from public.announcements where id = p_id and deleted_at is null;
  if v_a.id is null then raise exception 'Not found'; end if;
  if v_a.target_mode = 'all' then
    select count(*) into v_hedef from public.profiles where deleted_at is null;
  else
    select count(*) into v_hedef
    from public.profiles p
    where p.deleted_at is null
      and public.announcement_hedef_uygun_mu(p_id, p.id);
  end if;
  return jsonb_build_object(
    'target_users', v_hedef,
    'impressions', v_a.impression_count,
    'unique_viewers', v_a.unique_view_count,
    'opens', v_a.open_count,
    'reads', v_a.read_count,
    'cta_clicks', v_a.cta_click_count,
    'video_starts', v_a.video_start_count,
    'video_completes', v_a.video_complete_count,
    'audio_listens', v_a.audio_listen_count,
    'reactions', v_a.reaction_counts,
    'daily', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.day)
      from public.announcement_analytics_daily d
      where d.announcement_id = p_id and d.day >= (now() at time zone 'utc')::date - 30
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_duyuru_analitik(uuid) from public, anon;
grant execute on function public.admin_duyuru_analitik(uuid) to authenticated;

create or replace function public.admin_duyuru_izleyiciler(
  p_id uuid,
  p_q text default null,
  p_country text default null,
  p_platform text default null,
  p_cursor timestamptz default null,
  p_limit int default 40
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 40), 1), 80);
  v_q text := nullif(lower(trim(coalesce(p_q, ''))), '');
begin
  if not public.announcement_izin('announcement.view_users') then raise exception 'Forbidden'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        p.id as user_id,
        p.display_name,
        p.username,
        p.public_user_id,
        coalesce(p.country_code, p.country) as country,
        ds.platform,
        s.first_impression_at as viewed_at,
        s.opened_at,
        s.read_at
      from public.announcement_user_state s
      join public.profiles p on p.id = s.user_id
      left join lateral (
        select platform from public.device_sessions d
        where d.user_id = p.id and d.revoked_at is null
        order by d.last_seen_at desc limit 1
      ) ds on true
      where s.announcement_id = p_id
        and (p_cursor is null or s.first_impression_at < p_cursor)
        and (p_country is null or p_country = '' or upper(coalesce(p.country_code, p.country, '')) = upper(p_country))
        and (p_platform is null or p_platform = '' or lower(coalesce(ds.platform, '')) = lower(p_platform))
        and (
          v_q is null
          or lower(coalesce(p.username, '')) like '%' || v_q || '%'
          or lower(coalesce(p.public_user_id, '')) like '%' || v_q || '%'
          or lower(coalesce(p.display_name, '')) like '%' || v_q || '%'
        )
      order by s.first_impression_at desc nulls last
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_duyuru_izleyiciler(uuid, text, text, text, timestamptz, int) from public, anon;
grant execute on function public.admin_duyuru_izleyiciler(uuid, text, text, text, timestamptz, int) to authenticated;

create or replace function public.admin_duyuru_izleyici_disa_aktar(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_csv text;
begin
  if not public.announcement_izin('announcement.export') then raise exception 'Forbidden'; end if;
  perform public.announcement_audit(p_id, 'EXPORT', null, jsonb_build_object('kind', 'viewers'));
  select coalesce(string_agg(
    coalesce(p.display_name, '') || ',' || coalesce(p.username, '') || ',' || coalesce(p.public_user_id, '') || ',' ||
    coalesce(p.country_code, '') || ',' || coalesce(s.first_impression_at::text, '') || ',' ||
    coalesce(s.opened_at::text, '') || ',' || coalesce(s.read_at::text, ''),
    E'\n'
  ), '')
  into v_csv
  from (
    select * from public.announcement_user_state
    where announcement_id = p_id
    order by first_impression_at desc nulls last
    limit 5000
  ) s
  join public.profiles p on p.id = s.user_id;
  return 'display_name,username,tamuso_id,country,viewed_at,opened_at,read_at' || E'\n' || v_csv;
end;
$$;

revoke all on function public.admin_duyuru_izleyici_disa_aktar(uuid) from public, anon;
grant execute on function public.admin_duyuru_izleyici_disa_aktar(uuid) to authenticated;

-- Eski basit duyuru oluşturma, yeni modele yazar.
create or replace function public.admin_duyuru_olustur(
  p_title text,
  p_body text,
  p_priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_pri text := coalesce(nullif(trim(p_priority), ''), 'normal');
  v_sev text := 'NORMAL';
  v_payload jsonb;
begin
  if v_pri = 'urgent' then v_sev := 'CRITICAL';
  elsif v_pri = 'high' then v_sev := 'IMPORTANT';
  end if;
  v_payload := jsonb_build_object(
    'action', 'publish',
    'severity', v_sev,
    'target_mode', 'all',
    'translations', jsonb_build_array(jsonb_build_object(
      'locale', 'tr',
      'title', left(trim(p_title), 160),
      'summary', left(trim(p_body), 180),
      'body_doc', jsonb_build_object('blocks', jsonb_build_array(jsonb_build_object('type', 'paragraph', 'text', left(trim(p_body), 2000))))
    ))
  );
  v_id := (public.admin_duyuru_kaydet(null, v_payload)->>'id')::uuid;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.announcements enable row level security;
alter table public.announcement_categories enable row level security;
alter table public.announcement_translations enable row level security;
alter table public.announcement_media enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_ctas enable row level security;
alter table public.announcement_user_state enable row level security;
alter table public.announcement_events enable row level security;
alter table public.announcement_reactions enable row level security;
alter table public.announcement_comments enable row level security;
alter table public.announcement_analytics_daily enable row level security;
alter table public.announcement_audit_log enable row level security;
alter table public.announcement_push_log enable row level security;
alter table public.announcement_push_jobs enable row level security;
alter table public.announcement_settings enable row level security;
alter table public.announcement_signals enable row level security;

drop policy if exists "Announcements readable" on public.announcements;
drop policy if exists "Announcements admin all" on public.announcements;
create policy "Announcements visible"
  on public.announcements for select to authenticated
  using (public.announcement_gorunur_mu(id));

drop policy if exists "Announcement categories read" on public.announcement_categories;
create policy "Announcement categories read"
  on public.announcement_categories for select to authenticated
  using (enabled or public.announcement_izin('announcement.edit'));

drop policy if exists "Announcement translations read" on public.announcement_translations;
create policy "Announcement translations read"
  on public.announcement_translations for select to authenticated
  using (public.announcement_gorunur_mu(announcement_id));

drop policy if exists "Announcement media read" on public.announcement_media;
create policy "Announcement media read"
  on public.announcement_media for select to authenticated
  using (deleted_at is null and public.announcement_gorunur_mu(announcement_id));

drop policy if exists "Announcement targets admin" on public.announcement_targets;
create policy "Announcement targets admin"
  on public.announcement_targets for select to authenticated
  using (public.announcement_izin('announcement.edit') or public.announcement_izin('announcement.analytics'));

drop policy if exists "Announcement ctas read" on public.announcement_ctas;
create policy "Announcement ctas read"
  on public.announcement_ctas for select to authenticated
  using (public.announcement_gorunur_mu(announcement_id));

drop policy if exists "Announcement own state" on public.announcement_user_state;
create policy "Announcement own state"
  on public.announcement_user_state for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Announcement own reaction" on public.announcement_reactions;
create policy "Announcement own reaction"
  on public.announcement_reactions for select to authenticated
  using (user_id = auth.uid() or public.announcement_izin('announcement.analytics'));

drop policy if exists "Announcement signals read" on public.announcement_signals;
create policy "Announcement signals read"
  on public.announcement_signals for select to authenticated
  using (true);

revoke insert, update, delete on public.announcements from authenticated, anon;
grant select on public.announcements to authenticated;
grant select on public.announcement_categories to authenticated;
grant select on public.announcement_translations to authenticated;
grant select on public.announcement_media to authenticated;
grant select on public.announcement_targets to authenticated;
grant select on public.announcement_ctas to authenticated;
grant select on public.announcement_user_state to authenticated;
grant select on public.announcement_reactions to authenticated;
grant select on public.announcement_signals to authenticated;

-- events, comments, analytics, audit, push: no client grants. RPC only.

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-media',
  'announcement-media',
  true,
  83886080,
  array[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4',
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Announcement media public read" on storage.objects;
create policy "Announcement media public read"
  on storage.objects for select to public
  using (bucket_id = 'announcement-media');

drop policy if exists "Announcement media admin insert" on storage.objects;
create policy "Announcement media admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'announcement-media'
    and (
      public.announcement_izin('announcement.create')
      or public.announcement_izin('announcement.edit')
    )
  );

drop policy if exists "Announcement media admin update" on storage.objects;
create policy "Announcement media admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'announcement-media'
    and public.announcement_izin('announcement.edit')
  )
  with check (
    bucket_id = 'announcement-media'
    and public.announcement_izin('announcement.edit')
  );

drop policy if exists "Announcement media admin delete" on storage.objects;
create policy "Announcement media admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'announcement-media'
    and public.announcement_izin('announcement.edit')
  );

-- ---------------------------------------------------------------------------
-- Realtime: tek satırlık sinyal. Tüm duyuru tablosuna abone olunmaz.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'announcement_signals'
  ) then
    alter publication supabase_realtime add table public.announcement_signals;
  end if;
end $$;

alter table public.announcement_signals replica identity full;

insert into public.hamburger_menu_items (item_key, enabled, sort_order, group_id)
values ('announcements', true, 25, 'hesap')
on conflict (item_key) do nothing;

insert into public.feature_flags (key, enabled, description)
values ('announcements_enabled', true, 'Resmi duyuru merkezi')
on conflict (key) do nothing;
