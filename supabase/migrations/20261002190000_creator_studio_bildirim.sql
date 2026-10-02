-- Studio üretim ve inceleme bildirimleri. Mevcut push kuyruğunu kullanır.

insert into public.bildirim_tur_katalog (
  kod, grup, kitle, varsayilan_acik, grup_sira, sira, baslik, aciklama
)
values
  ('studio_ready', 'studio', 'kullanici', true, 80, 10,
    jsonb_build_object('tr', 'Oyun hazır', 'en', 'Game ready'),
    jsonb_build_object('tr', 'Oyunun test edilebilir olunca', 'en', 'When your game is ready to test')),
  ('studio_failed', 'studio', 'kullanici', true, 80, 20,
    jsonb_build_object('tr', 'Oyun tamamlanamadı', 'en', 'Game not completed'),
    jsonb_build_object('tr', 'Üretim tamamlanamazsa', 'en', 'When generation does not finish')),
  ('studio_approved', 'studio', 'kullanici', true, 80, 30,
    jsonb_build_object('tr', 'Oyun onaylandı', 'en', 'Game approved'),
    jsonb_build_object('tr', 'Oyunun yayına alınınca', 'en', 'When your game is approved')),
  ('studio_rejected', 'studio', 'kullanici', true, 80, 40,
    jsonb_build_object('tr', 'Oyun onaylanmadı', 'en', 'Game not approved'),
    jsonb_build_object('tr', 'İnceleme oyunu onaylamazsa', 'en', 'When review does not approve the game'))
on conflict (kod) do nothing;

create or replace function public.creator_studio_bildir(p_id uuid, p_olay text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.creator_games%rowtype;
  v_baslik text;
  v_govde text;
  v_ad text;
  v_id uuid;
begin
  if p_olay not in ('studio_ready', 'studio_failed', 'studio_approved', 'studio_rejected') then
    return null;
  end if;
  select * into v_row from public.creator_games where id = p_id;
  if v_row.id is null then return null; end if;
  v_ad := left(coalesce(nullif(btrim(v_row.title), ''), 'Tamuso Studio'), 80);

  if exists (
    select 1 from public.user_notifications n
    where n.user_id = v_row.creator_id
      and n.payload->>'type' = p_olay
      and n.payload->>'game_id' = p_id::text
      and n.created_at > now() - case
        when p_olay in ('studio_approved', 'studio_rejected') then interval '6 hours'
        else interval '2 minutes'
      end
  ) then
    return null;
  end if;

  if p_olay = 'studio_ready' then
    v_baslik := 'Oyunun hazır';
    v_govde := v_ad || ' artık test edilebilir.';
  elsif p_olay = 'studio_failed' then
    v_baslik := 'Oyun tamamlanamadı';
    v_govde := v_ad || ' üretimi tamamlanamadı.';
  elsif p_olay = 'studio_approved' then
    v_baslik := 'Oyunun onaylandı';
    v_govde := v_ad || ' yayın için onaylandı.';
  else
    v_baslik := 'Oyun onaylanmadı';
    v_govde := v_ad || ' incelemeden geçmedi.';
  end if;

  v_id := public.bildirim_kuyruga_ekle(
    v_row.creator_id,
    'studio',
    v_baslik,
    v_govde,
    '/studio/' || p_id::text,
    jsonb_build_object('type', p_olay, 'game_id', p_id)
  );
  return v_id;
exception when others then
  raise warning 'creator_studio_bildir: %', SQLERRM;
  return null;
end;
$$;

revoke all on function public.creator_studio_bildir(uuid, text) from public, anon, authenticated;
grant execute on function public.creator_studio_bildir(uuid, text) to service_role;

create or replace function public.creator_v2_admin_incele(p_id uuid, p_karar text)
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
  if p_karar not in ('APPROVED', 'REJECTED') then
    raise exception 'BAD_DECISION';
  end if;
  select status into v_status
  from public.creator_games
  where id = p_id and runtime_type = 'tamuso_game_v2';
  if v_status is null then raise exception 'Forbidden'; end if;
  if v_status not in ('SUBMITTED', 'IN_REVIEW', 'READY_FOR_PREVIEW', 'PRIVATE_TEST', 'CHANGES_REQUESTED', 'APPROVED') then
    raise exception 'NOT_READY';
  end if;
  update public.creator_games
  set status = p_karar, updated_at = now()
  where id = p_id;
  perform public.creator_studio_bildir(
    p_id,
    case when p_karar = 'APPROVED' then 'studio_approved' else 'studio_rejected' end
  );
  return jsonb_build_object('ok', true, 'status', p_karar);
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
    perform public.creator_studio_bildir(p_id, 'studio_approved');
  else
    update public.creator_games
    set status = 'PRIVATE_TEST', published_at = null, updated_at = now()
    where id = p_id and status = 'PUBLISHED';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.creator_v2_admin_incele(uuid, text) from public, anon;
grant execute on function public.creator_v2_admin_incele(uuid, text) to authenticated;
grant execute on function public.creator_v2_admin_yayinla(uuid, boolean) to authenticated;
