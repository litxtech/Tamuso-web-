create or replace function public.hikaye_arsiv_listesi(
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
  v_limit int := greatest(1, least(coalesce(p_limit, 30), 100));
  v_rows jsonb;
  v_next timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  with base as (
    select
      s.id,
      s.created_at,
      s.expires_at,
      s.archived_at,
      s.item_count,
      s.view_count,
      s.privacy,
      (
        select si.thumbnail_url
        from public.story_items si
        where si.story_id = s.id
        order by si.sort_order, si.created_at
        limit 1
      ) as cover_url
    from public.stories s
    where s.owner_id = v_uid
      and s.status = 'archived'
      and (p_cursor is null or coalesce(s.archived_at, s.expires_at) < p_cursor)
    order by coalesce(s.archived_at, s.expires_at) desc
    limit v_limit
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'story_id', id,
        'created_at', created_at,
        'expires_at', expires_at,
        'archived_at', archived_at,
        'item_count', item_count,
        'view_count', view_count,
        'privacy', privacy,
        'cover_url', cover_url
      )
      order by coalesce(archived_at, expires_at) desc
    ), '[]'::jsonb),
    min(coalesce(archived_at, expires_at))
  into v_rows, v_next
  from base;

  return jsonb_build_object(
    'ok', true,
    'items', coalesce(v_rows, '[]'::jsonb),
    'next_cursor', case
      when jsonb_array_length(coalesce(v_rows, '[]'::jsonb)) >= v_limit then v_next
      else null
    end
  );
end;
$$;

grant execute on function public.hikaye_arsiv_listesi(int, timestamptz) to authenticated;