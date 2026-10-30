create or replace function public.hikaye_aktif_mi()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_kill boolean := false;
begin
  if to_regclass('public.kill_switches') is not null then
    select coalesce(active, false) into v_kill
    from public.kill_switches
    where key = 'kill_stories';
    if coalesce(v_kill, false) then
      return false;
    end if;
  end if;

  return coalesce(public.ozellik_bayragi_aktif_mi('stories_enabled'), false);
end;
$$;

grant execute on function public.hikaye_aktif_mi() to authenticated;