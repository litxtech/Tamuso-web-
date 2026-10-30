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