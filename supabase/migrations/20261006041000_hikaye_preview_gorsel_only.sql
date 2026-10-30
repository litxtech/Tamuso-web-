-- preview_url: yalnızca görsel (thumbnail veya image) — video media_url avatar'a konmaz

create or replace function public.hikaye_tepsi_getir(
  p_limit int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_items jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.hikaye_aktif_mi() then
    return jsonb_build_object('ok', true, 'enabled', false, 'items', '[]'::jsonb);
  end if;

  with candidates as (
    select
      s.id as story_id,
      s.owner_id,
      s.is_official,
      s.item_count,
      s.expires_at,
      s.created_at,
      s.privacy,
      p.username,
      p.display_name,
      p.avatar_url,
      p.is_verified,
      (s.owner_id = v_uid) as is_own,
      exists (
        select 1
        from public.story_items si
        where si.story_id = s.id
          and si.status = 'active'
          and si.deleted_at is null
          and not exists (
            select 1 from public.story_views sv
            where sv.story_item_id = si.id and sv.viewer_id = v_uid
          )
      ) as has_unseen,
      (
        select max(si.created_at)
        from public.story_items si
        where si.story_id = s.id
          and si.status = 'active'
          and si.deleted_at is null
      ) as latest_item_at,
      (
        select coalesce(
          nullif(trim(si.thumbnail_url), ''),
          case
            when si.media_type = 'image' then nullif(trim(si.media_url), '')
            else null
          end
        )
        from public.story_items si
        where si.story_id = s.id
          and si.status = 'active'
          and si.deleted_at is null
        order by si.created_at desc
        limit 1
      ) as preview_url,
      coalesce((
        select max(pr.priority)
        from public.story_admin_promotions pr
        where pr.story_id = s.id
          and pr.is_active
          and pr.starts_at <= now()
          and (pr.ends_at is null or pr.ends_at > now())
          and coalesce(public.ozellik_bayragi_aktif_mi('story_official_promotions_enabled'), false)
      ), -1) as promo_priority
    from public.stories s
    join public.profiles p on p.id = s.owner_id
    where s.status = 'active'
      and s.expires_at > now()
      and s.item_count > 0
      and public.hikaye_izleyici_yetkili_mi(v_uid, s.id)
  ),
  ranked as (
    select *
    from candidates
    order by
      is_own desc,
      promo_priority desc,
      has_unseen desc,
      latest_item_at desc nulls last
    limit v_limit
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'story_id', story_id,
      'owner_id', owner_id,
      'username', username,
      'display_name', display_name,
      'avatar_url', avatar_url,
      'preview_url', preview_url,
      'is_verified', coalesce(is_verified, false),
      'is_official', is_official,
      'is_own', is_own,
      'item_count', item_count,
      'has_unseen', has_unseen,
      'privacy', privacy,
      'expires_at', expires_at,
      'latest_item_at', latest_item_at,
      'promo_priority', nullif(promo_priority, -1)
    )
    order by
      is_own desc,
      promo_priority desc,
      has_unseen desc,
      latest_item_at desc nulls last
  ), '[]'::jsonb)
  into v_items
  from ranked;

  return jsonb_build_object(
    'ok', true,
    'enabled', true,
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.hikaye_tepsi_getir(int) to authenticated;

create or replace function public.hikaye_kullanici_ozet(p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_story_id uuid;
  v_item_count int := 0;
  v_has_unseen boolean := false;
  v_preview_url text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_owner_id is null then
    return jsonb_build_object('ok', true, 'has_active', false, 'has_unseen', false, 'item_count', 0);
  end if;
  if not public.hikaye_aktif_mi() then
    return jsonb_build_object('ok', true, 'enabled', false, 'has_active', false, 'has_unseen', false, 'item_count', 0);
  end if;

  select s.id, s.item_count into v_story_id, v_item_count
  from public.stories s
  where s.owner_id = p_owner_id
    and s.status = 'active'
    and s.expires_at > now()
    and s.item_count > 0
    and s.deleted_at is null
  order by s.created_at desc
  limit 1;

  if v_story_id is null then
    return jsonb_build_object('ok', true, 'has_active', false, 'has_unseen', false, 'item_count', 0);
  end if;

  if not public.hikaye_izleyici_yetkili_mi(v_uid, v_story_id) then
    return jsonb_build_object('ok', true, 'has_active', false, 'has_unseen', false, 'item_count', 0);
  end if;

  select exists (
    select 1 from public.story_items si
    where si.story_id = v_story_id and si.status = 'active' and si.deleted_at is null
      and not exists (
        select 1 from public.story_views sv
        where sv.story_item_id = si.id and sv.viewer_id = v_uid
      )
  ) into v_has_unseen;

  select coalesce(
    nullif(trim(si.thumbnail_url), ''),
    case
      when si.media_type = 'image' then nullif(trim(si.media_url), '')
      else null
    end
  )
  into v_preview_url
  from public.story_items si
  where si.story_id = v_story_id
    and si.status = 'active'
    and si.deleted_at is null
  order by si.created_at desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'has_active', true,
    'has_unseen', coalesce(v_has_unseen, false),
    'item_count', coalesce(v_item_count, 0),
    'story_id', v_story_id,
    'owner_id', p_owner_id,
    'preview_url', v_preview_url
  );
end;
$$;

grant execute on function public.hikaye_kullanici_ozet(uuid) to authenticated;
