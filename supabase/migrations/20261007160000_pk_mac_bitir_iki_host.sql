-- Her iki yayıncı PK'yı bitirebilir. Canlı yayın oturumu açık kalır.

create or replace function public.pk_mac_bitir(p_match_id uuid)
returns public.pk_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.pk_matches%rowtype;
  v_winner text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_row from public.pk_matches where id = p_match_id for update;
  if not found then raise exception 'Match not found'; end if;
  if v_row.status <> 'live' then
    return v_row;
  end if;

  if not (
    exists (
      select 1 from public.rooms r
      where r.host_id = v_uid
        and r.id in (v_row.room_a_id, v_row.room_b_id)
    )
    or exists (
      select 1 from public.live_sessions ls
      where ls.host_id = v_uid
        and ls.id in (v_row.live_a_id, v_row.live_b_id)
    )
  ) then
    raise exception 'Not authorized';
  end if;

  if v_row.score_a > v_row.score_b then v_winner := 'a';
  elsif v_row.score_b > v_row.score_a then v_winner := 'b';
  else v_winner := 'draw';
  end if;

  update public.pk_matches
  set status = 'finished', finished_at = now(), winner_side = v_winner
  where id = p_match_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.pk_mac_bitir(uuid) from public, anon;
grant execute on function public.pk_mac_bitir(uuid) to authenticated;
