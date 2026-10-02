-- AI Music Studio — entitlement ledger, generation jobs, track extensions, IAP products
-- Idempotent where practical. Does not alter Tamuso Coin economy.

-- ---------------------------------------------------------------------------
-- Feature flags + kill switch
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, description) values
  ('ai_music_enabled', true, 'AI Müzik Stüdyosu'),
  ('ai_music_reference_enabled', false, 'Referans ses (ElevenLabs conditioning)'),
  ('ai_music_status_share_enabled', true, 'Durumda müzik paylaşımı'),
  ('ai_music_voice_room_enabled', true, 'Ses odasında AI müzik çalma'),
  ('ai_music_export_enabled', true, 'Telefona kaydet / paylaş')
on conflict (key) do nothing;

insert into public.kill_switches (key, active) values
  ('kill_ai_music_generation', false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Config (singleton)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_music_config (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default true,
  welcome_seconds int not null default 420 check (welcome_seconds between 0 and 86400),
  min_track_seconds int not null default 60 check (min_track_seconds between 3 and 600),
  max_track_seconds int not null default 300 check (max_track_seconds between 3 and 600),
  max_concurrent_per_user int not null default 1 check (max_concurrent_per_user between 1 and 5),
  daily_generation_limit int not null default 20 check (daily_generation_limit between 1 and 200),
  prompt_max_length int not null default 2000 check (prompt_max_length between 50 and 8000),
  lyrics_max_length int not null default 4000 check (lyrics_max_length between 0 and 20000),
  reference_upload_enabled boolean not null default false,
  status_sharing_enabled boolean not null default true,
  voice_room_usage_enabled boolean not null default true,
  device_export_enabled boolean not null default true,
  model_id text not null default 'music_v2_5',
  rights_policy_version text not null default 'ai_music_rights_v1',
  terms_version text not null default 'ai_music_terms_v1',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.ai_music_config (id) values (1)
on conflict (id) do nothing;

alter table public.ai_music_config enable row level security;
drop policy if exists "ai_music_config_select" on public.ai_music_config;
create policy "ai_music_config_select"
  on public.ai_music_config for select to authenticated using (true);
drop policy if exists "ai_music_config_admin" on public.ai_music_config;
create policy "ai_music_config_admin"
  on public.ai_music_config for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());
grant select on public.ai_music_config to authenticated;

-- ---------------------------------------------------------------------------
-- Products (IAP entitlement mapping — NOT store price)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_music_products (
  id uuid primary key default gen_random_uuid(),
  product_id text not null unique,
  display_name text not null,
  seconds_granted int not null check (seconds_granted > 0),
  bonus_seconds int not null default 0 check (bonus_seconds >= 0),
  apple_product_id text,
  google_product_id text,
  badge text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ai_music_products (
  product_id, display_name, seconds_granted, apple_product_id, google_product_id, badge, sort_order
) values
  ('tamuso_ai_music_pack_9',  'AI Müzik Mini',   900,   'tamuso_ai_music_pack_9',  'tamuso_ai_music_pack_9',  'Başlangıç', 10),
  ('tamuso_ai_music_pack_10', 'AI Müzik Plus',   2400,  'tamuso_ai_music_pack_10', 'tamuso_ai_music_pack_10', 'Popüler', 20),
  ('tamuso_ai_music_pack_11', 'AI Müzik Pro',    6000,  'tamuso_ai_music_pack_11', 'tamuso_ai_music_pack_11', null, 30),
  ('tamuso_ai_music_pack_12', 'AI Müzik Studio', 15000, 'tamuso_ai_music_pack_12', 'tamuso_ai_music_pack_12', 'En iyi değer', 40)
on conflict (product_id) do nothing;

alter table public.ai_music_products enable row level security;
drop policy if exists "ai_music_products_select" on public.ai_music_products;
create policy "ai_music_products_select"
  on public.ai_music_products for select to authenticated
  using (is_active or public.ben_admin_miyim());
drop policy if exists "ai_music_products_admin" on public.ai_music_products;
create policy "ai_music_products_admin"
  on public.ai_music_products for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());
grant select on public.ai_music_products to authenticated;

-- ---------------------------------------------------------------------------
-- Genres (searchable, admin-managed; extends music_categories pattern)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_music_genres (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  name_normalized text not null,
  aliases text[] not null default '{}',
  parent_code text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ai_music_genres_name_idx
  on public.ai_music_genres (name_normalized);
create index if not exists ai_music_genres_active_idx
  on public.ai_music_genres (is_active, is_featured, sort_order);

alter table public.ai_music_genres enable row level security;
drop policy if exists "ai_music_genres_select" on public.ai_music_genres;
create policy "ai_music_genres_select"
  on public.ai_music_genres for select to authenticated using (is_active or public.ben_admin_miyim());
drop policy if exists "ai_music_genres_admin" on public.ai_music_genres;
create policy "ai_music_genres_admin"
  on public.ai_music_genres for all to authenticated
  using (public.ben_admin_miyim()) with check (public.ben_admin_miyim());
grant select on public.ai_music_genres to authenticated;

insert into public.ai_music_genres (code, name, name_normalized, aliases, is_featured, sort_order) values
  ('pop','Pop','pop',array['pop muzik'],true,10),
  ('turkish_pop','Türkçe Pop','turkce pop',array['turkce pop','turkish pop'],true,20),
  ('rap','Rap','rap',array['rap muzik'],true,30),
  ('hip_hop','Hip-Hop','hip hop',array['hiphop','hip-hop'],true,40),
  ('trap','Trap','trap',array[]::text[],false,50),
  ('rnb','R&B','rnb',array['r and b','r&b'],false,60),
  ('soul','Soul','soul',array[]::text[],false,70),
  ('rock','Rock','rock',array[]::text[],true,80),
  ('alt_rock','Alternative Rock','alternative rock',array['alternatif rock'],false,90),
  ('metal','Metal','metal',array[]::text[],false,100),
  ('electronic','Electronic','electronic',array['elektronik'],true,110),
  ('edm','EDM','edm',array[]::text[],false,120),
  ('house','House','house',array[]::text[],false,130),
  ('deep_house','Deep House','deep house',array[]::text[],false,140),
  ('techno','Techno','techno',array[]::text[],false,150),
  ('dance','Dance','dance',array['dans'],true,160),
  ('disco','Disco','disco',array[]::text[],false,170),
  ('funk','Funk','funk',array[]::text[],false,180),
  ('jazz','Jazz','jazz',array[]::text[],false,190),
  ('blues','Blues','blues',array[]::text[],false,200),
  ('classical','Classical','classical',array['klasik'],false,210),
  ('cinematic','Cinematic','cinematic',array['sinematik','film muzigi'],true,220),
  ('ambient','Ambient','ambient',array[]::text[],false,230),
  ('lofi','Lo-fi','lofi',array['lo-fi','lo fi'],true,240),
  ('acoustic','Acoustic','acoustic',array['akustik'],true,250),
  ('folk','Folk','folk',array[]::text[],false,260),
  ('turkish_folk','Türk Halk Müziği','turk halk muzigi',array['turk halk','halk muzigi'],true,270),
  ('karadeniz','Karadeniz','karadeniz',array['kemençe','kemence','karadeniz muzigi'],true,280),
  ('arabesk','Arabesk','arabesk',array['arabesque'],true,290),
  ('arabesk_pop','Arabesk Pop','arabesk pop',array[]::text[],false,300),
  ('anadolu_rock','Anadolu Rock','anadolu rock',array[]::text[],false,310),
  ('latin','Latin','latin',array[]::text[],false,320),
  ('reggaeton','Reggaeton','reggaeton',array[]::text[],false,330),
  ('reggae','Reggae','reggae',array[]::text[],false,340),
  ('afrobeat','Afrobeat','afrobeat',array[]::text[],false,350),
  ('country','Country','country',array[]::text[],false,360),
  ('indie','Indie','indie',array[]::text[],false,370),
  ('synthwave','Synthwave','synthwave',array[]::text[],false,380),
  ('chill','Chill','chill',array['rahat'],true,390),
  ('meditation','Meditation','meditation',array['meditasyon'],false,400),
  ('piano','Piano','piano',array['piyano'],true,410),
  ('orchestral','Orchestral','orchestral',array['orkestra'],false,420),
  ('world','World','world',array['dunya muzigi'],false,430),
  ('experimental','Experimental','experimental',array['deneysel'],false,440)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Balance cache + immutable ledger
-- ---------------------------------------------------------------------------
create table if not exists public.ai_music_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available_seconds int not null default 0 check (available_seconds >= 0),
  reserved_seconds int not null default 0 check (reserved_seconds >= 0),
  lifetime_granted_seconds int not null default 0 check (lifetime_granted_seconds >= 0),
  lifetime_purchased_seconds int not null default 0 check (lifetime_purchased_seconds >= 0),
  lifetime_welcome_seconds int not null default 0 check (lifetime_welcome_seconds >= 0),
  lifetime_consumed_seconds int not null default 0 check (lifetime_consumed_seconds >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_music_balances enable row level security;
drop policy if exists "ai_music_balances_own" on public.ai_music_balances;
create policy "ai_music_balances_own"
  on public.ai_music_balances for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());
grant select on public.ai_music_balances to authenticated;

create table if not exists public.ai_music_entitlement_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'WELCOME_GRANT','PURCHASE','GENERATION_RESERVE','GENERATION_CAPTURE',
    'GENERATION_RELEASE','ADMIN_GRANT','ADMIN_DEBIT','REFUND','CORRECTION'
  )),
  seconds_delta int not null,
  source text,
  product_id text,
  transaction_id text,
  generation_id uuid,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_music_ledger_user_idx
  on public.ai_music_entitlement_ledger (user_id, created_at desc);
create unique index if not exists ai_music_ledger_welcome_uniq
  on public.ai_music_entitlement_ledger (user_id) where type = 'WELCOME_GRANT';
create unique index if not exists ai_music_ledger_purchase_tx_uniq
  on public.ai_music_entitlement_ledger (transaction_id)
  where transaction_id is not null and type = 'PURCHASE';
create unique index if not exists ai_music_ledger_reserve_gen_uniq
  on public.ai_music_entitlement_ledger (generation_id)
  where generation_id is not null and type = 'GENERATION_RESERVE';
create unique index if not exists ai_music_ledger_capture_gen_uniq
  on public.ai_music_entitlement_ledger (generation_id)
  where generation_id is not null and type = 'GENERATION_CAPTURE';
create unique index if not exists ai_music_ledger_release_gen_uniq
  on public.ai_music_entitlement_ledger (generation_id)
  where generation_id is not null and type = 'GENERATION_RELEASE';

alter table public.ai_music_entitlement_ledger enable row level security;
drop policy if exists "ai_music_ledger_own" on public.ai_music_entitlement_ledger;
create policy "ai_music_ledger_own"
  on public.ai_music_entitlement_ledger for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());
grant select on public.ai_music_entitlement_ledger to authenticated;

-- ---------------------------------------------------------------------------
-- Purchases (IAP lifecycle)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_music_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id text not null,
  store text not null check (store in ('apple','google')),
  store_product_id text not null,
  transaction_id text,
  purchase_token text,
  idempotency_key text not null,
  status text not null default 'PURCHASED'
    check (status in ('PURCHASED','VERIFYING','VERIFIED','CREDITED','FAILED','CANCELLED')),
  seconds_snapshot int not null,
  bonus_seconds_snapshot int not null default 0,
  display_name_snapshot text not null,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  credited_at timestamptz
);

create unique index if not exists ai_music_purchases_idem_uniq
  on public.ai_music_purchases (user_id, idempotency_key);
create unique index if not exists ai_music_purchases_tx_id_uniq
  on public.ai_music_purchases (store, transaction_id)
  where transaction_id is not null;
create unique index if not exists ai_music_purchases_token_uniq
  on public.ai_music_purchases (store, purchase_token)
  where purchase_token is not null;

alter table public.ai_music_purchases enable row level security;
drop policy if exists "ai_music_purchases_own" on public.ai_music_purchases;
create policy "ai_music_purchases_own"
  on public.ai_music_purchases for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());
grant select on public.ai_music_purchases to authenticated;

-- ---------------------------------------------------------------------------
-- Extend music_tracks for AI ownership
-- ---------------------------------------------------------------------------
alter table public.music_tracks
  add column if not exists owner_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists source text not null default 'library',
  add column if not exists public_track_code text,
  add column if not exists moderation_status text not null default 'ACTIVE',
  add column if not exists soft_deleted_at timestamptz,
  add column if not exists genre_code text,
  add column if not exists mood text,
  add column if not exists language_code text,
  add column if not exists is_instrumental boolean,
  add column if not exists prompt_hash text,
  add column if not exists lyrics_hash text,
  add column if not exists master_audio_sha256 text,
  add column if not exists waveform_peaks jsonb,
  add column if not exists cover_thumb_url text,
  add column if not exists current_version_id uuid,
  add column if not exists generation_job_id uuid;

do $$ begin
  alter table public.music_tracks
    drop constraint if exists music_tracks_source_check;
  alter table public.music_tracks
    add constraint music_tracks_source_check
    check (source in ('library','ai','user'));
exception when others then null;
end $$;

do $$ begin
  alter table public.music_tracks
    drop constraint if exists music_tracks_moderation_check;
  alter table public.music_tracks
    add constraint music_tracks_moderation_check
    check (moderation_status in ('ACTIVE','UNDER_REVIEW','RESTRICTED','REMOVED'));
exception when others then null;
end $$;

create unique index if not exists music_tracks_public_code_uniq
  on public.music_tracks (public_track_code) where public_track_code is not null;
create index if not exists music_tracks_owner_idx
  on public.music_tracks (owner_user_id, soft_deleted_at, status, created_at desc)
  where owner_user_id is not null;
create index if not exists music_tracks_ai_ready_idx
  on public.music_tracks (owner_user_id, created_at desc)
  where source = 'ai' and status = 'READY' and soft_deleted_at is null;

-- RLS: library tracks public-ready; AI tracks only owner/admin (room play via RPC)
drop policy if exists "music_tracks_library_read" on public.music_tracks;
create policy "music_tracks_library_read"
  on public.music_tracks for select to authenticated
  using (
    public.ben_admin_miyim()
    or owner_user_id = auth.uid()
    or (
      source = 'library'
      and status = 'READY'
      and is_active
      and soft_deleted_at is null
      and coalesce(moderation_status, 'ACTIVE') = 'ACTIVE'
      and (license_valid_until is null or license_valid_until >= current_date)
    )
  );

drop policy if exists "music_tracks_owner_read" on public.music_tracks;
create policy "music_tracks_owner_read"
  on public.music_tracks for select to authenticated
  using (owner_user_id = auth.uid() or public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- Generation jobs
-- ---------------------------------------------------------------------------
create table if not exists public.ai_music_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  idempotency_key text not null,
  status text not null default 'QUEUED'
    check (status in ('QUEUED','PREPARING','GENERATING','PROCESSING','READY','FAILED','CANCELLED')),
  provider text not null default 'elevenlabs',
  provider_model text,
  provider_request_id text,
  provider_song_id text,
  requested_duration_seconds int not null check (requested_duration_seconds between 3 and 600),
  reserved_seconds int not null check (reserved_seconds > 0),
  captured_seconds int,
  user_prompt text not null,
  prepared_prompt text not null,
  prompt_hash text not null,
  lyrics_text text,
  lyrics_mode text not null default 'ai'
    check (lyrics_mode in ('ai','user','instrumental')),
  force_instrumental boolean not null default false,
  genre_code text,
  subgenre text,
  mood text,
  tempo text,
  bpm int,
  language_code text,
  instruments text[] not null default '{}',
  structure_hint text,
  settings jsonb not null default '{}'::jsonb,
  track_id uuid references public.music_tracks(id) on delete set null,
  error_code text,
  error_message text,
  correlation_id text not null default encode(gen_random_bytes(8), 'hex'),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ai_music_jobs_idem_uniq
  on public.ai_music_generation_jobs (user_id, idempotency_key);
create index if not exists ai_music_jobs_user_status_idx
  on public.ai_music_generation_jobs (user_id, status, created_at desc);
create index if not exists ai_music_jobs_active_idx
  on public.ai_music_generation_jobs (user_id)
  where status in ('QUEUED','PREPARING','GENERATING','PROCESSING');

alter table public.ai_music_generation_jobs enable row level security;
drop policy if exists "ai_music_jobs_own" on public.ai_music_generation_jobs;
create policy "ai_music_jobs_own"
  on public.ai_music_generation_jobs for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());
grant select on public.ai_music_generation_jobs to authenticated;

alter table public.ai_music_entitlement_ledger
  drop constraint if exists ai_music_entitlement_ledger_generation_id_fkey;
alter table public.ai_music_entitlement_ledger
  add constraint ai_music_entitlement_ledger_generation_id_fkey
  foreign key (generation_id) references public.ai_music_generation_jobs(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Versions / passport / rights / favorites (user AI)
-- ---------------------------------------------------------------------------
create table if not exists public.music_track_versions (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.music_tracks(id) on delete cascade,
  parent_version_id uuid references public.music_track_versions(id) on delete set null,
  version_number int not null default 1,
  is_master boolean not null default false,
  storage_path text not null,
  audio_url text,
  duration_ms int,
  mime_type text,
  file_size bigint,
  audio_sha256 text,
  waveform_peaks jsonb,
  edit_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (track_id, version_number)
);

create index if not exists music_track_versions_track_idx
  on public.music_track_versions (track_id, version_number desc);

alter table public.music_track_versions enable row level security;
drop policy if exists "music_track_versions_read" on public.music_track_versions;
create policy "music_track_versions_read"
  on public.music_track_versions for select to authenticated
  using (
    exists (
      select 1 from public.music_tracks t
      where t.id = track_id
        and (t.owner_user_id = auth.uid() or public.ben_admin_miyim()
             or (t.source = 'library' and t.is_active and t.status = 'READY'))
    )
  );
grant select on public.music_track_versions to authenticated;

create table if not exists public.music_passports (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null unique references public.music_tracks(id) on delete cascade,
  public_track_code text not null unique,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  creator_public_handle_snapshot text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  ai_provider text not null default 'elevenlabs',
  ai_model text,
  provider_generation_id text,
  prompt_hash text,
  lyrics_hash text,
  reference_hash text,
  master_audio_sha256 text,
  audio_fingerprint text,
  fingerprint_status text not null default 'NOT_AVAILABLE'
    check (fingerprint_status in ('AVAILABLE','NOT_AVAILABLE','PENDING','FAILED')),
  duration_ms int,
  version int not null default 1,
  terms_version text,
  rights_declaration_version text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.music_passports enable row level security;
drop policy if exists "music_passports_read" on public.music_passports;
create policy "music_passports_read"
  on public.music_passports for select to authenticated
  using (
    creator_user_id = auth.uid()
    or public.ben_admin_miyim()
    or exists (
      select 1 from public.music_tracks t
      where t.id = track_id and t.soft_deleted_at is null
        and t.moderation_status = 'ACTIVE' and t.status = 'READY'
    )
  );
grant select on public.music_passports to authenticated;

create table if not exists public.music_rights_acceptances (
  user_id uuid not null references public.profiles(id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, policy_version)
);

alter table public.music_rights_acceptances enable row level security;
drop policy if exists "music_rights_own" on public.music_rights_acceptances;
create policy "music_rights_own"
  on public.music_rights_acceptances for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());
grant select on public.music_rights_acceptances to authenticated;

create table if not exists public.ai_music_user_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.music_tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.ai_music_user_favorites enable row level security;
drop policy if exists "ai_music_fav_own" on public.ai_music_user_favorites;
create policy "ai_music_fav_own"
  on public.ai_music_user_favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.ai_music_user_favorites to authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('ai-music-audio', 'ai-music-audio', false, 52428800, array['audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/aac','audio/ogg']),
  ('ai-music-covers', 'ai-music-covers', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('ai-music-temp', 'ai-music-temp', false, 20971520, array['audio/mpeg','audio/mp4','audio/wav','audio/x-wav','audio/aac','audio/ogg'])
on conflict (id) do nothing;

drop policy if exists "ai_music_audio_owner_read" on storage.objects;
create policy "ai_music_audio_owner_read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ai-music-audio'
    and (
      public.ben_admin_miyim()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "ai_music_covers_owner" on storage.objects;
create policy "ai_music_covers_owner"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'ai-music-covers'
    and (
      public.ben_admin_miyim()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  with check (
    bucket_id = 'ai-music-covers'
    and (
      public.ben_admin_miyim()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_normalize_search(p text)
returns text
language sql
immutable
as $$
  select lower(
    translate(
      coalesce(p, ''),
      'İIıĞğÜüŞşÖöÇçÂâÊêÎîÔôÛû',
      'iiiggussuoooccaaeeiioouu'
    )
  );
$$;

create or replace function public.ai_music_public_code()
returns text
language plpgsql
as $$
declare
  v text;
begin
  loop
    v := 'TMS-' || upper(substr(encode(gen_random_bytes(9), 'hex'), 1, 12));
    exit when not exists (select 1 from public.music_tracks where public_track_code = v);
  end loop;
  return v;
end;
$$;

create or replace function public.ai_music_ensure_balance(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ai_music_balances (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

-- Welcome grant (atomic, once)
create or replace function public.ai_music_welcome_grant()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sec int;
  v_bal public.ai_music_balances%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.ai_music_ensure_balance(v_uid);

  select welcome_seconds into v_sec from public.ai_music_config where id = 1;
  v_sec := coalesce(v_sec, 420);

  begin
    insert into public.ai_music_entitlement_ledger (
      user_id, type, seconds_delta, source, description
    ) values (
      v_uid, 'WELCOME_GRANT', v_sec, 'welcome_grant', 'Ücretsiz başlangıç AI müzik hakkı'
    );
  exception when unique_violation then
    select * into v_bal from public.ai_music_balances where user_id = v_uid;
    return jsonb_build_object(
      'ok', true,
      'granted', false,
      'available_seconds', v_bal.available_seconds,
      'reserved_seconds', v_bal.reserved_seconds
    );
  end;

  update public.ai_music_balances set
    available_seconds = available_seconds + v_sec,
    lifetime_granted_seconds = lifetime_granted_seconds + v_sec,
    lifetime_welcome_seconds = lifetime_welcome_seconds + v_sec,
    updated_at = now()
  where user_id = v_uid
  returning * into v_bal;

  return jsonb_build_object(
    'ok', true,
    'granted', true,
    'seconds', v_sec,
    'available_seconds', v_bal.available_seconds,
    'reserved_seconds', v_bal.reserved_seconds
  );
end;
$$;

grant execute on function public.ai_music_welcome_grant() to authenticated;

create or replace function public.ai_music_balance_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal public.ai_music_balances%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.ai_music_ensure_balance(v_uid);
  -- welcome grant best-effort
  perform public.ai_music_welcome_grant();
  select * into v_bal from public.ai_music_balances where user_id = v_uid;
  return jsonb_build_object(
    'available_seconds', v_bal.available_seconds,
    'reserved_seconds', v_bal.reserved_seconds,
    'lifetime_granted_seconds', v_bal.lifetime_granted_seconds,
    'lifetime_purchased_seconds', v_bal.lifetime_purchased_seconds,
    'lifetime_welcome_seconds', v_bal.lifetime_welcome_seconds,
    'lifetime_consumed_seconds', v_bal.lifetime_consumed_seconds
  );
end;
$$;

grant execute on function public.ai_music_balance_get() to authenticated;

-- Reserve / capture / release (service_role via edge, also callable with auth for reserve start from RPC used by edge)
create or replace function public.ai_music_entitlement_reserve(
  p_user_id uuid,
  p_generation_id uuid,
  p_seconds int,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal public.ai_music_balances%rowtype;
begin
  if p_seconds is null or p_seconds <= 0 then
    raise exception 'Invalid seconds';
  end if;
  perform public.ai_music_ensure_balance(p_user_id);

  select * into v_bal from public.ai_music_balances
  where user_id = p_user_id for update;

  if v_bal.available_seconds < p_seconds then
    return jsonb_build_object('ok', false, 'error', 'INSUFFICIENT_ENTITLEMENT',
      'available_seconds', v_bal.available_seconds);
  end if;

  begin
    insert into public.ai_music_entitlement_ledger (
      user_id, type, seconds_delta, source, generation_id, description
    ) values (
      p_user_id, 'GENERATION_RESERVE', -p_seconds, 'generation', p_generation_id,
      'Üretim için süre rezervasyonu'
    );
  exception when unique_violation then
    select * into v_bal from public.ai_music_balances where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'idempotent', true,
      'available_seconds', v_bal.available_seconds,
      'reserved_seconds', v_bal.reserved_seconds);
  end;

  update public.ai_music_balances set
    available_seconds = available_seconds - p_seconds,
    reserved_seconds = reserved_seconds + p_seconds,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_bal;

  return jsonb_build_object('ok', true,
    'available_seconds', v_bal.available_seconds,
    'reserved_seconds', v_bal.reserved_seconds);
end;
$$;

create or replace function public.ai_music_entitlement_capture(
  p_user_id uuid,
  p_generation_id uuid,
  p_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal public.ai_music_balances%rowtype;
begin
  perform public.ai_music_ensure_balance(p_user_id);
  select * into v_bal from public.ai_music_balances where user_id = p_user_id for update;

  begin
    insert into public.ai_music_entitlement_ledger (
      user_id, type, seconds_delta, source, generation_id, description
    ) values (
      p_user_id, 'GENERATION_CAPTURE', -p_seconds, 'generation', p_generation_id,
      'Başarılı üretim — süre tüketildi'
    );
  exception when unique_violation then
    select * into v_bal from public.ai_music_balances where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'idempotent', true,
      'available_seconds', v_bal.available_seconds,
      'reserved_seconds', v_bal.reserved_seconds);
  end;

  update public.ai_music_balances set
    reserved_seconds = greatest(0, reserved_seconds - p_seconds),
    lifetime_consumed_seconds = lifetime_consumed_seconds + p_seconds,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_bal;

  return jsonb_build_object('ok', true,
    'available_seconds', v_bal.available_seconds,
    'reserved_seconds', v_bal.reserved_seconds);
end;
$$;

create or replace function public.ai_music_entitlement_release(
  p_user_id uuid,
  p_generation_id uuid,
  p_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal public.ai_music_balances%rowtype;
  v_has_capture boolean;
begin
  perform public.ai_music_ensure_balance(p_user_id);

  select exists (
    select 1 from public.ai_music_entitlement_ledger
    where generation_id = p_generation_id and type = 'GENERATION_CAPTURE'
  ) into v_has_capture;
  if v_has_capture then
    raise exception 'Already captured';
  end if;

  select * into v_bal from public.ai_music_balances where user_id = p_user_id for update;

  begin
    insert into public.ai_music_entitlement_ledger (
      user_id, type, seconds_delta, source, generation_id, description
    ) values (
      p_user_id, 'GENERATION_RELEASE', p_seconds, 'generation', p_generation_id,
      'Başarısız üretim — süre iade'
    );
  exception when unique_violation then
    select * into v_bal from public.ai_music_balances where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'idempotent', true,
      'available_seconds', v_bal.available_seconds,
      'reserved_seconds', v_bal.reserved_seconds);
  end;

  update public.ai_music_balances set
    reserved_seconds = greatest(0, reserved_seconds - p_seconds),
    available_seconds = available_seconds + p_seconds,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_bal;

  return jsonb_build_object('ok', true,
    'available_seconds', v_bal.available_seconds,
    'reserved_seconds', v_bal.reserved_seconds);
end;
$$;

create or replace function public.ai_music_credit_purchase(
  p_user_id uuid,
  p_product_id text,
  p_transaction_id text,
  p_seconds int,
  p_bonus int,
  p_purchase_row_id uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int := p_seconds + coalesce(p_bonus, 0);
  v_bal public.ai_music_balances%rowtype;
begin
  if v_total <= 0 then raise exception 'Invalid seconds'; end if;
  perform public.ai_music_ensure_balance(p_user_id);

  begin
    insert into public.ai_music_entitlement_ledger (
      user_id, type, seconds_delta, source, product_id, transaction_id, description, metadata
    ) values (
      p_user_id, 'PURCHASE', v_total, 'iap', p_product_id, p_transaction_id,
      coalesce(p_display_name, p_product_id) || ' satın alındı',
      jsonb_build_object('purchase_id', p_purchase_row_id, 'bonus_seconds', coalesce(p_bonus,0))
    );
  exception when unique_violation then
    select * into v_bal from public.ai_music_balances where user_id = p_user_id;
    return jsonb_build_object('ok', true, 'idempotent', true,
      'available_seconds', v_bal.available_seconds);
  end;

  update public.ai_music_balances set
    available_seconds = available_seconds + v_total,
    lifetime_granted_seconds = lifetime_granted_seconds + v_total,
    lifetime_purchased_seconds = lifetime_purchased_seconds + v_total,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_bal;

  update public.ai_music_purchases set
    status = 'CREDITED',
    credited_at = now(),
    updated_at = now()
  where id = p_purchase_row_id;

  return jsonb_build_object('ok', true,
    'seconds_added', v_total,
    'available_seconds', v_bal.available_seconds);
end;
$$;

create or replace function public.ai_music_admin_adjust(
  p_user_id uuid,
  p_seconds int,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_bal public.ai_music_balances%rowtype;
  v_type text;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'Reason required';
  end if;
  if p_seconds = 0 then raise exception 'Seconds required'; end if;

  perform public.ai_music_ensure_balance(p_user_id);
  select * into v_bal from public.ai_music_balances where user_id = p_user_id for update;

  if p_seconds < 0 and v_bal.available_seconds < abs(p_seconds) then
    raise exception 'Insufficient balance';
  end if;

  v_type := case when p_seconds > 0 then 'ADMIN_GRANT' else 'ADMIN_DEBIT' end;

  insert into public.ai_music_entitlement_ledger (
    user_id, type, seconds_delta, source, description, admin_id
  ) values (
    p_user_id, v_type, p_seconds, 'admin', trim(p_reason), v_admin
  );

  update public.ai_music_balances set
    available_seconds = available_seconds + p_seconds,
    lifetime_granted_seconds = lifetime_granted_seconds + greatest(p_seconds, 0),
    updated_at = now()
  where user_id = p_user_id
  returning * into v_bal;

  insert into public.admin_audit_logs (admin_id, target_user_id, action, summary, details)
  values (
    v_admin,
    p_user_id,
    'ai_music_adjust',
    left('AI müzik süre: ' || p_seconds::text || ' sn', 200),
    jsonb_build_object('seconds', p_seconds, 'reason', trim(p_reason))
  );

  return jsonb_build_object('ok', true, 'available_seconds', v_bal.available_seconds);
end;
$$;

grant execute on function public.ai_music_admin_adjust(uuid, int, text) to authenticated;

-- Config / products / genres RPCs
create or replace function public.ai_music_config_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.ai_music_config%rowtype;
  v_flag boolean;
  v_kill boolean;
begin
  select * into c from public.ai_music_config where id = 1;
  select enabled into v_flag from public.feature_flags where key = 'ai_music_enabled';
  select active into v_kill from public.kill_switches where key = 'kill_ai_music_generation';
  return jsonb_build_object(
    'enabled', coalesce(c.enabled, true) and coalesce(v_flag, true) and not coalesce(v_kill, false),
    'welcome_seconds', c.welcome_seconds,
    'min_track_seconds', c.min_track_seconds,
    'max_track_seconds', c.max_track_seconds,
    'max_concurrent_per_user', c.max_concurrent_per_user,
    'daily_generation_limit', c.daily_generation_limit,
    'prompt_max_length', c.prompt_max_length,
    'lyrics_max_length', c.lyrics_max_length,
    'reference_upload_enabled', c.reference_upload_enabled,
    'status_sharing_enabled', c.status_sharing_enabled,
    'voice_room_usage_enabled', c.voice_room_usage_enabled,
    'device_export_enabled', c.device_export_enabled,
    'model_id', c.model_id,
    'rights_policy_version', c.rights_policy_version,
    'terms_version', c.terms_version
  );
end;
$$;

grant execute on function public.ai_music_config_get() to authenticated;

create or replace function public.ai_music_products_list()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'product_id', product_id,
      'display_name', display_name,
      'seconds_granted', seconds_granted,
      'bonus_seconds', bonus_seconds,
      'apple_product_id', apple_product_id,
      'google_product_id', google_product_id,
      'badge', badge,
      'sort_order', sort_order
    ) order by sort_order
  ), '[]'::jsonb)
  from public.ai_music_products
  where is_active;
$$;

grant execute on function public.ai_music_products_list() to authenticated;

create or replace function public.ai_music_genres_search(p_query text default null, p_limit int default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_q text := public.ai_music_normalize_search(p_query);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id, 'code', g.code, 'name', g.name,
      'is_featured', g.is_featured, 'sort_order', g.sort_order
    ) order by g.is_featured desc, g.sort_order)
    from public.ai_music_genres g
    where g.is_active
      and (
        v_q is null or length(v_q) = 0
        or g.name_normalized like '%' || v_q || '%'
        or exists (
          select 1 from unnest(g.aliases) a
          where public.ai_music_normalize_search(a) like '%' || v_q || '%'
        )
      )
    limit greatest(1, least(coalesce(p_limit, 40), 100))
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ai_music_genres_search(text, int) to authenticated;

create or replace function public.ai_music_rights_accept(p_policy_version text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_policy_version is null or length(trim(p_policy_version)) = 0 then
    raise exception 'policy_version required';
  end if;
  insert into public.music_rights_acceptances (user_id, policy_version)
  values (v_uid, trim(p_policy_version))
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ai_music_rights_accept(text) to authenticated;

create or replace function public.ai_music_rights_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ver text;
  v_ok boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select rights_policy_version into v_ver from public.ai_music_config where id = 1;
  select exists (
    select 1 from public.music_rights_acceptances
    where user_id = v_uid and policy_version = v_ver
  ) into v_ok;
  return jsonb_build_object('policy_version', v_ver, 'accepted', v_ok);
end;
$$;

grant execute on function public.ai_music_rights_status() to authenticated;

-- My library
create or replace function public.ai_music_my_tracks(
  p_tab text default 'all',
  p_query text default null,
  p_sort text default 'new',
  p_limit int default 40,
  p_before timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q text := public.ai_music_normalize_search(p_query);
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        t.id, t.title, t.cover_url, t.cover_thumb_url, t.duration_ms,
        t.status, t.genre_code, t.mood, t.public_track_code, t.created_at,
        t.moderation_status, t.is_instrumental,
        exists (
          select 1 from public.ai_music_user_favorites f
          where f.user_id = v_uid and f.track_id = t.id
        ) as is_favorite
      from public.music_tracks t
      where t.owner_user_id = v_uid
        and t.source = 'ai'
        and t.soft_deleted_at is null
        and (p_before is null or t.created_at < p_before)
        and (
          p_tab is null or p_tab = 'all'
          or (p_tab = 'ready' and t.status = 'READY')
          or (p_tab = 'generating' and t.status in ('UPLOADING','PROCESSING'))
          or (p_tab = 'favorites' and exists (
            select 1 from public.ai_music_user_favorites f
            where f.user_id = v_uid and f.track_id = t.id
          ))
        )
        and (
          v_q is null or length(v_q) = 0
          or public.ai_music_normalize_search(t.title) like '%' || v_q || '%'
          or public.ai_music_normalize_search(coalesce(t.genre_code,'')) like '%' || v_q || '%'
          or public.ai_music_normalize_search(coalesce(t.mood,'')) like '%' || v_q || '%'
        )
      order by
        case when p_sort = 'old' then t.created_at end asc nulls last,
        case when p_sort = 'duration' then t.duration_ms end desc nulls last,
        case when p_sort is null or p_sort = 'new' then t.created_at end desc nulls last
      limit greatest(1, least(coalesce(p_limit, 40), 80))
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ai_music_my_tracks(text, text, text, int, timestamptz) to authenticated;

create or replace function public.ai_music_track_detail(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t public.music_tracks%rowtype;
  p public.profiles%rowtype;
  pass public.music_passports%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into t from public.music_tracks where id = p_track_id;
  if not found then raise exception 'Not found'; end if;
  if t.owner_user_id is distinct from v_uid and not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  if t.soft_deleted_at is not null and not public.ben_admin_miyim() then
    raise exception 'Not found';
  end if;

  select * into p from public.profiles where id = t.owner_user_id;
  select * into pass from public.music_passports where track_id = t.id;

  return jsonb_build_object(
    'track', to_jsonb(t),
    'creator', jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url
    ),
    'passport', case when pass.id is null then null else to_jsonb(pass) end,
    'versions', coalesce((
      select jsonb_agg(to_jsonb(v) order by v.version_number)
      from public.music_track_versions v where v.track_id = t.id
    ), '[]'::jsonb),
    'is_favorite', exists (
      select 1 from public.ai_music_user_favorites f
      where f.user_id = v_uid and f.track_id = t.id
    )
  );
end;
$$;

grant execute on function public.ai_music_track_detail(uuid) to authenticated;

create or replace function public.ai_music_track_rename(p_track_id uuid, p_title text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := nullif(trim(coalesce(p_title, '')), '');
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_title is null or char_length(v_title) > 120 then
    raise exception 'Invalid title';
  end if;
  update public.music_tracks set title = v_title, updated_at = now()
  where id = p_track_id and owner_user_id = v_uid and soft_deleted_at is null;
  if not found then raise exception 'Not found'; end if;
  return jsonb_build_object('ok', true, 'title', v_title);
end;
$$;

grant execute on function public.ai_music_track_rename(uuid, text) to authenticated;

create or replace function public.ai_music_track_soft_delete(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  update public.music_tracks set
    soft_deleted_at = now(),
    is_active = false,
    updated_at = now()
  where id = p_track_id and owner_user_id = v_uid and soft_deleted_at is null;
  if not found then raise exception 'Not found'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ai_music_track_soft_delete(uuid) to authenticated;

create or replace function public.ai_music_favorite_toggle(p_track_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exists boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not exists (
    select 1 from public.music_tracks
    where id = p_track_id and owner_user_id = v_uid and soft_deleted_at is null
  ) then raise exception 'Not found'; end if;

  select exists (
    select 1 from public.ai_music_user_favorites
    where user_id = v_uid and track_id = p_track_id
  ) into v_exists;

  if v_exists then
    delete from public.ai_music_user_favorites where user_id = v_uid and track_id = p_track_id;
    return jsonb_build_object('ok', true, 'is_favorite', false);
  end if;

  insert into public.ai_music_user_favorites (user_id, track_id) values (v_uid, p_track_id);
  return jsonb_build_object('ok', true, 'is_favorite', true);
end;
$$;

grant execute on function public.ai_music_favorite_toggle(uuid) to authenticated;

create or replace function public.ai_music_ledger_mine(p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', l.id,
      'type', l.type,
      'seconds_delta', l.seconds_delta,
      'source', l.source,
      'product_id', l.product_id,
      'description', l.description,
      'created_at', l.created_at
    ) order by l.created_at desc)
    from (
      select * from public.ai_music_entitlement_ledger
      where user_id = v_uid
      order by created_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 100))
    ) l
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ai_music_ledger_mine(int) to authenticated;

-- Playable AI tracks for voice room (owner READY + ACTIVE)
create or replace function public.ai_music_room_library(p_query text default null, p_limit int default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_q text := public.ai_music_normalize_search(p_query);
  v_cfg boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select voice_room_usage_enabled into v_cfg from public.ai_music_config where id = 1;
  if not coalesce(v_cfg, true) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'artist_name', coalesce(p.username, p.display_name),
      'cover_url', coalesce(t.cover_thumb_url, t.cover_url),
      'audio_url', t.audio_url,
      'duration_ms', t.duration_ms,
      'category_id', t.category_id,
      'tags', t.tags,
      'is_featured', false,
      'sort_order', 0,
      'is_favorite', false
    ) order by t.created_at desc)
    from public.music_tracks t
    left join public.profiles p on p.id = t.owner_user_id
    where t.owner_user_id = v_uid
      and t.source = 'ai'
      and t.status = 'READY'
      and t.is_active
      and t.soft_deleted_at is null
      and t.moderation_status = 'ACTIVE'
      and t.audio_url is not null
      and (
        v_q is null or length(v_q) = 0
        or public.ai_music_normalize_search(t.title) like '%' || v_q || '%'
      )
    limit greatest(1, least(coalesce(p_limit, 40), 80))
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ai_music_room_library(text, int) to authenticated;

-- Status share: allow music post_kind
alter table public.status_posts drop constraint if exists status_posts_post_kind_check;
alter table public.status_posts
  add constraint status_posts_post_kind_check
  check (post_kind in ('media', 'game_win', 'music'));

-- Status share: music post_kind
create or replace function public.durum_muzik_olustur(
  p_track_id uuid,
  p_caption text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  t public.music_tracks%rowtype;
  v_id uuid;
  v_cfg boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select status_sharing_enabled into v_cfg from public.ai_music_config where id = 1;
  if not coalesce(v_cfg, true) then
    return jsonb_build_object('ok', false, 'hata', 'Durum paylaşımı kapalı');
  end if;

  select * into t from public.music_tracks where id = p_track_id;
  if not found or t.owner_user_id is distinct from v_uid then
    return jsonb_build_object('ok', false, 'hata', 'Müzik bulunamadı');
  end if;
  if t.status <> 'READY' or t.soft_deleted_at is not null or t.moderation_status <> 'ACTIVE' then
    return jsonb_build_object('ok', false, 'hata', 'Bu müzik paylaşılamaz');
  end if;

  insert into public.status_posts (
    user_id, media_type, media_url, caption, post_kind, payload
  ) values (
    v_uid,
    'card',
    coalesce(t.cover_thumb_url, t.cover_url),
    nullif(trim(coalesce(p_caption, '')), ''),
    'music',
    jsonb_build_object(
      'track_id', t.id,
      'version_id', t.current_version_id,
      'title', t.title,
      'duration_ms', t.duration_ms,
      'cover_url', coalesce(t.cover_thumb_url, t.cover_url),
      'audio_url', t.audio_url,
      'public_track_code', t.public_track_code
    )
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.durum_muzik_olustur(uuid, text) to authenticated;

-- Update playable check for AI moderation
create or replace function public.music_track_playable(p_track public.music_tracks)
returns boolean
language sql
stable
as $$
  select
    p_track.status = 'READY'
    and p_track.is_active
    and p_track.audio_url is not null
    and p_track.soft_deleted_at is null
    and coalesce(p_track.moderation_status, 'ACTIVE') = 'ACTIVE'
    and (p_track.license_valid_until is null or p_track.license_valid_until >= current_date);
$$;

-- Admin dashboard
create or replace function public.ai_music_admin_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('utc', now()))::date;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'today_generations', (select count(*)::int from public.ai_music_generation_jobs where created_at::date = v_today),
    'today_success', (select count(*)::int from public.ai_music_generation_jobs where created_at::date = v_today and status = 'READY'),
    'today_failed', (select count(*)::int from public.ai_music_generation_jobs where created_at::date = v_today and status = 'FAILED'),
    'generated_seconds_today', (select coalesce(sum(requested_duration_seconds),0)::int from public.ai_music_generation_jobs where created_at::date = v_today and status = 'READY'),
    'active_users', (select count(distinct user_id)::int from public.ai_music_generation_jobs where created_at > now() - interval '7 days'),
    'purchases_today', (select count(*)::int from public.ai_music_purchases where created_at::date = v_today and status = 'CREDITED'),
    'granted_seconds', (select coalesce(sum(lifetime_granted_seconds),0)::bigint from public.ai_music_balances),
    'consumed_seconds', (select coalesce(sum(lifetime_consumed_seconds),0)::bigint from public.ai_music_balances),
    'reserved_seconds', (select coalesce(sum(reserved_seconds),0)::bigint from public.ai_music_balances),
    'failure_rate', (
      select case when count(*) = 0 then 0
        else round(100.0 * count(*) filter (where status = 'FAILED') / count(*), 1)
      end
      from public.ai_music_generation_jobs
      where created_at > now() - interval '7 days'
    )
  );
end;
$$;

grant execute on function public.ai_music_admin_dashboard() to authenticated;

create or replace function public.ai_music_admin_config_update(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  update public.ai_music_config set
    enabled = coalesce((p_payload->>'enabled')::boolean, enabled),
    welcome_seconds = coalesce((p_payload->>'welcome_seconds')::int, welcome_seconds),
    min_track_seconds = coalesce((p_payload->>'min_track_seconds')::int, min_track_seconds),
    max_track_seconds = coalesce((p_payload->>'max_track_seconds')::int, max_track_seconds),
    max_concurrent_per_user = coalesce((p_payload->>'max_concurrent_per_user')::int, max_concurrent_per_user),
    daily_generation_limit = coalesce((p_payload->>'daily_generation_limit')::int, daily_generation_limit),
    prompt_max_length = coalesce((p_payload->>'prompt_max_length')::int, prompt_max_length),
    reference_upload_enabled = coalesce((p_payload->>'reference_upload_enabled')::boolean, reference_upload_enabled),
    status_sharing_enabled = coalesce((p_payload->>'status_sharing_enabled')::boolean, status_sharing_enabled),
    voice_room_usage_enabled = coalesce((p_payload->>'voice_room_usage_enabled')::boolean, voice_room_usage_enabled),
    device_export_enabled = coalesce((p_payload->>'device_export_enabled')::boolean, device_export_enabled),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;

  if p_payload ? 'ai_music_enabled' then
    update public.feature_flags set enabled = (p_payload->>'ai_music_enabled')::boolean, updated_at = now()
    where key = 'ai_music_enabled';
  end if;

  return public.ai_music_config_get();
end;
$$;

grant execute on function public.ai_music_admin_config_update(jsonb) to authenticated;

create or replace function public.ai_music_admin_product_upsert(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_pid text := nullif(trim(coalesce(p_payload->>'product_id','')), '');
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if v_pid is null then raise exception 'product_id required'; end if;

  insert into public.ai_music_products (
    product_id, display_name, seconds_granted, bonus_seconds,
    apple_product_id, google_product_id, badge, is_active, sort_order
  ) values (
    v_pid,
    coalesce(nullif(trim(p_payload->>'display_name'),''), v_pid),
    coalesce((p_payload->>'seconds_granted')::int, 900),
    coalesce((p_payload->>'bonus_seconds')::int, 0),
    nullif(trim(p_payload->>'apple_product_id'), ''),
    nullif(trim(p_payload->>'google_product_id'), ''),
    nullif(trim(p_payload->>'badge'), ''),
    coalesce((p_payload->>'is_active')::boolean, true),
    coalesce((p_payload->>'sort_order')::int, 0)
  )
  on conflict (product_id) do update set
    display_name = excluded.display_name,
    seconds_granted = excluded.seconds_granted,
    bonus_seconds = excluded.bonus_seconds,
    apple_product_id = excluded.apple_product_id,
    google_product_id = excluded.google_product_id,
    badge = excluded.badge,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order,
    updated_at = now()
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.ai_music_admin_product_upsert(jsonb) to authenticated;

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.ai_music_balances;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.ai_music_generation_jobs;
exception when duplicate_object then null;
end $$;

-- Policy row for rights (optional content)
insert into public.policies (code, title, description, is_required, is_active, show_on_register)
values (
  'ai_music_rights',
  'AI Müzik Kullanım ve Haklar Beyanı',
  'AI müzik üretimi, kullanıcı girdileri ve içerik hakları',
  false,
  true,
  false
)
on conflict (code) do nothing;
