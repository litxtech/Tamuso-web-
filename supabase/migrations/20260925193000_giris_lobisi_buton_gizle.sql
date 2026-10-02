-- Giriş lobisi: sosyal medya + tüm butonları gizleme (canlı yansıma)

alter table public.giris_lobisi_ayar
  add column if not exists sosyal_medya_gizle boolean not null default false;

alter table public.giris_lobisi_ayar
  add column if not exists tum_butonlar_gizle boolean not null default false;

-- Public get — yeni alanlar
create or replace function public.giris_lobisi_public_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ayar public.giris_lobisi_ayar%rowtype;
  v_medya jsonb;
begin
  select * into v_ayar from public.giris_lobisi_ayar where id = 1;
  if not found then
    insert into public.giris_lobisi_ayar (id) values (1)
    returning * into v_ayar;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'tur', m.tur,
      'public_url', m.public_url,
      'sira', m.sira,
      'created_at', m.created_at
    )
    order by m.sira asc, m.created_at desc
  ), '[]'::jsonb)
  into v_medya
  from public.giris_lobisi_medya m
  where m.aktif = true;

  return jsonb_build_object(
    'ayar', jsonb_build_object(
      'logo_goster', v_ayar.logo_goster,
      'logo_url', v_ayar.logo_url,
      'logo_harf', coalesce(nullif(trim(v_ayar.logo_harf), ''), 'M'),
      'marka_goster', v_ayar.marka_goster,
      'marka_adi', v_ayar.marka_adi,
      'slogan_goster', v_ayar.slogan_goster,
      'slogan', v_ayar.slogan,
      'form_baslik', coalesce(nullif(trim(v_ayar.form_baslik), ''), 'Giriş'),
      'form_alt', v_ayar.form_alt,
      'ust_metin', v_ayar.ust_metin,
      'sosyal_medya_gizle', coalesce(v_ayar.sosyal_medya_gizle, false),
      'tum_butonlar_gizle', coalesce(v_ayar.tum_butonlar_gizle, false),
      'updated_at', v_ayar.updated_at
    ),
    'medya', v_medya
  );
end;
$$;

revoke all on function public.giris_lobisi_public_get() from public;
grant execute on function public.giris_lobisi_public_get() to anon, authenticated;

-- Admin ayar güncelle — yeni alanlar
create or replace function public.admin_giris_lobisi_ayar_guncelle(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.giris_lobisi_ayar%rowtype;
begin
  if v_uid is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  insert into public.giris_lobisi_ayar (id) values (1)
  on conflict (id) do nothing;

  update public.giris_lobisi_ayar set
    logo_goster = coalesce((p_payload->>'logo_goster')::boolean, logo_goster),
    logo_url = case
      when p_payload ? 'logo_url' then nullif(trim(p_payload->>'logo_url'), '')
      else logo_url
    end,
    logo_harf = coalesce(nullif(trim(p_payload->>'logo_harf'), ''), logo_harf),
    marka_goster = coalesce((p_payload->>'marka_goster')::boolean, marka_goster),
    marka_adi = case
      when p_payload ? 'marka_adi' then nullif(trim(p_payload->>'marka_adi'), '')
      else marka_adi
    end,
    slogan_goster = coalesce((p_payload->>'slogan_goster')::boolean, slogan_goster),
    slogan = case
      when p_payload ? 'slogan' then nullif(trim(p_payload->>'slogan'), '')
      else slogan
    end,
    form_baslik = coalesce(
      nullif(trim(p_payload->>'form_baslik'), ''),
      form_baslik,
      'Giriş'
    ),
    form_alt = case
      when p_payload ? 'form_alt' then nullif(trim(p_payload->>'form_alt'), '')
      else form_alt
    end,
    ust_metin = case
      when p_payload ? 'ust_metin' then nullif(trim(p_payload->>'ust_metin'), '')
      else ust_metin
    end,
    sosyal_medya_gizle = coalesce(
      (p_payload->>'sosyal_medya_gizle')::boolean,
      sosyal_medya_gizle
    ),
    tum_butonlar_gizle = coalesce(
      (p_payload->>'tum_butonlar_gizle')::boolean,
      tum_butonlar_gizle
    ),
    guncelleyen = v_uid,
    updated_at = now()
  where id = 1
  returning * into v_row;

  return public.giris_lobisi_public_get();
end;
$$;

revoke all on function public.admin_giris_lobisi_ayar_guncelle(jsonb) from public;
grant execute on function public.admin_giris_lobisi_ayar_guncelle(jsonb) to authenticated;

-- Realtime: giriş lobisindeki cihazlar anında güncellensin
alter table public.giris_lobisi_ayar replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.giris_lobisi_ayar;
  exception when duplicate_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.giris_lobisi_medya;
  exception when duplicate_object then
    null;
  end;
end $$;
