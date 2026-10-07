-- Public içerik SEO. Uygulama gizliliği ve status_posts akışı durur.
-- Anon yalnızca security definer okuma fonksiyonundan, sanitize edilmiş alanları görür.

alter table public.user_privacy_settings
  add column if not exists search_profile_visible boolean,
  add column if not exists search_posts_visible boolean;

comment on column public.user_privacy_settings.search_profile_visible is
  'null: herkese açık hesapta profile arama izni açık sayılır. false: profil noindex.';
comment on column public.user_privacy_settings.search_posts_visible is
  'null: herkese açık paylaşım arama izni açık sayılır. false: paylaşım noindex.';

create table if not exists public.content_seo (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('post', 'profile', 'city', 'topic')),
  content_id uuid not null,
  slug text not null,
  short_id text,
  language text not null default 'tr',
  auto_title text,
  manual_title text,
  auto_description text,
  manual_description text,
  canonical_path text,
  og_image text,
  alt_text text,
  is_seo_eligible boolean not null default false,
  is_indexable boolean not null default false,
  index_reason text not null default 'pending',
  quality_score integer not null default 0,
  tier smallint not null default 3 check (tier in (1, 2, 3)),
  manual_index text check (manual_index in ('index', 'noindex', 'hide')),
  slug_locked boolean not null default false,
  sitemap_blocked boolean not null default false,
  city_id uuid,
  signals jsonb not null default '[]'::jsonb,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_type, content_id),
  unique (content_type, slug)
);

create index if not exists content_seo_indexable_idx
  on public.content_seo (content_type, updated_at desc)
  where is_indexable and removed_at is null and sitemap_blocked = false;

create index if not exists content_seo_city_idx
  on public.content_seo (city_id, updated_at desc)
  where content_type = 'post' and tier < 3;

create table if not exists public.seo_redirects (
  id uuid primary key default gen_random_uuid(),
  old_path text not null unique,
  new_path text not null,
  status_code integer not null default 301 check (status_code in (301, 302)),
  created_at timestamptz not null default now(),
  check (old_path <> new_path),
  check (old_path ~ '^/'),
  check (new_path ~ '^/')
);

create table if not exists public.seo_topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  language text not null default 'tr',
  is_indexable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.seo_topic_posts (
  topic_id uuid not null references public.seo_topics(id) on delete cascade,
  post_id uuid not null references public.status_posts(id) on delete cascade,
  primary key (topic_id, post_id)
);

create table if not exists public.seo_post_tags (
  post_id uuid not null references public.status_posts(id) on delete cascade,
  tag text not null,
  primary key (post_id, tag),
  check (tag ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index if not exists seo_post_tags_tag_idx on public.seo_post_tags (tag);

create table if not exists public.seo_attributions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  content_type text,
  content_id text,
  path text,
  city_slug text,
  topic_slug text,
  created_at timestamptz not null default now()
);

alter table public.content_seo enable row level security;
alter table public.seo_redirects enable row level security;
alter table public.seo_topics enable row level security;
alter table public.seo_topic_posts enable row level security;
alter table public.seo_post_tags enable row level security;
alter table public.seo_attributions enable row level security;

create or replace function public.seo_slug_yap(p_metin text)
returns text
language plpgsql
immutable
as $$
declare
  s text := coalesce(p_metin, '');
begin
  s := replace(s, 'İ', 'i');
  s := replace(s, 'I', 'i');
  s := lower(s);
  s := translate(s, 'çğıöşüâîû', 'cgiosuaiu');
  s := regexp_replace(s, '[''’`‘]', '', 'g');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '-{2,}', '-', 'g');
  s := trim(both '-' from s);
  s := left(s, 60);
  s := regexp_replace(s, '-+$', '');
  return s;
end;
$$;

create or replace function public.seo_metin_temiz(p_metin text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(replace(replace(coalesce(p_metin, ''), 'İ', 'i'), 'I', 'i'), '<[^>]*>', ' ', 'g'),
      '#[A-Za-z0-9_çğıöşüâîûÇĞÖŞÜ]+', ' ', 'g'),
    '[^a-zA-Z0-9çğıöşüâîûÇĞÖŞÜ\s]', ' ', 'g'));
$$;

create or replace function public.seo_yonlendir_yaz(p_eski text, p_yeni text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_eski is null or p_yeni is null or p_eski = p_yeni then return; end if;
  if p_eski !~ '^/' or p_yeni !~ '^/' then return; end if;
  update public.seo_redirects set new_path = p_yeni where new_path = p_eski and old_path <> p_yeni;
  insert into public.seo_redirects (old_path, new_path)
  values (p_eski, p_yeni)
  on conflict (old_path) do update set new_path = excluded.new_path
  where public.seo_redirects.new_path is distinct from excluded.new_path
    and excluded.new_path <> public.seo_redirects.old_path;
  delete from public.seo_redirects where old_path = new_path;
end;
$$;

create or replace function public.seo_gonderi_yenile(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.status_posts%rowtype;
  v_profil public.profiles%rowtype;
  v_gizli boolean := false;
  v_hide boolean := false;
  v_arama boolean := true;
  v_sehir uuid;
  v_sehir_ad text;
  v_temiz text;
  v_kelime int := 0;
  v_score int := 0;
  v_tier smallint := 3;
  v_index boolean := false;
  v_neden text := 'PENDING';
  v_public boolean := false;
  v_sensitive boolean := false;
  v_spam boolean := false;
  v_burst boolean := false;
  v_dup boolean := false;
  v_report_open boolean := false;
  v_manual text;
  v_manual_title text;
  v_manual_desc text;
  v_canonical text;
  v_og text;
  v_alt text;
  v_blocked boolean := false;
  v_kilit boolean := false;
  v_slug text;
  v_short text;
  v_eski text;
  v_baslik text;
  v_h1 text;
  v_aciklama text;
  v_dil text := 'tr';
  v_medya boolean := false;
  v_konu boolean := false;
  v_kisa boolean := false;
begin
  select * into v_post from public.status_posts where id = p_id;
  if not found then
    update public.content_seo set tier = 3, is_indexable = false, index_reason = 'DELETED', removed_at = now(), updated_at = now()
    where content_type = 'post' and content_id = p_id;
    return;
  end if;

  select * into v_profil from public.profiles where id = v_post.user_id;
  v_gizli := public.gizli_hesap_mi(v_post.user_id);
  select
    coalesce(hide_status_posts, false),
    coalesce(search_posts_visible, true)
  into v_hide, v_arama
  from public.user_privacy_settings where user_id = v_post.user_id;
  v_hide := coalesce(v_hide, false);
  v_arama := coalesce(v_arama, true);

  select manual_index, manual_title, manual_description, canonical_path, og_image, alt_text, sitemap_blocked, slug, slug_locked
  into v_manual, v_manual_title, v_manual_desc, v_canonical, v_og, v_alt, v_blocked, v_eski, v_kilit
  from public.content_seo where content_type = 'post' and content_id = p_id;

  v_sehir := v_profil.primary_city_id;
  if v_sehir is not null then
    select name into v_sehir_ad from public.geo_cities where id = v_sehir and is_active;
    if v_sehir_ad is null then v_sehir := null; end if;
  end if;

  v_temiz := public.seo_metin_temiz(v_post.caption);
  if length(trim(v_temiz)) = 0 then
    v_kelime := 0;
  else
    v_kelime := array_length(regexp_split_to_array(trim(v_temiz), '\s+'), 1);
  end if;
  v_kisa := length(trim(v_temiz)) < 40 or v_kelime < 8
    or lower(trim(v_temiz)) in ('hi','hello','hey','selam','slm','merhaba','gunaydin','good morning','follow me','like my profile','takip et');

  v_public := v_post.deleted_at is null
    and coalesce(v_post.removal_source, '') = ''
    and v_profil.id is not null
    and v_profil.deleted_at is null
    and v_profil.banned_at is null
    and coalesce(v_profil.account_status, 'active') = 'active'
    and coalesce(v_profil.is_guest, false) = false
    and coalesce(v_profil.is_sample, false) = false
    and not v_gizli
    and not v_hide
    and v_post.post_kind is distinct from 'agency_invite';

  v_sensitive := exists (
    select 1 from public.moderation_terms t
    where t.is_active and t.action = 'BLOCK' and char_length(t.term) >= 3
      and position(lower(t.term) in lower(coalesce(v_post.caption, ''))) > 0
  );
  v_dup := exists (
    select 1 from public.status_posts d
    where d.user_id = v_post.user_id and d.id <> v_post.id and d.deleted_at is null
      and d.caption = v_post.caption and d.created_at > now() - interval '7 days'
      and char_length(coalesce(d.caption, '')) > 0
  );
  select count(*) > 8 into v_burst from public.status_posts b
  where b.user_id = v_post.user_id and b.deleted_at is null and b.created_at > now() - interval '1 hour';
  v_spam := v_dup or v_burst or (length(coalesce(v_post.caption, '')) - length(replace(coalesce(v_post.caption, ''), 'http', ''))) / 4 >= 3;
  v_report_open := exists (
    select 1 from public.user_reports r where r.content_id = v_post.id and r.status = 'open'
  );
  v_medya := v_post.media_type in ('image', 'video') and coalesce(v_post.media_url, '') ~ '^https://';
  v_konu := coalesce(v_post.caption, '') ~ '#[A-Za-z0-9_çğıöşüâîûÇĞÖŞÜıİ]+'
    or exists (select 1 from public.seo_topic_posts tp where tp.post_id = v_post.id);

  if v_post.deleted_at is not null or coalesce(v_post.removal_source, '') <> '' then v_neden := 'DELETED';
  elsif not v_public and v_gizli then v_neden := 'FOLLOWERS_ONLY';
  elsif not v_public then v_neden := 'PRIVATE';
  elsif v_sensitive then v_neden := 'SENSITIVE_CONTENT';
  elsif v_spam then v_neden := 'SPAM';
  elsif v_report_open then v_neden := 'REPORTED_PENDING';
  elsif not v_arama then v_neden := 'SEARCH_OFF';
  elsif v_kisa or length(trim(coalesce(v_post.caption, ''))) = 0 then v_neden := 'LOW_QUALITY';
  else v_neden := 'REVIEW';
  end if;

  if v_public and not v_sensitive then v_score := v_score + 20; end if;
  if v_post.deleted_at is null and not v_sensitive and not v_report_open then v_score := v_score + 20; end if;
  if not v_dup and length(trim(v_temiz)) >= 40 then v_score := v_score + 15; end if;
  if not v_kisa then v_score := v_score + 10; end if;
  if v_medya then v_score := v_score + 5; end if;
  if v_sehir is not null then v_score := v_score + 5; end if;
  if v_konu then v_score := v_score + 5; end if;
  if v_public then v_score := v_score + 5; end if;
  if not v_spam then v_score := v_score + 10; end if;

  if not v_public or v_sensitive or v_spam or v_post.deleted_at is not null then
    v_tier := 3; v_index := false;
  elsif v_manual = 'hide' then
    v_tier := 3; v_index := false; v_neden := 'MANUAL_HIDE';
  elsif v_manual = 'noindex' or not v_arama or v_kisa or v_report_open or v_score < 80 then
    v_tier := 2; v_index := false;
    if v_score < 80 and v_neden = 'REVIEW' then v_neden := 'BELOW_THRESHOLD'; end if;
  else
    v_tier := 1; v_index := true; v_neden := 'INDEXABLE';
  end if;
  if v_manual = 'index' and v_public and not v_sensitive and not v_spam and v_post.deleted_at is null and v_manual is distinct from 'hide' then
    v_tier := 1; v_index := true; v_neden := 'MANUAL_INDEX';
  end if;
  if v_manual = 'hide' then
    v_tier := 3; v_index := false; v_neden := 'MANUAL_HIDE';
  end if;

  v_short := left(replace(v_post.id::text, '-', ''), 6);
  if coalesce(v_kilit, false) and v_eski is not null then
    v_slug := v_eski;
  else
    v_h1 := left(trim(split_part(regexp_replace(coalesce(v_post.caption, ''), '\s+', ' ', 'g'), '.', 1)), 80);
    v_slug := public.seo_slug_yap(v_h1);
    v_slug := trim(both '-' from coalesce(nullif(v_slug, ''), 'paylasim')) || '-' || v_short;
    if exists (select 1 from public.content_seo c where c.content_type = 'post' and c.slug = v_slug and c.content_id <> p_id) then
      v_slug := trim(both '-' from coalesce(nullif(public.seo_slug_yap(v_h1), ''), 'paylasim')) || '-' || left(replace(v_post.id::text, '-', ''), 10);
    end if;
  end if;

  v_h1 := coalesce(nullif(trim(v_manual_title), ''), left(trim(split_part(coalesce(v_post.caption, ''), '.', 1)), 52));
  if length(trim(coalesce(v_h1, ''))) = 0 then v_h1 := 'Paylaşım'; end if;
  v_baslik := case when v_manual_title is not null and length(trim(v_manual_title)) > 0 then left(trim(v_manual_title), 70) else left(v_h1, 48) || ' | Tamuso' end;
  v_aciklama := coalesce(nullif(trim(v_manual_desc), ''), left(trim(coalesce(v_post.caption, '')), 160));
  if length(trim(coalesce(v_aciklama, ''))) = 0 then v_aciklama := 'Tamuso üzerindeki herkese açık bir paylaşım.'; end if;
  if coalesce(v_post.caption, '') ~ '[çğıöşüÇĞİÖŞÜ]' then v_dil := 'tr';
  elsif coalesce(v_profil.language, 'tr') in ('tr','en','de','es','fr','ar','ru') then v_dil := v_profil.language;
  else v_dil := 'tr';
  end if;

  if v_eski is not null and v_eski is distinct from v_slug then
    perform public.seo_yonlendir_yaz('/p/' || v_eski, '/p/' || v_slug);
  end if;

  insert into public.content_seo (
    content_type, content_id, slug, short_id, language, auto_title, manual_title,
    auto_description, manual_description, canonical_path, og_image, alt_text,
    is_seo_eligible, is_indexable, index_reason, quality_score, tier, manual_index,
    sitemap_blocked, city_id, signals, removed_at, updated_at
  ) values (
    'post', p_id, v_slug, v_short, v_dil, v_baslik, v_manual_title,
    v_aciklama, v_manual_desc, coalesce(v_canonical, '/p/' || v_slug), v_og, v_alt,
    v_tier = 1, v_index, v_neden, v_score, v_tier, v_manual,
    coalesce(v_blocked, false), v_sehir,
    jsonb_build_array(
      jsonb_build_object('ad', 'Public', 'tamam', v_public),
      jsonb_build_object('ad', 'Moderated', 'tamam', v_post.deleted_at is null and not v_sensitive),
      jsonb_build_object('ad', 'Unique content', 'tamam', not v_dup and length(trim(v_temiz)) >= 40),
      jsonb_build_object('ad', 'Meaningful text', 'tamam', not v_kisa),
      jsonb_build_object('ad', 'Has image', 'tamam', v_medya),
      jsonb_build_object('ad', 'City assigned', 'tamam', v_sehir is not null),
      jsonb_build_object('ad', 'Topic assigned', 'tamam', v_konu),
      jsonb_build_object('ad', 'Author public', 'tamam', v_public),
      jsonb_build_object('ad', 'Canonical', 'tamam', true),
      jsonb_build_object('ad', 'Indexable', 'tamam', v_index)
    ),
    case when v_tier = 3 then coalesce((select removed_at from public.content_seo where content_type = 'post' and content_id = p_id), now()) else null end,
    now()
  )
  on conflict (content_type, content_id) do update set
    slug = excluded.slug,
    short_id = excluded.short_id,
    language = excluded.language,
    auto_title = excluded.auto_title,
    auto_description = excluded.auto_description,
    canonical_path = case
      when public.content_seo.canonical_path = '/p/' || public.content_seo.slug then '/p/' || excluded.slug
      else coalesce(public.content_seo.canonical_path, '/p/' || excluded.slug)
    end,
    is_seo_eligible = excluded.is_seo_eligible,
    is_indexable = excluded.is_indexable,
    index_reason = excluded.index_reason,
    quality_score = excluded.quality_score,
    tier = excluded.tier,
    city_id = excluded.city_id,
    signals = excluded.signals,
    removed_at = excluded.removed_at,
    updated_at = now();

  delete from public.seo_post_tags where post_id = p_id;
  if v_tier < 3 then
    insert into public.seo_post_tags (post_id, tag)
    select p_id, public.seo_slug_yap(m[1])
    from regexp_matches(coalesce(v_post.caption, ''), '#([A-Za-z0-9_çğıöşüâîûÇĞÖŞÜıİ]+)', 'g') as m
    where length(public.seo_slug_yap(m[1])) between 2 and 40
    on conflict do nothing;
    insert into public.seo_topic_posts (topic_id, post_id)
    select t.id, p_id from public.seo_topics t
    join public.seo_post_tags g on g.tag = t.slug and g.post_id = p_id
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.seo_profil_yenile(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.profiles%rowtype;
  v_gizli boolean;
  v_arama boolean := true;
  v_slug text;
  v_tier smallint := 3;
  v_index boolean := false;
  v_neden text := 'PRIVATE';
  v_score int := 0;
  v_sehir text;
  v_sehir_slug text;
  v_acik boolean := false;
  v_post int := 0;
begin
  select * into v_p from public.profiles where id = p_user;
  if not found then return; end if;
  v_gizli := public.gizli_hesap_mi(p_user);
  select coalesce(search_profile_visible, true) into v_arama
  from public.user_privacy_settings where user_id = p_user;
  v_arama := coalesce(v_arama, true);
  v_slug := lower(coalesce(v_p.username, ''));
  v_acik := v_p.deleted_at is null and v_p.banned_at is null
    and coalesce(v_p.account_status, 'active') = 'active'
    and coalesce(v_p.is_guest, false) = false
    and coalesce(v_p.is_sample, false) = false
    and not v_gizli
    and v_slug ~ '^[a-z0-9][a-z0-9._]{1,30}$';
  select count(*) into v_post from public.content_seo
  where content_type = 'post' and is_indexable and city_id is not null and content_id in (
    select id from public.status_posts where user_id = p_user and deleted_at is null
  );
  select count(*) into v_post from public.content_seo c
  join public.status_posts s on s.id = c.content_id
  where c.content_type = 'post' and c.is_indexable and s.user_id = p_user;
  if v_p.primary_city_id is not null then
    select name, slug into v_sehir, v_sehir_slug from public.geo_cities
    where id = v_p.primary_city_id and is_active;
  end if;
  if v_acik then v_score := v_score + 40; end if;
  if length(trim(coalesce(v_p.bio, ''))) >= 40 then v_score := v_score + 20; end if;
  if v_sehir is not null then v_score := v_score + 10; end if;
  if v_post > 0 then v_score := v_score + 20; end if;
  if v_arama then v_score := v_score + 10; end if;
  if not v_acik then
    v_tier := 3; v_index := false; v_neden := case when v_gizli then 'FOLLOWERS_ONLY' else 'PRIVATE' end;
  elsif not v_arama then
    v_tier := 2; v_index := false; v_neden := 'SEARCH_OFF';
  elsif v_score >= 80 then
    v_tier := 1; v_index := true; v_neden := 'INDEXABLE';
  else
    v_tier := 2; v_index := false; v_neden := 'LOW_QUALITY';
  end if;
  if not v_acik then
    update public.content_seo
      set tier = 3, is_indexable = false, is_seo_eligible = false, index_reason = v_neden,
          removed_at = now(), updated_at = now()
      where content_type = 'profile' and content_id = p_user;
    return;
  end if;
  insert into public.content_seo (
    content_type, content_id, slug, language, auto_title, auto_description,
    canonical_path, is_seo_eligible, is_indexable, index_reason, quality_score, tier,
    city_id, signals, removed_at, updated_at
  ) values (
    'profile', p_user, v_slug, coalesce(nullif(v_p.language, ''), 'tr'),
    left(coalesce(v_p.display_name, v_slug), 40) || case when v_sehir is not null then ' | ' || left(v_sehir, 24) else '' end || ' | Tamuso',
    left(coalesce(nullif(trim(v_p.bio), ''), coalesce(v_p.display_name, v_slug) || ' Tamuso profili'), 160),
    '/u/' || v_slug, v_tier = 1, v_index, v_neden, v_score, v_tier, v_p.primary_city_id,
    '[]'::jsonb, case when v_tier = 3 then now() else null end, now()
  )
  on conflict (content_type, content_id) do update set
    slug = excluded.slug,
    auto_title = excluded.auto_title,
    auto_description = excluded.auto_description,
    canonical_path = excluded.canonical_path,
    is_seo_eligible = excluded.is_seo_eligible,
    is_indexable = excluded.is_indexable,
    index_reason = excluded.index_reason,
    quality_score = excluded.quality_score,
    tier = excluded.tier,
    city_id = excluded.city_id,
    removed_at = excluded.removed_at,
    updated_at = now();
end;
$$;

create or replace function public.seo_kullanici_yenile(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in select id from public.status_posts where user_id = p_user loop
    perform public.seo_gonderi_yenile(r.id);
  end loop;
  perform public.seo_profil_yenile(p_user);
exception when others then
  raise warning 'seo_kullanici_yenile %', sqlerrm;
end;
$$;

create or replace function public.seo_gonderi_tetik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seo_gonderi_yenile(coalesce(new.id, old.id));
  return coalesce(new, old);
exception when others then
  raise warning 'seo_gonderi_tetik %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop trigger if exists seo_gonderi_tetik on public.status_posts;
create trigger seo_gonderi_tetik
  after insert or update or delete on public.status_posts
  for each row execute function public.seo_gonderi_tetik();

create or replace function public.seo_gizlilik_tetik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seo_kullanici_yenile(new.user_id);
  return new;
exception when others then
  raise warning 'seo_gizlilik_tetik %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists seo_gizlilik_tetik on public.user_privacy_settings;
create trigger seo_gizlilik_tetik
  after insert or update of is_private, hide_status_posts, search_profile_visible, search_posts_visible
  on public.user_privacy_settings
  for each row execute function public.seo_gizlilik_tetik();

create or replace function public.seo_profil_tetik()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.banned_at is not distinct from old.banned_at
     and new.deleted_at is not distinct from old.deleted_at
     and new.account_status is not distinct from old.account_status
     and new.username is not distinct from old.username
     and new.display_name is not distinct from old.display_name
     and new.bio is not distinct from old.bio
     and new.primary_city_id is not distinct from old.primary_city_id
     and new.is_guest is not distinct from old.is_guest
     and new.is_sample is not distinct from old.is_sample then
    return new;
  end if;
  perform public.seo_kullanici_yenile(new.id);
  return new;
exception when others then
  raise warning 'seo_profil_tetik %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists seo_profil_tetik on public.profiles;
create trigger seo_profil_tetik
  after update on public.profiles
  for each row execute function public.seo_profil_tetik();

create or replace function public.gizli_hesap_ayarla(p_is_private boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthenticated');
  end if;
  insert into public.user_privacy_settings (user_id, is_private, search_profile_visible, search_posts_visible)
  values (
    v_uid,
    coalesce(p_is_private, false),
    case when coalesce(p_is_private, false) then false else null end,
    case when coalesce(p_is_private, false) then false else null end
  )
  on conflict (user_id) do update
    set is_private = excluded.is_private,
        search_profile_visible = case when excluded.is_private then false else public.user_privacy_settings.search_profile_visible end,
        search_posts_visible = case when excluded.is_private then false else public.user_privacy_settings.search_posts_visible end,
        updated_at = now();
  return jsonb_build_object('ok', true, 'is_private', coalesce(p_is_private, false));
end;
$$;

create or replace function public.seo_admin_mi()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ben_admin_miyim()
    or public.admin_has_permission('content.seo.view')
    or public.admin_has_permission('content.seo.manage');
$$;

create or replace function public.seo_public_oku(p_tur text, p_slug text default '', p_sayfa integer default 1)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_slug text := lower(coalesce(p_slug, ''));
  v_sayfa int := greatest(1, least(coalesce(p_sayfa, 1), 20));
  v_row public.content_seo%rowtype;
  v_post public.status_posts%rowtype;
  v_profil public.profiles%rowtype;
  v_hedef text;
  v_adet int;
  v_yazar int;
  v_sehir record;
  v_bas int;
begin
  select new_path into v_hedef from public.seo_redirects
  where old_path = case p_tur
    when 'post' then '/p/' || v_slug
    when 'profile' then '/u/' || v_slug
    else '' end
  limit 1;
  if v_hedef is not null then
    return jsonb_build_object('durum', 'yonlendir', 'http', 301, 'hedef', v_hedef);
  end if;

  if p_tur = 'post' then
    if v_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select slug into v_slug from public.content_seo
      where content_type = 'post' and content_id = v_slug::uuid;
      if v_slug is not null then
        return jsonb_build_object('durum', 'yonlendir', 'http', 301, 'hedef', '/p/' || v_slug);
      end if;
    end if;
    if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    select * into v_row from public.content_seo where content_type = 'post' and slug = v_slug;
    if not found or v_row.tier = 3 then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    select * into v_post from public.status_posts where id = v_row.content_id and deleted_at is null;
    if not found then return jsonb_build_object('durum', 'yok', 'http', 404); end if;
    select * into v_profil from public.profiles where id = v_post.user_id;
    if public.gizli_hesap_mi(v_post.user_id)
       or coalesce((select hide_status_posts from public.user_privacy_settings where user_id = v_post.user_id), false)
       or v_profil.deleted_at is not null or v_profil.banned_at is not null
       or coalesce(v_profil.account_status, 'active') <> 'active' then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    return jsonb_build_object(
      'durum', 'ok',
      'http', 200,
      'tur', 'post',
      'robots', case when v_row.is_indexable and not v_row.sitemap_blocked then 'index,follow' else 'noindex,follow' end,
      'id', v_post.id,
      'text', left(coalesce(v_post.caption, ''), 4000),
      'path', '/p/' || v_row.slug,
      'title', left(coalesce(v_row.manual_title, v_row.auto_title, 'Paylaşım | Tamuso'), 70),
      'description', left(coalesce(v_row.manual_description, v_row.auto_description, ''), 180),
      'h1', left(regexp_replace(coalesce(v_row.manual_title, v_row.auto_title, 'Paylaşım'), '\s*\|\s*Tamuso\s*$', ''), 80),
      'language', v_row.language,
      'published', v_post.created_at,
      'modified', v_post.updated_at,
      'image', case when v_post.media_type = 'image' and v_post.media_url ~ '^https://' and v_post.media_url !~* '\.svg($|\?)' then v_post.media_url else v_row.og_image end,
      'imageAlt', coalesce(v_row.alt_text, left(coalesce(v_post.caption, 'Paylaşım görseli'), 120)),
      'video', case when v_post.media_type = 'video' and v_post.media_url ~ '^https://' then jsonb_build_object('url', v_post.media_url, 'name', left(coalesce(v_row.auto_title, 'Video'), 80)) else null end,
      'author', jsonb_build_object(
        'name', coalesce(nullif(trim(v_profil.display_name), ''), 'Tamuso kullanıcısı'),
        'username', case when lower(coalesce(v_profil.username, '')) ~ '^[a-z0-9][a-z0-9._]{1,30}$' then lower(v_profil.username) else null end,
        'path', case when lower(coalesce(v_profil.username, '')) ~ '^[a-z0-9][a-z0-9._]{1,30}$' then '/u/' || lower(v_profil.username) else '/people' end,
        'avatar', case when coalesce(v_profil.avatar_url, '') ~ '^https://' and v_profil.avatar_url !~* '\.svg' then v_profil.avatar_url else null end
      ),
      'city', (
        select jsonb_build_object('name', c.name, 'slug', c.slug, 'path', '/city/' || c.slug)
        from public.geo_cities c where c.id = v_row.city_id and c.is_active
      ),
      'topics', coalesce((
        select jsonb_agg(jsonb_build_object('title', t.title, 'slug', t.slug, 'path', '/topics/' || t.slug))
        from public.seo_topic_posts tp
        join public.seo_topics t on t.id = tp.topic_id
        where tp.post_id = v_post.id
      ), '[]'::jsonb),
      'related', coalesce((
        select jsonb_agg(jsonb_build_object('title', left(coalesce(o.manual_title, o.auto_title, 'Paylaşım'), 80), 'path', '/p/' || o.slug) order by o.updated_at desc)
        from (
          select o.manual_title, o.auto_title, o.slug, o.updated_at
          from public.content_seo o
          where o.content_type = 'post' and o.tier < 3 and o.content_id <> v_post.id
            and o.city_id is not distinct from v_row.city_id
          order by o.updated_at desc
          limit 6
        ) o
      ), '[]'::jsonb),
      'blogs', coalesce((
        select jsonb_agg(jsonb_build_object('title', b.title, 'path', '/blog/' || b.slug))
        from (
          select p.title, p.slug from public.blog_posts p
          join public.blog_post_cities bc on bc.post_id = p.id
          where p.status in ('yayinda', 'planlandi') and p.published_at <= now()
            and bc.city_id = v_row.city_id
          order by p.published_at desc
          limit 3
        ) b
      ), '[]'::jsonb),
      'appPath', 'tamuso://post/' || v_post.id::text,
      'reportPath', '/durum/' || v_post.id::text
    );
  end if;

  if p_tur = 'profile' then
    if v_slug !~ '^[a-z0-9][a-z0-9._]{1,30}$' then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    select * into v_profil from public.profiles where lower(username) = v_slug;
    if not found then return jsonb_build_object('durum', 'yok', 'http', 404); end if;
    if public.gizli_hesap_mi(v_profil.id) or v_profil.deleted_at is not null or v_profil.banned_at is not null
       or coalesce(v_profil.account_status, 'active') <> 'active'
       or coalesce(v_profil.is_guest, false) or coalesce(v_profil.is_sample, false) then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    select * into v_row from public.content_seo where content_type = 'profile' and content_id = v_profil.id;
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'profile',
      'robots', case when coalesce(v_row.is_indexable, false) and not coalesce(v_row.sitemap_blocked, false) then 'index,follow' else 'noindex,follow' end,
      'name', coalesce(nullif(trim(v_profil.display_name), ''), v_slug),
      'username', v_slug,
      'path', '/u/' || v_slug,
      'title', coalesce(v_row.manual_title, v_row.auto_title, v_slug || ' | Tamuso'),
      'description', coalesce(v_row.manual_description, v_row.auto_description, left(coalesce(v_profil.bio, v_slug || ' Tamuso profili'), 160)),
      'bio', left(coalesce(v_profil.bio, ''), 600),
      'avatar', case when coalesce(v_profil.avatar_url, '') ~ '^https://' and v_profil.avatar_url !~* '\.svg' then v_profil.avatar_url else null end,
      'language', coalesce(v_profil.language, 'tr'),
      'city', (
        select jsonb_build_object('name', c.name, 'path', '/city/' || c.slug)
        from public.geo_cities c where c.id = v_profil.primary_city_id and c.is_active
      ),
      'posts', coalesce((
        select jsonb_agg(jsonb_build_object('title', left(coalesce(c.manual_title, c.auto_title, 'Paylaşım'), 80), 'path', '/p/' || c.slug) order by s.created_at desc)
        from public.content_seo c
        join public.status_posts s on s.id = c.content_id
        where c.content_type = 'post' and c.tier < 3 and s.user_id = v_profil.id and s.deleted_at is null
        limit 12
      ), '[]'::jsonb)
    );
  end if;

  if p_tur in ('city', 'city_posts') then
    if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    select id, name, slug into v_sehir from public.geo_cities where slug = v_slug and is_active;
    if not found then return jsonb_build_object('durum', 'yok', 'http', 404); end if;
    select count(*) into v_adet from public.content_seo where content_type = 'post' and city_id = v_sehir.id and is_indexable;
    v_bas := (v_sayfa - 1) * 12;
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', p_tur,
      'robots', case when v_sayfa > 1 then 'noindex,follow' when v_adet > 0 then 'index,follow' else 'noindex,follow' end,
      'name', v_sehir.name,
      'path', case when p_tur = 'city_posts' then '/city/' || v_sehir.slug || '/posts' else '/city/' || v_sehir.slug end,
      'postsPath', '/city/' || v_sehir.slug || '/posts',
      'title', v_sehir.name || ' | Tamuso',
      'description', v_sehir.name || ' şehrindeki herkese açık Tamuso paylaşımları ve profilleri.',
      'page', v_sayfa,
      'posts', coalesce((
        select jsonb_agg(x.obj) from (
          select jsonb_build_object('title', left(coalesce(c.manual_title, c.auto_title, 'Paylaşım'), 90), 'path', '/p/' || c.slug) as obj
          from public.content_seo c
          where c.content_type = 'post' and c.tier < 3 and c.city_id = v_sehir.id
          order by c.updated_at desc
          offset v_bas limit 12
        ) x
      ), '[]'::jsonb),
      'people', coalesce((
        select jsonb_agg(jsonb_build_object('title', coalesce(p.display_name, c.slug), 'path', '/u/' || c.slug))
        from public.content_seo c
        join public.profiles p on p.id = c.content_id
        where c.content_type = 'profile' and c.tier < 3 and c.city_id = v_sehir.id
        limit 12
      ), '[]'::jsonb),
      'blogs', coalesce((
        select jsonb_agg(jsonb_build_object('title', p.title, 'path', '/blog/' || p.slug))
        from (
          select bp.title, bp.slug from public.blog_posts bp
          join public.blog_post_cities bc on bc.post_id = bp.id
          where bc.city_id = v_sehir.id and bp.status in ('yayinda', 'planlandi') and bp.published_at <= now()
          order by bp.published_at desc limit 6
        ) p
      ), '[]'::jsonb)
    );
  end if;

  if p_tur = 'hashtag' then
    if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    select count(*), count(distinct s.user_id) into v_adet, v_yazar
    from public.seo_post_tags g
    join public.content_seo c on c.content_type = 'post' and c.content_id = g.post_id and c.is_indexable
    join public.status_posts s on s.id = g.post_id
    where g.tag = v_slug;
    if coalesce(v_adet, 0) = 0 and not exists (
      select 1 from public.seo_post_tags g
      join public.content_seo c on c.content_type = 'post' and c.content_id = g.post_id and c.tier < 3
      where g.tag = v_slug
    ) then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'hashtag',
      'robots', case when v_adet >= 3 and v_yazar >= 2 and v_sayfa = 1 then 'index,follow' else 'noindex,follow' end,
      'h1', '#' || v_slug,
      'title', '#' || v_slug || ' | Tamuso',
      'description', case when v_adet >= 3 then v_slug || ' etiketindeki herkese açık Tamuso paylaşımları.' else 'Bu etikette henüz yeterli herkese açık paylaşım yok.' end,
      'path', '/hashtag/' || v_slug,
      'page', v_sayfa,
      'items', coalesce((
        select jsonb_agg(x.obj) from (
          select jsonb_build_object('title', left(coalesce(c.manual_title, c.auto_title, 'Paylaşım'), 90), 'path', '/p/' || c.slug) as obj
          from public.seo_post_tags g
          join public.content_seo c on c.content_type = 'post' and c.content_id = g.post_id and c.tier < 3
          where g.tag = v_slug
          order by c.updated_at desc
          offset (v_sayfa - 1) * 12 limit 12
        ) x
      ), '[]'::jsonb)
    );
  end if;

  if p_tur = 'topic' then
    if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    return coalesce((
      select jsonb_build_object(
        'durum', 'ok', 'http', 200, 'tur', 'topic',
        'robots', case when t.is_indexable and v_sayfa = 1 and exists (
          select 1 from public.seo_topic_posts tp
          join public.content_seo c on c.content_id = tp.post_id and c.content_type = 'post' and c.is_indexable
          where tp.topic_id = t.id
        ) then 'index,follow' else 'noindex,follow' end,
        'h1', t.title,
        'title', t.title || ' | Tamuso',
        'description', t.description,
        'path', '/topics/' || t.slug,
        'page', v_sayfa,
        'items', coalesce((
          select jsonb_agg(x.obj) from (
            select jsonb_build_object('title', left(coalesce(c.manual_title, c.auto_title, 'Paylaşım'), 90), 'path', '/p/' || c.slug) as obj
            from public.seo_topic_posts tp
            join public.content_seo c on c.content_id = tp.post_id and c.content_type = 'post' and c.tier < 3
            where tp.topic_id = t.id
            order by c.updated_at desc
            limit 12
          ) x
        ), '[]'::jsonb)
      )
      from public.seo_topics t where t.slug = v_slug
    ), jsonb_build_object('durum', 'yok', 'http', 404));
  end if;

  if p_tur = 'discover' then
    select count(*) into v_adet from public.content_seo where content_type = 'post' and is_indexable;
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'discover',
      'robots', case when v_adet > 0 then 'index,follow' else 'noindex,follow' end,
      'h1', 'Keşfet',
      'title', 'Keşfet | Tamuso',
      'description', 'Tamuso’daki herkese açık şehirler, paylaşımlar ve konular.',
      'path', '/discover',
      'items', coalesce((
        select jsonb_agg(x.obj) from (
          select jsonb_build_object('title', left(coalesce(c.manual_title, c.auto_title, 'Paylaşım'), 90), 'path', '/p/' || c.slug) as obj
          from public.content_seo c
          where c.content_type = 'post' and c.tier < 3
          order by c.updated_at desc limit 12
        ) x
      ), '[]'::jsonb)
    );
  end if;

  if p_tur = 'people' then
    select count(*) into v_adet from public.content_seo where content_type = 'profile' and tier < 3;
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'people',
      'robots', case when v_adet > 0 then 'index,follow' else 'noindex,follow' end,
      'h1', 'İnsanlar',
      'title', 'İnsanlar | Tamuso',
      'description', 'Herkese açık Tamuso profilleri.',
      'path', '/people',
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('title', coalesce(p.display_name, c.slug), 'path', '/u/' || c.slug))
        from public.content_seo c
        join public.profiles p on p.id = c.content_id
        where c.content_type = 'profile' and c.tier < 3
          and p.deleted_at is null and p.banned_at is null
        limit 24
      ), '[]'::jsonb)
    );
  end if;

  return jsonb_build_object('durum', 'yok', 'http', 404);
end;
$$;

create or replace function public.seo_sitemap_oku(p_tur text, p_sayfa integer default 1)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sayfa int := greatest(1, least(coalesce(p_sayfa, 1), 50));
  v_toplam int;
  v_tip text;
begin
  v_tip := case p_tur
    when 'posts' then 'post'
    when 'profiles' then 'profile'
    when 'cities' then 'city'
    when 'topics' then 'topic'
    else '' end;
  if v_tip = '' then
    return jsonb_build_object('toplam', 0, 'urls', '[]'::jsonb);
  end if;
  if v_tip = 'city' then
    select count(*) into v_toplam from (
      select c.city_id from public.content_seo c
      where c.content_type = 'post' and c.is_indexable and c.city_id is not null
      group by c.city_id
    ) x;
    return jsonb_build_object(
      'toplam', v_toplam,
      'urls', coalesce((
        select jsonb_agg(jsonb_build_object('loc', 'https://www.tamuso.com/city/' || g.slug, 'lastmod', g.lastmod))
        from (
          select gc.slug, max(c.updated_at) as lastmod
          from public.content_seo c
          join public.geo_cities gc on gc.id = c.city_id and gc.is_active
          where c.content_type = 'post' and c.is_indexable and not c.sitemap_blocked
          group by gc.slug
          order by max(c.updated_at) desc
          offset (v_sayfa - 1) * 1000 limit 1000
        ) g
      ), '[]'::jsonb)
    );
  end if;
  if v_tip = 'topic' then
    select count(*) into v_toplam from public.seo_topics t
    where t.is_indexable and exists (
      select 1 from public.seo_topic_posts tp
      join public.content_seo c on c.content_id = tp.post_id and c.content_type = 'post' and c.is_indexable
      where tp.topic_id = t.id
    );
    return jsonb_build_object('toplam', v_toplam, 'urls', coalesce((
      select jsonb_agg(jsonb_build_object('loc', 'https://www.tamuso.com/topics/' || t.slug, 'lastmod', t.updated_at))
      from public.seo_topics t
      where t.is_indexable and exists (
        select 1 from public.seo_topic_posts tp
        join public.content_seo c on c.content_id = tp.post_id and c.content_type = 'post' and c.is_indexable
        where tp.topic_id = t.id
      )
      order by t.updated_at desc
      offset (v_sayfa - 1) * 1000 limit 1000
    ), '[]'::jsonb));
  end if;
  select count(*) into v_toplam from public.content_seo
  where content_type = v_tip and is_indexable and not sitemap_blocked and removed_at is null and tier = 1;
  return jsonb_build_object('toplam', v_toplam, 'urls', coalesce((
    select jsonb_agg(jsonb_build_object(
      'loc', 'https://www.tamuso.com' || c.canonical_path,
      'lastmod', c.updated_at
    ))
    from (
      select canonical_path, updated_at from public.content_seo
      where content_type = v_tip and is_indexable and not sitemap_blocked and removed_at is null and tier = 1
        and canonical_path ~ '^/(p|u)/'
      order by updated_at desc
      offset (v_sayfa - 1) * 1000 limit 1000
    ) c
  ), '[]'::jsonb));
end;
$$;

create or replace function public.seo_admin_liste(p_filtre text default 'all', p_sayfa integer default 1)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bas int := (greatest(1, least(coalesce(p_sayfa, 1), 50)) - 1) * 30;
begin
  if not public.seo_admin_mi() then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object('ok', true, 'satirlar', coalesce((
    select jsonb_agg(x.obj) from (
      select jsonb_build_object(
        'id', c.id,
        'content_id', c.content_id,
        'slug', c.slug,
        'path', c.canonical_path,
        'title', coalesce(c.manual_title, c.auto_title),
        'description', coalesce(c.manual_description, c.auto_description),
        'score', c.quality_score,
        'tier', c.tier,
        'indexable', c.is_indexable,
        'reason', c.index_reason,
        'manual', c.manual_index,
        'sitemap_blocked', c.sitemap_blocked,
        'signals', c.signals,
        'canonical', c.canonical_path,
        'og_image', c.og_image
      ) as obj
      from public.content_seo c
      where c.content_type = 'post'
        and (
          p_filtre = 'all'
          or (p_filtre = 'indexable' and c.is_indexable)
          or (p_filtre = 'noindex' and c.tier = 2)
          or (p_filtre = 'pending' and c.index_reason in ('REPORTED_PENDING', 'MODERATION_PENDING', 'REVIEW'))
          or (p_filtre = 'low' and c.quality_score < 80)
          or (p_filtre = 'reported' and c.index_reason like 'REPORT%')
          or (p_filtre = 'removed' and c.tier = 3)
          or (p_filtre = 'high' and c.quality_score >= 80 and c.is_indexable)
        )
      order by c.updated_at desc
      offset v_bas limit 30
    ) x
  ), '[]'::jsonb));
end;
$$;

create or replace function public.seo_admin_ozet()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.seo_admin_mi() then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object(
    'ok', true,
    'indexable_posts', (select count(*) from public.content_seo where content_type = 'post' and is_indexable),
    'noindex_posts', (select count(*) from public.content_seo where content_type = 'post' and tier = 2),
    'hidden_posts', (select count(*) from public.content_seo where content_type = 'post' and tier = 3),
    'indexable_profiles', (select count(*) from public.content_seo where content_type = 'profile' and is_indexable),
    'indexable_cities', (
      select count(distinct city_id) from public.content_seo
      where content_type = 'post' and is_indexable and city_id is not null
    )
  );
end;
$$;

create or replace function public.seo_admin_guncelle(p_id uuid, p_alan jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.content_seo%rowtype;
  v_slug text;
  v_canonical text;
  v_og text;
begin
  if not (public.ben_admin_miyim() or public.admin_has_permission('content.seo.manage')) then
    return jsonb_build_object('ok', false);
  end if;
  select * into v_row from public.content_seo where id = p_id and content_type = 'post';
  if not found then return jsonb_build_object('ok', false); end if;
  if p_alan ? 'manual_index' then
    if p_alan->>'manual_index' in ('index', 'noindex', 'hide') then
      update public.content_seo set manual_index = p_alan->>'manual_index' where id = p_id;
    elsif p_alan->>'manual_index' in ('restore', '') or p_alan->'manual_index' = 'null'::jsonb then
      update public.content_seo set manual_index = null, removed_at = null where id = p_id;
    end if;
  end if;
  if p_alan ? 'manual_title' then
    update public.content_seo set manual_title = nullif(left(trim(coalesce(p_alan->>'manual_title', '')), 70), '') where id = p_id;
  end if;
  if p_alan ? 'manual_description' then
    update public.content_seo set manual_description = nullif(left(trim(coalesce(p_alan->>'manual_description', '')), 180), '') where id = p_id;
  end if;
  if p_alan ? 'manual_slug' then
    v_slug := public.seo_slug_yap(p_alan->>'manual_slug');
    if v_slug is not null and v_slug <> '' then
      v_slug := v_slug || '-' || coalesce(v_row.short_id, left(replace(v_row.content_id::text, '-', ''), 6));
      if not exists (select 1 from public.content_seo c where c.content_type = 'post' and c.slug = v_slug and c.id <> p_id) then
        perform public.seo_yonlendir_yaz('/p/' || v_row.slug, '/p/' || v_slug);
        update public.content_seo set slug = v_slug, canonical_path = '/p/' || v_slug, slug_locked = true where id = p_id;
      end if;
    end if;
  end if;
  if p_alan ? 'canonical_path' then
    v_canonical := p_alan->>'canonical_path';
    if v_canonical is null or v_canonical = '' then
      update public.content_seo set canonical_path = '/p/' || (select slug from public.content_seo where id = p_id) where id = p_id;
    elsif v_canonical ~ '^/p/[a-z0-9]+(-[a-z0-9]+)*$' then
      update public.content_seo set canonical_path = v_canonical where id = p_id;
    end if;
  end if;
  if p_alan ? 'og_image' then
    v_og := p_alan->>'og_image';
    if v_og is null or v_og = '' then
      update public.content_seo set og_image = null where id = p_id;
    elsif v_og ~ '^https://' and v_og !~* '\.svg($|\?)' then
      update public.content_seo set og_image = left(v_og, 500) where id = p_id;
    end if;
  end if;
  if p_alan ? 'sitemap_blocked' then
    update public.content_seo set sitemap_blocked = coalesce((p_alan->>'sitemap_blocked')::boolean, false) where id = p_id;
  end if;
  perform public.seo_gonderi_yenile(v_row.content_id);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.seo_konu_kaydet(p_slug text, p_title text, p_description text, p_indexable boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text := public.seo_slug_yap(p_slug);
begin
  if not (public.ben_admin_miyim() or public.admin_has_permission('content.seo.manage')) then
    return jsonb_build_object('ok', false);
  end if;
  if v_slug is null or length(trim(coalesce(p_title, ''))) < 3 or length(trim(coalesce(p_description, ''))) < 20 then
    return jsonb_build_object('ok', false);
  end if;
  insert into public.seo_topics (slug, title, description, is_indexable)
  values (v_slug, left(trim(p_title), 80), left(trim(p_description), 180), coalesce(p_indexable, false))
  on conflict (slug) do update set
    title = excluded.title,
    description = excluded.description,
    is_indexable = excluded.is_indexable,
    updated_at = now();
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

create or replace function public.seo_kayit_kaynagi(p_kaynak jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false); end if;
  insert into public.seo_attributions (user_id, content_type, content_id, path, city_slug, topic_slug)
  values (
    v_uid,
    left(coalesce(p_kaynak->>'landing_content_type', ''), 32),
    left(coalesce(p_kaynak->>'landing_content_id', ''), 64),
    left(coalesce(p_kaynak->>'path', ''), 160),
    left(coalesce(p_kaynak->>'landing_city', ''), 80),
    left(coalesce(p_kaynak->>'landing_topic', ''), 80)
  )
  on conflict (user_id) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.seo_public_oku(text, text, integer) from public;
revoke all on function public.seo_sitemap_oku(text, integer) from public;
revoke all on function public.seo_admin_liste(text, integer) from public;
revoke all on function public.seo_admin_ozet() from public;
revoke all on function public.seo_admin_guncelle(uuid, jsonb) from public;
revoke all on function public.seo_konu_kaydet(text, text, text, boolean) from public;
revoke all on function public.seo_kayit_kaynagi(jsonb) from public;
revoke all on function public.seo_gonderi_yenile(uuid) from public;
revoke all on function public.seo_profil_yenile(uuid) from public;
revoke all on function public.seo_kullanici_yenile(uuid) from public;

grant execute on function public.seo_public_oku(text, text, integer) to anon, authenticated;
grant execute on function public.seo_sitemap_oku(text, integer) to anon, authenticated;
grant execute on function public.seo_admin_liste(text, integer) to authenticated;
grant execute on function public.seo_admin_ozet() to authenticated;
grant execute on function public.seo_admin_guncelle(uuid, jsonb) to authenticated;
grant execute on function public.seo_konu_kaydet(text, text, text, boolean) to authenticated;
grant execute on function public.seo_kayit_kaynagi(jsonb) to authenticated;

insert into public.admin_permission_catalog
  (permission_key, label, description, category, risk, module_href, sort_order)
values
  ('content.seo.view', 'SEO icerik gor', 'Public icerik SEO listesi', 'CONTENT', 'LOW', '/admin/seo-icerik', 286),
  ('content.seo.manage', 'SEO icerik yonet', 'Index, baslik ve sitemap karari', 'CONTENT', 'MEDIUM', '/admin/seo-icerik', 287)
on conflict (permission_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  risk = excluded.risk,
  module_href = excluded.module_href,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.admin_role_permissions (role_code, permission_code)
select 'SUPER_ADMIN', x from unnest(array['content.seo.view', 'content.seo.manage']) as x
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code)
select 'CONTENT_ADMIN', x from unnest(array['content.seo.view', 'content.seo.manage']) as x
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code)
select 'READ_ONLY_ADMIN', 'content.seo.view'
on conflict do nothing;

do $$
declare r record;
begin
  for r in select id from public.status_posts loop
    perform public.seo_gonderi_yenile(r.id);
  end loop;
  for r in select distinct user_id as id from public.status_posts loop
    perform public.seo_profil_yenile(r.id);
  end loop;
end $$;
