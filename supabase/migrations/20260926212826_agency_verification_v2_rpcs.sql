-- =============================================================================
-- Agency Verification V2 RPCs (server-authoritative)
-- =============================================================================

-- Idempotency helper
create or replace function public.verification_idempotency_begin(
  p_operation text,
  p_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing jsonb;
begin
  if p_key is null or length(trim(p_key)) < 8 then
    return null; -- no idempotency
  end if;
  select result into v_existing
  from public.verification_idempotency_keys
  where operation = p_operation and idempotency_key = p_key;
  if found then
    return v_existing;
  end if;
  insert into public.verification_idempotency_keys (operation, idempotency_key, actor_id)
  values (p_operation, p_key, auth.uid())
  on conflict (operation, idempotency_key) do nothing;
  return null;
end;
$$;

create or replace function public.verification_idempotency_finish(
  p_operation text,
  p_key text,
  p_result jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key is null then return; end if;
  update public.verification_idempotency_keys
  set result = p_result
  where operation = p_operation and idempotency_key = p_key;
end;
$$;

-- ---------------------------------------------------------------------------
-- Submit agency application (V2 extended; legacy params still work via wrapper)
-- ---------------------------------------------------------------------------
create or replace function public.submit_agency_application(
  p_agency_name text,
  p_agency_type text default 'INDIVIDUAL',
  p_contact_first_name text default null,
  p_contact_last_name text default null,
  p_country text default null,
  p_city text default null,
  p_address text default null,
  p_email text default null,
  p_phone text default null,
  p_whatsapp text default null,
  p_website text default null,
  p_social_links jsonb default '{}'::jsonb,
  p_experience text default null,
  p_expected_hosts int default null,
  p_description text default null,
  p_why_tamuso text default null,
  p_existing_network text default null,
  p_languages text[] default '{}'::text[],
  p_target_countries text[] default '{}'::text[],
  p_referral_code text default null,
  p_policy_version_ids uuid[] default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_name text := trim(coalesce(p_agency_name, ''));
  v_type text := upper(trim(coalesce(p_agency_type, 'INDIVIDUAL')));
  v_country text := nullif(trim(coalesce(p_country, '')), '');
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_description text := nullif(trim(coalesce(p_description, '')), '');
  v_row public.agency_applications%rowtype;
  v_display text;
  v_cached jsonb;
  v_result jsonb;
  v_status text;
  v_pv uuid;
  v_use_v2 boolean;
begin
  v_cached := public.verification_idempotency_begin('submit_agency_application', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.ozellik_bayragi_aktif_mi('agency_enabled') then
    raise exception 'Agency feature disabled';
  end if;

  v_use_v2 := public.ozellik_bayragi_aktif_mi('agency_verification_v2_enabled');
  v_status := case when v_use_v2 then 'SUBMITTED' else 'pending' end;

  select is_guest, coalesce(nullif(trim(display_name), ''), username)
    into v_guest, v_display
  from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Guest cannot create agency'; end if;

  if v_type not in ('INDIVIDUAL', 'COMPANY') then
    raise exception 'Geçersiz ajans türü';
  end if;
  if length(v_name) < 3 then raise exception 'Ajans adı en az 3 karakter olmalı'; end if;
  if v_country is null or length(v_country) < 2 then raise exception 'Ülke / bölge zorunlu'; end if;
  if v_email is null or position('@' in v_email) < 2 then raise exception 'Geçerli e-posta zorunlu'; end if;
  if v_phone is null or length(v_phone) < 7 then raise exception 'Telefon zorunlu'; end if;
  if v_description is null or length(v_description) < 20 then
    raise exception 'Ajans açıklaması en az 20 karakter olmalı';
  end if;
  if p_expected_hosts is null or p_expected_hosts < 1 or p_expected_hosts > 5000 then
    raise exception 'Beklenen yayıncı sayısı geçersiz';
  end if;
  if nullif(trim(coalesce(p_contact_first_name, '')), '') is null then
    raise exception 'Yetkili adı zorunlu';
  end if;
  if nullif(trim(coalesce(p_contact_last_name, '')), '') is null then
    raise exception 'Yetkili soyadı zorunlu';
  end if;

  if exists (
    select 1 from public.agency_applications
    where applicant_id = v_uid
      and status in (
        'pending', 'under_review', 'SUBMITTED', 'UNDER_REVIEW',
        'MORE_INFORMATION_REQUIRED', 'PRE_APPROVED', 'VERIFICATION_REQUIRED',
        'VERIFICATION_IN_REVIEW', 'VERIFIED', 'DRAFT'
      )
  ) then
    raise exception 'Zaten bekleyen bir ajans başvurun var';
  end if;

  -- Policy acceptances (required for V2)
  if v_use_v2 and p_policy_version_ids is not null then
    foreach v_pv in array p_policy_version_ids loop
      insert into public.policy_acceptances (user_id, policy_version_id, locale, acceptance_source)
      values (v_uid, v_pv, 'tr', 'agency_application')
      on conflict do nothing;
    end loop;
  end if;

  insert into public.agency_applications (
    applicant_id, agency_name, agency_type, contact_first_name, contact_last_name,
    country, city, address, email, phone, whatsapp, website, social_links,
    experience, expected_hosts, description, why_tamuso, existing_network,
    languages, target_countries, referral_code, status
  ) values (
    v_uid, v_name, v_type,
    nullif(trim(p_contact_first_name), ''),
    nullif(trim(p_contact_last_name), ''),
    v_country, nullif(trim(coalesce(p_city, '')), ''), nullif(trim(coalesce(p_address, '')), ''),
    v_email, v_phone, nullif(trim(coalesce(p_whatsapp, '')), ''),
    nullif(trim(coalesce(p_website, '')), ''),
    coalesce(p_social_links, '{}'::jsonb),
    nullif(trim(coalesce(p_experience, '')), ''),
    p_expected_hosts, v_description,
    nullif(trim(coalesce(p_why_tamuso, '')), ''),
    nullif(trim(coalesce(p_existing_network, '')), ''),
    coalesce(p_languages, '{}'::text[]),
    coalesce(p_target_countries, '{}'::text[]),
    nullif(trim(coalesce(p_referral_code, '')), ''),
    v_status
  ) returning * into v_row;

  insert into public.agency_verification_profiles (
    subject_type, subject_id, application_id, user_id, overall_status
  ) values (
    'APPLICATION', v_row.id, v_row.id, v_uid, 'NOT_STARTED'
  )
  on conflict (subject_type, subject_id) do nothing;

  perform public.verification_log_event(
    'APPLICATION_SUBMITTED', 'APPLICATION', v_row.id, null,
    jsonb_build_object('agency_name', v_name, 'agency_type', v_type)
  );

  perform public.admin_operasyon_bildirimi(
    'Yeni ajans başvurusu',
    coalesce(v_display, 'Kullanıcı') || ' · ' || v_name || ' · ' || v_country,
    '/admin/dogrulama',
    jsonb_build_object(
      'type', 'agency_application',
      'application_id', v_row.id,
      'agency_name', v_name,
      'applicant_id', v_uid
    )
  );

  perform public.bildirim_kuyruga_ekle(
    v_uid, 'system',
    'Başvurunuz alındı',
    'Ajans başvurunuz incelenecek. Belgeler şimdilik istenmiyor.',
    '/ajans',
    jsonb_build_object('type', 'agency_application_submitted', 'application_id', v_row.id)
  );

  v_result := jsonb_build_object('ok', true, 'id', v_row.id, 'status', v_row.status);
  perform public.verification_idempotency_finish('submit_agency_application', p_idempotency_key, v_result);
  return v_result;
end;
$$;

grant execute on function public.submit_agency_application(
  text, text, text, text, text, text, text, text, text, text, text, jsonb,
  text, int, text, text, text, text[], text[], text, uuid[], text
) to authenticated;

-- Keep legacy RPC working (delegates when V2 off, or thin wrap)
create or replace function public.ajans_basvurusu_olustur(
  p_agency_name text,
  p_country text default null,
  p_email text default null,
  p_phone text default null,
  p_experience text default null,
  p_expected_hosts int default null,
  p_description text default null
)
returns public.agency_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_name text := trim(coalesce(p_agency_name, ''));
  v_country text := nullif(trim(coalesce(p_country, '')), '');
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_experience text := nullif(trim(coalesce(p_experience, '')), '');
  v_description text := nullif(trim(coalesce(p_description, '')), '');
  v_row public.agency_applications%rowtype;
  v_display text;
  v_status text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.ozellik_bayragi_aktif_mi('agency_enabled') then
    raise exception 'Agency feature disabled';
  end if;

  select is_guest, coalesce(nullif(trim(display_name), ''), username)
    into v_guest, v_display
  from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Guest cannot create agency'; end if;

  if length(v_name) < 3 then raise exception 'Ajans adı en az 3 karakter olmalı'; end if;
  if v_country is null or length(v_country) < 2 then raise exception 'Ülke / bölge zorunlu'; end if;
  if v_email is null or position('@' in v_email) < 2 then raise exception 'Geçerli e-posta zorunlu'; end if;
  if v_phone is null or length(v_phone) < 7 then raise exception 'Telefon zorunlu (en az 7 karakter)'; end if;
  if v_description is null or length(v_description) < 20 then
    raise exception 'Ajans açıklaması en az 20 karakter olmalı';
  end if;
  if p_expected_hosts is null or p_expected_hosts < 1 then
    raise exception 'Beklenen host sayısı en az 1 olmalı';
  end if;
  if p_expected_hosts > 5000 then raise exception 'Beklenen host sayısı çok yüksek'; end if;

  if exists (
    select 1 from public.agency_applications
    where applicant_id = v_uid and status in (
      'pending', 'under_review', 'SUBMITTED', 'UNDER_REVIEW',
      'MORE_INFORMATION_REQUIRED', 'PRE_APPROVED', 'VERIFICATION_REQUIRED',
      'VERIFICATION_IN_REVIEW', 'DRAFT'
    )
  ) then
    raise exception 'Zaten bekleyen bir ajans başvurun var';
  end if;

  v_status := case
    when public.ozellik_bayragi_aktif_mi('agency_verification_v2_enabled') then 'SUBMITTED'
    else 'pending'
  end;

  insert into public.agency_applications (
    applicant_id, agency_name, agency_type, country, email, phone,
    experience, expected_hosts, description, status
  ) values (
    v_uid, v_name, 'INDIVIDUAL', v_country, v_email, v_phone,
    v_experience, p_expected_hosts, v_description, v_status
  ) returning * into v_row;

  insert into public.agency_verification_profiles (
    subject_type, subject_id, application_id, user_id, overall_status
  ) values ('APPLICATION', v_row.id, v_row.id, v_uid, 'NOT_STARTED')
  on conflict do nothing;

  perform public.admin_operasyon_bildirimi(
    'Yeni ajans başvurusu',
    coalesce(v_display, 'Kullanıcı') || ' · ' || v_name || ' · ' || v_country,
    case when public.ozellik_bayragi_aktif_mi('agency_verification_v2_enabled')
      then '/admin/dogrulama' else '/admin/ajanslar' end,
    jsonb_build_object('type', 'agency_application', 'application_id', v_row.id)
  );

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin application state transition (optimistic concurrency)
-- ---------------------------------------------------------------------------
create or replace function public.admin_agency_application_transition(
  p_application_id uuid,
  p_new_status text,
  p_row_version int,
  p_note text default null,
  p_user_message text default null,
  p_assign_self boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.agency_applications%rowtype;
  v_old text;
  v_allowed boolean := false;
begin
  if not public.admin_has_permission('agency.application.review') then
    raise exception 'Forbidden';
  end if;

  select * into v_app from public.agency_applications where id = p_application_id for update;
  if not found then raise exception 'Basvuru bulunamadi'; end if;
  if v_app.row_version <> p_row_version then
    raise exception 'Conflict: basvuru baska admin tarafindan guncellendi';
  end if;

  v_old := v_app.status;

  -- Allowed transitions
  if v_old in ('pending', 'SUBMITTED') and p_new_status in ('UNDER_REVIEW', 'under_review', 'REJECTED', 'rejected', 'MORE_INFORMATION_REQUIRED') then
    v_allowed := true;
  elsif v_old in ('under_review', 'UNDER_REVIEW') and p_new_status in (
    'MORE_INFORMATION_REQUIRED', 'PRE_APPROVED', 'REJECTED', 'rejected', 'approved'
  ) then
    v_allowed := true;
  elsif v_old = 'MORE_INFORMATION_REQUIRED' and p_new_status in ('UNDER_REVIEW', 'SUBMITTED', 'REJECTED') then
    v_allowed := true;
  elsif v_old = 'PRE_APPROVED' and p_new_status in ('VERIFICATION_REQUIRED', 'REJECTED') then
    v_allowed := true;
  elsif v_old = 'VERIFICATION_REQUIRED' and p_new_status in ('VERIFICATION_IN_REVIEW', 'REJECTED') then
    v_allowed := true;
  elsif v_old = 'VERIFICATION_IN_REVIEW' and p_new_status in ('VERIFIED', 'MORE_INFORMATION_REQUIRED', 'REJECTED') then
    v_allowed := true;
  elsif v_old = 'VERIFIED' and p_new_status in ('APPROVED', 'ACTIVE') then
    v_allowed := true;
  elsif v_old in ('APPROVED', 'approved', 'ACTIVE') and p_new_status in ('SUSPENDED', 'suspended', 'REVOKED', 'ACTIVE') then
    v_allowed := true;
  elsif v_old in ('SUSPENDED', 'suspended') and p_new_status in ('ACTIVE', 'REVOKED') then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'Gecersiz durum gecisi: % -> %', v_old, p_new_status;
  end if;

  -- V2 kapalıyken PRE_APPROVED yerine klasik onay yolu
  if p_new_status = 'PRE_APPROVED'
     and not public.ozellik_bayragi_aktif_mi('agency_verification_v2_enabled') then
    return public.admin_ajans_basvuru_onayla(p_application_id);
  end if;

  update public.agency_applications set
    status = p_new_status,
    review_note = coalesce(p_note, review_note),
    reviewed_at = now(),
    assigned_reviewer_id = case
      when p_assign_self then auth.uid()
      when assigned_reviewer_id is null then auth.uid()
      else assigned_reviewer_id
    end,
    row_version = row_version + 1
  where id = p_application_id
  returning * into v_app;

  if p_new_status = 'PRE_APPROVED' then
    update public.agency_applications set status = 'VERIFICATION_REQUIRED', row_version = row_version + 1
    where id = p_application_id
    returning * into v_app;

    perform public.bildirim_kuyruga_ekle(
      v_app.applicant_id, 'system',
      'Doğrulama işlemini tamamlayın',
      'Ajans hesabınızı etkinleştirmek için doğrulama işlemini tamamlayın.',
      '/ajans',
      jsonb_build_object('type', 'verification_required', 'application_id', p_application_id)
    );
  elsif p_new_status in ('UNDER_REVIEW', 'under_review') then
    perform public.bildirim_kuyruga_ekle(
      v_app.applicant_id, 'system',
      'Başvurunuz inceleniyor',
      'Ajans başvurunuz incelemede.',
      '/ajans',
      jsonb_build_object('type', 'agency_under_review', 'application_id', p_application_id)
    );
  elsif p_new_status = 'MORE_INFORMATION_REQUIRED' then
    perform public.bildirim_kuyruga_ekle(
      v_app.applicant_id, 'system',
      'Ek bilgi gerekiyor',
      coalesce(p_user_message, 'Ajans başvurunuz için ek bilgi gerekiyor.'),
      '/ajans',
      jsonb_build_object('type', 'agency_more_info', 'application_id', p_application_id)
    );
  elsif p_new_status in ('REJECTED', 'rejected') then
    perform public.bildirim_kuyruga_ekle(
      v_app.applicant_id, 'system',
      'Başvurunuz reddedildi',
      coalesce(p_user_message, 'Ajans başvurunuz reddedildi.'),
      '/ajans',
      jsonb_build_object('type', 'agency_rejected', 'application_id', p_application_id)
    );
  elsif p_new_status in ('APPROVED', 'ACTIVE', 'approved') then
    -- Create agency if not exists
    if v_app.agency_id is null then
      perform public.admin_ajans_basvuru_onayla_v2_finalize(p_application_id);
      select * into v_app from public.agency_applications where id = p_application_id;
    end if;
  end if;

  perform public.verification_log_event(
    'VERIFICATION_CHANGED', 'APPLICATION', p_application_id, p_note,
    jsonb_build_object('from', v_old, 'to', v_app.status, 'user_message', p_user_message)
  );

  return jsonb_build_object('ok', true, 'status', v_app.status, 'row_version', v_app.row_version);
end;
$$;

grant execute on function public.admin_agency_application_transition(uuid, text, int, text, text, boolean)
  to authenticated;

-- Finalize agency create from VERIFIED/APPROVED (shared with legacy approve when V2 on)
create or replace function public.admin_ajans_basvuru_onayla_v2_finalize(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.agency_applications%rowtype;
  v_agency public.agencies%rowtype;
  v_code text;
  v_prev_agency uuid;
begin
  if not public.admin_has_permission('agency.application.review') then
    raise exception 'Forbidden';
  end if;

  select * into v_app from public.agency_applications where id = p_application_id for update;
  if not found then raise exception 'Basvuru bulunamadi'; end if;

  if exists (
    select 1 from public.agencies
    where owner_id = v_app.applicant_id and status = 'active'
  ) then
    raise exception 'Basvaranin zaten aktif bir ajansi var';
  end if;

  v_code := upper(substr(md5(v_app.id::text || clock_timestamp()::text), 1, 8));

  insert into public.agencies (
    agency_public_id, name, country, description, logo_url,
    owner_id, invite_code, status, host_count, website_url
  ) values (
    public.yeni_ajans_public_id(),
    v_app.agency_name,
    v_app.country,
    v_app.description,
    nullif(trim(coalesce(v_app.logo_url, '')), ''),
    v_app.applicant_id,
    v_code,
    'active',
    1,
    v_app.website
  ) returning * into v_agency;

  insert into public.agency_wallets (agency_id) values (v_agency.id) on conflict do nothing;
  insert into public.agency_commission_rates (agency_id) values (v_agency.id) on conflict do nothing;
  insert into public.agency_transfer_limits (agency_id, unlimited)
  values (v_agency.id, false)
  on conflict (agency_id) do update set updated_at = now();

  select agency_id into v_prev_agency from public.host_profiles where user_id = v_app.applicant_id;

  insert into public.host_profiles (user_id, agency_id, status, joined_agency_at)
  values (v_app.applicant_id, v_agency.id, 'agency', now())
  on conflict (user_id) do update set
    agency_id = excluded.agency_id,
    status = 'agency',
    joined_agency_at = coalesce(host_profiles.joined_agency_at, excluded.joined_agency_at),
    updated_at = now();

  update public.profiles set is_host = true, updated_at = now() where id = v_app.applicant_id;
  insert into public.user_profile_stats (user_id) values (v_app.applicant_id) on conflict do nothing;
  update public.user_profile_stats set
    host_status = 'agency', agency_id = v_agency.id, updated_at = now()
  where user_id = v_app.applicant_id;

  if v_prev_agency is not null and v_prev_agency is distinct from v_agency.id then
    update public.agencies
    set host_count = greatest(0, host_count - 1), updated_at = now()
    where id = v_prev_agency;
  end if;

  update public.agency_applications set
    status = 'ACTIVE',
    agency_id = v_agency.id,
    reviewed_at = now(),
    row_version = row_version + 1
  where id = p_application_id;

  insert into public.agency_verification_profiles (
    subject_type, subject_id, agency_id, application_id, user_id,
    overall_status, progress_pct, identity_verified, contract_accepted
  ) values (
    'AGENCY', v_agency.id, v_agency.id, p_application_id, v_app.applicant_id,
    'VERIFIED', 100, true, true
  )
  on conflict (subject_type, subject_id) do update set
    overall_status = 'VERIFIED',
    agency_id = excluded.agency_id,
    updated_at = now();

  perform public.bildirim_kuyruga_ekle(
    v_app.applicant_id, 'system',
    'Ajans hesabınız etkinleştirildi',
    v_agency.name || ' aktif. Doğrulama tamamlandı.',
    '/ajans/yonetim',
    jsonb_build_object('agency_id', v_agency.id, 'type', 'agency_activated')
  );

  return jsonb_build_object('ok', true, 'agency_id', v_agency.id);
end;
$$;

grant execute on function public.admin_ajans_basvuru_onayla_v2_finalize(uuid) to authenticated;

-- Wrap legacy approve: if V2 on → PRE_APPROVED path; else classic
create or replace function public.admin_ajans_basvuru_onayla(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.agency_applications%rowtype;
  v_agency public.agencies%rowtype;
  v_code text;
  v_prev_agency uuid;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;

  select * into v_app from public.agency_applications where id = p_application_id for update;
  if not found then raise exception 'Basvuru bulunamadi'; end if;

  if public.ozellik_bayragi_aktif_mi('agency_verification_v2_enabled')
     and v_app.status in ('pending', 'SUBMITTED', 'under_review', 'UNDER_REVIEW') then
    update public.agency_applications set
      status = 'VERIFICATION_REQUIRED',
      reviewed_at = now(),
      assigned_reviewer_id = coalesce(assigned_reviewer_id, auth.uid()),
      row_version = row_version + 1
    where id = p_application_id;

    perform public.bildirim_kuyruga_ekle(
      v_app.applicant_id, 'system',
      'Doğrulama işlemini tamamlayın',
      'Ajans hesabınızı etkinleştirmek için doğrulama işlemini tamamlayın.',
      '/ajans',
      jsonb_build_object('type', 'verification_required', 'application_id', p_application_id)
    );

    perform public.verification_log_event(
      'PRE_APPROVED', 'APPLICATION', p_application_id, null, '{}'::jsonb
    );

    return jsonb_build_object('ok', true, 'status', 'VERIFICATION_REQUIRED', 'verification_required', true);
  end if;

  if v_app.status not in ('pending', 'under_review', 'VERIFIED', 'APPROVED', 'VERIFICATION_IN_REVIEW') then
    raise exception 'Basvuru zaten islenmis';
  end if;

  if exists (
    select 1 from public.agencies
    where owner_id = v_app.applicant_id and status = 'active'
  ) then
    raise exception 'Basvaranin zaten aktif bir ajansi var';
  end if;

  v_code := upper(substr(md5(v_app.id::text || clock_timestamp()::text), 1, 8));

  insert into public.agencies (
    agency_public_id, name, country, description, logo_url,
    owner_id, invite_code, status, host_count
  ) values (
    public.yeni_ajans_public_id(),
    v_app.agency_name,
    v_app.country,
    v_app.description,
    nullif(trim(coalesce(v_app.logo_url, '')), ''),
    v_app.applicant_id,
    v_code,
    'active',
    1
  ) returning * into v_agency;

  insert into public.agency_wallets (agency_id) values (v_agency.id) on conflict do nothing;
  insert into public.agency_commission_rates (agency_id) values (v_agency.id) on conflict do nothing;
  insert into public.agency_transfer_limits (agency_id, unlimited)
  values (v_agency.id, false)
  on conflict (agency_id) do update set
    unlimited = coalesce(public.agency_transfer_limits.unlimited, false),
    updated_at = now();

  select agency_id into v_prev_agency from public.host_profiles where user_id = v_app.applicant_id;

  insert into public.host_profiles (user_id, agency_id, status, joined_agency_at)
  values (v_app.applicant_id, v_agency.id, 'agency', now())
  on conflict (user_id) do update set
    agency_id = excluded.agency_id,
    status = 'agency',
    joined_agency_at = coalesce(host_profiles.joined_agency_at, excluded.joined_agency_at),
    updated_at = now();

  update public.profiles set is_host = true, updated_at = now() where id = v_app.applicant_id;
  insert into public.user_profile_stats (user_id) values (v_app.applicant_id) on conflict do nothing;
  update public.user_profile_stats set
    host_status = 'agency', agency_id = v_agency.id, updated_at = now()
  where user_id = v_app.applicant_id;

  if v_prev_agency is not null and v_prev_agency is distinct from v_agency.id then
    update public.agencies
    set host_count = greatest(0, host_count - 1), updated_at = now()
    where id = v_prev_agency;
  end if;

  update public.agency_applications set
    status = 'approved', agency_id = v_agency.id, reviewed_at = now()
  where id = p_application_id;

  insert into public.agency_verification_profiles (
    subject_type, subject_id, agency_id, application_id, user_id, overall_status, progress_pct
  ) values (
    'AGENCY', v_agency.id, v_agency.id, p_application_id, v_app.applicant_id, 'LEGACY_ACTIVE', 100
  ) on conflict do nothing;

  perform public.bildirim_kuyruga_ekle(
    v_app.applicant_id, 'system',
    'Ajansin onaylandi',
    v_agency.name || ' aktif. Ajansım’dan üyeleri, daveti, kuralları ve ciroyu yönetebilirsin. Coin yükleme için platform yetkisi gerekir.',
    '/ajans/yonetim',
    jsonb_build_object('agency_id', v_agency.id, 'type', 'agency_approved')
  );

  perform public.admin_audit_yaz(
    v_app.applicant_id, 'agency_approve', 'Ajans basvurusu onaylandi',
    jsonb_build_object('application_id', p_application_id, 'agency_id', v_agency.id)
  );

  return jsonb_build_object('ok', true, 'agency_id', v_agency.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Document upload session + submit
-- ---------------------------------------------------------------------------
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
  v_settings jsonb;
  v_allowed boolean := false;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_subject_type not in ('USER', 'AGENCY', 'APPLICATION') then
    raise exception 'Invalid subject';
  end if;

  -- Ownership
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

  v_settings := public.verification_settings_get();
  if p_document_type = any (
    select jsonb_array_elements_text(coalesce(v_settings->'allowed_identity_documents', '[]'::jsonb))
  ) or p_verification_type in (
    'IDENTITY', 'ADDRESS', 'CRIMINAL_RECORD_DOCUMENT', 'COMPANY',
    'AUTHORIZED_PERSON', 'PAYMENT_ACCOUNT', 'SELFIE', 'EXTRA', 'BENEFICIAL_OWNER'
  ) then
    v_allowed := true;
  end if;
  if not v_allowed then raise exception 'Belge türü izinli değil'; end if;

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

create or replace function public.submit_verification_document(
  p_session_id uuid,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_meta jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sess public.verification_upload_sessions%rowtype;
  v_doc_id uuid;
  v_profile_id uuid;
  v_settings jsonb;
  v_max bigint;
  v_mimes jsonb;
  v_cached jsonb;
  v_result jsonb;
begin
  v_cached := public.verification_idempotency_begin('submit_verification_document', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_sess from public.verification_upload_sessions
  where id = p_session_id and user_id = v_uid for update;
  if not found then raise exception 'Upload session bulunamadi'; end if;
  if v_sess.used_at is not null then raise exception 'Session already used'; end if;
  if v_sess.expires_at < now() then raise exception 'Upload session expired'; end if;

  v_settings := public.verification_settings_get();
  v_max := coalesce((v_settings->>'max_upload_bytes')::bigint, 10485760);
  v_mimes := coalesce(v_settings->'allowed_mime_types', '[]'::jsonb);
  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > v_max then
    raise exception 'Dosya boyutu geçersiz';
  end if;
  if not (v_mimes ? p_mime_type) and not exists (
    select 1 from jsonb_array_elements_text(v_mimes) t(x) where x = p_mime_type
  ) then
    raise exception 'MIME türü izinli değil';
  end if;

  select id into v_profile_id
  from public.agency_verification_profiles
  where subject_type = v_sess.subject_type and subject_id = v_sess.subject_id;

  if v_profile_id is null then
    insert into public.agency_verification_profiles (
      subject_type, subject_id, user_id, application_id, agency_id, overall_status
    ) values (
      v_sess.subject_type, v_sess.subject_id, v_uid,
      case when v_sess.subject_type = 'APPLICATION' then v_sess.subject_id else null end,
      case when v_sess.subject_type = 'AGENCY' then v_sess.subject_id else null end,
      'IN_PROGRESS'
    ) returning id into v_profile_id;
  end if;

  insert into public.verification_documents (
    subject_type, subject_id, profile_id, verification_type, document_type,
    storage_object_key, mime_type, file_size_bytes, status, created_by,
    issuing_country, issued_at, expires_at,
    holder_first_name, holder_last_name, birth_date, nationality,
    document_number_masked,
    company_legal_name, company_registration_number, tax_number,
    address_line, address_city, address_region, address_postal, address_country
  ) values (
    v_sess.subject_type, v_sess.subject_id, v_profile_id,
    v_sess.verification_type, v_sess.document_type,
    v_sess.storage_object_key, p_mime_type, p_file_size_bytes, 'SUBMITTED', v_uid,
    nullif(p_meta->>'issuing_country', ''),
    nullif(p_meta->>'issued_at', '')::date,
    nullif(p_meta->>'expires_at', '')::date,
    nullif(p_meta->>'holder_first_name', ''),
    nullif(p_meta->>'holder_last_name', ''),
    nullif(p_meta->>'birth_date', '')::date,
    nullif(p_meta->>'nationality', ''),
    case when p_meta ? 'document_number' and length(p_meta->>'document_number') > 4
      then repeat('*', greatest(0, length(p_meta->>'document_number') - 4)) || right(p_meta->>'document_number', 4)
      else nullif(p_meta->>'document_number_masked', '') end,
    nullif(p_meta->>'company_legal_name', ''),
    nullif(p_meta->>'company_registration_number', ''),
    nullif(p_meta->>'tax_number', ''),
    nullif(p_meta->>'address_line', ''),
    nullif(p_meta->>'address_city', ''),
    nullif(p_meta->>'address_region', ''),
    nullif(p_meta->>'address_postal', ''),
    nullif(p_meta->>'address_country', '')
  ) returning id into v_doc_id;

  update public.verification_upload_sessions set used_at = now() where id = p_session_id;

  update public.agency_verification_profiles set
    overall_status = case when overall_status in ('NOT_STARTED') then 'IN_PROGRESS' else overall_status end,
    updated_at = now()
  where id = v_profile_id;

  -- Application → VERIFICATION_IN_REVIEW when docs submitted
  if v_sess.subject_type = 'APPLICATION' then
    update public.agency_applications set
      status = case when status = 'VERIFICATION_REQUIRED' then 'VERIFICATION_IN_REVIEW' else status end,
      row_version = row_version + 1
    where id = v_sess.subject_id;
  end if;

  perform public.verification_log_event(
    'DOCUMENT_SUBMITTED', 'DOCUMENT', v_doc_id, null,
    jsonb_build_object('verification_type', v_sess.verification_type, 'document_type', v_sess.document_type)
  );

  perform public.bildirim_kuyruga_ekle(
    v_uid, 'system',
    'Belgeniz alındı',
    'Doğrulama belgeniz incelemeye alındı.',
    '/ajans',
    jsonb_build_object('type', 'document_submitted', 'document_id', v_doc_id)
  );

  v_result := jsonb_build_object('ok', true, 'document_id', v_doc_id, 'status', 'SUBMITTED');
  perform public.verification_idempotency_finish('submit_verification_document', p_idempotency_key, v_result);
  return v_result;
end;
$$;

grant execute on function public.submit_verification_document(uuid, text, bigint, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Review document
-- ---------------------------------------------------------------------------
create or replace function public.review_verification_document(
  p_document_id uuid,
  p_decision text,
  p_rejection_reason_code text default null,
  p_user_message text default null,
  p_internal_note text default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc public.verification_documents%rowtype;
  v_status text;
  v_cached jsonb;
  v_result jsonb;
  v_owner uuid;
begin
  v_cached := public.verification_idempotency_begin('review_verification_document', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  if p_decision = 'APPROVED' and not public.admin_has_permission('verification.approve') then
    raise exception 'Forbidden';
  end if;
  if p_decision in ('REJECTED', 'RESUBMISSION_REQUIRED') and not public.admin_has_permission('verification.reject') then
    raise exception 'Forbidden';
  end if;

  select * into v_doc from public.verification_documents where id = p_document_id for update;
  if not found then raise exception 'Belge bulunamadi'; end if;

  v_status := case p_decision
    when 'APPROVED' then 'VERIFIED'
    when 'REJECTED' then 'REJECTED'
    when 'RESUBMISSION_REQUIRED' then 'RESUBMISSION_REQUIRED'
    else null
  end;
  if v_status is null then raise exception 'Gecersiz karar'; end if;

  if p_decision <> 'APPROVED' and coalesce(p_user_message, '') = '' then
    p_user_message := 'Gönderdiğiniz belge doğrulanamadı. Lütfen geçerli ve okunabilir bir belge yükleyin.';
  end if;

  update public.verification_documents set
    status = v_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    rejection_reason_code = p_rejection_reason_code,
    user_message = p_user_message,
    internal_note = p_internal_note,
    updated_at = now()
  where id = p_document_id;

  insert into public.verification_reviews (
    document_id, profile_id, reviewer_id, decision,
    rejection_reason_code, user_message, internal_note
  ) values (
    p_document_id, v_doc.profile_id, auth.uid(), p_decision,
    p_rejection_reason_code, p_user_message, p_internal_note
  );

  if p_decision = 'APPROVED' and v_doc.profile_id is not null then
    update public.agency_verification_profiles set
      identity_verified = case when v_doc.verification_type = 'IDENTITY' then true else identity_verified end,
      address_verified = case when v_doc.verification_type = 'ADDRESS' then true else address_verified end,
      company_verified = case when v_doc.verification_type = 'COMPANY' then true else company_verified end,
      authorized_person_verified = case when v_doc.verification_type = 'AUTHORIZED_PERSON' then true else authorized_person_verified end,
      payment_account_verified = case when v_doc.verification_type = 'PAYMENT_ACCOUNT' then true else payment_account_verified end,
      extra_docs_reviewed = case when v_doc.verification_type in ('EXTRA', 'CRIMINAL_RECORD_DOCUMENT') then true else extra_docs_reviewed end,
      updated_at = now()
    where id = v_doc.profile_id;
    perform public.avp_recalc_progress(v_doc.profile_id);
  end if;

  perform public.verification_log_event(
    case when p_decision = 'APPROVED' then 'DOCUMENT_APPROVED' else 'DOCUMENT_REJECTED' end,
    'DOCUMENT', p_document_id, p_internal_note,
    jsonb_build_object('decision', p_decision, 'reason_code', p_rejection_reason_code)
  );

  v_owner := v_doc.created_by;
  if v_owner is not null then
    perform public.bildirim_kuyruga_ekle(
      v_owner, 'system',
      case when p_decision = 'APPROVED' then 'Belgeniz doğrulandı'
           when p_decision = 'RESUBMISSION_REQUIRED' then 'Belgenizi yeniden göndermeniz gerekiyor'
           else 'Belge incelenemedi' end,
      coalesce(p_user_message, ''),
      '/ajans',
      jsonb_build_object('type', 'document_reviewed', 'document_id', p_document_id, 'decision', p_decision)
    );
  end if;

  v_result := jsonb_build_object('ok', true, 'status', v_status);
  perform public.verification_idempotency_finish('review_verification_document', p_idempotency_key, v_result);
  return v_result;
end;
$$;

grant execute on function public.review_verification_document(uuid, text, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Approve verification components (checklist — not single verified=true)
-- ---------------------------------------------------------------------------
create or replace function public.approve_agency_verification_components(
  p_profile_id uuid,
  p_identity boolean default null,
  p_address boolean default null,
  p_company boolean default null,
  p_authorized_person boolean default null,
  p_extra_docs boolean default null,
  p_payment_account boolean default null,
  p_contract boolean default null,
  p_row_version int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.agency_verification_profiles%rowtype;
begin
  if not public.admin_has_permission('verification.approve') then
    raise exception 'Forbidden';
  end if;

  select * into v_p from public.agency_verification_profiles where id = p_profile_id for update;
  if not found then raise exception 'Profil bulunamadi'; end if;
  if p_row_version is not null and v_p.row_version <> p_row_version then
    raise exception 'Conflict: profil guncellendi';
  end if;

  update public.agency_verification_profiles set
    identity_verified = coalesce(p_identity, identity_verified),
    address_verified = coalesce(p_address, address_verified),
    company_verified = coalesce(p_company, company_verified),
    authorized_person_verified = coalesce(p_authorized_person, authorized_person_verified),
    extra_docs_reviewed = coalesce(p_extra_docs, extra_docs_reviewed),
    payment_account_verified = coalesce(p_payment_account, payment_account_verified),
    contract_accepted = coalesce(p_contract, contract_accepted),
    updated_at = now(),
    row_version = row_version + 1
  where id = p_profile_id;

  perform public.avp_recalc_progress(p_profile_id);
  perform public.verification_log_event(
    'COMPONENTS_UPDATED', 'PROFILE', p_profile_id, null,
    jsonb_build_object(
      'identity', p_identity, 'address', p_address, 'company', p_company,
      'authorized_person', p_authorized_person, 'payment', p_payment_account, 'contract', p_contract
    )
  );

  select * into v_p from public.agency_verification_profiles where id = p_profile_id;
  return jsonb_build_object(
    'ok', true,
    'overall_status', v_p.overall_status,
    'progress_pct', v_p.progress_pct,
    'row_version', v_p.row_version
  );
end;
$$;

grant execute on function public.approve_agency_verification_components(
  uuid, boolean, boolean, boolean, boolean, boolean, boolean, boolean, int
) to authenticated;

-- ---------------------------------------------------------------------------
-- Manual override (audited)
-- ---------------------------------------------------------------------------
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
begin
  v_cached := public.verification_idempotency_begin('manual_verification_override', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  if not public.admin_has_permission('verification.override') then
    raise exception 'Forbidden: override';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Reason zorunlu'; end if;
  if nullif(trim(coalesce(p_internal_note, '')), '') is null then raise exception 'Internal note zorunlu'; end if;

  select * into v_p from public.agency_verification_profiles
  where subject_type = p_subject_type and subject_id = p_subject_id for update;
  if not found then raise exception 'Profil bulunamadi'; end if;

  v_prev := v_p.overall_status;
  update public.agency_verification_profiles set
    overall_status = p_new_status,
    updated_at = now(),
    row_version = row_version + 1
  where id = v_p.id;

  insert into public.verification_manual_overrides (
    admin_user_id, subject_type, subject_id, profile_id,
    previous_status, new_status, reason, internal_note
  ) values (
    auth.uid(), p_subject_type, p_subject_id, v_p.id,
    v_prev, p_new_status, p_reason, p_internal_note
  );

  perform public.verification_log_event(
    'MANUAL_OVERRIDE', 'PROFILE', v_p.id, p_reason,
    jsonb_build_object('from', v_prev, 'to', p_new_status, 'note', p_internal_note)
  );

  v_result := jsonb_build_object('ok', true, 'previous', v_prev, 'new_status', p_new_status);
  perform public.verification_idempotency_finish('manual_verification_override', p_idempotency_key, v_result);
  return v_result;
end;
$$;

grant execute on function public.manual_verification_override(text, uuid, text, text, text, text)
  to authenticated;

-- Signed URL audit (client creates signed URL via storage; this logs view)
create or replace function public.log_verification_document_view(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc public.verification_documents%rowtype;
begin
  if not public.admin_has_permission('verification.document.read')
     and not exists (
       select 1 from public.verification_documents where id = p_document_id and created_by = auth.uid()
     ) then
    raise exception 'Forbidden';
  end if;

  select * into v_doc from public.verification_documents where id = p_document_id;
  if not found then raise exception 'Belge bulunamadi'; end if;

  -- Return key for client to sign — never log the signed URL itself
  perform public.verification_log_event(
    'DOCUMENT_VIEWED', 'DOCUMENT', p_document_id, null,
    jsonb_build_object('bucket', v_doc.storage_bucket)
  );

  return jsonb_build_object(
    'ok', true,
    'bucket', v_doc.storage_bucket,
    'path', v_doc.storage_object_key
  );
end;
$$;

grant execute on function public.log_verification_document_view(uuid) to authenticated;

-- Policy accept with agency + version lock
create or replace function public.accept_policy_version(
  p_policy_version_id uuid,
  p_agency_id uuid default null,
  p_locale text default null,
  p_acceptance_source text default 'app',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cached jsonb;
  v_result jsonb;
  v_exists boolean;
begin
  v_cached := public.verification_idempotency_begin('accept_policy_version', p_idempotency_key);
  if v_cached is not null then return v_cached; end if;

  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.ozellik_bayragi_aktif_mi('policies_enabled')
     and not public.ozellik_bayragi_aktif_mi('agency_verification_v2_enabled') then
    raise exception 'Policies disabled';
  end if;

  select exists(select 1 from public.policy_versions where id = p_policy_version_id) into v_exists;
  if not v_exists then raise exception 'Policy version bulunamadi'; end if;

  insert into public.policy_acceptances (
    user_id, policy_version_id, agency_id, locale, acceptance_source, accepted_at
  ) values (
    v_uid, p_policy_version_id, p_agency_id, p_locale, p_acceptance_source, now()
  )
  on conflict do nothing;

  if p_agency_id is not null then
    update public.agency_verification_profiles set
      contract_accepted = true, updated_at = now()
    where subject_type = 'AGENCY' and subject_id = p_agency_id;
  end if;

  v_result := jsonb_build_object('ok', true, 'policy_version_id', p_policy_version_id);
  perform public.verification_idempotency_finish('accept_policy_version', p_idempotency_key, v_result);
  return v_result;
end;
$$;

grant execute on function public.accept_policy_version(uuid, uuid, text, text, text) to authenticated;

-- Appeal
create or replace function public.request_verification_appeal(
  p_application_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.agency_applications%rowtype;
  v_settings jsonb;
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_settings := public.verification_settings_get();
  if coalesce((v_settings->>'appeal_enabled')::boolean, false) is not true then
    raise exception 'Itiraz kapali';
  end if;

  select * into v_app from public.agency_applications where id = p_application_id;
  if not found or v_app.applicant_id <> v_uid then raise exception 'Forbidden'; end if;
  if v_app.status not in ('REJECTED', 'rejected') then
    raise exception 'Sadece reddedilen basvurular icin itiraz';
  end if;

  if exists (
    select 1 from public.verification_appeals
    where application_id = p_application_id and status in ('OPEN', 'UNDER_REVIEW')
  ) then
    raise exception 'Zaten acik itiraz var';
  end if;

  insert into public.verification_appeals (
    application_id, appellant_id, status, original_reviewer_id, reason
  ) values (
    p_application_id, v_uid, 'OPEN', v_app.assigned_reviewer_id, p_reason
  ) returning id into v_id;

  perform public.verification_log_event('APPEAL_OPENED', 'APPEAL', v_id, p_reason, '{}'::jsonb);
  return jsonb_build_object('ok', true, 'appeal_id', v_id);
end;
$$;

grant execute on function public.request_verification_appeal(uuid, text) to authenticated;

-- Admin dashboard stats
create or replace function public.admin_verification_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('verification.metadata.read') then
    raise exception 'Forbidden';
  end if;

  return jsonb_build_object(
    'pending_applications', (
      select count(*) from public.agency_applications
      where status in ('pending', 'SUBMITTED', 'UNDER_REVIEW', 'under_review')
    ),
    'today', (
      select count(*) from public.agency_applications
      where created_at >= date_trunc('day', now())
    ),
    'in_review', (
      select count(*) from public.agency_applications
      where status in ('UNDER_REVIEW', 'under_review', 'VERIFICATION_IN_REVIEW')
    ),
    'awaiting_docs', (
      select count(*) from public.agency_applications
      where status in ('VERIFICATION_REQUIRED', 'MORE_INFORMATION_REQUIRED')
    ),
    'manual_review', (
      select count(*) from public.agency_verification_profiles
      where overall_status in ('IN_REVIEW', 'REVIEW_REQUIRED') or risk_level = 'REVIEW_REQUIRED'
    ),
    'verified', (
      select count(*) from public.agency_verification_profiles where overall_status = 'VERIFIED'
    ),
    'rejected', (
      select count(*) from public.agency_applications where status in ('REJECTED', 'rejected')
    ),
    'expiring_docs', (
      select count(*) from public.verification_documents
      where expires_at is not null
        and expires_at <= now() + interval '30 days'
        and status = 'VERIFIED'
    ),
    'high_risk', (
      select count(*) from public.verification_risk_signals
      where resolved = false and severity in ('HIGH', 'REVIEW_REQUIRED')
    ),
    'pending_kyc', (
      select count(*) from public.kyc_applications where status = 'pending'
    )
  );
end;
$$;

grant execute on function public.admin_verification_dashboard() to authenticated;

create or replace function public.admin_verification_queue(
  p_kind text default 'agency',
  p_limit int default 40,
  p_status text default null,
  p_country text default null,
  p_agency_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('verification.metadata.read') then
    raise exception 'Forbidden';
  end if;

  if p_kind = 'user_kyc' then
    return coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id,
        'user_id', k.user_id,
        'status', k.status,
        'doc_type', k.doc_type,
        'created_at', k.created_at,
        'display_name', p.display_name,
        'public_user_id', p.public_user_id
      ) order by k.created_at desc)
      from (
        select * from public.kyc_applications
        where (p_status is null or status = p_status)
        order by created_at desc
        limit least(coalesce(p_limit, 40), 100)
      ) k
      left join public.profiles p on p.id = k.user_id
    ), '[]'::jsonb);
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'agency_name', a.agency_name,
      'agency_type', a.agency_type,
      'status', a.status,
      'country', a.country,
      'city', a.city,
      'email', a.email,
      'phone', a.phone,
      'risk_level', a.risk_level,
      'created_at', a.created_at,
      'row_version', a.row_version,
      'assigned_reviewer_id', a.assigned_reviewer_id,
      'applicant_id', a.applicant_id,
      'applicant_name', p.display_name,
      'applicant_public_id', p.public_user_id
    ) order by a.created_at desc)
    from (
      select * from public.agency_applications
      where (p_status is null or status = p_status)
        and (p_country is null or country = p_country)
        and (p_agency_type is null or agency_type = p_agency_type)
      order by created_at desc
      limit least(coalesce(p_limit, 40), 100)
    ) a
    left join public.profiles p on p.id = a.applicant_id
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_verification_queue(text, int, text, text, text) to authenticated;

-- User/agency verification center payload (no document URLs)
create or replace function public.agency_verification_center_get(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_a public.agencies%rowtype;
  v_p public.agency_verification_profiles%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_a from public.agencies where id = p_agency_id;
  if not found then raise exception 'Ajans bulunamadi'; end if;
  if v_a.owner_id <> v_uid and not public.admin_has_permission('verification.metadata.read') then
    raise exception 'Forbidden';
  end if;

  select * into v_p from public.agency_verification_profiles
  where subject_type = 'AGENCY' and subject_id = p_agency_id;

  return jsonb_build_object(
    'profile', case when v_p.id is null then null else jsonb_build_object(
      'id', v_p.id,
      'overall_status', v_p.overall_status,
      'progress_pct', v_p.progress_pct,
      'identity_verified', v_p.identity_verified,
      'address_verified', v_p.address_verified,
      'company_verified', v_p.company_verified,
      'authorized_person_verified', v_p.authorized_person_verified,
      'extra_docs_reviewed', v_p.extra_docs_reviewed,
      'payment_account_verified', v_p.payment_account_verified,
      'contract_accepted', v_p.contract_accepted,
      'risk_level', v_p.risk_level,
      'row_version', v_p.row_version
    ) end,
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'verification_type', d.verification_type,
        'document_type', d.document_type,
        'status', d.status,
        'submitted_at', d.submitted_at,
        'expires_at', d.expires_at,
        'user_message', d.user_message,
        'rejection_reason_code', d.rejection_reason_code
      ) order by d.submitted_at desc)
      from public.verification_documents d
      where d.subject_type = 'AGENCY' and d.subject_id = p_agency_id
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.agency_verification_center_get(uuid) to authenticated;

create or replace function public.my_agency_application_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return coalesce((
    select jsonb_build_object(
      'id', a.id,
      'agency_name', a.agency_name,
      'agency_type', a.agency_type,
      'status', a.status,
      'review_note', a.review_note,
      'created_at', a.created_at,
      'agency_id', a.agency_id,
      'row_version', a.row_version
    )
    from public.agency_applications a
    where a.applicant_id = v_uid
    order by a.created_at desc
    limit 1
  ), 'null'::jsonb);
end;
$$;

grant execute on function public.my_agency_application_status() to authenticated;

-- Settings update
create or replace function public.admin_verification_settings_update(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_has_permission('verification.settings.manage') then
    raise exception 'Forbidden';
  end if;
  update public.verification_settings set
    settings = coalesce(settings, '{}'::jsonb) || coalesce(p_settings, '{}'::jsonb),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1;
  perform public.verification_log_event('SETTINGS_UPDATED', 'SETTINGS', null, null, p_settings);
  return public.verification_settings_get();
end;
$$;

grant execute on function public.admin_verification_settings_update(jsonb) to authenticated;

-- Risk signal helper
create or replace function public.verification_raise_risk_signal(
  p_subject_type text,
  p_subject_id uuid,
  p_signal_code text,
  p_severity text,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.verification_risk_signals (
    subject_type, subject_id, signal_code, severity, details
  ) values (
    p_subject_type, p_subject_id, p_signal_code, p_severity, coalesce(p_details, '{}'::jsonb)
  ) returning id into v_id;

  update public.agency_verification_profiles set
    risk_level = case
      when p_severity = 'REVIEW_REQUIRED' then 'REVIEW_REQUIRED'
      when p_severity = 'HIGH' and risk_level not in ('REVIEW_REQUIRED') then 'HIGH'
      when p_severity = 'MEDIUM' and risk_level in ('LOW') then 'MEDIUM'
      else risk_level
    end,
    updated_at = now()
  where subject_type = p_subject_type and subject_id = p_subject_id;

  return v_id;
end;
$$;

-- Retention job skeleton (callable by cron / service role)
create or replace function public.verification_retention_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb := public.verification_settings_get();
  v_days int;
  v_count int := 0;
begin
  -- Only service role / admin
  if auth.role() <> 'service_role' and not public.ben_admin_miyim() then
    raise exception 'Forbidden';
  end if;

  v_days := nullif(v_settings->>'rejected_application_retention_policy_days', '')::int;
  if v_days is not null then
    -- Anonymize metadata on old rejected docs (do not delete audit events)
    update public.verification_documents set
      holder_first_name = null,
      holder_last_name = null,
      document_number_masked = null,
      document_number_ciphertext = null,
      address_line = null,
      internal_note = '[anonymized]',
      updated_at = now()
    where status in ('REJECTED')
      and created_at < now() - make_interval(days => v_days);
    get diagnostics v_count = row_count;
  end if;

  return jsonb_build_object('ok', true, 'anonymized_docs', v_count);
end;
$$;

grant execute on function public.verification_retention_sweep() to authenticated;

-- Manual user verification actions
create or replace function public.admin_user_verification_action(
  p_user_id uuid,
  p_action text,
  p_note text default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.agency_verification_profiles%rowtype;
  v_new text;
begin
  if not public.admin_has_permission('verification.approve')
     and not public.admin_has_permission('verification.reject') then
    raise exception 'Forbidden';
  end if;

  select * into v_p from public.agency_verification_profiles
  where subject_type = 'USER' and subject_id = p_user_id for update;

  if not found then
    insert into public.agency_verification_profiles (
      subject_type, subject_id, user_id, overall_status
    ) values ('USER', p_user_id, p_user_id, 'NOT_STARTED')
    returning * into v_p;
  end if;

  v_new := case p_action
    when 'REQUEST_VERIFICATION' then 'IN_PROGRESS'
    when 'VERIFY' then 'VERIFIED'
    when 'REJECT' then 'REJECTED'
    when 'REQUEST_NEW_DOCUMENT' then 'REVERIFICATION_REQUIRED'
    when 'SUSPEND_VERIFICATION' then 'SUSPENDED'
    when 'REVOKE_VERIFICATION' then 'REVOKED'
    else null
  end;
  if v_new is null then raise exception 'Gecersiz aksiyon'; end if;

  if p_action in ('VERIFY') then
    update public.agency_verification_profiles set
      overall_status = 'VERIFIED',
      identity_verified = true,
      progress_pct = 100,
      updated_at = now(),
      row_version = row_version + 1
    where id = v_p.id;

    if public.ozellik_bayragi_aktif_mi('agency_verification_sync_wallet_kyc') then
      update public.wallet_accounts set kyc_status = 'approved', updated_at = now()
      where user_id = p_user_id;
      update public.profiles set is_verified = true, updated_at = now() where id = p_user_id;
    end if;
  else
    update public.agency_verification_profiles set
      overall_status = v_new,
      updated_at = now(),
      row_version = row_version + 1
    where id = v_p.id;
  end if;

  if p_action in ('REVOKE_VERIFICATION', 'SUSPEND_VERIFICATION') then
    insert into public.verification_manual_overrides (
      admin_user_id, subject_type, subject_id, profile_id,
      previous_status, new_status, reason, internal_note
    ) values (
      auth.uid(), 'USER', p_user_id, v_p.id,
      v_p.overall_status, v_new,
      coalesce(p_reason, p_action),
      coalesce(p_note, p_action)
    );
  end if;

  perform public.verification_log_event(
    'USER_VERIFICATION_' || p_action, 'USER', p_user_id, p_reason,
    jsonb_build_object('note', p_note)
  );

  perform public.bildirim_kuyruga_ekle(
    p_user_id, 'system',
    'Doğrulama durumu güncellendi',
    coalesce(p_note, 'Hesap doğrulama durumunuz güncellendi.'),
    '/kyc',
    jsonb_build_object('type', 'user_verification', 'action', p_action)
  );

  return jsonb_build_object('ok', true, 'status', v_new);
end;
$$;

grant execute on function public.admin_user_verification_action(uuid, text, text, text) to authenticated;

-- Expand admin application list to include V2 statuses
create or replace function public.admin_ajans_basvuru_listesi(p_limit int default 40)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'agency_name', a.agency_name,
      'agency_type', a.agency_type,
      'status', a.status,
      'country', a.country,
      'city', a.city,
      'email', a.email,
      'phone', a.phone,
      'whatsapp', a.whatsapp,
      'experience', a.experience,
      'expected_hosts', a.expected_hosts,
      'description', a.description,
      'why_tamuso', a.why_tamuso,
      'contact_first_name', a.contact_first_name,
      'contact_last_name', a.contact_last_name,
      'logo_url', a.logo_url,
      'created_at', a.created_at,
      'row_version', a.row_version,
      'risk_level', a.risk_level,
      'assigned_reviewer_id', a.assigned_reviewer_id,
      'applicant_id', a.applicant_id,
      'applicant_name', p.display_name,
      'applicant_username', p.username,
      'applicant_public_id', p.public_user_id,
      'applicant_avatar', p.avatar_url
    ) order by a.created_at desc)
    from (
      select * from public.agency_applications
      where status in (
        'pending', 'under_review', 'SUBMITTED', 'UNDER_REVIEW',
        'MORE_INFORMATION_REQUIRED', 'PRE_APPROVED', 'VERIFICATION_REQUIRED',
        'VERIFICATION_IN_REVIEW'
      )
      order by created_at desc
      limit least(coalesce(p_limit, 40), 100)
    ) a
    left join public.profiles p on p.id = a.applicant_id
  ), '[]'::jsonb);
end;
$$;
