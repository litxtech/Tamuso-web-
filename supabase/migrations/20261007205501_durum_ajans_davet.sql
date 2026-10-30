-- Ajans davetini durum gönderisi olarak paylaş.
-- Kartta ajans adı, üye sayısı, işlem hacmi (hediye coin) ve dakika anlık görüntüsü tutulur.

alter table public.status_posts
  drop constraint if exists status_posts_post_kind_check;

alter table public.status_posts
  add constraint status_posts_post_kind_check
  check (post_kind in ('media', 'game_win', 'music', 'agency_invite'));

create or replace function public.durum_ajans_davet_olustur(
  p_invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_code text := upper(trim(coalesce(p_invite_code, '')));
  v_invite public.agency_invites%rowtype;
  v_agency public.agencies%rowtype;
  v_uye int;
  v_hacim bigint;
  v_yayin_dk bigint;
  v_ses_dk bigint;
  v_id uuid;
  v_payload jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir durum paylasamaz'; end if;
  if v_code = '' then raise exception 'Davet kodu gerekli'; end if;

  select * into v_invite
  from public.agency_invites
  where invite_code = v_code
    and status = 'active'
    and (expires_at is null or expires_at > now())
    and (max_uses is null or used_count < max_uses);

  if not found then raise exception 'Davet bulunamadi'; end if;

  perform public.agency_require_permission(v_invite.agency_id, 'agency.manage_invites');

  select * into v_agency from public.agencies where id = v_invite.agency_id;
  if not found or v_agency.status = 'closed' then
    raise exception 'Ajans bulunamadi';
  end if;

  select count(*)::int into v_uye
  from public.host_profiles
  where agency_id = v_agency.id and status = 'agency';

  select coalesce(sum(gt.coins_spent), 0)::bigint into v_hacim
  from public.gift_transactions gt
  join public.host_profiles hp on hp.user_id = gt.receiver_id
  where hp.agency_id = v_agency.id and hp.status = 'agency';

  select coalesce(floor(sum(
    extract(epoch from (
      coalesce(ls.ended_at, case when ls.is_live then now() else ls.started_at end)
      - ls.started_at
    )) / 60.0
  )), 0)::bigint into v_yayin_dk
  from public.live_sessions ls
  join public.host_profiles hp on hp.user_id = ls.host_id
  where hp.agency_id = v_agency.id and hp.status = 'agency';

  select coalesce(floor(sum(
    extract(epoch from (
      coalesce(r.ended_at, case when r.is_live then now() else r.created_at end)
      - r.created_at
    )) / 60.0
  )), 0)::bigint into v_ses_dk
  from public.rooms r
  join public.host_profiles hp on hp.user_id = r.host_id
  where hp.agency_id = v_agency.id and hp.status = 'agency';

  v_payload := jsonb_build_object(
    'agency_id', v_agency.id,
    'agency_name', v_agency.name,
    'invite_code', v_invite.invite_code,
    'uye_sayisi', coalesce(v_uye, 0),
    'islem_hacmi', coalesce(v_hacim, 0),
    'dakika', coalesce(v_yayin_dk, 0) + coalesce(v_ses_dk, 0)
  );

  insert into public.status_posts (
    user_id, media_type, media_url, caption, post_kind, payload
  )
  values (
    v_uid,
    'card',
    'card://agency_invite',
    null,
    'agency_invite',
    v_payload
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.durum_ajans_davet_olustur(text) to authenticated;
