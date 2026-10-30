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
