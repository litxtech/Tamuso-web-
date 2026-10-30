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