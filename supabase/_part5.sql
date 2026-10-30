-- ---------------------------------------------------------------------------
-- Link RPCs
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satis_linki_olustur(
  p_agency_id uuid,
  p_title text,
  p_description text,
  p_selling_platform text,
  p_package_id uuid default null,
  p_liste_fiyat_try numeric default null,
  p_coins bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_sale_links%rowtype;
  v_pkg public.agency_coin_packages%rowtype;
  v_plat text;
  v_title text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.ajans_distributor_kontrol(p_agency_id);
  if not public.agency_has_permission(p_agency_id, 'agency.manage_sale_links') then
    raise exception 'Forbidden';
  end if;

  v_plat := lower(coalesce(nullif(trim(p_selling_platform), ''), 'diger'));
  if v_plat not in ('whatsapp', 'instagram', 'telegram', 'web', 'uygulama', 'diger') then
    v_plat := 'diger';
  end if;

  if p_package_id is not null then
    select * into v_pkg
    from public.agency_coin_packages
    where id = p_package_id
      and (agency_id = p_agency_id or agency_id is null)
      and is_active = true;
    if v_pkg.id is null then raise exception 'Paket bulunamadi'; end if;
  end if;

  v_title := coalesce(nullif(trim(p_title), ''), v_pkg.title, 'Ajans paketi');

  insert into public.agency_sale_links (
    agency_id, code, title, description, selling_platform,
    package_id, liste_fiyat_try, coins, created_by
  ) values (
    p_agency_id,
    public.ajans_satis_kod_uret(),
    left(v_title, 120),
    left(coalesce(p_description, ''), 2000),
    v_plat,
    v_pkg.id,
    coalesce(p_liste_fiyat_try, v_pkg.liste_fiyat_try),
    coalesce(p_coins, v_pkg.coins),
    v_uid
  )
  returning * into v_row;

  return jsonb_build_object('ok', true, 'link', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_linki_olustur(uuid, text, text, text, uuid, numeric, bigint) to authenticated;

create or replace function public.ajans_satis_linkleri_liste(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.agency_has_permission(p_agency_id, 'agency.manage_sale_links')
    or public.agency_has_permission(p_agency_id, 'agency.view_sales')
  ) then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select *
      from public.agency_sale_links
      where agency_id = p_agency_id
      order by created_at desc
      limit 200
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_satis_linkleri_liste(uuid) to authenticated;

create or replace function public.ajans_satis_linki_getir(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.agency_sale_links%rowtype;
  v_agency_name text;
begin
  select * into v_row
  from public.agency_sale_links
  where code = upper(trim(p_code)) and is_active = true;

  if v_row.id is null then
    raise exception 'Link bulunamadi';
  end if;

  update public.agency_sale_links
  set click_count = click_count + 1, updated_at = now()
  where id = v_row.id;

  select name into v_agency_name from public.agencies where id = v_row.agency_id;

  return jsonb_build_object(
    'ok', true,
    'link', jsonb_build_object(
      'id', v_row.id,
      'code', v_row.code,
      'title', v_row.title,
      'description', v_row.description,
      'selling_platform', v_row.selling_platform,
      'package_id', v_row.package_id,
      'liste_fiyat_try', v_row.liste_fiyat_try,
      'coins', v_row.coins,
      'agency_id', v_row.agency_id,
      'agency_name', coalesce(v_agency_name, 'Ajans')
    )
  );
end;
$$;

grant execute on function public.ajans_satis_linki_getir(text) to authenticated, anon;

create or replace function public.ajans_satis_linki_aktiflik(
  p_agency_id uuid,
  p_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.agency_sale_links%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.agency_has_permission(p_agency_id, 'agency.manage_sale_links') then
    raise exception 'Forbidden';
  end if;

  update public.agency_sale_links set
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id and agency_id = p_agency_id
  returning * into v_row;

  if not found then raise exception 'Link bulunamadi'; end if;
  return jsonb_build_object('ok', true, 'link', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_linki_aktiflik(uuid, uuid, boolean) to authenticated;
