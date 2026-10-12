-- SEO anahtar kelime merkezi. Taslak onaysız sayfa açmaz.
-- Politika yolları hedef olamaz. Yayın yalnızca izinli pazarlama yollarına yazılır.

create table if not exists public.seo_anahtar_kelime (
  id uuid primary key default gen_random_uuid(),
  ifade text not null,
  ifade_anahtar text not null,
  dil text not null default 'tr' check (dil in ('tr', 'en', 'de', 'es', 'ar', 'ru')),
  kategori text not null default 'genel',
  niyet text not null default 'bilgi',
  hedef_yol text,
  aktif boolean not null default true,
  durum text not null default 'taslak' check (durum in ('taslak', 'incelemede', 'yayinda', 'arsiv')),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ifade_anahtar, dil)
);

create table if not exists public.seo_anahtar_oneri (
  id uuid primary key default gen_random_uuid(),
  kelime_id uuid not null references public.seo_anahtar_kelime(id) on delete cascade,
  hedef_yol text not null default '',
  alan text not null check (alan in ('title', 'description', 'h1', 'h2', 'intro', 'faq', 'link')),
  onceki text not null default '',
  onerilen text not null,
  durum text not null default 'taslak' check (durum in ('taslak', 'incelemede', 'yayinda', 'arsiv')),
  uyari text not null default '',
  yeni_sayfa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seo_sayfa_yayin (
  yol text primary key,
  title text,
  description text,
  h1 text,
  h2 text,
  intro text,
  faq text,
  link_metin text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  check (yol ~ '^/[a-z0-9/_-]*$')
);

create table if not exists public.seo_anahtar_gecmis (
  id uuid primary key default gen_random_uuid(),
  yol text not null,
  alan text not null,
  eski text,
  yeni text,
  islem text not null check (islem in ('yayin', 'geri_al', 'arsiv')),
  kelime_id uuid,
  actor uuid,
  created_at timestamptz not null default now()
);

create index if not exists seo_anahtar_oneri_kelime_idx on public.seo_anahtar_oneri (kelime_id, durum);
create index if not exists seo_anahtar_gecmis_yol_idx on public.seo_anahtar_gecmis (yol, created_at desc);

alter table public.seo_anahtar_kelime enable row level security;
alter table public.seo_anahtar_oneri enable row level security;
alter table public.seo_sayfa_yayin enable row level security;
alter table public.seo_anahtar_gecmis enable row level security;

revoke all on table public.seo_anahtar_kelime from public, anon, authenticated;
revoke all on table public.seo_anahtar_oneri from public, anon, authenticated;
revoke all on table public.seo_sayfa_yayin from public, anon, authenticated;
revoke all on table public.seo_anahtar_gecmis from public, anon, authenticated;

create or replace function public.seo_anahtar_normalize(p_metin text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    regexp_replace(
      regexp_replace(lower(replace(replace(coalesce(p_metin, ''), 'İ', 'i'), 'I', 'ı')), '<[^>]*>', ' ', 'g'),
      '[^a-z0-9çğıöşüâîû\s]', ' ', 'g'),
    '\s+', ' ', 'g'));
$$;

create or replace function public.seo_metin_guvenli(p_metin text, p_sinir integer)
returns text
language sql
immutable
as $$
  select left(trim(regexp_replace(regexp_replace(coalesce(p_metin, ''), '<[^>]*>', ' ', 'g'), '[[:cntrl:]]', ' ', 'g')), greatest(p_sinir, 1));
$$;

create or replace function public.seo_hedef_izinli(p_yol text)
returns boolean
language sql
immutable
as $$
  select p_yol in (
    '/', '/tanitim', '/tanitim/ozellikler', '/tanitim/coinler', '/tanitim/meyve',
    '/tanitim/hakkinda', '/tanitim/isbirligi', '/blog', '/cities', '/countries',
    '/voices', '/people', '/discover'
  );
$$;

create or replace function public.seo_anahtar_gorebilir()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ben_admin_miyim()
    or public.admin_has_permission('content.seo.view')
    or public.admin_has_permission('content.seo.keywords.view')
    or public.admin_has_permission('content.seo.manage')
    or public.admin_has_permission('content.seo.keywords.publish');
$$;

create or replace function public.seo_anahtar_yayinlayabilir()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ben_admin_miyim()
    or public.admin_has_permission('content.seo.manage')
    or public.admin_has_permission('content.seo.keywords.publish');
$$;

create or replace function public.seo_anahtar_liste(p_arama text default '')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ara text := public.seo_anahtar_normalize(coalesce(p_arama, ''));
begin
  if not public.seo_anahtar_gorebilir() then
    return jsonb_build_object('ok', false, 'hata', 'yetkisiz');
  end if;
  return jsonb_build_object('ok', true, 'satirlar', coalesce((
    select jsonb_agg(x.obj) from (
      select jsonb_build_object(
        'id', k.id,
        'ifade', k.ifade,
        'dil', k.dil,
        'kategori', k.kategori,
        'niyet', k.niyet,
        'hedef_yol', k.hedef_yol,
        'aktif', k.aktif,
        'durum', k.durum,
        'updated_at', k.updated_at
      ) as obj
      from public.seo_anahtar_kelime k
      where k.durum <> 'arsiv'
        and (v_ara = '' or k.ifade_anahtar like '%' || v_ara || '%')
      order by k.updated_at desc
      limit 80
    ) x
  ), '[]'::jsonb));
end;
$$;

create or replace function public.seo_anahtar_kaydet(p_paket jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ifade text := public.seo_metin_guvenli(p_paket->>'ifade', 80);
  v_anahtar text := public.seo_anahtar_normalize(v_ifade);
  v_dil text := coalesce(nullif(p_paket->>'dil', ''), 'tr');
  v_yol text := coalesce(p_paket->>'hedef_yol', '');
  v_id uuid;
  v_oneri jsonb;
  v_uid uuid := auth.uid();
begin
  if not public.seo_anahtar_gorebilir() then
    return jsonb_build_object('ok', false, 'hata', 'yetkisiz');
  end if;
  if char_length(v_anahtar) < 2 then
    return jsonb_build_object('ok', false, 'hata', 'kelime kisa');
  end if;
  if v_dil not in ('tr', 'en', 'de', 'es', 'ar', 'ru') then
    v_dil := 'tr';
  end if;
  if v_yol <> '' and not public.seo_hedef_izinli(v_yol) then
    return jsonb_build_object('ok', false, 'hata', 'hedef sayfa izinli degil');
  end if;
  insert into public.seo_anahtar_kelime (
    ifade, ifade_anahtar, dil, kategori, niyet, hedef_yol, aktif, durum, created_by, updated_by
  ) values (
    v_ifade,
    v_anahtar,
    v_dil,
    left(coalesce(nullif(p_paket->>'kategori', ''), 'genel'), 24),
    left(coalesce(nullif(p_paket->>'niyet', ''), 'bilgi'), 24),
    nullif(v_yol, ''),
    coalesce((p_paket->>'aktif')::boolean, true),
    'taslak',
    v_uid,
    v_uid
  )
  on conflict (ifade_anahtar, dil) do update set
    kategori = excluded.kategori,
    niyet = excluded.niyet,
    hedef_yol = coalesce(excluded.hedef_yol, public.seo_anahtar_kelime.hedef_yol),
    aktif = excluded.aktif,
    durum = case when public.seo_anahtar_kelime.durum = 'arsiv' then 'taslak' else public.seo_anahtar_kelime.durum end,
    updated_by = v_uid,
    updated_at = now()
  returning id into v_id;

  if jsonb_typeof(p_paket->'oneriler') = 'array' then
    delete from public.seo_anahtar_oneri
    where kelime_id = v_id and durum in ('taslak', 'incelemede');
    for v_oneri in select value from jsonb_array_elements(p_paket->'oneriler') loop
      if coalesce(v_oneri->>'alan', '') not in ('title', 'description', 'h1', 'h2', 'intro', 'faq', 'link') then
        continue;
      end if;
      if coalesce(v_oneri->>'hedef_yol', '') <> '' and not public.seo_hedef_izinli(v_oneri->>'hedef_yol') then
        continue;
      end if;
      if public.seo_metin_guvenli(v_oneri->>'onerilen', 500) = '' then
        continue;
      end if;
      insert into public.seo_anahtar_oneri (
        kelime_id, hedef_yol, alan, onceki, onerilen, durum, uyari, yeni_sayfa
      ) values (
        v_id,
        coalesce(v_oneri->>'hedef_yol', ''),
        v_oneri->>'alan',
        public.seo_metin_guvenli(v_oneri->>'onceki', 300),
        public.seo_metin_guvenli(v_oneri->>'onerilen', 500),
        'taslak',
        public.seo_metin_guvenli(v_oneri->>'uyari', 300),
        coalesce((v_oneri->>'yeni_sayfa')::boolean, false)
      );
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.seo_anahtar_oneri_getir(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.seo_anahtar_gorebilir() then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object('ok', true, 'oneriler', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id,
      'hedef_yol', o.hedef_yol,
      'alan', o.alan,
      'onceki', o.onceki,
      'onerilen', o.onerilen,
      'durum', o.durum,
      'uyari', o.uyari,
      'yeni_sayfa', o.yeni_sayfa
    ) order by o.created_at)
    from public.seo_anahtar_oneri o
    where o.kelime_id = p_id and o.durum <> 'arsiv'
  ), '[]'::jsonb));
end;
$$;

create or replace function public.seo_anahtar_yayinla(p_idler uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oneri public.seo_anahtar_oneri%rowtype;
  v_uid uuid := auth.uid();
  v_eski text;
  v_adet int := 0;
  v_uyari text := '';
begin
  if not public.seo_anahtar_yayinlayabilir() then
    return jsonb_build_object('ok', false, 'hata', 'yetkisiz');
  end if;
  if p_idler is null or cardinality(p_idler) = 0 or cardinality(p_idler) > 40 then
    return jsonb_build_object('ok', false, 'hata', 'secim yok');
  end if;
  for v_oneri in
    select * from public.seo_anahtar_oneri
    where id = any(p_idler) and durum in ('taslak', 'incelemede')
  loop
    if v_oneri.yeni_sayfa or v_oneri.hedef_yol = '' or not public.seo_hedef_izinli(v_oneri.hedef_yol) then
      v_uyari := 'Yeni veya izinsiz sayfa yayınlanmadı.';
      continue;
    end if;
    insert into public.seo_sayfa_yayin (yol, updated_by)
    values (v_oneri.hedef_yol, v_uid)
    on conflict (yol) do nothing;
    if v_oneri.alan = 'title' then
      select title into v_eski from public.seo_sayfa_yayin where yol = v_oneri.hedef_yol;
      update public.seo_sayfa_yayin set title = v_oneri.onerilen, updated_by = v_uid, updated_at = now() where yol = v_oneri.hedef_yol;
    elsif v_oneri.alan = 'description' then
      select description into v_eski from public.seo_sayfa_yayin where yol = v_oneri.hedef_yol;
      update public.seo_sayfa_yayin set description = v_oneri.onerilen, updated_by = v_uid, updated_at = now() where yol = v_oneri.hedef_yol;
    elsif v_oneri.alan = 'h1' then
      select h1 into v_eski from public.seo_sayfa_yayin where yol = v_oneri.hedef_yol;
      update public.seo_sayfa_yayin set h1 = v_oneri.onerilen, updated_by = v_uid, updated_at = now() where yol = v_oneri.hedef_yol;
    elsif v_oneri.alan = 'h2' then
      select h2 into v_eski from public.seo_sayfa_yayin where yol = v_oneri.hedef_yol;
      update public.seo_sayfa_yayin set h2 = v_oneri.onerilen, updated_by = v_uid, updated_at = now() where yol = v_oneri.hedef_yol;
    elsif v_oneri.alan = 'intro' then
      select intro into v_eski from public.seo_sayfa_yayin where yol = v_oneri.hedef_yol;
      update public.seo_sayfa_yayin set intro = v_oneri.onerilen, updated_by = v_uid, updated_at = now() where yol = v_oneri.hedef_yol;
    elsif v_oneri.alan = 'faq' then
      select faq into v_eski from public.seo_sayfa_yayin where yol = v_oneri.hedef_yol;
      update public.seo_sayfa_yayin set faq = v_oneri.onerilen, updated_by = v_uid, updated_at = now() where yol = v_oneri.hedef_yol;
    elsif v_oneri.alan = 'link' then
      select link_metin into v_eski from public.seo_sayfa_yayin where yol = v_oneri.hedef_yol;
      update public.seo_sayfa_yayin set link_metin = v_oneri.onerilen, updated_by = v_uid, updated_at = now() where yol = v_oneri.hedef_yol;
    end if;
    if v_eski is not null and v_eski is distinct from v_oneri.onerilen and v_uyari = '' then
      v_uyari := 'Bu alanda önceki yayın vardı. Geri alma geçmişte durur.';
    end if;
    insert into public.seo_anahtar_gecmis (yol, alan, eski, yeni, islem, kelime_id, actor)
    values (v_oneri.hedef_yol, v_oneri.alan, coalesce(v_eski, nullif(v_oneri.onceki, '')), v_oneri.onerilen, 'yayin', v_oneri.kelime_id, v_uid);
    update public.seo_anahtar_oneri set durum = 'yayinda', updated_at = now() where id = v_oneri.id;
    update public.seo_anahtar_kelime set durum = 'yayinda', updated_by = v_uid, updated_at = now() where id = v_oneri.kelime_id;
    v_adet := v_adet + 1;
  end loop;
  return jsonb_build_object('ok', true, 'adet', v_adet, 'uyari', v_uyari);
end;
$$;

create or replace function public.seo_anahtar_geri_al(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_satir public.seo_anahtar_gecmis%rowtype;
  v_uid uuid := auth.uid();
  v_simdi text;
begin
  if not public.seo_anahtar_yayinlayabilir() then
    return jsonb_build_object('ok', false, 'hata', 'yetkisiz');
  end if;
  select * into v_satir from public.seo_anahtar_gecmis where id = p_id;
  if not found or not public.seo_hedef_izinli(v_satir.yol) then
    return jsonb_build_object('ok', false, 'hata', 'kayit yok');
  end if;
  if v_satir.alan = 'title' then
    select title into v_simdi from public.seo_sayfa_yayin where yol = v_satir.yol;
    update public.seo_sayfa_yayin set title = v_satir.eski, updated_by = v_uid, updated_at = now() where yol = v_satir.yol;
  elsif v_satir.alan = 'description' then
    select description into v_simdi from public.seo_sayfa_yayin where yol = v_satir.yol;
    update public.seo_sayfa_yayin set description = v_satir.eski, updated_by = v_uid, updated_at = now() where yol = v_satir.yol;
  elsif v_satir.alan = 'h1' then
    select h1 into v_simdi from public.seo_sayfa_yayin where yol = v_satir.yol;
    update public.seo_sayfa_yayin set h1 = v_satir.eski, updated_by = v_uid, updated_at = now() where yol = v_satir.yol;
  elsif v_satir.alan = 'h2' then
    select h2 into v_simdi from public.seo_sayfa_yayin where yol = v_satir.yol;
    update public.seo_sayfa_yayin set h2 = v_satir.eski, updated_by = v_uid, updated_at = now() where yol = v_satir.yol;
  elsif v_satir.alan = 'intro' then
    select intro into v_simdi from public.seo_sayfa_yayin where yol = v_satir.yol;
    update public.seo_sayfa_yayin set intro = v_satir.eski, updated_by = v_uid, updated_at = now() where yol = v_satir.yol;
  elsif v_satir.alan = 'faq' then
    select faq into v_simdi from public.seo_sayfa_yayin where yol = v_satir.yol;
    update public.seo_sayfa_yayin set faq = v_satir.eski, updated_by = v_uid, updated_at = now() where yol = v_satir.yol;
  elsif v_satir.alan = 'link' then
    select link_metin into v_simdi from public.seo_sayfa_yayin where yol = v_satir.yol;
    update public.seo_sayfa_yayin set link_metin = v_satir.eski, updated_by = v_uid, updated_at = now() where yol = v_satir.yol;
  else
    return jsonb_build_object('ok', false, 'hata', 'alan yok');
  end if;
  insert into public.seo_anahtar_gecmis (yol, alan, eski, yeni, islem, kelime_id, actor)
  values (v_satir.yol, v_satir.alan, v_simdi, v_satir.eski, 'geri_al', v_satir.kelime_id, v_uid);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.seo_anahtar_durum(p_id uuid, p_islem text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if p_islem = 'pasif' or p_islem = 'aktif' then
    if not public.seo_anahtar_gorebilir() then
      return jsonb_build_object('ok', false, 'hata', 'yetkisiz');
    end if;
    update public.seo_anahtar_kelime
      set aktif = (p_islem = 'aktif'), updated_by = v_uid, updated_at = now()
      where id = p_id and durum <> 'arsiv';
    return jsonb_build_object('ok', true);
  end if;
  if p_islem = 'sil' then
    if not public.seo_anahtar_yayinlayabilir() then
      return jsonb_build_object('ok', false, 'hata', 'yetkisiz');
    end if;
    update public.seo_anahtar_kelime
      set durum = 'arsiv', aktif = false, updated_by = v_uid, updated_at = now()
      where id = p_id;
    update public.seo_anahtar_oneri set durum = 'arsiv', updated_at = now()
      where kelime_id = p_id and durum <> 'yayinda';
    insert into public.seo_anahtar_gecmis (yol, alan, eski, yeni, islem, kelime_id, actor)
    select coalesce(hedef_yol, '/'), 'arsiv', ifade, null, 'arsiv', id, v_uid
    from public.seo_anahtar_kelime where id = p_id;
    return jsonb_build_object('ok', true);
  end if;
  return jsonb_build_object('ok', false, 'hata', 'islem yok');
end;
$$;

create or replace function public.seo_anahtar_gecmis_liste()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.seo_anahtar_gorebilir() then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object('ok', true, 'satirlar', coalesce((
    select jsonb_agg(x.obj) from (
      select jsonb_build_object(
        'id', g.id,
        'yol', g.yol,
        'alan', g.alan,
        'eski', g.eski,
        'yeni', g.yeni,
        'islem', g.islem,
        'created_at', g.created_at
      ) as obj
      from public.seo_anahtar_gecmis g
      order by g.created_at desc
      limit 40
    ) x
  ), '[]'::jsonb));
end;
$$;

create or replace function public.seo_sayfa_yayin_oku()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'yol', y.yol,
    'title', y.title,
    'description', y.description,
    'h1', y.h1,
    'h2', y.h2,
    'intro', y.intro,
    'faq', y.faq
  )), '[]'::jsonb)
  from public.seo_sayfa_yayin y
  where public.seo_hedef_izinli(y.yol);
$$;

revoke all on function public.seo_anahtar_normalize(text) from public, anon, authenticated;
revoke all on function public.seo_metin_guvenli(text, integer) from public, anon, authenticated;
revoke all on function public.seo_hedef_izinli(text) from public, anon, authenticated;
revoke all on function public.seo_anahtar_liste(text) from public;
revoke all on function public.seo_anahtar_kaydet(jsonb) from public;
revoke all on function public.seo_anahtar_oneri_getir(uuid) from public;
revoke all on function public.seo_anahtar_yayinla(uuid[]) from public;
revoke all on function public.seo_anahtar_geri_al(uuid) from public;
revoke all on function public.seo_anahtar_durum(uuid, text) from public;
revoke all on function public.seo_anahtar_gecmis_liste() from public;
revoke all on function public.seo_sayfa_yayin_oku() from public;
revoke all on function public.seo_anahtar_gorebilir() from public, anon, authenticated;
revoke all on function public.seo_anahtar_yayinlayabilir() from public, anon, authenticated;

grant execute on function public.seo_anahtar_liste(text) to authenticated;
grant execute on function public.seo_anahtar_kaydet(jsonb) to authenticated;
grant execute on function public.seo_anahtar_oneri_getir(uuid) to authenticated;
grant execute on function public.seo_anahtar_yayinla(uuid[]) to authenticated;
grant execute on function public.seo_anahtar_geri_al(uuid) to authenticated;
grant execute on function public.seo_anahtar_durum(uuid, text) to authenticated;
grant execute on function public.seo_anahtar_gecmis_liste() to authenticated;
grant execute on function public.seo_sayfa_yayin_oku() to anon, authenticated;

insert into public.admin_permission_catalog
  (permission_key, label, description, category, risk, module_href, sort_order)
values
  ('content.seo.keywords.view', 'SEO anahtar gor', 'Anahtar kelime taslak ve onizleme', 'CONTENT', 'LOW', '/admin/seo-anahtar', 288),
  ('content.seo.keywords.publish', 'SEO anahtar yayinla', 'Onayli SEO metnini yayinlar ve geri alir', 'CONTENT', 'MEDIUM', '/admin/seo-anahtar', 289)
on conflict (permission_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  risk = excluded.risk,
  module_href = excluded.module_href,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.admin_role_permissions (role_code, permission_code)
select 'SUPER_ADMIN', x from unnest(array['content.seo.keywords.view', 'content.seo.keywords.publish']) as x
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code)
select 'CONTENT_ADMIN', x from unnest(array['content.seo.keywords.view', 'content.seo.keywords.publish']) as x
on conflict do nothing;

insert into public.admin_role_permissions (role_code, permission_code)
select 'READ_ONLY_ADMIN', 'content.seo.keywords.view'
on conflict do nothing;
