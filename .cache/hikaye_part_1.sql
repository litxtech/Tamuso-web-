-- =============================================================================
-- Tamuso Instagram-style Stories (Hikaye) — database layer
-- Tables: English | RPCs: hikaye_* | Params: p_*
-- Writes via security definer RPCs; RLS SELECT only
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Feature flags + optional kill switch
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, description) values
  ('stories_enabled', true, 'Hikaye / Stories sistemi'),
  ('story_creation_enabled', true, 'Hikaye olusturma'),
  ('story_video_enabled', true, 'Hikaye video medya'),
  ('story_links_enabled', true, 'Hikaye link attachment'),
  ('story_gifts_enabled', false, 'Hikaye hediye attachment'),
  ('story_discovery_enabled', false, 'Hikaye discovery / kesfet'),
  ('story_official_promotions_enabled', false, 'Resmi hikaye promosyonlari')
on conflict (key) do nothing;

do $$
begin
  if to_regclass('public.kill_switches') is not null then
    insert into public.kill_switches (key, active)
    values ('kill_stories', false)
    on conflict (key) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. stories
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  privacy text not null default 'followers'
    check (privacy in ('public', 'followers', 'close_friends')),
  status text not null default 'active'
    check (status in ('active', 'deleted', 'archived')),
  is_official boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  archived_at timestamptz,
  deleted_at timestamptz,
  item_count int not null default 0,
  view_count int not null default 0,
  reaction_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  constraint stories_item_count_nonneg check (item_count >= 0),
  constraint stories_view_count_nonneg check (view_count >= 0),
  constraint stories_reaction_count_nonneg check (reaction_count >= 0)
);

create unique index if not exists stories_one_active_per_owner_idx
  on public.stories (owner_id)
  where status = 'active';

create index if not exists stories_owner_status_idx
  on public.stories (owner_id, status, expires_at desc);

create index if not exists stories_active_expires_idx
  on public.stories (expires_at)
  where status = 'active';

create index if not exists stories_active_created_idx
  on public.stories (created_at desc)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- 2. story_items
-- ---------------------------------------------------------------------------
create table if not exists public.story_items (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  media_type text not null
    check (media_type in ('image', 'video', 'text')),
  media_url text,
  thumbnail_url text,
  duration_ms int not null default 5000
    check (duration_ms > 0 and duration_ms <= 120000),
  sort_order int not null default 0,
  composition jsonb not null default '{"composition_version":1}'::jsonb,
  attachment jsonb,
  caption text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'deleted')),
  idempotency_key text,
  constraint story_items_composition_version_chk
    check (composition ? 'composition_version'),
  constraint story_items_media_url_chk
    check (
      media_type = 'text'
      or (media_url is not null and length(trim(media_url)) >= 8)
    )
);

create unique index if not exists story_items_owner_idempotency_idx
  on public.story_items (owner_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists story_items_story_sort_idx
  on public.story_items (story_id, sort_order, created_at)
  where status = 'active' and deleted_at is null;

create index if not exists story_items_owner_created_idx
  on public.story_items (owner_id, created_at desc)
  where status = 'active' and deleted_at is null;

-- ---------------------------------------------------------------------------
-- 3. story_views
-- ---------------------------------------------------------------------------
create table if not exists public.story_views (
  story_item_id uuid not null references public.story_items(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  view_count int not null default 1 check (view_count >= 1),
  primary key (story_item_id, viewer_id)
);

create index if not exists story_views_story_viewer_idx
  on public.story_views (story_id, viewer_id);

create index if not exists story_views_item_first_idx
  on public.story_views (story_item_id, first_viewed_at desc);

create index if not exists story_views_viewer_last_idx
  on public.story_views (viewer_id, last_viewed_at desc);

-- ---------------------------------------------------------------------------
-- 4. story_reactions
-- ---------------------------------------------------------------------------
create table if not exists public.story_reactions (
  story_item_id uuid not null references public.story_items(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null
    check (emoji in ('heart', 'fire', 'laugh', 'clap', 'heart_eyes')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (story_item_id, user_id)
);

create index if not exists story_reactions_story_idx
  on public.story_reactions (story_id, created_at desc);

create index if not exists story_reactions_user_idx
  on public.story_reactions (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- 5. story_mutes
-- ---------------------------------------------------------------------------
create table if not exists public.story_mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_user_id),
  constraint story_mutes_no_self check (muter_id <> muted_user_id)
);

create index if not exists story_mutes_muted_idx
  on public.story_mutes (muted_user_id);

-- ---------------------------------------------------------------------------
-- 6. story_close_friends
-- ---------------------------------------------------------------------------
create table if not exists public.story_close_friends (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  constraint story_close_friends_no_self check (owner_id <> friend_id)
);

create index if not exists story_close_friends_friend_idx
  on public.story_close_friends (friend_id);

-- ---------------------------------------------------------------------------
-- 7. story_audience_exclusions
-- ---------------------------------------------------------------------------
create table if not exists public.story_audience_exclusions (
  story_id uuid not null references public.stories(id) on delete cascade,
  excluded_user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (story_id, excluded_user_id)
);

create index if not exists story_audience_exclusions_user_idx
  on public.story_audience_exclusions (excluded_user_id);

-- ---------------------------------------------------------------------------
-- 8. story_highlights + story_highlight_items (architecture ready)
-- ---------------------------------------------------------------------------
create table if not exists public.story_highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  cover_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'deleted'))
);

create index if not exists story_highlights_owner_idx
  on public.story_highlights (owner_id, sort_order, created_at desc)
  where status = 'active' and deleted_at is null;

create table if not exists public.story_highlight_items (
  highlight_id uuid not null references public.story_highlights(id) on delete cascade,
  story_item_id uuid not null references public.story_items(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  primary key (highlight_id, story_item_id)
);

create index if not exists story_highlight_items_item_idx
  on public.story_highlight_items (story_item_id);

-- ---------------------------------------------------------------------------
-- 9. story_admin_promotions
-- ---------------------------------------------------------------------------
create table if not exists public.story_admin_promotions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  title text,
  priority int not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists story_admin_promotions_active_idx
  on public.story_admin_promotions (is_active, priority desc, starts_at desc)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- RLS + grants (SELECT only; writes via RPCs)
-- ---------------------------------------------------------------------------
alter table public.stories enable row level security;
alter table public.story_items enable row level security;
alter table public.story_views enable row level security;
alter table public.story_reactions enable row level security;
alter table public.story_mutes enable row level security;
alter table public.story_close_friends enable row level security;
alter table public.story_audience_exclusions enable row level security;
alter table public.story_highlights enable row level security;
alter table public.story_highlight_items enable row level security;
alter table public.story_admin_promotions enable row level security;

grant select on public.stories to authenticated;
grant select on public.story_items to authenticated;
grant select on public.story_views to authenticated;
grant select on public.story_reactions to authenticated;
grant select on public.story_mutes to authenticated;
grant select on public.story_close_friends to authenticated;
grant select on public.story_audience_exclusions to authenticated;
grant select on public.story_highlights to authenticated;
grant select on public.story_highlight_items to authenticated;
grant select on public.story_admin_promotions to authenticated;

-- Helpers first (used by policies) — defined below before policies that need them.
-- Temporary permissive owner/admin policies; viewer policies added after helpers.

-- ---------------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_aktif_mi()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kill boolean := false;
begin
  if to_regclass('public.kill_switches') is not null then
    select coalesce(active, false) into v_kill
    from public.kill_switches
    where key = 'kill_stories';
    if coalesce(v_kill, false) then
      return false;
    end if;
  end if;

  return coalesce(public.ozellik_bayragi_aktif_mi('stories_enabled'), false);
end;
$$;

grant execute on function public.hikaye_aktif_mi() to authenticated;

create or replace function public.hikaye_url_guvenli_mi(p_url text)
returns boolean
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_url text := lower(trim(coalesce(p_url, '')));
begin
  if length(v_url) < 8 or length(v_url) > 2000 then
    return false;
  end if;
  if v_url ~* '^(javascript|data|vbscript|file):' then
    return false;
  end if;
  -- Relative storage path or absolute http(s) containing story-media
  if v_url ~ '^https?://' then
    return position('story-media' in v_url) > 0
      or position('/storage/v1/object/public/story-media/' in v_url) > 0;
  end if;
  -- Path-style: {uid}/...
  if v_url ~ '^[0-9a-f-]{36}/' then
    return true;
  end if;
  if position('story-media/' in v_url) = 1 or position('/story-media/' in v_url) > 0 then
    return true;
  end if;
  return false;
end;
$$;

grant execute on function public.hikaye_url_guvenli_mi(text) to authenticated;

create or replace function public.hikaye_izleyici_yetkili_mi(
  p_viewer uuid,
  p_story_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_story public.stories%rowtype;
begin
  if p_story_id is null then
    return false;
  end if;
  if not public.hikaye_aktif_mi() and not public.ben_admin_miyim() then
    return false;
  end if;

  select * into v_story from public.stories where id = p_story_id;
  if not found then
    return false;
  end if;

  if v_story.status = 'deleted' then
    return false;
  end if;

  -- Owner / admin always
  if p_viewer is not null and p_viewer = v_story.owner_id then
    return true;
  end if;
  if public.ben_admin_miyim() then
    return true;
  end if;

  -- Active-only for non-owners (archive is owner-only via RPC)
  if v_story.status <> 'active' then
    return false;
  end if;
  if v_story.expires_at <= now() then
    return false;
  end if;

  if p_viewer is null then
    return false;
  end if;

  if public.kullanicilar_engelli_mi(p_viewer, v_story.owner_id) then
    return false;
  end if;

  if exists (
    select 1 from public.story_mutes m
    where m.muter_id = p_viewer and m.muted_user_id = v_story.owner_id
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.story_audience_exclusions e
    where e.story_id = v_story.id and e.excluded_user_id = p_viewer
  ) then
    return false;
  end if;

  -- Base visibility (private accounts / blocks already partly covered)
  if not public.takip_icerik_gorunur_mu(p_viewer, v_story.owner_id) then
    return false;
  end if;

  if v_story.privacy = 'public' then
    return true;
  end if;

  if v_story.privacy = 'followers' then
    return public.takip_ediyor_mu(p_viewer, v_story.owner_id);
  end if;

  if v_story.privacy = 'close_friends' then
    return exists (
      select 1 from public.story_close_friends cf
      where cf.owner_id = v_story.owner_id and cf.friend_id = p_viewer
    );
  end if;

  return false;
end;
$$;

grant execute on function public.hikaye_izleyici_yetkili_mi(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
