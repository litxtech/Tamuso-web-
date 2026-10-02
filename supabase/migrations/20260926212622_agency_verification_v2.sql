-- =============================================================================
-- Agency Verification V2: başvuru state machine, KYC/KYB, policy, audit, RBAC
-- Mevcut ajans/cüzdan KYC akışını bozmaz. Finansal kilitler varsayılan KAPALI.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Feature flags
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, enabled, description) values
  ('agency_verification_v2_enabled', false, 'Ajans doğrulama V2 UI + state machine'),
  ('agency_verification_financial_locks', false, 'Doğrulama olmadan finansal işlem kilidi'),
  ('agency_verification_sync_wallet_kyc', false, 'V2 kimlik onayı → cüzdan KYC senkronu')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 1) agency_applications genişletme + status CHECK
-- ---------------------------------------------------------------------------
alter table public.agency_applications
  add column if not exists agency_type text
    check (agency_type is null or agency_type in ('INDIVIDUAL', 'COMPANY')),
  add column if not exists contact_first_name text,
  add column if not exists contact_last_name text,
  add column if not exists whatsapp text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists website text,
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists target_countries text[] not null default '{}'::text[],
  add column if not exists why_tamuso text,
  add column if not exists existing_network text,
  add column if not exists referral_code text,
  add column if not exists assigned_reviewer_id uuid references public.profiles(id),
  add column if not exists row_version int not null default 1,
  add column if not exists legacy_migration_state text,
  add column if not exists agency_id uuid references public.agencies(id),
  add column if not exists risk_level text not null default 'LOW'
    check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'REVIEW_REQUIRED')),
  add column if not exists status_v2 text;

-- Drop old status check and recreate with expanded + legacy values
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
      and t.relname = 'agency_applications'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.agency_applications drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.agency_applications
  add constraint agency_applications_status_check
  check (status in (
    'pending', 'under_review', 'approved', 'rejected', 'suspended',
    'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'MORE_INFORMATION_REQUIRED',
    'PRE_APPROVED', 'VERIFICATION_REQUIRED', 'VERIFICATION_IN_REVIEW',
    'VERIFIED', 'APPROVED', 'ACTIVE', 'REJECTED', 'SUSPENDED',
    'REVOKED', 'EXPIRED'
  ));

update public.agency_applications
set agency_type = coalesce(agency_type, 'INDIVIDUAL')
where agency_type is null;

create index if not exists agency_applications_status_idx
  on public.agency_applications (status);
create index if not exists agency_applications_reviewer_idx
  on public.agency_applications (assigned_reviewer_id)
  where assigned_reviewer_id is not null;

-- ---------------------------------------------------------------------------
-- 2) Admin staff RBAC (verification-scoped)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_staff_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null
    check (role_code in (
      'SUPPORT', 'AGENCY_MANAGER', 'VERIFICATION_REVIEWER',
      'FINANCE', 'COMPLIANCE', 'SUPER_ADMIN'
    )),
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_code)
);

create table if not exists public.admin_role_permissions (
  role_code text not null,
  permission_code text not null,
  primary key (role_code, permission_code)
);

insert into public.admin_role_permissions (role_code, permission_code) values
  ('SUPER_ADMIN', 'agency.application.read'),
  ('SUPER_ADMIN', 'agency.application.review'),
  ('SUPER_ADMIN', 'verification.metadata.read'),
  ('SUPER_ADMIN', 'verification.document.read'),
  ('SUPER_ADMIN', 'verification.approve'),
  ('SUPER_ADMIN', 'verification.reject'),
  ('SUPER_ADMIN', 'verification.request_resubmission'),
  ('SUPER_ADMIN', 'verification.override'),
  ('SUPER_ADMIN', 'kyc.read'),
  ('SUPER_ADMIN', 'kyc.review'),
  ('SUPER_ADMIN', 'kyb.read'),
  ('SUPER_ADMIN', 'kyb.review'),
  ('SUPER_ADMIN', 'verification.settings.manage'),
  ('VERIFICATION_REVIEWER', 'agency.application.read'),
  ('VERIFICATION_REVIEWER', 'agency.application.review'),
  ('VERIFICATION_REVIEWER', 'verification.metadata.read'),
  ('VERIFICATION_REVIEWER', 'verification.document.read'),
  ('VERIFICATION_REVIEWER', 'verification.approve'),
  ('VERIFICATION_REVIEWER', 'verification.reject'),
  ('VERIFICATION_REVIEWER', 'verification.request_resubmission'),
  ('VERIFICATION_REVIEWER', 'kyc.read'),
  ('VERIFICATION_REVIEWER', 'kyc.review'),
  ('VERIFICATION_REVIEWER', 'kyb.read'),
  ('VERIFICATION_REVIEWER', 'kyb.review'),
  ('COMPLIANCE', 'agency.application.read'),
  ('COMPLIANCE', 'verification.metadata.read'),
  ('COMPLIANCE', 'verification.document.read'),
  ('COMPLIANCE', 'verification.approve'),
  ('COMPLIANCE', 'verification.reject'),
  ('COMPLIANCE', 'verification.request_resubmission'),
  ('COMPLIANCE', 'verification.override'),
  ('COMPLIANCE', 'kyc.read'),
  ('COMPLIANCE', 'kyb.read'),
  ('COMPLIANCE', 'verification.settings.manage'),
  ('AGENCY_MANAGER', 'agency.application.read'),
  ('AGENCY_MANAGER', 'agency.application.review'),
  ('AGENCY_MANAGER', 'verification.metadata.read'),
  ('FINANCE', 'agency.application.read'),
  ('FINANCE', 'verification.metadata.read'),
  ('SUPPORT', 'agency.application.read'),
  ('SUPPORT', 'verification.metadata.read')
on conflict do nothing;

-- is_admin → SUPER_ADMIN seed (uyumluluk)
insert into public.admin_staff_roles (user_id, role_code)
select id, 'SUPER_ADMIN' from public.profiles where is_admin = true
on conflict do nothing;

create or replace function public.admin_has_permission(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  if public.ben_admin_miyim() then return true; end if;
  return exists (
    select 1
    from public.admin_staff_roles r
    join public.admin_role_permissions p on p.role_code = r.role_code
    where r.user_id = v_uid and p.permission_code = p_permission
  );
end;
$$;

grant execute on function public.admin_has_permission(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) verification_settings
-- ---------------------------------------------------------------------------
create table if not exists public.verification_settings (
  id int primary key default 1 check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.verification_settings (id, settings) values (1, jsonb_build_object(
  'verification_enabled', true,
  'agency_verification_required', true,
  'allowed_identity_documents', jsonb_build_array('NATIONAL_ID', 'PASSPORT', 'DRIVER_LICENSE'),
  'proof_of_address_max_age_days', 90,
  'selfie_requirement', false,
  'liveness_requirement', false,
  'criminal_record_requirement', jsonb_build_object('global', false),
  'individual_agency_requirements', jsonb_build_array('IDENTITY', 'ADDRESS'),
  'company_agency_requirements', jsonb_build_array('COMPANY', 'AUTHORIZED_PERSON', 'IDENTITY'),
  'required_documents_by_country', '{}'::jsonb,
  'required_documents_by_agency_type', '{}'::jsonb,
  'required_documents_by_risk_level', '{}'::jsonb,
  'document_expiry_warn_days', 30,
  'financial_feature_verification_requirement', jsonb_build_object(
    'can_withdraw', jsonb_build_array('IDENTITY', 'PAYMENT_ACCOUNT'),
    'can_receive_agency_settlement', jsonb_build_array('IDENTITY', 'CONTRACT'),
    'can_manage_financial_distribution', jsonb_build_array('IDENTITY', 'AUTHORIZED_PERSON')
  ),
  'manual_review_required', true,
  'appeal_enabled', true,
  'appeal_different_reviewer', true,
  'identity_retention_policy_days', null,
  'address_document_retention_policy_days', null,
  'background_document_retention_policy_days', null,
  'rejected_application_retention_policy_days', null,
  'max_upload_bytes', 10485760,
  'allowed_mime_types', jsonb_build_array(
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'
  )
))
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4) Core verification tables
-- ---------------------------------------------------------------------------
create table if not exists public.agency_verification_profiles (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('USER', 'AGENCY', 'APPLICATION')),
  subject_id uuid not null,
  agency_id uuid references public.agencies(id) on delete set null,
  application_id uuid references public.agency_applications(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  overall_status text not null default 'NOT_STARTED'
    check (overall_status in (
      'NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'VERIFIED', 'REJECTED',
      'REVERIFICATION_REQUIRED', 'SUSPENDED', 'REVOKED',
      'LEGACY_ACTIVE', 'LEGACY_VERIFIED', 'LEGACY_UNVERIFIED',
      'FINANCIAL_REVERIFICATION_REQUIRED', 'EXPIRING_SOON'
    )),
  identity_verified boolean not null default false,
  address_verified boolean not null default false,
  company_verified boolean not null default false,
  authorized_person_verified boolean not null default false,
  extra_docs_reviewed boolean not null default false,
  payment_account_verified boolean not null default false,
  contract_accepted boolean not null default false,
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  risk_level text not null default 'LOW'
    check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'REVIEW_REQUIRED')),
  row_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_type, subject_id)
);

create index if not exists avp_agency_idx on public.agency_verification_profiles (agency_id);
create index if not exists avp_user_idx on public.agency_verification_profiles (user_id);
create index if not exists avp_status_idx on public.agency_verification_profiles (overall_status);

create table if not exists public.verification_requirements (
  id uuid primary key default gen_random_uuid(),
  country text,
  agency_type text check (agency_type is null or agency_type in ('INDIVIDUAL', 'COMPANY')),
  risk_level text check (risk_level is null or risk_level in ('LOW', 'MEDIUM', 'HIGH', 'REVIEW_REQUIRED')),
  application_id uuid references public.agency_applications(id) on delete cascade,
  verification_type text not null
    check (verification_type in (
      'IDENTITY', 'ADDRESS', 'CRIMINAL_RECORD_DOCUMENT', 'COMPANY',
      'AUTHORIZED_PERSON', 'BENEFICIAL_OWNER', 'PAYMENT_ACCOUNT',
      'SELFIE', 'LIVENESS', 'EXTRA'
    )),
  document_types text[] not null default '{}'::text[],
  is_required boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('USER', 'AGENCY', 'APPLICATION')),
  subject_id uuid not null,
  profile_id uuid references public.agency_verification_profiles(id) on delete cascade,
  verification_type text not null,
  document_type text not null,
  storage_object_key text not null,
  storage_bucket text not null default 'verification-docs',
  mime_type text,
  file_size_bytes bigint,
  issuing_country text,
  issued_at date,
  expires_at date,
  document_number_masked text,
  document_number_ciphertext text,
  holder_first_name text,
  holder_last_name text,
  birth_date date,
  nationality text,
  company_legal_name text,
  company_registration_number text,
  tax_number text,
  address_line text,
  address_city text,
  address_region text,
  address_postal text,
  address_country text,
  status text not null default 'SUBMITTED'
    check (status in (
      'NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED',
      'REJECTED', 'EXPIRED', 'RESUBMISSION_REQUIRED', 'EXPIRING_SOON'
    )),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  rejection_reason_code text,
  user_message text,
  internal_note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vd_subject_idx
  on public.verification_documents (subject_type, subject_id);
create index if not exists vd_status_idx on public.verification_documents (status);
create index if not exists vd_expires_idx
  on public.verification_documents (expires_at)
  where expires_at is not null;

create table if not exists public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.verification_documents(id) on delete cascade,
  profile_id uuid references public.agency_verification_profiles(id) on delete set null,
  reviewer_id uuid not null references public.profiles(id),
  decision text not null
    check (decision in ('APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED', 'REQUEST_INFO')),
  rejection_reason_code text
    check (rejection_reason_code is null or rejection_reason_code in (
      'UNREADABLE', 'INCOMPLETE', 'EXPIRED', 'MISMATCH', 'WRONG_TYPE',
      'PARTIAL_VISIBLE', 'RESUBMIT', 'UNVERIFIABLE', 'OTHER'
    )),
  user_message text,
  internal_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  request_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ve_target_idx
  on public.verification_events (target_type, target_id, created_at desc);
create index if not exists ve_actor_idx
  on public.verification_events (actor_id, created_at desc);

create table if not exists public.verification_manual_overrides (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id),
  subject_type text not null,
  subject_id uuid not null,
  profile_id uuid references public.agency_verification_profiles(id),
  previous_status text,
  new_status text not null,
  reason text not null,
  internal_note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_risk_signals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  signal_code text not null,
  severity text not null
    check (severity in ('LOW', 'MEDIUM', 'HIGH', 'REVIEW_REQUIRED')),
  details jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_appeals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.agency_applications(id) on delete cascade,
  profile_id uuid references public.agency_verification_profiles(id) on delete cascade,
  appellant_id uuid not null references public.profiles(id),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'UNDER_REVIEW', 'APPROVED', 'DENIED')),
  original_reviewer_id uuid references public.profiles(id),
  appeal_reviewer_id uuid references public.profiles(id),
  reason text,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.verification_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  operation text not null,
  idempotency_key text not null,
  actor_id uuid,
  result jsonb,
  created_at timestamptz not null default now(),
  unique (operation, idempotency_key)
);

create table if not exists public.verification_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  verification_type text not null,
  document_type text not null,
  storage_object_key text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5) Policies CMS genişletme
-- ---------------------------------------------------------------------------
alter table public.policies
  add column if not exists policy_type text,
  add column if not exists locale text default 'tr',
  add column if not exists country text,
  add column if not exists audience text not null default 'all'
    check (audience in ('all', 'agency', 'agency_individual', 'agency_company', 'user')),
  add column if not exists require_reacceptance boolean not null default false,
  add column if not exists effective_at timestamptz,
  add column if not exists legal_review_status text not null default 'DRAFT'
    check (legal_review_status in ('DRAFT', 'LEGAL_REVIEW_REQUIRED', 'APPROVED_FOR_USE'));

alter table public.policy_versions
  add column if not exists legal_review_status text not null default 'LEGAL_REVIEW_REQUIRED'
    check (legal_review_status in ('DRAFT', 'LEGAL_REVIEW_REQUIRED', 'APPROVED_FOR_USE'));

alter table public.policy_acceptances
  add column if not exists agency_id uuid references public.agencies(id) on delete set null,
  add column if not exists locale text,
  add column if not exists acceptance_source text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Drop PK to allow multiple acceptances with agency_id — keep unique including agency
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'policy_acceptances_pkey'
  ) then
    alter table public.policy_acceptances drop constraint policy_acceptances_pkey;
  end if;
exception when others then null;
end $$;

alter table public.policy_acceptances
  add column if not exists id uuid default gen_random_uuid();

update public.policy_acceptances set id = gen_random_uuid() where id is null;

do $$
begin
  alter table public.policy_acceptances alter column id set not null;
exception when others then null;
end $$;

create unique index if not exists policy_acceptances_user_version_agency_uidx
  on public.policy_acceptances (user_id, policy_version_id, coalesce(agency_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Agency policy seeds (LEGAL_REVIEW_REQUIRED)
insert into public.policies (code, title, description, is_required, is_active, policy_type, audience, legal_review_status)
values
  ('AGENCY_TERMS', 'Ajans Sözleşmesi', 'Agency Terms & Conditions', true, true, 'AGENCY_TERMS', 'agency', 'LEGAL_REVIEW_REQUIRED'),
  ('AGENCY_CODE_OF_CONDUCT', 'Ajans Davranış Kuralları', 'Agency Code of Conduct', true, true, 'AGENCY_CODE_OF_CONDUCT', 'agency', 'LEGAL_REVIEW_REQUIRED'),
  ('AGENCY_PAYMENT_POLICY', 'Ajans Ödeme Politikası', 'Agency payment policy', true, true, 'AGENCY_PAYMENT_POLICY', 'agency', 'LEGAL_REVIEW_REQUIRED'),
  ('AGENCY_VERIFICATION_POLICY', 'Ajans Doğrulama Politikası', 'Verification policy', true, true, 'AGENCY_VERIFICATION_POLICY', 'agency', 'LEGAL_REVIEW_REQUIRED'),
  ('AGENCY_CONTENT_POLICY', 'Ajans İçerik Politikası', 'Content policy', true, true, 'AGENCY_CONTENT_POLICY', 'agency', 'LEGAL_REVIEW_REQUIRED'),
  ('AGENCY_CREATOR_MANAGEMENT_POLICY', 'Yayıncı Yönetim Politikası', 'Creator management', true, true, 'AGENCY_CREATOR_MANAGEMENT_POLICY', 'agency', 'LEGAL_REVIEW_REQUIRED'),
  ('AGENCY_ANTI_FRAUD_POLICY', 'Ajans Anti-Dolandırıcılık', 'Anti-fraud', true, true, 'AGENCY_ANTI_FRAUD_POLICY', 'agency', 'LEGAL_REVIEW_REQUIRED'),
  ('DOCUMENT_PROCESSING_NOTICE', 'Belge İşleme Bildirimi', 'Document processing notice', true, true, 'DOCUMENT_PROCESSING_NOTICE', 'agency', 'LEGAL_REVIEW_REQUIRED')
on conflict (code) do nothing;

insert into public.policy_versions (policy_code, version, body_md, legal_review_status)
select p.code, 1,
  E'# ' || p.title || E'\n\n'
  || E'> **LEGAL_REVIEW_REQUIRED** — Bu metin taslaktır. Deployment öncesi hukuk danışmanı tarafından incelenmelidir.\n\n'
  || E'Tamuso / LITXTECH LLC ajans programı kapsamında uygulanacak kurallar.\n\n'
  || E'## Kapsam\n'
  || E'Bu belge politika altyapısı için yer tutucudur. Kesin hukuki hükümler hukuk incelemesi sonrası yayınlanır.\n\n'
  || E'## Temel ilkeler\n'
  || E'- Doğru bilgi verme yükümlülüğü\n'
  || E'- Sahte belge yasağı\n'
  || E'- Hesap güvenliği ve paylaşım yasağı\n'
  || E'- Yayıncıları tehdit/taciz yasağı\n'
  || E'- Yetkisiz temsil yasağı\n'
  || E'- Tüketici hakları ve uygulanabilir hukuk saklıdır\n\n'
  || E'## Sorumluluk\n'
  || E'Mutlak sorumluluk reddi hükümleri kullanılmaz. Sorumluluk sınırları uygulanabilir hukuk ve tüketici hakları çerçevesinde belirlenir.\n',
  'LEGAL_REVIEW_REQUIRED'
from public.policies p
where p.code in (
  'AGENCY_TERMS', 'AGENCY_CODE_OF_CONDUCT', 'AGENCY_PAYMENT_POLICY',
  'AGENCY_VERIFICATION_POLICY', 'AGENCY_CONTENT_POLICY',
  'AGENCY_CREATOR_MANAGEMENT_POLICY', 'AGENCY_ANTI_FRAUD_POLICY',
  'DOCUMENT_PROCESSING_NOTICE'
)
and not exists (
  select 1 from public.policy_versions v where v.policy_code = p.code and v.version = 1
);

-- ---------------------------------------------------------------------------
-- 6) Storage bucket verification-docs (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-docs',
  'verification-docs',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Owner may INSERT only into their upload-session path prefix (subject/.../uuid)
-- No list-all: SELECT only own objects under path segment matching uid in metadata path
-- Path format: {subject_type}/{subject_id}/{uuid}
drop policy if exists "verification_docs_own_insert" on storage.objects;
create policy "verification_docs_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and exists (
      select 1 from public.verification_upload_sessions s
      where s.user_id = auth.uid()
        and s.storage_object_key = name
        and s.used_at is null
        and s.expires_at > now()
    )
  );

drop policy if exists "verification_docs_own_select" on storage.objects;
create policy "verification_docs_own_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and (
      exists (
        select 1 from public.verification_documents d
        where d.storage_object_key = name
          and d.created_by = auth.uid()
      )
      or public.admin_has_permission('verification.document.read')
    )
  );

drop policy if exists "verification_docs_admin_all" on storage.objects;
create policy "verification_docs_admin_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'verification-docs'
    and public.admin_has_permission('verification.document.read')
  )
  with check (
    bucket_id = 'verification-docs'
    and public.admin_has_permission('verification.document.read')
  );

-- ---------------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------------
alter table public.admin_staff_roles enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.verification_settings enable row level security;
alter table public.agency_verification_profiles enable row level security;
alter table public.verification_requirements enable row level security;
alter table public.verification_documents enable row level security;
alter table public.verification_reviews enable row level security;
alter table public.verification_events enable row level security;
alter table public.verification_manual_overrides enable row level security;
alter table public.verification_risk_signals enable row level security;
alter table public.verification_appeals enable row level security;
alter table public.verification_idempotency_keys enable row level security;
alter table public.verification_upload_sessions enable row level security;

drop policy if exists "asr_self_read" on public.admin_staff_roles;
create policy "asr_self_read" on public.admin_staff_roles
  for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());

drop policy if exists "arp_read" on public.admin_role_permissions;
create policy "arp_read" on public.admin_role_permissions
  for select to authenticated
  using (true);

drop policy if exists "vs_read" on public.verification_settings;
create policy "vs_read" on public.verification_settings
  for select to authenticated
  using (true);

drop policy if exists "avp_read" on public.agency_verification_profiles;
create policy "avp_read" on public.agency_verification_profiles
  for select to authenticated
  using (
    user_id = auth.uid()
    or agency_id in (select id from public.agencies where owner_id = auth.uid())
    or public.admin_has_permission('verification.metadata.read')
  );

drop policy if exists "vd_read" on public.verification_documents;
create policy "vd_read" on public.verification_documents
  for select to authenticated
  using (
    created_by = auth.uid()
    or public.admin_has_permission('verification.metadata.read')
  );

-- Hassas alanlar: document_number_ciphertext client'a gitmemeli — view veya RPC kullan
-- UPDATE/INSERT client'tan kapalı (yalnız RPC)
drop policy if exists "vd_no_client_write" on public.verification_documents;
-- no insert/update policies for authenticated → denied by default

drop policy if exists "vr_admin_read" on public.verification_reviews;
create policy "vr_admin_read" on public.verification_reviews
  for select to authenticated
  using (public.admin_has_permission('verification.metadata.read'));

drop policy if exists "ve_admin_read" on public.verification_events;
create policy "ve_admin_read" on public.verification_events
  for select to authenticated
  using (public.admin_has_permission('verification.metadata.read') or actor_id = auth.uid());

drop policy if exists "vmo_admin_read" on public.verification_manual_overrides;
create policy "vmo_admin_read" on public.verification_manual_overrides
  for select to authenticated
  using (public.admin_has_permission('verification.override') or public.ben_admin_miyim());

drop policy if exists "vrs_read" on public.verification_risk_signals;
create policy "vrs_read" on public.verification_risk_signals
  for select to authenticated
  using (public.admin_has_permission('verification.metadata.read'));

drop policy if exists "va_read" on public.verification_appeals;
create policy "va_read" on public.verification_appeals
  for select to authenticated
  using (
    appellant_id = auth.uid()
    or public.admin_has_permission('verification.metadata.read')
  );

drop policy if exists "vus_own" on public.verification_upload_sessions;
create policy "vus_own" on public.verification_upload_sessions
  for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());

drop policy if exists "vreq_read" on public.verification_requirements;
create policy "vreq_read" on public.verification_requirements
  for select to authenticated
  using (true);

grant select on public.admin_staff_roles to authenticated;
grant select on public.admin_role_permissions to authenticated;
grant select on public.verification_settings to authenticated;
grant select on public.agency_verification_profiles to authenticated;
grant select on public.verification_requirements to authenticated;
grant select on public.verification_documents to authenticated;
grant select on public.verification_reviews to authenticated;
grant select on public.verification_events to authenticated;
grant select on public.verification_manual_overrides to authenticated;
grant select on public.verification_risk_signals to authenticated;
grant select on public.verification_appeals to authenticated;
grant select on public.verification_upload_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- 8) Legacy backfill
-- ---------------------------------------------------------------------------
insert into public.agency_verification_profiles (
  subject_type, subject_id, agency_id, user_id, overall_status, progress_pct, contract_accepted
)
select
  'AGENCY',
  a.id,
  a.id,
  a.owner_id,
  case when coalesce(a.is_verified, false) then 'LEGACY_VERIFIED' else 'LEGACY_ACTIVE' end,
  case when coalesce(a.is_verified, false) then 100 else 100 end,
  true
from public.agencies a
where a.status = 'active'
on conflict (subject_type, subject_id) do nothing;

-- ---------------------------------------------------------------------------
-- 9) Helpers
-- ---------------------------------------------------------------------------
create or replace function public.verification_log_event(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.verification_events (actor_id, action, target_type, target_id, reason, metadata)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_reason, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.verification_settings_get()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(settings, '{}'::jsonb) from public.verification_settings where id = 1;
$$;

grant execute on function public.verification_settings_get() to authenticated;

create or replace function public.agency_verification_financial_gate(
  p_agency_id uuid,
  p_feature text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_required text[];
  v_profile public.agency_verification_profiles%rowtype;
  v_ok boolean := true;
  r text;
begin
  -- Flag kapalıysa her zaman izin ver (legacy korunur)
  if not public.ozellik_bayragi_aktif_mi('agency_verification_financial_locks') then
    return true;
  end if;

  select * into v_profile
  from public.agency_verification_profiles
  where subject_type = 'AGENCY' and subject_id = p_agency_id;

  if not found then
    return false;
  end if;

  -- Legacy ajanslar kilitlenmez
  if v_profile.overall_status in ('LEGACY_ACTIVE', 'LEGACY_VERIFIED') then
    return true;
  end if;

  if v_profile.overall_status = 'VERIFIED' then
    -- component bazlı kontrol
    null;
  elsif v_profile.overall_status not in ('VERIFIED', 'LEGACY_ACTIVE', 'LEGACY_VERIFIED') then
    -- overall verified değilse feature listesine bak
    null;
  end if;

  v_settings := public.verification_settings_get();
  select array_agg(x)
  into v_required
  from jsonb_array_elements_text(
    coalesce(v_settings->'financial_feature_verification_requirement'->p_feature, '[]'::jsonb)
  ) as t(x);

  if v_required is null or array_length(v_required, 1) is null then
    return v_profile.overall_status in ('VERIFIED', 'LEGACY_ACTIVE', 'LEGACY_VERIFIED');
  end if;

  foreach r in array v_required loop
    if r = 'IDENTITY' and not v_profile.identity_verified then v_ok := false; end if;
    if r = 'ADDRESS' and not v_profile.address_verified then v_ok := false; end if;
    if r = 'COMPANY' and not v_profile.company_verified then v_ok := false; end if;
    if r = 'AUTHORIZED_PERSON' and not v_profile.authorized_person_verified then v_ok := false; end if;
    if r = 'PAYMENT_ACCOUNT' and not v_profile.payment_account_verified then v_ok := false; end if;
    if r = 'CONTRACT' and not v_profile.contract_accepted then v_ok := false; end if;
  end loop;

  return v_ok;
end;
$$;

grant execute on function public.agency_verification_financial_gate(uuid, text) to authenticated;

create or replace function public.avp_recalc_progress(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.agency_verification_profiles%rowtype;
  v_done int := 0;
  v_total int := 0;
begin
  select * into v_p from public.agency_verification_profiles where id = p_profile_id for update;
  if not found then return; end if;

  -- Component sayacı
  v_total := 7;
  if v_p.identity_verified then v_done := v_done + 1; end if;
  if v_p.address_verified then v_done := v_done + 1; end if;
  if v_p.company_verified then v_done := v_done + 1; end if;
  if v_p.authorized_person_verified then v_done := v_done + 1; end if;
  if v_p.extra_docs_reviewed then v_done := v_done + 1; end if;
  if v_p.payment_account_verified then v_done := v_done + 1; end if;
  if v_p.contract_accepted then v_done := v_done + 1; end if;

  update public.agency_verification_profiles set
    progress_pct = round((v_done::numeric / v_total::numeric) * 100)::int,
    overall_status = case
      when overall_status in ('LEGACY_ACTIVE', 'LEGACY_VERIFIED', 'REVOKED', 'SUSPENDED') then overall_status
      when identity_verified and address_verified and contract_accepted
           and (company_verified or subject_type = 'USER')
        then 'VERIFIED'
      when v_done > 0 then 'IN_PROGRESS'
      else overall_status
    end,
    updated_at = now(),
    row_version = row_version + 1
  where id = p_profile_id;
end;
$$;
