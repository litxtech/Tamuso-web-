-- Site footer: adres ve sosyal ağ URL'leri. Admin panelinden değişir.

alter table public.platform_iletisim_ayar
  add column if not exists adres text not null default '15442 VENTURA BLVD STE 201-183, USA',
  add column if not exists instagram_url text not null default '',
  add column if not exists tiktok_url text not null default '',
  add column if not exists x_url text not null default '',
  add column if not exists youtube_url text not null default '',
  add column if not exists facebook_url text not null default '',
  add column if not exists linkedin_url text not null default '',
  add column if not exists telegram_url text not null default '';

update public.platform_iletisim_ayar
set adres = '15442 VENTURA BLVD STE 201-183, USA'
where id = 1
  and btrim(adres) = '';

create or replace function public.platform_iletisim_ayari_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.platform_iletisim_ayar%rowtype;
begin
  select * into v_row from public.platform_iletisim_ayar where id = 1;
  if not found then
    return jsonb_build_object(
      'support_email', 'support@litxtech.com',
      'whatsapp_e164', '905330483061',
      'whatsapp_gorunen', '0533 048 30 61',
      'baslik', 'Kurumsal iletişim',
      'alt_metin', 'Şikayet · destek · uygunsuz içerik',
      'adres', '15442 VENTURA BLVD STE 201-183, USA',
      'instagram_url', '',
      'tiktok_url', '',
      'x_url', '',
      'youtube_url', '',
      'facebook_url', '',
      'linkedin_url', '',
      'telegram_url', ''
    );
  end if;
  return jsonb_build_object(
    'support_email', v_row.support_email,
    'whatsapp_e164', v_row.whatsapp_e164,
    'whatsapp_gorunen', v_row.whatsapp_gorunen,
    'baslik', v_row.baslik,
    'alt_metin', v_row.alt_metin,
    'adres', v_row.adres,
    'instagram_url', v_row.instagram_url,
    'tiktok_url', v_row.tiktok_url,
    'x_url', v_row.x_url,
    'youtube_url', v_row.youtube_url,
    'facebook_url', v_row.facebook_url,
    'linkedin_url', v_row.linkedin_url,
    'telegram_url', v_row.telegram_url,
    'updated_at', v_row.updated_at
  );
end;
$$;

drop function if exists public.admin_platform_iletisim_ayarla(text, text, text, text, text);

create or replace function public.admin_platform_iletisim_ayarla(
  p_support_email text default null,
  p_whatsapp_e164 text default null,
  p_whatsapp_gorunen text default null,
  p_baslik text default null,
  p_alt_metin text default null,
  p_adres text default null,
  p_instagram_url text default null,
  p_tiktok_url text default null,
  p_x_url text default null,
  p_youtube_url text default null,
  p_facebook_url text default null,
  p_linkedin_url text default null,
  p_telegram_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_wa text;
  v_wa_g text;
  v_adres text;
  v_ig text;
  v_tt text;
  v_x text;
  v_yt text;
  v_fb text;
  v_li text;
  v_tg text;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  insert into public.platform_iletisim_ayar (id) values (1)
  on conflict (id) do nothing;

  v_email := nullif(btrim(coalesce(p_support_email, '')), '');
  v_wa := regexp_replace(coalesce(p_whatsapp_e164, ''), '[^0-9]', '', 'g');
  v_wa_g := nullif(btrim(coalesce(p_whatsapp_gorunen, '')), '');
  v_adres := nullif(btrim(coalesce(p_adres, '')), '');
  v_ig := case when p_instagram_url is null then null else btrim(p_instagram_url) end;
  v_tt := case when p_tiktok_url is null then null else btrim(p_tiktok_url) end;
  v_x := case when p_x_url is null then null else btrim(p_x_url) end;
  v_yt := case when p_youtube_url is null then null else btrim(p_youtube_url) end;
  v_fb := case when p_facebook_url is null then null else btrim(p_facebook_url) end;
  v_li := case when p_linkedin_url is null then null else btrim(p_linkedin_url) end;
  v_tg := case when p_telegram_url is null then null else btrim(p_telegram_url) end;

  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Gecersiz e-posta';
  end if;
  if p_whatsapp_e164 is not null and length(v_wa) < 10 then
    raise exception 'Gecersiz WhatsApp numarasi';
  end if;
  if v_adres is not null and length(v_adres) > 180 then
    raise exception 'Adres cok uzun';
  end if;
  if v_ig is not null and v_ig <> '' and (v_ig !~* '^https://' or length(v_ig) > 300) then
    raise exception 'Instagram baglantisi https ile baslamali';
  end if;
  if v_tt is not null and v_tt <> '' and (v_tt !~* '^https://' or length(v_tt) > 300) then
    raise exception 'TikTok baglantisi https ile baslamali';
  end if;
  if v_x is not null and v_x <> '' and (v_x !~* '^https://' or length(v_x) > 300) then
    raise exception 'X baglantisi https ile baslamali';
  end if;
  if v_yt is not null and v_yt <> '' and (v_yt !~* '^https://' or length(v_yt) > 300) then
    raise exception 'YouTube baglantisi https ile baslamali';
  end if;
  if v_fb is not null and v_fb <> '' and (v_fb !~* '^https://' or length(v_fb) > 300) then
    raise exception 'Facebook baglantisi https ile baslamali';
  end if;
  if v_li is not null and v_li <> '' and (v_li !~* '^https://' or length(v_li) > 300) then
    raise exception 'LinkedIn baglantisi https ile baslamali';
  end if;
  if v_tg is not null and v_tg <> '' and (v_tg !~* '^https://' or length(v_tg) > 300) then
    raise exception 'Telegram baglantisi https ile baslamali';
  end if;

  update public.platform_iletisim_ayar set
    support_email = coalesce(v_email, support_email),
    whatsapp_e164 = case when p_whatsapp_e164 is not null then v_wa else whatsapp_e164 end,
    whatsapp_gorunen = coalesce(v_wa_g, whatsapp_gorunen),
    baslik = coalesce(nullif(btrim(coalesce(p_baslik, '')), ''), baslik),
    alt_metin = coalesce(nullif(btrim(coalesce(p_alt_metin, '')), ''), alt_metin),
    adres = coalesce(v_adres, adres),
    instagram_url = coalesce(v_ig, instagram_url),
    tiktok_url = coalesce(v_tt, tiktok_url),
    x_url = coalesce(v_x, x_url),
    youtube_url = coalesce(v_yt, youtube_url),
    facebook_url = coalesce(v_fb, facebook_url),
    linkedin_url = coalesce(v_li, linkedin_url),
    telegram_url = coalesce(v_tg, telegram_url),
    guncelleyen = auth.uid(),
    updated_at = now()
  where id = 1;

  return public.platform_iletisim_ayari_get();
end;
$$;

grant execute on function public.platform_iletisim_ayari_get() to anon, authenticated;
grant execute on function public.admin_platform_iletisim_ayarla(
  text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
