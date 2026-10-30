create or replace function public.hikaye_url_guvenli_mi(p_url text)
returns boolean
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  v_url text := lower(trim(coalesce(p_url, '')));
begin
  if length(v_url) < 8 or length(v_url) > 2000 then
    return false;
  end if;
  if v_url ~* '^(javascript|data|vbscript|file):' then
    return false;
  end if;
  -- Relative storage path or absolute http(s) containing story-media
  if v_url ~ '^https?://' then
    return position('story-media' in v_url) > 0
      or position('/storage/v1/object/public/story-media/' in v_url) > 0;
  end if;
  -- Path-style: {uid}/...
  if v_url ~ '^[0-9a-f-]{36}/' then
    return true;
  end if;
  if position('story-media/' in v_url) = 1 or position('/story-media/' in v_url) > 0 then
    return true;
  end if;
  return false;
end;
$$;

grant execute on function public.hikaye_url_guvenli_mi(text) to authenticated;