alesce(v_items, '[]'::jsonb)
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

  return jsonb_