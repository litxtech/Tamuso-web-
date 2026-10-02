-- Tamuso Studio V2. Mevcut satırlar legacy_hidden_pick kalır.
-- Eski migration dosyaları değiştirilmez.

do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'creator_games'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.creator_games drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.creator_games
  add column if not exists runtime_type text not null default 'legacy_hidden_pick',
  add column if not exists error_code text,
  add column if not exists specification jsonb,
  add column if not exists design jsonb,
  add column if not exists asset_plan jsonb,
  add column if not exists scene_graph jsonb,
  add column if not exists gameplay_graph jsonb,
  add column if not exists manifest jsonb,
  add column if not exists thumbnail_r2_key text,
  add column if not exists active_version int not null default 0;

update public.creator_games
set status = 'DRAFT'
where status = 'draft';

alter table public.creator_games
  alter column status set default 'DRAFT';

alter table public.creator_games
  drop constraint if exists creator_games_runtime_type_check;

alter table public.creator_games
  add constraint creator_games_runtime_type_check
  check (runtime_type in ('legacy_hidden_pick', 'tamuso_game_v2'));

alter table public.creator_games
  drop constraint if exists creator_games_status_check;

alter table public.creator_games
  add constraint creator_games_status_check
  check (status in (
    'DRAFT',
    'PLANNING',
    'GENERATING_ASSETS',
    'BUILDING_SCENE',
    'BUILDING_GAMEPLAY',
    'READY_FOR_PREVIEW',
    'PRIVATE_TEST',
    'SUBMITTED',
    'SCANNING',
    'IN_REVIEW',
    'CHANGES_REQUESTED',
    'APPROVED',
    'PUBLISHED',
    'SUSPENDED',
    'REJECTED',
    'ARCHIVED',
    'FAILED'
  ));

do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'creator_studio_jobs'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.creator_studio_jobs drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.creator_studio_jobs
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists attempt int not null default 0;

alter table public.creator_studio_jobs
  drop constraint if exists creator_studio_jobs_status_check;

alter table public.creator_studio_jobs
  add constraint creator_studio_jobs_status_check
  check (status in ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED'));

drop index if exists public.creator_studio_jobs_running_one;

create unique index if not exists creator_studio_jobs_spec_running
  on public.creator_studio_jobs (game_id)
  where status = 'RUNNING' and kind = 'GAME_SPEC';

create table if not exists public.creator_game_assets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.creator_games(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  version_no int not null default 1,
  asset_key text not null,
  asset_type text not null,
  source_provider text not null,
  provider_job_id text,
  status text not null,
  pipeline jsonb not null default '{}'::jsonb,
  r2_key text,
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  model_format text,
  polygon_count int,
  texture_resolution text,
  checksum text,
  error_code text,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  unique (game_id, asset_key)
);

alter table public.creator_game_assets
  drop constraint if exists creator_game_assets_status_check;

alter table public.creator_game_assets
  add constraint creator_game_assets_status_check
  check (status in (
    'QUEUED', 'GENERATING', 'GENERATED', 'DOWNLOADED', 'VALIDATED',
    'UPLOADED', 'READY', 'FAILED', 'CANCELLED'
  ));

create index if not exists creator_game_assets_game_idx
  on public.creator_game_assets (game_id, status);

create table if not exists public.creator_game_revisions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.creator_games(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  revision int not null,
  summary text not null default '',
  specification jsonb,
  design jsonb,
  scene_graph jsonb,
  gameplay_graph jsonb,
  manifest jsonb,
  created_at timestamptz not null default now(),
  unique (game_id, revision)
);

alter table public.creator_game_assets enable row level security;
alter table public.creator_game_revisions enable row level security;

drop policy if exists creator_game_assets_kendi on public.creator_game_assets;
create policy creator_game_assets_kendi
  on public.creator_game_assets
  for select
  to authenticated
  using (creator_id = auth.uid());

drop policy if exists creator_game_revisions_kendi on public.creator_game_revisions;
create policy creator_game_revisions_kendi
  on public.creator_game_revisions
  for select
  to authenticated
  using (creator_id = auth.uid());

revoke all on public.creator_game_assets from public, anon;
revoke all on public.creator_game_revisions from public, anon;
grant select on public.creator_game_assets to authenticated;
grant select on public.creator_game_revisions to authenticated;

create or replace function public.creator_oyunlarim()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.creator_studio_bayrak('studio_enabled') then
    raise exception 'STUDIO_CLOSED';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(t) order by t.updated_at desc)
    from (
      select
        g.id,
        g.title,
        g.prompt,
        g.status,
        g.updated_at,
        g.runtime_type,
        g.error_code,
        g.thumbnail_r2_key,
        g.active_version,
        (g.plan is not null) as has_plan,
        coalesce(g.specification->'game'->>'genre', g.plan->>'genre') as genre,
        coalesce(g.specification->'game'->>'dimension', g.options->>'dimension') as dimension,
        (select count(*) from public.creator_game_assets a where a.game_id = g.id and a.status = 'READY') as assets_ready,
        (select count(*) from public.creator_game_assets a where a.game_id = g.id) as assets_total
      from public.creator_games g
      where g.creator_id = auth.uid()
      order by g.updated_at desc
      limit 40
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.creator_oyun_oku(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.creator_games%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_row from public.creator_games where id = p_id and creator_id = auth.uid();
  if v_row.id is null then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'prompt', v_row.prompt,
    'options', v_row.options,
    'plan', v_row.plan,
    'status', v_row.status,
    'updated_at', v_row.updated_at,
    'runtime_type', v_row.runtime_type,
    'error_code', v_row.error_code,
    'thumbnail_r2_key', v_row.thumbnail_r2_key,
    'active_version', v_row.active_version,
    'specification', v_row.specification,
    'design', v_row.design,
    'asset_plan', v_row.asset_plan,
    'scene_graph', v_row.scene_graph,
    'gameplay_graph', v_row.gameplay_graph,
    'manifest', v_row.manifest
  );
end;
$$;

create or replace function public.creator_v2_kaydet(
  p_id uuid,
  p_prompt text,
  p_options jsonb,
  p_title text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_ver int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.creator_studio_bayrak('studio_enabled') then
    raise exception 'STUDIO_CLOSED';
  end if;
  select version into v_ver from public.creator_studio_terms where id = 1;
  if not exists (
    select 1 from public.creator_studio_acceptances a
    where a.user_id = v_uid and a.terms_version = v_ver
  ) then
    raise exception 'TERMS_REQUIRED';
  end if;

  if p_id is null then
    if not public.creator_studio_bayrak('new_game_creation_enabled') then
      raise exception 'CREATE_DISABLED';
    end if;
    insert into public.creator_games (
      creator_id, title, prompt, options, status, runtime_type
    ) values (
      v_uid,
      left(trim(coalesce(p_title, '')), 80),
      left(trim(coalesce(p_prompt, '')), 2000),
      coalesce(p_options, '{}'::jsonb),
      'DRAFT',
      'tamuso_game_v2'
    )
    returning id into v_id;
  else
    update public.creator_games
    set
      title = left(trim(coalesce(p_title, title)), 80),
      prompt = left(trim(coalesce(p_prompt, prompt)), 2000),
      options = coalesce(p_options, options),
      updated_at = now()
    where id = p_id and creator_id = v_uid and runtime_type = 'tamuso_game_v2'
    returning id into v_id;
    if v_id is null then raise exception 'Forbidden'; end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'runtime_type', 'tamuso_game_v2');
end;
$$;

revoke all on function public.creator_v2_kaydet(uuid, text, jsonb, text) from public, anon;
grant execute on function public.creator_v2_kaydet(uuid, text, jsonb, text) to authenticated;
