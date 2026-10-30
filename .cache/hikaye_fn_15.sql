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