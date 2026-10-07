-- Blog global: dil, içerik grubu, yazar, medya, video, yönlendirme.
-- Türkçe adres /blog/slug olarak kalır. Diğer diller /{dil}/blog/slug.
-- Taslak ve eksik çeviri herkese açılmaz.

create table if not exists public.blog_languages (
  code text primary key,
  name text not null,
  native_name text not null,
  locale text not null,
  dir text not null default 'ltr' check (dir in ('ltr', 'rtl')),
  is_active boolean not null default false,
  is_default boolean not null default false,
  is_publishable boolean not null default false,
  sort_order int not null default 0,
  constraint blog_languages_code_chk check (code ~ '^[a-z]{2}$')
);

create unique index if not exists blog_languages_one_default
  on public.blog_languages ((1))
  where is_default;

create table if not exists public.blog_content_groups (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  default_language text not null default 'tr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blog_authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  avatar_url text,
  avatar_alt text,
  bio text not null default '',
  role text not null default '',
  website text,
  social_links jsonb not null default '{}'::jsonb,
  kind text not null default 'organization' check (kind in ('person', 'organization')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_authors_slug_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

insert into public.blog_languages (code, name, native_name, locale, dir, is_active, is_default, is_publishable, sort_order)
values
  ('tr', 'Turkish', 'Türkçe', 'tr-TR', 'ltr', true, true, true, 1),
  ('en', 'English', 'English', 'en', 'ltr', false, false, true, 2),
  ('de', 'German', 'Deutsch', 'de', 'ltr', false, false, true, 3),
  ('es', 'Spanish', 'Español', 'es', 'ltr', false, false, true, 4),
  ('ar', 'Arabic', 'العربية', 'ar', 'rtl', false, false, true, 5),
  ('ru', 'Russian', 'Русский', 'ru', 'ltr', false, false, true, 6)
on conflict (code) do nothing;

insert into public.blog_authors (name, slug, bio, role, website, kind, avatar_alt)
values (
  'Tamuso Yayın Ekibi',
  'tamuso-ekibi',
  'Tamuso yayın ekibi. Yazılar şirket adına hazırlanır; bu profil gerçek bir kişi değildir.',
  'Editorial',
  'https://www.tamuso.com',
  'organization',
  'Tamuso yayın ekibi'
)
on conflict (slug) do nothing;

alter table public.blog_posts drop constraint if exists blog_posts_status_check;
alter table public.blog_posts add constraint blog_posts_status_check
  check (status in ('taslak', 'inceleme', 'planlandi', 'yayinda', 'arsiv', 'cop'));

alter table public.blog_posts add column if not exists language_code text not null default 'tr';
alter table public.blog_posts add column if not exists content_group_id uuid;
alter table public.blog_posts add column if not exists translation_status text not null default 'draft';
alter table public.blog_posts add column if not exists blog_author_id uuid;
alter table public.blog_posts add column if not exists twitter_title text;
alter table public.blog_posts add column if not exists twitter_description text;
alter table public.blog_posts add column if not exists twitter_image_url text;
alter table public.blog_posts add column if not exists cover_title text;
alter table public.blog_posts add column if not exists cover_caption text;
alter table public.blog_posts add column if not exists cover_credit text;
alter table public.blog_posts add column if not exists cover_width int;
alter table public.blog_posts add column if not exists cover_height int;
alter table public.blog_posts add column if not exists cover_focal text;
alter table public.blog_posts add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists content_revision int not null default 1;
alter table public.blog_posts add column if not exists preview_token uuid;

alter table public.blog_posts drop constraint if exists blog_posts_language_fk;
alter table public.blog_posts
  add constraint blog_posts_language_fk foreign key (language_code) references public.blog_languages(code);
alter table public.blog_posts drop constraint if exists blog_posts_group_fk;
alter table public.blog_posts
  add constraint blog_posts_group_fk foreign key (content_group_id) references public.blog_content_groups(id) on delete cascade;
alter table public.blog_posts drop constraint if exists blog_posts_author_fk;
alter table public.blog_posts
  add constraint blog_posts_author_fk foreign key (blog_author_id) references public.blog_authors(id) on delete set null;
alter table public.blog_posts drop constraint if exists blog_posts_translation_chk;
alter table public.blog_posts add constraint blog_posts_translation_chk
  check (translation_status in ('draft', 'review', 'published', 'outdated'));

insert into public.blog_content_groups (content_key, default_language)
select 'tr-' || p.slug, 'tr'
from public.blog_posts p
where p.content_group_id is null
on conflict (content_key) do nothing;

update public.blog_posts p
set content_group_id = g.id
from public.blog_content_groups g
where p.content_group_id is null
  and g.content_key = 'tr-' || p.slug;

alter table public.blog_posts drop constraint if exists blog_posts_slug_key;
create unique index if not exists blog_posts_lang_slug_uidx on public.blog_posts (language_code, slug);
create unique index if not exists blog_posts_group_lang_uidx on public.blog_posts (content_group_id, language_code);
create index if not exists blog_posts_group_idx on public.blog_posts (content_group_id);
create index if not exists blog_posts_lang_status_idx on public.blog_posts (language_code, status, published_at desc);

create table if not exists public.blog_media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'blog-gorseller',
  path text not null unique,
  filename text not null,
  mime text not null,
  bytes int,
  width int,
  height int,
  alt_text text not null default '',
  kind text not null default 'image' check (kind in ('image', 'video', 'author', 'cover')),
  created_at timestamptz not null default now()
);
create index if not exists blog_media_kind_idx on public.blog_media (kind, created_at desc);

create table if not exists public.blog_videos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  provider text not null check (provider in ('youtube', 'vimeo', 'mp4')),
  title text not null,
  description text not null default '',
  thumbnail_url text,
  upload_date date,
  duration_iso text,
  embed_url text,
  content_url text,
  sort_order int not null default 0
);
create index if not exists blog_videos_post_idx on public.blog_videos (post_id, sort_order);

create table if not exists public.blog_related_pages (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  href text not null,
  label text not null,
  sort_order int not null default 0,
  constraint blog_related_href_chk check (href ~ '^/[a-z0-9][a-z0-9/_-]{0,180}$')
);
create index if not exists blog_related_post_idx on public.blog_related_pages (post_id, sort_order);

create table if not exists public.blog_path_redirects (
  old_path text primary key,
  new_path text not null,
  status_code int not null default 301 check (status_code in (301, 302)),
  created_at timestamptz not null default now(),
  constraint blog_path_redirects_chk check (old_path <> new_path and old_path ~ '^/' and new_path ~ '^/')
);

create table if not exists public.blog_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.blog_posts(id) on delete set null,
  event_name text not null check (event_name in ('share', 'outbound', 'cta', 'language_switch', 'related_click')),
  created_at timestamptz not null default now()
);
create index if not exists blog_events_post_idx on public.blog_events (post_id, created_at desc);

alter table public.blog_settings add column if not exists freshness_days int not null default 180;
alter table public.blog_settings add column if not exists og_template jsonb not null default '{"layout":"logo-title-category-city"}'::jsonb;

create or replace function public.blog_yol(dil text, hedef_slug text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(dil, 'tr') = 'tr' then '/blog/' || hedef_slug
    else '/' || dil || '/blog/' || hedef_slug
  end;
$$;

create or replace function public.blog_posts_hazirla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kelime int;
  harf int;
  yazar public.blog_authors%rowtype;
begin
  if new.slug in ('kategori', 'etiket', 'ara', 'sayfa', 'onizleme') then
    raise exception 'Bu adres ayrılmış';
  end if;
  if new.content_html ~* '<[[:space:]]*script|javascript:|data:text/html|onerror[[:space:]]*=|onload[[:space:]]*=|onclick[[:space:]]*=' then
    raise exception 'İçerik güvenlik kontrolünden geçmedi';
  end if;
  if new.language_code is null then
    new.language_code := 'tr';
  end if;

  if new.content_group_id is null then
    insert into public.blog_content_groups (content_key, default_language)
    values (new.language_code || '-' || new.slug || '-' || substr(gen_random_uuid()::text, 1, 8), 'tr')
    returning id into new.content_group_id;
  end if;

  if new.blog_author_id is null then
    select id into new.blog_author_id from public.blog_authors where slug = 'tamuso-ekibi' and is_active limit 1;
  end if;
  if new.blog_author_id is not null and (new.author_name is null or btrim(new.author_name) = '') then
    select * into yazar from public.blog_authors where id = new.blog_author_id;
    if found then
      new.author_name := yazar.name;
      new.author_bio := yazar.bio;
      new.author_avatar_url := yazar.avatar_url;
    end if;
  end if;

  kelime := coalesce(array_length(regexp_split_to_array(trim(regexp_replace(coalesce(new.content_html, ''), '<[^>]+>', ' ', 'g')), '[[:space:]]+'), 1), 0);
  if kelime = 1 and trim(regexp_replace(coalesce(new.content_html, ''), '<[^>]+>', '', 'g')) = '' then
    kelime := 0;
  end if;
  if new.language_code = 'ar' then
    harf := char_length(regexp_replace(regexp_replace(coalesce(new.content_html, ''), '<[^>]+>', '', 'g'), '[[:space:]]', '', 'g'));
    new.reading_minutes := greatest(1, ceil(harf / 500.0)::int);
  else
    new.reading_minutes := greatest(1, ceil(kelime / case when new.language_code = 'de' then 160 when new.language_code = 'ru' then 170 else 180 end)::int);
  end if;

  if tg_op = 'INSERT' then
    new.updated_at := now();
  elsif (
    new.title is distinct from old.title
    or new.excerpt is distinct from old.excerpt
    or new.content_html is distinct from old.content_html
    or new.slug is distinct from old.slug
    or new.seo_title is distinct from old.seo_title
    or new.meta_description is distinct from old.meta_description
    or new.cover_image_url is distinct from old.cover_image_url
    or new.cover_image_alt is distinct from old.cover_image_alt
    or new.gallery is distinct from old.gallery
    or new.content_revision is distinct from old.content_revision
    or new.status is distinct from old.status
  ) then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;

  if new.status = 'yayinda' and (tg_op = 'INSERT' or old.status is distinct from 'yayinda') then
    new.translation_status := 'published';
  end if;

  if new.status in ('taslak', 'inceleme', 'cop', 'arsiv') then
    new.robots_index := false;
  end if;

  if tg_op = 'UPDATE' and new.slug is distinct from old.slug and new.language_code = old.language_code then
    delete from public.blog_redirects where from_slug = new.slug and to_slug = old.slug;
    insert into public.blog_redirects (from_slug, to_slug)
    values (old.slug, new.slug)
    on conflict (from_slug) do update set to_slug = excluded.to_slug, created_at = now();
    delete from public.blog_redirects where from_slug = to_slug;
    insert into public.blog_path_redirects (old_path, new_path, status_code)
    values (public.blog_yol(old.language_code, old.slug), public.blog_yol(new.language_code, new.slug), 301)
    on conflict (old_path) do update set new_path = excluded.new_path, status_code = 301, created_at = now();
    delete from public.blog_path_redirects where old_path = new_path;
  end if;

  if tg_op = 'UPDATE'
    and new.language_code = 'tr'
    and (
      new.title is distinct from old.title
      or new.excerpt is distinct from old.excerpt
      or new.content_html is distinct from old.content_html
      or new.seo_title is distinct from old.seo_title
      or new.meta_description is distinct from old.meta_description
    ) then
    update public.blog_posts
      set translation_status = 'outdated'
      where content_group_id = new.content_group_id
        and id <> new.id
        and translation_status = 'published';
  end if;

  return new;
end;
$$;

revoke all on function public.blog_posts_hazirla() from public, anon, authenticated;
grant execute on function public.blog_yol(text, text) to anon, authenticated;

alter table public.blog_languages enable row level security;
alter table public.blog_content_groups enable row level security;
alter table public.blog_authors enable row level security;
alter table public.blog_media enable row level security;
alter table public.blog_videos enable row level security;
alter table public.blog_related_pages enable row level security;
alter table public.blog_path_redirects enable row level security;
alter table public.blog_events enable row level security;

drop policy if exists blog_languages_oku on public.blog_languages;
create policy blog_languages_oku on public.blog_languages for select to anon, authenticated using (true);
drop policy if exists blog_languages_yaz on public.blog_languages;
create policy blog_languages_yaz on public.blog_languages for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());

drop policy if exists blog_groups_oku on public.blog_content_groups;
create policy blog_groups_oku on public.blog_content_groups for select to anon, authenticated using (true);
drop policy if exists blog_groups_yaz on public.blog_content_groups;
create policy blog_groups_yaz on public.blog_content_groups for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());

drop policy if exists blog_authors_oku on public.blog_authors;
create policy blog_authors_oku on public.blog_authors for select to anon, authenticated
  using (is_active or public.ben_admin_miyim());
drop policy if exists blog_authors_yaz on public.blog_authors;
create policy blog_authors_yaz on public.blog_authors for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());

drop policy if exists blog_media_oku on public.blog_media;
create policy blog_media_oku on public.blog_media for select to anon, authenticated using (true);
drop policy if exists blog_media_yaz on public.blog_media;
create policy blog_media_yaz on public.blog_media for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());

drop policy if exists blog_videos_oku on public.blog_videos;
create policy blog_videos_oku on public.blog_videos for select to anon, authenticated
  using (
    public.ben_admin_miyim()
    or exists (
      select 1 from public.blog_posts p
      where p.id = post_id and p.status in ('yayinda', 'planlandi')
        and p.published_at is not null and p.published_at <= now()
    )
  );
drop policy if exists blog_videos_yaz on public.blog_videos;
create policy blog_videos_yaz on public.blog_videos for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());

drop policy if exists blog_related_oku on public.blog_related_pages;
create policy blog_related_oku on public.blog_related_pages for select to anon, authenticated
  using (
    public.ben_admin_miyim()
    or exists (
      select 1 from public.blog_posts p
      where p.id = post_id and p.status in ('yayinda', 'planlandi')
        and p.published_at is not null and p.published_at <= now()
    )
  );
drop policy if exists blog_related_yaz on public.blog_related_pages;
create policy blog_related_yaz on public.blog_related_pages for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());

drop policy if exists blog_path_oku on public.blog_path_redirects;
create policy blog_path_oku on public.blog_path_redirects for select to anon, authenticated using (true);
drop policy if exists blog_path_yaz on public.blog_path_redirects;
create policy blog_path_yaz on public.blog_path_redirects for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());

drop policy if exists blog_events_oku on public.blog_events;
create policy blog_events_oku on public.blog_events for select to authenticated using (public.ben_admin_miyim());
drop policy if exists blog_events_yaz on public.blog_events;
create policy blog_events_yaz on public.blog_events for insert to authenticated
  with check (public.ben_admin_miyim());

grant select on public.blog_languages, public.blog_content_groups, public.blog_authors,
  public.blog_media, public.blog_videos, public.blog_related_pages, public.blog_path_redirects
  to anon, authenticated;
grant select on public.blog_events to authenticated;
grant insert, update, delete on public.blog_languages, public.blog_content_groups, public.blog_authors,
  public.blog_media, public.blog_videos, public.blog_related_pages, public.blog_path_redirects
  to authenticated;
grant insert on public.blog_events to authenticated;

update storage.buckets
set file_size_limit = 31457280,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4']
where id = 'blog-gorseller';

alter table public.blog_posts alter column content_group_id set not null;
