-- PK süre dolunca biter. Canlı yayın oturumu açık kalır.
-- Erken bitirme yok: ends_at gelmeden status değişmez.

create or replace function public.pk_mac_suresi_doldu(p_match_id uuid)
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
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_match_id is null then
    raise exception 'Match not found';
  end if;

  select * into v_row
  from public.pk_matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found';
  end if;

  if v_row.status <> 'live' then
    return v_row;
  end if;

  if v_row.ends_at is null or v_row.ends_at > now() then
    return v_row;
  end if;

  if v_row.score_a > v_row.score_b then
    v_winner := 'a';
  elsif v_row.score_b > v_row.score_a then
    v_winner := 'b';
  else
    v_winner := 'draw';
  end if;

  update public.pk_matches
  set
    status = 'finished',
    finished_at = now(),
    winner_side = v_winner
  where id = p_match_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.pk_mac_suresi_doldu(uuid) from public, anon;
grant execute on function public.pk_mac_suresi_doldu(uuid) to authenticated;
