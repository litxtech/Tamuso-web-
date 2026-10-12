-- Şehir, ülke, ses odası ve herkese açık profil sayfalarını Google dizinine açar.
-- Uygulama yolları (/sehir, /ulke, /room, /kullanici) kabuk olarak kalır.
-- Dizin adresleri: /city, /country, /voice, /u

create or replace function public.seo_oda_herkese_acik(r public.rooms)
returns boolean
language sql
stable
as $$
  select r.is_live is true
    and r.ended_at is null
    and coalesce(r.is_locked, false) = false
    and r.mode is distinct from 'private'
    and r.password_hash is null
    and coalesce(r.is_sample, false) = false
    and coalesce(r.room_code, '') ~ '^ODA-[A-Z0-9]{6}$'
    and exists (
      select 1 from public.profiles h
      where h.id = r.host_id
        and h.deleted_at is null
        and h.banned_at is null
    );
$$;

revoke all on function public.seo_oda_herkese_acik(public.rooms) from public, anon, authenticated;

do $mig$
declare
  src text;
begin
  src := pg_get_functiondef('public.seo_profil_yenile(uuid)'::regprocedure);
  if position('elsif v_score >= 80 then' in src) > 0 then
    src := replace(src, 'elsif v_score >= 80 then', 'elsif v_acik then');
    execute src;
  end if;

  src := pg_get_functiondef('public.seo_public_oku(text, text, integer)'::regprocedure);
  if position('select id, name, slug into v_sehir from public.geo_cities where slug = v_slug and is_active;' in src) = 0
     and position('country_code into v_sehir' in src) = 0 then
    raise exception 'sehir secimi bulunamadi';
  end if;
  if position('select id, name, slug into v_sehir from public.geo_cities where slug = v_slug and is_active;' in src) > 0 then
  src := replace(
    src,
    'select id, name, slug into v_sehir from public.geo_cities where slug = v_slug and is_active;',
    'select id, name, slug, country_code into v_sehir from public.geo_cities where slug = v_slug and is_active;'
  );
  src := replace(
    src,
    '''robots'', case when v_sayfa > 1 then ''noindex,follow'' when v_adet > 0 then ''index,follow'' else ''noindex,follow'' end,',
    '''robots'', case when v_sayfa > 1 then ''noindex,follow'' else ''index,follow'' end,'
  );
  if position('when v_sayfa > 1 then ''noindex,follow'' when v_adet > 0' in src) > 0 then
    raise exception 'sehir robot kurali degismedi';
  end if;
  src := replace(
    src,
    '''description'', v_sehir.name || '' şehrindeki herkese açık Tamuso paylaşımları ve profilleri.'',',
    '''description'', v_sehir.name || coalesce('' · '' || (select u.name from public.geo_countries u where u.code = v_sehir.country_code), '''') || '' şehrindeki herkese açık Tamuso paylaşımları, profiller ve ses odaları.'','
    || ' ''country'', (select jsonb_build_object(''name'', u.name, ''path'', ''/country/'' || lower(u.code)) from public.geo_countries u where u.code = v_sehir.country_code and u.is_active),'
    || ' ''rooms'', coalesce((select jsonb_agg(jsonb_build_object(''title'', left(r.title, 80), ''path'', ''/voice/'' || lower(r.room_code)) order by r.created_at desc) from public.rooms r where public.seo_oda_herkese_acik(r) and (exists (select 1 from public.official_city_rooms o where o.room_id = r.id and o.city_id = v_sehir.id) or exists (select 1 from public.profiles h where h.id = r.host_id and h.primary_city_id = v_sehir.id))), ''[]''::jsonb),'
  );
  if position('''country'', (select jsonb_build_object' in src) = 0 then
    raise exception 'sehir ulke alani eklenemedi';
  end if;
  execute src;
  end if;

  src := pg_get_functiondef('public.seo_sitemap_oku(text, integer)'::regprocedure);
  if position('p_tur = ''countries''' in src) = 0 then
  if position('v_tip := case p_tur when ''posts'' then ''post'' when ''profiles'' then ''profile'' when ''cities'' then ''city'' when ''topics'' then ''topic'' else '''' end;' in src) = 0 then
    raise exception 'site haritasi dallanmasi bulunamadi';
  end if;
  src := replace(
    src,
    'v_tip := case p_tur when ''posts'' then ''post'' when ''profiles'' then ''profile'' when ''cities'' then ''city'' when ''topics'' then ''topic'' else '''' end;',
    $ek$if p_tur = 'countries' then
    select count(*) into v_toplam from public.geo_countries c
    where c.is_active and c.code ~ '^[A-Za-z]{2}$' and length(trim(c.name)) >= 2;
    return jsonb_build_object('toplam', v_toplam + 2, 'urls', coalesce((
      select jsonb_agg(jsonb_build_object('loc', u.loc, 'lastmod', u.lastmod) order by u.sira, u.loc)
      from (
        select * from (
          select 'https://www.tamuso.com/countries' as loc, now() as lastmod, 0 as sira
          union all
          select 'https://www.tamuso.com/cities', now(), 1
          union all
          select 'https://www.tamuso.com/country/' || lower(c.code), now(), 2
          from public.geo_countries c
          where c.is_active and c.code ~ '^[A-Za-z]{2}$' and length(trim(c.name)) >= 2
        ) ham
        order by sira, loc
        offset (v_sayfa - 1) * 1000 limit 1000
      ) u
    ), '[]'::jsonb));
  end if;
  if p_tur = 'voices' then
    select count(*) into v_toplam from public.rooms r where public.seo_oda_herkese_acik(r);
    return jsonb_build_object('toplam', v_toplam + 1, 'urls', coalesce((
      select jsonb_agg(jsonb_build_object('loc', u.loc, 'lastmod', u.lastmod, 'title', u.title) order by u.sira, u.loc)
      from (
        select * from (
          select 'https://www.tamuso.com/voices' as loc, now() as lastmod, 'Ses odaları' as title, 0 as sira
          union all
          select 'https://www.tamuso.com/voice/' || lower(r.room_code), coalesce(r.updated_at, r.created_at), left(r.title, 80), 1
          from public.rooms r
          where public.seo_oda_herkese_acik(r)
        ) ham
        order by sira, loc
        offset (v_sayfa - 1) * 1000 limit 1000
      ) u
    ), '[]'::jsonb));
  end if;
  v_tip := case p_tur when 'posts' then 'post' when 'profiles' then 'profile' when 'cities' then 'city' when 'topics' then 'topic' else '' end;$ek$
  );
  src := replace(
    src,
    'select count(*) into v_toplam from (select c.city_id from public.content_seo c where c.content_type = ''post'' and c.is_indexable and c.city_id is not null group by c.city_id) x;',
    'select count(*) into v_toplam from public.geo_cities gc where gc.is_active and gc.slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'';'
  );
  src := replace(
    src,
    $eski$        select gc.slug, max(c.updated_at) as lastmod
        from public.content_seo c
        join public.geo_cities gc on gc.id = c.city_id and gc.is_active
        where c.content_type = 'post' and c.is_indexable and not c.sitemap_blocked
        group by gc.slug
        order by max(c.updated_at) desc$eski$,
    $yeni$        select gc.slug, gc.created_at as lastmod
        from public.geo_cities gc
        where gc.is_active and gc.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        order by gc.name$yeni$
  );
  if position('content_type = ''post'' and c.is_indexable and c.city_id is not null group by c.city_id' in src) > 0 then
    raise exception 'sehir site haritasi degismedi';
  end if;
  if position('max(c.updated_at) as lastmod' in src) > 0 then
    raise exception 'sehir adres listesi degismedi';
  end if;
  execute src;
  end if;
end
$mig$;

create or replace function public.seo_dizin_oku(p_tur text, p_slug text default '', p_sayfa integer default 1)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_slug text := lower(coalesce(p_slug, ''));
  v_ulke public.geo_countries%rowtype;
  v_oda record;
begin
  if p_tur = 'countries' then
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'countries',
      'robots', 'index,follow',
      'h1', 'Ülkeler',
      'title', 'Ülkeler | Tamuso',
      'description', 'Tamuso’daki ülkeler. Her ülke sayfasında o ülkenin şehirleri, herkese açık profilleri ve ses odaları listelenir.',
      'path', '/countries',
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('title', c.name, 'path', '/country/' || lower(c.code)) order by c.sort_order, c.name)
        from public.geo_countries c
        where c.is_active and c.code ~ '^[A-Za-z]{2}$' and length(trim(c.name)) >= 2
      ), '[]'::jsonb)
    );
  end if;

  if p_tur = 'cities' then
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'cities',
      'robots', 'index,follow',
      'h1', 'Şehirler',
      'title', 'Şehirler | Tamuso',
      'description', 'Tamuso’daki şehirler. Şehir sayfasında o şehirdeki herkese açık profiller, paylaşımlar ve ses odaları yer alır.',
      'path', '/cities',
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'title', gc.name || coalesce(' · ' || u.name, ''),
          'path', '/city/' || gc.slug
        ) order by u.name, gc.name)
        from public.geo_cities gc
        left join public.geo_countries u on u.code = gc.country_code
        where gc.is_active and gc.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      ), '[]'::jsonb)
    );
  end if;

  if p_tur = 'voices' then
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'voices',
      'robots', 'index,follow',
      'h1', 'Ses odaları',
      'title', 'Ses odaları | Tamuso',
      'description', 'Tamuso’da şu an herkese açık canlı ses odaları. Kilitli, gizli ve örnek odalar listelenmez.',
      'path', '/voices',
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('title', left(r.title, 80), 'path', '/voice/' || lower(r.room_code)) order by r.created_at desc)
        from public.rooms r
        where public.seo_oda_herkese_acik(r)
      ), '[]'::jsonb)
    );
  end if;

  if p_tur = 'country' then
    if v_slug !~ '^[a-z]{2}$' then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    select * into v_ulke from public.geo_countries c
    where lower(c.code) = v_slug and c.is_active and length(trim(c.name)) >= 2;
    if not found then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'country',
      'robots', 'index,follow',
      'name', v_ulke.name,
      'path', '/country/' || lower(v_ulke.code),
      'title', v_ulke.name || ' | Tamuso',
      'description', v_ulke.name || ' ülkesindeki Tamuso şehirleri, herkese açık profiller ve ses odaları.',
      'cities', coalesce((
        select jsonb_agg(jsonb_build_object('title', gc.name, 'path', '/city/' || gc.slug) order by gc.name)
        from public.geo_cities gc
        where gc.country_code = v_ulke.code and gc.is_active and gc.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      ), '[]'::jsonb),
      'people', coalesce((
        select jsonb_agg(x.obj) from (
          select jsonb_build_object('title', coalesce(nullif(trim(p.display_name), ''), c.slug), 'path', '/u/' || c.slug) as obj
          from public.content_seo c
          join public.profiles p on p.id = c.content_id
          where c.content_type = 'profile' and c.is_indexable and c.removed_at is null and c.tier = 1
            and p.deleted_at is null and p.banned_at is null
            and (
              upper(coalesce(p.country_code, '')) = v_ulke.code
              or exists (
                select 1 from public.geo_cities gc
                where gc.id = p.primary_city_id and gc.country_code = v_ulke.code
              )
            )
          order by c.updated_at desc
          limit 24
        ) x
      ), '[]'::jsonb),
      'rooms', coalesce((
        select jsonb_agg(jsonb_build_object('title', left(r.title, 80), 'path', '/voice/' || lower(r.room_code)) order by r.created_at desc)
        from public.rooms r
        join public.profiles h on h.id = r.host_id
        where public.seo_oda_herkese_acik(r)
          and (
            upper(coalesce(h.country_code, '')) = v_ulke.code
            or exists (
              select 1 from public.geo_cities gc
              where gc.id = h.primary_city_id and gc.country_code = v_ulke.code
            )
            or exists (
              select 1 from public.official_city_rooms o
              join public.geo_cities gc on gc.id = o.city_id
              where o.room_id = r.id and gc.country_code = v_ulke.code
            )
          )
      ), '[]'::jsonb)
    );
  end if;

  if p_tur = 'voice' then
    if v_slug !~ '^oda-[a-z0-9]{6}$' then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    select r.title, r.topic, r.room_code, r.cover_url, h.display_name, h.username, h.primary_city_id, h.country_code
      into v_oda
    from public.rooms r
    join public.profiles h on h.id = r.host_id
    where r.room_code = upper(v_slug)
      and public.seo_oda_herkese_acik(r);
    if not found then
      return jsonb_build_object('durum', 'yok', 'http', 404);
    end if;
    return jsonb_build_object(
      'durum', 'ok', 'http', 200, 'tur', 'voice',
      'robots', 'index,follow',
      'h1', left(v_oda.title, 80),
      'name', left(v_oda.title, 80),
      'path', '/voice/' || lower(v_oda.room_code),
      'title', left(v_oda.title, 48) || ' | Tamuso',
      'description', left(trim(v_oda.title) || ' Tamuso’da herkese açık bir ses odasıdır.' || coalesce(' Konu: ' || nullif(trim(v_oda.topic), ''), ''), 160),
      'topic', nullif(left(trim(coalesce(v_oda.topic, '')), 160), ''),
      'image', case
        when coalesce(v_oda.cover_url, '') ~ '^https://' and v_oda.cover_url !~* '\.svg($|\?)' then v_oda.cover_url
        else null
      end,
      'host', (
        select jsonb_build_object(
          'name', coalesce(nullif(trim(p.display_name), ''), c.slug),
          'path', '/u/' || c.slug
        )
        from public.content_seo c
        join public.profiles p on p.id = c.content_id
        where c.content_type = 'profile' and c.slug = lower(coalesce(v_oda.username, ''))
          and c.is_indexable and c.removed_at is null and c.tier = 1
        limit 1
      ),
      'city', (
        select jsonb_build_object('name', gc.name, 'path', '/city/' || gc.slug)
        from public.geo_cities gc
        where gc.id = v_oda.primary_city_id and gc.is_active
      ),
      'country', (
        select jsonb_build_object('name', u.name, 'path', '/country/' || lower(u.code))
        from public.geo_countries u
        where u.code = coalesce(
          v_oda.country_code,
          (select gc.country_code from public.geo_cities gc where gc.id = v_oda.primary_city_id)
        ) and u.is_active
      )
    );
  end if;

  return jsonb_build_object('durum', 'yok', 'http', 404);
end;
$$;

revoke all on function public.seo_dizin_oku(text, text, integer) from public;
grant execute on function public.seo_dizin_oku(text, text, integer) to anon, authenticated;

do $yenile$
declare
  r record;
begin
  for r in select id from public.profiles where deleted_at is null loop
    perform public.seo_profil_yenile(r.id);
  end loop;
end
$yenile$;
