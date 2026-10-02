-- Admin ajans operasyon merkezi: özellik kilitleri, cüzdan dondurma,
-- yaptırımlar, kazanç cezası, admin okuma RPC'leri (build gerekmez).

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.agency_wallets
  add column if not exists is_frozen boolean not null default false;

alter table public.agency_wallets
  add column if not exists frozen_reason text;

alter table public.agency_wallets
  add column if not exists frozen_at timestamptz;

alter table public.agency_wallets
  add column if not exists frozen_by uuid references auth.users(id) on delete set null;

alter table public.agencies
  add column if not exists earnings_penalty_pct numeric(5,2) not null default 0;

alter table public.agencies
  add column if not exists gift_earn_disabled boolean not null default false;

alter table public.agencies
  add column if not exists admin_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agencies_earnings_penalty_pct_chk'
  ) then
    alter table public.agencies
      add constraint agencies_earnings_penalty_pct_chk
      check (earnings_penalty_pct >= 0 and earnings_penalty_pct <= 100);
  end if;
end $$;

create table if not exists public.agency_feature_locks (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  feature_key text not null,
  locked boolean not null default true,
  reason text,
  locked_by uuid references auth.users(id) on delete set null,
  locked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agency_id, feature_key),
  constraint agency_feature_locks_key_chk check (
    feature_key in (
      'sale_links',
      'sales_ops',
      'coin_transfer',
      'invites',
      'applications',
      'invoices',
      'packages',
      'announcements',
      'rooms',
      'live',
      'gift_earn',
      'wallet_ops'
    )
  )
);

create index if not exists agency_feature_locks_agency_idx
  on public.agency_feature_locks (agency_id) where locked = true;

alter table public.agency_feature_locks enable row level security;

drop policy if exists agency_feature_locks_select on public.agency_feature_locks;
create policy agency_feature_locks_select
  on public.agency_feature_locks for select to authenticated
  using (
    public.ben_admin_miyim()
    or public.agency_has_permission(agency_id, 'agency.view_dashboard')
  );

grant select on public.agency_feature_locks to authenticated;

create table if not exists public.agency_sanctions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  kind text not null check (kind in (
    'warning',
    'feature_lock',
    'earnings_cut',
    'wallet_freeze',
    'suspend',
    'coin_penalty',
    'gift_disable',
    'note'
  )),
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  reason text not null,
  meta jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_by uuid references auth.users(id) on delete set null,
  lifted_at timestamptz,
  lift_note text
);

create index if not exists agency_sanctions_agency_idx
  on public.agency_sanctions (agency_id, created_at desc);

create index if not exists agency_sanctions_active_idx
  on public.agency_sanctions (agency_id) where is_active = true;

alter table public.agency_sanctions enable row level security;

drop policy if exists agency_sanctions_select on public.agency_sanctions;
create policy agency_sanctions_select
  on public.agency_sanctions for select to authenticated
  using (
    public.ben_admin_miyim()
    or public.agency_has_permission(agency_id, 'agency.view_audit')
  );

grant select on public.agency_sanctions to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.agency_feature_is_locked(
  p_agency_id uuid,
  p_feature_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agency_feature_locks
    where agency_id = p_agency_id
      and feature_key = p_feature_key
      and locked = true
  );
$$;

grant execute on function public.agency_feature_is_locked(uuid, text) to authenticated, anon, service_role;

create or replace function public.agency_assert_feature(
  p_agency_id uuid,
  p_feature_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_trust text;
  v_frozen boolean;
begin
  if public.ben_admin_miyim() then
    return;
  end if;

  select status, trust_tier into v_status, v_trust
  from public.agencies where id = p_agency_id;

  if not found then
    raise exception 'Ajans bulunamadi';
  end if;

  if v_status in ('suspended', 'closed')
     or v_trust in ('Restricted', 'Suspended') then
    raise exception 'Ajans askida / kisitli';
  end if;

  if public.agency_feature_is_locked(p_agency_id, p_feature_key) then
    raise exception 'Bu ozellik admin tarafindan kilitlendi (%)', p_feature_key;
  end if;

  if p_feature_key in ('coin_transfer', 'wallet_ops', 'gift_earn', 'sale_links', 'sales_ops', 'invoices') then
    select coalesce(is_frozen, false) into v_frozen
    from public.agency_wallets where agency_id = p_agency_id;
    if coalesce(v_frozen, false) then
      raise exception 'Ajans cuzdani donduruldu';
    end if;
  end if;
end;
$$;

grant execute on function public.agency_assert_feature(uuid, text) to authenticated, service_role;

create or replace function public.ajans_ozellik_kilitleri(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency public.agencies%rowtype;
  v_wallet public.agency_wallets%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not (
    public.ben_admin_miyim()
    or public.agency_has_permission(p_agency_id, 'agency.view_dashboard')
  ) then
    raise exception 'Forbidden';
  end if;

  select * into v_agency from public.agencies where id = p_agency_id;
  if not found then raise exception 'Ajans bulunamadi'; end if;
  select * into v_wallet from public.agency_wallets where agency_id = p_agency_id;

  return jsonb_build_object(
    'ok', true,
    'agency_id', p_agency_id,
    'status', v_agency.status,
    'trust_tier', v_agency.trust_tier,
    'is_coin_distributor', v_agency.is_coin_distributor,
    'earnings_penalty_pct', coalesce(v_agency.earnings_penalty_pct, 0),
    'gift_earn_disabled', coalesce(v_agency.gift_earn_disabled, false),
    'admin_note', v_agency.admin_note,
    'wallet_frozen', coalesce(v_wallet.is_frozen, false),
    'wallet_frozen_reason', v_wallet.frozen_reason,
    'locks', coalesce((
      select jsonb_object_agg(feature_key, locked)
      from public.agency_feature_locks
      where agency_id = p_agency_id
    ), '{}'::jsonb),
    'lock_details', coalesce((
      select jsonb_agg(jsonb_build_object(
        'feature_key', feature_key,
        'locked', locked,
        'reason', reason,
        'locked_at', locked_at
      ) order by feature_key)
      from public.agency_feature_locks
      where agency_id = p_agency_id and locked = true
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.ajans_ozellik_kilitleri(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: durum / trust / not
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_durum_ayarla(
  p_agency_id uuid,
  p_status text default null,
  p_trust_tier text default null,
  p_admin_note text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  update public.agencies set
    status = case
      when p_status in ('active', 'suspended', 'closed') then p_status
      else status
    end,
    trust_tier = case
      when p_trust_tier in ('A', 'B', 'C', 'Restricted', 'Suspended') then p_trust_tier
      else trust_tier
    end,
    admin_note = case when p_admin_note is null then admin_note else p_admin_note end,
    updated_at = now()
  where id = p_agency_id;

  if not found then raise exception 'Ajans bulunamadi'; end if;

  if p_status = 'suspended' or p_trust_tier in ('Restricted', 'Suspended') then
    insert into public.agency_sanctions (
      agency_id, kind, severity, title, reason, meta, created_by
    ) values (
      p_agency_id,
      'suspend',
      'high',
      'Ajans askıya / kısıtlandı',
      coalesce(nullif(trim(p_reason), ''), 'Admin yaptırımı'),
      jsonb_build_object('status', p_status, 'trust_tier', p_trust_tier),
      v_uid
    );
  end if;

  perform public.admin_audit_yaz(
    null,
    'agency_status',
    'Ajans durum güncellendi',
    jsonb_build_object(
      'agency_id', p_agency_id,
      'status', p_status,
      'trust_tier', p_trust_tier,
      'reason', p_reason
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_ajans_durum_ayarla(uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: özellik kilidi
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_ozellik_kilidi(
  p_agency_id uuid,
  p_feature_key text,
  p_locked boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if p_feature_key is null or length(trim(p_feature_key)) = 0 then
    raise exception 'feature_key gerekli';
  end if;

  insert into public.agency_feature_locks as l (
    agency_id, feature_key, locked, reason, locked_by, locked_at, updated_at
  ) values (
    p_agency_id,
    p_feature_key,
    coalesce(p_locked, true),
    nullif(trim(p_reason), ''),
    v_uid,
    now(),
    now()
  )
  on conflict (agency_id, feature_key) do update set
    locked = excluded.locked,
    reason = excluded.reason,
    locked_by = excluded.locked_by,
    locked_at = case when excluded.locked then now() else l.locked_at end,
    updated_at = now();

  if coalesce(p_locked, true) then
    insert into public.agency_sanctions (
      agency_id, kind, severity, title, reason, meta, created_by
    ) values (
      p_agency_id,
      'feature_lock',
      'medium',
      'Özellik kilitlendi: ' || p_feature_key,
      coalesce(nullif(trim(p_reason), ''), 'Admin kilit'),
      jsonb_build_object('feature_key', p_feature_key, 'locked', true),
      v_uid
    );
  end if;

  perform public.admin_audit_yaz(
    null,
    'agency_feature_lock',
    'Ajans özellik kilidi',
    jsonb_build_object(
      'agency_id', p_agency_id,
      'feature_key', p_feature_key,
      'locked', p_locked,
      'reason', p_reason
    )
  );

  return public.ajans_ozellik_kilitleri(p_agency_id);
end;
$$;

grant execute on function public.admin_ajans_ozellik_kilidi(uuid, text, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: cüzdan dondur
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_cuzdan_dondur(
  p_agency_id uuid,
  p_frozen boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  insert into public.agency_wallets (agency_id)
  values (p_agency_id)
  on conflict (agency_id) do nothing;

  update public.agency_wallets set
    is_frozen = coalesce(p_frozen, true),
    frozen_reason = case
      when coalesce(p_frozen, true) then nullif(trim(p_reason), '')
      else null
    end,
    frozen_at = case when coalesce(p_frozen, true) then now() else null end,
    frozen_by = case when coalesce(p_frozen, true) then v_uid else null end
  where agency_id = p_agency_id;

  if coalesce(p_frozen, true) then
    insert into public.agency_sanctions (
      agency_id, kind, severity, title, reason, meta, created_by
    ) values (
      p_agency_id,
      'wallet_freeze',
      'high',
      'Cüzdan donduruldu',
      coalesce(nullif(trim(p_reason), ''), 'Admin dondurma'),
      '{}'::jsonb,
      v_uid
    );
  end if;

  perform public.admin_audit_yaz(
    null,
    'agency_wallet_freeze',
    'Ajans cüzdan dondurma',
    jsonb_build_object('agency_id', p_agency_id, 'frozen', p_frozen, 'reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'frozen', coalesce(p_frozen, true));
end;
$$;

grant execute on function public.admin_ajans_cuzdan_dondur(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: kazanç cezası / hediye kapat
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_kazanc_cezasi(
  p_agency_id uuid,
  p_penalty_pct numeric default null,
  p_gift_earn_disabled boolean default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pct numeric;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  if p_penalty_pct is not null and (p_penalty_pct < 0 or p_penalty_pct > 100) then
    raise exception 'penalty_pct 0-100 olmali';
  end if;

  update public.agencies set
    earnings_penalty_pct = coalesce(p_penalty_pct, earnings_penalty_pct),
    gift_earn_disabled = coalesce(p_gift_earn_disabled, gift_earn_disabled),
    updated_at = now()
  where id = p_agency_id
  returning earnings_penalty_pct into v_pct;

  if not found then raise exception 'Ajans bulunamadi'; end if;

  if coalesce(p_penalty_pct, 0) > 0 or coalesce(p_gift_earn_disabled, false) then
    insert into public.agency_sanctions (
      agency_id, kind, severity, title, reason, meta, created_by
    ) values (
      p_agency_id,
      case when coalesce(p_gift_earn_disabled, false) then 'gift_disable' else 'earnings_cut' end,
      'high',
      'Kazanç yaptırımı',
      coalesce(nullif(trim(p_reason), ''), 'Admin kazanç cezası'),
      jsonb_build_object(
        'penalty_pct', v_pct,
        'gift_earn_disabled', p_gift_earn_disabled
      ),
      v_uid
    );
  end if;

  if coalesce(p_gift_earn_disabled, false) then
    insert into public.agency_feature_locks as l (
      agency_id, feature_key, locked, reason, locked_by, locked_at, updated_at
    ) values (
      p_agency_id, 'gift_earn', true,
      coalesce(nullif(trim(p_reason), ''), 'Hediye kazancı kapatıldı'),
      v_uid, now(), now()
    )
    on conflict (agency_id, feature_key) do update set
      locked = true,
      reason = excluded.reason,
      locked_by = excluded.locked_by,
      locked_at = now(),
      updated_at = now();
  elsif p_gift_earn_disabled = false then
    update public.agency_feature_locks
    set locked = false, updated_at = now()
    where agency_id = p_agency_id and feature_key = 'gift_earn';
  end if;

  perform public.admin_audit_yaz(
    null,
    'agency_earnings_penalty',
    'Ajans kazanç cezası',
    jsonb_build_object(
      'agency_id', p_agency_id,
      'penalty_pct', p_penalty_pct,
      'gift_earn_disabled', p_gift_earn_disabled,
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'ok', true,
    'earnings_penalty_pct', v_pct,
    'gift_earn_disabled', (
      select gift_earn_disabled from public.agencies where id = p_agency_id
    )
  );
end;
$$;

grant execute on function public.admin_ajans_kazanc_cezasi(uuid, numeric, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: coin cezası
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_coin_cezasi(
  p_agency_id uuid,
  p_coins bigint,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal bigint;
  v_delta bigint;
  v_row public.agency_wallet_ledger%rowtype;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if p_coins is null or p_coins <= 0 then raise exception 'coins > 0 olmali'; end if;

  insert into public.agency_wallets (agency_id)
  values (p_agency_id)
  on conflict (agency_id) do nothing;

  select coins into v_bal from public.agency_wallets
  where agency_id = p_agency_id for update;

  v_delta := least(coalesce(v_bal, 0), p_coins);
  if v_delta <= 0 then
    raise exception 'Ajans coin bakiyesi yetersiz';
  end if;

  v_row := public.ajans_cuzdan_hareket_yaz(
    p_agency_id,
    'coins',
    -v_delta,
    'admin_penalty',
    'admin_sanction',
    null,
    jsonb_build_object(
      'reason', coalesce(nullif(trim(p_reason), ''), 'Admin coin cezası'),
      'requested', p_coins,
      'by', v_uid
    )
  );

  insert into public.agency_sanctions (
    agency_id, kind, severity, title, reason, meta, created_by
  ) values (
    p_agency_id,
    'coin_penalty',
    'critical',
    'Coin cezası',
    coalesce(nullif(trim(p_reason), ''), 'Admin coin cezası'),
    jsonb_build_object('coins', v_delta, 'balance_after', v_row.balance_after),
    v_uid
  );

  perform public.admin_audit_yaz(
    null,
    'agency_coin_penalty',
    'Ajans coin cezası',
    jsonb_build_object('agency_id', p_agency_id, 'coins', v_delta, 'reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'balance_after', v_row.balance_after, 'deducted', v_delta);
end;
$$;

grant execute on function public.admin_ajans_coin_cezasi(uuid, bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: yaptırım listesi / kaldır
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_yaptirim_kaldir(
  p_sanction_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.agency_sanctions%rowtype;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  update public.agency_sanctions set
    is_active = false,
    lifted_by = v_uid,
    lifted_at = now(),
    lift_note = nullif(trim(p_note), '')
  where id = p_sanction_id
  returning * into v_row;

  if not found then raise exception 'Yaptirim bulunamadi'; end if;

  return jsonb_build_object('ok', true, 'sanction', row_to_json(v_row));
end;
$$;

grant execute on function public.admin_ajans_yaptirim_kaldir(uuid, text) to authenticated;

create or replace function public.admin_ajans_yaptirimlar(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select *
      from public.agency_sanctions
      where agency_id = p_agency_id
      order by created_at desc
      limit 100
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_ajans_yaptirimlar(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: satış / link / davet
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_satislari_liste(
  p_agency_id uuid,
  p_limit int default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        s.id,
        s.agency_id,
        s.sale_link_id,
        s.offer_id,
        s.buyer_id,
        s.buyer_label,
        s.package_title,
        s.liste_fiyat_try,
        s.amount_try,
        s.coins,
        s.selling_platform,
        s.payment_status,
        s.validation_status,
        s.invalid_reason,
        s.receipt_note,
        s.receipt_url,
        s.receipt_payload,
        s.buyer_email,
        coalesce(s.buyer_display_name, p.display_name) as buyer_display_name,
        p.username as buyer_username,
        s.stripe_session_id,
        s.stripe_payment_intent_id,
        s.created_at,
        s.updated_at
      from public.agency_tracked_sales s
      left join public.profiles p on p.id = s.buyer_id
      where s.agency_id = p_agency_id
      order by s.created_at desc
      limit least(coalesce(p_limit, 100), 300)
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_ajans_satislari_liste(uuid, int) to authenticated;

create or replace function public.admin_ajans_satis_linkleri_liste(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
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

grant execute on function public.admin_ajans_satis_linkleri_liste(uuid) to authenticated;

create or replace function public.admin_ajans_satis_linki_aktiflik(
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
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  update public.agency_sale_links set
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id and agency_id = p_agency_id
  returning * into v_row;

  if not found then raise exception 'Link bulunamadi'; end if;

  perform public.admin_audit_yaz(
    null,
    'agency_sale_link',
    'Admin satış linki aktiflik',
    jsonb_build_object('agency_id', p_agency_id, 'link_id', p_id, 'is_active', p_is_active)
  );

  return jsonb_build_object('ok', true, 'link', row_to_json(v_row));
end;
$$;

grant execute on function public.admin_ajans_satis_linki_aktiflik(uuid, uuid, boolean) to authenticated;

create or replace function public.admin_ajans_davet_listesi(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', i.id,
      'invite_code', i.invite_code,
      'expires_at', i.expires_at,
      'max_uses', i.max_uses,
      'used_count', i.used_count,
      'status', i.status,
      'label', i.label,
      'created_at', i.created_at
    ) order by i.created_at desc)
    from public.agency_invites i
    where i.agency_id = p_agency_id
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_ajans_davet_listesi(uuid) to authenticated;

create or replace function public.admin_ajans_davet_iptal(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  update public.agency_invites set status = 'revoked' where id = p_invite_id;
  if not found then raise exception 'Davet bulunamadi'; end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_ajans_davet_iptal(uuid) to authenticated;

create or replace function public.admin_ajans_operasyon_ozeti(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency jsonb;
  v_wallet jsonb;
  v_toplam_try numeric;
  v_toplam_coin bigint;
  v_adet int;
  v_top jsonb;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  select to_jsonb(a) into v_agency
  from public.agencies a where a.id = p_agency_id;
  if v_agency is null then raise exception 'Ajans bulunamadi'; end if;

  select to_jsonb(w) into v_wallet
  from public.agency_wallets w where w.agency_id = p_agency_id;

  select
    coalesce(sum(amount_try), 0),
    coalesce(sum(coins), 0)::bigint,
    count(*)::int
  into v_toplam_try, v_toplam_coin, v_adet
  from public.agency_tracked_sales
  where agency_id = p_agency_id
    and payment_status in ('paid', 'manual')
    and validation_status is distinct from 'invalid';

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_top
  from (
    select
      buyer_id,
      coalesce(
        nullif(max(buyer_display_name), ''),
        nullif(max(buyer_label), ''),
        nullif(max(buyer_email), ''),
        'Alıcı'
      ) as buyer_name,
      coalesce(sum(amount_try), 0) as toplam_try,
      coalesce(sum(coins), 0)::bigint as toplam_coin,
      count(*)::int as islem_adet
    from public.agency_tracked_sales
    where agency_id = p_agency_id
      and payment_status in ('paid', 'manual')
      and validation_status is distinct from 'invalid'
    group by buyer_id
    order by coalesce(sum(coins), 0) desc
    limit 20
  ) t;

  return jsonb_build_object(
    'ok', true,
    'agency', v_agency,
    'wallet', coalesce(v_wallet, '{}'::jsonb),
    'locks', public.ajans_ozellik_kilitleri(p_agency_id),
    'sales', public.admin_ajans_satislari_liste(p_agency_id, 80),
    'links', public.admin_ajans_satis_linkleri_liste(p_agency_id),
    'invites', public.admin_ajans_davet_listesi(p_agency_id),
    'sanctions', public.admin_ajans_yaptirimlar(p_agency_id),
    'top_buyers', coalesce(v_top, '[]'::jsonb),
    'ciro', jsonb_build_object(
      'toplam_try', v_toplam_try,
      'toplam_coin', v_toplam_coin,
      'islem_adet', v_adet
    )
  );
end;
$$;

grant execute on function public.admin_ajans_operasyon_ozeti(uuid) to authenticated;
