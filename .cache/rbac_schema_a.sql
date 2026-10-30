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
-- 5) RLS — no direct client access
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

  -- Legacy: is_admin without account row → active
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

