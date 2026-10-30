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