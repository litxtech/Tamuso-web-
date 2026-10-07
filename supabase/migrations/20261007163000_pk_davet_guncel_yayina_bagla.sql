-- PK kabulü: davetteki yayın kapanmışsa host'un güncel canlısına bağla.
-- Süresi dolmuş maçları kapat ki yeni PK takılmasın.

update public.pk_matches
set
  status = 'finished',
  finished_at = coalesce(finished_at, now()),
  winner_side = coalesce(winner_side, 'draw')
where status = 'live'
  and ends_at is not null
  and ends_at <= now();

create or replace function public.pk_davet_yanitla(
  p_invite_id uuid,
  p_kabul boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.pk_invites%rowtype;
  v_from public.live_sessions%rowtype;
  v_to public.live_sessions%rowtype;
  v_match public.pk_matches%rowtype;
  v_from_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  update public.pk_matches
  set
    status = 'finished',
    finished_at = coalesce(finished_at, now()),
    winner_side = coalesce(winner_side, 'draw')
  where status = 'live'
    and ends_at is not null
    and ends_at <= now();

  select * into v_inv from public.pk_invites where id = p_invite_id for update;
  if not found then raise exception 'Invite not found'; end if;
  if v_inv.to_host_id <> v_uid then raise exception 'Not authorized'; end if;
  if v_inv.status <> 'pending' then raise exception 'Invite already resolved'; end if;

  if v_inv.expires_at <= now() then
    update public.pk_invites
    set status = 'expired', responded_at = now()
    where id = p_invite_id
    returning * into v_inv;
    return jsonb_build_object('ok', false, 'status', 'expired', 'invite_id', v_inv.id);
  end if;

  if not p_kabul then
    update public.pk_invites
    set status = 'rejected', responded_at = now()
    where id = p_invite_id
    returning * into v_inv;

    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Yayıncı')
    into v_from_name
    from public.profiles where id = v_uid;

    begin
      perform public.bildirim_kuyruga_ekle(
        v_inv.from_host_id,
        'live',
        'PK reddedildi',
        v_from_name || ' PK davetini reddetti',
        '/canli',
        jsonb_build_object(
          'type', 'pk_rejected',
          'invite_id', v_inv.id,
          'status', 'rejected'
        )
      );
    exception when others then
      null;
    end;

    return jsonb_build_object('ok', true, 'status', 'rejected', 'invite_id', v_inv.id);
  end if;

  select * into v_from from public.live_sessions where id = v_inv.from_live_id;
  if not found or not coalesce(v_from.is_live, false) then
    select * into v_from
    from public.live_sessions
    where host_id = v_inv.from_host_id
      and is_live = true
    order by started_at desc nulls last
    limit 1;
  end if;

  select * into v_to from public.live_sessions where id = v_inv.to_live_id;
  if not found or not coalesce(v_to.is_live, false) then
    select * into v_to
    from public.live_sessions
    where host_id = v_inv.to_host_id
      and is_live = true
    order by started_at desc nulls last
    limit 1;
  end if;

  if v_from.id is null
     or v_to.id is null
     or not coalesce(v_from.is_live, false)
     or not coalesce(v_to.is_live, false)
     or v_from.id = v_to.id
     or v_from.host_id = v_to.host_id then
    update public.pk_invites
    set status = 'expired', responded_at = now()
    where id = p_invite_id;
    raise exception 'Live session ended';
  end if;

  if exists (
    select 1 from public.pk_matches m
    where m.status = 'live'
      and (m.ends_at is null or m.ends_at > now())
      and (
        m.live_a_id in (v_from.id, v_to.id)
        or m.live_b_id in (v_from.id, v_to.id)
      )
  ) then
    raise exception 'Already in live PK';
  end if;

  insert into public.pk_matches (
    pk_type, status, live_a_id, live_b_id,
    score_a, score_b, started_at, ends_at
  ) values (
    '1v1', 'live', v_from.id, v_to.id,
    0, 0, now(), now() + make_interval(secs => v_inv.sure_saniye)
  )
  returning * into v_match;

  update public.pk_invites
  set
    status = 'accepted',
    responded_at = now(),
    match_id = v_match.id,
    from_live_id = v_from.id,
    to_live_id = v_to.id
  where id = p_invite_id
  returning * into v_inv;

  select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Yayıncı')
  into v_from_name
  from public.profiles where id = v_uid;

  begin
    perform public.bildirim_kuyruga_ekle(
      v_inv.from_host_id,
      'live',
      'PK kabul edildi',
      v_from_name || ' PK davetini kabul etti — maç başladı!',
      '/pk',
      jsonb_build_object(
        'type', 'pk_accepted',
        'invite_id', v_inv.id,
        'match_id', v_match.id,
        'status', 'accepted'
      )
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok', true,
    'status', 'accepted',
    'invite_id', v_inv.id,
    'match_id', v_match.id,
    'ends_at', v_match.ends_at
  );
end;
$$;

grant execute on function public.pk_davet_yanitla(uuid, boolean) to authenticated;
