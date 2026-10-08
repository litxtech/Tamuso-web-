-- Yetişkin paylaşım çocuk güvenliği değildir.
-- Dizinden çıkanlar: çocuk güvenliği, şiddet, kendine zarar.
-- Zayıf sayfa Google'dan çıkarılır; uygulama içindeki paylaşım silinmez.

do $$
declare
  src text;
begin
  src := pg_get_functiondef('public.seo_gonderi_yenile(uuid)'::regprocedure);
  if position('t.action = ''BLOCK''' in src) = 0 then
    raise exception 'hassas kural bulunamadi';
  end if;
  src := replace(
    src,
    't.is_active and t.action = ''BLOCK'' and char_length(t.term) >= 3',
    't.is_active and t.category in (''child_safety'', ''violence'', ''self_harm'') and char_length(t.term) >= 3'
  );
  src := replace(src, 'if v_medya then v_score := v_score + 5;', 'if v_medya then v_score := v_score + 10;');
  execute src;
end $$;

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
  if p_tur = 'agencies' then
    select count(*) into v_toplam
    from public.agencies a
    where a.status = 'active'
      and length(trim(coalesce(a.description, ''))) >= 40
      and length(trim(coalesce(a.name, ''))) >= 2;
    return jsonb_build_object('toplam', v_toplam, 'urls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'loc', 'https://www.tamuso.com/ajans-profil/' || s.slug,
        'lastmod', s.updated_at,
        'title', s.name,
        'description', left(trim(s.description), 160),
        'image', case when s.logo_url ~ '^https://' and s.logo_url !~* '\.svg($|\?)' then s.logo_url else null end
      ))
      from (
        select
          case
            when a.username ~ '^[A-Za-z0-9][A-Za-z0-9._]{1,30}$' then lower(a.username)
            else public.seo_slug_yap(a.name) || '-' || left(replace(a.id::text, '-', ''), 6)
          end as slug,
          a.updated_at,
          a.name,
          a.description,
          a.logo_url
        from public.agencies a
        where a.status = 'active'
          and length(trim(coalesce(a.description, ''))) >= 40
          and length(trim(coalesce(a.name, ''))) >= 2
        order by a.updated_at desc
        offset (v_sayfa - 1) * 1000 limit 1000
      ) s
      where s.slug is not null and s.slug <> ''
    ), '[]'::jsonb));
  end if;

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
  if v_tip = 'post' then
    select count(*) into v_toplam from public.content_seo
    where content_type = 'post' and is_indexable and not sitemap_blocked and removed_at is null and tier = 1;
    return jsonb_build_object('toplam', v_toplam, 'urls', coalesce((
      select jsonb_agg(jsonb_build_object(
        'loc', 'https://www.tamuso.com' || c.canonical_path,
        'lastmod', c.updated_at,
        'title', coalesce(c.manual_title, c.auto_title),
        'description', left(coalesce(c.manual_description, c.auto_description, ''), 160),
        'image', case
          when s.media_type = 'image' and coalesce(s.media_url, '') ~ '^https://' and s.media_url !~* '\.svg($|\?)'
            then s.media_url else null end,
        'video', case
          when s.media_type = 'video' and coalesce(s.media_url, '') ~ '^https://' then s.media_url else null end,
        'thumb', case
          when coalesce(c.og_image, '') ~ '^https://' and c.og_image !~* '\.(mp4|webm|mov|svg)($|\?)' then c.og_image
          else null end
      ))
      from (
        select content_id, canonical_path, updated_at, manual_title, auto_title, manual_description, auto_description, og_image
        from public.content_seo
        where content_type = 'post' and is_indexable and not sitemap_blocked and removed_at is null and tier = 1
          and canonical_path ~ '^/p/'
        order by updated_at desc
        offset (v_sayfa - 1) * 1000 limit 1000
      ) c
      left join public.status_posts s on s.id = c.content_id
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
        'og_image', c.og_image,
        'oneri', case
          when c.tier = 1 and c.is_indexable then 'tut'
          when c.tier = 3 or c.manual_index = 'hide' then 'gizli'
          when c.index_reason in ('REPORTED_PENDING', 'MODERATION_PENDING', 'REVIEW') then 'incele'
          else 'cikar'
        end,
        'neden_tr', case c.index_reason
          when 'INDEXABLE' then 'Kalite yeterli. Google’da kalsın.'
          when 'MANUAL_INDEX' then 'Yönetici bu sayfanın Google’da kalmasını istedi.'
          when 'MANUAL_NOINDEX' then 'Yönetici bu sayfayı Google’dan çıkardı.'
          when 'MANUAL_HIDE' then 'Yönetici bu sayfayı Google’dan kaldırdı.'
          when 'LOW_QUALITY' then 'Yazı çok kısa. Google’dan çıkar.'
          when 'BELOW_THRESHOLD' then 'Kalite eşiğin altında. Google’dan çıkar.'
          when 'SEARCH_OFF' then 'Yazar aramada görünmek istemiyor.'
          when 'REPORTED_PENDING' then 'Açık bildirim var. Önce incele.'
          when 'MODERATION_PENDING' then 'Moderasyon bekliyor. Önce incele.'
          when 'REVIEW' then 'Otomatik karar net değil. İncele.'
          when 'SPAM' then 'Tekrar veya fazla link. Google’a açılmaz.'
          when 'SENSITIVE_CONTENT' then 'Çocuk güvenliği, şiddet veya kendine zarar. Google’a açılmaz.'
          when 'PRIVATE' then 'Hesap veya paylaşım herkese açık değil.'
          when 'FOLLOWERS_ONLY' then 'Yalnızca takipçilere açık.'
          when 'DELETED' then 'Silinmiş.'
          else 'Bu sayfa Google’a çıkmaz.'
        end
      ) as obj
      from public.content_seo c
      where c.content_type = 'post'
        and (
          p_filtre = 'all'
          or (p_filtre = 'tut' and c.tier = 1 and c.is_indexable)
          or (p_filtre = 'cikar' and c.tier = 2 and c.index_reason in ('LOW_QUALITY', 'BELOW_THRESHOLD', 'SEARCH_OFF', 'MANUAL_NOINDEX'))
          or (p_filtre = 'incele' and c.index_reason in ('REPORTED_PENDING', 'MODERATION_PENDING', 'REVIEW'))
          or (p_filtre = 'gizli' and c.tier = 3)
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
    'keep_posts', (select count(*) from public.content_seo where content_type = 'post' and tier = 1 and is_indexable),
    'weak_posts', (select count(*) from public.content_seo where content_type = 'post' and tier = 2 and index_reason in ('LOW_QUALITY', 'BELOW_THRESHOLD')),
    'review_posts', (select count(*) from public.content_seo where content_type = 'post' and index_reason in ('REPORTED_PENDING', 'MODERATION_PENDING', 'REVIEW')),
    'noindex_posts', (select count(*) from public.content_seo where content_type = 'post' and tier = 2),
    'hidden_posts', (select count(*) from public.content_seo where content_type = 'post' and tier = 3),
    'indexable_profiles', (select count(*) from public.content_seo where content_type = 'profile' and is_indexable),
    'indexable_cities', (
      select count(distinct city_id) from public.content_seo
      where content_type = 'post' and is_indexable and city_id is not null
    ),
    'agency_ready', (
      select count(*) from public.agencies
      where status = 'active' and length(trim(coalesce(description, ''))) >= 40 and length(trim(coalesce(name, ''))) >= 2
    )
  );
end;
$$;

create or replace function public.seo_zayiflari_cikar()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  if not (public.ben_admin_miyim() or public.admin_has_permission('content.seo.manage')) then
    return jsonb_build_object('ok', false, 'adet', 0);
  end if;
  for r in
    select id, content_id from public.content_seo
    where content_type = 'post'
      and tier = 2
      and index_reason in ('LOW_QUALITY', 'BELOW_THRESHOLD')
      and coalesce(manual_index, '') is distinct from 'index'
  loop
    update public.content_seo
      set manual_index = 'hide', sitemap_blocked = true
      where id = r.id;
    perform public.seo_gonderi_yenile(r.content_id);
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'adet', n);
end;
$$;

create or replace function public.seo_ajans_oku(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_row record;
begin
  if v_slug = '' then
    if not exists (
      select 1 from public.agencies a
      where a.status = 'active'
        and length(trim(coalesce(a.description, ''))) >= 40
        and length(trim(coalesce(a.name, ''))) >= 2
    ) then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    return jsonb_build_object(
      'tur', 'agencies',
      'http', 200,
      'robots', 'index,follow',
      'language', 'tr',
      'h1', 'Ajanslar',
      'title', 'Tamuso ajansları',
      'description', 'Herkese açık açıklaması olan Tamuso ajansları.',
      'path', '/ajanslar',
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'title', a.name,
          'path', '/ajans-profil/' || case
            when a.username ~ '^[A-Za-z0-9][A-Za-z0-9._]{1,30}$' then lower(a.username)
            else public.seo_slug_yap(a.name) || '-' || left(replace(a.id::text, '-', ''), 6)
          end
        ))
        from public.agencies a
        where a.status = 'active'
          and length(trim(coalesce(a.description, ''))) >= 40
          and length(trim(coalesce(a.name, ''))) >= 2
      ), '[]'::jsonb)
    );
  end if;

  select
    a.name,
    a.description,
    a.slogan,
    a.country,
    a.logo_url,
    case
      when a.username ~ '^[A-Za-z0-9][A-Za-z0-9._]{1,30}$' then lower(a.username)
      else public.seo_slug_yap(a.name) || '-' || left(replace(a.id::text, '-', ''), 6)
    end as slug
  into v_row
  from public.agencies a
  where a.status = 'active'
    and length(trim(coalesce(a.description, ''))) >= 40
    and length(trim(coalesce(a.name, ''))) >= 2
    and (
      lower(coalesce(a.username, '')) = v_slug
      or (public.seo_slug_yap(a.name) || '-' || left(replace(a.id::text, '-', ''), 6)) = v_slug
    )
  limit 1;

  if not found or v_row.slug is null then
    return jsonb_build_object('durum', 'yok', 'http', 404);
  end if;

  return jsonb_build_object(
    'tur', 'agency',
    'http', 200,
    'robots', 'index,follow',
    'name', v_row.name,
    'title', left(v_row.name, 48) || ' | Tamuso ajans',
    'description', left(trim(v_row.description), 160),
    'slogan', nullif(trim(coalesce(v_row.slogan, '')), ''),
    'country', nullif(trim(coalesce(v_row.country, '')), ''),
    'logo', case when coalesce(v_row.logo_url, '') ~ '^https://' and v_row.logo_url !~* '\.svg($|\?)' then v_row.logo_url else null end,
    'path', '/ajans-profil/' || v_row.slug
  );
end;
$$;

revoke all on function public.seo_sitemap_oku(text, integer) from public;
revoke all on function public.seo_admin_liste(text, integer) from public;
revoke all on function public.seo_admin_ozet() from public;
revoke all on function public.seo_zayiflari_cikar() from public;
revoke all on function public.seo_ajans_oku(text) from public;

grant execute on function public.seo_sitemap_oku(text, integer) to anon, authenticated;
grant execute on function public.seo_admin_liste(text, integer) to authenticated;
grant execute on function public.seo_admin_ozet() to authenticated;
grant execute on function public.seo_zayiflari_cikar() to authenticated;
grant execute on function public.seo_ajans_oku(text) to anon, authenticated;

select public.seo_gonderi_yenile(id) from public.status_posts;
