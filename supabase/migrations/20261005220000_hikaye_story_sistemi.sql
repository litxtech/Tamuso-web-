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
-- SELECT policies
-- ---------------------------------------------------------------------------
drop policy if exists "Stories select" on public.stories;
create policy "Stories select"
  on public.stories for select to authenticated
  using (
    owner_id = auth.uid()
    or public.ben_admin_miyim()
    or public.hikaye_izleyici_yetkili_mi(auth.uid(), id)
  );

drop policy if exists "Story items select" on public.story_items;
create policy "Story items select"
  on public.story_items for select to authenticated
  using (
    owner_id = auth.uid()
    or public.ben_admin_miyim()
    or (
      status = 'active'
      and deleted_at is null
      and public.hikaye_izleyici_yetkili_mi(auth.uid(), story_id)
    )
  );

drop policy if exists "Story views select" on public.story_views;
create policy "Story views select"
  on public.story_views for select to authenticated
  using (
    viewer_id = auth.uid()
    or public.ben_admin_miyim()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "Story reactions select" on public.story_reactions;
create policy "Story reactions select"
  on public.story_reactions for select to authenticated
  using (
    user_id = auth.uid()
    or public.ben_admin_miyim()
    or public.hikaye_izleyici_yetkili_mi(auth.uid(), story_id)
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "Story mutes select" on public.story_mutes;
create policy "Story mutes select"
  on public.story_mutes for select to authenticated
  using (muter_id = auth.uid() or public.ben_admin_miyim());

drop policy if exists "Story close friends select" on public.story_close_friends;
create policy "Story close friends select"
  on public.story_close_friends for select to authenticated
  using (owner_id = auth.uid() or public.ben_admin_miyim());

drop policy if exists "Story audience exclusions select" on public.story_audience_exclusions;
create policy "Story audience exclusions select"
  on public.story_audience_exclusions for select to authenticated
  using (
    public.ben_admin_miyim()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "Story highlights select" on public.story_highlights;
create policy "Story highlights select"
  on public.story_highlights for select to authenticated
  using (
    (status = 'active' and deleted_at is null and (
      owner_id = auth.uid()
      or public.ben_admin_miyim()
      or public.takip_icerik_gorunur_mu(auth.uid(), owner_id)
    ))
    or owner_id = auth.uid()
    or public.ben_admin_miyim()
  );

drop policy if exists "Story highlight items select" on public.story_highlight_items;
create policy "Story highlight items select"
  on public.story_highlight_items for select to authenticated
  using (
    public.ben_admin_miyim()
    or exists (
      select 1 from public.story_highlights h
      where h.id = highlight_id
        and (
          h.owner_id = auth.uid()
          or (h.status = 'active' and h.deleted_at is null
              and public.takip_icerik_gorunur_mu(auth.uid(), h.owner_id))
        )
    )
  );

drop policy if exists "Story admin promotions select" on public.story_admin_promotions;
create policy "Story admin promotions select"
  on public.story_admin_promotions for select to authenticated
  using (
    public.ben_admin_miyim()
    or (
      is_active
      and starts_at <= now()
      and (ends_at is null or ends_at > now())
    )
  );

-- ---------------------------------------------------------------------------
-- STORAGE: story-media (public, 50MB, image/video, folder-owner RLS)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-media',
  'story-media',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Story media public read" on storage.objects;
create policy "Story media public read"
  on storage.objects for select to public
  using (bucket_id = 'story-media');

drop policy if exists "Story media own upload" on storage.objects;
create policy "Story media own upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.kullanici_yaptirim_aktif_mi(auth.uid(), 'upload_ban')
  );

drop policy if exists "Story media own update" on storage.objects;
create policy "Story media own update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.kullanici_yaptirim_aktif_mi(auth.uid(), 'upload_ban')
  )
  with check (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Story media own delete" on storage.objects;
create policy "Story media own delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'story-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Realtime (safe add)
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.stories;
  exception when duplicate_object then null;
  end;
end $$;

alter table public.stories replica identity full;

-- ---------------------------------------------------------------------------
-- user_reports: content_type 'story' — no content_type check constraint present
-- (existing values include user/status_post/room; free text column)
-- ---------------------------------------------------------------------------

-- =============================================================================
-- RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- hikaye_tepsi_getir — one tray avatar per user with active story
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_tepsi_getir(
  p_limit int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_items jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.hikaye_aktif_mi() then
    return jsonb_build_object('ok', true, 'enabled', false, 'items', '[]'::jsonb);
  end if;

  with candidates as (
    select
      s.id as story_id,
      s.owner_id,
      s.is_official,
      s.item_count,
      s.expires_at,
      s.created_at,
      s.privacy,
      p.username,
      p.display_name,
      p.avatar_url,
      p.is_verified,
      (s.owner_id = v_uid) as is_own,
      exists (
        select 1
        from public.story_items si
        where si.story_id = s.id
          and si.status = 'active'
          and si.deleted_at is null
          and not exists (
            select 1 from public.story_views sv
            where sv.story_item_id = si.id and sv.viewer_id = v_uid
          )
      ) as has_unseen,
      (
        select max(si.created_at)
        from public.story_items si
        where si.story_id = s.id
          and si.status = 'active'
          and si.deleted_at is null
      ) as latest_item_at,
      coalesce((
        select max(pr.priority)
        from public.story_admin_promotions pr
        where pr.story_id = s.id
          and pr.is_active
          and pr.starts_at <= now()
          and (pr.ends_at is null or pr.ends_at > now())
          and coalesce(public.ozellik_bayragi_aktif_mi('story_official_promotions_enabled'), false)
      ), -1) as promo_priority
    from public.stories s
    join public.profiles p on p.id = s.owner_id
    where s.status = 'active'
      and s.expires_at > now()
      and s.item_count > 0
      and public.hikaye_izleyici_yetkili_mi(v_uid, s.id)
  ),
  ranked as (
    select *
    from candidates
    order by
      is_own desc,
      promo_priority desc,
      has_unseen desc,
      latest_item_at desc nulls last
    limit v_limit
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'story_id', story_id,
      'owner_id', owner_id,
      'username', username,
      'display_name', display_name,
      'avatar_url', avatar_url,
      'is_verified', coalesce(is_verified, false),
      'is_official', is_official,
      'is_own', is_own,
      'item_count', item_count,
      'has_unseen', has_unseen,
      'privacy', privacy,
      'expires_at', expires_at,
      'latest_item_at', latest_item_at,
      'promo_priority', nullif(promo_priority, -1)
    )
    order by
      is_own desc,
      promo_priority desc,
      has_unseen desc,
      latest_item_at desc nulls last
  ), '[]'::jsonb)
  into v_items
  from ranked;

  return jsonb_build_object(
    'ok', true,
    'enabled', true,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.hikaye_tepsi_getir(int) to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_olustur — append to active story or create; expires_at server-only
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_olustur(
  p_media_type text,
  p_media_url text default null,
  p_thumbnail_url text default null,
  p_duration_ms int default 5000,
  p_composition jsonb default '{"composition_version":1}'::jsonb,
  p_attachment jsonb default null,
  p_caption text default null,
  p_privacy text default null,
  p_excluded_user_ids uuid[] default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_type text := lower(trim(coalesce(p_media_type, '')));
  v_privacy text;
  v_story public.stories%rowtype;
  v_item public.story_items%rowtype;
  v_composition jsonb;
  v_duration int;
  v_sort int;
  v_key text := nullif(left(trim(coalesce(p_idempotency_key, '')), 128), '');
  v_excl uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.hikaye_aktif_mi() then raise exception 'Stories disabled'; end if;
  if not coalesce(public.ozellik_bayragi_aktif_mi('story_creation_enabled'), false) then
    raise exception 'Story creation disabled';
  end if;

  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir hikaye paylasamaz'; end if;

  if public.kullanici_yaptirim_aktif_mi(v_uid, 'upload_ban') then
    raise exception 'Upload banned';
  end if;

  -- Idempotent replay
  if v_key is not null then
    select * into v_item
    from public.story_items
    where owner_id = v_uid and idempotency_key = v_key
    limit 1;
    if found then
      select * into v_story from public.stories where id = v_item.story_id;
      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'story_id', v_item.story_id,
        'item_id', v_item.id,
        'expires_at', v_story.expires_at
      );
    end if;
  end if;

  if v_type not in ('image', 'video', 'text') then
    raise exception 'Gecersiz medya turu';
  end if;
  if v_type = 'video'
     and not coalesce(public.ozellik_bayragi_aktif_mi('story_video_enabled'), false) then
    raise exception 'Story video disabled';
  end if;

  if v_type <> 'text' then
    if p_media_url is null or length(trim(p_media_url)) < 8 then
      raise exception 'Medya gerekli';
    end if;
    if not public.hikaye_url_guvenli_mi(p_media_url) then
      raise exception 'Guvenli olmayan medya URL';
    end if;
  end if;

  if p_thumbnail_url is not null
     and length(trim(p_thumbnail_url)) > 0
     and not public.hikaye_url_guvenli_mi(p_thumbnail_url) then
    raise exception 'Guvenli olmayan thumbnail URL';
  end if;

  v_composition := coalesce(p_composition, '{"composition_version":1}'::jsonb);
  if not (v_composition ? 'composition_version') then
    v_composition := v_composition || jsonb_build_object('composition_version', 1);
  end if;

  if p_attachment is not null then
    if (p_attachment->>'type') = 'link'
       and not coalesce(public.ozellik_bayragi_aktif_mi('story_links_enabled'), false) then
      raise exception 'Story links disabled';
    end if;
    if (p_attachment->>'type') = 'gift'
       and not coalesce(public.ozellik_bayragi_aktif_mi('story_gifts_enabled'), false) then
      raise exception 'Story gifts disabled';
    end if;
  end if;

  v_duration := coalesce(nullif(p_duration_ms, 0), case when v_type = 'video' then 15000 else 5000 end);
  v_duration := greatest(1000, least(v_duration, 120000));

  v_privacy := lower(trim(coalesce(p_privacy, '')));
  if v_privacy = '' then v_privacy := null; end if;
  if v_privacy is not null and v_privacy not in ('public', 'followers', 'close_friends') then
    raise exception 'Gecersiz gizlilik';
  end if;

  -- Lock / find active story
  select * into v_story
  from public.stories
  where owner_id = v_uid and status = 'active'
  for update;

  if not found then
    insert into public.stories (
      owner_id, privacy, status, expires_at, item_count
    ) values (
      v_uid,
      coalesce(v_privacy, 'followers'),
      'active',
      now() + interval '24 hours',
      0
    )
    returning * into v_story;
  else
    -- Refresh expiry on append (server-only)
    update public.stories
    set expires_at = now() + interval '24 hours',
        privacy = coalesce(v_privacy, privacy)
    where id = v_story.id
    returning * into v_story;
  end if;

  -- Optional audience exclusions (replace for this story when provided)
  if p_excluded_user_ids is not null then
    delete from public.story_audience_exclusions where story_id = v_story.id;
    foreach v_excl in array p_excluded_user_ids loop
      if v_excl is not null and v_excl <> v_uid then
        insert into public.story_audience_exclusions (story_id, excluded_user_id)
        values (v_story.id, v_excl)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_sort
  from public.story_items
  where story_id = v_story.id;

  insert into public.story_items (
    story_id, owner_id, media_type, media_url, thumbnail_url,
    duration_ms, sort_order, composition, attachment, caption,
    status, idempotency_key
  ) values (
    v_story.id,
    v_uid,
    v_type,
    case when v_type = 'text' then null else left(trim(p_media_url), 2000) end,
    nullif(left(trim(coalesce(p_thumbnail_url, '')), 2000), ''),
    v_duration,
    v_sort,
    v_composition,
    p_attachment,
    nullif(left(trim(coalesce(p_caption, '')), 500), ''),
    'active',
    v_key
  )
  returning * into v_item;

  update public.stories
  set item_count = (
    select count(*)::int from public.story_items
    where story_id = v_story.id and status = 'active' and deleted_at is null
  )
  where id = v_story.id
  returning * into v_story;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'story_id', v_story.id,
    'item_id', v_item.id,
    'sort_order', v_item.sort_order,
    'expires_at', v_story.expires_at,
    'item_count', v_story.item_count,
    'privacy', v_story.privacy
  );
end;
$$;

grant execute on function public.hikaye_olustur(text, text, text, int, jsonb, jsonb, text, text, uuid[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_grup_getir — full story group for one user
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_grup_getir(
  p_owner_id uuid,
  p_include_archived boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_story public.stories%rowtype;
  v_owner jsonb;
  v_items jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_owner_id is null then raise exception 'owner required'; end if;
  if not public.hikaye_aktif_mi() then
    return jsonb_build_object('ok', true, 'enabled', false);
  end if;

  select * into v_story
  from public.stories s
  where s.owner_id = p_owner_id
    and (
      (s.status = 'active' and s.expires_at > now())
      or (p_include_archived and s.status = 'archived' and s.owner_id = v_uid)
    )
  order by
    case when s.status = 'active' then 0 else 1 end,
    s.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'story', null, 'items', '[]'::jsonb);
  end if;

  if not public.hikaye_izleyici_yetkili_mi(v_uid, v_story.id)
     and not (v_story.owner_id = v_uid and p_include_archived) then
    raise exception 'Forbidden';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'is_verified', coalesce(p.is_verified, false)
  ) into v_owner
  from public.profiles p where p.id = v_story.owner_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', si.id,
      'story_id', si.story_id,
      'media_type', si.media_type,
      'media_url', si.media_url,
      'thumbnail_url', si.thumbnail_url,
      'duration_ms', si.duration_ms,
      'sort_order', si.sort_order,
      'composition', si.composition,
      'attachment', si.attachment,
      'caption', si.caption,
      'created_at', si.created_at,
      'viewed', exists (
        select 1 from public.story_views sv
        where sv.story_item_id = si.id and sv.viewer_id = v_uid
      ),
      'my_reaction', (
        select sr.emoji from public.story_reactions sr
        where sr.story_item_id = si.id and sr.user_id = v_uid
      ),
      'reaction_counts', (
        select coalesce(jsonb_object_agg(sub.emoji, sub.cnt), '{}'::jsonb)
        from (
          select sr.emoji, count(*)::int as cnt
          from public.story_reactions sr
          where sr.story_item_id = si.id
          group by sr.emoji
        ) sub
      )
    )
    order by si.sort_order, si.created_at
  ), '[]'::jsonb)
  into v_items
  from public.story_items si
  where si.story_id = v_story.id
    and si.status = 'active'
    and si.deleted_at is null;

  return jsonb_build_object(
    'ok', true,
    'enabled', true,
    'owner', v_owner,
    'story', jsonb_build_object(
      'id', v_story.id,
      'owner_id', v_story.owner_id,
      'privacy', v_story.privacy,
      'status', v_story.status,
      'is_official', v_story.is_official,
      'created_at', v_story.created_at,
      'expires_at', v_story.expires_at,
      'item_count', v_story.item_count,
      'view_count', v_story.view_count,
      'reaction_count', v_story.reaction_count
    ),
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.hikaye_grup_getir(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_sil_oge
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_sil_oge(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.story_items%rowtype;
  v_story public.stories%rowtype;
  v_remaining int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_item_id is null then raise exception 'item required'; end if;

  select * into v_item from public.story_items where id = p_item_id;
  if not found then raise exception 'Oge yok'; end if;

  if v_item.owner_id <> v_uid and not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;

  if v_item.status = 'deleted' or v_item.deleted_at is not null then
    return jsonb_build_object('ok', true, 'already_deleted', true);
  end if;

  update public.story_items
  set status = 'deleted', deleted_at = now()
  where id = p_item_id;

  select count(*)::int into v_remaining
  from public.story_items
  where story_id = v_item.story_id and status = 'active' and deleted_at is null;

  if v_remaining = 0 then
    update public.stories
    set status = 'deleted',
        deleted_at = now(),
        item_count = 0
    where id = v_item.story_id
    returning * into v_story;
  else
    update public.stories
    set item_count = v_remaining
    where id = v_item.story_id
    returning * into v_story;
  end if;

  return jsonb_build_object(
    'ok', true,
    'story_id', v_item.story_id,
    'item_id', p_item_id,
    'remaining_items', v_remaining,
    'story_status', v_story.status
  );
end;
$$;

grant execute on function public.hikaye_sil_oge(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_goruntuleme_kaydet — owner self-view does not count
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_goruntuleme_kaydet(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.story_items%rowtype;
  v_is_new boolean := false;
  v_counted boolean := false;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_item_id is null then raise exception 'item required'; end if;
  if not public.hikaye_aktif_mi() then raise exception 'Stories disabled'; end if;

  select * into v_item
  from public.story_items
  where id = p_item_id and status = 'active' and deleted_at is null;
  if not found then raise exception 'Oge yok'; end if;

  if not public.hikaye_izleyici_yetkili_mi(v_uid, v_item.story_id) then
    raise exception 'Forbidden';
  end if;

  -- Owner self-view: track optionally but do not increment story.view_count
  if v_item.owner_id = v_uid then
    insert into public.story_views (
      story_item_id, story_id, viewer_id, first_viewed_at, last_viewed_at, view_count
    ) values (
      v_item.id, v_item.story_id, v_uid, now(), now(), 1
    )
    on conflict (story_item_id, viewer_id) do update
      set last_viewed_at = now(),
          view_count = public.story_views.view_count + 1;

    return jsonb_build_object(
      'ok', true,
      'counted', false,
      'self_view', true,
      'item_id', p_item_id
    );
  end if;

  insert into public.story_views (
    story_item_id, story_id, viewer_id, first_viewed_at, last_viewed_at, view_count
  ) values (
    v_item.id, v_item.story_id, v_uid, now(), now(), 1
  )
  on conflict (story_item_id, viewer_id) do update
    set last_viewed_at = now(),
        view_count = public.story_views.view_count + 1;

  -- First unique viewer: view_count stays 1 after insert; repeats become >= 2
  select view_count = 1 into v_is_new
  from public.story_views
  where story_item_id = v_item.id and viewer_id = v_uid;

  if coalesce(v_is_new, false) then
    update public.stories
    set view_count = view_count + 1
    where id = v_item.story_id;
    v_counted := true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'counted', v_counted,
    'self_view', false,
    'item_id', p_item_id,
    'story_id', v_item.story_id
  );
end;
$$;

grant execute on function public.hikaye_goruntuleme_kaydet(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_goruntuleyenler — owner only, paginated
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_goruntuleyenler(
  p_story_id uuid default null,
  p_item_id uuid default null,
  p_limit int default 30,
  p_cursor timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_story_id uuid;
  v_owner uuid;
  v_limit int := greatest(1, least(coalesce(p_limit, 30), 100));
  v_rows jsonb;
  v_next timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if p_item_id is not null then
    select story_id into v_story_id from public.story_items where id = p_item_id;
  else
    v_story_id := p_story_id;
  end if;

  if v_story_id is null then raise exception 'story required'; end if;

  select owner_id into v_owner from public.stories where id = v_story_id;
  if v_owner is null then raise exception 'Story yok'; end if;
  if v_owner <> v_uid and not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;

  with base as (
    select
      sv.viewer_id,
      sv.story_item_id,
      sv.first_viewed_at,
      sv.last_viewed_at,
      sv.view_count,
      p.username,
      p.display_name,
      p.avatar_url,
      (
        select sr.emoji from public.story_reactions sr
        where sr.story_item_id = coalesce(p_item_id, sv.story_item_id)
          and sr.user_id = sv.viewer_id
        limit 1
      ) as reaction
    from public.story_views sv
    join public.profiles p on p.id = sv.viewer_id
    where sv.story_id = v_story_id
      and sv.viewer_id <> v_owner
      and (p_item_id is null or sv.story_item_id = p_item_id)
      and (p_cursor is null or sv.last_viewed_at < p_cursor)
    order by sv.last_viewed_at desc
    limit v_limit
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'viewer_id', viewer_id,
        'username', username,
        'display_name', display_name,
        'avatar_url', avatar_url,
        'story_item_id', story_item_id,
        'first_viewed_at', first_viewed_at,
        'last_viewed_at', last_viewed_at,
        'view_count', view_count,
        'reaction', reaction
      )
      order by last_viewed_at desc
    ), '[]'::jsonb),
    min(last_viewed_at)
  into v_rows, v_next
  from base;

  return jsonb_build_object(
    'ok', true,
    'story_id', v_story_id,
    'viewers', coalesce(v_rows, '[]'::jsonb),
    'next_cursor', case
      when jsonb_array_length(coalesce(v_rows, '[]'::jsonb)) >= v_limit then v_next
      else null
    end
  );
end;
$$;

grant execute on function public.hikaye_goruntuleyenler(uuid, uuid, int, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_tepki — upsert or clear (p_emoji null)
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_tepki(
  p_item_id uuid,
  p_emoji text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.story_items%rowtype;
  v_emoji text := nullif(lower(trim(coalesce(p_emoji, ''))), '');
  v_had boolean := false;
  v_delta int := 0;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_item_id is null then raise exception 'item required'; end if;
  if not public.hikaye_aktif_mi() then raise exception 'Stories disabled'; end if;

  select * into v_item
  from public.story_items
  where id = p_item_id and status = 'active' and deleted_at is null;
  if not found then raise exception 'Oge yok'; end if;

  if not public.hikaye_izleyici_yetkili_mi(v_uid, v_item.story_id) then
    raise exception 'Forbidden';
  end if;

  select exists(
    select 1 from public.story_reactions
    where story_item_id = p_item_id and user_id = v_uid
  ) into v_had;

  if v_emoji is null then
    delete from public.story_reactions
    where story_item_id = p_item_id and user_id = v_uid;
    if v_had then v_delta := -1; end if;
  else
    if v_emoji not in ('heart', 'fire', 'laugh', 'clap', 'heart_eyes') then
      raise exception 'Gecersiz tepki';
    end if;

    insert into public.story_reactions (
      story_item_id, story_id, user_id, emoji, created_at, updated_at
    ) values (
      p_item_id, v_item.story_id, v_uid, v_emoji, now(), now()
    )
    on conflict (story_item_id, user_id) do update
      set emoji = excluded.emoji,
          updated_at = now();

    if not v_had then v_delta := 1; end if;
  end if;

  if v_delta <> 0 then
    update public.stories
    set reaction_count = greatest(0, reaction_count + v_delta)
    where id = v_item.story_id;
  end if;

  -- Optional notify owner (non-self)
  if v_emoji is not null
     and v_item.owner_id <> v_uid
     and to_regprocedure('public.bildirim_kuyruga_ekle(uuid, text, text, text, text, jsonb)') is not null
  then
    begin
      perform public.bildirim_kuyruga_ekle(
        v_item.owner_id,
        'story_reaction',
        'Yeni hikaye tepkisi',
        'Hikayene tepki verildi',
        'tamuso://story/' || v_item.story_id::text || '/' || p_item_id::text,
        jsonb_build_object(
          'story_id', v_item.story_id,
          'item_id', p_item_id,
          'actor_id', v_uid,
          'emoji', v_emoji
        )
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object(
    'ok', true,
    'item_id', p_item_id,
    'emoji', v_emoji,
    'removed', v_emoji is null
  );
end;
$$;

grant execute on function public.hikaye_tepki(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Mute RPCs
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_sessize_al(p_muted_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_muted_user_id is null then raise exception 'user required'; end if;
  if p_muted_user_id = v_uid then raise exception 'Kendini sessize alamazsin'; end if;

  insert into public.story_mutes (muter_id, muted_user_id)
  values (v_uid, p_muted_user_id)
  on conflict do nothing;

  return jsonb_build_object('ok', true, 'muted_user_id', p_muted_user_id);
end;
$$;

grant execute on function public.hikaye_sessize_al(uuid) to authenticated;

create or replace function public.hikaye_sessizi_ac(p_muted_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_muted_user_id is null then raise exception 'user required'; end if;

  delete from public.story_mutes
  where muter_id = v_uid and muted_user_id = p_muted_user_id;

  return jsonb_build_object('ok', true, 'unmuted_user_id', p_muted_user_id);
end;
$$;

grant execute on function public.hikaye_sessizi_ac(uuid) to authenticated;

create or replace function public.hikaye_sessizler_listesi()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', m.muted_user_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'created_at', m.created_at
    )
    order by m.created_at desc
  ), '[]'::jsonb)
  into v_rows
  from public.story_mutes m
  join public.profiles p on p.id = m.muted_user_id
  where m.muter_id = v_uid;

  return jsonb_build_object('ok', true, 'items', coalesce(v_rows, '[]'::jsonb));
end;
$$;

grant execute on function public.hikaye_sessizler_listesi() to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_deeplink_coz
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_deeplink_coz(
  p_story_id uuid default null,
  p_item_id uuid default null,
  p_owner_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_story_id uuid := p_story_id;
  v_item_id uuid := p_item_id;
  v_owner uuid := p_owner_id;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.hikaye_aktif_mi() then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  if v_item_id is not null and v_story_id is null then
    select story_id, owner_id into v_story_id, v_owner
    from public.story_items where id = v_item_id;
  end if;

  if v_story_id is null and v_owner is not null then
    select id into v_story_id
    from public.stories
    where owner_id = v_owner and status = 'active' and expires_at > now()
    order by created_at desc
    limit 1;
  end if;

  if v_story_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if not public.hikaye_izleyici_yetkili_mi(v_uid, v_story_id) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select owner_id into v_owner from public.stories where id = v_story_id;

  if v_item_id is not null then
    if not exists (
      select 1 from public.story_items
      where id = v_item_id and story_id = v_story_id
        and status = 'active' and deleted_at is null
    ) then
      v_item_id := null;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'story_id', v_story_id,
    'item_id', v_item_id,
    'owner_id', v_owner,
    'deep_link', 'tamuso://story/' || v_story_id::text
      || case when v_item_id is not null then '/' || v_item_id::text else '' end
  );
end;
$$;

grant execute on function public.hikaye_deeplink_coz(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Close friends
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_yakin_arkadas_ayarla(p_friend_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_count int := 0;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  delete from public.story_close_friends where owner_id = v_uid;

  if p_friend_ids is not null then
    foreach v_id in array p_friend_ids loop
      if v_id is null or v_id = v_uid then
        continue;
      end if;
      if not exists (select 1 from public.profiles where id = v_id) then
        continue;
      end if;
      if public.kullanicilar_engelli_mi(v_uid, v_id) then
        continue;
      end if;
      insert into public.story_close_friends (owner_id, friend_id)
      values (v_uid, v_id)
      on conflict do nothing;
      v_count := v_count + 1;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

grant execute on function public.hikaye_yakin_arkadas_ayarla(uuid[]) to authenticated;

create or replace function public.hikaye_yakin_arkadas_getir()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', cf.friend_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'created_at', cf.created_at
    )
    order by p.display_name nulls last, p.username
  ), '[]'::jsonb)
  into v_rows
  from public.story_close_friends cf
  join public.profiles p on p.id = cf.friend_id
  where cf.owner_id = v_uid;

  return jsonb_build_object('ok', true, 'items', coalesce(v_rows, '[]'::jsonb));
end;
$$;

grant execute on function public.hikaye_yakin_arkadas_getir() to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_arsiv_listesi — own archived stories
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_arsiv_listesi(
  p_limit int default 30,
  p_cursor timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 30), 100));
  v_rows jsonb;
  v_next timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  with base as (
    select
      s.id,
      s.created_at,
      s.expires_at,
      s.archived_at,
      s.item_count,
      s.view_count,
      s.privacy,
      (
        select si.thumbnail_url
        from public.story_items si
        where si.story_id = s.id
        order by si.sort_order, si.created_at
        limit 1
      ) as cover_url
    from public.stories s
    where s.owner_id = v_uid
      and s.status = 'archived'
      and (p_cursor is null or coalesce(s.archived_at, s.expires_at) < p_cursor)
    order by coalesce(s.archived_at, s.expires_at) desc
    limit v_limit
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'story_id', id,
        'created_at', created_at,
        'expires_at', expires_at,
        'archived_at', archived_at,
        'item_count', item_count,
        'view_count', view_count,
        'privacy', privacy,
        'cover_url', cover_url
      )
      order by coalesce(archived_at, expires_at) desc
    ), '[]'::jsonb),
    min(coalesce(archived_at, expires_at))
  into v_rows, v_next
  from base;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce(v_rows, '[]'::jsonb),
    'next_cursor', case
      when jsonb_array_length(coalesce(v_rows, '[]'::jsonb)) >= v_limit then v_next
      else null
    end
  );
end;
$$;

grant execute on function public.hikaye_arsiv_listesi(int, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_suresi_dolmuslari_arsivle + cron every 15m
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_suresi_dolmuslari_arsivle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  with updated as (
    update public.stories
    set status = 'archived',
        archived_at = coalesce(archived_at, now())
    where status = 'active'
      and expires_at <= now()
    returning id
  )
  select count(*)::int into v_count from updated;

  return jsonb_build_object('ok', true, 'archived_count', v_count);
end;
$$;

-- Callable by service_role / cron; also authenticated (no-op harm if user calls)
grant execute on function public.hikaye_suresi_dolmuslari_arsivle() to authenticated;
grant execute on function public.hikaye_suresi_dolmuslari_arsivle() to service_role;

do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception when others then
  raise notice 'pg_cron yok — edge cron kullanin';
end $$;

do $$
begin
  perform cron.unschedule('hikaye-suresi-dolmus-arsivle');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'hikaye-suresi-dolmus-arsivle',
    '*/15 * * * *',
    $cron$ select public.hikaye_suresi_dolmuslari_arsivle(); $cron$
  );
exception when others then
  raise notice 'pg_cron schedule basarisiz: %', SQLERRM;
end $$;
