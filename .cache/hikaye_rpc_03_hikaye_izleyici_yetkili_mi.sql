create or replace function public.hikaye_izleyici_yetkili_mi(
  p_viewer uuid,
  p_story_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_story public.stories%rowtype;
begin
  if p_story_id is null then
    return false;
  end if;
  if not public.hikaye_aktif_mi() and not public.ben_admin_miyim() then
    return false;
  end if;

  select * into v_story from public.stories where id = p_story_id;
  if not found then
    return false;
  end if;

  if v_story.status = 'deleted' then
    return false;
  end if;

  -- Owner / admin always
  if p_viewer is not null and p_viewer = v_story.owner_id then
    return true;
  end if;
  if public.ben_admin_miyim() then
    return true;
  end if;

  -- Active-only for non-owners (archive is owner-only via RPC)
  if v_story.status <> 'active' then
    return false;
  end if;
  if v_story.expires_at <= now() then
    return false;
  end if;

  if p_viewer is null then
    return false;
  end if;

  if public.kullanicilar_engelli_mi(p_viewer, v_story.owner_id) then
    return false;
  end if;

  if exists (
    select 1 from public.story_mutes m
    where m.muter_id = p_viewer and m.muted_user_id = v_story.owner_id
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.story_audience_exclusions e
    where e.story_id = v_story.id and e.excluded_user_id = p_viewer
  ) then
    return false;
  end if;

  -- Base visibility (private accounts / blocks already partly covered)
  if not public.takip_icerik_gorunur_mu(p_viewer, v_story.owner_id) then
    return false;
  end if;

  if v_story.privacy = 'public' then
    return true;
  end if;

  if v_story.privacy = 'followers' then
    return public.takip_ediyor_mu(p_viewer, v_story.owner_id);
  end if;

  if v_story.privacy = 'close_friends' then
    return exists (
      select 1 from public.story_close_friends cf
      where cf.owner_id = v_story.owner_id and cf.friend_id = p_viewer
    );
  end if;

  return false;
end;
$$;

grant execute on function public.hikaye_izleyici_yetkili_mi(uuid, uuid) to authenticated;