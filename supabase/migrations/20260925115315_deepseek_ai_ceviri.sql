-- DeepSeek AI assistant + live chat translation
insert into public.feature_flags (key, enabled, description) values
  ('ai_assistant_enabled', true, 'DeepSeek Tamuso uygulama asistanı'),
  ('live_chat_translation_enabled', true, 'Canlı / oda / DM / görüşme sohbet çevirisi')
on conflict (key) do nothing;

insert into public.kill_switches (key, active, reason) values
  ('kill_ai_assistant', false, null),
  ('kill_live_chat_translation', false, null)
on conflict (key) do nothing;

create table if not exists public.ai_translation_cache (
  text_hash text not null,
  target_lang text not null,
  source_lang text,
  translated text not null,
  same_language boolean not null default false,
  context text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (text_hash, target_lang)
);

create index if not exists ai_translation_cache_expires_idx
  on public.ai_translation_cache (expires_at);

alter table public.ai_translation_cache enable row level security;

-- Edge uses service role only; no client policies.
revoke all on public.ai_translation_cache from anon, authenticated;
grant all on public.ai_translation_cache to service_role;
