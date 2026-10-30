-- Platform: 1080p sıkıştırma sonrası uzun video paylaşımı
-- Bucket tavanları 500 MB; hikaye duration meta üst sınırı 2 saat.

update storage.buckets
set file_size_limit = 524288000 -- 500 MB
where id in (
  'story-media',
  'status-media',
  'dm-media',
  'announcement-media',
  'banner-media',
  'giris-lobisi-media'
);

-- hikaye_olustur duration clamp: 120s → 2 saat (fonksiyon gövdesini bozmadan)
do $$
declare
  v_def text;
  v_new text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'hikaye_olustur'
  limit 1;

  if v_def is null then
    raise exception 'hikaye_olustur not found';
  end if;

  v_new := replace(
    v_def,
    'v_duration := greatest(1000, least(v_duration, 120000));',
    'v_duration := greatest(1000, least(v_duration, 7200000));'
  );

  if v_new = v_def then
    v_new := replace(
      v_def,
      'least(v_duration, 120000)',
      'least(v_duration, 7200000)'
    );
  end if;

  if v_new <> v_def then
    execute v_new;
  end if;
end $$;
