

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