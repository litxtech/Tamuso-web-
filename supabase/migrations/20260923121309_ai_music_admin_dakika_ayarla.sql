-- Admin: AI müzik dakika (entitlement) arama + tekli/toplu ekleme-eksiltme

-- ---------------------------------------------------------------------------
-- Kullanıcı ara (herkes — AI müzik bakiyesiyle)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_admin_user_search(
  p_query text default null,
  p_limit int default 40
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := nullif(trim(coalesce(p_query, '')), '');
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        p.id as user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.public_user_id,
        coalesce(b.available_seconds, 0)::int as available_seconds,
        coalesce(b.reserved_seconds, 0)::int as reserved_seconds,
        coalesce(b.lifetime_granted_seconds, 0)::int as lifetime_granted_seconds,
        coalesce(b.lifetime_consumed_seconds, 0)::int as lifetime_consumed_seconds,
        (
          select count(*)::int
          from public.music_tracks t
          where t.owner_user_id = p.id
            and t.source = 'ai'
            and t.soft_deleted_at is null
        ) as track_count
      from public.profiles p
      left join public.ai_music_balances b on b.user_id = p.id
      where v_q is null
         or p.username ilike '%' || v_q || '%'
         or p.display_name ilike '%' || v_q || '%'
         or coalesce(p.public_user_id::text, '') ilike '%' || v_q || '%'
         or p.id::text ilike '%' || v_q || '%'
      order by
        case when v_q is not null and lower(coalesce(p.username,'')) = lower(v_q) then 0 else 1 end,
        p.created_at desc nulls last
      limit greatest(1, least(coalesce(p_limit, 40), 100))
    ) x
  ), '[]'::jsonb);
end;
$$;
grant execute on function public.ai_music_admin_user_search(text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Tek kullanıcı bakiyesi (detay)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_admin_user_balance(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal public.ai_music_balances%rowtype;
  p public.profiles%rowtype;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_user_id is null then raise exception 'user_id gerekli'; end if;

  select * into p from public.profiles where id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'hata', 'Kullanıcı yok');
  end if;

  perform public.ai_music_ensure_balance(p_user_id);
  select * into v_bal from public.ai_music_balances where user_id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'user', jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'public_user_id', p.public_user_id
    ),
    'available_seconds', coalesce(v_bal.available_seconds, 0),
    'reserved_seconds', coalesce(v_bal.reserved_seconds, 0),
    'lifetime_granted_seconds', coalesce(v_bal.lifetime_granted_seconds, 0),
    'lifetime_consumed_seconds', coalesce(v_bal.lifetime_consumed_seconds, 0)
  );
end;
$$;
grant execute on function public.ai_music_admin_user_balance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Toplu ekle / eksilt (dakika UI → saniye)
-- ---------------------------------------------------------------------------
create or replace function public.ai_music_admin_adjust_bulk(
  p_user_ids uuid[],
  p_seconds int,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_uid uuid;
  v_bal public.ai_music_balances%rowtype;
  v_type text;
  v_ok int := 0;
  v_fail int := 0;
  v_results jsonb := '[]'::jsonb;
  v_delta int;
  v_err text;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'Reason required';
  end if;
  if p_seconds = 0 then raise exception 'Seconds required'; end if;
  if p_user_ids is null or cardinality(p_user_ids) = 0 then
    raise exception 'user_ids required';
  end if;
  if cardinality(p_user_ids) > 80 then
    raise exception 'En fazla 80 kullanıcı';
  end if;

  v_type := case when p_seconds > 0 then 'ADMIN_GRANT' else 'ADMIN_DEBIT' end;

  foreach v_uid in array p_user_ids loop
    begin
      if v_uid is null then
        v_fail := v_fail + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'user_id', null, 'ok', false, 'hata', 'Geçersiz id'
        ));
        continue;
      end if;

      perform public.ai_music_ensure_balance(v_uid);
      select * into v_bal from public.ai_music_balances where user_id = v_uid for update;

      v_delta := p_seconds;
      if v_delta < 0 and v_bal.available_seconds < abs(v_delta) then
        -- Eksiltmede bakiyeyi sıfıra indir (kısmi debit)
        v_delta := -v_bal.available_seconds;
      end if;

      if v_delta = 0 then
        v_fail := v_fail + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'user_id', v_uid,
          'ok', false,
          'hata', 'Bakiye zaten 0',
          'available_seconds', v_bal.available_seconds
        ));
        continue;
      end if;

      insert into public.ai_music_entitlement_ledger (
        user_id, type, seconds_delta, source, description, admin_id
      ) values (
        v_uid,
        case when v_delta > 0 then 'ADMIN_GRANT' else 'ADMIN_DEBIT' end,
        v_delta,
        'admin_bulk',
        trim(p_reason),
        v_admin
      );

      update public.ai_music_balances set
        available_seconds = available_seconds + v_delta,
        lifetime_granted_seconds = lifetime_granted_seconds + greatest(v_delta, 0),
        updated_at = now()
      where user_id = v_uid
      returning * into v_bal;

      insert into public.admin_audit_logs (admin_id, target_user_id, action, summary, details)
      values (
        v_admin,
        v_uid,
        'ai_music_adjust_bulk',
        left('AI müzik süre (toplu): ' || v_delta::text || ' sn', 200),
        jsonb_build_object('seconds', v_delta, 'requested', p_seconds, 'reason', trim(p_reason))
      );

      v_ok := v_ok + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'user_id', v_uid,
        'ok', true,
        'seconds_applied', v_delta,
        'available_seconds', v_bal.available_seconds
      ));
    exception when others then
      v_fail := v_fail + 1;
      v_err := SQLERRM;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'user_id', v_uid, 'ok', false, 'hata', left(v_err, 200)
      ));
    end;
  end loop;

  return jsonb_build_object(
    'ok', v_fail = 0,
    'success_count', v_ok,
    'fail_count', v_fail,
    'results', v_results
  );
end;
$$;
grant execute on function public.ai_music_admin_adjust_bulk(uuid[], int, text) to authenticated;

-- Tekli adjust: hata mesajını jsonb ile dön (UI dostu)
create or replace function public.ai_music_admin_adjust(
  p_user_id uuid,
  p_seconds int,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_bal public.ai_music_balances%rowtype;
  v_type text;
  v_delta int;
begin
  if not public.ben_admin_miyim() then
    return jsonb_build_object('ok', false, 'hata', 'Forbidden');
  end if;
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'hata', 'Kullanıcı gerekli');
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    return jsonb_build_object('ok', false, 'hata', 'Sebep en az 3 karakter olmalı');
  end if;
  if p_seconds = 0 then
    return jsonb_build_object('ok', false, 'hata', 'Süre 0 olamaz');
  end if;

  perform public.ai_music_ensure_balance(p_user_id);
  select * into v_bal from public.ai_music_balances where user_id = p_user_id for update;

  v_delta := p_seconds;
  if v_delta < 0 and v_bal.available_seconds < abs(v_delta) then
    v_delta := -v_bal.available_seconds;
  end if;
  if v_delta = 0 then
    return jsonb_build_object(
      'ok', false,
      'hata', 'Bakiye zaten 0',
      'available_seconds', v_bal.available_seconds
    );
  end if;

  v_type := case when v_delta > 0 then 'ADMIN_GRANT' else 'ADMIN_DEBIT' end;

  insert into public.ai_music_entitlement_ledger (
    user_id, type, seconds_delta, source, description, admin_id
  ) values (
    p_user_id, v_type, v_delta, 'admin', trim(p_reason), v_admin
  );

  update public.ai_music_balances set
    available_seconds = available_seconds + v_delta,
    lifetime_granted_seconds = lifetime_granted_seconds + greatest(v_delta, 0),
    updated_at = now()
  where user_id = p_user_id
  returning * into v_bal;

  insert into public.admin_audit_logs (admin_id, target_user_id, action, summary, details)
  values (
    v_admin,
    p_user_id,
    'ai_music_adjust',
    left('AI müzik süre: ' || v_delta::text || ' sn', 200),
    jsonb_build_object('seconds', v_delta, 'requested', p_seconds, 'reason', trim(p_reason))
  );

  return jsonb_build_object(
    'ok', true,
    'available_seconds', v_bal.available_seconds,
    'seconds_applied', v_delta
  );
end;
$$;
