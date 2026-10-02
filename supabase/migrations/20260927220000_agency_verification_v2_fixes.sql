-- V2 fixes: upload session validation + policy acceptance upsert safety

create or replace function public.create_document_upload_session(
  p_subject_type text,
  p_subject_id uuid,
  p_verification_type text,
  p_document_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_key text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_subject_type not in ('USER', 'AGENCY', 'APPLICATION') then
    raise exception 'Invalid subject';
  end if;

  if p_subject_type = 'USER' and p_subject_id <> v_uid then
    raise exception 'Forbidden';
  end if;
  if p_subject_type = 'APPLICATION' and not exists (
    select 1 from public.agency_applications where id = p_subject_id and applicant_id = v_uid
  ) and not public.admin_has_permission('verification.approve') then
    raise exception 'Forbidden';
  end if;
  if p_subject_type = 'AGENCY' and not exists (
    select 1 from public.agencies where id = p_subject_id and owner_id = v_uid
  ) and not public.admin_has_permission('verification.approve') then
    raise exception 'Forbidden';
  end if;

  if p_verification_type not in (
    'IDENTITY', 'ADDRESS', 'CRIMINAL_RECORD_DOCUMENT', 'COMPANY',
    'AUTHORIZED_PERSON', 'PAYMENT_ACCOUNT', 'SELFIE', 'EXTRA',
    'BENEFICIAL_OWNER', 'LIVENESS'
  ) then
    raise exception 'Belge türü izinli değil';
  end if;

  v_key := p_subject_type || '/' || p_subject_id::text || '/' || gen_random_uuid()::text;

  insert into public.verification_upload_sessions (
    user_id, subject_type, subject_id, verification_type, document_type, storage_object_key, expires_at
  ) values (
    v_uid, p_subject_type, p_subject_id, p_verification_type, p_document_type, v_key, now() + interval '30 minutes'
  ) returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_id,
    'bucket', 'verification-docs',
    'storage_object_key', v_key,
    'expires_at', (now() + interval '30 minutes')
  );
end;
$$;

grant execute on function public.create_document_upload_session(text, uuid, text, text) to authenticated;

-- Document expiry → EXPIRING_SOON / REVERIFICATION_REQUIRED (cron-friendly)
create or replace function public.verification_expiry_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb := public.verification_settings_get();
  v_warn int := coalesce((v_settings->>'document_expiry_warn_days')::int, 30);
  v_expiring int := 0;
  v_expired int := 0;
begin
  if auth.role() <> 'service_role' and not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;

  update public.verification_documents set
    status = 'EXPIRING_SOON',
    updated_at = now()
  where status = 'VERIFIED'
    and expires_at is not null
    and expires_at > now()
    and expires_at <= now() + make_interval(days => v_warn);
  get diagnostics v_expiring = row_count;

  update public.verification_documents set
    status = 'EXPIRED',
    updated_at = now()
  where status in ('VERIFIED', 'EXPIRING_SOON')
    and expires_at is not null
    and expires_at <= now();
  get diagnostics v_expired = row_count;

  update public.agency_verification_profiles p set
    overall_status = 'REVERIFICATION_REQUIRED',
    identity_verified = case when exists (
      select 1 from public.verification_documents d
      where d.profile_id = p.id and d.verification_type = 'IDENTITY' and d.status = 'EXPIRED'
    ) then false else p.identity_verified end,
    updated_at = now()
  where exists (
    select 1 from public.verification_documents d
    where d.profile_id = p.id and d.status = 'EXPIRED'
  )
  and p.overall_status not in ('LEGACY_ACTIVE', 'LEGACY_VERIFIED', 'REVOKED');

  return jsonb_build_object('ok', true, 'expiring', v_expiring, 'expired', v_expired);
end;
$$;

grant execute on function public.verification_expiry_sweep() to authenticated;
