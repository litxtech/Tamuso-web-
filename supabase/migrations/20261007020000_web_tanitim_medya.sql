-- Web tanıtım videoları. Anasayfa ve giriş lobisi ayrı ayrı açılır.
-- security definer + ben_admin_miyim: bu projedeki admin RPC kalıbı.

create table if not exists public.web_tanitim_medya (
  id uuid primary key default gen_random_uuid(),
  tur text not null default 'video' check (tur in ('video', 'image')),
  public_url text not null,
  storage_path text,
  mime_type text,
  baslik text,
  anasayfa boolean not null default true,
  lobi boolean not null default false,
  sira integer not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists web_tanitim_medya_aktif_idx
  on public.web_tanitim_medya (aktif, sira, created_at);

alter table public.web_tanitim_medya enable row level security;

revoke all on table public.web_tanitim_medya from public, anon, authenticated;

insert into public.web_tanitim_medya (tur, public_url, baslik, anasayfa, lobi, sira)
select v.tur, v.public_url, v.baslik, v.anasayfa, v.lobi, v.sira
from (
  values
    ('video'::text, '/tanitim/gorusme.mp4', 'Görüntülü görüşme', true, false, 10),
    ('video', '/tanitim/canli.mp4', 'Canlı yayın', true, false, 20),
    ('video', '/tanitim/arkadas.mp4', 'Arkadaş bul', true, false, 30)
) as v(tur, public_url, baslik, anasayfa, lobi, sira)
where not exists (select 1 from public.web_tanitim_medya);

create or replace function public.web_tanitim_medya_public(p_yer text default 'anasayfa')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yer text := case when p_yer = 'lobi' then 'lobi' else 'anasayfa' end;
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'tur', m.tur,
      'public_url', m.public_url,
      'baslik', m.baslik,
      'sira', m.sira
    ) order by m.sira, m.created_at)
    from public.web_tanitim_medya m
    where m.aktif
      and (
        (v_yer = 'anasayfa' and m.anasayfa)
        or (v_yer = 'lobi' and m.lobi)
      )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.web_tanitim_medya_public(text) from public;
grant execute on function public.web_tanitim_medya_public(text) to anon, authenticated;

create or replace function public.admin_web_tanitim_medya_listele()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(m) order by m.sira, m.created_at)
    from public.web_tanitim_medya m
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_web_tanitim_medya_listele() from public;
grant execute on function public.admin_web_tanitim_medya_listele() to authenticated;

create or replace function public.admin_web_tanitim_medya_ekle(
  p_tur text,
  p_public_url text,
  p_storage_path text default null,
  p_mime_type text default null,
  p_baslik text default null,
  p_anasayfa boolean default true,
  p_lobi boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  if p_tur not in ('video', 'image') then
    raise exception 'Invalid tur';
  end if;
  if nullif(trim(p_public_url), '') is null then
    raise exception 'public_url required';
  end if;
  insert into public.web_tanitim_medya (
    tur, public_url, storage_path, mime_type, baslik, anasayfa, lobi, sira
  ) values (
    p_tur,
    trim(p_public_url),
    nullif(trim(coalesce(p_storage_path, '')), ''),
    nullif(trim(coalesce(p_mime_type, '')), ''),
    nullif(trim(coalesce(p_baslik, '')), ''),
    coalesce(p_anasayfa, true),
    coalesce(p_lobi, false),
    coalesce((select max(sira) + 10 from public.web_tanitim_medya), 10)
  );
  return public.admin_web_tanitim_medya_listele();
end;
$$;

revoke all on function public.admin_web_tanitim_medya_ekle(text, text, text, text, text, boolean, boolean) from public;
grant execute on function public.admin_web_tanitim_medya_ekle(text, text, text, text, text, boolean, boolean) to authenticated;

create or replace function public.admin_web_tanitim_medya_guncelle(
  p_id uuid,
  p_anasayfa boolean,
  p_lobi boolean,
  p_aktif boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  update public.web_tanitim_medya
  set anasayfa = p_anasayfa,
      lobi = p_lobi,
      aktif = p_aktif
  where id = p_id;
  return public.admin_web_tanitim_medya_listele();
end;
$$;

revoke all on function public.admin_web_tanitim_medya_guncelle(uuid, boolean, boolean, boolean) from public;
grant execute on function public.admin_web_tanitim_medya_guncelle(uuid, boolean, boolean, boolean) to authenticated;

create or replace function public.admin_web_tanitim_medya_sil(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  delete from public.web_tanitim_medya where id = p_id;
  return public.admin_web_tanitim_medya_listele();
end;
$$;

revoke all on function public.admin_web_tanitim_medya_sil(uuid) from public;
grant execute on function public.admin_web_tanitim_medya_sil(uuid) to authenticated;
