-- Ses odaları: oturum çıkışında otomatik kapanmasın.
-- Kalıcı kapatma yalnız host manuel (OdayiSil) veya platform/admin.
-- Bu RPC artık yalnızca canlı yayınları (live_sessions) kapatır.

create or replace function public.cikis_canli_icerikleri_kapat()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_yayinlar int := 0;
  v_pk int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Ses odaları (rooms.is_live) burada dokunulmaz.

  update public.live_sessions
  set
    is_live = false,
    ended_at = coalesce(ended_at, now()),
    viewer_count = 0
  where host_id = v_uid
    and is_live = true;

  get diagnostics v_yayinlar = row_count;

  begin
    update public.pk_matches pm
    set
      status = 'cancelled',
      finished_at = coalesce(finished_at, now())
    where pm.status = 'live'
      and exists (
        select 1
        from public.live_sessions ls
        where ls.host_id = v_uid
          and (
            ls.id = pm.room_a_id
            or ls.id = pm.room_b_id
          )
      );
    get diagnostics v_pk = row_count;
  exception when undefined_table then
    v_pk := 0;
  when others then
    v_pk := 0;
  end;

  return jsonb_build_object(
    'ok', true,
    'rooms_closed', 0,
    'live_closed', v_yayinlar,
    'pk_cancelled', v_pk
  );
end;
$$;

comment on function public.cikis_canli_icerikleri_kapat() is
  'Oturum çıkışında canlı yayınları kapatır; ses odalarını otomatik kapatmaz.';
