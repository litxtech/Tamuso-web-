-- =============================================================================
-- İşlem Hacmi (Transaction Volume) — projection over verified real-money IAP
-- Source of truth: coin_purchases + ai_music_purchases (+ admin adjustments)
-- NOT a second payment system. Projection failure must NOT fail entitlement.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Feature flags + kill switch (public display only)
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, description) values
  ('transaction_volume_enabled', true, 'İşlem Hacmi sistemi açık'),
  ('transaction_volume_profile_enabled', true, 'Profil kartı gösterimi'),
  ('transaction_volume_tiers_enabled', true, 'Kademe / rozet / çerçeve'),
  ('transaction_volume_leaderboard_enabled', true, 'İşlem Hacmi sıralaması'),
  ('transaction_volume_effects_enabled', true, 'Profil efektleri')
on conflict (key) do nothing;

insert into public.kill_switches (key, active, reason) values
  ('kill_transaction_volume_display', false, 'İşlem Hacmi public/social gösterimini kapat (veri silinmez)')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Eligibility (which categories count)
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_volume_eligibility (
  category text primary key
    check (category in ('coin_iap', 'ai_music_iap', 'stripe_coin', 'stripe_ai_music')),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  recalc_required boolean not null default false
);

insert into public.transaction_volume_eligibility (category, enabled) values
  ('coin_iap', true),
  ('ai_music_iap', true),
  ('stripe_coin', true),
  ('stripe_ai_music', true)
on conflict (category) do nothing;

alter table public.transaction_volume_eligibility enable row level security;
drop policy if exists "tv_eligibility_admin" on public.transaction_volume_eligibility;
create policy "tv_eligibility_admin"
  on public.transaction_volume_eligibility for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());
drop policy if exists "tv_eligibility_read" on public.transaction_volume_eligibility;
create policy "tv_eligibility_read"
  on public.transaction_volume_eligibility for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3) Tiers (admin-managed, not hardcoded in app)
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_volume_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  threshold_try numeric(14,2) not null check (threshold_try >= 0),
  display_label text not null,
  badge_key text,
  frame_key text,
  effect_key text,
  icon text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transaction_volume_tiers_threshold_uidx
  on public.transaction_volume_tiers (threshold_try)
  where is_active;

insert into public.transaction_volume_tiers
  (name, threshold_try, display_label, badge_key, frame_key, effect_key, icon, sort_order)
select * from (values
  ('Başlangıç', 5000::numeric,    '₺5K+',    'baslangic', null::text, null::text, 'diamond-outline', 10),
  ('Bronz',     10000::numeric,   '₺10K+',   'bronz',     null,       null,       'diamond-outline', 20),
  ('Gümüş',     25000::numeric,   '₺25K+',   'gumus',     'silver',   null,       'diamond', 30),
  ('Altın',     50000::numeric,   '₺50K+',   'altin',     'gold',     null,       'diamond', 40),
  ('Platin',    100000::numeric,  '₺100K+',  'platin',    'platin',   'glow',     'diamond', 50),
  ('Elmas',     250000::numeric,  '₺250K+',  'elmas',     'diamond',  'glow',     'diamond', 60),
  ('Royal',     500000::numeric,  '₺500K+',  'royal',     'royal',    'aura',     'diamond', 70),
  ('Legend',    1000000::numeric, '₺1M+',    'legend',    'legend',   'aura',     'diamond', 80)
) as v(name, threshold_try, display_label, badge_key, frame_key, effect_key, icon, sort_order)
where not exists (select 1 from public.transaction_volume_tiers limit 1);

alter table public.transaction_volume_tiers enable row level security;
drop policy if exists "tv_tiers_read" on public.transaction_volume_tiers;
create policy "tv_tiers_read"
  on public.transaction_volume_tiers for select to authenticated
  using (true);
drop policy if exists "tv_tiers_admin" on public.transaction_volume_tiers;
create policy "tv_tiers_admin"
  on public.transaction_volume_tiers for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- 4) User settings (visibility + display toggles)
-- Default: TIER_ONLY (safer public default)
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_volume_user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  visibility text not null default 'TIER_ONLY'
    check (visibility in ('FULL', 'TIER_ONLY', 'PRIVATE')),
  show_badge boolean not null default true,
  show_frame boolean not null default true,
  show_effect boolean not null default true,
  show_in_leaderboard boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.transaction_volume_user_settings enable row level security;
drop policy if exists "tv_settings_own" on public.transaction_volume_user_settings;
create policy "tv_settings_own"
  on public.transaction_volume_user_settings for all to authenticated
  using (auth.uid() = user_id or public.ben_admin_miyim())
  with check (auth.uid() = user_id or public.ben_admin_miyim());
-- Visitors may read visibility flags only via SECURITY DEFINER RPCs (no direct SELECT for others)
drop policy if exists "tv_settings_public_read" on public.transaction_volume_user_settings;

-- ---------------------------------------------------------------------------
-- 5) Contributions (idempotent projection ledger — NOT payment ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_volume_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null
    check (source_type in (
      'coin_iap', 'ai_music_iap', 'stripe_coin', 'stripe_ai_music', 'admin_adjustment'
    )),
  source_id uuid not null,
  provider_tx_id text,
  product_id text,
  platform text,
  original_amount numeric(14,2) not null,
  original_currency text not null default 'TRY',
  normalized_amount numeric(14,2) not null,
  normalized_currency text not null default 'TRY',
  conversion_method text not null default 'catalog_try'
    check (conversion_method in ('catalog_try', 'purchase_snapshot_try', 'admin_manual', 'none')),
  conversion_rate numeric(18,8),
  conversion_timestamp timestamptz,
  conversion_version text default 'v1',
  status text not null default 'ACTIVE'
    check (status in (
      'ACTIVE', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REVOKED', 'CHARGEBACK', 'VOID'
    )),
  net_normalized_amount numeric(14,2) not null,
  purchased_at timestamptz,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists tv_contrib_user_idx
  on public.transaction_volume_contributions (user_id, status);
create index if not exists tv_contrib_provider_tx_idx
  on public.transaction_volume_contributions (provider_tx_id)
  where provider_tx_id is not null;
create index if not exists tv_contrib_purchased_idx
  on public.transaction_volume_contributions (purchased_at desc);

alter table public.transaction_volume_contributions enable row level security;
-- No direct client SELECT of contributions (owner/admin via RPC only)
drop policy if exists "tv_contrib_admin" on public.transaction_volume_contributions;
create policy "tv_contrib_admin"
  on public.transaction_volume_contributions for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- 6) Adjustments (admin correction — never direct summary write)
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_volume_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_delta numeric(14,2) not null,
  currency text not null default 'TRY',
  reason text not null check (length(trim(reason)) >= 3),
  admin_id uuid not null references public.profiles(id),
  contribution_id uuid references public.transaction_volume_contributions(id),
  created_at timestamptz not null default now()
);

alter table public.transaction_volume_adjustments enable row level security;
drop policy if exists "tv_adj_admin" on public.transaction_volume_adjustments;
create policy "tv_adj_admin"
  on public.transaction_volume_adjustments for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- 7) Aggregate summary (cached; rebuildable)
-- ---------------------------------------------------------------------------
create table if not exists public.user_transaction_volume_summary (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  eligible_volume numeric(14,2) not null default 0,
  normalized_currency text not null default 'TRY',
  current_tier_id uuid references public.transaction_volume_tiers(id) on delete set null,
  eligible_purchase_count integer not null default 0,
  last_calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tv_summary_volume_idx
  on public.user_transaction_volume_summary (eligible_volume desc);

alter table public.user_transaction_volume_summary enable row level security;
-- Raw summary not readable by other users; RPC projects privacy-safe payload
drop policy if exists "tv_summary_own" on public.user_transaction_volume_summary;
create policy "tv_summary_own"
  on public.user_transaction_volume_summary for select to authenticated
  using (auth.uid() = user_id or public.ben_admin_miyim());
drop policy if exists "tv_summary_admin_write" on public.user_transaction_volume_summary;
create policy "tv_summary_admin_write"
  on public.user_transaction_volume_summary for all to authenticated
  using (public.ben_admin_miyim())
  with check (public.ben_admin_miyim());

do $$
begin
  alter publication supabase_realtime add table public.user_transaction_volume_summary;
exception when duplicate_object then null;
end $$;
alter table public.user_transaction_volume_summary replica identity full;

-- ---------------------------------------------------------------------------
-- 8) Audit log
-- ---------------------------------------------------------------------------
create table if not exists public.transaction_volume_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  old_volume numeric(14,2),
  new_volume numeric(14,2),
  old_tier_id uuid,
  new_tier_id uuid,
  source_type text,
  source_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists tv_audit_user_idx
  on public.transaction_volume_audit (user_id, created_at desc);

alter table public.transaction_volume_audit enable row level security;
drop policy if exists "tv_audit_admin" on public.transaction_volume_audit;
create policy "tv_audit_admin"
  on public.transaction_volume_audit for select to authenticated
  using (public.ben_admin_miyim());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.tv_feature_on(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select enabled from public.feature_flags where key = p_key), false)
    and not coalesce((select active from public.kill_switches where key = 'kill_transaction_volume_display'), false);
$$;

create or replace function public.tv_eligibility_on(p_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select enabled from public.transaction_volume_eligibility where category = p_category),
    false
  );
$$;

create or replace function public.tv_ensure_settings(p_user_id uuid)
returns public.transaction_volume_user_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.transaction_volume_user_settings%rowtype;
begin
  insert into public.transaction_volume_user_settings (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  select * into v_row from public.transaction_volume_user_settings where user_id = p_user_id;
  return v_row;
end;
$$;

create or replace function public.tv_resolve_tier(p_volume numeric)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.transaction_volume_tiers t
  where t.is_active
    and t.threshold_try <= coalesce(p_volume, 0)
  order by t.threshold_try desc
  limit 1;
$$;

create or replace function public.tv_recalc_user(p_user_id uuid)
returns public.user_transaction_volume_summary
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vol numeric(14,2);
  v_cnt int;
  v_tier uuid;
  v_old public.user_transaction_volume_summary%rowtype;
  v_new public.user_transaction_volume_summary%rowtype;
begin
  select
    coalesce(sum(c.net_normalized_amount), 0),
    count(*) filter (where c.source_type <> 'admin_adjustment' and c.status = 'ACTIVE')
  into v_vol, v_cnt
  from public.transaction_volume_contributions c
  where c.user_id = p_user_id
    and c.status in ('ACTIVE', 'PARTIALLY_REFUNDED');

  v_tier := public.tv_resolve_tier(v_vol);

  select * into v_old from public.user_transaction_volume_summary where user_id = p_user_id;

  insert into public.user_transaction_volume_summary as s (
    user_id, eligible_volume, normalized_currency, current_tier_id,
    eligible_purchase_count, last_calculated_at, updated_at
  ) values (
    p_user_id, v_vol, 'TRY', v_tier, v_cnt, now(), now()
  )
  on conflict (user_id) do update set
    eligible_volume = excluded.eligible_volume,
    current_tier_id = excluded.current_tier_id,
    eligible_purchase_count = excluded.eligible_purchase_count,
    last_calculated_at = now(),
    updated_at = now()
  returning * into v_new;

  if v_old.user_id is null
     or v_old.eligible_volume is distinct from v_new.eligible_volume
     or v_old.current_tier_id is distinct from v_new.current_tier_id then
    insert into public.transaction_volume_audit (
      user_id, event_type, old_volume, new_volume, old_tier_id, new_tier_id
    ) values (
      p_user_id, 'recalc',
      v_old.eligible_volume, v_new.eligible_volume,
      v_old.current_tier_id, v_new.current_tier_id
    );
  end if;

  return v_new;
end;
$$;

create or replace function public.tv_upsert_contribution(
  p_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_provider_tx_id text,
  p_product_id text,
  p_platform text,
  p_original_amount numeric,
  p_original_currency text,
  p_normalized_amount numeric,
  p_conversion_method text,
  p_status text,
  p_net_amount numeric,
  p_purchased_at timestamptz,
  p_verified_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null or p_source_id is null then
    return null;
  end if;
  if coalesce(p_normalized_amount, 0) = 0 and p_status = 'ACTIVE' then
    return null;
  end if;

  insert into public.transaction_volume_contributions (
    user_id, source_type, source_id, provider_tx_id, product_id, platform,
    original_amount, original_currency, normalized_amount, normalized_currency,
    conversion_method, conversion_timestamp, conversion_version,
    status, net_normalized_amount, purchased_at, verified_at, metadata, updated_at
  ) values (
    p_user_id, p_source_type, p_source_id, p_provider_tx_id, p_product_id, p_platform,
    p_original_amount, coalesce(p_original_currency, 'TRY'),
    p_normalized_amount, 'TRY',
    coalesce(p_conversion_method, 'catalog_try'), now(), 'v1',
    coalesce(p_status, 'ACTIVE'), coalesce(p_net_amount, p_normalized_amount),
    p_purchased_at, p_verified_at, coalesce(p_metadata, '{}'::jsonb), now()
  )
  on conflict (source_type, source_id) do update set
    status = excluded.status,
    net_normalized_amount = excluded.net_normalized_amount,
    normalized_amount = excluded.normalized_amount,
    original_amount = excluded.original_amount,
    provider_tx_id = coalesce(excluded.provider_tx_id, transaction_volume_contributions.provider_tx_id),
    metadata = transaction_volume_contributions.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_id;

  perform public.tv_recalc_user(p_user_id);
  return v_id;
exception when others then
  -- Never fail entitlement path
  insert into public.transaction_volume_audit (user_id, event_type, payload)
  values (p_user_id, 'projection_error', jsonb_build_object(
    'source_type', p_source_type,
    'source_id', p_source_id,
    'err', SQLERRM
  ));
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Apply from coin_purchases
-- ---------------------------------------------------------------------------
create or replace function public.tv_apply_coin_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.coin_purchases%rowtype;
  v_pkg public.coin_packages%rowtype;
  v_amt numeric(14,2);
  v_cat text;
  v_src text;
  v_status text;
  v_net numeric(14,2);
begin
  select * into r from public.coin_purchases where id = p_purchase_id;
  if not found then return; end if;

  -- Exclude free / manual / admin / unverified
  if lower(coalesce(r.store, '')) in ('manual', 'admin') then return; end if;
  if lower(coalesce(r.provider, '')) in ('manual', 'admin') then return; end if;
  if r.status not in ('completed', 'refunded') then return; end if;

  if lower(coalesce(r.provider, '')) = 'stripe'
     or lower(coalesce(r.store, '')) = 'stripe' then
    v_cat := 'stripe_coin';
    v_src := 'stripe_coin';
  else
    v_cat := 'coin_iap';
    v_src := 'coin_iap';
  end if;

  if not public.tv_eligibility_on(v_cat) then return; end if;

  select * into v_pkg from public.coin_packages where id = r.package_id;
  v_amt := coalesce(nullif(r.amount_try, 0), v_pkg.price_try, 0);
  if v_amt <= 0 then return; end if;

  if r.status = 'completed' then
    v_status := 'ACTIVE';
    v_net := v_amt;
  else
    v_status := 'REFUNDED';
    v_net := 0;
  end if;

  perform public.tv_upsert_contribution(
    r.user_id, v_src, r.id, r.provider_tx_id,
    coalesce(v_pkg.apple_product_id, v_pkg.google_product_id, v_pkg.sku),
    coalesce(r.store, r.provider),
    v_amt, 'TRY', v_amt,
    case when r.amount_try is not null and r.amount_try > 0
      then 'purchase_snapshot_try' else 'catalog_try' end,
    v_status, v_net,
    r.created_at, r.verified_at,
    jsonb_build_object('coins_added', r.coins_added, 'provider', r.provider)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Apply from ai_music_purchases
-- ---------------------------------------------------------------------------
create or replace function public.tv_apply_ai_music_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.ai_music_purchases%rowtype;
  v_prod public.ai_music_products%rowtype;
  v_amt numeric(14,2);
  v_cat text;
  v_src text;
begin
  select * into r from public.ai_music_purchases where id = p_purchase_id;
  if not found then return; end if;
  if r.status <> 'CREDITED' then return; end if;
  if lower(coalesce(r.store, '')) in ('manual', 'admin', 'welcome') then return; end if;

  if lower(coalesce(r.store, '')) = 'stripe' then
    v_cat := 'stripe_ai_music';
    v_src := 'stripe_ai_music';
  else
    v_cat := 'ai_music_iap';
    v_src := 'ai_music_iap';
  end if;
  if not public.tv_eligibility_on(v_cat) then return; end if;

  select * into v_prod from public.ai_music_products where product_id = r.product_id;
  v_amt := coalesce(nullif(r.amount_try, 0), v_prod.price_try, 0);
  if v_amt <= 0 then return; end if;

  perform public.tv_upsert_contribution(
    r.user_id, v_src, r.id, r.transaction_id,
    r.product_id, r.store,
    v_amt, 'TRY', v_amt,
    case when r.amount_try is not null and r.amount_try > 0
      then 'purchase_snapshot_try' else 'catalog_try' end,
    'ACTIVE', v_amt,
    r.created_at, r.credited_at,
    jsonb_build_object('seconds', r.seconds_snapshot)
  );
end;
$$;

-- Triggers: swallow errors so entitlement never rolls back
create or replace function public.trg_tv_coin_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and OLD.status is distinct from NEW.status) then
      perform public.tv_apply_coin_purchase(NEW.id);
    end if;
  exception when others then
    insert into public.transaction_volume_audit (user_id, event_type, payload)
    values (NEW.user_id, 'trigger_error', jsonb_build_object('fn','coin', 'err', SQLERRM));
  end;
  return NEW;
end;
$$;

drop trigger if exists tv_coin_purchase_trg on public.coin_purchases;
create trigger tv_coin_purchase_trg
  after insert or update of status on public.coin_purchases
  for each row execute function public.trg_tv_coin_purchase();

create or replace function public.trg_tv_ai_music_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if NEW.status = 'CREDITED' and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
      perform public.tv_apply_ai_music_purchase(NEW.id);
    end if;
  exception when others then
    insert into public.transaction_volume_audit (user_id, event_type, payload)
    values (NEW.user_id, 'trigger_error', jsonb_build_object('fn','ai_music', 'err', SQLERRM));
  end;
  return NEW;
end;
$$;

drop trigger if exists tv_ai_music_purchase_trg on public.ai_music_purchases;
create trigger tv_ai_music_purchase_trg
  after insert or update of status on public.ai_music_purchases
  for each row execute function public.trg_tv_ai_music_purchase();

-- ---------------------------------------------------------------------------
-- Privacy-safe payload builders
-- ---------------------------------------------------------------------------
create or replace function public.tv_tier_json(p_tier_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when p_tier_id is null then null else jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'display_label', t.display_label,
    'threshold_try', t.threshold_try,
    'badge_key', t.badge_key,
    'frame_key', t.frame_key,
    'effect_key', t.effect_key,
    'icon', t.icon
  ) end
  from public.transaction_volume_tiers t
  where t.id = p_tier_id;
$$;

create or replace function public.tv_next_tier_json(p_volume numeric)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'display_label', t.display_label,
    'threshold_try', t.threshold_try
  )
  from public.transaction_volume_tiers t
  where t.is_active and t.threshold_try > coalesce(p_volume, 0)
  order by t.threshold_try asc
  limit 1;
$$;

create or replace function public.get_my_transaction_volume()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sum public.user_transaction_volume_summary%rowtype;
  v_set public.transaction_volume_user_settings%rowtype;
  v_next jsonb;
  v_remain numeric;
  v_progress numeric;
  v_thr numeric;
  v_cur_thr numeric := 0;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.tv_feature_on('transaction_volume_enabled') then
    return jsonb_build_object('enabled', false);
  end if;

  v_set := public.tv_ensure_settings(v_uid);
  select * into v_sum from public.user_transaction_volume_summary where user_id = v_uid;
  if not found then
    v_sum := public.tv_recalc_user(v_uid);
  end if;

  v_next := public.tv_next_tier_json(v_sum.eligible_volume);
  if v_next is not null then
    v_thr := (v_next->>'threshold_try')::numeric;
    select coalesce(threshold_try, 0) into v_cur_thr
    from public.transaction_volume_tiers where id = v_sum.current_tier_id;
    v_remain := greatest(v_thr - v_sum.eligible_volume, 0);
    if v_thr > v_cur_thr then
      v_progress := least(1, greatest(0,
        (v_sum.eligible_volume - v_cur_thr) / nullif(v_thr - v_cur_thr, 0)
      ));
    else
      v_progress := 0;
    end if;
  else
    v_remain := 0;
    v_progress := 1;
  end if;

  return jsonb_build_object(
    'enabled', true,
    'is_owner', true,
    'visibility', v_set.visibility,
    'amount_try', v_sum.eligible_volume,
    'display_label', null,
    'currency', 'TRY',
    'tier', public.tv_tier_json(v_sum.current_tier_id),
    'next_tier', v_next,
    'remaining_try', v_remain,
    'progress_01', coalesce(v_progress, 0),
    'eligible_purchase_count', v_sum.eligible_purchase_count,
    'show_badge', v_set.show_badge,
    'show_frame', v_set.show_frame,
    'show_effect', v_set.show_effect and public.tv_feature_on('transaction_volume_effects_enabled'),
    'show_in_leaderboard', v_set.show_in_leaderboard,
    'hidden_from_others', v_set.visibility = 'PRIVATE',
    'profile_enabled', public.tv_feature_on('transaction_volume_profile_enabled'),
    'tiers_enabled', public.tv_feature_on('transaction_volume_tiers_enabled')
  );
end;
$$;

create or replace function public.get_public_transaction_volume(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sum public.user_transaction_volume_summary%rowtype;
  v_set public.transaction_volume_user_settings%rowtype;
  v_tier jsonb;
  v_is_owner boolean;
  v_admin boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_user_id is null then raise exception 'user required'; end if;

  if not public.tv_feature_on('transaction_volume_enabled')
     or not public.tv_feature_on('transaction_volume_profile_enabled') then
    return jsonb_build_object('enabled', false, 'visible', false);
  end if;

  v_is_owner := (v_uid = p_user_id);
  v_admin := public.ben_admin_miyim();
  v_set := public.tv_ensure_settings(p_user_id);
  select * into v_sum from public.user_transaction_volume_summary where user_id = p_user_id;

  if v_is_owner then
    return public.get_my_transaction_volume();
  end if;

  -- Admin internal: exact amount allowed
  if v_admin then
    return jsonb_build_object(
      'enabled', true,
      'visible', true,
      'is_owner', false,
      'is_admin_view', true,
      'visibility', v_set.visibility,
      'amount_try', coalesce(v_sum.eligible_volume, 0),
      'display_label', coalesce((public.tv_tier_json(v_sum.current_tier_id))->>'display_label', null),
      'currency', 'TRY',
      'tier', public.tv_tier_json(v_sum.current_tier_id),
      'show_badge', v_set.show_badge,
      'show_frame', v_set.show_frame,
      'show_effect', v_set.show_effect
    );
  end if;

  if v_set.visibility = 'PRIVATE' then
    return jsonb_build_object(
      'enabled', true,
      'visible', false,
      'is_owner', false,
      'visibility', 'PRIVATE'
      -- amount_try intentionally omitted
    );
  end if;

  v_tier := public.tv_tier_json(v_sum.current_tier_id);

  if v_set.visibility = 'TIER_ONLY' then
    return jsonb_build_object(
      'enabled', true,
      'visible', true,
      'is_owner', false,
      'visibility', 'TIER_ONLY',
      -- amount_try omitted on purpose
      'display_label', coalesce(v_tier->>'display_label', '—'),
      'currency', 'TRY',
      'tier', case when v_set.show_badge then v_tier else null end,
      'show_badge', v_set.show_badge,
      'show_frame', v_set.show_frame,
      'show_effect', v_set.show_effect and public.tv_feature_on('transaction_volume_effects_enabled')
    );
  end if;

  -- FULL
  return jsonb_build_object(
    'enabled', true,
    'visible', true,
    'is_owner', false,
    'visibility', 'FULL',
    'amount_try', coalesce(v_sum.eligible_volume, 0),
    'display_label', null,
    'currency', 'TRY',
    'tier', case when v_set.show_badge then v_tier else null end,
    'show_badge', v_set.show_badge,
    'show_frame', v_set.show_frame,
    'show_effect', v_set.show_effect and public.tv_feature_on('transaction_volume_effects_enabled')
  );
end;
$$;

create or replace function public.set_transaction_volume_settings(
  p_visibility text default null,
  p_show_badge boolean default null,
  p_show_frame boolean default null,
  p_show_effect boolean default null,
  p_show_in_leaderboard boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.transaction_volume_user_settings%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_visibility is not null and p_visibility not in ('FULL','TIER_ONLY','PRIVATE') then
    raise exception 'Invalid visibility';
  end if;
  perform public.tv_ensure_settings(v_uid);

  update public.transaction_volume_user_settings set
    visibility = coalesce(p_visibility, visibility),
    show_badge = coalesce(p_show_badge, show_badge),
    show_frame = coalesce(p_show_frame, show_frame),
    show_effect = coalesce(p_show_effect, show_effect),
    show_in_leaderboard = coalesce(p_show_in_leaderboard, show_in_leaderboard),
    updated_at = now()
  where user_id = v_uid
  returning * into v_row;

  insert into public.transaction_volume_audit (user_id, actor_id, event_type, payload)
  values (v_uid, v_uid, 'privacy_change', to_jsonb(v_row));

  return jsonb_build_object('ok', true, 'settings', to_jsonb(v_row));
end;
$$;

create or replace function public.transaction_volume_leaderboard(p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_lim int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.tv_feature_on('transaction_volume_enabled')
     or not public.tv_feature_on('transaction_volume_leaderboard_enabled') then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.rank_pos)
    from (
      select
        row_number() over (order by s.eligible_volume desc) as rank_pos,
        p.id as user_id,
        coalesce(p.display_name, p.username, 'Kullanıcı') as display_name,
        p.username,
        p.avatar_url,
        p.public_user_id,
        coalesce(p.is_verified, false) as is_verified,
        case
          when st.visibility = 'FULL' then s.eligible_volume
          else null
        end as amount_try,
        case
          when st.visibility = 'FULL' then null
          else coalesce(ti.display_label, '—')
        end as display_label,
        st.visibility,
        public.tv_tier_json(s.current_tier_id) as tier
      from public.user_transaction_volume_summary s
      join public.profiles p on p.id = s.user_id
      join public.transaction_volume_user_settings st on st.user_id = s.user_id
      left join public.transaction_volume_tiers ti on ti.id = s.current_tier_id
      where st.show_in_leaderboard
        and st.visibility <> 'PRIVATE'
        and p.deleted_at is null
        and p.banned_at is null
        and s.eligible_volume > 0
      order by s.eligible_volume desc
      limit v_lim
    ) t
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_transaction_volume_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today numeric;
  v_week numeric;
  v_month numeric;
  v_all numeric;
  v_users int;
  v_refunds numeric;
  v_tiers jsonb;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  select coalesce(sum(net_normalized_amount),0) into v_all
  from public.transaction_volume_contributions
  where status in ('ACTIVE','PARTIALLY_REFUNDED');

  select coalesce(sum(net_normalized_amount),0) into v_today
  from public.transaction_volume_contributions
  where status in ('ACTIVE','PARTIALLY_REFUNDED')
    and coalesce(verified_at, purchased_at, created_at) >= date_trunc('day', now());

  select coalesce(sum(net_normalized_amount),0) into v_week
  from public.transaction_volume_contributions
  where status in ('ACTIVE','PARTIALLY_REFUNDED')
    and coalesce(verified_at, purchased_at, created_at) >= date_trunc('week', now());

  select coalesce(sum(net_normalized_amount),0) into v_month
  from public.transaction_volume_contributions
  where status in ('ACTIVE','PARTIALLY_REFUNDED')
    and coalesce(verified_at, purchased_at, created_at) >= date_trunc('month', now());

  select count(*) into v_users
  from public.user_transaction_volume_summary where eligible_volume > 0;

  select coalesce(sum(normalized_amount - net_normalized_amount),0) into v_refunds
  from public.transaction_volume_contributions
  where status in ('REFUNDED','PARTIALLY_REFUNDED','REVOKED','CHARGEBACK');

  select coalesce(jsonb_agg(jsonb_build_object(
    'tier_id', t.id, 'name', t.name, 'display_label', t.display_label,
    'threshold_try', t.threshold_try, 'user_count', coalesce(c.cnt, 0)
  ) order by t.sort_order), '[]'::jsonb)
  into v_tiers
  from public.transaction_volume_tiers t
  left join (
    select current_tier_id, count(*) as cnt
    from public.user_transaction_volume_summary
    group by current_tier_id
  ) c on c.current_tier_id = t.id
  where t.is_active;

  return jsonb_build_object(
    'ok', true,
    'total_volume_try', v_all,
    'today_try', v_today,
    'week_try', v_week,
    'month_try', v_month,
    'active_users', v_users,
    'refund_adjustments_try', v_refunds,
    'tier_distribution', v_tiers,
    'generated_at', now()
  );
end;
$$;

create or replace function public.admin_transaction_volume_tiers_list()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.sort_order, t.threshold_try)
    from public.transaction_volume_tiers t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_transaction_volume_tier_upsert(
  p_id uuid default null,
  p_name text default null,
  p_threshold_try numeric default null,
  p_display_label text default null,
  p_badge_key text default null,
  p_frame_key text default null,
  p_effect_key text default null,
  p_icon text default null,
  p_is_active boolean default true,
  p_sort_order integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_name is null or p_threshold_try is null or p_display_label is null then
    raise exception 'name, threshold, label required';
  end if;

  if p_id is null then
    insert into public.transaction_volume_tiers (
      name, threshold_try, display_label, badge_key, frame_key, effect_key, icon, is_active, sort_order
    ) values (
      p_name, p_threshold_try, p_display_label, p_badge_key, p_frame_key, p_effect_key, p_icon,
      coalesce(p_is_active, true), coalesce(p_sort_order, 0)
    ) returning id into v_id;
  else
    update public.transaction_volume_tiers set
      name = p_name,
      threshold_try = p_threshold_try,
      display_label = p_display_label,
      badge_key = p_badge_key,
      frame_key = p_frame_key,
      effect_key = p_effect_key,
      icon = p_icon,
      is_active = coalesce(p_is_active, is_active),
      sort_order = coalesce(p_sort_order, sort_order),
      updated_at = now()
    where id = p_id
    returning id into v_id;
  end if;

  insert into public.transaction_volume_audit (actor_id, event_type, payload)
  values (auth.uid(), 'tier_upsert', jsonb_build_object('tier_id', v_id));

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.admin_transaction_volume_adjust(
  p_user_id uuid,
  p_amount_delta numeric,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adj_id uuid;
  v_contrib uuid;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_user_id is null then raise exception 'user required'; end if;
  if p_amount_delta is null or p_amount_delta = 0 then raise exception 'amount required'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'reason required'; end if;

  insert into public.transaction_volume_adjustments (
    user_id, amount_delta, reason, admin_id
  ) values (
    p_user_id, p_amount_delta, trim(p_reason), auth.uid()
  ) returning id into v_adj_id;

  v_contrib := public.tv_upsert_contribution(
    p_user_id, 'admin_adjustment', v_adj_id, null, null, 'admin',
    p_amount_delta, 'TRY', p_amount_delta, 'admin_manual',
    'ACTIVE', p_amount_delta, now(), now(),
    jsonb_build_object('reason', trim(p_reason), 'admin_id', auth.uid(), 'is_purchase', false)
  );

  update public.transaction_volume_adjustments
  set contribution_id = v_contrib where id = v_adj_id;

  insert into public.transaction_volume_audit (
    user_id, actor_id, event_type, payload
  ) values (
    p_user_id, auth.uid(), 'manual_adjustment',
    jsonb_build_object('adjustment_id', v_adj_id, 'delta', p_amount_delta, 'reason', p_reason)
  );

  return jsonb_build_object('ok', true, 'adjustment_id', v_adj_id);
end;
$$;

create or replace function public.admin_transaction_volume_recalculate(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_n int := 0;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  if p_user_id is not null then
    delete from public.transaction_volume_contributions
    where user_id = p_user_id and source_type <> 'admin_adjustment';

    for r in
      select id from public.coin_purchases where user_id = p_user_id
    loop
      perform public.tv_apply_coin_purchase(r.id);
      v_n := v_n + 1;
    end loop;
    for r in
      select id from public.ai_music_purchases where user_id = p_user_id
    loop
      perform public.tv_apply_ai_music_purchase(r.id);
      v_n := v_n + 1;
    end loop;
    perform public.tv_recalc_user(p_user_id);
  else
    delete from public.transaction_volume_contributions
    where source_type <> 'admin_adjustment';

    for r in select id from public.coin_purchases loop
      perform public.tv_apply_coin_purchase(r.id);
      v_n := v_n + 1;
    end loop;
    for r in select id from public.ai_music_purchases loop
      perform public.tv_apply_ai_music_purchase(r.id);
      v_n := v_n + 1;
    end loop;
    for r in
      select distinct user_id as uid from public.transaction_volume_contributions
    loop
      perform public.tv_recalc_user(r.uid);
    end loop;
  end if;

  update public.transaction_volume_eligibility set recalc_required = false, updated_at = now();

  insert into public.transaction_volume_audit (actor_id, event_type, payload)
  values (auth.uid(), 'recalculate', jsonb_build_object('user_id', p_user_id, 'touched', v_n));

  return jsonb_build_object('ok', true, 'touched', v_n);
end;
$$;

create or replace function public.admin_transaction_volume_eligibility_get()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(e) order by e.category)
    from public.transaction_volume_eligibility e
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_transaction_volume_eligibility_set(
  p_category text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  update public.transaction_volume_eligibility set
    enabled = p_enabled,
    recalc_required = true,
    updated_at = now(),
    updated_by = auth.uid()
  where category = p_category;
  if not found then raise exception 'Unknown category'; end if;
  return jsonb_build_object('ok', true, 'recalculation_required', true);
end;
$$;

-- Grants
grant execute on function public.get_my_transaction_volume() to authenticated;
grant execute on function public.get_public_transaction_volume(uuid) to authenticated;
grant execute on function public.set_transaction_volume_settings(text, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.transaction_volume_leaderboard(int) to authenticated;
grant execute on function public.admin_transaction_volume_dashboard() to authenticated;
grant execute on function public.admin_transaction_volume_tiers_list() to authenticated;
grant execute on function public.admin_transaction_volume_tier_upsert(uuid, text, numeric, text, text, text, text, text, boolean, integer) to authenticated;
grant execute on function public.admin_transaction_volume_adjust(uuid, numeric, text) to authenticated;
grant execute on function public.admin_transaction_volume_recalculate(uuid) to authenticated;
grant execute on function public.admin_transaction_volume_eligibility_get() to authenticated;
grant execute on function public.admin_transaction_volume_eligibility_set(text, boolean) to authenticated;

-- Backfill existing verified purchases (idempotent)
do $$
declare
  r record;
begin
  for r in
    select id from public.coin_purchases
    where status in ('completed', 'refunded')
  loop
    perform public.tv_apply_coin_purchase(r.id);
  end loop;
  for r in
    select id from public.ai_music_purchases where status = 'CREDITED'
  loop
    perform public.tv_apply_ai_music_purchase(r.id);
  end loop;
end $$;
