-- Oyun oluşturma stüdyosu şimdilik kapalı. Oyun kataloğu (games_enabled) durur.

update public.feature_flags
set enabled = false
where key in (
  'studio_enabled',
  'studio_menu_visible',
  'new_game_creation_enabled',
  'game_testing_enabled',
  'game_submission_enabled',
  'game_publishing_enabled',
  'ai_generation_enabled',
  'meshy_enabled',
  'elevenlabs_enabled',
  'playcanvas_enabled',
  'creator_rewards_enabled'
);
