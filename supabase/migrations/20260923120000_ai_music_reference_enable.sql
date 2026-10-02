-- Enable AI music reference uploads; expand temp bucket for video/audio
update public.feature_flags set enabled = true where key = 'ai_music_reference_enabled';
update public.ai_music_config set reference_upload_enabled = true where id = 1;

update storage.buckets
set
  allowed_mime_types = array[
    'audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/aac','audio/ogg','audio/x-m4a',
    'video/mp4','video/quicktime','video/x-m4v','application/octet-stream'
  ],
  file_size_limit = 52428800
where id = 'ai-music-temp';

drop policy if exists "ai_music_temp_owner" on storage.objects;
create policy "ai_music_temp_owner"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'ai-music-temp'
    and (
      public.ben_admin_miyim()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  with check (
    bucket_id = 'ai-music-temp'
    and (
      public.ben_admin_miyim()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
