-- Admin: ajans komisyon oranları listele + güncelle

create or replace function public.admin_ajans_komisyon_listele()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
  v_defaults jsonb;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  -- Eksik satırları varsayılanlarla doldur (okuma sırasında)
  insert into public.agency_commission_rates (agency_id)
  select a.id
  from public.agencies a
  left join public.agency_commission_rates r on r.agency_id = a.id
  where r.agency_id is null
  on conflict (agency_id) do nothing;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'agency_id', a.id,
      'name', a.name,
      'agency_public_id', a.agency_public_id,
      'logo_url', a.logo_url,
      'owner_id', a.owner_id,
      'agency_share', r.agency_share,
      'host_share', r.host_share,
      'platform_share', r.platform_share,
      'updated_at', r.updated_at
    )
    order by a.name asc nulls last
  ), '[]'::jsonb)
  into v_items
  from public.agencies a
  join public.agency_commission_rates r on r.agency_id = a.id;

  v_defaults := public.ekonomi_config_getir();

  return jsonb_build_object(
    'items', v_items,
    'defaults', jsonb_build_object(
      'default_agency_share', coalesce((v_defaults->>'default_agency_share')::numeric, 0.20),
      'gift_host_share', coalesce((v_defaults->>'gift_host_share')::numeric, 0.80),
      'default_platform_share', 0.10
    )
  );
end;
$$;

grant execute on function public.admin_ajans_komisyon_listele() to authenticated;

create or replace function public.admin_ajans_komisyon_guncelle(
  p_agency_id uuid,
  p_agency_share numeric,
  p_platform_share numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag numeric(5,4);
  v_plat numeric(5,4);
  v_host numeric(5,4);
  v_row public.agency_commission_rates%rowtype;
  v_name text;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  if p_agency_id is null then
    raise exception 'Ajans gerekli';
  end if;

  select name into v_name from public.agencies where id = p_agency_id;
  if v_name is null then
    raise exception 'Ajans bulunamadi';
  end if;

  v_ag := round(coalesce(p_agency_share, 0)::numeric, 4);
  v_plat := round(coalesce(p_platform_share, 0)::numeric, 4);

  if v_ag < 0 or v_ag > 0.9 then
    raise exception 'Ajans payi 0-90%% olmali';
  end if;
  if v_plat < 0 or v_plat > 0.5 then
    raise exception 'Platform payi 0-50%% olmali';
  end if;
  if v_ag + v_plat > 1 then
    raise exception 'Ajans + platform payi %%100''u gecemez';
  end if;

  v_host := round((1 - v_ag - v_plat)::numeric, 4);
  if v_host < 0 then
    raise exception 'Host payi negatif olamaz';
  end if;

  insert into public.agency_commission_rates (agency_id, agency_share, platform_share, host_share, updated_at)
  values (p_agency_id, v_ag, v_plat, v_host, now())
  on conflict (agency_id) do update set
    agency_share = excluded.agency_share,
    platform_share = excluded.platform_share,
    host_share = excluded.host_share,
    updated_at = now()
  returning * into v_row;

  perform public.admin_audit_yaz(
    null,
    'agency_commission',
    'Ajans komisyon oranlari guncellendi: ' || coalesce(v_name, p_agency_id::text),
    jsonb_build_object(
      'agency_id', p_agency_id,
      'agency_name', v_name,
      'agency_share', v_row.agency_share,
      'platform_share', v_row.platform_share,
      'host_share', v_row.host_share
    )
  );

  return jsonb_build_object(
    'agency_id', v_row.agency_id,
    'agency_share', v_row.agency_share,
    'platform_share', v_row.platform_share,
    'host_share', v_row.host_share,
    'updated_at', v_row.updated_at
  );
end;
$$;

grant execute on function public.admin_ajans_komisyon_guncelle(uuid, numeric, numeric) to authenticated;

-- Toplu: tüm ajanslara küresel varsayılan ajans payını uygula (platform %10 sabit)
create or replace function public.admin_ajans_komisyon_varsayilan_uygula()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ag numeric(5,4);
  v_plat numeric(5,4) := 0.1000;
  v_host numeric(5,4);
  v_n int := 0;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  select coalesce(default_agency_share, 0.2000)::numeric(5,4)
  into v_ag
  from public.platform_economy_config
  where id = 1;

  v_ag := least(greatest(coalesce(v_ag, 0.2000), 0), 0.9000);
  if v_ag + v_plat > 1 then
    v_ag := (1 - v_plat)::numeric(5,4);
  end if;
  v_host := (1 - v_ag - v_plat)::numeric(5,4);

  insert into public.agency_commission_rates (agency_id)
  select a.id from public.agencies a
  left join public.agency_commission_rates r on r.agency_id = a.id
  where r.agency_id is null
  on conflict do nothing;

  update public.agency_commission_rates set
    agency_share = v_ag,
    platform_share = v_plat,
    host_share = v_host,
    updated_at = now();

  get diagnostics v_n = row_count;

  perform public.admin_audit_yaz(
    null,
    'agency_commission_bulk',
    'Tum ajans komisyonlari varsayilana cekildi',
    jsonb_build_object(
      'updated_rows', v_n,
      'agency_share', v_ag,
      'platform_share', v_plat,
      'host_share', v_host
    )
  );

  return jsonb_build_object(
    'updated_rows', v_n,
    'agency_share', v_ag,
    'platform_share', v_plat,
    'host_share', v_host
  );
end;
$$;

grant execute on function public.admin_ajans_komisyon_varsayilan_uygula() to authenticated;
