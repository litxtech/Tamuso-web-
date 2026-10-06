-- Web ziyaret sayacı.
-- Aynı IP veya aynı cihaz, İstanbul gününde bir kez ve ayında bir kez sayılır.
-- Ham IP ve cihaz kimliği saklanmaz; yalnız tuzlu özet tutulur.

create table if not exists public.web_ziyaret_kimlik (
  donem text not null check (donem in ('gun', 'ay')),
  donem_anahtar date not null,
  tur text not null check (tur in ('ip', 'cihaz')),
  kimlik_hash text not null,
  olusturulma timestamptz not null default now(),
  primary key (donem, donem_anahtar, tur, kimlik_hash)
);

create table if not exists public.web_ziyaret_sayac (
  donem text not null check (donem in ('gun', 'ay')),
  donem_anahtar date not null,
  adet integer not null default 0 check (adet >= 0),
  primary key (donem, donem_anahtar)
);

alter table public.web_ziyaret_kimlik enable row level security;
alter table public.web_ziyaret_sayac enable row level security;

revoke all on table public.web_ziyaret_kimlik from public, anon, authenticated;
revoke all on table public.web_ziyaret_sayac from public, anon, authenticated;

create or replace function public.web_ziyaret_ozet_hash(p_deger text)
returns text
language sql
immutable
as $$
  select encode(
    extensions.digest(
      convert_to(p_deger || '|tamuso-web-ziyaret-v1', 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.web_ziyaret_ozet_hash(text) from public, anon, authenticated;

create or replace function public.web_ziyaret_donem_isle(
  p_donem text,
  p_anahtar date,
  p_ip_hash text,
  p_cihaz_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yeni integer;
begin
  with eklenen as (
    insert into public.web_ziyaret_kimlik (donem, donem_anahtar, tur, kimlik_hash)
    values
      (p_donem, p_anahtar, 'ip', p_ip_hash),
      (p_donem, p_anahtar, 'cihaz', p_cihaz_hash)
    on conflict do nothing
    returning 1
  )
  select count(*)::integer into v_yeni from eklenen;

  if v_yeni = 2 then
    insert into public.web_ziyaret_sayac (donem, donem_anahtar, adet)
    values (p_donem, p_anahtar, 1)
    on conflict (donem, donem_anahtar)
    do update set adet = public.web_ziyaret_sayac.adet + 1;
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.web_ziyaret_donem_isle(text, date, text, text) from public, anon, authenticated;

create or replace function public.web_ziyaret_kaydet(p_cihaz text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_ip text;
  v_ua text;
  v_cihaz text;
  v_simdi timestamp;
  v_gun date;
  v_ay date;
  v_ip_hash text;
  v_cihaz_hash text;
  v_gunluk boolean;
  v_aylik boolean;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ua := lower(coalesce(v_headers->>'user-agent', ''));
  if v_ua ~ '(bot|spider|crawler|slurp|preview|facebookexternalhit|whatsapp|telegrambot|headless)' then
    return jsonb_build_object('ok', true, 'sayildi', false, 'neden', 'bot');
  end if;

  v_ip := nullif(btrim(coalesce(
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-real-ip',
    split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)
  )), '');
  v_cihaz := nullif(btrim(coalesce(p_cihaz, '')), '');

  if v_ip is null or length(v_ip) > 64 then
    return jsonb_build_object('ok', true, 'sayildi', false, 'neden', 'ip_yok');
  end if;
  if v_cihaz is null
     or length(v_cihaz) < 8
     or length(v_cihaz) > 128
     or v_cihaz !~ '^[A-Za-z0-9_.:-]+$' then
    return jsonb_build_object('ok', false, 'sayildi', false, 'neden', 'cihaz');
  end if;

  v_simdi := now() at time zone 'Europe/Istanbul';
  v_gun := v_simdi::date;
  v_ay := date_trunc('month', v_simdi)::date;
  v_ip_hash := public.web_ziyaret_ozet_hash('ip:' || lower(v_ip));
  v_cihaz_hash := public.web_ziyaret_ozet_hash('cihaz:' || v_cihaz);

  v_gunluk := public.web_ziyaret_donem_isle('gun', v_gun, v_ip_hash, v_cihaz_hash);
  v_aylik := public.web_ziyaret_donem_isle('ay', v_ay, v_ip_hash, v_cihaz_hash);

  return jsonb_build_object(
    'ok', true,
    'sayildi', v_gunluk or v_aylik,
    'gunluk_yeni', v_gunluk,
    'aylik_yeni', v_aylik
  );
end;
$$;

revoke all on function public.web_ziyaret_kaydet(text) from public;
grant execute on function public.web_ziyaret_kaydet(text) to anon, authenticated;

create or replace function public.admin_web_ziyaret_ozet()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_simdi timestamp := now() at time zone 'Europe/Istanbul';
  v_gun date := v_simdi::date;
  v_ay date := date_trunc('month', v_simdi)::date;
  v_gunluk integer;
  v_aylik integer;
begin
  if auth.uid() is null then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not (
    public.admin_has_permission('dashboard.view')
    or public.admin_has_permission('analytics.view')
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and coalesce(p.is_admin, false)
    )
  ) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select coalesce(adet, 0) into v_gunluk
  from public.web_ziyaret_sayac
  where donem = 'gun' and donem_anahtar = v_gun;

  select coalesce(adet, 0) into v_aylik
  from public.web_ziyaret_sayac
  where donem = 'ay' and donem_anahtar = v_ay;

  return jsonb_build_object(
    'gunluk', coalesce(v_gunluk, 0),
    'aylik', coalesce(v_aylik, 0),
    'gun', v_gun,
    'ay', v_ay
  );
end;
$$;

revoke all on function public.admin_web_ziyaret_ozet() from public;
grant execute on function public.admin_web_ziyaret_ozet() to authenticated;
