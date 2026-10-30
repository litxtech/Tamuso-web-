-- Profil ziyareti avatar hikaye halkası özeti
create or replace function public.hikaye_kullanici_ozet(p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_story_id uuid;
  v_item_count int := 0;
  v_has_unseen boolean := false;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_owner_id is null then
    return jsonb_build_object('ok', true, 'has_active', false, 'has_unseen', false, 'item_count', 0);
  end if;
  if not public.hikaye_aktif_mi() then
    return jsonb_build_object('ok', true, 'enabled', false, 'has_active', false, 'has_unseen', false, 'item_count', 0);
  end if;

  select s.id, s.item_count into v_story_id, v_item_count
  from public.stories s
  where s.owner_id = p_owner_id
    and s.status = 'active'
    and s.expires_at > now()
    and s.item_count > 0
    and s.deleted_at is null
  order by s.created_at desc
  limit 1;

  if v_story_id is null then
    return jsonb_build_object('ok', true, 'has_active', false, 'has_unseen', false, 'item_count', 0);
  end if;

  if not public.hikaye_izleyici_yetkili_mi(v_uid, v_story_id) then
    return jsonb_build_object('ok', true, 'has_active', false, 'has_unseen', false, 'item_count', 0);
  end if;

  select exists (
    select 1 from public.story_items si
    where si.story_id = v_story_id and si.status = 'active' and si.deleted_at is null
      and not exists (
        select 1 from public.story_views sv
        where sv.story_item_id = si.id and sv.viewer_id = v_uid
      )
  ) into v_has_unseen;

  return jsonb_build_object(
    'ok', true,
    'has_active', true,
    'has_unseen', coalesce(v_has_unseen, false),
    'item_count', coalesce(v_item_count, 0),
    'story_id', v_story_id,
    'owner_id', p_owner_id
  );
end;
$$;

grant execute on function public.hikaye_kullanici_ozet(uuid) to authenticated;
