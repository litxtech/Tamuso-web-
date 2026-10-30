-- Fruit Wheel: gerçek Tamuso coin (wallets.coins)
-- Doğum tarihi yoksa engelleme; bilinen yaş altında ise engelle.

create or replace function public.fruit_wheel_user_eligible(p_user uuid, p_mode text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pol public.fruit_wheel_policy%rowtype;
  v_birth date;
  v_country text;
begin
  if p_mode <> 'PLATFORM_APPROVED_COIN' then
    return null;
  end if;
  select * into v_pol from public.fruit_wheel_policy where id = 1;
  if not v_pol.platform_approved then
    return 'platform_closed';
  end if;
  if public.kill_switch_aktif_mi('kill_game_coin') then
    return 'coin_disabled';
  end if;
  select birth_date, country into v_birth, v_country
  from public.profiles where id = p_user;
  if v_birth is not null
     and v_birth > (current_date - make_interval(years => v_pol.minimum_age_policy)) then
    return 'age_policy';
  end if;
  if coalesce(array_length(v_pol.allowed_regions, 1), 0) > 0 then
    if v_country is null or not (v_country = any (v_pol.allowed_regions)) then
      return 'region_policy';
    end if;
  end if;
  return null;
end;
$$;

update public.fruit_wheel_policy
set
  economy_mode = 'PLATFORM_APPROVED_COIN',
  platform_approved = true,
  updated_at = now()
where id = 1;
