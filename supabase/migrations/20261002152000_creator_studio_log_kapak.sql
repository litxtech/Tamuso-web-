alter table public.creator_games
  add column if not exists avatar_r2_key text,
  add column if not exists cover_source text,
  add column if not exists avatar_source text;

alter table public.creator_games
  drop constraint if exists creator_games_cover_source_check;
alter table public.creator_games
  add constraint creator_games_cover_source_check
  check (cover_source is null or cover_source in ('model', 'creator', 'admin'));

alter table public.creator_games
  drop constraint if exists creator_games_avatar_source_check;
alter table public.creator_games
  add constraint creator_games_avatar_source_check
  check (avatar_source is null or avatar_source in ('model', 'creator', 'admin'));

create table if not exists public.creator_studio_logs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.creator_games(id) on delete cascade,
  level text not null check (level in ('info', 'warn', 'error')),
  step text not null,
  code text,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists creator_studio_logs_oyun_zaman
  on public.creator_studio_logs (game_id, created_at desc);

alter table public.creator_studio_logs enable row level security;

drop policy if exists studio_log_oku on public.creator_studio_logs;
create policy studio_log_oku on public.creator_studio_logs
  for select to authenticated
  using (
    exists (
      select 1 from public.creator_games g
      where g.id = game_id and g.creator_id = auth.uid()
    )
    or public.ben_admin_miyim()
  );

create or replace function public.creator_v2_admin_oku(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.creator_games%rowtype;
  v_logs jsonb;
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  select * into v_row from public.creator_games where id = p_id and runtime_type = 'tamuso_game_v2';
  if v_row.id is null then raise exception 'Forbidden'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'at', l.created_at,
    'level', l.level,
    'step', l.step,
    'code', l.code,
    'detail', l.detail
  ) order by l.created_at desc), '[]'::jsonb)
  into v_logs
  from (
    select * from public.creator_studio_logs
    where game_id = p_id
    order by created_at desc
    limit 20
  ) l;
  return jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'status', v_row.status,
    'manifest', v_row.manifest,
    'algorithm_enabled', v_row.algorithm_enabled,
    'coin_enabled', v_row.coin_enabled,
    'published_at', v_row.published_at,
    'logs', v_logs
  );
end;
$$;
