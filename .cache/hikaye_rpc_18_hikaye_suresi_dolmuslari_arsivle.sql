create or replace function public.hikaye_suresi_dolmuslari_arsivle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  with updated as (
    update public.stories
    set status = 'archived',
        archived_at = coalesce(archived_at, now())
    where status = 'active'
      and expires_at <= now()
    returning id
  )
  select count(*)::int into v_count from updated;

  return jsonb_build_object('ok', true, 'archived_count', v_count);
end;
$$;

-- Callable by service_role / cron; also authenticated (no-op harm if user calls)
grant execute on function public.hikaye_suresi_dolmuslari_arsivle() to authenticated;