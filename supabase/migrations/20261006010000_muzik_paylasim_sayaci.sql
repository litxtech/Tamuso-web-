-- Müzik paylaşım sayacı: her hesap × parça bir kez (hikaye / durum / DM)

create table if not exists public.music_share_users (
  track_id uuid not null references public.music_tracks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  first_source text not null default 'unknown'
    check (first_source in ('story', 'status', 'dm', 'unknown')),
  first_shared_at timestamptz not null default now(),
  primary key (track_id, user_id)
);

create index if not exists music_share_users_user_idx
  on public.music_share_users (user_id, first_shared_at desc);

create index if not exists music_share_users_track_idx
  on public.music_share_users (track_id, first_shared_at desc);

alter table public.music_share_users enable row level security;

drop policy if exists "music_share_users_select" on public.music_share_users;
create policy "music_share_users_select"
  on public.music_share_users for select to authenticated
  using (true);

grant select on public.music_share_users to authenticated;

-- ---------------------------------------------------------------------------
-- Kaydet: aynı (track, user) tekrar insert edilmez
-- ---------------------------------------------------------------------------
create or replace function public.muzik_paylasim_kaydet(
  p_track_id uuid,
  p_user_id uuid,
  p_source text default 'unknown'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src text := lower(trim(coalesce(p_source, 'unknown')));
begin
  if p_track_id is null or p_user_id is null then
    return;
  end if;
  if v_src not in ('story', 'status', 'dm', 'unknown') then
    v_src := 'unknown';
  end if;

  insert into public.music_share_users (track_id, user_id, first_source)
  values (p_track_id, p_user_id, v_src)
  on conflict (track_id, user_id) do nothing;
end;
$$;

revoke all on function public.muzik_paylasim_kaydet(uuid, uuid, text) from public;
grant execute on function public.muzik_paylasim_kaydet(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Özet: benzersiz hesap sayısı + oluşturucu adı
-- ---------------------------------------------------------------------------
create or replace function public.hikaye_muzik_paylasim_ozeti(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_count bigint := 0;
  v_title text;
  v_creator text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'hata', 'Not authenticated');
  end if;
  if p_track_id is null then
    return jsonb_build_object('ok', false, 'hata', 'track_id required');
  end if;

  select count(*)::bigint into v_count
  from public.music_share_users
  where track_id = p_track_id;

  select
    t.title,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.username), ''),
      nullif(trim(pass.creator_public_handle_snapshot), '')
    )
  into v_title, v_creator
  from public.music_tracks t
  left join public.profiles p on p.id = t.owner_user_id
  left join public.music_passports pass on pass.track_id = t.id
  where t.id = p_track_id;

  return jsonb_build_object(
    'ok', true,
    'track_id', p_track_id,
    'share_count', coalesce(v_count, 0),
    'title', v_title,
    'creator_name', v_creator
  );
end;
$$;

grant execute on function public.hikaye_muzik_paylasim_ozeti(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.trg_story_item_muzik_paylasim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track uuid;
begin
  if new.attachment is not null
     and (new.attachment->>'type') = 'music'
     and nullif(trim(coalesce(new.attachment->>'ref_id', '')), '') is not null then
    begin
      v_track := (new.attachment->>'ref_id')::uuid;
    exception when others then
      v_track := null;
    end;
  end if;

  if v_track is null and new.composition is not null then
    begin
      select (o->>'ref_id')::uuid into v_track
      from jsonb_array_elements(coalesce(new.composition->'overlays', '[]'::jsonb)) o
      where (o->>'type') = 'music'
        and nullif(trim(coalesce(o->>'ref_id', '')), '') is not null
      limit 1;
    exception when others then
      v_track := null;
    end;
  end if;

  if v_track is not null then
    perform public.muzik_paylasim_kaydet(v_track, new.owner_id, 'story');
  end if;
  return new;
end;
$$;

drop trigger if exists story_item_muzik_paylasim_trg on public.story_items;
create trigger story_item_muzik_paylasim_trg
  after insert on public.story_items
  for each row
  execute function public.trg_story_item_muzik_paylasim();

create or replace function public.trg_status_muzik_paylasim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_track uuid;
begin
  if new.post_kind = 'music'
     and nullif(trim(coalesce(new.payload->>'track_id', '')), '') is not null then
    begin
      v_track := (new.payload->>'track_id')::uuid;
    exception when others then
      v_track := null;
    end;
    if v_track is not null then
      perform public.muzik_paylasim_kaydet(v_track, new.user_id, 'status');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists status_muzik_paylasim_trg on public.status_posts;
create trigger status_muzik_paylasim_trg
  after insert on public.status_posts
  for each row
  execute function public.trg_status_muzik_paylasim();

create or replace function public.trg_dm_muzik_paylasim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.music_track_id is not null then
    perform public.muzik_paylasim_kaydet(new.music_track_id, new.sender_id, 'dm');
  end if;
  return new;
end;
$$;

drop trigger if exists dm_muzik_paylasim_trg on public.direct_messages;
create trigger dm_muzik_paylasim_trg
  after insert on public.direct_messages
  for each row
  execute function public.trg_dm_muzik_paylasim();

-- ---------------------------------------------------------------------------
-- Backfill (unique users)
-- ---------------------------------------------------------------------------
insert into public.music_share_users (track_id, user_id, first_source, first_shared_at)
select distinct on (track_id, user_id) track_id, user_id, source, shared_at
from (
  -- hikaye: attachment
  select
    (si.attachment->>'ref_id')::uuid as track_id,
    si.owner_id as user_id,
    'story'::text as source,
    si.created_at as shared_at
  from public.story_items si
  where si.deleted_at is null
    and si.attachment is not null
    and (si.attachment->>'type') = 'music'
    and nullif(trim(coalesce(si.attachment->>'ref_id', '')), '') is not null

  union all

  -- hikaye: composition overlays
  select
    (o->>'ref_id')::uuid as track_id,
    si.owner_id as user_id,
    'story'::text as source,
    si.created_at as shared_at
  from public.story_items si
  cross join lateral jsonb_array_elements(coalesce(si.composition->'overlays', '[]'::jsonb)) o
  where si.deleted_at is null
    and (o->>'type') = 'music'
    and nullif(trim(coalesce(o->>'ref_id', '')), '') is not null

  union all

  -- durum
  select
    (sp.payload->>'track_id')::uuid as track_id,
    sp.user_id as user_id,
    'status'::text as source,
    sp.created_at as shared_at
  from public.status_posts sp
  where sp.deleted_at is null
    and sp.post_kind = 'music'
    and nullif(trim(coalesce(sp.payload->>'track_id', '')), '') is not null

  union all

  -- DM
  select
    dm.music_track_id as track_id,
    dm.sender_id as user_id,
    'dm'::text as source,
    dm.created_at as shared_at
  from public.direct_messages dm
  where dm.music_track_id is not null
) s
where s.track_id is not null
  and exists (select 1 from public.music_tracks mt where mt.id = s.track_id)
order by track_id, user_id, shared_at asc
on conflict (track_id, user_id) do nothing;
