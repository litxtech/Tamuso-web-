-- AI Music: opt-in library + last prompt for edit/revise
-- Tracks are NOT auto-added to user library on create.

alter table public.music_tracks
  add column if not exists in_user_library boolean not null default false;

alter table public.music_tracks
  add column if not exists last_user_prompt text;

create index if not exists music_tracks_user_library_idx
  on public.music_tracks (owner_user_id, created_at desc)
  where source = 'ai'
    and in_user_library = true
    and soft_deleted_at is null;

-- ---------------------------------------------------------------------------
-- Library opt-in / opt-out
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_library_add(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  update public.music_tracks set
    in_user_library = true,
    updated_at = now()
  where id = p_track_id
    and owner_user_id = v_uid
    and source = 'ai'
    and soft_deleted_at is null
    and status = 'READY';
  if not found then
    return jsonb_build_object('ok', false, 'hata', 'Parça bulunamadı veya henüz hazır değil');
  end if;
  return jsonb_build_object('ok', true, 'in_user_library', true);
end;
$$;

grant execute on function public.ai_music_library_add(uuid) to authenticated;

create or replace function public.ai_music_library_remove(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  update public.music_tracks set
    in_user_library = false,
    updated_at = now()
  where id = p_track_id
    and owner_user_id = v_uid
    and source = 'ai'
    and soft_deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'hata', 'Parça bulunamadı');
  end if;
  -- Favorilerden de çıkarma: kütüphane dışı kalınca favori anlamsız
  delete from public.ai_music_user_favorites
  where user_id = v_uid and track_id = p_track_id;
  return jsonb_build_object('ok', true, 'in_user_library', false);
end;
$$;

grant execute on function public.ai_music_library_remove(uuid) to authenticated;

-- My library: only opt-in tracks
create or replace function public.ai_music_my_tracks(
  p_tab text default 'all',
  p_query text default null,
  p_sort text default 'new',
  p_limit int default 40,
  p_before timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q text := public.ai_music_normalize_search(p_query);
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        t.id, t.title, t.cover_url, t.cover_thumb_url, t.duration_ms,
        t.status, t.genre_code, t.mood, t.public_track_code, t.created_at,
        t.moderation_status, t.is_instrumental,
        t.in_user_library,
        exists (
          select 1 from public.ai_music_user_favorites f
          where f.user_id = v_uid and f.track_id = t.id
        ) as is_favorite
      from public.music_tracks t
      where t.owner_user_id = v_uid
        and t.source = 'ai'
        and t.soft_deleted_at is null
        and t.in_user_library = true
        and (p_before is null or t.created_at < p_before)
        and (
          p_tab is null or p_tab = 'all'
          or (p_tab = 'ready' and t.status = 'READY')
          or (p_tab = 'generating' and t.status in ('UPLOADING','PROCESSING'))
          or (p_tab = 'favorites' and exists (
            select 1 from public.ai_music_user_favorites f
            where f.user_id = v_uid and f.track_id = t.id
          ))
        )
        and (
          v_q is null or length(v_q) = 0
          or public.ai_music_normalize_search(t.title) like '%' || v_q || '%'
          or public.ai_music_normalize_search(coalesce(t.genre_code,'')) like '%' || v_q || '%'
          or public.ai_music_normalize_search(coalesce(t.mood,'')) like '%' || v_q || '%'
        )
      order by
        case when p_sort = 'old' then t.created_at end asc nulls last,
        case when p_sort = 'duration' then t.duration_ms end desc nulls last,
        case when p_sort is null or p_sort = 'new' then t.created_at end desc nulls last
      limit greatest(1, least(coalesce(p_limit, 40), 80))
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Detail: expose library flag + last prompt
create or replace function public.ai_music_track_detail(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t public.music_tracks%rowtype;
  p public.profiles%rowtype;
  pass public.music_passports%rowtype;
  v_last_prompt text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into t from public.music_tracks where id = p_track_id;
  if not found then raise exception 'Not found'; end if;
  if t.owner_user_id is distinct from v_uid and not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  if t.soft_deleted_at is not null and not public.ben_admin_miyim() then
    raise exception 'Not found';
  end if;

  select * into p from public.profiles where id = t.owner_user_id;
  select * into pass from public.music_passports where track_id = t.id;

  v_last_prompt := t.last_user_prompt;
  if v_last_prompt is null then
    select j.user_prompt into v_last_prompt
    from public.ai_music_generation_jobs j
    where j.track_id = t.id
    order by j.created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'track', to_jsonb(t),
    'creator', jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ),
    'passport', case when pass.id is null then null else to_jsonb(pass) end,
    'versions', coalesce((
      select jsonb_agg(to_jsonb(v) order by v.version_number)
      from public.music_track_versions v where v.track_id = t.id
    ), '[]'::jsonb),
    'is_favorite', exists (
      select 1 from public.ai_music_user_favorites f
      where f.user_id = v_uid and f.track_id = t.id
    ),
    'in_user_library', coalesce(t.in_user_library, false),
    'last_user_prompt', v_last_prompt
  );
end;
$$;

-- Room: only library-added AI tracks
create or replace function public.ai_music_room_library(p_query text default null, p_limit int default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q text := public.ai_music_normalize_search(p_query);
  v_cfg boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select voice_room_usage_enabled into v_cfg from public.ai_music_config where id = 1;
  if not coalesce(v_cfg, true) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'artist_name', coalesce(p.username, p.display_name),
      'cover_url', coalesce(t.cover_thumb_url, t.cover_url),
      'audio_url', t.audio_url,
      'duration_ms', t.duration_ms,
      'category_id', t.category_id,
      'tags', t.tags,
      'is_featured', false,
      'sort_order', 0,
      'is_favorite', false
    ) order by t.created_at desc)
    from public.music_tracks t
    left join public.profiles p on p.id = t.owner_user_id
    where t.owner_user_id = v_uid
      and t.source = 'ai'
      and t.in_user_library = true
      and t.status = 'READY'
      and t.is_active
      and t.soft_deleted_at is null
      and t.moderation_status = 'ACTIVE'
      and t.audio_url is not null
      and (
        v_q is null or length(v_q) = 0
        or public.ai_music_normalize_search(t.title) like '%' || v_q || '%'
      )
    limit greatest(1, least(coalesce(p_limit, 40), 80))
  ), '[]'::jsonb);
end;
$$;
