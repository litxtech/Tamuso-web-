create or replace function public.liderlik_siralamasi_yenile(
  p_board_type text,
  p_period text default 'daily'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := lower(coalesce(nullif(trim(p_period), ''), 'daily'));
  v_key text := public.liderlik_period_key(v_period);
  v_start timestamptz := public.liderlik_period_baslangic(v_period);
  v_count int := 0;
begin
  if v_period not in ('daily', 'weekly', 'monthly', 'all_time') then
    raise exception 'Gecersiz period';
  end if;

  if p_board_type = 'gifter' then
    delete from public.leaderboard_snapshots
    where board_type = 'gifter' and period = v_period and period_key = v_key;

    if v_period = 'all_time' then
      insert into public.leaderboard_snapshots (board_type, period, period_key, user_id, score, rank)
      select 'gifter', v_period, v_key, s.user_id, s.total_spent_coin,
        row_number() over (order by s.total_spent_coin desc)
      from public.user_profile_stats s
      left join public.user_privacy_settings pr on pr.user_id = s.user_id
      where s.total_spent_coin > 0
        and coalesce(pr.hide_gifter_rank, false) = false
      order by s.total_spent_coin desc
      limit 100;
    else
      insert into public.leaderboard_snapshots (board_type, period, period_key, user_id, score, rank)
      select 'gifter', v_period, v_key, g.sender_id, sum(g.coins_spent)::bigint,
        row_number() over (order by sum(g.coins_spent) desc)
      from public.gift_transactions g
      left join public.user_privacy_settings pr on pr.user_id = g.sender_id
      where g.created_at >= v_start
        and coalesce(pr.hide_gifter_rank, false) = false
      group by g.sender_id
      having sum(g.coins_spent) > 0
      order by sum(g.coins_spent) desc
      limit 100;
    end if;
    get diagnostics v_count = row_count;

  elsif p_board_type = 'top_recharge' then
    delete from public.leaderboard_snapshots
    where board_type = 'top_recharge' and period = v_period and period_key = v_key;

    if v_period = 'all_time' then
      insert into public.leaderboard_snapshots (board_type, period, period_key, user_id, score, rank)
      select 'top_recharge', v_period, v_key, s.user_id, s.total_topup_coin,
        row_number() over (order by s.total_topup_coin desc)
      from public.user_profile_stats s
      left join public.user_privacy_settings pr on pr.user_id = s.user_id
      where s.total_topup_coin > 0
        and coalesce(pr.hide_recharge_rank, false) = false
      order by s.total_topup_coin desc
      limit 100;
    else
      insert into public.leaderboard_snapshots (board_type, period, period_key, user_id, score, rank)
      select 'top_recharge', v_period, v_key, c.user_id, sum(c.coins_added)::bigint,
        row_number() over (order by sum(c.coins_added) desc)
      from public.coin_purchases c
      left join public.user_privacy_settings pr on pr.user_id = c.user_id
      where c.status = 'completed'
        and c.created_at >= v_start
        and coalesce(pr.hide_recharge_rank, false) = false
      group by c.user_id
      having sum(c.coins_added) > 0
      order by sum(c.coins_added) desc
      limit 100;
    end if;
    get diagnostics v_count = row_count;

  elsif p_board_type = 'host' then
    delete from public.leaderboard_snapshots
    where board_type = 'host' and period = v_period and period_key = v_key;

    insert into public.leaderboard_snapshots (board_type, period, period_key, user_id, score, rank)
    select 'host', v_period, v_key, s.user_id, s.total_gifts_received,
      row_number() over (order by s.total_gifts_received desc)
    from public.user_profile_stats s
    where s.total_gifts_received > 0
    order by s.total_gifts_received desc
    limit 100;
    get diagnostics v_count = row_count;

  elsif p_board_type = 'room' then
    delete from public.leaderboard_snapshots
    where board_type = 'room' and period = v_period and period_key = v_key;

    insert into public.leaderboard_snapshots (
      board_type, period, period_key, user_id, room_id, score, rank
    )
    select
      'room', v_period, v_key, r.host_id, x.room_id, x.skor,
      row_number() over (order by x.skor desc)
    from (
      select h.room_id, sum(h.spent_coin)::bigint as skor
      from public.oda_oyun_harcama h
      where h.spent_coin > 0
        and (v_period = 'all_time' or h.created_at >= v_start)
      group by h.room_id
      having sum(h.spent_coin) > 0
    ) x
    join public.rooms r on r.id = x.room_id
    where r.host_id is not null
    order by x.skor desc
    limit 100;
    get diagnostics v_count = row_count;
  end if;

  return v_count;
end;
$$;

grant execute on function public.liderlik_siralamasi_yenile(text, text) to authenticated;

select public.liderlik_siralamasi_yenile('room', 'weekly');
