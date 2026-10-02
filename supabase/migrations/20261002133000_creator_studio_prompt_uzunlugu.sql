-- Uzun oyun promptları 2000 karakterde kesilmesin.
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
      left(trim(coalesce(p_prompt, '')), 8000),
      coalesce(p_options, '{}'::jsonb),
      'DRAFT',
      'tamuso_game_v2'
    )
    returning id into v_id;
  else
    update public.creator_games
    set
      title = left(trim(coalesce(p_title, title)), 80),
      prompt = left(trim(coalesce(p_prompt, prompt)), 8000),
      options = coalesce(p_options, options),
      updated_at = now()
    where id = p_id and creator_id = v_uid and runtime_type = 'tamuso_game_v2'
    returning id into v_id;
    if v_id is null then raise exception 'Forbidden'; end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'runtime_type', 'tamuso_game_v2');
end;
$$;
