-- Ses odası kartı: toplam hediye + oyun coin.
-- Oda içi: günlük / haftalık / aylık kullanıcı katkı listesi.

create index if not exists gift_tx_room_created_idx
  on public.gift_transactions (room_id, created_at desc);

create or replace function public.oda_islem_ozeti(p_room_ids uuid[])
returns table (
  room_id uuid,
  hediye_coin bigint,
  oyun_coin bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select r.id
    from unnest(coalesce(p_room_ids, '{}'::uuid[])) with ordinality as r(id, sira)
    where r.sira <= 80
  ),
  hediye as (
    select g.room_id, sum(g.coins_spent)::bigint as coin
    from public.gift_transactions g
    where g.room_id in (select id from ids)
    group by g.room_id
  ),
  oyun as (
    select h.room_id, sum(h.spent_coin)::bigint as coin
    from public.oda_oyun_harcama h
    where h.room_id in (select id from ids)
    group by h.room_id
  )
  select
    i.id,
    coalesce(h.coin, 0),
    coalesce(o.coin, 0)
  from ids i
  left join hediye h on h.room_id = i.id
  left join oyun o on o.room_id = i.id;
$$;

create or replace function public.oda_katki_listesi(
  p_room_id uuid,
  p_period text
)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  hediye_coin bigint,
  oyun_coin bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period text;
  v_bas timestamptz;
begin
  if auth.uid() is null or p_room_id is null then
    return;
  end if;

  v_period := case
    when p_period in ('daily', 'weekly', 'monthly') then p_period
    else 'daily'
  end;
  v_bas := public.liderlik_period_baslangic(v_period);

  return query
  with hediye as (
    select g.sender_id as uid, sum(g.coins_spent)::bigint as coin
    from public.gift_transactions g
    where g.room_id = p_room_id
      and g.created_at >= v_bas
    group by g.sender_id
  ),
  oyun as (
    select h.user_id as uid, sum(h.spent_coin)::bigint as coin
    from public.oda_oyun_harcama h
    where h.room_id = p_room_id
      and h.created_at >= v_bas
    group by h.user_id
  ),
  birlesik as (
    select
      coalesce(h.uid, o.uid) as uid,
      coalesce(h.coin, 0) as hediye,
      coalesce(o.coin, 0) as oyun
    from hediye h
    full outer join oyun o on o.uid = h.uid
  )
  select
    b.uid,
    p.display_name,
    p.username,
    p.avatar_url,
    b.hediye,
    b.oyun
  from birlesik b
  left join public.profiles p on p.id = b.uid
  where b.hediye > 0 or b.oyun > 0
  order by (b.hediye + b.oyun) desc, b.uid
  limit 50;
end;
$$;

revoke all on function public.oda_islem_ozeti(uuid[]) from public;
grant execute on function public.oda_islem_ozeti(uuid[]) to anon, authenticated;

revoke all on function public.oda_katki_listesi(uuid, text) from public;
grant execute on function public.oda_katki_listesi(uuid, text) to authenticated;

notify pgrst, 'reload schema';
