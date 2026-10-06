-- Yeni tanıtım klipleri. Anasayfada önde, giriş lobisinde de açık.
insert into public.web_tanitim_medya (tur, public_url, baslik, anasayfa, lobi, sira)
select v.tur, v.public_url, v.baslik, v.anasayfa, v.lobi, v.sira
from (
  values
    ('video'::text, '/tanitim/cagri.mp4', 'Görüntülü gülüş', true, true, 4),
    ('video', '/tanitim/portre.mp4', 'Portre', true, true, 5),
    ('video', '/tanitim/vlog.mp4', 'Yayın', true, true, 6)
) as v(tur, public_url, baslik, anasayfa, lobi, sira)
where not exists (
  select 1 from public.web_tanitim_medya m where m.public_url = v.public_url
);
