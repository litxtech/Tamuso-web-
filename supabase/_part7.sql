-- ---------------------------------------------------------------------------
-- Fatura RPCs
-- ---------------------------------------------------------------------------
create or replace function public.ajans_faturalari_liste(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.agency_has_permission(p_agency_id, 'agency.manage_invoices')
    or public.agency_has_permission(p_agency_id, 'agency.view_sales')
  ) then
    raise exception 'Forbidden';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select *
      from public.agency_invoices
      where agency_id = p_agency_id
      order by created_at desc
      limit 200
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_faturalari_liste(uuid) to authenticated;

create or replace function public.ajans_fatura_kaydet(
  p_agency_id uuid,
  p_id uuid default null,
  p_tracked_sale_id uuid default null,
  p_buyer_name text default null,
  p_buyer_tax_id text default null,
  p_buyer_address text default null,
  p_line_title text default null,
  p_coins bigint default null,
  p_amount_try numeric default null,
  p_notes text default null,
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_invoices%rowtype;
  v_no text;
  v_st text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.agency_has_permission(p_agency_id, 'agency.manage_invoices') then
    raise exception 'Forbidden';
  end if;

  if p_id is null then
    v_no := 'AF-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    insert into public.agency_invoices (
      agency_id, tracked_sale_id, invoice_no, buyer_name, buyer_tax_id,
      buyer_address, line_title, coins, amount_try, notes, status, created_by,
      issued_at
    ) values (
      p_agency_id,
      p_tracked_sale_id,
      v_no,
      left(coalesce(p_buyer_name, ''), 200),
      left(coalesce(p_buyer_tax_id, ''), 64),
      left(coalesce(p_buyer_address, ''), 500),
      left(coalesce(p_line_title, 'Coin paketi'), 200),
      coalesce(p_coins, 0),
      coalesce(p_amount_try, 0),
      left(coalesce(p_notes, ''), 2000),
      case when lower(coalesce(p_status, 'draft')) = 'issued' then 'issued' else 'draft' end,
      v_uid,
      case when lower(coalesce(p_status, 'draft')) = 'issued' then now() else null end
    )
    returning * into v_row;
  else
    v_st := lower(coalesce(p_status, ''));
    update public.agency_invoices set
      buyer_name = coalesce(nullif(trim(p_buyer_name), ''), buyer_name),
      buyer_tax_id = coalesce(nullif(trim(p_buyer_tax_id), ''), buyer_tax_id),
      buyer_address = coalesce(nullif(trim(p_buyer_address), ''), buyer_address),
      line_title = coalesce(nullif(trim(p_line_title), ''), line_title),
      coins = coalesce(p_coins, coins),
      amount_try = coalesce(p_amount_try, amount_try),
      notes = coalesce(nullif(trim(p_notes), ''), notes),
      status = case
        when v_st in ('draft', 'issued', 'cancelled') then v_st
        else status
      end,
      issued_at = case
        when v_st = 'issued' and issued_at is null then now()
        else issued_at
      end,
      updated_at = now()
    where id = p_id and agency_id = p_agency_id
    returning * into v_row;
    if not found then raise exception 'Fatura bulunamadi'; end if;
  end if;

  return jsonb_build_object('ok', true, 'invoice', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_fatura_kaydet(
  uuid, uuid, uuid, text, text, text, text, bigint, numeric, text, text
) to authenticated;
