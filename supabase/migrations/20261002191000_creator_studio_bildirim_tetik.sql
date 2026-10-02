-- Durum değişince bildirim. Edge fonksiyon sürümü geride kalsa da push gider.

create or replace function public.trg_creator_studio_bildirim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.runtime_type is distinct from 'tamuso_game_v2' then
    return new;
  end if;
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status = 'READY_FOR_PREVIEW' then
    perform public.creator_studio_bildir(new.id, 'studio_ready');
  elsif new.status = 'FAILED' then
    perform public.creator_studio_bildir(new.id, 'studio_failed');
  end if;
  return new;
end;
$$;

drop trigger if exists creator_games_studio_bildirim on public.creator_games;
create trigger creator_games_studio_bildirim
  after update of status on public.creator_games
  for each row
  execute function public.trg_creator_studio_bildirim();
