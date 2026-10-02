alter table public.creator_games
  add column if not exists algorithm_enabled boolean not null default false,
  add column if not exists coin_enabled boolean not null default false,
  add column if not exists published_at timestamptz;

create or replace function public.creator_v2_admin_liste()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', g.id,
      'title', g.title,
      'status', g.status,
      'error_code', g.error_code,
      'algorithm_enabled', g.algorithm_enabled,
      'coin_enabled', g.coin_enabled,
      'published_at', g.published_at,
      'updated_at', g.updated_at
    ) order by g.updated_at desc)
    from (
      select * from public.creator_games
      where runtime_type = 'tamuso_game_v2'
      order by updated_at desc
      limit 40
    ) g
  ), '[]'::jsonb);
end;
$$;

create or replace function public.creator_v2_admin_oku(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.creator_games%rowtype;
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  select * into v_row from public.creator_games where id = p_id and runtime_type = 'tamuso_game_v2';
  if v_row.id is null then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'status', v_row.status,
    'manifest', v_row.manifest,
    'algorithm_enabled', v_row.algorithm_enabled,
    'coin_enabled', v_row.coin_enabled,
    'published_at', v_row.published_at
  );
end;
$$;

create or replace function public.creator_v2_admin_karar(p_id uuid, p_alan text, p_acik boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  if p_alan = 'algorithm' then
    update public.creator_games set algorithm_enabled = p_acik, updated_at = now()
    where id = p_id and runtime_type = 'tamuso_game_v2';
  elsif p_alan = 'coin' then
    update public.creator_games set coin_enabled = p_acik, updated_at = now()
    where id = p_id and runtime_type = 'tamuso_game_v2';
  else
    raise exception 'BAD_FIELD';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.creator_v2_admin_yayinla(p_id uuid, p_canli boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if auth.uid() is null or not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;
  select status into v_status from public.creator_games where id = p_id and runtime_type = 'tamuso_game_v2';
  if v_status is null then raise exception 'Forbidden'; end if;
  if p_canli then
    if v_status not in ('READY_FOR_PREVIEW', 'PRIVATE_TEST', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'PUBLISHED') then
      raise exception 'NOT_READY';
    end if;
    update public.creator_games
    set status = 'PUBLISHED', published_at = now(), updated_at = now()
    where id = p_id;
  else
    update public.creator_games
    set status = 'PRIVATE_TEST', published_at = null, updated_at = now()
    where id = p_id and status = 'PUBLISHED';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.creator_v2_admin_liste() from public, anon;
revoke all on function public.creator_v2_admin_oku(uuid) from public, anon;
revoke all on function public.creator_v2_admin_karar(uuid, text, boolean) from public, anon;
revoke all on function public.creator_v2_admin_yayinla(uuid, boolean) from public, anon;
grant execute on function public.creator_v2_admin_liste() to authenticated;
grant execute on function public.creator_v2_admin_oku(uuid) to authenticated;
grant execute on function public.creator_v2_admin_karar(uuid, text, boolean) to authenticated;
grant execute on function public.creator_v2_admin_yayinla(uuid, boolean) to authenticated;
