-- Satın alma itiraz / geri dönüş sistemi
-- Kullanıcı geçmişten itiraz açar → admin onay/red → bildirim + UI durumu

create table if not exists public.purchase_disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  purchase_kind text not null
    check (purchase_kind in ('coin', 'ai_music')),
  purchase_id uuid not null,
  reason_code text not null
    check (reason_code in (
      'not_received',
      'wrong_amount',
      'duplicate',
      'unauthorized',
      'other'
    )),
  user_note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  -- Satın alma anı anlık görüntü (admin için)
  purchase_snapshot jsonb not null default '{}'::jsonb,
  admin_note text,
  resolution_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists purchase_disputes_one_per_purchase
  on public.purchase_disputes (user_id, purchase_kind, purchase_id);

create index if not exists purchase_disputes_status_created_idx
  on public.purchase_disputes (status, created_at desc);

create index if not exists purchase_disputes_user_idx
  on public.purchase_disputes (user_id, created_at desc);

alter table public.purchase_disputes enable row level security;

drop policy if exists "purchase_disputes_own_select" on public.purchase_disputes;
create policy "purchase_disputes_own_select"
  on public.purchase_disputes for select to authenticated
  using (user_id = auth.uid() or public.ben_admin_miyim());

grant select on public.purchase_disputes to authenticated;

-- ---------------------------------------------------------------------------
-- Kullanıcı: itiraz oluştur
-- ---------------------------------------------------------------------------
create or replace function public.satin_alma_itiraz_olustur(
  p_kind text,
  p_purchase_id uuid,
  p_reason_code text,
  p_user_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_reason text := lower(trim(coalesce(p_reason_code, '')));
  v_note text := nullif(left(trim(coalesce(p_user_note, '')), 800), '');
  v_snap jsonb := '{}'::jsonb;
  v_ok boolean := false;
  v_id uuid;
  v_title text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_kind not in ('coin', 'ai_music') then
    raise exception 'Geçersiz satın alma türü';
  end if;
  if v_reason not in (
    'not_received', 'wrong_amount', 'duplicate', 'unauthorized', 'other'
  ) then
    raise exception 'Geçersiz itiraz nedeni';
  end if;
  if p_purchase_id is null then raise exception 'Satın alma seçilmedi'; end if;

  if exists (
    select 1 from public.purchase_disputes d
    where d.user_id = v_uid
      and d.purchase_kind = v_kind
      and d.purchase_id = p_purchase_id
  ) then
    raise exception 'Bu paket için zaten itiraz açılmış';
  end if;

  if v_kind = 'coin' then
    select jsonb_build_object(
      'kind', 'coin',
      'id', cp.id,
      'title', coalesce(pkg.title, 'Coin paketi'),
      'detail', '+' || cp.coins_added::text || ' coin',
      'quantity', cp.coins_added,
      'amount_try', cp.amount_try,
      'amount_usd', cp.amount_usd,
      'channel', cp.provider,
      'store', cp.store,
      'status', cp.status,
      'provider_tx_id', cp.provider_tx_id,
      'package_id', cp.package_id,
      'created_at', cp.created_at,
      'verified_at', cp.verified_at
    ), true
    into v_snap, v_ok
    from public.coin_purchases cp
    left join public.coin_packages pkg on pkg.id = cp.package_id
    where cp.id = p_purchase_id
      and cp.user_id = v_uid
      and lower(cp.status) = 'completed'
      and cp.coins_added > 0;
  else
    select jsonb_build_object(
      'kind', 'ai_music',
      'id', ap.id,
      'title', coalesce(ap.display_name_snapshot, ap.product_id),
      'detail',
        '+' || round((ap.seconds_snapshot + coalesce(ap.bonus_seconds_snapshot, 0)) / 60.0)::text
        || ' dk AI müzik',
      'quantity', ap.seconds_snapshot + coalesce(ap.bonus_seconds_snapshot, 0),
      'amount_try', ap.amount_try,
      'amount_usd', ap.amount_usd,
      'channel', ap.store,
      'store', ap.store,
      'status', ap.status,
      'product_id', ap.product_id,
      'transaction_id', ap.transaction_id,
      'created_at', ap.created_at,
      'credited_at', ap.credited_at
    ), true
    into v_snap, v_ok
    from public.ai_music_purchases ap
    where ap.id = p_purchase_id
      and ap.user_id = v_uid
      and upper(ap.status) = 'CREDITED';
  end if;

  if not coalesce(v_ok, false) then
    raise exception 'Satın alma bulunamadı veya itiraz edilemez';
  end if;

  insert into public.purchase_disputes (
    user_id, purchase_kind, purchase_id, reason_code, user_note, purchase_snapshot
  ) values (
    v_uid, v_kind, p_purchase_id, v_reason, v_note, coalesce(v_snap, '{}'::jsonb)
  )
  returning id into v_id;

  v_title := coalesce(v_snap->>'title', 'Paket');

  begin
    perform public.admin_operasyon_bildirimi(
      'Yeni satın alma itirazı',
      left(v_title, 80) || ' · ' || v_reason,
      '/admin/satin-alma-itirazlar',
      jsonb_build_object(
        'kind', 'purchase_dispute',
        'dispute_id', v_id,
        'user_id', v_uid
      )
    );
  exception when others then null;
  end;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'status', 'pending',
    'purchase_kind', v_kind,
    'purchase_id', p_purchase_id
  );
end;
$$;

revoke all on function public.satin_alma_itiraz_olustur(text, uuid, text, text) from public;
grant execute on function public.satin_alma_itiraz_olustur(text, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Birleşik geçmiş: itiraz alanını ekle
-- ---------------------------------------------------------------------------
create or replace function public.satin_alma_gecmisim(p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select
        u.*,
        case
          when d.id is null then null
          else jsonb_build_object(
            'id', d.id,
            'status', d.status,
            'reason_code', d.reason_code,
            'user_note', d.user_note,
            'admin_note', d.admin_note,
            'resolution_note', d.resolution_note,
            'created_at', d.created_at,
            'reviewed_at', d.reviewed_at
          )
        end as dispute
      from (
        select
          cp.id::text as id,
          'coin'::text as kind,
          coalesce(pkg.title, 'Coin paketi') as title,
          ('+' || (cp.coins_added)::text || ' coin') as detail,
          cp.coins_added::numeric as quantity,
          'coin'::text as unit,
          cp.amount_try,
          cp.amount_usd,
          cp.provider as channel,
          cp.store,
          cp.status,
          cp.created_at,
          cp.verified_at as completed_at,
          jsonb_build_object(
            'package_id', cp.package_id,
            'provider_tx_id', cp.provider_tx_id
          ) as meta
        from public.coin_purchases cp
        left join public.coin_packages pkg on pkg.id = cp.package_id
        where cp.user_id = v_uid

        union all

        select
          ap.id::text,
          'ai_music'::text,
          coalesce(ap.display_name_snapshot, ap.product_id),
          (
            '+' ||
            round((ap.seconds_snapshot + coalesce(ap.bonus_seconds_snapshot, 0)) / 60.0)::text ||
            ' dk AI müzik'
          ),
          (ap.seconds_snapshot + coalesce(ap.bonus_seconds_snapshot, 0))::numeric,
          'seconds'::text,
          ap.amount_try,
          ap.amount_usd,
          ap.store,
          ap.store,
          ap.status,
          ap.created_at,
          ap.credited_at,
          jsonb_build_object(
            'product_id', ap.product_id,
            'transaction_id', ap.transaction_id,
            'seconds', ap.seconds_snapshot,
            'bonus_seconds', ap.bonus_seconds_snapshot
          )
        from public.ai_music_purchases ap
        where ap.user_id = v_uid
      ) u
      left join public.purchase_disputes d
        on d.user_id = v_uid
       and d.purchase_kind = u.kind
       and d.purchase_id::text = u.id
      order by u.created_at desc
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.satin_alma_gecmisim(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: liste
-- ---------------------------------------------------------------------------
create or replace function public.admin_satin_alma_itiraz_listele(
  p_status text default null,
  p_limit int default 80
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
  v_limit int := greatest(1, least(coalesce(p_limit, 80), 200));
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  if v_status is not null and v_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Geçersiz durum filtresi';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc)
    from (
      select
        d.id,
        d.user_id,
        d.purchase_kind,
        d.purchase_id,
        d.reason_code,
        d.user_note,
        d.status,
        d.purchase_snapshot,
        d.admin_note,
        d.resolution_note,
        d.reviewed_by,
        d.reviewed_at,
        d.created_at,
        d.updated_at,
        jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'display_name', p.display_name,
          'avatar_url', p.avatar_url,
          'public_user_id', p.public_user_id
        ) as profile,
        case
          when rev.id is null then null
          else jsonb_build_object(
            'id', rev.id,
            'username', rev.username,
            'display_name', rev.display_name
          )
        end as reviewer
      from public.purchase_disputes d
      join public.profiles p on p.id = d.user_id
      left join public.profiles rev on rev.id = d.reviewed_by
      where v_status is null or d.status = v_status
      order by
        case d.status when 'pending' then 0 else 1 end,
        d.created_at desc
      limit v_limit
    ) r
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_satin_alma_itiraz_listele(text, int) from public;
grant execute on function public.admin_satin_alma_itiraz_listele(text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: karar (onay / red)
-- ---------------------------------------------------------------------------
create or replace function public.admin_satin_alma_itiraz_karar(
  p_id uuid,
  p_status text,
  p_admin_note text default null,
  p_resolution_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status, '')));
  v_row public.purchase_disputes%rowtype;
  v_title text;
  v_body text;
  v_pkg text;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  if v_status not in ('approved', 'rejected') then
    raise exception 'Karar approved veya rejected olmalı';
  end if;
  if p_id is null then raise exception 'İtiraz seçilmedi'; end if;

  select * into v_row
  from public.purchase_disputes
  where id = p_id
  for update;

  if not found then raise exception 'İtiraz bulunamadı'; end if;
  if v_row.status <> 'pending' then
    raise exception 'Bu itiraz zaten sonuçlanmış';
  end if;

  update public.purchase_disputes set
    status = v_status,
    admin_note = nullif(left(trim(coalesce(p_admin_note, '')), 800), ''),
    resolution_note = nullif(left(trim(coalesce(p_resolution_note, '')), 800), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_id
  returning * into v_row;

  v_pkg := coalesce(v_row.purchase_snapshot->>'title', 'Paket');

  if v_status = 'approved' then
    v_title := 'İtirazın onaylandı — geri dönüş';
    v_body := coalesce(
      nullif(trim(coalesce(p_resolution_note, '')), ''),
      '«' || left(v_pkg, 60) || '» itirazın onaylandı. Geri dönüş süreci başladı.'
    );
  else
    v_title := 'İtirazın incelendi';
    v_body := coalesce(
      nullif(trim(coalesce(p_resolution_note, '')), ''),
      '«' || left(v_pkg, 60) || '» itirazın reddedildi.'
    );
  end if;

  begin
    perform public.bildirim_kuyruga_ekle(
      v_row.user_id,
      'system',
      v_title,
      left(v_body, 400),
      '/ayarlar/satin-alma-gecmisi',
      jsonb_build_object(
        'kind', 'purchase_dispute_decision',
        'dispute_id', v_row.id,
        'status', v_status,
        'purchase_kind', v_row.purchase_kind,
        'purchase_id', v_row.purchase_id
      )
    );
  exception when others then null;
  end;

  perform public.admin_audit_yaz(
    v_row.user_id,
    'purchase_dispute_' || v_status,
    'Satın alma itirazı: ' || v_status,
    jsonb_build_object(
      'dispute_id', v_row.id,
      'purchase_kind', v_row.purchase_kind,
      'purchase_id', v_row.purchase_id,
      'reason_code', v_row.reason_code
    )
  );

  return jsonb_build_object(
    'ok', true,
    'id', v_row.id,
    'status', v_row.status,
    'reviewed_at', v_row.reviewed_at
  );
end;
$$;

revoke all on function public.admin_satin_alma_itiraz_karar(uuid, text, text, text) from public;
grant execute on function public.admin_satin_alma_itiraz_karar(uuid, text, text, text) to authenticated;
