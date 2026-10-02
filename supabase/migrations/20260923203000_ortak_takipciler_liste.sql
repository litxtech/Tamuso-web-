-- Ortak takipçiler tam liste (Instagram "Followed by" detay)

create or replace function public.ortak_takipcileri_listele(
  p_target_id uuid,
  p_limit int default 24,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := least(greatest(coalesce(p_limit, 24), 1), 40);
  v_items jsonb := '[]'::jsonb;
  v_next jsonb := null;
begin
  if v_uid is null or p_target_id is null or v_uid = p_target_id then
    return jsonb_build_object('items', '[]'::jsonb, 'next_cursor', null);
  end if;
  if public.kullanicilar_engelli_mi(v_uid, p_target_id) then
    return jsonb_build_object('items', '[]'::jsonb, 'next_cursor', null);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', x.user_id,
    'display_name', x.display_name,
    'username', x.username,
    'avatar_url', x.avatar_url,
    'is_verified', x.is_verified,
    'level', x.level,
    'followed_at', x.followed_at,
    'i_follow', true,
    'they_follow_me', x.they_follow_me,
    'is_mutual', x.they_follow_me,
    'follows_you', x.they_follow_me,
    'state', case when x.they_follow_me then 'MUTUAL' else 'FOLLOWING' end
  ) order by x.followed_at desc, x.user_id), '[]'::jsonb)
  into v_items
  from (
    select
      p.id as user_id,
      coalesce(p.display_name, p.username, 'Kullanici') as display_name,
      p.username,
      p.avatar_url,
      coalesce(p.is_verified, false) as is_verified,
      coalesce(p.level, 1) as level,
      theirs.created_at as followed_at,
      exists (
        select 1 from public.follows back
        where back.follower_id = p.id and back.following_id = v_uid
      ) as they_follow_me
    from public.follows mine
    join public.follows theirs
      on theirs.follower_id = mine.following_id
     and theirs.following_id = p_target_id
    join public.profiles p on p.id = mine.following_id
    where mine.follower_id = v_uid
      and p.deleted_at is null
      and p.banned_at is null
      and not public.kullanicilar_engelli_mi(v_uid, mine.following_id)
      and (
        p_cursor_created_at is null
        or theirs.created_at < p_cursor_created_at
        or (theirs.created_at = p_cursor_created_at and p.id < p_cursor_id)
      )
    order by theirs.created_at desc, p.id desc
    limit v_lim + 1
  ) x;

  if jsonb_array_length(v_items) > v_lim then
    v_next := jsonb_build_object(
      'created_at', v_items -> v_lim - 1 ->> 'followed_at',
      'id', v_items -> v_lim - 1 ->> 'user_id'
    );
    v_items := (
      select coalesce(jsonb_agg(elem), '[]'::jsonb)
      from jsonb_array_elements(v_items) with ordinality as t(elem, ord)
      where ord <= v_lim
    );
  end if;

  return jsonb_build_object('items', v_items, 'next_cursor', v_next);
end;
$$;

grant execute on function public.ortak_takipcileri_listele(uuid, int, timestamptz, uuid)
  to authenticated;

-- Ozet metni Instagram diline yakin kalsin (mevcut RPC ayni)
create or replace function public.ortak_takipcileri_ozet(p_target_id uuid, p_limit int default 3)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := least(greatest(coalesce(p_limit, 3), 1), 6);
  v_previews jsonb;
  v_count bigint := 0;
begin
  if v_uid is null or p_target_id is null or v_uid = p_target_id then
    return jsonb_build_object('count', 0, 'previews', '[]'::jsonb);
  end if;
  if public.kullanicilar_engelli_mi(v_uid, p_target_id) then
    return jsonb_build_object('count', 0, 'previews', '[]'::jsonb);
  end if;

  select count(*) into v_count
  from public.follows mine
  join public.follows theirs
    on theirs.follower_id = mine.following_id
   and theirs.following_id = p_target_id
  join public.profiles p on p.id = mine.following_id
  where mine.follower_id = v_uid
    and p.deleted_at is null
    and p.banned_at is null
    and not public.kullanicilar_engelli_mi(v_uid, mine.following_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', t.user_id,
    'display_name', t.display_name,
    'username', t.username,
    'avatar_url', t.avatar_url
  )), '[]'::jsonb)
  into v_previews
  from (
    select
      p.id as user_id,
      coalesce(p.display_name, p.username, 'Kullanici') as display_name,
      p.username,
      p.avatar_url
    from public.follows mine
    join public.follows theirs
      on theirs.follower_id = mine.following_id
     and theirs.following_id = p_target_id
    join public.profiles p on p.id = mine.following_id
    where mine.follower_id = v_uid
      and p.deleted_at is null
      and p.banned_at is null
      and not public.kullanicilar_engelli_mi(v_uid, mine.following_id)
    order by theirs.created_at desc
    limit v_lim
  ) t;

  return jsonb_build_object('count', v_count, 'previews', v_previews);
end;
$$;
