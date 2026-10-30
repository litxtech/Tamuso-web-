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