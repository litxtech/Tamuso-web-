-- Blog CMS. Yayın görünürlüğü zaman damgasına bağlıdır; cron gerekmez.
-- planlandi + published_at <= now() herkese açılır. Taslak, arşiv ve çöp açılmaz.

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  seo_title text,
  meta_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_categories_slug_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  constraint blog_tags_slug_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content_html text not null default '',
  cover_image_url text,
  cover_image_alt text,
  category_id uuid references public.blog_categories(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text,
  author_bio text,
  author_avatar_url text,
  status text not null default 'taslak'
    check (status in ('taslak', 'planlandi', 'yayinda', 'arsiv', 'cop')),
  published_at timestamptz,
  seo_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image_url text,
  robots_index boolean not null default true,
  featured boolean not null default false,
  reading_minutes int not null default 1,
  focus_topic text,
  search_intent text,
  keywords text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_posts_slug_chk check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint blog_posts_slug_ayrik check (slug not in ('kategori', 'etiket', 'ara', 'sayfa', 'onizleme'))
);

create index if not exists blog_posts_yayin_idx
  on public.blog_posts (published_at desc)
  where status in ('yayinda', 'planlandi');
create index if not exists blog_posts_status_idx on public.blog_posts (status, updated_at desc);
create index if not exists blog_posts_category_idx on public.blog_posts (category_id);
create index if not exists blog_posts_author_idx on public.blog_posts (author_id);
create index if not exists blog_posts_created_idx on public.blog_posts (created_at desc);

create table if not exists public.blog_post_tags (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);
create index if not exists blog_post_tags_tag_idx on public.blog_post_tags (tag_id);

create table if not exists public.blog_post_cities (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  city_id uuid not null references public.geo_cities(id) on delete cascade,
  city_name text not null,
  city_slug text not null,
  primary key (post_id, city_id)
);
create index if not exists blog_post_cities_city_idx on public.blog_post_cities (city_id);

create table if not exists public.blog_faqs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0
);
create index if not exists blog_faqs_post_idx on public.blog_faqs (post_id, sort_order);

create table if not exists public.blog_redirects (
  from_slug text primary key,
  to_slug text not null,
  created_at timestamptz not null default now(),
  constraint blog_redirects_slug_chk check (
    from_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and to_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and from_slug <> to_slug
  )
);

create table if not exists public.blog_settings (
  id int primary key default 1 check (id = 1),
  tag_index_min int not null default 3 check (tag_index_min between 1 and 20),
  updated_at timestamptz not null default now()
);

insert into public.blog_settings (id) values (1) on conflict (id) do nothing;

insert into public.blog_categories (name, slug, description) values
  ('Karadeniz', 'karadeniz', 'Karadeniz şehirleri, sosyal hayat ve buluşma kültürü.'),
  ('Şehir Rehberleri', 'sehir-rehberleri', 'Şehir şehir gezilecek yerler ve günlük hayat.'),
  ('Sosyal Yaşam', 'sosyal-yasam', 'Yeni insanlarla tanışma ve sosyal çevre.'),
  ('Etkinlikler', 'etkinlikler', 'Buluşmalar, yayınlar ve şehir etkinlikleri.'),
  ('Tamuso', 'tamuso', 'Uygulamanın kendisi, özellikler ve kullanım.'),
  ('Yaşam', 'yasam', 'Günlük hayat ve şehirde vakit geçirme.'),
  ('Teknoloji', 'teknoloji', 'Ürün ve teknoloji notları.')
on conflict (slug) do nothing;

create or replace function public.blog_posts_hazirla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kelime int;
begin
  if new.slug in ('kategori', 'etiket', 'ara', 'sayfa', 'onizleme') then
    raise exception 'Bu adres ayrılmış';
  end if;
  if new.content_html ~* '<\s*script|javascript:|data:text/html|onerror\s*=|onload\s*=|onclick\s*=' then
    raise exception 'İçerik güvenlik kontrolünden geçmedi';
  end if;

  kelime := coalesce(
    array_length(
      regexp_split_to_array(
        trim(regexp_replace(coalesce(new.content_html, ''), '<[^>]+>', ' ', 'g')),
        '\s+'
      ),
      1
    ),
    0
  );
  if kelime = 1 and trim(regexp_replace(coalesce(new.content_html, ''), '<[^>]+>', '', 'g')) = '' then
    kelime := 0;
  end if;
  new.reading_minutes := greatest(1, ceil(kelime / 180.0)::int);
  new.updated_at := now();

  if tg_op = 'UPDATE' and new.slug is distinct from old.slug then
    delete from public.blog_redirects where from_slug = new.slug;
    update public.blog_redirects
      set to_slug = new.slug
      where to_slug = old.slug and from_slug <> new.slug;
    insert into public.blog_redirects (from_slug, to_slug)
    values (old.slug, new.slug)
    on conflict (from_slug) do update
      set to_slug = excluded.to_slug, created_at = now();
    delete from public.blog_redirects where from_slug = to_slug;
  end if;

  return new;
end;
$$;

drop trigger if exists blog_posts_hazirla on public.blog_posts;
create trigger blog_posts_hazirla
  before insert or update on public.blog_posts
  for each row execute function public.blog_posts_hazirla();

revoke all on function public.blog_posts_hazirla() from public, anon, authenticated;

alter table public.blog_categories enable row level security;
alter table public.blog_tags enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_tags enable row level security;
alter table public.blog_faqs enable row level security;
alter table public.blog_post_cities enable row level security;
alter table public.blog_redirects enable row level security;
alter table public.blog_settings enable row level security;

drop policy if exists blog_categories_oku on public.blog_categories;
create policy blog_categories_oku on public.blog_categories
  for select to anon, authenticated using (true);
drop policy if exists blog_categories_yaz on public.blog_categories;
create policy blog_categories_yaz on public.blog_categories
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

drop policy if exists blog_tags_oku on public.blog_tags;
create policy blog_tags_oku on public.blog_tags
  for select to anon, authenticated using (true);
drop policy if exists blog_tags_yaz on public.blog_tags;
create policy blog_tags_yaz on public.blog_tags
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

drop policy if exists blog_posts_oku on public.blog_posts;
create policy blog_posts_oku on public.blog_posts
  for select to anon, authenticated
  using (
    public.ben_admin_miyim()
    or (
      status in ('yayinda', 'planlandi')
      and published_at is not null
      and published_at <= now()
    )
  );
drop policy if exists blog_posts_yaz on public.blog_posts;
create policy blog_posts_yaz on public.blog_posts
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

drop policy if exists blog_post_tags_oku on public.blog_post_tags;
create policy blog_post_tags_oku on public.blog_post_tags
  for select to anon, authenticated
  using (
    public.ben_admin_miyim()
    or exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and p.status in ('yayinda', 'planlandi')
        and p.published_at is not null
        and p.published_at <= now()
    )
  );
drop policy if exists blog_post_tags_yaz on public.blog_post_tags;
create policy blog_post_tags_yaz on public.blog_post_tags
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

drop policy if exists blog_faqs_oku on public.blog_faqs;
create policy blog_faqs_oku on public.blog_faqs
  for select to anon, authenticated
  using (
    public.ben_admin_miyim()
    or exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and p.status in ('yayinda', 'planlandi')
        and p.published_at is not null
        and p.published_at <= now()
    )
  );
drop policy if exists blog_faqs_yaz on public.blog_faqs;
create policy blog_faqs_yaz on public.blog_faqs
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

drop policy if exists blog_post_cities_oku on public.blog_post_cities;
create policy blog_post_cities_oku on public.blog_post_cities
  for select to anon, authenticated
  using (
    public.ben_admin_miyim()
    or exists (
      select 1 from public.blog_posts p
      where p.id = post_id
        and p.status in ('yayinda', 'planlandi')
        and p.published_at is not null
        and p.published_at <= now()
    )
  );
drop policy if exists blog_post_cities_yaz on public.blog_post_cities;
create policy blog_post_cities_yaz on public.blog_post_cities
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

drop policy if exists blog_redirects_oku on public.blog_redirects;
create policy blog_redirects_oku on public.blog_redirects
  for select to anon, authenticated using (true);
drop policy if exists blog_redirects_yaz on public.blog_redirects;
create policy blog_redirects_yaz on public.blog_redirects
  for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

drop policy if exists blog_settings_oku on public.blog_settings;
create policy blog_settings_oku on public.blog_settings
  for select to anon, authenticated using (true);
drop policy if exists blog_settings_yaz on public.blog_settings;
create policy blog_settings_yaz on public.blog_settings
  for update to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

grant select on public.blog_categories, public.blog_tags, public.blog_posts,
  public.blog_post_tags, public.blog_faqs, public.blog_post_cities,
  public.blog_redirects, public.blog_settings to anon, authenticated;
grant insert, update, delete on public.blog_categories, public.blog_tags, public.blog_posts,
  public.blog_post_tags, public.blog_faqs, public.blog_post_cities, public.blog_redirects
  to authenticated;
grant update on public.blog_settings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-gorseller',
  'blog-gorseller',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists blog_gorsel_oku on storage.objects;
create policy blog_gorsel_oku on storage.objects
  for select to public
  using (bucket_id = 'blog-gorseller');
drop policy if exists blog_gorsel_yaz on storage.objects;
create policy blog_gorsel_yaz on storage.objects
  for all to authenticated
  using (bucket_id = 'blog-gorseller' and public.ben_admin_miyim())
  with check (bucket_id = 'blog-gorseller' and public.ben_admin_miyim());

insert into public.admin_permission_catalog
  (permission_key, label, description, category, risk, module_href, sort_order)
values
  ('content.blog.view', 'Blog gor', 'Blog listesi ve onizleme', 'CONTENT', 'LOW', '/admin/blog', 270),
  ('content.blog.manage', 'Blog yonet', 'Yazi, kategori, etiket, yayin', 'CONTENT', 'MEDIUM', '/admin/blog', 280)
on conflict (permission_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  risk = excluded.risk,
  module_href = excluded.module_href,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.admin_role_permissions (role_code, permission_code)
select 'SUPER_ADMIN', x from unnest(array['content.blog.view', 'content.blog.manage']) as x
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code)
select 'CONTENT_ADMIN', x from unnest(array['content.blog.view', 'content.blog.manage']) as x
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code)
select 'READ_ONLY_ADMIN', 'content.blog.view'
on conflict do nothing;

insert into public.hamburger_menu_items (item_key, enabled, sort_order, group_id)
values ('blog', true, 15, 'kesfet')
on conflict (item_key) do nothing;
