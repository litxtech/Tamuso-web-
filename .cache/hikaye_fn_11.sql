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