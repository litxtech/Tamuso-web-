-- Platform esintili oda görünüm / tema tasarımları
-- Clubhouse / Discord / Spaces / parti odası kalıpları (marka adı yok — desen isimleri)

insert into public.room_layouts (code, name, description, sort_order) values
  ('club_stage', 'Kulüp sahne', 'Host üstte · eşit konuşmacı ızgarası', 41),
  ('presence_grid', 'Varlık ızgarası', 'Herkes eşit karo · tahtsız', 42),
  ('spaces_strip', 'Spaces şeridi', 'Host + yatay konuşmacı şeridi', 43),
  ('party_wave', 'Parti dalgası', 'Büyük host · dalgalı 5 kolon', 44),
  ('party_u', 'U salon', 'İki kanat · merkez host', 45),
  ('dropin_tiles', 'Drop-in karolar', 'Büyük eşit karolar · anlık katılım', 46),
  ('greenroom_bar', 'Greenroom bar', 'Host şeridi · kompakt dinleyici', 47),
  ('salon_circle', 'Salon çember', 'Sıcak salon · büyük avatarlar', 48)
on conflict (code) do update
  set name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order,
      is_active = true;

insert into public.room_themes (code, name, sort_order) values
  ('club_cream', 'Kulüp krem', 50),
  ('blurple_night', 'Blurple gece', 51),
  ('spaces_sky', 'Spaces gökyüzü', 52),
  ('party_neon', 'Parti neon', 53),
  ('greenroom_dark', 'Greenroom koyu', 54),
  ('salon_warm', 'Sıcak salon', 55)
on conflict (code) do update
  set name = excluded.name,
      sort_order = excluded.sort_order,
      is_active = true;
