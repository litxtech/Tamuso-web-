-- ========== EXPENSES ==========
create or replace function public.admin_finance_expenses_list(p_limit int default 50, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.expense_date desc, t.created_at desc), '[]'::jsonb)
  into v_rows from (
    select * from public.finance_expenses
    order by expense_date desc, created_at desc
    limit least(greatest(coalesce(p_limit,50),1),200)
    offset greatest(coalesce(p_offset,0),0)
  ) t;
  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.admin_finance_expenses_list(int, int) to authenticated;

create or replace function public.admin_finance_expense_upsert(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := nullif(p->>'id','')::uuid;
  v_before jsonb;
  v_row public.finance_expenses%rowtype;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;

  if v_id is not null then
    select to_jsonb(fe) into v_before from public.finance_expenses fe where fe.id=v_id;
    update public.finance_expenses set
      amount = coalesce((p->>'amount')::numeric, amount),
      currency = coalesce(nullif(p->>'currency',''), currency),
      category = coalesce(nullif(p->>'category',''), category),
      description = coalesce(p->>'description', description),
      vendor = coalesce(p->>'vendor', vendor),
      expense_date = coalesce((p->>'expense_date')::date, expense_date),
      payment_status = coalesce(nullif(p->>'payment_status',''), payment_status),
      reference = coalesce(p->>'reference', reference),
      updated_at = now()
    where id = v_id
    returning * into v_row;
  else
    insert into public.finance_expenses (
      amount, currency, category, description, vendor, expense_date, payment_status, reference, created_by
    ) values (
      (p->>'amount')::numeric,
      coalesce(nullif(p->>'currency',''),'TRY'),
      p->>'category',
      p->>'description',
      p->>'vendor',
      coalesce((p->>'expense_date')::date, (timezone('Europe/Istanbul', now()))::date),
      coalesce(nullif(p->>'payment_status',''),'paid'),
      p->>'reference',
      auth.uid()
    ) returning * into v_row;
  end if;

  perform public.finance_audit_yaz(
    case when v_id is null then 'expense_create' else 'expense_update' end,
    'finance_expense', v_row.id::text, v_before, to_jsonb(v_row), '{}'::jsonb
  );
  update public.finance_snapshot_state set dirty = true where id = 1;
  return jsonb_build_object('ok', true, 'item', to_jsonb(v_row));
end;
$$;

grant execute on function public.admin_finance_expense_upsert(jsonb) to authenticated;

-- ========== SETTINGS / SIMULATE ==========
create or replace function public.admin_finance_settings_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  return jsonb_build_object('ok', true, 'rates', public.finance_rates());
end;
$$;

grant execute on function public.admin_finance_settings_get() to authenticated;

create or replace function public.admin_finance_settings_update(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;
  select to_jsonb(fs) into v_before from public.finance_settings fs where id=1;
  update public.finance_settings set
    apple_fee_rate = coalesce((p->>'apple_fee_rate')::numeric, apple_fee_rate),
    google_fee_rate = coalesce((p->>'google_fee_rate')::numeric, google_fee_rate),
    payment_processor_rate = coalesce((p->>'payment_processor_rate')::numeric, payment_processor_rate),
    refund_reserve_rate = coalesce((p->>'refund_reserve_rate')::numeric, refund_reserve_rate),
    agency_commission_rate = coalesce((p->>'agency_commission_rate')::numeric, agency_commission_rate),
    platform_commission_rate = coalesce((p->>'platform_commission_rate')::numeric, platform_commission_rate),
    coin_liability_enabled = coalesce((p->>'coin_liability_enabled')::boolean, coin_liability_enabled),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;
  select to_jsonb(fs) into v_after from public.finance_settings fs where id=1;
  perform public.finance_audit_yaz('settings_update','finance_settings','1', v_before, v_after, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'rates', public.finance_rates());
end;
$$;

grant execute on function public.admin_finance_settings_update(jsonb) to authenticated;

create or replace function public.admin_finance_simulate(p_coin_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rates jsonb := public.finance_rates();
  v_coins bigint := greatest(coalesce(p_coin_amount,0),0);
  v_gross numeric;
  v_apple numeric; v_google numeric; v_proc numeric; v_reserve numeric;
  v_agency numeric; v_creator numeric; v_platform numeric;
  v_net numeric;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  v_gross := round(v_coins * (v_rates->>'coin_try')::numeric, 2);
  v_apple := round(v_gross * (v_rates->>'apple_fee_rate')::numeric, 2);
  v_google := round(v_gross * (v_rates->>'google_fee_rate')::numeric, 2);
  v_proc := round(v_gross * (v_rates->>'payment_processor_rate')::numeric, 2);
  v_reserve := round(v_gross * (v_rates->>'refund_reserve_rate')::numeric, 2);
  -- If all gifted path
  v_creator := round(v_gross * (v_rates->>'gift_host_share')::numeric * (1 - (v_rates->>'agency_commission_rate')::numeric), 2);
  v_agency := round(v_gross * (v_rates->>'gift_host_share')::numeric * (v_rates->>'agency_commission_rate')::numeric, 2);
  v_platform := round(v_gross - v_apple - v_proc - v_reserve - v_creator - v_agency, 2);
  v_net := v_platform;

  return jsonb_build_object(
    'ok', true,
    'is_estimate', true,
    'badge', 'TAHMÄ°N',
    'coin_amount', v_coins,
    'gross_sales_try', v_gross,
    'estimated_apple_fee_try', v_apple,
    'estimated_google_fee_try', v_google,
    'estimated_processor_fee_try', v_proc,
    'refund_reserve_try', v_reserve,
    'estimated_creator_liability_try', v_creator,
    'estimated_agency_liability_try', v_agency,
    'estimated_platform_contribution_try', v_platform,
    'estimated_net_try', v_net,
    'rates', v_rates
  );
end;
$$;

grant execute on function public.admin_finance_simulate(bigint) to authenticated;

-- ========== ALERTS ==========
create or replace function public.admin_finance_alerts_list(p_status text default 'open', p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_rows jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_rows from (
    select * from public.finance_alerts
    where (p_status is null or status = p_status)
    order by created_at desc
    limit least(greatest(coalesce(p_limit,50),1),200)
  ) t;
  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.admin_finance_alerts_list(text, int) to authenticated;

create or replace function public.admin_finance_alert_ack(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;
  update public.finance_alerts
  set status='acked', acked_at=now(), acked_by=auth.uid()
  where id=p_id;
  perform public.finance_audit_yaz('alert_ack','finance_alert', p_id::text, null, null, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_finance_alert_ack(uuid) to authenticated;

-- ========== RECONCILE ==========
create or replace function public.admin_finance_reconcile_run(
  p_source text default 'wallet_ledger',
  p_external_amount numeric default null,
  p_period text default 'month'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  v_run_id text;
  v_id uuid;
  v_internal numeric := 0;
  v_matched bigint := 0;
  v_unmatched bigint := 0;
  v_diff numeric := 0;
  v_status text := 'ok';
  v_mismatch_users bigint := 0;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;
  select * into b from public.finance_period_bounds(p_period) limit 1;
  v_run_id := 'REC-' || to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD-HH24MISS');

  if p_source in ('wallet_ledger','coin_ledger') then
    select count(*) into v_mismatch_users from (
      select w.user_id
      from public.wallets w
      left join lateral (
        select wl.balance_after
        from public.wallet_ledger wl
        where wl.user_id=w.user_id and wl.currency='coins'
        order by wl.created_at desc, wl.id desc limit 1
      ) last_l on true
      where coalesce(w.coins,0) <> coalesce(last_l.balance_after,0)
      limit 5000
    ) x;
    v_unmatched := v_mismatch_users;
    v_matched := (select count(*) from public.wallets) - v_unmatched;
    v_diff := v_unmatched;
    if v_unmatched > 0 then
      v_status := 'review_required';
      insert into public.finance_alerts (alert_type, severity, title, body, meta)
      values (
        'LEDGER_BALANCE_MISMATCH', 'danger',
        'Ledger/Wallet mismatch',
        v_unmatched::text || ' kullanÄ±cÄ±da wallet ile ledger uyuÅŸmazlÄ±ÄŸÄ±',
        jsonb_build_object('mismatch_users', v_unmatched)
      );
    end if;
  elsif p_source in ('apple','google','stripe') then
    select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
    into v_internal
    from public.coin_purchases cp
    where coalesce(cp.status,'completed')='completed'
      and cp.created_at >= b.period_start and cp.created_at <= b.period_end
      and (
        (p_source='apple' and lower(coalesce(cp.store,cp.provider,'')) in ('apple','ios','app_store'))
        or (p_source='google' and lower(coalesce(cp.store,cp.provider,'')) in ('google','android','play'))
        or (p_source='stripe' and lower(coalesce(cp.provider,cp.store,'')) like '%stripe%')
        or true
      );
    v_diff := round(coalesce(p_external_amount,0) - v_internal, 2);
    if abs(v_diff) > 0.01 then
      v_status := 'review_required';
      v_unmatched := 1;
    else
      v_matched := 1;
    end if;
  else
    -- summary vs ledger sales
    perform public.finance_snapshot_yenile('daily');
    select coalesce(s.cash_try,0) into v_internal
    from public.finance_daily_snapshots s
    where s.day = (timezone('Europe/Istanbul', now()))::date;
    select coalesce(sum(public.ciro_try_hesapla(cp.amount_try, cp.package_id, cp.amount_usd)),0)
    into v_diff
    from public.coin_purchases cp
    where coalesce(cp.status,'completed')='completed'
      and cp.created_at >= public.finance_istanbul_day_start(now());
    v_diff := round(v_internal - v_diff, 2);
    if abs(v_diff) > 0.01 then v_status := 'review_required'; v_unmatched := 1; else v_matched := 1; end if;
  end if;

  insert into public.finance_reconciliation_runs (
    run_id, period_start, period_end, source, matched_count, unmatched_count, difference_try, status, meta, created_by
  ) values (
    v_run_id,
    (timezone('Europe/Istanbul', b.period_start))::date,
    (timezone('Europe/Istanbul', b.period_end))::date,
    p_source, v_matched, v_unmatched, coalesce(v_diff,0), v_status,
    jsonb_build_object('internal_amount', v_internal, 'external_amount', p_external_amount),
    auth.uid()
  ) returning id into v_id;

  insert into public.finance_reconciliation_items (run_id, item_key, external_amount, internal_amount, difference, status)
  values (v_id, p_source, p_external_amount, v_internal, v_diff, v_status);

  perform public.finance_audit_yaz('reconcile_run','finance_reconciliation', v_id::text, null,
    jsonb_build_object('run_id', v_run_id, 'status', v_status, 'difference', v_diff), '{}'::jsonb);

  return jsonb_build_object(
    'ok', true,
    'run_id', v_run_id,
    'id', v_id,
    'source', p_source,
    'matched', v_matched,
    'unmatched', v_unmatched,
    'difference_try', v_diff,
    'internal_amount', v_internal,
    'external_amount', p_external_amount,
    'status', v_status
  );
end;
$$;

grant execute on function public.admin_finance_reconcile_run(text, numeric, text) to authenticated;

-- ========== SEARCH ==========
create or replace function public.admin_finance_search(p_q text, p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := trim(coalesce(p_q,''));
  v_limit int := least(greatest(coalesce(p_limit,20),1),50);
  v_users jsonb; v_agencies jsonb; v_tx jsonb; v_reports jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  if length(v_q) < 2 then
    return jsonb_build_object('ok', true, 'users','[]'::jsonb,'agencies','[]'::jsonb,'transactions','[]'::jsonb,'reports','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) into v_users from (
    select id, username, display_name, public_user_id from public.profiles
    where username ilike '%'||v_q||'%' or display_name ilike '%'||v_q||'%'
       or public_user_id::text ilike '%'||v_q||'%' or id::text ilike v_q||'%'
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) into v_agencies from (
    select id, name, agency_public_id from public.agencies
    where name ilike '%'||v_q||'%' or agency_public_id::text ilike '%'||v_q||'%' or id::text ilike v_q||'%'
    limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) into v_tx from (
    select id, event_type, title, amount_coin, amount_try, created_at, ref_id
    from public.finance_live_events
    where id::text ilike v_q||'%' or ref_id ilike '%'||v_q||'%' or title ilike '%'||v_q||'%'
    order by created_at desc limit v_limit
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb) into v_reports from (
    select id, report_id, report_type, status, created_at from public.finance_report_jobs
    where report_id ilike '%'||v_q||'%' or id::text ilike v_q||'%'
    order by created_at desc limit v_limit
  ) t;

  return jsonb_build_object('ok', true, 'users', v_users, 'agencies', v_agencies, 'transactions', v_tx, 'reports', v_reports);
end;
$$;

grant execute on function public.admin_finance_search(text, int) to authenticated;

-- ========== REPORTS ==========
create or replace function public.admin_finance_report_create(p_report_type text, p_filters jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_id text;
  v_id uuid;
  v_payload jsonb;
  v_period text := coalesce(p_filters->>'period', 'month');
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;

  v_report_id := 'FIN-' || to_char(timezone('Europe/Istanbul', now()), 'YYYY') || '-' ||
    lpad(nextval('public.finance_report_seq')::text, 6, '0');

  v_payload := jsonb_build_object(
    'report_type', p_report_type,
    'filters', coalesce(p_filters, '{}'::jsonb),
    'generated_at', now(),
    'overview', public.admin_finance_overview(),
    'coin_economy', public.admin_finance_coin_economy(),
    'liabilities', public.admin_finance_liabilities(),
    'pnl', public.admin_finance_pnl(),
    'revenue', public.admin_finance_revenue(v_period),
    'sales', public.admin_finance_sales(v_period, 30)
  );

  insert into public.finance_report_jobs (
    report_id, report_type, filters, status, payload, created_by, ready_at
  ) values (
    v_report_id, p_report_type, coalesce(p_filters,'{}'::jsonb), 'ready', v_payload, auth.uid(), now()
  ) returning id into v_id;

  insert into public.finance_report_snapshots (report_job_id, period_start, period_end, payload)
  values (
    v_id,
    (timezone('Europe/Istanbul', public.finance_istanbul_month_start(now())))::date,
    (timezone('Europe/Istanbul', now()))::date,
    v_payload
  );

  perform public.finance_audit_yaz('report_create','finance_report', v_id::text, null,
    jsonb_build_object('report_id', v_report_id, 'type', p_report_type, 'filters', p_filters), '{}'::jsonb);

  return jsonb_build_object('ok', true, 'id', v_id, 'report_id', v_report_id, 'status', 'ready', 'payload', v_payload);
end;
$$;

grant execute on function public.admin_finance_report_create(text, jsonb) to authenticated;

create or replace function public.admin_finance_report_list(p_limit int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_rows jsonb;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc), '[]'::jsonb)
  into v_rows from (
    select id, report_id, report_type, filters, status, storage_path, created_at, ready_at, created_by
    from public.finance_report_jobs
    order by created_at desc
    limit least(greatest(coalesce(p_limit,30),1),100)
  ) t;
  return jsonb_build_object('ok', true, 'items', v_rows);
end;
$$;

grant execute on function public.admin_finance_report_list(int) to authenticated;

create or replace function public.admin_finance_report_get(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_row public.finance_report_jobs%rowtype;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select * into v_row from public.finance_report_jobs where id=p_id;
  if not found then raise exception 'Report not found'; end if;
  perform public.finance_audit_yaz('report_view','finance_report', p_id::text, null, null,
    jsonb_build_object('report_id', v_row.report_id));
  return jsonb_build_object('ok', true, 'job', to_jsonb(v_row));
end;
$$;

grant execute on function public.admin_finance_report_get(uuid) to authenticated;

create or replace function public.admin_finance_report_attach_storage(p_id uuid, p_storage_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;
  update public.finance_report_jobs
  set storage_path = p_storage_path, status='ready', ready_at=now()
  where id=p_id;
  perform public.finance_audit_yaz('report_pdf_attach','finance_report', p_id::text, null,
    jsonb_build_object('storage_path', p_storage_path), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_finance_report_attach_storage(uuid, text) to authenticated;

-- signed URL helper note: client uses supabase.storage.createSignedUrl after auth check via report_get
create or replace function public.admin_finance_report_signed_url_audit(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_path text;
begin
  if not public.finance_yetkisi_var_mi('READ_ONLY_FINANCE') then
    raise exception 'Forbidden: finance access required';
  end if;
  select storage_path into v_path from public.finance_report_jobs where id=p_id;
  perform public.finance_audit_yaz('report_signed_url','finance_report', p_id::text, null,
    jsonb_build_object('storage_path', v_path), '{}'::jsonb);
  return jsonb_build_object('ok', true, 'storage_path', v_path, 'ttl_seconds', 600);
end;
$$;

grant execute on function public.admin_finance_report_signed_url_audit(uuid) to authenticated;

-- ========== ROLE ADMIN ==========
create or replace function public.admin_finance_role_ayarla(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.finance_yetkisi_var_mi('SUPER_ADMIN') then
    raise exception 'Forbidden: super admin required';
  end if;
  insert into public.finance_admin_roles (user_id, role, created_by, updated_at)
  values (p_user_id, p_role, auth.uid(), now())
  on conflict (user_id) do update set role=excluded.role, updated_at=now();
  perform public.finance_audit_yaz('role_set','finance_admin_roles', p_user_id::text, null,
    jsonb_build_object('role', p_role), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_finance_role_ayarla(uuid, text) to authenticated;

-- ========== anomaly scan ==========
create or replace function public.admin_finance_anomaly_scan()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created int := 0;
  r record;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') then
    raise exception 'Forbidden: finance write required';
  end if;

  for r in
    select w.user_id, w.coins
    from public.wallets w
    where w.coins < 0
    limit 50
  loop
    insert into public.finance_alerts (alert_type, severity, title, body, entity_type, entity_id)
    select 'NEGATIVE_BALANCE', 'danger', 'Negative coin balance',
           'User has negative wallet coins: '||r.coins::text, 'user', r.user_id::text
    where not exists (
      select 1 from public.finance_alerts fa
      where fa.alert_type='NEGATIVE_BALANCE' and fa.entity_id=r.user_id::text and fa.status='open'
    );
    v_created := v_created + 1;
  end loop;

  for r in
    select cp.user_id, sum(cp.coins_added) as coins
    from public.coin_purchases cp
    where coalesce(cp.status,'completed')='completed'
      and cp.created_at > now() - interval '1 hour'
    group by cp.user_id
    having sum(cp.coins_added) > 500000
    limit 50
  loop
    insert into public.finance_alerts (alert_type, severity, title, body, entity_type, entity_id, meta)
    select 'UNUSUAL_COIN_PURCHASE', 'warning', 'Unusual coin purchase',
           'Last hour purchases: '||r.coins::text||' coins', 'user', r.user_id::text,
           jsonb_build_object('coins', r.coins)
    where not exists (
      select 1 from public.finance_alerts fa
      where fa.alert_type='UNUSUAL_COIN_PURCHASE' and fa.entity_id=r.user_id::text
        and fa.status='open' and fa.created_at > now() - interval '6 hours'
    );
    v_created := v_created + 1;
  end loop;

  return jsonb_build_object('ok', true, 'alerts_touched', v_created);
end;
$$;

grant execute on function public.admin_finance_anomaly_scan() to authenticated;

