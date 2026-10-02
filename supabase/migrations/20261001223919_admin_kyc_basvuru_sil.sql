-- Kimlik onayı silme yetkisi (kyc.delete) ve onay kaydını kaldırma

insert into public.admin_role_permissions (role_code, permission_code) values
  ('SUPER_ADMIN', 'kyc.delete'),
  ('VERIFICATION_REVIEWER', 'kyc.delete')
on conflict do nothing;

create or replace function public.admin_kyc_basvuru_sil(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kyc_applications%rowtype;
  v_next public.kyc_applications%rowtype;
  v_still_identity boolean;
  v_official boolean;
begin
  if not public.admin_has_permission('kyc.delete') then
    raise exception 'Forbidden';
  end if;
  if p_id is null then
    raise exception 'KYC not found';
  end if;

  select * into v_row
  from public.kyc_applications
  where id = p_id
  for update;

  if not found then
    raise exception 'KYC not found';
  end if;

  delete from storage.objects
  where bucket_id = 'kyc-docs'
    and name = any (
      array_remove(
        array[v_row.doc_front_path, v_row.doc_back_path, v_row.selfie_path],
        null
      )
    );

  delete from public.kyc_applications where id = v_row.id;

  select * into v_next
  from public.kyc_applications
  where user_id = v_row.user_id
  order by
    case status
      when 'approved' then 0
      when 'pending' then 1
      when 'rejected' then 2
      else 3
    end,
    created_at desc
  limit 1;

  if not found then
    update public.wallet_accounts set
      kyc_status = 'none',
      legal_first_name = null,
      legal_last_name = null,
      updated_at = now()
    where user_id = v_row.user_id;
  else
    update public.wallet_accounts set
      kyc_status = case v_next.status
        when 'approved' then 'approved'
        when 'pending' then 'pending'
        when 'rejected' then 'rejected'
        else 'none'
      end,
      legal_first_name = case
        when v_next.status = 'approved' then v_next.first_name
        else null
      end,
      legal_last_name = case
        when v_next.status = 'approved' then v_next.last_name
        else null
      end,
      updated_at = now()
    where user_id = v_row.user_id;
  end if;

  select coalesce(is_platform_official, false) or coalesce(is_platform_yargic, false)
    into v_official
  from public.profiles
  where id = v_row.user_id;

  v_still_identity := exists (
    select 1
    from public.kyc_applications
    where user_id = v_row.user_id and status = 'approved'
  ) or exists (
    select 1
    from public.agency_verification_profiles
    where subject_type = 'USER'
      and subject_id = v_row.user_id
      and identity_verified
  );

  if v_row.status = 'approved' and not v_still_identity and not coalesce(v_official, false) then
    update public.profiles
    set is_verified = false, updated_at = now()
    where id = v_row.user_id;
  end if;

  perform public.admin_audit_yaz(
    v_row.user_id,
    'kyc_delete',
    'Kimlik onayı silindi',
    jsonb_build_object(
      'application_id', v_row.id,
      'status', v_row.status,
      'doc_type', v_row.doc_type
    )
  );

  return jsonb_build_object('ok', true, 'user_id', v_row.user_id, 'status', v_row.status);
end;
$$;

revoke all on function public.admin_kyc_basvuru_sil(uuid) from public;
grant execute on function public.admin_kyc_basvuru_sil(uuid) to authenticated;
