-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.ajans_satis_kod_uret()
returns text
language plpgsql
as $$
declare
  v_kod text;
  v_i int := 0;
begin
  loop
    v_kod := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.agency_sale_links where code = v_kod);
    v_i := v_i + 1;
    if v_i > 20 then
      raise exception 'Kod uretilemedi';
    end if;
  end loop;
  return v_kod;
end;
$$;

create or replace function public.ajans_distributor_kontrol(p_agency_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dist boolean;
begin
  select is_coin_distributor into v_dist
  from public.agencies
  where id = p_agency_id and status = 'active';
  if v_dist is null then raise exception 'Agency not found'; end if;
  if not coalesce(v_dist, false) then
    raise exception 'Agency is not a coin distributor';
  end if;
end;
$$;
