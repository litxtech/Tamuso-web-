-- Canlı yayın ekranı butonları. Açık = görünür. Admin kapatınca uygulama anında gizler.

insert into public.feature_flags (key, enabled, description) values
  ('live_ui_follow_visible', true, 'Canlı yayında takip butonu'),
  ('live_ui_coin_visible', true, 'Canlı yayında coin butonu'),
  ('live_ui_viewers_visible', true, 'Canlı yayında izleyici butonu'),
  ('live_ui_report_visible', true, 'Canlı yayında şikayet butonu'),
  ('live_ui_music_visible', true, 'Canlı yayında müzik butonu'),
  ('live_ui_camera_visible', true, 'Canlı yayında kamerayı çevir'),
  ('live_ui_gift_visible', true, 'Canlı yayında hediye butonu'),
  ('live_ui_clip_visible', true, 'Canlı yayında kesit butonu'),
  ('live_ui_pk_visible', true, 'Canlı yayında PK butonu'),
  ('live_ui_chat_visible', true, 'Canlı yayında yorum kutusu')
on conflict (key) do nothing;
