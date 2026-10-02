-- Ajans Stripe satış linkleri:
-- 1) Satış (ödeme) sonrası link kapanır, yeniden kullanılamaz
-- 2) Ödeme yoksa oluşturmadan 5 saat sonra otomatik kapanır

alter table public.agency_sale_links
  add column if not exists expires_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_reason text
    check (closed_reason is null or closed_reason in ('sold', 'expired', 'manual'));

-- Mevcut aktif linklere 5 saatlik süre ver (oluşturma anından)
update public.agency_sale_links
set expires_at = created_at + interval '5 hours'
where expires_at is null;

create index if not exists agency_sale_links_expires_active_idx
  on public.agency_sale_links (expires_at)
  where is_active = true;

create or replace function public.ajans_satis_linki_kapat(
  p_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agency_sale_links set
    is_active = false,
    closed_at = coalesce(closed_at, now()),
    closed_reason = coalesce(closed_reason, p_reason),
    updated_at = now()
  where id = p_id
    and is_active = true;
end;
$$;

-- Süresi dolan aktif linkleri kapat (ödeme yapılmamış)
create or replace function public.ajans_satis_linkleri_suresi_dolanlari_kapat()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  update public.agency_sale_links set
    is_active = false,
    closed_at = now(),
    closed_reason = 'expired',
    updated_at = now()
  where is_active = true
    and expires_at is not null
    and expires_at <= now();

  get diagnostics v_count = row_count;
  return jsonb_build_object('ok', true, 'closed', v_count);
end;
$$;

grant execute on function public.ajans_satis_linkleri_suresi_dolanlari_kapat() to service_role;
grant execute on function public.ajans_satis_linkleri_suresi_dolanlari_kapat() to authenticated;

-- Oluşturma: expires_at = now() + 5 saat
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

  -- Geçmiş süresi dolanları temizle
  perform public.ajans_satis_linkleri_suresi_dolanlari_kapat();

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
    package_id, liste_fiyat_try, coins, created_by,
    is_active, expires_at
  ) values (
    p_agency_id,
    public.ajans_satis_kod_uret(),
    left(v_title, 120),
    left(coalesce(p_description, ''), 2000),
    v_plat,
    v_pkg.id,
    coalesce(p_liste_fiyat_try, v_pkg.liste_fiyat_try),
    coalesce(p_coins, v_pkg.coins),
    v_uid,
    true,
    now() + interval '5 hours'
  )
  returning * into v_row;

  return jsonb_build_object('ok', true, 'link', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_linki_olustur(uuid, text, text, text, uuid, numeric, bigint) to authenticated;

-- Getir: süresi dolmuşsa kapat + reddet
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
  where code = upper(trim(p_code));

  if v_row.id is null then
    raise exception 'Link bulunamadi';
  end if;

  if v_row.is_active
     and v_row.expires_at is not null
     and v_row.expires_at <= now() then
    perform public.ajans_satis_linki_kapat(v_row.id, 'expired');
    raise exception 'Link suresi doldu (5 saat). Yeni link olusturun.';
  end if;

  if not v_row.is_active then
    if v_row.closed_reason = 'sold' then
      raise exception 'Bu link kullanimda: satis tamamlandi';
    elsif v_row.closed_reason = 'expired' then
      raise exception 'Link suresi doldu (5 saat). Yeni link olusturun.';
    else
      raise exception 'Link bulunamadi veya pasif';
    end if;
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
      'agency_name', coalesce(v_agency_name, 'Ajans'),
      'expires_at', v_row.expires_at,
      'is_active', true
    )
  );
end;
$$;

grant execute on function public.ajans_satis_linki_getir(text) to authenticated, anon;

-- Manuel aktiflik: kapatınca reason=manual
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

  if coalesce(p_is_active, true) = false then
    update public.agency_sale_links set
      is_active = false,
      closed_at = coalesce(closed_at, now()),
      closed_reason = coalesce(closed_reason, 'manual'),
      updated_at = now()
    where id = p_id and agency_id = p_agency_id
    returning * into v_row;
  else
    -- Yeniden açma: yalnızca süresi dolmamış ve satılmamış linkler
    update public.agency_sale_links set
      is_active = true,
      closed_at = null,
      closed_reason = null,
      expires_at = case
        when expires_at is null or expires_at <= now() then now() + interval '5 hours'
        else expires_at
      end,
      updated_at = now()
    where id = p_id
      and agency_id = p_agency_id
      and coalesce(closed_reason, '') is distinct from 'sold'
    returning * into v_row;

    if not found then
      raise exception 'Satilan link tekrar acilamaz';
    end if;
  end if;

  if v_row.id is null then raise exception 'Link bulunamadi'; end if;
  return jsonb_build_object('ok', true, 'link', row_to_json(v_row));
end;
$$;

grant execute on function public.ajans_satis_linki_aktiflik(uuid, uuid, boolean) to authenticated;

-- Stripe onay sonrası linki kapat (sold)
create or replace function public.ajans_satis_stripe_onayla(
  p_sale_link_code text,
  p_idempotency_key text,
  p_provider_tx_id text,
  p_stripe_session_id text default null,
  p_amount_try numeric default null,
  p_buyer_user_id uuid default null,
  p_buyer_email text default null,
  p_buyer_name text default null,
  p_receipt jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.agency_sale_links%rowtype;
  v_sale public.agency_tracked_sales%rowtype;
  v_existing uuid;
  v_buyer uuid;
  v_email text;
  v_name text;
  v_amount numeric;
  v_coins bigint;
  v_title text;
  v_owner uuid;
  v_agency_name text;
  v_note text;
  v_payload jsonb;
  v_staff uuid;
  v_hediye jsonb;
begin
  if p_sale_link_code is null or length(trim(p_sale_link_code)) = 0 then
    raise exception 'sale_link_code required';
  end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key required';
  end if;

  if p_stripe_session_id is not null then
    select * into v_sale from public.agency_tracked_sales
    where stripe_session_id = p_stripe_session_id limit 1;
    if found then
      perform public.ajans_satis_ciro_hediye_isle(v_sale.id);
      if v_sale.sale_link_id is not null then
        perform public.ajans_satis_linki_kapat(v_sale.sale_link_id, 'sold');
      end if;
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'sale_id', v_sale.id,
        'agency_id', v_sale.agency_id,
        'buyer_id', v_sale.buyer_id,
        'coins', v_sale.coins,
        'amount_try', v_sale.amount_try,
        'package_title', v_sale.package_title,
        'buyer_name', v_sale.buyer_display_name,
        'buyer_email', v_sale.buyer_email,
        'sale_link_code', p_sale_link_code,
        'receipt_url', v_sale.receipt_url,
        'pdf_path', v_sale.receipt_payload->>'pdf_path'
      );
    end if;
  end if;
  if p_provider_tx_id is not null then
    select * into v_sale from public.agency_tracked_sales
    where stripe_payment_intent_id = p_provider_tx_id limit 1;
    if found then
      perform public.ajans_satis_ciro_hediye_isle(v_sale.id);
      if v_sale.sale_link_id is not null then
        perform public.ajans_satis_linki_kapat(v_sale.sale_link_id, 'sold');
      end if;
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'sale_id', v_sale.id,
        'agency_id', v_sale.agency_id,
        'buyer_id', v_sale.buyer_id,
        'coins', v_sale.coins,
        'amount_try', v_sale.amount_try,
        'package_title', v_sale.package_title,
        'buyer_name', v_sale.buyer_display_name,
        'buyer_email', v_sale.buyer_email,
        'sale_link_code', p_sale_link_code,
        'receipt_url', v_sale.receipt_url,
        'pdf_path', v_sale.receipt_payload->>'pdf_path'
      );
    end if;
  end if;

  select * into v_link
  from public.agency_sale_links
  where upper(code) = upper(trim(p_sale_link_code))
  for update
  limit 1;
  if not found then raise exception 'Sale link not found'; end if;

  if v_link.is_active
     and v_link.expires_at is not null
     and v_link.expires_at <= now() then
    perform public.ajans_satis_linki_kapat(v_link.id, 'expired');
    raise exception 'Sale link expired';
  end if;

  if not v_link.is_active then
    raise exception 'Sale link inactive';
  end if;

  v_amount := coalesce(p_amount_try, v_link.liste_fiyat_try, 0);
  v_coins := coalesce(v_link.coins, 0);
  v_title := coalesce(nullif(trim(v_link.title), ''), 'Ajans paket satışı');

  v_buyer := p_buyer_user_id;
  v_email := nullif(lower(trim(coalesce(p_buyer_email, ''))), '');
  v_name := nullif(trim(coalesce(p_buyer_name, '')), '');

  if v_buyer is null and v_email is not null then
    select u.id into v_buyer from auth.users u where lower(u.email) = v_email limit 1;
  end if;
  if v_name is null and v_buyer is not null then
    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''))
      into v_name from public.profiles where id = v_buyer;
  end if;
  if v_email is null and v_buyer is not null then
    select lower(email) into v_email from auth.users where id = v_buyer;
  end if;

  v_payload := coalesce(p_receipt, '{}'::jsonb) || jsonb_build_object(
    'sale_link_id', v_link.id,
    'sale_link_code', v_link.code,
    'agency_id', v_link.agency_id,
    'package_id', v_link.package_id,
    'buyer_id', v_buyer,
    'buyer_email', v_email,
    'buyer_name', v_name,
    'amount_try', v_amount,
    'coins', v_coins,
    'provider', 'stripe',
    'stripe_session_id', p_stripe_session_id,
    'stripe_payment_intent_id', p_provider_tx_id
  );

  v_note := format(
    '%s · %s ₺ · %s coin',
    coalesce(v_name, v_email, 'Alıcı'),
    to_char(v_amount, 'FM999,999,990.00'),
    to_char(v_coins, 'FM999,999,999')
  );

  insert into public.agency_tracked_sales (
    agency_id, sale_link_id, buyer_id, buyer_label, buyer_email, buyer_display_name,
    package_title, liste_fiyat_try, amount_try, coins, selling_platform,
    payment_status, validation_status, receipt_note, receipt_payload,
    stripe_session_id, stripe_payment_intent_id
  ) values (
    v_link.agency_id,
    v_link.id,
    v_buyer,
    left(coalesce(v_name, v_email, 'Alıcı'), 120),
    left(coalesce(v_email, ''), 200),
    left(coalesce(v_name, ''), 200),
    left(v_title, 120),
    v_link.liste_fiyat_try,
    v_amount,
    v_coins,
    v_link.selling_platform,
    'paid',
    'valid',
    left(v_note, 400),
    v_payload,
    p_stripe_session_id,
    p_provider_tx_id
  )
  returning * into v_sale;

  -- Satış tamamlandı → link kapanır (tek kullanımlık)
  perform public.ajans_satis_linki_kapat(v_link.id, 'sold');

  if v_buyer is not null and v_coins > 0 then
    if public.kill_switch_aktif_mi('kill_coin_purchase') then
      raise exception 'Coin purchase temporarily disabled';
    end if;

    select result_ref into v_existing
    from public.finance_idempotency_keys
    where idempotency_key = p_idempotency_key and user_id = v_buyer;

    if v_existing is null then
      insert into public.wallets (user_id, coins, diamonds)
      values (v_buyer, 0, 0)
      on conflict (user_id) do nothing;

      update public.wallets set coins = coins + v_coins, updated_at = now()
      where user_id = v_buyer;

      insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
      values (
        v_buyer, 'coins', v_coins,
        (select coins from public.wallets where user_id = v_buyer),
        'agency_sale_link_purchase', 'agency_tracked_sale', v_sale.id
      );

      insert into public.coin_purchases (
        user_id, package_id, coins_added, amount_usd, amount_try,
        provider, provider_tx_id, status, idempotency_key, store,
        receipt_payload, verified_at
      ) values (
        v_buyer, null, v_coins, null, v_amount,
        'stripe', p_provider_tx_id, 'completed', p_idempotency_key, 'manual',
        v_payload, now()
      );

      insert into public.finance_idempotency_keys (
        idempotency_key, user_id, operation, result_ref, result_payload
      ) values (
        p_idempotency_key, v_buyer, 'agency_sale_link_purchase', v_sale.id,
        jsonb_build_object('sale_id', v_sale.id, 'coins', v_coins)
      )
      on conflict (idempotency_key) do nothing;
    end if;
  end if;

  v_hediye := public.ajans_satis_ciro_hediye_isle(v_sale.id);

  select owner_id, name into v_owner, v_agency_name
  from public.agencies where id = v_link.agency_id;

  if v_owner is not null then
    perform public.bildirim_kuyruga_ekle(
      v_owner,
      'agency',
      'Yeni Stripe satış',
      left(format('%s · %s ₺ · %s coin · %s', v_title, to_char(v_amount, 'FM999,999,990.00'), to_char(v_coins, 'FM999,999,999'), coalesce(v_name, v_email, 'Alıcı')), 400),
      '/ajans/' || v_link.agency_id::text || '/dekontlar',
      jsonb_build_object(
        'type', 'agency_sale_paid',
        'agency_id', v_link.agency_id,
        'sale_id', v_sale.id,
        'gift_coins', v_hediye->>'gift_coins'
      )
    );
  end if;

  for v_staff in
    select distinct s.user_id
    from public.agency_staff_roles s
    where s.agency_id = v_link.agency_id
      and s.user_id is distinct from v_owner
      and (
        s.role_code in ('OWNER', 'MANAGER')
        or exists (
          select 1 from public.agency_role_default_permissions d
          where d.role_code = s.role_code and d.permission_code = 'agency.view_sales'
        )
        or exists (
          select 1 from public.agency_staff_permission_overrides o
          where o.agency_id = v_link.agency_id
            and o.user_id = s.user_id
            and o.permission_code = 'agency.view_sales'
            and o.granted = true
        )
      )
  loop
    perform public.bildirim_kuyruga_ekle(
      v_staff,
      'agency',
      'Yeni Stripe satış',
      left(format('%s · %s ₺ · %s', coalesce(v_agency_name, 'Ajans'), to_char(v_amount, 'FM999,999,990.00'), coalesce(v_name, v_email, 'Alıcı')), 400),
      '/ajans/' || v_link.agency_id::text || '/dekontlar',
      jsonb_build_object('type', 'agency_sale_paid', 'agency_id', v_link.agency_id, 'sale_id', v_sale.id)
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'sale_id', v_sale.id,
    'agency_id', v_link.agency_id,
    'buyer_id', v_buyer,
    'coins', v_coins,
    'amount_try', v_amount,
    'package_title', v_title,
    'buyer_name', v_name,
    'buyer_email', v_email,
    'sale_link_code', v_link.code,
    'agency_name', v_agency_name,
    'stripe_pi', p_provider_tx_id,
    'receipt_url', v_sale.receipt_url,
    'pdf_path', v_sale.receipt_payload->>'pdf_path',
    'gift_coins', v_hediye->>'gift_coins',
    'link_closed', true
  );
end;
$$;

revoke all on function public.ajans_satis_stripe_onayla(text, text, text, text, numeric, uuid, text, text, jsonb) from public;
grant execute on function public.ajans_satis_stripe_onayla(text, text, text, text, numeric, uuid, text, text, jsonb) to service_role;

-- pg_cron: her 15 dakikada süresi dolan linkleri kapat
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception when others then
  raise notice 'pg_cron yok — edge cron kullanin';
end $$;

do $$
begin
  perform cron.unschedule('ajans-satis-link-expire');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule(
    'ajans-satis-link-expire',
    '*/15 * * * *',
    $cron$ select public.ajans_satis_linkleri_suresi_dolanlari_kapat(); $cron$
  );
exception when others then
  raise notice 'pg_cron schedule basarisiz: %', SQLERRM;
end $$;
