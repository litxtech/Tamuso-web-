-- Platform: 1080p sÄ±kÄ±ÅŸtÄ±rma sonrasÄ± uzun video paylaÅŸÄ±mÄ±
-- Bucket tavanlarÄ± 500 MB; hikaye duration meta Ã¼st sÄ±nÄ±rÄ± 2 saat.

update storage.buckets
set file_size_limit = 524288000 -- 500 MB
where id in (
  'story-media',
  'status-media',
  'dm-media',
  'announcement-media',
  'banner-media',
  'giris-lobisi-media'
);

-- YalnÄ±zca duration clamp gÃ¼ncellenir (120s â†’ 2 saat); diÄŸer mantÄ±k aynÄ± kalÄ±r.
create or replace function public.hikaye_olustur(
  p_media_type text,
  p_media_url text default null,
  p_thumbnail_url text default null,
  p_duration_ms integer default 5000,
  p_composition jsonb default '{"composition_version": 1}'::jsonb,
  p_attachment jsonb default null,
  p_caption text default null,
  p_privacy text default null,
  p_excluded_user_ids uuid[] default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- Video varsayÄ±lanÄ± 30 sn; Ã¼st sÄ±nÄ±r 2 saat (1080p sÄ±kÄ±ÅŸtÄ±rma ile uzun video)
  v_duration := coalesce(nullif(p_duration_ms, 0), case when v_type = 'video' then 30000 else 5000 end);
  v_duration := greatest(1000, least(v_duration, 7200000));

  v_privacy := lower(trim(coalesce(p_privacy, '')));
  if v_privacy = '' then v_privacy := null; end if;
  if v_privacy is not null and v_privacy not in ('public', 'followers', 'close_friends') then
    raise exception 'Gecersiz gizlilik';
  end if;

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
    update public.stories
    set expires_at = now() + interval '24 hours',
        privacy = coalesce(v_privacy, privacy)
    where id = v_story.id
    returning * into v_story;
  end if;

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
$function$;

