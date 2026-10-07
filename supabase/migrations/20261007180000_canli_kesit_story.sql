-- Canlı kesit → mevcut hikaye tabloları. Yeni hikaye tablosu yok.
-- Arşiv cron'u (hikaye_suresi_dolmuslari_arsivle) aynı kalır; süresi dolan hikaye arşivlenir, dosyası durur.
-- Dosya silme: kullanıcı/admin silince veya hesap cascade silinince.

alter table public.story_items
  add column if not exists source_type text,
  add column if not exists source_live_id uuid,
  add column if not exists source_pk_id uuid,
  add column if not exists source_creator_id uuid,
  add column if not exists width int,
  add column if not exists height int,
  add column if not exists byte_size bigint;

do $$
declare
  cname text;
begin
  for cname in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.story_items'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
      and pg_get_constraintdef(con.oid) ilike '%active%'
  loop
    execute format('alter table public.story_items drop constraint %I', cname);
  end loop;
end $$;

alter table public.story_items
  drop constraint if exists story_items_status_chk;

alter table public.story_items
  add constraint story_items_status_chk
  check (status in ('active', 'deleted', 'hidden'));

alter table public.story_items
  drop constraint if exists story_items_source_type_chk;

alter table public.story_items
  add constraint story_items_source_type_chk
  check (source_type is null or source_type in ('live', 'pk', 'upload', 'photo', 'video'));

alter table public.story_items
  drop constraint if exists story_items_source_live_fk;

alter table public.story_items
  add constraint story_items_source_live_fk
  foreign key (source_live_id) references public.live_sessions(id) on delete set null;

alter table public.story_items
  drop constraint if exists story_items_source_pk_fk;

alter table public.story_items
  add constraint story_items_source_pk_fk
  foreign key (source_pk_id) references public.pk_matches(id) on delete set null;

create index if not exists story_items_source_live_idx
  on public.story_items (source_live_id)
  where source_live_id is not null;

create index if not exists story_items_source_pk_idx
  on public.story_items (source_pk_id)
  where source_pk_id is not null;

create index if not exists story_items_clip_created_idx
  on public.story_items (created_at desc)
  where source_type in ('live', 'pk');

create table if not exists public.live_clip_settings (
  id int primary key default 1,
  max_per_minute int not null default 3,
  max_bytes int not null default 18874368,
  constraint live_clip_settings_tek check (id = 1),
  constraint live_clip_settings_aralik check (max_per_minute between 1 and 30 and max_bytes between 1000000 and 50000000)
);

insert into public.live_clip_settings (id, max_per_minute, max_bytes)
values (1, 3, 18874368)
on conflict (id) do nothing;

alter table public.live_clip_settings enable row level security;

create table if not exists public.live_clip_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  live_session_id uuid references public.live_sessions(id) on delete set null,
  pk_match_id uuid references public.pk_matches(id) on delete set null,
  room_name text not null,
  duration_ms int not null,
  status text not null default 'recording',
  media_path text,
  media_url text,
  byte_size bigint,
  error_code text,
  host_label text,
  rival_label text,
  story_item_id uuid,
  created_at timestamptz not null default now(),
  constraint live_clip_requests_status_chk
    check (status in ('recording', 'ready', 'published', 'failed', 'cancelled')),
  constraint live_clip_requests_sure_chk
    check (duration_ms in (15000, 20000, 30000))
);

create index if not exists live_clip_requests_user_created_idx
  on public.live_clip_requests (user_id, created_at desc);

alter table public.live_clip_requests enable row level security;

drop policy if exists "Kesit isteklerini sahibi okur" on public.live_clip_requests;
create policy "Kesit isteklerini sahibi okur"
  on public.live_clip_requests for select to authenticated
  using (user_id = auth.uid());

insert into public.feature_flags (key, enabled, description)
values (
  'live_clip_story_enabled',
  true,
  'Yayin sahibi 15-30 sn kesit alip hikaye paylasabilir'
)
on conflict (key) do nothing;

create or replace function public.canli_kesit_ayar()
returns public.live_clip_settings
language sql
stable
security definer
set search_path = public
as $$
  select * from public.live_clip_settings where id = 1;
$$;

create or replace function public.canli_kesit_istek_ac(
  p_live_id uuid,
  p_pk_id uuid default null,
  p_saniye int default 30,
  p_host_ad text default null,
  p_rakip_ad text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_live public.live_sessions%rowtype;
  v_pk public.pk_matches%rowtype;
  v_guest boolean;
  v_ayar public.live_clip_settings%rowtype;
  v_adet int;
  v_id uuid;
  v_room text;
  v_ms int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.hikaye_aktif_mi() then raise exception 'Stories disabled'; end if;
  if not coalesce(public.ozellik_bayragi_aktif_mi('live_clip_story_enabled'), false) then
    raise exception 'Clip disabled';
  end if;
  if not coalesce(public.ozellik_bayragi_aktif_mi('story_creation_enabled'), false) then
    raise exception 'Story creation disabled';
  end if;
  if not coalesce(public.ozellik_bayragi_aktif_mi('story_video_enabled'), false) then
    raise exception 'Story video disabled';
  end if;

  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir hikaye paylasamaz'; end if;
  if public.kullanici_yaptirim_aktif_mi(v_uid, 'upload_ban') then
    raise exception 'Upload banned';
  end if;

  if p_saniye not in (15, 20, 30) then raise exception 'Invalid duration'; end if;
  v_ms := p_saniye * 1000;

  select * into v_live from public.live_sessions where id = p_live_id;
  if not found or v_live.host_id is distinct from v_uid then
    raise exception 'Not host';
  end if;
  if not coalesce(v_live.is_live, false) then
    raise exception 'Not found';
  end if;
  if lower(coalesce(v_live.mode, '')) in ('private', 'secret') then
    raise exception 'Private live';
  end if;

  if p_pk_id is not null then
    select * into v_pk from public.pk_matches where id = p_pk_id;
    if not found or v_pk.status is distinct from 'live' then
      raise exception 'PK mismatch';
    end if;
    if v_live.id is distinct from v_pk.live_a_id and v_live.id is distinct from v_pk.live_b_id then
      raise exception 'PK mismatch';
    end if;
  end if;

  select * into v_ayar from public.live_clip_settings where id = 1;
  select count(*)::int into v_adet
  from public.live_clip_requests
  where user_id = v_uid
    and created_at > now() - interval '1 minute'
    and status <> 'failed';
  if v_adet >= coalesce(v_ayar.max_per_minute, 3) then
    raise exception 'Rate limited';
  end if;

  v_room := nullif(trim(coalesce(v_live.livekit_room_name, '')), '');
  if v_room is null then
    v_room := 'live_' || v_live.id::text;
  end if;

  insert into public.live_clip_requests (
    user_id, live_session_id, pk_match_id, room_name, duration_ms,
    status, host_label, rival_label
  ) values (
    v_uid,
    v_live.id,
    p_pk_id,
    left(v_room, 128),
    v_ms,
    'recording',
    nullif(left(trim(coalesce(p_host_ad, '')), 80), ''),
    nullif(left(trim(coalesce(p_rakip_ad, '')), 80), '')
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'request_id', v_id,
    'duration_ms', v_ms,
    'max_bytes', coalesce(v_ayar.max_bytes, 18874368)
  );
end;
$$;

create or replace function public.canli_kesit_istek_kapat(
  p_id uuid,
  p_durum text,
  p_media_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.live_clip_requests%rowtype;
  v_path text;
  v_durum text := lower(trim(coalesce(p_durum, '')));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_durum not in ('failed', 'cancelled') then
    raise exception 'Invalid duration';
  end if;

  select * into v_req
  from public.live_clip_requests
  where id = p_id and user_id = v_uid
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_req.status = 'published' then
    return jsonb_build_object('ok', true, 'status', 'published');
  end if;

  v_path := coalesce(
    v_req.media_path,
    substring(coalesce(p_media_url, '') from 'story-media/([^?#]+)')
  );

  if v_durum = 'cancelled' and v_path is not null and split_part(v_path, '/', 1) = v_uid::text then
    delete from storage.objects
    where bucket_id = 'story-media' and name = v_path;
  end if;

  update public.live_clip_requests
  set status = v_durum,
      error_code = case when v_durum = 'failed' then coalesce(error_code, 'client') else error_code end
  where id = v_req.id;

  return jsonb_build_object('ok', true, 'status', v_durum);
end;
$$;

create or replace function public.hikaye_canli_kesit_yayinla(
  p_istek_id uuid,
  p_media_url text default null,
  p_caption text default null,
  p_width int default null,
  p_height int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.live_clip_requests%rowtype;
  v_ayar public.live_clip_settings%rowtype;
  v_url text;
  v_path text;
  v_meta jsonb;
  v_bytes bigint;
  v_mime text;
  v_attachment jsonb;
  v_created jsonb;
  v_item uuid;
  v_source text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_req
  from public.live_clip_requests
  where id = p_istek_id and user_id = v_uid
  for update;

  if not found then raise exception 'Not found'; end if;

  if v_req.status = 'published' and v_req.story_item_id is not null then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'item_id', v_req.story_item_id,
      'request_id', v_req.id
    );
  end if;

  if v_req.status not in ('recording', 'ready') then
    raise exception 'Not found';
  end if;

  v_url := coalesce(nullif(trim(coalesce(v_req.media_url, '')), ''), nullif(trim(coalesce(p_media_url, '')), ''));
  if v_url is null or not public.hikaye_url_guvenli_mi(v_url) then
    raise exception 'Unsafe url';
  end if;

  v_path := substring(v_url from 'story-media/([^?#]+)');
  if v_path is null or split_part(v_path, '/', 1) is distinct from v_uid::text then
    raise exception 'Unsafe url';
  end if;
  if v_path !~ '\.(mp4|webm)$' then
    raise exception 'Invalid mime';
  end if;

  select metadata into v_meta
  from storage.objects
  where bucket_id = 'story-media' and name = v_path
  limit 1;
  if v_meta is null then raise exception 'Medya gerekli'; end if;

  v_bytes := coalesce(
    nullif(v_meta->>'size', '')::bigint,
    nullif(v_meta->>'contentLength', '')::bigint,
    0
  );
  select * into v_ayar from public.live_clip_settings where id = 1;
  if v_bytes <= 0 or v_bytes > coalesce(v_ayar.max_bytes, 18874368) then
    raise exception 'File too large';
  end if;

  v_mime := lower(coalesce(v_meta->>'mimetype', v_meta->>'contentType', ''));
  if v_mime = '' then
    v_mime := case when v_path like '%.webm' then 'video/webm' else 'video/mp4' end;
  end if;
  if position('video/mp4' in v_mime) = 0
     and position('video/webm' in v_mime) = 0
     and position('video/quicktime' in v_mime) = 0 then
    raise exception 'Invalid mime';
  end if;

  v_source := case when v_req.pk_match_id is null then 'live' else 'pk' end;
  v_attachment := jsonb_build_object(
    'type', 'shared_live',
    'ref_id', v_req.live_session_id,
    'text', case when v_source = 'pk' then 'pk_clip' else 'live_clip' end,
    'source_type', v_source,
    'source_pk_id', v_req.pk_match_id,
    'host_name', v_req.host_label,
    'opponent_name', v_req.rival_label,
    'clip', true
  );

  v_created := public.hikaye_olustur(
    'video',
    left(v_url, 2000),
    null,
    v_req.duration_ms,
    '{"composition_version":1}'::jsonb,
    v_attachment,
    nullif(left(trim(coalesce(p_caption, '')), 300), ''),
    null,
    null,
    v_req.id::text
  );

  v_item := nullif(v_created->>'item_id', '')::uuid;
  if v_item is null then raise exception 'Story yayinlanamadi'; end if;

  update public.story_items
  set source_type = v_source,
      source_live_id = v_req.live_session_id,
      source_pk_id = v_req.pk_match_id,
      source_creator_id = v_uid,
      width = case when p_width is null or p_width <= 0 then null else least(p_width, 4320) end,
      height = case when p_height is null or p_height <= 0 then null else least(p_height, 4320) end,
      byte_size = v_bytes
  where id = v_item and owner_id = v_uid;

  update public.live_clip_requests
  set status = 'published',
      media_url = left(v_url, 2000),
      media_path = v_path,
      byte_size = v_bytes,
      story_item_id = v_item
  where id = v_req.id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', coalesce((v_created->>'idempotent')::boolean, false),
    'item_id', v_item,
    'story_id', v_created->>'story_id',
    'request_id', v_req.id,
    'expires_at', v_created->>'expires_at'
  );
end;
$$;

create or replace function public.canli_kesit_kaynak_durumu(
  p_live_id uuid default null,
  p_pk_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_live boolean := false;
  v_pk boolean := false;
  v_mode text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if p_live_id is not null then
    select coalesce(is_live, false), lower(coalesce(mode, ''))
      into v_live, v_mode
    from public.live_sessions
    where id = p_live_id;
    if v_mode in ('private', 'secret') then
      v_live := false;
    end if;
  end if;

  if p_pk_id is not null then
    select status = 'live' and (ends_at is null or ends_at > now())
      into v_pk
    from public.pk_matches
    where id = p_pk_id;
  end if;

  return jsonb_build_object(
    'live', coalesce(v_live, false),
    'pk', coalesce(v_pk, false)
  );
end;
$$;

create or replace function public.hikaye_kesit_depolama_sil()
returns trigger
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_url text;
  v_path text;
  v_owner uuid;
begin
  if tg_op = 'UPDATE' then
    if new.status is distinct from 'deleted' or old.status = 'deleted' then
      return new;
    end if;
    if old.source_type is null or old.source_type not in ('live', 'pk') then
      return new;
    end if;
    v_url := old.media_url;
    v_owner := old.owner_id;
  else
    if old.source_type is null or old.source_type not in ('live', 'pk') then
      return old;
    end if;
    v_url := old.media_url;
    v_owner := old.owner_id;
  end if;

  v_path := substring(coalesce(v_url, '') from 'story-media/([^?#]+)');
  if v_path is null or split_part(v_path, '/', 1) is distinct from v_owner::text then
    if tg_op = 'UPDATE' then return new; else return old; end if;
  end if;

  begin
    delete from storage.objects
    where bucket_id = 'story-media' and name = v_path;
  exception when others then
    raise notice 'kesit depolama silinemedi: %', sqlerrm;
  end;

  if tg_op = 'UPDATE' then return new; else return old; end if;
end;
$$;

drop trigger if exists hikaye_kesit_depolama_sil_trg on public.story_items;
create trigger hikaye_kesit_depolama_sil_trg
  before update or delete on public.story_items
  for each row
  execute function public.hikaye_kesit_depolama_sil();

create or replace function public.canli_kesit_takili_temizle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.live_clip_requests
  set status = 'failed', error_code = 'timeout'
  where status = 'recording'
    and created_at < now() - interval '5 minutes';
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'failed_count', v_count);
end;
$$;

create or replace function public.admin_kesit_yetkisi(p_moderate boolean default false)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and coalesce(p.is_admin, false)
  ) then
    return;
  end if;
  if p_moderate then
    if public.admin_has_permission('stories.moderate') then
      return;
    end if;
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if public.admin_has_permission('stories.view') then
    return;
  end if;
  raise exception 'Forbidden' using errcode = '42501';
end;
$$;

create or replace function public.admin_canli_kesit_ozet()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gun int;
  v_hafta int;
  v_sure bigint;
  v_bayt bigint;
  v_ort numeric;
  v_fail int;
  v_top int;
begin
  perform public.admin_kesit_yetkisi(false);

  select
    count(*) filter (where status = 'published' and created_at > now() - interval '1 day'),
    count(*) filter (where status = 'published' and created_at > now() - interval '7 days'),
    coalesce(sum(duration_ms) filter (where status = 'published'), 0),
    coalesce(sum(byte_size) filter (where status = 'published'), 0),
    coalesce(avg(byte_size) filter (where status = 'published' and byte_size > 0), 0),
    count(*) filter (where status = 'failed'),
    count(*)
  into v_gun, v_hafta, v_sure, v_bayt, v_ort, v_fail, v_top
  from public.live_clip_requests;

  return jsonb_build_object(
    'gunluk', v_gun,
    'haftalik', v_hafta,
    'toplam_sure_ms', v_sure,
    'toplam_bayt', v_bayt,
    'ortalama_bayt', round(v_ort),
    'basarisiz', v_fail,
    'toplam_istek', v_top,
    'basarisiz_oran', case when v_top = 0 then 0 else round((v_fail::numeric / v_top) * 100, 1) end
  );
end;
$$;

create or replace function public.admin_canli_kesit_liste(
  p_filtre text default 'tumu',
  p_limit int default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_filtre text := lower(trim(coalesce(p_filtre, 'tumu')));
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_rows jsonb;
begin
  perform public.admin_kesit_yetkisi(false);

  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select
      si.id,
      si.owner_id,
      p.username,
      p.display_name,
      si.source_type,
      si.source_live_id,
      si.source_pk_id,
      si.created_at,
      s.expires_at,
      s.status as story_status,
      si.byte_size,
      si.duration_ms,
      si.status,
      si.media_url,
      (
        select count(*)::int
        from public.user_reports r
        where r.content_type = 'story'
          and r.content_id = si.id::text
      ) as report_count
    from public.story_items si
    join public.stories s on s.id = si.story_id
    join public.profiles p on p.id = si.owner_id
    where si.source_type in ('live', 'pk')
      and (
        v_filtre = 'tumu'
        or (v_filtre = 'live' and si.source_type = 'live')
        or (v_filtre = 'pk' and si.source_type = 'pk')
        or (
          v_filtre = 'aktif'
          and si.status = 'active'
          and s.status = 'active'
          and s.expires_at > now()
        )
        or (
          v_filtre = 'suresi_dolmus'
          and (s.expires_at <= now() or s.status = 'archived')
        )
        or (
          v_filtre = 'raporlanan'
          and exists (
            select 1 from public.user_reports r
            where r.content_type = 'story' and r.content_id = si.id::text
          )
        )
      )
    order by si.created_at desc
    limit v_limit
  ) q;

  return jsonb_build_object('ok', true, 'rows', coalesce(v_rows, '[]'::jsonb));
end;
$$;

create or replace function public.admin_canli_kesit_moderasyon(
  p_item_id uuid,
  p_islem text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_islem text := lower(trim(coalesce(p_islem, '')));
  v_item public.story_items%rowtype;
begin
  perform public.admin_kesit_yetkisi(true);
  if v_islem not in ('gizle', 'sil', 'geri') then
    raise exception 'Invalid duration';
  end if;

  select * into v_item
  from public.story_items
  where id = p_item_id
    and source_type in ('live', 'pk')
  for update;

  if not found then raise exception 'Not found'; end if;

  if v_islem = 'gizle' then
    update public.story_items set status = 'hidden' where id = v_item.id;
  elsif v_islem = 'sil' then
    update public.story_items
    set status = 'deleted', deleted_at = coalesce(deleted_at, now())
    where id = v_item.id;
  elsif v_islem = 'geri' then
    if v_item.status = 'deleted' then
      raise exception 'Not found';
    end if;
    update public.story_items
    set status = 'active', deleted_at = null
    where id = v_item.id;
  end if;

  update public.stories
  set item_count = (
    select count(*)::int
    from public.story_items
    where story_id = v_item.story_id
      and status = 'active'
      and deleted_at is null
  )
  where id = v_item.story_id;

  return jsonb_build_object('ok', true, 'islem', v_islem, 'item_id', v_item.id);
end;
$$;

revoke all on function public.canli_kesit_ayar() from public;
revoke all on function public.canli_kesit_istek_ac(uuid, uuid, int, text, text) from public;
revoke all on function public.canli_kesit_istek_kapat(uuid, text, text) from public;
revoke all on function public.hikaye_canli_kesit_yayinla(uuid, text, text, int, int) from public;
revoke all on function public.canli_kesit_kaynak_durumu(uuid, uuid) from public;
revoke all on function public.canli_kesit_takili_temizle() from public;
revoke all on function public.admin_kesit_yetkisi(boolean) from public;
revoke all on function public.admin_canli_kesit_ozet() from public;
revoke all on function public.admin_canli_kesit_liste(text, int) from public;
revoke all on function public.admin_canli_kesit_moderasyon(uuid, text) from public;

grant execute on function public.canli_kesit_istek_ac(uuid, uuid, int, text, text) to authenticated;
grant execute on function public.canli_kesit_istek_kapat(uuid, text, text) to authenticated;
grant execute on function public.hikaye_canli_kesit_yayinla(uuid, text, text, int, int) to authenticated;
grant execute on function public.canli_kesit_kaynak_durumu(uuid, uuid) to authenticated;
grant execute on function public.admin_canli_kesit_ozet() to authenticated;
grant execute on function public.admin_canli_kesit_liste(text, int) to authenticated;
grant execute on function public.admin_canli_kesit_moderasyon(uuid, text) to authenticated;
grant execute on function public.canli_kesit_takili_temizle() to service_role;

do $$
begin
  perform cron.unschedule('canli-kesit-takili-temizle');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'canli-kesit-takili-temizle',
    '*/15 * * * *',
    $cron$ select public.canli_kesit_takili_temizle(); $cron$
  );
exception when others then
  raise notice 'pg_cron schedule basarisiz: %', SQLERRM;
end $$;
