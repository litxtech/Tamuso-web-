-- ---------------------------------------------------------------------------
-- 11. Apply from verified purchases (country snapshot at earn time)
-- ---------------------------------------------------------------------------
create or replace function public.cl_apply_coin_purchase(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.coin_purchases%rowtype;
  v_pkg public.coin_packages%rowtype;
  v_cat text;
  v_src text;
  v_product text;
  v_points bigint;
  v_cc text;
  v_city uuid;
  v_week text;
  v_earn_id uuid;
  v_event_id uuid;
  v_affect_weekly boolean;
begin
  if not public.cl_feature_on('country_league_enabled') then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  select * into r from public.coin_purchases where id = p_purchase_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;

  if lower(coalesce(r.store, '')) in ('manual', 'admin') then
    return jsonb_build_object('ok', false, 'reason', 'excluded_store');
  end if;
  if lower(coalesce(r.provider, '')) in ('manual', 'admin') then
    return jsonb_build_object('ok', false, 'reason', 'excluded_provider');
  end if;
  if r.status not in ('completed', 'refunded') then
    return jsonb_build_object('ok', false, 'reason', 'status');
  end if;

  if lower(coalesce(r.provider, '')) = 'stripe'
     or lower(coalesce(r.store, '')) = 'stripe' then
    v_cat := 'stripe_coin';
    v_src := 'stripe_coin';
  else
    v_cat := 'coin_iap';
    v_src := 'coin_iap';
  end if;
  if not public.cl_eligibility_on(v_cat) then
    return jsonb_build_object('ok', false, 'reason', 'eligibility');
  end if;

  select * into v_pkg from public.coin_packages where id = r.package_id;
  v_product := coalesce(v_pkg.sku, v_pkg.apple_product_id, v_pkg.google_product_id);
  v_points := public.cl_resolve_points(v_product);
  if v_points <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_points_map');
  end if;

  -- Snapshot country at purchase time from profile (immutable for this tx)
  select public.ulke_koduna_normalize(p.country_code), p.primary_city_id
    into v_cc, v_city
  from public.profiles p where p.id = r.user_id;

  if v_cc is null then
    return jsonb_build_object('ok', false, 'reason', 'no_country');
  end if;

  if r.status = 'completed' then
    v_week := public.cl_week_id();
    v_event_id := public.cl_apply_event(
      r.user_id, v_cc, v_city, v_src, r.id, v_product, v_points,
      'EARN', v_week, null,
      jsonb_build_object('coins_added', r.coins_added, 'provider', r.provider),
      true
    );
    return jsonb_build_object(
      'ok', v_event_id is not null,
      'event_id', v_event_id,
      'points', v_points,
      'country_code', v_cc,
      'event_type', 'EARN'
    );
  end if;

  -- Refund / chargeback: reverse original EARN
  select id, country_code, week_id, points_delta
    into v_earn_id, v_cc, v_week, v_points
  from public.country_contribution_events
  where source_type = v_src
    and source_transaction_id = r.id
    and event_type = 'EARN'
  limit 1;

  if v_earn_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_earn');
  end if;

  -- Closed-week policy: all_time always; weekly only if same open week
  v_affect_weekly := (v_week = public.cl_week_id());

  v_event_id := public.cl_apply_event(
    r.user_id, v_cc, v_city, v_src, r.id, v_product, -abs(v_points),
    'REFUND', v_week, v_earn_id,
    jsonb_build_object('refund_of', v_earn_id),
    v_affect_weekly
  );

  return jsonb_build_object(
    'ok', v_event_id is not null,
    'event_id', v_event_id,
    'points', -abs(v_points),
    'country_code', v_cc,
    'event_type', 'REFUND',
    'affect_weekly', v_affect_weekly
  );
end;
$$;

create or replace function public.cl_apply_ai_music_purchase(p_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.ai_music_purchases%rowtype;
  v_cat text;
  v_src text;
  v_points bigint;
  v_cc text;
  v_city uuid;
  v_week text;
  v_event_id uuid;
begin
  if not public.cl_feature_on('country_league_enabled') then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  select * into r from public.ai_music_purchases where id = p_purchase_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if r.status <> 'CREDITED' then
    return jsonb_build_object('ok', false, 'reason', 'status');
  end if;
  if lower(coalesce(r.store, '')) in ('manual', 'admin', 'welcome') then
    return jsonb_build_object('ok', false, 'reason', 'excluded_store');
  end if;

  if lower(coalesce(r.store, '')) = 'stripe' then
    v_cat := 'stripe_ai_music';
    v_src := 'stripe_ai_music';
  else
    v_cat := 'ai_music_iap';
    v_src := 'ai_music_iap';
  end if;
  if not public.cl_eligibility_on(v_cat) then
    return jsonb_build_object('ok', false, 'reason', 'eligibility');
  end if;

  v_points := public.cl_resolve_points(r.product_id);
  if v_points <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_points_map');
  end if;

  select public.ulke_koduna_normalize(p.country_code), p.primary_city_id
    into v_cc, v_city
  from public.profiles p where p.id = r.user_id;

  if v_cc is null then
    return jsonb_build_object('ok', false, 'reason', 'no_country');
  end if;

  v_week := public.cl_week_id();
  v_event_id := public.cl_apply_event(
    r.user_id, v_cc, v_city, v_src, r.id, r.product_id, v_points,
    'EARN', v_week, null,
    jsonb_build_object('seconds', r.seconds_snapshot, 'store', r.store),
    true
  );

  return jsonb_build_object(
    'ok', v_event_id is not null,
    'event_id', v_event_id,
    'points', v_points,
    'country_code', v_cc,
    'event_type', 'EARN'
  );
end;
$$;

create or replace function public.trg_cl_coin_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status) then
      perform public.cl_apply_coin_purchase(NEW.id);
    end if;
  exception when others then
    insert into public.country_league_audit (actor_id, action, entity_type, entity_id, new_value)
    values (NEW.user_id, 'trigger_error', 'coin_purchase', NEW.id::text,
      jsonb_build_object('err', SQLERRM));
  end;
  return NEW;
end;
$$;

drop trigger if exists cl_coin_purchase_trg on public.coin_purchases;
create trigger cl_coin_purchase_trg
  after insert or update of status on public.coin_purchases
  for each row execute function public.trg_cl_coin_purchase();

create or replace function public.trg_cl_ai_music_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if NEW.status = 'CREDITED' and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
      perform public.cl_apply_ai_music_purchase(NEW.id);
    end if;
  exception when others then
    insert into public.country_league_audit (actor_id, action, entity_type, entity_id, new_value)
    values (NEW.user_id, 'trigger_error', 'ai_music_purchase', NEW.id::text,
      jsonb_build_object('err', SQLERRM));
  end;
  return NEW;
end;
$$;

drop trigger if exists cl_ai_music_purchase_trg on public.ai_music_purchases;
create trigger cl_ai_music_purchase_trg
  after insert or update of status on public.ai_music_purchases
  for each row execute function public.trg_cl_ai_music_purchase();
