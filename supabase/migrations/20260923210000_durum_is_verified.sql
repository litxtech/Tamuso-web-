-- Durum akışı / detay / yorum: is_verified (yeşil tik)

create or replace function public.durum_akisi(p_limit integer default 40, p_before timestamp with time zone default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select
        s.id,
        s.user_id,
        s.media_type,
        s.media_url,
        s.caption,
        s.like_count,
        s.comment_count,
        coalesce(s.gift_count, 0) as gift_count,
        coalesce(s.view_count, 0) as view_count,
        coalesce(s.share_count, 0) as share_count,
        coalesce(s.post_kind, 'media') as post_kind,
        coalesce(s.payload, '{}'::jsonb) as payload,
        s.created_at,
        coalesce(p.display_name, p.username, 'Kullanıcı') as display_name,
        p.username,
        p.avatar_url,
        p.public_user_id,
        coalesce(p.is_verified, false) as is_verified,
        exists(
          select 1 from public.status_likes l
          where l.status_id = s.id and l.user_id = v_uid
        ) as liked_by_me,
        (s.user_id = v_uid) as is_mine
      from public.status_posts s
      join public.profiles p on p.id = s.user_id
      where s.deleted_at is null
        and p.deleted_at is null
        and p.banned_at is null
        and public.takip_icerik_gorunur_mu(v_uid, s.user_id)
        and (p_before is null or s.created_at < p_before)
      order by s.created_at desc
      limit least(greatest(coalesce(p_limit, 40), 1), 80)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.durum_akisi_takip(p_limit integer default 40, p_before timestamp with time zone default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select
        s.id,
        s.user_id,
        s.media_type,
        s.media_url,
        s.caption,
        s.like_count,
        s.comment_count,
        coalesce(s.gift_count, 0) as gift_count,
        coalesce(s.view_count, 0) as view_count,
        coalesce(s.share_count, 0) as share_count,
        coalesce(s.post_kind, 'media') as post_kind,
        coalesce(s.payload, '{}'::jsonb) as payload,
        s.created_at,
        coalesce(p.display_name, p.username, 'Kullanıcı') as display_name,
        p.username,
        p.avatar_url,
        p.public_user_id,
        coalesce(p.is_verified, false) as is_verified,
        exists(
          select 1 from public.status_likes l
          where l.status_id = s.id and l.user_id = v_uid
        ) as liked_by_me,
        false as is_mine
      from public.follows f
      join public.status_posts s
        on s.user_id = f.following_id
       and s.deleted_at is null
       and (p_before is null or s.created_at < p_before)
      join public.profiles p on p.id = s.user_id
      where f.follower_id = v_uid
        and p.deleted_at is null
        and p.banned_at is null
        and not public.kullanicilar_engelli_mi(v_uid, s.user_id)
      order by s.created_at desc
      limit least(greatest(coalesce(p_limit, 40), 1), 80)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.durum_kullanicisi(
  p_user_id uuid,
  p_limit integer default 40,
  p_before timestamp with time zone default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_user_id is null then raise exception 'Kullanıcı gerekli'; end if;
  if public.kullanicilar_engelli_mi(v_uid, p_user_id) then
    return '[]'::jsonb;
  end if;
  if not public.takip_icerik_gorunur_mu(v_uid, p_user_id) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select
        s.id,
        s.user_id,
        s.media_type,
        s.media_url,
        s.caption,
        s.like_count,
        s.comment_count,
        coalesce(s.gift_count, 0) as gift_count,
        coalesce(s.view_count, 0) as view_count,
        coalesce(s.share_count, 0) as share_count,
        coalesce(s.post_kind, 'media') as post_kind,
        coalesce(s.payload, '{}'::jsonb) as payload,
        s.created_at,
        coalesce(p.display_name, p.username, 'Kullanıcı') as display_name,
        p.username,
        p.avatar_url,
        p.public_user_id,
        coalesce(p.is_verified, false) as is_verified,
        exists(
          select 1 from public.status_likes l
          where l.status_id = s.id and l.user_id = v_uid
        ) as liked_by_me,
        (s.user_id = v_uid) as is_mine
      from public.status_posts s
      join public.profiles p on p.id = s.user_id
      where s.user_id = p_user_id
        and s.deleted_at is null
        and p.deleted_at is null
        and p.banned_at is null
        and (p_before is null or s.created_at < p_before)
      order by s.created_at desc
      limit least(greatest(coalesce(p_limit, 40), 1), 80)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.durum_detay(p_status_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row jsonb;
  v_owner uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select s.user_id into v_owner
  from public.status_posts s
  where s.id = p_status_id and s.deleted_at is null;
  if v_owner is null then raise exception 'Durum yok'; end if;
  if not public.takip_icerik_gorunur_mu(v_uid, v_owner) then
    raise exception 'Durum yok';
  end if;

  select jsonb_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'media_type', s.media_type,
    'media_url', s.media_url,
    'caption', s.caption,
    'like_count', s.like_count,
    'comment_count', s.comment_count,
    'gift_count', coalesce(s.gift_count, 0),
    'view_count', coalesce(s.view_count, 0),
    'share_count', coalesce(s.share_count, 0),
    'post_kind', coalesce(s.post_kind, 'media'),
    'payload', coalesce(s.payload, '{}'::jsonb),
    'created_at', s.created_at,
    'display_name', coalesce(p.display_name, p.username, 'Kullanıcı'),
    'username', p.username,
    'avatar_url', p.avatar_url,
    'public_user_id', p.public_user_id,
    'is_verified', coalesce(p.is_verified, false),
    'liked_by_me', exists(
      select 1 from public.status_likes l
      where l.status_id = s.id and l.user_id = v_uid
    ),
    'is_mine', (s.user_id = v_uid)
  )
  into v_row
  from public.status_posts s
  join public.profiles p on p.id = s.user_id
  where s.id = p_status_id and s.deleted_at is null;

  if v_row is null then raise exception 'Durum yok'; end if;
  return v_row;
end;
$$;

create or replace function public.durum_yorumlari(p_status_id uuid, p_limit integer default 60)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at asc)
    from (
      select
        c.id,
        c.user_id,
        c.body,
        c.parent_id,
        c.media_url,
        c.like_count,
        c.created_at,
        coalesce(p.display_name, p.username, 'Kullanıcı') as display_name,
        p.username,
        p.avatar_url,
        p.public_user_id,
        coalesce(p.is_verified, false) as is_verified,
        (c.user_id = v_uid) as is_mine,
        exists (
          select 1 from public.status_comment_likes l
          where l.comment_id = c.id and l.user_id = v_uid
        ) as liked_by_me
      from public.status_comments c
      join public.profiles p on p.id = c.user_id
      where c.status_id = p_status_id and c.deleted_at is null
      order by c.created_at asc
      limit least(greatest(coalesce(p_limit, 60), 1), 200)
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.paylasilan_durumlari_onizle(p_status_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb := '{}'::jsonb;
  v_ids uuid[];
  v_id uuid;
  v_row record;
  v_item jsonb;
  v_avail text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_status_ids is null or cardinality(p_status_ids) = 0 then
    return v_out;
  end if;

  select array_agg(distinct x)
  into v_ids
  from unnest(p_status_ids) as t(x)
  where x is not null;

  if v_ids is null then
    return v_out;
  end if;

  foreach v_id in array v_ids
  loop
    select
      s.id,
      s.user_id,
      s.media_type,
      s.media_url,
      s.caption,
      s.post_kind,
      s.payload,
      s.deleted_at,
      s.removal_source,
      s.created_at,
      p.display_name,
      p.username,
      p.avatar_url,
      p.public_user_id,
      coalesce(p.is_verified, false) as is_verified,
      p.deleted_at as owner_deleted_at
    into v_row
    from public.status_posts s
    left join public.profiles p on p.id = s.user_id
    where s.id = v_id;

    if not found then
      v_item := jsonb_build_object(
        'status_id', v_id,
        'availability', 'NOT_AVAILABLE',
        'message', 'Bu gönderiye artık ulaşılamıyor.'
      );
    elsif v_row.deleted_at is not null then
      v_avail := case coalesce(v_row.removal_source, 'owner')
        when 'platform' then 'REMOVED_BY_PLATFORM'
        else 'DELETED_BY_OWNER'
      end;
      v_item := jsonb_build_object(
        'status_id', v_id,
        'availability', v_avail,
        'message', case v_avail
          when 'REMOVED_BY_PLATFORM'
            then 'Bu içerik platform tarafından kaldırıldı.'
          else 'Bu gönderi sahibi tarafından silindi.'
        end
      );
    elsif v_row.owner_deleted_at is not null then
      v_item := jsonb_build_object(
        'status_id', v_id,
        'availability', 'NOT_AVAILABLE',
        'message', 'Bu gönderiye artık ulaşılamıyor.'
      );
    elsif public.kullanicilar_engelli_mi(v_uid, v_row.user_id) then
      v_item := jsonb_build_object(
        'status_id', v_id,
        'availability', 'PERMISSION_DENIED',
        'message', 'Bu gönderiyi görüntüleyemezsiniz.'
      );
    elsif not public.takip_icerik_gorunur_mu(v_uid, v_row.user_id) then
      v_item := jsonb_build_object(
        'status_id', v_id,
        'availability', 'PERMISSION_DENIED',
        'message', 'Bu gönderiyi görüntüleyemezsiniz.'
      );
    else
      v_item := jsonb_build_object(
        'status_id', v_id,
        'availability', 'AVAILABLE',
        'user_id', v_row.user_id,
        'media_type', v_row.media_type,
        'media_url', coalesce(v_row.media_url, ''),
        'caption', v_row.caption,
        'post_kind', coalesce(v_row.post_kind, 'media'),
        'payload', coalesce(v_row.payload, '{}'::jsonb),
        'created_at', v_row.created_at,
        'display_name', coalesce(v_row.display_name, v_row.username, 'Kullanıcı'),
        'username', v_row.username,
        'avatar_url', v_row.avatar_url,
        'public_user_id', v_row.public_user_id,
        'is_verified', v_row.is_verified
      );
    end if;

    v_out := v_out || jsonb_build_object(v_id::text, v_item);
  end loop;

  return v_out;
end;
$$;
