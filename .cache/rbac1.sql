-- =============================================================================
-- Admin RBAC V2 (Faz 1): catalog, roles, accounts, overrides, audit, resolver
-- Mevcut admin_staff_roles / admin_role_permissions korunur ve genisletilir.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Catalog
-- ---------------------------------------------------------------------------
create table if not exists public.admin_permission_catalog (
  permission_key text primary key,
  label text not null,
  description text not null default '',
  category text not null,
  risk text not null default 'LOW'
    check (risk in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  module_href text,
  sort_order int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists admin_permission_catalog_category_idx
  on public.admin_permission_catalog (category, sort_order);

-- ---------------------------------------------------------------------------
-- 2) Roles
-- ---------------------------------------------------------------------------
create table if not exists public.admin_roles (
  role_code text primary key,
  name text not null,
  description text not null default '',
  is_system boolean not null default false,
  is_super boolean not null default false,
  sort_order int not null default 100,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.admin_roles (role_code, name, description, is_system, is_super, sort_order) values
  ('SUPER_ADMIN', 'Super Admin', 'Tum yetkiler', true, true, 1),
  ('FINANCE_ADMIN', 'Finance Admin', 'Finans ve cuzdan', true, false, 10),
  ('AGENCY_ADMIN', 'Agency Admin', 'Ajans operasyon', true, false, 20),
  ('MODERATION_ADMIN', 'Moderation Admin', 'Moderasyon ve guvenlik', true, false, 30),
  ('SUPPORT_ADMIN', 'Support Admin', 'Destek', true, false, 40),
  ('CONTENT_ADMIN', 'Content Admin', 'Icerik ve CMS', true, false, 50),
  ('GAME_ADMIN', 'Game Admin', 'Oyun yonetimi', true, false, 60),
  ('ANALYTICS_ADMIN', 'Analytics Admin', 'Rapor ve analitik (salt okunur agirlikli)', true, false, 70),
  ('READ_ONLY_ADMIN', 'Read Only Admin', 'Sadece goruntuleme', true, false, 80),
  -- legacy codes
  ('SUPPORT', 'Support (legacy)', 'Eski destek rolu', true, false, 140),
  ('AGENCY_MANAGER', 'Agency Manager (legacy)', 'Eski ajans rolu', true, false, 150),
  ('VERIFICATION_REVIEWER', 'Verification Reviewer', 'Dogrulama inceleme', true, false, 160),
  ('FINANCE', 'Finance (legacy)', 'Eski finans rolu', true, false, 170),
  ('COMPLIANCE', 'Compliance', 'Uyumluluk', true, false, 180)
on conflict (role_code) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system,
  is_super = excluded.is_super,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Drop restrictive check on admin_staff_roles.role_code
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'admin_staff_roles'
      and c.contype = 'c'
  loop
    execute format('alter table public.admin_staff_roles drop constraint %I', r.conname);
  end loop;
end $$;

-- Ensure staff role codes exist in admin_roles
insert into public.admin_roles (role_code, name, is_system, is_super, sort_order)
select distinct s.role_code, s.role_code, true, (s.role_code = 'SUPER_ADMIN'), 200
from public.admin_staff_roles s
where not exists (select 1 from public.admin_roles r where r.role_code = s.role_code)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3) Admin accounts
-- ---------------------------------------------------------------------------
create table if not exists public.admin_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'DISABLED')),
  phone text,
  primary_role_code text references public.admin_roles(role_code),
  last_login_at timestamptz,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_accounts_status_idx on public.admin_accounts (status);
create index if not exists admin_accounts_role_idx on public.admin_accounts (primary_role_code);

-- Seed accounts for existing is_admin users
insert into public.admin_accounts (user_id, status, primary_role_code, created_at)
select
  p.id,
  'ACTIVE',
  coalesce(
    (select r.role_code from public.admin_staff_roles r
     where r.user_id = p.id and r.role_code = 'SUPER_ADMIN' limit 1),
    (select r.role_code from public.admin_staff_roles r
     where r.user_id = p.id order by r.created_at asc limit 1),
    'SUPER_ADMIN'
  ),
  coalesce(p.created_at, now())
from public.profiles p
where coalesce(p.is_admin, false) = true
on conflict (user_id) do nothing;

-- Ensure SUPER_ADMIN staff role for all is_admin
insert into public.admin_staff_roles (user_id, role_code)
select p.id, 'SUPER_ADMIN'
from public.profiles p
where coalesce(p.is_admin, false) = true
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4) Overrides + permission audit
-- ---------------------------------------------------------------------------
create table if not exists public.admin_user_permission_overrides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_key text not null references public.admin_permission_catalog(permission_key) on delete cascade,
  effect text not null check (effect in ('ALLOW', 'DENY')),
  reason text,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create table if not exists public.admin_permission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  action text not null,
  old_permissions jsonb not null default '[]'::jsonb,
  new_permissions jsonb not null default '[]'::jsonb,
  added jsonb not null default '[]'::jsonb,
  removed jsonb not null default '[]'::jsonb,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_permission_audit_target_idx
  on public.admin_permission_audit_logs (target_user_id, created_at desc);
create index if not exists admin_permission_audit_actor_idx
  on public.admin_permission_audit_logs (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5) RLS ÔÇö no direct client access
-- ---------------------------------------------------------------------------
alter table public.admin_permission_catalog enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_accounts enable row level security;
alter table public.admin_user_permission_overrides enable row level security;
alter table public.admin_permission_audit_logs enable row level security;
alter table public.admin_staff_roles enable row level security;
alter table public.admin_role_permissions enable row level security;

drop policy if exists admin_permission_catalog_deny_all on public.admin_permission_catalog;
create policy admin_permission_catalog_deny_all
  on public.admin_permission_catalog for all to authenticated
  using (false) with check (false);

drop policy if exists admin_roles_deny_all on public.admin_roles;
create policy admin_roles_deny_all
  on public.admin_roles for all to authenticated
  using (false) with check (false);

drop policy if exists admin_accounts_deny_all on public.admin_accounts;
create policy admin_accounts_deny_all
  on public.admin_accounts for all to authenticated
  using (false) with check (false);

drop policy if exists admin_user_permission_overrides_deny_all on public.admin_user_permission_overrides;
create policy admin_user_permission_overrides_deny_all
  on public.admin_user_permission_overrides for all to authenticated
  using (false) with check (false);

drop policy if exists admin_permission_audit_logs_deny_all on public.admin_permission_audit_logs;
create policy admin_permission_audit_logs_deny_all
  on public.admin_permission_audit_logs for all to authenticated
  using (false) with check (false);

-- staff/role_permissions: ensure locked down (may already have policies)
drop policy if exists admin_staff_roles_deny_all on public.admin_staff_roles;
create policy admin_staff_roles_deny_all
  on public.admin_staff_roles for all to authenticated
  using (false) with check (false);

drop policy if exists admin_role_permissions_deny_all on public.admin_role_permissions;
create policy admin_role_permissions_deny_all
  on public.admin_role_permissions for all to authenticated
  using (false) with check (false);

revoke all on public.admin_permission_catalog from anon, authenticated;
revoke all on public.admin_roles from anon, authenticated;
revoke all on public.admin_accounts from anon, authenticated;
revoke all on public.admin_user_permission_overrides from anon, authenticated;
revoke all on public.admin_permission_audit_logs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Helpers
-- ---------------------------------------------------------------------------
create or replace function public.admin_is_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_staff_roles r
    join public.admin_roles ar on ar.role_code = r.role_code
    where r.user_id = p_user_id
      and ar.is_super = true
  )
  or exists (
    select 1
    from public.admin_accounts a
    join public.admin_roles ar on ar.role_code = a.primary_role_code
    where a.user_id = p_user_id
      and a.status = 'ACTIVE'
      and ar.is_super = true
  );
$$;

create or replace function public.admin_account_active(p_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text;
  v_is_admin boolean;
begin
  if p_user_id is null then return false; end if;

  select coalesce(is_admin, false) into v_is_admin
  from public.profiles where id = p_user_id;
  if not coalesce(v_is_admin, false) then
    return false;
  end if;

  select status into v_status
  from public.admin_accounts where user_id = p_user_id;

  -- Legacy: is_admin without account row ÔåÆ active
  if v_status is null then
    return true;
  end if;

  return v_status = 'ACTIVE';
end;
$$;

create or replace function public.admin_count_active_super_admins(p_exclude uuid default null)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct p.id)::bigint
  from public.profiles p
  where coalesce(p.is_admin, false) = true
    and coalesce(p.deleted_at, null) is null
    and (p_exclude is null or p.id <> p_exclude)
    and public.admin_is_super_admin(p.id)
    and public.admin_account_active(p.id);
$$;

-- Effective permission keys for a user (array)
create or replace function public.admin_effective_permission_keys(p_user_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_keys text[];
begin
  if p_user_id is null then return array[]::text[]; end if;
  if not public.admin_account_active(p_user_id) then return array[]::text[]; end if;

  if public.admin_is_super_admin(p_user_id) then
    select coalesce(array_agg(c.permission_key order by c.category, c.sort_order), array[]::text[])
    into v_keys
    from public.admin_permission_catalog c
    where c.is_active;
    return v_keys;
  end if;

  select coalesce(array_agg(x.permission_key order by x.permission_key), array[]::text[])
  into v_keys
  from (
    select distinct p.permission_code as permission_key
    from public.admin_staff_roles r
    join public.admin_role_permissions p on p.role_code = r.role_code
    where r.user_id = p_user_id
    union
    select o.permission_key
    from public.admin_user_permission_overrides o
    where o.user_id = p_user_id and o.effect = 'ALLOW'
  ) x
  where not exists (
    select 1 from public.admin_user_permission_overrides d
    where d.user_id = p_user_id
      and d.permission_key = x.permission_key
      and d.effect = 'DENY'
  )
  and exists (
    select 1 from public.admin_permission_catalog c
    where c.permission_key = x.permission_key and c.is_active
  );

  return coalesce(v_keys, array[]::text[]);
end;
$$;

-- Core resolver (replaces is_admin blanket bypass)
create or replace function public.admin_has_permission(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text := lower(trim(coalesce(p_permission, '')));
  v_effect text;
begin
  if v_uid is null then return false; end if;
  if v_key = '' then return false; end if;
  if not public.admin_account_active(v_uid) then return false; end if;

  -- SUPER ADMIN SYSTEM PROTECTION
  if public.admin_is_super_admin(v_uid) then
    return true;
  end if;

  -- EXPLICIT USER DENY
  select o.effect into v_effect
  from public.admin_user_permission_overrides o
  where o.user_id = v_uid and o.permission_key = v_key
  limit 1;

  if v_effect = 'DENY' then return false; end if;
  if v_effect = 'ALLOW' then return true; end if;

  -- ROLE PERMISSION
  if exists (
    select 1
    from public.admin_staff_roles r
    join public.admin_role_permissions p on p.role_code = r.role_code
    where r.user_id = v_uid and p.permission_code = v_key
  ) then
    return true;
  end if;

  -- Also check primary role on admin_accounts
  if exists (
    select 1
    from public.admin_accounts a
    join public.admin_role_permissions p on p.role_code = a.primary_role_code
    where a.user_id = v_uid and p.permission_code = v_key
  ) then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.admin_has_permission(text) to authenticated;
grant execute on function public.admin_is_super_admin(uuid) to authenticated;
grant execute on function public.admin_account_active(uuid) to authenticated;
grant execute on function public.admin_effective_permission_keys(uuid) to authenticated;

create or replace function public.admin_require_permission(p_permission text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission(p_permission) then
    raise exception 'Forbidden: missing permission %', p_permission
      using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Seed permission catalog (stable keys)
-- ---------------------------------------------------------------------------
insert into public.admin_permission_catalog
  (permission_key, label, description, category, risk, module_href, sort_order)
values
  -- ADMIN MANAGEMENT
  ('admin.management.view', 'Admin yonetimini gor', 'Admin listesi ve detay', 'ADMIN_MANAGEMENT', 'HIGH', '/admin/yonetim', 10),
  ('admin.admins.view', 'Adminleri gor', 'Admin kullanici listesi', 'ADMIN_MANAGEMENT', 'HIGH', '/admin/yonetim', 20),
  ('admin.admins.create', 'Admin olustur', 'Yeni admin hesabi', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 30),
  ('admin.admins.edit', 'Admin duzenle', 'Admin profil/rol', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 40),
  ('admin.admins.disable', 'Admin pasiflestir', 'Suspend/disable', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 50),
  ('admin.admins.delete', 'Admin sil', 'Admin yetkisini kaldir', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 60),
  ('admin.permissions.view', 'Izinleri gor', 'Permission detayi', 'ADMIN_MANAGEMENT', 'HIGH', '/admin/yonetim', 70),
  ('admin.permissions.edit', 'Izinleri duzenle', 'Override ve rol izinleri', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 80),
  ('admin.roles.create', 'Rol olustur', 'Custom rol', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 90),
  ('admin.roles.edit', 'Rol duzenle', 'Rol izinlerini degistir', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 100),
  ('admin.roles.delete', 'Rol sil', 'Custom rol sil', 'ADMIN_MANAGEMENT', 'CRITICAL', '/admin/yonetim', 110),
  ('admin.audit.view', 'Audit log gor', 'Permission audit', 'ADMIN_MANAGEMENT', 'HIGH', '/admin/yonetim', 120),

  -- DASHBOARD / APP
  ('dashboard.view', 'Dashboard gor', 'Admin hub ozeti', 'DASHBOARD', 'LOW', '/admin', 10),
  ('app.version.view', 'Surum ekrani', 'Surum ve guncelleme', 'APP_SETTINGS', 'LOW', '/admin/surum-guncelleme', 10),
  ('app.version.manage', 'Surum yonet', 'Zorunlu guncelleme ayarla', 'APP_SETTINGS', 'HIGH', '/admin/surum-guncelleme', 20),

  -- USERS
  ('users.view', 'Kullanicilari gor', 'Kullanici listesi', 'USERS', 'LOW', '/admin/kullanicilar', 10),
  ('users.search', 'Kullanici ara', 'Arama', 'USERS', 'LOW', '/admin/kullanicilar', 20),
  ('users.detail.view', 'Kullanici detay', 'Profil dosyasi', 'USERS', 'MEDIUM', '/admin/kullanicilar', 30),
  ('users.edit', 'Kullanici duzenle', 'Profil duzenleme', 'USERS', 'HIGH', '/admin/kullanicilar', 40),
  ('users.ban', 'Kullanici ban', 'Ban islemi', 'USERS', 'CRITICAL', '/admin/kullanicilar', 50),
  ('users.unban', 'Ban kaldir', 'Unban', 'USERS', 'HIGH', '/admin/kullanicilar', 60),
  ('users.suspend', 'Ask─▒ya al', 'Suspend', 'USERS', 'HIGH', '/admin/kullanicilar', 70),
  ('users.delete', 'Kullanici sil', 'Hesap silme', 'USERS', 'CRITICAL', '/admin/kullanicilar', 80),
  ('users.export', 'Kullanici export', 'CSV/export', 'USERS', 'HIGH', '/admin/kullanicilar', 90),
  ('users.finance.view', 'Kullanici finans', 'Bakiye/harcama', 'USERS', 'HIGH', '/admin/kullanicilar', 100),
  ('users.private.view', 'Ozel veri gor', 'Telefon/email vb', 'USERS', 'CRITICAL', '/admin/rehber', 110),
  ('users.admin_grant', 'Admin yetkisi ver', 'is_admin toggle', 'USERS', 'CRITICAL', '/admin/kullanicilar', 120),

  -- DIRECTORY
  ('directory.view', 'Rehber gor', 'Iletisim rehberi', 'DIRECTORY', 'HIGH', '/admin/rehber', 10),

  -- FINANCE
  ('finance.view', 'Finans gor', 'Finans dashboard', 'FINANCE', 'MEDIUM', '/admin/finans', 10),
  ('finance.revenue.view', 'Gelir gor', 'Ciro/revenue', 'FINANCE', 'MEDIUM', '/admin/ciro', 20),
  ('finance.expenses.view', 'Gider gor', 'Expenses', 'FINANCE', 'MEDIUM', '/admin/finans', 30),
  ('finance.expense.create', 'Gider olustur', 'Create expense', 'FINANCE', 'HIGH', '/admin/finans', 40),
  ('finance.expense.edit', 'Gider duzenle', 'Edit expense', 'FINANCE', 'HIGH', '/admin/finans', 50),
  ('finance.expense.delete', 'Gider sil', 'Delete expense', 'FINANCE', 'CRITICAL', '/admin/finans', 60),
  ('finance.liabilities.view', 'Yukumluluk gor', 'Liabilities', 'FINANCE', 'MEDIUM', '/admin/finans', 70),
  ('finance.pnl.view', 'P&L gor', 'Profit and loss', 'FINANCE', 'MEDIUM', '/admin/finans', 80),
  ('finance.forecast.view', 'Tahmin gor', 'Forecast', 'FINANCE', 'LOW', '/admin/finans', 90),
  ('finance.reconciliation.view', 'Mutabakat gor', 'Reconciliation', 'FINANCE', 'HIGH', '/admin/finans', 100),
  ('finance.reconciliation.run', 'Mutabakat calistir', 'Run reconciliation', 'FINANCE', 'CRITICAL', '/admin/finans', 110),
  ('finance.export', 'Finans export', 'CSV/XLSX', 'FINANCE', 'CRITICAL', '/admin/finans', 120),
  ('finance.pdf.generate', 'Finans PDF', 'PDF rapor', 'FINANCE', 'HIGH', '/admin/ciro', 130),
  ('finance.volume.view', 'Islem hacmi gor', 'Volume', 'FINANCE', 'MEDIUM', '/admin/islem-hacmi', 140),
  ('finance.league.view', 'Ulke ligi gor', 'Country league', 'FINANCE', 'LOW', '/admin/ulke-ligi', 150),
  ('finance.settings.edit', 'Finans ayar', 'Finance settings', 'FINANCE', 'CRITICAL', '/admin/ekonomi', 160),
  ('finance.commission.edit', 'Komisyon duzenle', 'Commission rates', 'FINANCE', 'CRITICAL', '/admin/komisyonlar', 170),

  -- PAYOUTS
  ('payout.view', 'Cekim gor', 'Withdrawal list', 'PAYOUTS', 'HIGH', '/admin/finans', 10),
  ('payout.approve', 'Cekim onayla', 'Approve payout', 'PAYOUTS', 'CRITICAL', '/admin/finans', 20),
  ('payout.reject', 'Cekim reddet', 'Reject payout', 'PAYOUTS', 'CRITICAL', '/admin/finans', 30),

  -- COINS / WALLET
  ('coins.view', 'Coin ekonomi gor', 'Coin economy', 'COINS', 'MEDIUM', '/admin/coin', 10),
  ('coins.sales.view', 'Coin satis gor', 'Sales', 'COINS', 'MEDIUM', '/admin/coin-paketleri', 20),
  ('coins.balance.view', 'Bakiye gor', 'User balance', 'COINS', 'HIGH', '/admin/coin', 30),
  ('coins.transactions.view', 'Coin islemleri', 'Ledger', 'COINS', 'HIGH', '/admin/coin', 40),
  ('coins.adjust', 'Coin ayarla', 'Manual adjust', 'COINS', 'CRITICAL', '/admin/coin', 50),
  ('coins.package.create', 'Paket olustur', 'Create package', 'COINS', 'HIGH', '/admin/coin-paketleri', 60),
  ('coins.package.edit', 'Paket duzenle', 'Edit package', 'COINS', 'CRITICAL', '/admin/coin-paketleri', 70),
  ('coins.package.disable', 'Paket kapat', 'Disable package', 'COINS', 'HIGH', '/admin/coin-paketleri', 80),
  ('coins.ledger.view', 'Coin ledger', 'Ledger view', 'COINS', 'HIGH', '/admin/coin', 90),
  ('wallet.ui.manage', 'Cuzdan UI yonet', 'Wallet UI CMS', 'WALLET', 'MEDIUM', '/admin/cuzdan-yonetimi', 10),
  ('wallet.exchange.view', 'Takas gor', 'Coin exchange', 'WALLET', 'MEDIUM', '/admin/takas', 20),
  ('wallet.exchange.manage', 'Takas yonet', 'Approve exchange', 'WALLET', 'HIGH', '/admin/takas', 30),
  ('wallet.iap.disputes.view', 'IAP itiraz gor', 'Purchase disputes', 'IAP', 'HIGH', '/admin/satin-alma-itirazlar', 10),
  ('wallet.iap.disputes.manage', 'IAP itiraz yonet', 'Approve/reject dispute', 'IAP', 'CRITICAL', '/admin/satin-alma-itirazlar', 20),
  ('diamonds.adjust', 'Elmas ayarla', 'Diamond adjust', 'COINS', 'CRITICAL', '/admin/coin', 100),

  -- AGENCIES
  ('agencies.view', 'Ajanslari gor', 'Agency list', 'AGENCIES', 'LOW', '/admin/ajanslar', 10),
  ('agencies.create', 'Ajans olustur', 'Create agency', 'AGENCIES', 'HIGH', '/admin/ajanslar', 20),
  ('agencies.edit', 'Ajans duzenle', 'Edit agency', 'AGENCIES', 'HIGH', '/admin/ajanslar', 30),
  ('agencies.suspend', 'Ajans ask─▒ya al', 'Suspend', 'AGENCIES', 'CRITICAL', '/admin/ajanslar', 40),
  ('agencies.delete', 'Ajans sil', 'Delete', 'AGENCIES', 'CRITICAL', '/admin/ajanslar', 50),
  ('agencies.finance.view', 'Ajans finans', 'Agency finance', 'AGENCIES', 'HIGH', '/admin/ajanslar', 60),
  ('agencies.creators.view', 'Ajans creator', 'Agency creators', 'AGENCIES', 'MEDIUM', '/admin/ajanslar', 70),
  ('agencies.users.view', 'Ajans uyeler', 'Agency users', 'AGENCIES', 'MEDIUM', '/admin/ajanslar', 80),
  ('agencies.export', 'Ajans export', 'Export', 'AGENCIES', 'HIGH', '/admin/ajanslar', 90),
  ('agencies.packages.view', 'Ajans paketleri', 'Agency packages', 'AGENCIES', 'MEDIUM', '/admin/ajans-paketleri', 100),
  ('agencies.packages.manage', 'Ajans paket yonet', 'Manage packages', 'AGENCIES', 'HIGH', '/admin/ajans-paketleri', 110),

  -- VERIFICATION / KYC (preserve existing keys)
  ('agency.application.read', 'Ajans basvuru oku', 'Legacy', 'VERIFICATION', 'MEDIUM', '/admin/dogrulama', 10),
  ('agency.application.review', 'Ajans basvuru incele', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/dogrulama', 20),
  ('verification.metadata.read', 'Dogrulama metadata', 'Legacy', 'VERIFICATION', 'MEDIUM', '/admin/dogrulama', 30),
  ('verification.document.read', 'Dogrulama belge', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/dogrulama', 40),
  ('verification.approve', 'Dogrulama onay', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/dogrulama', 50),
  ('verification.reject', 'Dogrulama red', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/dogrulama', 60),
  ('verification.request_resubmission', 'Yeniden belge iste', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/dogrulama', 70),
  ('verification.override', 'Dogrulama override', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/dogrulama', 80),
  ('verification.settings.manage', 'Dogrulama ayar', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/dogrulama', 90),
  ('kyc.read', 'KYC oku', 'Legacy', 'VERIFICATION', 'MEDIUM', '/admin/kyc', 100),
  ('kyc.review', 'KYC incele', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/kyc', 110),
  ('kyc.delete', 'KYC sil', 'Legacy', 'VERIFICATION', 'CRITICAL', '/admin/kyc', 120),
  ('kyb.read', 'KYB oku', 'Legacy', 'VERIFICATION', 'MEDIUM', '/admin/dogrulama', 130),
  ('kyb.review', 'KYB incele', 'Legacy', 'VERIFICATION', 'HIGH', '/admin/dogrulama', 140),
  ('kyc.view', 'KYC ekrani', 'KYC module view', 'VERIFICATION', 'MEDIUM', '/admin/kyc', 150),
  ('verification.view', 'Dogrulama merkezi', 'Verification hub', 'VERIFICATION', 'MEDIUM', '/admin/dogrulama', 160),

  -- MODERATION / SECURITY
  ('moderation.view', 'Moderasyon gor', 'Reports queue', 'MODERATION', 'MEDIUM', '/admin/moderasyon', 10),
  ('moderation.manage', 'Moderasyon yonet', 'Resolve reports', 'MODERATION', 'HIGH', '/admin/moderasyon', 20),
  ('live.view', 'Canli gor', 'Live rooms', 'LIVE', 'MEDIUM', '/admin/odalar', 10),
  ('live.rooms.view', 'Odalar gor', 'Room list', 'LIVE', 'MEDIUM', '/admin/odalar', 20),
  ('live.moderate', 'Canli moderate', 'Moderate live', 'LIVE', 'HIGH', '/admin/odalar', 30),
  ('live.end', 'Yayin bitir', 'End live', 'LIVE', 'HIGH', '/admin/odalar', 40),
  ('live.ban', 'Canli ban', 'Ban from live', 'LIVE', 'CRITICAL', '/admin/odalar', 50),
  ('live.analytics.view', 'Canli analitik', 'Live analytics', 'LIVE', 'LOW', '/admin/odalar', 60),
  ('security.call.view', 'Gorusme guvenlik', 'Call safety', 'SECURITY', 'HIGH', '/admin/gorusme-guvenlik', 10),
  ('security.rtc.view', 'RTC altyapi', 'RTC settings', 'SECURITY', 'HIGH', '/admin/rtc-altyapi', 20),
  ('security.rtc.manage', 'RTC yonet', 'Switch provider', 'SECURITY', 'CRITICAL', '/admin/rtc-altyapi', 30),
  ('security.platform.view', 'Platform guvenlik', 'Device/security', 'SECURITY', 'HIGH', '/admin/platform-guvenlik', 10),
  ('security.child.view', 'Cocuk koruma', 'Child protection', 'SECURITY', 'HIGH', '/admin/cocuk-koruma', 20),
  ('support.view', 'Destek gor', 'Live support', 'SUPPORT', 'LOW', '/admin/destek', 10),
  ('support.manage', 'Destek yonet', 'Assign/resolve', 'SUPPORT', 'MEDIUM', '/admin/destek', 20),

  -- STORIES / CONTENT
  ('stories.view', 'Hikaye gor', 'Stories admin', 'STORIES', 'MEDIUM', null, 10),
  ('stories.delete', 'Hikaye sil', 'Delete story', 'STORIES', 'HIGH', null, 20),
  ('stories.moderate', 'Hikaye moderate', 'Moderate story', 'STORIES', 'HIGH', null, 30),
  ('stories.reports.view', 'Hikaye rapor', 'Story reports', 'STORIES', 'MEDIUM', null, 40),
  ('stories.settings.manage', 'Hikaye ayar', 'Story settings', 'STORIES', 'HIGH', null, 50),
  ('stories.feature.toggle', 'Hikaye feature', 'Toggle story feature', 'STORIES', 'CRITICAL', null, 60),
  ('content.feedback.view', 'Fikir merkezi', 'Feedback', 'CONTENT', 'LOW', '/admin/fikirler', 10),
  ('content.feedback.manage', 'Fikir yonet', 'Manage feedback', 'CONTENT', 'MEDIUM', '/admin/fikirler', 20),
  ('content.titles.view', 'Unvanlar', 'Titles', 'CONTENT', 'LOW', '/admin/unvanlar', 30),
  ('content.titles.manage', 'Unvan yonet', 'Manage titles', 'CONTENT', 'MEDIUM', '/admin/unvanlar', 40),
  ('content.music.view', 'Muzik merkezi', 'Music', 'CONTENT', 'LOW', '/admin/muzik', 50),
  ('content.music.manage', 'Muzik yonet', 'Manage music', 'CONTENT', 'MEDIUM', '/admin/muzik', 60),
  ('content.ai_music.view', 'AI muzik', 'AI music', 'CONTENT', 'LOW', '/admin/ai-muzik', 70),
  ('content.ai_music.manage', 'AI muzik yonet', 'Manage AI music', 'CONTENT', 'MEDIUM', '/admin/ai-muzik', 80),
  ('content.banners.view', 'Bannerlar', 'Banners', 'CONTENT', 'LOW', '/admin/bannerlar', 90),
  ('content.banners.manage', 'Banner yonet', 'Manage banners', 'CONTENT', 'MEDIUM', '/admin/bannerlar', 100),
  ('content.lobby.view', 'Giris lobisi', 'Login lobby', 'CONTENT', 'LOW', '/admin/giris-lobisi', 110),
  ('content.lobby.manage', 'Lobi yonet', 'Manage lobby', 'CONTENT', 'MEDIUM', '/admin/giris-lobisi', 120),
  ('content.policies.view', 'Politikalar', 'Policies', 'CONTENT', 'LOW', '/admin/politikalar', 130),
  ('content.policies.manage', 'Politika yonet', 'Manage policies', 'CONTENT', 'HIGH', '/admin/politikalar', 140),
  ('content.menu.view', 'Hamburger menu', 'Menu CMS', 'CONTENT', 'LOW', '/admin/hamburger-menu', 150),
  ('content.menu.manage', 'Menu yonet', 'Manage menu', 'CONTENT', 'MEDIUM', '/admin/hamburger-menu', 160),
  ('content.register.view', 'Kayit alanlari', 'Register fields', 'CONTENT', 'LOW', '/admin/kayit-alanlari', 170),
  ('content.register.manage', 'Kayit alan yonet', 'Manage fields', 'CONTENT', 'MEDIUM', '/admin/kayit-alanlari', 180),
  ('content.contact.view', 'Kurumsal iletisim', 'Contact', 'CONTENT', 'LOW', '/admin/iletisim', 190),
  ('content.contact.manage', 'Iletisim yonet', 'Manage contact', 'CONTENT', 'MEDIUM', '/admin/iletisim', 200),
  ('content.share.view', 'Paylasim linkleri', 'Share links', 'CONTENT', 'LOW', '/admin/paylasim-linkleri', 210),
  ('content.share.manage', 'Link yonet', 'Manage links', 'CONTENT', 'MEDIUM', '/admin/paylasim-linkleri', 220),
  ('content.discovery.view', 'Kisiler aramalar', 'Discovery', 'CONTENT', 'LOW', '/admin/kisiler-aramalar', 230),
  ('content.discovery.manage', 'Kesif yonet', 'Manage discovery', 'CONTENT', 'HIGH', '/admin/kisiler-aramalar', 240),
  ('content.city.view', 'Sehir secimleri', 'City votes', 'CONTENT', 'LOW', '/admin/sehir-secim', 250),
  ('content.city.manage', 'Sehir yonet', 'Manage city votes', 'CONTENT', 'MEDIUM', '/admin/sehir-secim', 260),

  -- GAMES / STUDIO
  ('games.view', 'Oyunlari gor', 'Games list', 'GAMES', 'LOW', '/admin/oyunlar', 10),
  ('games.create', 'Oyun olustur', 'Create game', 'GAMES', 'HIGH', '/admin/oyunlar', 20),
  ('games.edit', 'Oyun duzenle', 'Edit game', 'GAMES', 'HIGH', '/admin/oyunlar', 30),
  ('games.approve', 'Oyun onayla', 'Approve', 'GAMES', 'HIGH', '/admin/oyunlar', 40),
  ('games.reject', 'Oyun reddet', 'Reject', 'GAMES', 'HIGH', '/admin/oyunlar', 50),
  ('games.publish', 'Oyun yayinla', 'Publish', 'GAMES', 'CRITICAL', '/admin/oyunlar', 60),
  ('games.unpublish', 'Yayindan kaldir', 'Unpublish', 'GAMES', 'HIGH', '/admin/oyunlar', 70),
  ('games.finance.view', 'Oyun finans', 'Game finance', 'GAMES', 'HIGH', '/admin/oyunlar', 80),
  ('games.analytics.view', 'Oyun analitik', 'Game analytics', 'GAMES', 'LOW', '/admin/oyunlar', 90),
  ('games.disable', 'Oyun kapat', 'Disable game', 'GAMES', 'CRITICAL', '/admin/oyunlar', 100),
  ('games.feature.toggle', 'Oyun feature', 'Toggle game feature', 'GAMES', 'CRITICAL', '/admin/oyunlar', 110),
  ('games.test.view', 'Oyun test', 'Game test', 'GAMES', 'MEDIUM', '/admin/oyun-test', 120),
  ('games.algorithm.view', 'Oyun algoritma', 'Algorithm', 'GAMES', 'HIGH', '/admin/oyun-algoritma', 130),
  ('games.algorithm.manage', 'Algoritma yonet', 'Manage algorithm', 'GAMES', 'CRITICAL', '/admin/oyun-algoritma', 140),
  ('games.kaskad.view', 'Kaskad yonetim', 'Kaskad', 'GAMES', 'MEDIUM', '/admin/kaskad-yonetim', 150),
  ('games.kaskad.manage', 'Kaskad yonet', 'Manage kaskad', 'GAMES', 'HIGH', '/admin/kaskad-yonetim', 160),
  ('games.fruit_wheel.view', 'Fruit Wheel', 'Fruit wheel', 'GAMES', 'MEDIUM', '/admin/fruit-wheel', 170),
  ('games.fruit_wheel.manage', 'Fruit Wheel yonet', 'Manage fruit wheel', 'GAMES', 'HIGH', '/admin/fruit-wheel', 180),
  ('studio.view', 'Tamuso Studio', 'Creator studio', 'CREATOR_STUDIO', 'LOW', '/admin/studio', 10),
  ('studio.manage', 'Studio yonet', 'Publish studio games', 'CREATOR_STUDIO', 'HIGH', '/admin/studio', 20),

  -- ECONOMY / FEATURE FLAGS
  ('economy.view', 'Ekonomi merkezi', 'Economy', 'ECONOMY', 'MEDIUM', '/admin/ekonomi', 10),
  ('economy.manage', 'Ekonomi yonet', 'Manage economy', 'ECONOMY', 'CRITICAL', '/admin/ekonomi', 20),
  ('features.view', 'Ozellik bayraklari', 'Feature flags', 'FEATURE_FLAGS', 'MEDIUM', '/admin/ozellikler', 10),
  ('features.toggle', 'Bayrak degistir', 'Toggle feature flag', 'FEATURE_FLAGS', 'CRITICAL', '/admin/ozellikler', 20),

  -- ANNOUNCEMENTS (preserve)
  ('announcement.create', 'Duyuru olustur', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 10),
  ('announcement.edit', 'Duyuru duzenle', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 20),
  ('announcement.delete', 'Duyuru sil', 'Legacy', 'NOTIFICATIONS', 'HIGH', '/admin/duyurular', 30),
  ('announcement.publish', 'Duyuru yayinla', 'Legacy', 'NOTIFICATIONS', 'HIGH', '/admin/duyurular', 40),
  ('announcement.analytics', 'Duyuru analitik', 'Legacy', 'NOTIFICATIONS', 'LOW', '/admin/duyurular', 50),
  ('announcement.export', 'Duyuru export', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 60),
  ('announcement.view_users', 'Duyuru izleyiciler', 'Legacy', 'NOTIFICATIONS', 'MEDIUM', '/admin/duyurular', 70),
  ('notifications.view', 'Bildirimler', 'Push queue', 'NOTIFICATIONS', 'LOW', '/bildirimler', 80),
  ('notifications.manage', 'Bildirim yonet', 'Manage push', 'NOTIFICATIONS', 'MEDIUM', '/bildirimler', 90),

  -- ANALYTICS / OPS
  ('analytics.view', 'Analitik gor', 'Analytics', 'ANALYTICS', 'LOW', '/admin', 10),
  ('ops.platform.view', 'Platform ops', 'Platform hub', 'SYSTEM_SETTINGS', 'LOW', '/platform', 10),
  ('ops.security.view', 'Guvenlik merkezi', 'Security center', 'SYSTEM_SETTINGS', 'MEDIUM', '/guvenlik', 20),
  ('ops.cert.view', 'Sertifikasyon', 'Certification', 'SYSTEM_SETTINGS', 'LOW', '/sertifikasyon', 30)
on conflict (permission_key) do update set
  label = excluded.label,
  description = excluded.description,
  category = excluded.category,
  risk = excluded.risk,
  module_href = excluded.module_href,
  sort_order = excluded.sort_order,
  is_active = true;

-- Ensure every existing role_permission code is in catalog
insert into public.admin_permission_catalog (permission_key, label, category, risk, sort_order)
select distinct p.permission_code, p.permission_code, 'LEGACY', 'MEDIUM', 900
from public.admin_role_permissions p
where not exists (
  select 1 from public.admin_permission_catalog c where c.permission_key = p.permission_code
)
on conflict do nothing;
