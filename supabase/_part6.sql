-- ---------------------------------------------------------------------------
-- Satış listesi / doğrulama
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satislari_liste(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.agency_has_permission(p_agency_id, 'agency.view_sales')
    or public.agency_has_permission(p_agency_id, 'agency.review_sales')
  ) then
    raise exception 'Forbidden';
  end if;

  -- Ödenen Stripe tekliflerini takip tablosuna senkronize et (idempotent)
  insert into public.agency_tracked_sales (
    agency_id, offer_id, buyer_id, package_title,
    liste_fiyat_try, amount_try, coins, payment_status,
    validation_status, created_by
  )
  select
    o.agency_id,
    o.id,
    o.buyer_id,
    o.title,
    o.liste_fiyat_try,
    o.amount_try,
    o.coins,
    'paid',
    'pending',
    o.created_by
  from public.agency_package_offers o
  where o.agency_id = p_agency_id
    and o.status = 'paid'
    and not exists (
      select 1 from public.agency_tracked_sales t where t.offer_id = o.id
    );

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select *
      from public.agency_tracked_sales
      where agency_id = p_agency_id
      order by created_at desc
      limit 300
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_satislari_liste(uuid) to authenticated;

create or replace function public.ajans_satis_dogrula(
  p_agency_id uuid,
  p_sale_id uuid,
  p_validation_status text,
  p_invalid_reason text default null,
  p_receipt_note text default null,
  p_receipt_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_tracked_sales%rowtype;
  v_st text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.agency_has_permission(p_agency_id, 'agency.review_sales') then
    raise exception 'Forbidden';
  end if;

  v_st := lower(trim(coalesce(p_validation_status, '')));
  if v_st not in ('pending', 'valid', 'invalid') then
    raise exception 'Gecersiz dogrulama durumu';
  end if;

  update public.agency_tracked_sales set
    validation_status = v_st,
    invalid_reason = case when v_st = 'invalid' then left(coalesce(p_invalid_reason, ''), 500) else null end,
    receipt_note = coalesce(nullif(trim(p_receipt_note), ''), receipt_note),
    receipt_url = coalesce(nullif(trim(p_receipt_url), ''), receipt_url),
    reviewed_by = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where id = p_sale_id and agency_id = p_agency_id
  returning * into v_row;

  if not found then raise exception 'Satis bulunamadi'; end if;
  return jsonb_build_object('ok', true, 'sale', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_dogrula(uuid, uuid, text, text, text, text) to authenticated;

create or replace function public.ajans_satis_manuel_ekle(
  p_agency_id uuid,
  p_buyer_label text,
  p_package_title text,
  p_amount_try numeric,
  p_coins bigint,
  p_selling_platform text default 'diger',
  p_sale_link_id uuid default null,
  p_receipt_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_tracked_sales%rowtype;
  v_plat text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.ajans_distributor_kontrol(p_agency_id);
  if not public.agency_has_permission(p_agency_id, 'agency.review_sales') then
    raise exception 'Forbidden';
  end if;

  v_plat := lower(coalesce(nullif(trim(p_selling_platform), ''), 'diger'));

  insert into public.agency_tracked_sales (
    agency_id, sale_link_id, buyer_label, package_title,
    amount_try, coins, selling_platform, payment_status,
    validation_status, receipt_note, created_by
  ) values (
    p_agency_id,
    p_sale_link_id,
    left(coalesce(p_buyer_label, ''), 120),
    left(coalesce(p_package_title, 'Paket'), 120),
    coalesce(p_amount_try, 0),
    coalesce(p_coins, 0),
    v_plat,
    'manual',
    'pending',
    left(coalesce(p_receipt_note, ''), 1000),
    v_uid
  )
  returning * into v_row;

  return jsonb_build_object('ok', true, 'sale', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_manuel_ekle(uuid, text, text, numeric, bigint, text, uuid, text) to authenticated;
