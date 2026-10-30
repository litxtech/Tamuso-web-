

-- ---------------------------------------------------------------------------
-- Close friends
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_yakin_arkadas_ayarla(p_friend_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_count int := 0;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  delete from public.story_close_friends where owner_id = v_uid;

  if p_friend_ids is not null then
    foreach v_id in array p_friend_ids loop
      if v_id is null or v_id = v_uid then
        continue;
      end if;
      if not exists (select 1 from public.profiles where id = v_id) then
        continue;
      end if;
      if public.kullanicilar_engelli_mi(v_uid, v_id) then
        continue;
      end if;
      insert into public.story_close_friends (owner_id, friend_id)
      values (v_uid, v_id)
      on conflict do nothing;
      v_count := v_count + 1;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

grant execute on function public.hikaye_yakin_arkadas_ayarla(uuid[]) to authenticated;

create or replace function public.hikaye_yakin_arkadas_getir()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rows jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'user_id', cf.friend_id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'created_at', cf.created_at
    )
    order by p.display_name nulls last, p.username
  ), '[]'::jsonb)
  into v_rows
  from public.story_close_friends cf
  join public.profiles p on p.id = cf.friend_id
  where cf.owner_id = v_uid;

  return jsonb_build_object('ok', true, 'items', coalesce(v_rows, '[]'::jsonb));
end;
$$;

grant execute on function public.hikaye_yakin_arkadas_getir() to authenticated;

-- ---------------------------------------------------------------------------
-- hikaye_arsiv_listesi — own archived stories
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- hikaye_suresi_dolmuslari_arsivle + cron every 15m
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_suresi_dolmuslari_arsivle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  with updated as (
    update public.stories
    set status = 'archived',
        archived_at = coalesce(archived_at, now())
    where status = 'active'
      and expires_at <= now()
    returning id
  )
  select count(*)::int into v_count from updated;

  return jsonb_build_object('ok', true, 'archived_count', v_count);
end;
$$;

-- Callable by service_role / cron; also authenticated (no-op harm if user calls)
grant execute on function public.hikaye_suresi_dolmuslari_arsivle() to authenticated;
grant execute on function public.hikaye_suresi_dolmuslari_arsivle() to service_role;

do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception when others then
  raise notice 'pg_cron yok — edge cron kullanin';
end $$;

do $$
begin
  perform cron.unschedule('hikaye-suresi-dolmus-arsivle');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'hikaye-suresi-dolmus-arsivle',
    '*/15 * * * *',
    $cron$ select public.hikaye_suresi_dolmuslari_arsivle(); $cron$
  );
exception when others then
  raise notice 'pg_cron schedule basarisiz: %', SQLERRM;
end $$;
