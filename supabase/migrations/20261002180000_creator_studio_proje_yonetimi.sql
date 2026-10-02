-- Studio V3 proje yönetimi. Geriye dönük, yıkıcı olmayan.

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
    'FAILED',
    'CANCELLED'
  ));

create or replace function public.creator_oyun_arsivle(p_id uuid, p_arsiv boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_once text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select status into v_once
  from public.creator_games
  where id = p_id and creator_id = auth.uid();
  if v_once is null then raise exception 'Forbidden'; end if;
  if p_arsiv then
    update public.creator_games
    set options = options || jsonb_build_object('archived_from', v_once),
        status = 'ARCHIVED',
        updated_at = now()
    where id = p_id and creator_id = auth.uid();
  else
    update public.creator_games
    set status = coalesce(nullif(options->>'archived_from', ''), 'DRAFT'),
        updated_at = now()
    where id = p_id and creator_id = auth.uid() and status = 'ARCHIVED';
  end if;
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

create or replace function public.creator_oyun_cogalt(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_src public.creator_games%rowtype;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.creator_studio_bayrak('studio_enabled') then raise exception 'CREATE_DISABLED'; end if;
  select * into v_src from public.creator_games where id = p_id and creator_id = auth.uid();
  if v_src.id is null then raise exception 'Forbidden'; end if;
  insert into public.creator_games (
    creator_id, title, prompt, options, plan, status, runtime_type,
    specification, design, asset_plan, scene_graph, gameplay_graph, manifest
  ) values (
    auth.uid(),
    left(coalesce(v_src.title, '') || ' 2', 80),
    v_src.prompt,
    coalesce(v_src.options, '{}'::jsonb) || jsonb_build_object('copied_from', v_src.id),
    v_src.plan,
    'DRAFT',
    v_src.runtime_type,
    v_src.specification,
    v_src.design,
    v_src.asset_plan,
    v_src.scene_graph,
    v_src.gameplay_graph,
    v_src.manifest
  )
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.creator_oyun_sil(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.creator_games%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_row from public.creator_games where id = p_id and creator_id = auth.uid();
  if v_row.id is null then raise exception 'Forbidden'; end if;
  if v_row.status in ('PLANNING', 'GENERATING_ASSETS', 'BUILDING_SCENE', 'BUILDING_GAMEPLAY', 'SCANNING') then
    raise exception 'GENERATION_ACTIVE';
  end if;
  delete from public.creator_studio_jobs where game_id = p_id;
  delete from public.creator_game_assets where game_id = p_id and creator_id = auth.uid();
  delete from public.creator_game_revisions where game_id = p_id and creator_id = auth.uid();
  delete from public.creator_games where id = p_id and creator_id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.creator_oyun_adlandir(p_id uuid, p_title text, p_description text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.creator_games
  set
    title = left(btrim(coalesce(p_title, title)), 80),
    specification = case
      when specification is null then specification
      else jsonb_set(
        jsonb_set(specification, '{game,title}', to_jsonb(left(btrim(coalesce(p_title, title)), 80)), true),
        '{game,description}', to_jsonb(left(btrim(coalesce(p_description, '')), 280)), true)
    end,
    updated_at = now()
  where id = p_id and creator_id = auth.uid();
  if not found then raise exception 'Forbidden'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.creator_revizyonlar(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not exists (select 1 from public.creator_games g where g.id = p_id and g.creator_id = auth.uid()) then
    raise exception 'Forbidden';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'revision', r.revision,
      'summary', r.summary,
      'createdAt', r.created_at
    ) order by r.revision desc)
    from public.creator_game_revisions r
    where r.game_id = p_id and r.creator_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.creator_oyun_arsivle(uuid, boolean) from public, anon;
revoke all on function public.creator_oyun_cogalt(uuid) from public, anon;
revoke all on function public.creator_oyun_sil(uuid) from public, anon;
revoke all on function public.creator_oyun_adlandir(uuid, text, text) from public, anon;
revoke all on function public.creator_revizyonlar(uuid) from public, anon;
grant execute on function public.creator_oyun_arsivle(uuid, boolean) to authenticated;
grant execute on function public.creator_oyun_cogalt(uuid) to authenticated;
grant execute on function public.creator_oyun_sil(uuid) to authenticated;
grant execute on function public.creator_oyun_adlandir(uuid, text, text) to authenticated;
grant execute on function public.creator_revizyonlar(uuid) to authenticated;
