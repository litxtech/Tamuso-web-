-- Admin ekranı için LiveKit token kullanım özeti. Ham satır ve kullanıcı kimliği dönmez.

create or replace function public.rtc_livekit_token_ozeti()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_15 int;
  v_60 int;
  v_24 int;
  v_son timestamptz;
  v_oda int;
  v_kisi int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;

  select
    count(*) filter (where created_at > now() - interval '15 minutes')::int,
    count(*) filter (where created_at > now() - interval '60 minutes')::int,
    count(*) filter (where created_at > now() - interval '24 hours')::int,
    max(created_at),
    count(distinct room_name) filter (where created_at > now() - interval '15 minutes')::int,
    count(distinct user_id) filter (where created_at > now() - interval '15 minutes')::int
  into v_15, v_60, v_24, v_son, v_oda, v_kisi
  from public.livekit_token_requests;

  return jsonb_build_object(
    'son_15dk', coalesce(v_15, 0),
    'son_60dk', coalesce(v_60, 0),
    'son_24s', coalesce(v_24, 0),
    'son_istek_at', v_son,
    'oda_15dk', coalesce(v_oda, 0),
    'kisi_15dk', coalesce(v_kisi, 0)
  );
end;
$$;

revoke all on function public.rtc_livekit_token_ozeti() from public, anon;
grant execute on function public.rtc_livekit_token_ozeti() to authenticated;
