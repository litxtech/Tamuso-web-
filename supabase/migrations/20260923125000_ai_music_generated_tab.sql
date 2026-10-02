-- Library opt-in + generated tab (all owned tracks)
create or replace function public.ai_music_my_tracks(
  p_tab text default 'all',
  p_query text default null,
  p_sort text default 'new',
  p_limit int default 40,
  p_before timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q text := public.ai_music_normalize_search(p_query);
  v_library_only boolean := coalesce(p_tab, 'all') not in ('generated', 'all_owned');
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        t.id, t.title, t.cover_url, t.cover_thumb_url, t.duration_ms,
        t.status, t.genre_code, t.mood, t.public_track_code, t.created_at,
        t.moderation_status, t.is_instrumental,
        t.in_user_library,
        exists (
          select 1 from public.ai_music_user_favorites f
          where f.user_id = v_uid and f.track_id = t.id
        ) as is_favorite
      from public.music_tracks t
      where t.owner_user_id = v_uid
        and t.source = 'ai'
        and t.soft_deleted_at is null
        and (not v_library_only or t.in_user_library = true)
        and (p_before is null or t.created_at < p_before)
        and (
          p_tab is null or p_tab = 'all' or p_tab = 'generated' or p_tab = 'all_owned'
          or (p_tab = 'ready' and t.status = 'READY')
          or (p_tab = 'generating' and t.status in ('UPLOADING','PROCESSING'))
          or (p_tab = 'favorites' and exists (
            select 1 from public.ai_music_user_favorites f
            where f.user_id = v_uid and f.track_id = t.id
          ))
        )
        and (
          v_q is null or length(v_q) = 0
          or public.ai_music_normalize_search(t.title) like '%' || v_q || '%'
          or public.ai_music_normalize_search(coalesce(t.genre_code,'')) like '%' || v_q || '%'
          or public.ai_music_normalize_search(coalesce(t.mood,'')) like '%' || v_q || '%'
        )
      order by
        case when p_sort = 'old' then t.created_at end asc nulls last,
        case when p_sort = 'duration' then t.duration_ms end desc nulls last,
        case when p_sort is null or p_sort = 'new' then t.created_at end desc nulls last
      limit greatest(1, least(coalesce(p_limit, 40), 80))
    ) x
  ), '[]'::jsonb);
end;
$$;
