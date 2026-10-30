-- Profil: alınan hediyeler ve kimin attığı.
-- hide_gift_collection açıksa yalnızca profil sahibi görür.

create or replace function public.profil_alinan_hediyeler(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_gizli boolean := false;
  v_toplam bigint := 0;
  v_coin bigint := 0;
  v_liste jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_user_id is null then
    raise exception 'User required';
  end if;

  select coalesce(s.hide_gift_collection, false)
    into v_gizli
  from public.user_privacy_settings s
  where s.user_id = p_user_id;

  v_gizli := coalesce(v_gizli, false);
  if v_gizli and v_uid is distinct from p_user_id then
    return jsonb_build_object(
      'gizli', true,
      'toplam_adet', 0,
      'toplam_coin', 0,
      'gonderenler', '[]'::jsonb
    );
  end if;

  select coalesce(sum(gt.quantity), 0), coalesce(sum(gt.coins_spent), 0)
    into v_toplam, v_coin
  from public.gift_transactions gt
  where gt.receiver_id = p_user_id;

  with satir as (
    select
      gt.sender_id,
      gt.gift_id,
      sum(gt.quantity)::bigint as adet,
      sum(gt.coins_spent)::bigint as coin,
      max(gt.created_at) as son
    from public.gift_transactions gt
    where gt.receiver_id = p_user_id
    group by gt.sender_id, gt.gift_id
  ),
  gonderen as (
    select
      sender_id,
      sum(adet)::bigint as adet,
      sum(coin)::bigint as coin,
      max(son) as son
    from satir
    group by sender_id
    order by sum(coin) desc, max(son) desc
    limit 40
  )
  select coalesce(jsonb_agg(satir_json order by coin desc, son desc), '[]'::jsonb)
    into v_liste
  from (
    select
      g.coin,
      g.son,
      jsonb_build_object(
        'user_id', g.sender_id,
        'display_name', p.display_name,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'adet', g.adet,
        'coin', g.coin,
        'son', g.son,
        'hediyeler', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'ad', coalesce(gf.name, gf.code, ''),
              'emoji', coalesce(gf.emoji, ''),
              'adet', s.adet,
              'coin', s.coin
            )
            order by s.coin desc
          )
          from satir s
          left join public.gifts gf on gf.id = s.gift_id
          where s.sender_id = g.sender_id
        ), '[]'::jsonb)
      ) as satir_json
    from gonderen g
    left join public.profiles p on p.id = g.sender_id
  ) q;

  return jsonb_build_object(
    'gizli', false,
    'toplam_adet', v_toplam,
    'toplam_coin', v_coin,
    'gonderenler', v_liste
  );
end;
$$;

grant execute on function public.profil_alinan_hediyeler(uuid) to authenticated;

notify pgrst, 'reload schema';
