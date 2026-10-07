-- Blog okuma sayacı.
-- Aynı cihaz bir yazıyı bir kez okumuş sayılır. Ham cihaz kimliği saklanmaz.

create table if not exists public.blog_okumalar (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  kimlik_hash text not null,
  olusturulma timestamptz not null default now(),
  primary key (post_id, kimlik_hash)
);

create table if not exists public.blog_okunma_sayac (
  post_id uuid primary key references public.blog_posts(id) on delete cascade,
  adet integer not null default 0 check (adet >= 0)
);

alter table public.blog_okumalar enable row level security;
alter table public.blog_okunma_sayac enable row level security;

revoke all on table public.blog_okumalar from public, anon, authenticated;
revoke all on table public.blog_okunma_sayac from public, anon, authenticated;

drop policy if exists blog_okunma_sayac_oku on public.blog_okunma_sayac;
create policy blog_okunma_sayac_oku on public.blog_okunma_sayac
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

grant select on public.blog_okunma_sayac to anon, authenticated;

create or replace function public.blog_okuma_kaydet(
  p_slug text,
  p_dil text,
  p_cihaz text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_ua text;
  v_slug text;
  v_dil text;
  v_cihaz text;
  v_post uuid;
  v_hash text;
  v_yeni uuid;
  v_adet integer;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ua := lower(coalesce(v_headers->>'user-agent', ''));
  if v_ua ~ '(bot|spider|crawler|slurp|preview|facebookexternalhit|whatsapp|telegrambot|headless)' then
    return jsonb_build_object('ok', false, 'sayildi', false, 'okunma', 0);
  end if;

  v_slug := nullif(btrim(coalesce(p_slug, '')), '');
  v_dil := nullif(lower(btrim(coalesce(p_dil, 'tr'))), '');
  v_cihaz := nullif(btrim(coalesce(p_cihaz, '')), '');

  if v_slug is null
     or length(v_slug) > 120
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    return jsonb_build_object('ok', false, 'sayildi', false, 'okunma', 0);
  end if;
  if v_dil is null or v_dil !~ '^[a-z]{2}$' then
    return jsonb_build_object('ok', false, 'sayildi', false, 'okunma', 0);
  end if;
  if v_cihaz is null
     or length(v_cihaz) < 8
     or length(v_cihaz) > 128
     or v_cihaz !~ '^[A-Za-z0-9_.:-]+$' then
    return jsonb_build_object('ok', false, 'sayildi', false, 'okunma', 0);
  end if;

  select p.id into v_post
  from public.blog_posts p
  where p.slug = v_slug
    and p.language_code = v_dil
    and p.status in ('yayinda', 'planlandi')
    and p.published_at is not null
    and p.published_at <= now();

  if v_post is null then
    return jsonb_build_object('ok', false, 'sayildi', false, 'okunma', 0);
  end if;

  v_hash := encode(
    extensions.digest(
      convert_to(v_cihaz || '|tamuso-blog-okuma-v1', 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  insert into public.blog_okumalar (post_id, kimlik_hash)
  values (v_post, v_hash)
  on conflict do nothing
  returning post_id into v_yeni;

  if v_yeni is not null then
    insert into public.blog_okunma_sayac (post_id, adet)
    values (v_post, 1)
    on conflict (post_id)
    do update set adet = public.blog_okunma_sayac.adet + 1
    returning adet into v_adet;
  else
    select adet into v_adet from public.blog_okunma_sayac where post_id = v_post;
  end if;

  return jsonb_build_object(
    'ok', true,
    'sayildi', v_yeni is not null,
    'okunma', coalesce(v_adet, 0)
  );
end;
$$;

revoke all on function public.blog_okuma_kaydet(text, text, text) from public;
grant execute on function public.blog_okuma_kaydet(text, text, text) to anon, authenticated;
