-- ---------------------------------------------------------------------------
-- Linkten satış kaydı (alıcı talep)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satis_linkten_kayit(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_link public.agency_sale_links%rowtype;
  v_row public.agency_tracked_sales%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_link
  from public.agency_sale_links
  where code = upper(trim(p_code)) and is_active = true;
  if v_link.id is null then raise exception 'Link bulunamadi'; end if;

  insert into public.agency_tracked_sales (
    agency_id, sale_link_id, buyer_id, package_title,
    liste_fiyat_try, amount_try, coins, selling_platform,
    payment_status, validation_status, created_by
  ) values (
    v_link.agency_id,
    v_link.id,
    v_uid,
    v_link.title,
    v_link.liste_fiyat_try,
    round(coalesce(v_link.liste_fiyat_try, 0) * 0.8, 2),
    v_link.coins,
    v_link.selling_platform,
    'pending',
    'pending',
    v_uid
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'sale', row_to_json(v_row),
    'agency_id', v_link.agency_id,
    'liste_fiyat_try', v_link.liste_fiyat_try
  );
end;
$$;

grant execute on function public.ajans_satis_linkten_kayit(text) to authenticated;
