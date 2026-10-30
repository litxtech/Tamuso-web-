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