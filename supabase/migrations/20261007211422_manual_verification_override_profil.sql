-- Elle doğrulama: profil satırı yoksa oluştur, hataları kodla döndür.
create or replace function public.manual_verification_override(
  p_subject_type text,
  p_subject_id uuid,
  p_new_status text,
  p_reason text,
  p_internal_note text,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.agency_verification_profiles%rowtype;
  v_prev text;
  v_cached jsonb;
  v_result jsonb;
  v_user uuid;
  v_status text := upper(trim(coalesce(p_new_status, '')));
begin
  v_cached := public.verification_idempotency_begin('manual_verification_override', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  if not public.admin_has_permission('verification.override') then
    raise exception 'OVERRIDE_FORBIDDEN';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'REASON_REQUIRED';
  end if;
  if nullif(trim(coalesce(p_internal_note, '')), '') is null then
    raise exception 'NOTE_REQUIRED';
  end if;
  if v_status not in (
    'NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'VERIFIED', 'REJECTED',
    'REVERIFICATION_REQUIRED', 'SUSPENDED', 'REVOKED',
    'LEGACY_ACTIVE', 'LEGACY_VERIFIED', 'LEGACY_UNVERIFIED',
    'FINANCIAL_REVERIFICATION_REQUIRED', 'EXPIRING_SOON'
  ) then
    raise exception 'STATUS_INVALID';
  end if;

  select * into v_p
  from public.agency_verification_profiles
  where subject_type = p_subject_type and subject_id = p_subject_id
  for update;

  if not found then
    if p_subject_type = 'APPLICATION' then
      select a.applicant_id into v_user
      from public.agency_applications a
      where a.id = p_subject_id;
      if not found then
        raise exception 'APPLICATION_NOT_FOUND';
      end if;
      insert into public.agency_verification_profiles (
        subject_type, subject_id, application_id, user_id, overall_status
      ) values (
        'APPLICATION', p_subject_id, p_subject_id, v_user, 'NOT_STARTED'
      )
      on conflict (subject_type, subject_id) do nothing;
    elsif p_subject_type = 'AGENCY' then
      select g.owner_id into v_user
      from public.agencies g
      where g.id = p_subject_id;
      if not found then
        raise exception 'AGENCY_NOT_FOUND';
      end if;
      insert into public.agency_verification_profiles (
        subject_type, subject_id, agency_id, user_id, overall_status
      ) values (
        'AGENCY', p_subject_id, p_subject_id, v_user, 'NOT_STARTED'
      )
      on conflict (subject_type, subject_id) do nothing;
    else
      raise exception 'PROFILE_MISSING';
    end if;

    select * into v_p
    from public.agency_verification_profiles
    where subject_type = p_subject_type and subject_id = p_subject_id
    for update;
    if not found then
      raise exception 'PROFILE_MISSING';
    end if;
  end if;

  v_prev := v_p.overall_status;
  update public.agency_verification_profiles set
    overall_status = v_status,
    updated_at = now(),
    row_version = row_version + 1
  where id = v_p.id;

  insert into public.verification_manual_overrides (
    admin_user_id, subject_type, subject_id, profile_id,
    previous_status, new_status, reason, internal_note
  ) values (
    auth.uid(), p_subject_type, p_subject_id, v_p.id,
    v_prev, v_status, trim(p_reason), trim(p_internal_note)
  );

  perform public.verification_log_event(
    'MANUAL_OVERRIDE', 'PROFILE', v_p.id, trim(p_reason),
    jsonb_build_object('from', v_prev, 'to', v_status, 'note', trim(p_internal_note))
  );

  v_result := jsonb_build_object('ok', true, 'previous', v_prev, 'new_status', v_status);
  perform public.verification_idempotency_finish('manual_verification_override', p_idempotency_key, v_result);
  return v_result;
end;
$$;
