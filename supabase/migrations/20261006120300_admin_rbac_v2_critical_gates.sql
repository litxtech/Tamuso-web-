-- =============================================================================
-- Admin RBAC V2: critical operation permission gates
-- Does not rewrite full function bodies where avoidable — wraps auth checks.
-- =============================================================================

-- Coin adjust
create or replace function public.admin_kullanici_coin_isle(
  p_user_ref text,
  p_islem text,
  p_miktar bigint,
  p_not text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_ad text;
  v_islem text := lower(trim(coalesce(p_islem, '')));
  v_miktar bigint := abs(coalesce(p_miktar, 0));
  v_delta bigint;
  v_reason text;
  v_bal bigint;
  v_not text := nullif(trim(coalesce(p_not, '')), '');
  v_ref text := nullif(trim(coalesce(p_user_ref, '')), '');
  v_warn_id uuid;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  perform public.admin_require_permission('coins.adjust');

  if v_ref is null then raise exception 'Kullanici gerekli'; end if;
  if v_miktar <= 0 then raise exception 'Miktar pozitif olmali'; end if;
  if v_islem not in ('topup', 'deduct', 'penalty', 'yukle', 'eksilt', 'ceza') then
    raise exception 'Gecersiz islem (topup|deduct|penalty)';
  end if;

  if v_islem = 'yukle' then v_islem := 'topup'; end if;
  if v_islem = 'eksilt' then v_islem := 'deduct'; end if;
  if v_islem = 'ceza' then v_islem := 'penalty'; end if;

  begin
    v_uid := v_ref::uuid;
  exception when others then
    v_uid := null;
  end;

  if v_uid is null then
    select p.id into v_uid
    from public.profiles p
    where p.public_user_id = v_ref
       or lower(coalesce(p.public_user_id, '')) = lower(v_ref)
       or lower(coalesce(p.username, '')) = lower(v_ref)
    order by
      case when p.public_user_id = v_ref then 0 else 1 end,
      p.created_at asc
    limit 1;
  end if;

  if v_uid is null then raise exception 'Kullanici bulunamadi'; end if;

  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), left(p.id::text, 8))
  into v_ad
  from public.profiles p
  where p.id = v_uid;

  if v_islem = 'topup' then
    v_delta := v_miktar;
    v_reason := 'admin_topup';
  elsif v_islem = 'deduct' then
    v_delta := -v_miktar;
    v_reason := 'admin_deduct';
  else
    v_delta := -v_miktar;
    v_reason := 'admin_penalty';
  end if;

  insert into public.wallets (user_id, coins, diamonds)
  values (v_uid, 0, 0)
  on conflict (user_id) do nothing;

  update public.wallets
  set coins = greatest(coins + v_delta, 0), updated_at = now()
  where user_id = v_uid
  returning coins into v_bal;

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type)
  values (
    v_uid,
    'coins',
    v_delta,
    v_bal,
    case
      when v_not is not null then v_reason || ':' || left(v_not, 120)
      else v_reason
    end,
    'admin'
  );

  if v_islem = 'penalty' then
    insert into public.user_warnings (user_id, issued_by, reason, severity, notes)
    values (
      v_uid,
      auth.uid(),
      coalesce(v_not, 'Coin cezasi: ' || v_miktar::text),
      'high',
      'coin_penalty:' || v_miktar::text
    )
    returning id into v_warn_id;

    insert into public.security_events (user_id, event_type, severity, metadata)
    values (
      v_uid,
      'coin_penalty',
      'high',
      jsonb_build_object(
        'amount', v_miktar,
        'balance_after', v_bal,
        'warning_id', v_warn_id,
        'note', v_not,
        'by', auth.uid()
      )
    );
  end if;

  perform public.admin_audit_yaz(
    v_uid,
    'wallet_' || v_islem,
    case v_islem
      when 'topup' then 'Coin yukleme: +' || v_miktar::text
      when 'deduct' then 'Coin eksiltme: -' || v_miktar::text
      else 'Coin cezasi: -' || v_miktar::text
    end || coalesce(' · ' || v_not, ''),
    jsonb_build_object(
      'islem', v_islem,
      'miktar', v_miktar,
      'delta', v_delta,
      'balance_after', v_bal,
      'note', v_not,
      'warning_id', v_warn_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'user_id', v_uid,
    'display_name', v_ad,
    'islem', v_islem,
    'delta', v_delta,
    'balance_after', v_bal,
    'currency', 'coins',
    'warning_id', v_warn_id
  );
end;
$$;

-- Wallet currency adjust (diamonds/coins)
create or replace function public.admin_cuzdan_duzelt(
  p_user_id uuid,
  p_currency text,
  p_delta bigint,
  p_reason text default 'admin_adjust'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal bigint;
  v_cur text := lower(trim(p_currency));
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if v_cur = 'coins' then
    perform public.admin_require_permission('coins.adjust');
  else
    perform public.admin_require_permission('diamonds.adjust');
  end if;
  if v_cur not in ('coins', 'diamonds') then raise exception 'Gecersiz birim'; end if;
  if p_delta = 0 then raise exception 'Delta 0 olamaz'; end if;

  insert into public.wallets (user_id, coins, diamonds)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;

  if v_cur = 'coins' then
    update public.wallets set coins = greatest(coins + p_delta, 0), updated_at = now()
    where user_id = p_user_id
    returning coins into v_bal;
  else
    update public.wallets set diamonds = greatest(diamonds + p_delta, 0), updated_at = now()
    where user_id = p_user_id
    returning diamonds into v_bal;
  end if;

  insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type)
  values (p_user_id, v_cur, p_delta, v_bal, coalesce(nullif(trim(p_reason), ''), 'admin_adjust'), 'admin');

  perform public.admin_audit_yaz(
    p_user_id, 'wallet_adjust',
    'Cuzdan duzeltme ' || v_cur || ' ' || p_delta::text,
    jsonb_build_object('currency', v_cur, 'delta', p_delta, 'balance', v_bal)
  );

  return jsonb_build_object('ok', true, 'balance', v_bal, 'currency', v_cur);
end;
$$;

-- Withdrawal status — approve/reject need payout permissions
create or replace function public.admin_cekim_durum_guncelle(
  p_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.withdrawal_requests%rowtype;
  v_row public.withdrawal_requests%rowtype;
  v_wallet_bal bigint;
  v_host_bal bigint;
  v_refunded boolean;
  v_title text;
  v_body text;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if p_status not in ('pending','under_review','approved','paid','rejected','frozen') then
    raise exception 'Gecersiz durum';
  end if;

  if p_status in ('approved', 'paid') then
    perform public.admin_require_permission('payout.approve');
  elsif p_status = 'rejected' then
    perform public.admin_require_permission('payout.reject');
  else
    perform public.admin_require_permission('payout.view');
  end if;

  select * into v_old from public.withdrawal_requests where id = p_id for update;
  if not found then raise exception 'Cekim bulunamadi'; end if;

  v_refunded := coalesce((v_old.details->>'refunded')::boolean, false);

  if p_status = 'rejected'
     and v_old.status not in ('rejected', 'paid')
     and not v_refunded then
    insert into public.wallets (user_id, coins, diamonds)
    values (v_old.user_id, 0, 0)
    on conflict (user_id) do nothing;

    insert into public.host_earnings (user_id, diamonds)
    values (v_old.user_id, 0)
    on conflict (user_id) do nothing;

    update public.wallets
    set diamonds = diamonds + v_old.diamonds, updated_at = now()
    where user_id = v_old.user_id
    returning diamonds into v_wallet_bal;

    update public.host_earnings
    set diamonds = diamonds + v_old.diamonds, updated_at = now()
    where user_id = v_old.user_id
    returning diamonds into v_host_bal;

    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (
      v_old.user_id, 'diamonds', v_old.diamonds, v_wallet_bal,
      'withdrawal_refund', 'withdrawal', v_old.id
    );

    insert into public.host_earnings_ledger (user_id, delta, balance_after, reason, ref_type, ref_id)
    values (
      v_old.user_id, v_old.diamonds, v_host_bal,
      'withdrawal_refund', 'withdrawal', v_old.id
    );

    v_refunded := true;
  end if;

  update public.withdrawal_requests set
    status = p_status,
    processed_at = case
      when p_status in ('approved','paid','rejected') then now()
      else processed_at
    end,
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
      'admin_note', p_note,
      'admin_id', auth.uid(),
      'admin_at', now(),
      'refunded', v_refunded
    )
  where id = p_id
  returning * into v_row;

  perform public.admin_audit_yaz(
    v_row.user_id,
    'withdrawal_' || p_status,
    'Cekim ' || p_status || ': ' || v_row.diamonds::text || ' elmas',
    jsonb_build_object('withdrawal_id', p_id, 'note', p_note, 'refunded', v_refunded)
  );

  if v_old.status is distinct from p_status
     and p_status in ('approved', 'paid', 'rejected') then
    v_title := case p_status
      when 'approved' then 'Çekim onaylandı'
      when 'paid' then 'Çekim ödendi'
      else 'Çekim reddedildi'
    end;
    v_body := case
      when p_status = 'rejected' and v_refunded then
        v_row.diamonds::text || ' elmas çekimin reddedildi. Tutar iade edildi.'
      when p_status = 'rejected' then
        v_row.diamonds::text || ' elmas çekimin reddedildi.'
      when p_status = 'paid' then
        v_row.diamonds::text || ' elmas çekimin ödendi.'
      else
        v_row.diamonds::text || ' elmas çekimin onaylandı.'
    end;
    begin
      perform public.bildirim_kuyruga_ekle(
        v_row.user_id,
        'wallet',
        v_title,
        v_body,
        '/(tabs)/wallet',
        jsonb_build_object(
          'type', 'withdrawal_' || p_status,
          'withdrawal_id', v_row.id
        )
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'id', v_row.id, 'status', v_row.status, 'refunded', v_refunded);
end;
$$;

-- Feature flags
create or replace function public.admin_ozellik_bayragi_ayarla(
  p_key text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  perform public.admin_require_permission('features.toggle');
  update public.feature_flags set enabled = p_enabled, updated_at = now()
  where key = p_key;
  if not found then raise exception 'Bayrak yok'; end if;
  perform public.admin_audit_yaz(
    null, 'feature_flag',
    'Bayrak ' || p_key || ' = ' || p_enabled::text,
    jsonb_build_object('key', p_key, 'enabled', p_enabled)
  );
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_kill_switch_ayarla(
  p_key text,
  p_active boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  perform public.admin_require_permission('features.toggle');
  update public.kill_switches set
    active = p_active,
    reason = case when p_active then coalesce(p_reason, reason) else null end,
    updated_at = now()
  where key = p_key;
  if not found then raise exception 'Kill switch yok'; end if;
  perform public.admin_audit_yaz(
    null, 'kill_switch',
    'Kill ' || p_key || ' = ' || p_active::text,
    jsonb_build_object('key', p_key, 'active', p_active)
  );
  return jsonb_build_object('ok', true);
end;
$$;

-- Admin grant/revoke — require admin.admins.create / delete + keep last-admin protection
create or replace function public.admin_kullanici_admin_yetki_ayarla(
  p_user_id uuid,
  p_is_admin boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hedef public.profiles%rowtype;
  v_onceki boolean;
  v_kalan_admin bigint;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  if p_is_admin then
    perform public.admin_require_permission('admin.admins.create');
  else
    perform public.admin_require_permission('admin.admins.delete');
  end if;

  if p_user_id is null then raise exception 'Kullanici gerekli'; end if;
  if p_is_admin is null then raise exception 'Yetki durumu gerekli'; end if;
  if p_user_id = auth.uid() then
    raise exception 'Kendi admin yetkini degistiremezsin';
  end if;

  select * into v_hedef from public.profiles where id = p_user_id;
  if not found then raise exception 'Kullanici bulunamadi'; end if;
  if v_hedef.deleted_at is not null then
    raise exception 'Silinmis hesaba yetki verilemez';
  end if;

  v_onceki := coalesce(v_hedef.is_admin, false);
  if v_onceki = p_is_admin then
    return jsonb_build_object('ok', true, 'kod', 'degismedi', 'is_admin', p_is_admin);
  end if;

  if p_is_admin = false then
    if public.admin_is_super_admin(p_user_id)
       and public.admin_count_active_super_admins(p_user_id) < 1 then
      raise exception 'Son SUPER_ADMIN yetkisi kaldirilamaz';
    end if;

    select count(*)::bigint into v_kalan_admin
    from public.profiles
    where coalesce(is_admin, false) = true
      and deleted_at is null
      and id <> p_user_id;
    if coalesce(v_kalan_admin, 0) < 1 then
      raise exception 'Son admin yetkisi kaldirilamaz';
    end if;
  end if;

  perform set_config('app.allow_is_admin_change', '1', true);

  update public.profiles
  set is_admin = p_is_admin, updated_at = now()
  where id = p_user_id;

  if p_is_admin then
    insert into public.admin_accounts (user_id, status, primary_role_code, created_by)
    values (p_user_id, 'ACTIVE', 'READ_ONLY_ADMIN', auth.uid())
    on conflict (user_id) do update set status = 'ACTIVE', updated_at = now();

    insert into public.admin_staff_roles (user_id, role_code, granted_by)
    values (p_user_id, 'READ_ONLY_ADMIN', auth.uid())
    on conflict do nothing;
  else
    update public.admin_accounts set status = 'DISABLED', updated_at = now() where user_id = p_user_id;
    delete from public.admin_staff_roles where user_id = p_user_id;
  end if;

  insert into public.security_events (user_id, event_type, severity, metadata)
  values (
    p_user_id,
    case when p_is_admin then 'admin_granted' else 'admin_revoked' end,
    'critical',
    jsonb_build_object('by', auth.uid(), 'is_admin', p_is_admin, 'onceki', v_onceki)
  );

  perform public.admin_audit_yaz(
    p_user_id,
    case when p_is_admin then 'admin_grant' else 'admin_revoke' end,
    case when p_is_admin then 'Admin yetkisi verildi' else 'Admin yetkisi kaldirildi' end,
    jsonb_build_object('is_admin', p_is_admin, 'onceki', v_onceki)
  );

  return jsonb_build_object(
    'ok', true,
    'kod', case when p_is_admin then 'admin_granted' else 'admin_revoked' end,
    'is_admin', p_is_admin
  );
end;
$$;
