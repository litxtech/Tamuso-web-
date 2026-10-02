-- Ajans yöneticisi: kullanıcı adı ile ata, yetkiyi kaldır, atanan kişi ajansı görsün.

create or replace function public.ajans_yonetici_ata(
  p_agency_id uuid,
  p_username text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := lower(trim(both '@' from trim(coalesce(p_username, ''))));
  v_user uuid;
  v_owner uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_name = '' or length(v_name) < 2 then
    raise exception 'Kullanıcı adı gerekli';
  end if;

  perform public.agency_require_permission(p_agency_id, 'agency.manage_roles');

  select owner_id into v_owner
  from public.agencies
  where id = p_agency_id and status <> 'closed';
  if not found then raise exception 'Ajans bulunamadı'; end if;

  select id into v_user
  from public.profiles
  where lower(username) = v_name
  limit 1;
  if v_user is null then raise exception 'Kullanıcı bulunamadı'; end if;
  if v_user = v_owner then raise exception 'Ajans sahibi zaten yönetici'; end if;

  insert into public.agency_staff_roles (agency_id, user_id, role_code, assigned_by)
  values (p_agency_id, v_user, 'MANAGER', v_uid)
  on conflict (agency_id, user_id) do update set
    role_code = 'MANAGER',
    assigned_by = v_uid,
    updated_at = now()
  where public.agency_staff_roles.role_code <> 'OWNER';

  perform public.agency_audit_yaz(
    p_agency_id, 'staff_assign',
    'Yönetici atandı', v_user,
    jsonb_build_object('role', 'MANAGER', 'username', v_name)
  );

  return jsonb_build_object('ok', true, 'user_id', v_user, 'role', 'MANAGER');
end;
$$;

grant execute on function public.ajans_yonetici_ata(uuid, text) to authenticated;

create or replace function public.ajans_yonetici_iptal(
  p_agency_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_uye boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  perform public.agency_require_permission(p_agency_id, 'agency.manage_roles');

  select role_code into v_role
  from public.agency_staff_roles
  where agency_id = p_agency_id and user_id = p_user_id;
  if not found then raise exception 'Yönetici kaydı yok'; end if;
  if v_role = 'OWNER' then raise exception 'Sahip yetkisi kaldırılamaz'; end if;
  if v_role <> 'MANAGER' then raise exception 'Bu kişi yönetici değil'; end if;

  select exists (
    select 1 from public.host_profiles
    where agency_id = p_agency_id and user_id = p_user_id and status = 'agency'
  ) into v_uye;

  if v_uye then
    update public.agency_staff_roles
    set role_code = 'MEMBER', assigned_by = v_uid, updated_at = now()
    where agency_id = p_agency_id and user_id = p_user_id;
  else
    delete from public.agency_staff_roles
    where agency_id = p_agency_id and user_id = p_user_id and role_code = 'MANAGER';
  end if;

  perform public.agency_audit_yaz(
    p_agency_id, 'staff_revoke',
    'Yönetici yetkisi kaldırıldı', p_user_id,
    jsonb_build_object('role', 'MANAGER')
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.ajans_yonetici_iptal(uuid, uuid) to authenticated;

create or replace function public.ajans_uye_durumum(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_hedef uuid;
  v_kendim boolean;
  v_agency public.agencies%rowtype;
  v_app public.host_applications%rowtype;
  v_role text := 'none';
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_hedef := coalesce(p_user_id, v_uid);
  v_kendim := (v_hedef = v_uid);

  select a.* into v_agency
  from public.agencies a
  where a.owner_id = v_hedef
    and a.status <> 'closed'
  order by a.created_at desc
  limit 1;
  if found then
    v_role := 'owner';
  else
    select a.* into v_agency
    from public.agency_staff_roles s
    join public.agencies a on a.id = s.agency_id
    where s.user_id = v_hedef
      and s.role_code = 'MANAGER'
      and a.status <> 'closed'
    order by s.updated_at desc
    limit 1;
    if found then
      v_role := 'manager';
    else
      select a.* into v_agency
      from public.host_profiles hp
      join public.agencies a on a.id = hp.agency_id
      where hp.user_id = v_hedef
        and hp.status = 'agency'
        and hp.agency_id is not null
        and a.status <> 'closed'
      limit 1;
      if found then
        v_role := 'member';
      elsif v_kendim then
        select ha.* into v_app
        from public.host_applications ha
        where ha.user_id = v_hedef
          and ha.path = 'join_agency'
          and ha.status = 'agency_review'
        order by ha.created_at desc
        limit 1;
        if found and v_app.agency_id is not null then
          select * into v_agency from public.agencies where id = v_app.agency_id;
          if found and v_agency.status <> 'closed' then
            v_role := 'pending';
          end if;
        end if;
      end if;
    end if;
  end if;

  if v_role = 'none' then
    return jsonb_build_object(
      'role', 'none',
      'agency', null,
      'application_id', null,
      'application_status', null
    );
  end if;

  return jsonb_build_object(
    'role', v_role,
    'agency', jsonb_build_object(
      'id', v_agency.id,
      'agency_public_id', v_agency.agency_public_id,
      'name', v_agency.name,
      'logo_url', v_agency.logo_url,
      'slogan', v_agency.slogan,
      'status', v_agency.status,
      'owner_id', v_agency.owner_id
    ),
    'application_id', case when v_role = 'pending' then v_app.id else null end,
    'application_status', case when v_role = 'pending' then v_app.status else null end
  );
end;
$$;

grant execute on function public.ajans_uye_durumum(uuid) to authenticated;

create or replace function public.ajans_yonetim_ajanslarim()
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
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'agency_public_id', a.agency_public_id,
      'name', a.name,
      'status', a.status,
      'is_coin_distributor', a.is_coin_distributor,
      'invite_code', a.invite_code,
      'host_count', a.host_count,
      'level_code', a.level_code,
      'logo_url', a.logo_url,
      'username', a.username,
      'is_verified', coalesce(a.is_verified, false),
      'my_role', case
        when a.owner_id = v_uid then 'OWNER'
        else (
          select s.role_code from public.agency_staff_roles s
          where s.agency_id = a.id and s.user_id = v_uid
          limit 1
        )
      end
    ) order by a.created_at desc)
    from public.agencies a
    where a.status in ('active', 'suspended')
      and (
        a.owner_id = v_uid
        or exists (
          select 1 from public.agency_staff_roles s
          where s.agency_id = a.id and s.user_id = v_uid
            and s.role_code in ('OWNER','MANAGER','MODERATOR','HOST_MANAGER')
        )
      )
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_yonetim_ajanslarim() to authenticated;
