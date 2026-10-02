-- Profil ülke seçimi: tüm aktif ISO ülkeler (profile_enabled kilidi kalkar)
-- Bölgeler: hâlâ profile_enabled (TR illeri); ülke değişince region doğrulanır

create or replace function public.profil_konum_katalogu()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'countries', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'code', c.code,
          'name', c.name,
          'sort_order', c.sort_order
        )
        order by c.sort_order nulls last, c.code
      )
      from public.geo_countries c
      where c.is_active
    ), '[]'::jsonb),
    'regions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'country_code', r.country_code,
          'code', r.code,
          'name', r.name,
          'sort_order', r.sort_order
        )
        order by r.sort_order nulls last, r.name
      )
      from public.geo_regions r
      join public.geo_countries c on c.code = r.country_code
      where r.is_active and r.profile_enabled
        and c.is_active
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.profil_konum_katalogu() to authenticated;

create or replace function public.profil_guncelle(
  p_display_name text default null,
  p_username text default null,
  p_bio text default null,
  p_phone_e164 text default null,
  p_clear_phone boolean default false,
  p_gender text default null,
  p_birth_date date default null,
  p_clear_birth_date boolean default false,
  p_country_code text default null,
  p_region_id uuid default null,
  p_clear_region boolean default false
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles%rowtype;
  v_username text;
  v_phone text;
  v_gender text;
  v_country text;
  v_country_name text;
  v_region uuid;
  v_region_country text;
  v_old_cc text;
  v_changed_at timestamptz;
  v_cooldown int;
  v_next timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if p_username is not null then
    v_username := lower(trim(p_username));
    if v_username !~ '^[a-z0-9_]{3,24}$' then
      raise exception 'Invalid username';
    end if;
  end if;

  if p_clear_phone then
    v_phone := null;
  elsif p_phone_e164 is not null and length(trim(p_phone_e164)) > 0 then
    v_phone := trim(p_phone_e164);
  end if;

  if p_gender is not null then
    v_gender := lower(trim(p_gender));
    if v_gender not in ('female', 'male', 'other', 'prefer_not') then
      raise exception 'Gecersiz cinsiyet';
    end if;
  end if;

  if p_birth_date is not null then
    if p_birth_date > (current_date - interval '18 years') then
      raise exception 'Platform 18 yas ve uzeri icindir';
    end if;
    if p_birth_date < date '1920-01-01' then
      raise exception 'Gecersiz dogum tarihi';
    end if;
  end if;

  select country_code, country_code_changed_at into v_old_cc, v_changed_at
  from public.profiles where id = v_uid;

  if p_country_code is not null then
    v_country := public.ulke_koduna_normalize(p_country_code);
    if v_country is null then
      select c.code into v_country
      from public.geo_countries c
      where c.is_active
        and (
          lower(c.name) = lower(trim(p_country_code))
          or public.ulke_koduna_normalize(c.name) = public.ulke_koduna_normalize(p_country_code)
        )
      limit 1;
    end if;
    -- Tüm aktif ülkeler seçilebilir (profile_enabled artık zorunlu değil)
    if v_country is null or not exists (
      select 1 from public.geo_countries
      where code = v_country and is_active
    ) then
      raise exception 'Bu ulke su an secilemez';
    end if;

    if v_old_cc is distinct from v_country then
      v_cooldown := public.cl_config_int('country_change_cooldown_days', 30)::int;
      if v_changed_at is not null and v_cooldown > 0 then
        v_next := v_changed_at + make_interval(days => v_cooldown);
        if v_next > now() then
          raise exception 'Ulke degisikligi beklemeye tabi: %', v_next;
        end if;
      end if;
    end if;

    select name into v_country_name
    from public.geo_countries
    where code = v_country;
  end if;

  if p_clear_region then
    v_region := null;
  elsif p_region_id is not null then
    select r.id, r.country_code into v_region, v_region_country
    from public.geo_regions r
    join public.geo_countries c on c.code = r.country_code
    where r.id = p_region_id
      and r.is_active and r.profile_enabled
      and c.is_active;
    if v_region is null then
      raise exception 'Gecersiz il / bolge';
    end if;
    if v_country is null then
      v_country := v_region_country;
      select name into v_country_name
      from public.geo_countries
      where code = v_country;
    elsif v_country <> v_region_country then
      raise exception 'Il secilen ulkeye ait degil';
    end if;
  end if;

  -- Ülke değiştiyse ve yeni ülkenin bölgesi yoksa region temizle
  if v_country is not null and v_old_cc is distinct from v_country and p_region_id is null and not p_clear_region then
    if v_region is null then
      -- clear region when country changes without new region
      null;
    end if;
  end if;

  update public.profiles
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    username = coalesce(v_username, username),
    bio = case when p_bio is null then bio else left(trim(p_bio), 280) end,
    phone_e164 = case
      when p_clear_phone then null
      when p_phone_e164 is not null and length(trim(p_phone_e164)) > 0 then v_phone
      else phone_e164
    end,
    gender = coalesce(v_gender, gender),
    birth_date = case
      when p_clear_birth_date then null
      when p_birth_date is not null then p_birth_date
      else birth_date
    end,
    country_code = coalesce(v_country, country_code),
    country = coalesce(v_country_name, country),
    country_code_changed_at = case
      when v_country is not null and v_old_cc is distinct from v_country then now()
      else country_code_changed_at
    end,
    region_id = case
      when p_clear_region then null
      when p_region_id is not null then v_region
      when v_country is not null and v_old_cc is distinct from v_country then null
      else region_id
    end,
    is_guest = false,
    updated_at = now()
  where id = v_uid
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Profile not found';
  end if;
  return v_row;
end;
$$;

grant execute on function public.profil_guncelle(
  text, text, text, text, boolean, text, date, boolean, text, uuid, boolean
) to authenticated;
