-- AI Music: taste memory + per-user moderation + admin created-tracks RPCs
-- Audit: generation_jobs.settings filled by edge; taste stores recent preferences.

-- ---------------------------------------------------------------------------
-- Taste profile (algorithm memory)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_music_user_taste (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  recent_genres text[] not null default '{}',
  recent_moods text[] not null default '{}',
  recent_tempos text[] not null default '{}',
  recent_languages text[] not null default '{}',
  recent_titles jsonb not null default '[]'::jsonb,
  last_prompt text,
  last_settings jsonb not null default '{}'::jsonb,
  generation_count int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ai_music_user_taste enable row level security;
drop policy if exists "ai_music_taste_own" on public.ai_music_user_taste;
create policy "ai_music_taste_own"
  on public.ai_music_user_taste for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());
grant select on public.ai_music_user_taste to authenticated;

-- ---------------------------------------------------------------------------
-- Per-user moderation (create / library blocks + warns)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_music_user_moderation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  create_blocked boolean not null default false,
  library_blocked boolean not null default false,
  warn_count int not null default 0,
  last_warn_at timestamptz,
  last_warn_message text,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.ai_music_user_moderation enable row level security;
drop policy if exists "ai_music_mod_admin" on public.ai_music_user_moderation;
create policy "ai_music_mod_admin"
  on public.ai_music_user_moderation for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());
drop policy if exists "ai_music_mod_own_read" on public.ai_music_user_moderation;
create policy "ai_music_mod_own_read"
  on public.ai_music_user_moderation for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());
grant select on public.ai_music_user_moderation to authenticated;

-- ---------------------------------------------------------------------------
-- User: own moderation status (for UI gates)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_my_moderation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m public.ai_music_user_moderation%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into m from public.ai_music_user_moderation where user_id = v_uid;
  if not found then
    return jsonb_build_object(
      'create_blocked', false,
      'library_blocked', false,
      'warn_count', 0,
      'last_warn_message', null
    );
  end if;
  return jsonb_build_object(
    'create_blocked', m.create_blocked,
    'library_blocked', m.library_blocked,
    'warn_count', m.warn_count,
    'last_warn_message', m.last_warn_message,
    'last_warn_at', m.last_warn_at
  );
end;
$$;
grant execute on function public.ai_music_my_moderation() to authenticated;

-- ---------------------------------------------------------------------------
-- User: taste get (for "önceki gibi" chips)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_my_taste()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t public.ai_music_user_taste%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into t from public.ai_music_user_taste where user_id = v_uid;
  if not found then
    return jsonb_build_object(
      'recent_genres', '[]'::jsonb,
      'recent_moods', '[]'::jsonb,
      'recent_titles', '[]'::jsonb,
      'last_prompt', null,
      'last_settings', '{}'::jsonb,
      'generation_count', 0
    );
  end if;
  return jsonb_build_object(
    'recent_genres', to_jsonb(t.recent_genres),
    'recent_moods', to_jsonb(t.recent_moods),
    'recent_tempos', to_jsonb(t.recent_tempos),
    'recent_languages', to_jsonb(t.recent_languages),
    'recent_titles', t.recent_titles,
    'last_prompt', t.last_prompt,
    'last_settings', t.last_settings,
    'generation_count', t.generation_count,
    'updated_at', t.updated_at
  );
end;
$$;
grant execute on function public.ai_music_my_taste() to authenticated;

-- ---------------------------------------------------------------------------
-- Service: upsert taste after successful generation (called by edge / service)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_taste_upsert(
  p_user_id uuid,
  p_genre text default null,
  p_mood text default null,
  p_tempo text default null,
  p_language text default null,
  p_title text default null,
  p_track_id uuid default null,
  p_prompt text default null,
  p_settings jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titles jsonb;
  v_genres text[];
  v_moods text[];
  v_tempos text[];
  v_langs text[];
  v_entry jsonb;
begin
  if p_user_id is null then return; end if;

  select
    coalesce(recent_titles, '[]'::jsonb),
    coalesce(recent_genres, '{}'),
    coalesce(recent_moods, '{}'),
    coalesce(recent_tempos, '{}'),
    coalesce(recent_languages, '{}')
  into v_titles, v_genres, v_moods, v_tempos, v_langs
  from public.ai_music_user_taste
  where user_id = p_user_id;

  if not found then
    v_titles := '[]'::jsonb;
    v_genres := '{}';
    v_moods := '{}';
    v_tempos := '{}';
    v_langs := '{}';
  end if;

  if nullif(trim(coalesce(p_genre, '')), '') is not null then
    v_genres := (
      select array_agg(x) from (
        select unnest(array_prepend(trim(p_genre), array_remove(v_genres, trim(p_genre)))) as x
        limit 8
      ) s
    );
  end if;
  if nullif(trim(coalesce(p_mood, '')), '') is not null then
    v_moods := (
      select array_agg(x) from (
        select unnest(array_prepend(trim(p_mood), array_remove(v_moods, trim(p_mood)))) as x
        limit 8
      ) s
    );
  end if;
  if nullif(trim(coalesce(p_tempo, '')), '') is not null then
    v_tempos := (
      select array_agg(x) from (
        select unnest(array_prepend(trim(p_tempo), array_remove(v_tempos, trim(p_tempo)))) as x
        limit 6
      ) s
    );
  end if;
  if nullif(trim(coalesce(p_language, '')), '') is not null then
    v_langs := (
      select array_agg(x) from (
        select unnest(array_prepend(trim(p_language), array_remove(v_langs, trim(p_language)))) as x
        limit 4
      ) s
    );
  end if;

  if nullif(trim(coalesce(p_title, '')), '') is not null or p_track_id is not null then
    v_entry := jsonb_build_object(
      'title', coalesce(nullif(trim(p_title), ''), 'Parça'),
      'track_id', p_track_id,
      'at', now()
    );
    v_titles := (
      select coalesce(jsonb_agg(e), '[]'::jsonb)
      from (
        select e
        from jsonb_array_elements(
          jsonb_build_array(v_entry) || coalesce(v_titles, '[]'::jsonb)
        ) as e
        limit 12
      ) s
    );
  end if;

  insert into public.ai_music_user_taste as t (
    user_id, recent_genres, recent_moods, recent_tempos, recent_languages,
    recent_titles, last_prompt, last_settings, generation_count, updated_at
  ) values (
    p_user_id,
    coalesce(v_genres, '{}'),
    coalesce(v_moods, '{}'),
    coalesce(v_tempos, '{}'),
    coalesce(v_langs, '{}'),
    coalesce(v_titles, '[]'::jsonb),
    left(coalesce(p_prompt, ''), 4000),
    coalesce(p_settings, '{}'::jsonb),
    1,
    now()
  )
  on conflict (user_id) do update set
    recent_genres = excluded.recent_genres,
    recent_moods = excluded.recent_moods,
    recent_tempos = excluded.recent_tempos,
    recent_languages = excluded.recent_languages,
    recent_titles = excluded.recent_titles,
    last_prompt = excluded.last_prompt,
    last_settings = excluded.last_settings,
    generation_count = t.generation_count + 1,
    updated_at = now();
end;
$$;
-- service_role only (edge); no grant to authenticated

-- ---------------------------------------------------------------------------
-- Library add respects library_blocked
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_library_add(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_blocked boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select library_blocked into v_blocked
  from public.ai_music_user_moderation where user_id = v_uid;
  if coalesce(v_blocked, false) then
    return jsonb_build_object('ok', false, 'hata', 'Kütüphane kullanımın geçici olarak kapatıldı');
  end if;

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

-- ---------------------------------------------------------------------------
-- Admin: creators list (users who generated AI music)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_admin_creators(
  p_query text default null,
  p_limit int default 40,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := nullif(trim(coalesce(p_query, '')), '');
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        p.id as user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.public_user_id,
        count(t.id)::int as track_count,
        coalesce(sum(t.duration_ms), 0)::bigint as total_duration_ms,
        max(t.created_at) as last_created_at,
        coalesce(m.create_blocked, false) as create_blocked,
        coalesce(m.library_blocked, false) as library_blocked,
        coalesce(m.warn_count, 0) as warn_count
      from public.music_tracks t
      join public.profiles p on p.id = t.owner_user_id
      left join public.ai_music_user_moderation m on m.user_id = p.id
      where t.source = 'ai'
        and t.soft_deleted_at is null
        and (
          v_q is null
          or p.username ilike '%' || v_q || '%'
          or p.display_name ilike '%' || v_q || '%'
          or coalesce(p.public_user_id::text, '') ilike '%' || v_q || '%'
          or p.id::text ilike '%' || v_q || '%'
        )
      group by p.id, p.username, p.display_name, p.avatar_url, p.public_user_id,
               m.create_blocked, m.library_blocked, m.warn_count
      order by max(t.created_at) desc nulls last
      limit greatest(1, least(coalesce(p_limit, 40), 100))
      offset greatest(0, coalesce(p_offset, 0))
    ) x
  ), '[]'::jsonb);
end;
$$;
grant execute on function public.ai_music_admin_creators(text, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: all tracks for one user (with prompt / settings for proof)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_admin_user_tracks(
  p_user_id uuid,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user jsonb;
  v_mod jsonb;
  v_tracks jsonb;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_user_id is null then raise exception 'user_id gerekli'; end if;

  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'display_name', p.display_name,
    'avatar_url', p.avatar_url,
    'public_user_id', p.public_user_id
  ) into v_user
  from public.profiles p where p.id = p_user_id;

  if v_user is null then
    return jsonb_build_object('ok', false, 'hata', 'Kullanıcı yok');
  end if;

  select jsonb_build_object(
    'create_blocked', coalesce(m.create_blocked, false),
    'library_blocked', coalesce(m.library_blocked, false),
    'warn_count', coalesce(m.warn_count, 0),
    'last_warn_at', m.last_warn_at,
    'last_warn_message', m.last_warn_message,
    'notes', m.notes
  ) into v_mod
  from public.ai_music_user_moderation m
  where m.user_id = p_user_id;

  if v_mod is null then
    v_mod := jsonb_build_object(
      'create_blocked', false,
      'library_blocked', false,
      'warn_count', 0,
      'last_warn_at', null,
      'last_warn_message', null,
      'notes', null
    );
  end if;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_tracks
  from (
    select
      t.id,
      t.title,
      t.cover_url,
      t.cover_thumb_url,
      t.audio_url,
      t.duration_ms,
      t.status,
      t.genre_code,
      t.mood,
      t.public_track_code,
      t.created_at,
      t.moderation_status,
      t.is_instrumental,
      t.in_user_library,
      t.last_user_prompt,
      t.prompt_hash,
      t.soft_deleted_at,
      j.id as job_id,
      j.user_prompt as job_prompt,
      j.prepared_prompt,
      j.requested_duration_seconds,
      j.lyrics_mode,
      j.lyrics_text,
      j.tempo,
      j.bpm,
      j.language_code,
      j.instruments,
      j.structure_hint,
      j.settings as job_settings,
      j.force_instrumental,
      j.created_at as job_created_at,
      j.status as job_status
    from public.music_tracks t
    left join lateral (
      select *
      from public.ai_music_generation_jobs j2
      where j2.track_id = t.id
         or j2.id = t.generation_job_id
      order by j2.created_at desc
      limit 1
    ) j on true
    where t.owner_user_id = p_user_id
      and t.source = 'ai'
    order by t.created_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
    offset greatest(0, coalesce(p_offset, 0))
  ) x;

  return jsonb_build_object(
    'ok', true,
    'user', v_user,
    'moderation', v_mod,
    'tracks', v_tracks
  );
end;
$$;
grant execute on function public.ai_music_admin_user_tracks(uuid, int, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: remove / restore track
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_admin_track_remove(
  p_track_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  update public.music_tracks set
    soft_deleted_at = now(),
    moderation_status = 'REMOVED',
    is_active = false,
    in_user_library = false,
    updated_at = now()
  where id = p_track_id and source = 'ai';

  if not found then
    return jsonb_build_object('ok', false, 'hata', 'Parça bulunamadı');
  end if;

  perform public.admin_audit_yaz(
    (select owner_user_id from public.music_tracks where id = p_track_id),
    'ai_music_track_remove',
    coalesce(nullif(trim(p_reason), ''), 'AI müzik kaldırıldı'),
    jsonb_build_object('track_id', p_track_id, 'by', auth.uid())
  );

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.ai_music_admin_track_remove(uuid, text) to authenticated;

create or replace function public.ai_music_admin_track_restore(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  update public.music_tracks set
    soft_deleted_at = null,
    moderation_status = 'ACTIVE',
    is_active = true,
    updated_at = now()
  where id = p_track_id and source = 'ai';

  if not found then
    return jsonb_build_object('ok', false, 'hata', 'Parça bulunamadı');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.ai_music_admin_track_restore(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: warn + block create / library
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_admin_user_moderation_set(
  p_user_id uuid,
  p_create_blocked boolean default null,
  p_library_blocked boolean default null,
  p_warn_message text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_warn text := nullif(trim(coalesce(p_warn_message, '')), '');
  v_row public.ai_music_user_moderation%rowtype;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_user_id is null then raise exception 'user_id gerekli'; end if;

  insert into public.ai_music_user_moderation as m (
    user_id, create_blocked, library_blocked, warn_count,
    last_warn_at, last_warn_message, notes, updated_at, updated_by
  ) values (
    p_user_id,
    coalesce(p_create_blocked, false),
    coalesce(p_library_blocked, false),
    case when v_warn is not null then 1 else 0 end,
    case when v_warn is not null then now() else null end,
    v_warn,
    nullif(trim(coalesce(p_notes, '')), ''),
    now(),
    auth.uid()
  )
  on conflict (user_id) do update set
    create_blocked = coalesce(p_create_blocked, m.create_blocked),
    library_blocked = coalesce(p_library_blocked, m.library_blocked),
    warn_count = case
      when v_warn is not null then m.warn_count + 1
      else m.warn_count
    end,
    last_warn_at = case when v_warn is not null then now() else m.last_warn_at end,
    last_warn_message = case when v_warn is not null then v_warn else m.last_warn_message end,
    notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), m.notes),
    updated_at = now(),
    updated_by = auth.uid()
  returning * into v_row;

  if v_warn is not null then
    perform public.admin_ihtar_ver(
      p_user_id,
      'AI Müzik: ' || v_warn,
      'medium',
      'ai_music_moderation'
    );
  end if;

  perform public.admin_audit_yaz(
    p_user_id,
    'ai_music_user_moderation',
    'AI müzik moderasyon güncellendi',
    jsonb_build_object(
      'create_blocked', v_row.create_blocked,
      'library_blocked', v_row.library_blocked,
      'warn', v_warn,
      'by', auth.uid()
    )
  );

  return jsonb_build_object(
    'ok', true,
    'create_blocked', v_row.create_blocked,
    'library_blocked', v_row.library_blocked,
    'warn_count', v_row.warn_count,
    'last_warn_message', v_row.last_warn_message
  );
end;
$$;
grant execute on function public.ai_music_admin_user_moderation_set(uuid, boolean, boolean, text, text) to authenticated;
