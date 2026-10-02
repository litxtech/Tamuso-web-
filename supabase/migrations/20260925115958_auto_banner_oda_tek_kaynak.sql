-- Otomatik banner: oda / canlı başına tek aktif kayıt
-- Bug: source_key içine :m{N} milestone ekleniyordu → her eşikte yeni banner
-- + gift_burst ayrı source_key ile ikinci banner açıyordu

-- ---------------------------------------------------------------------------
-- auto_banner_olustur: aynı ref_type+ref_id için tek aktif banner (upsert)
-- ---------------------------------------------------------------------------
create or replace function public.auto_banner_olustur(
  p_kind text,
  p_source_key text,
  p_ref_type text,
  p_ref_id text,
  p_title text,
  p_subtitle text,
  p_badge text,
  p_media_url text,
  p_gradient_json jsonb,
  p_action_type text,
  p_action_target text,
  p_metric_value bigint,
  p_milestone int default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ayar public.auto_banner_settings%rowtype;
  v_id uuid;
  v_aktif int;
  v_mevcut uuid;
  v_ms int := greatest(coalesce(p_milestone, 1), 1);
  v_score bigint;
begin
  if not public.auto_banner_sistem_acik_mi() then
    return null;
  end if;

  select * into v_ayar from public.auto_banner_settings where id = 1;
  if not found then
    return null;
  end if;

  if p_kind = 'room_coins' and not v_ayar.room_coins_enabled then return null; end if;
  if p_kind = 'live_coins' and not v_ayar.live_coins_enabled then return null; end if;
  if p_kind = 'seats_full' and not v_ayar.seats_full_enabled then return null; end if;
  if p_kind = 'game_coins' and not v_ayar.game_coins_enabled then return null; end if;
  if p_kind = 'gift_burst' and not coalesce(v_ayar.gift_burst_enabled, true) then return null; end if;

  perform public.auto_banner_suresi_dolmuslari_temizle();

  v_score := public.auto_banner_skor_hesapla(p_metric_value, v_ms, now());

  -- 1) Aynı kaynak (source_key) aktif/cooldown → güncelle, yeni ekleme
  select b.id into v_mevcut
  from public.auto_banners b
  where b.source_key = p_source_key
    and (
      b.active = true
      or b.created_at > now() - make_interval(hours => v_ayar.cooldown_hours)
    )
  order by b.active desc, b.created_at desc
  limit 1;

  -- 2) Oda / canlı / session: aynı ref için tek aktif banner
  if v_mevcut is null
     and p_ref_type in ('room', 'live_session')
     and nullif(trim(p_ref_id), '') is not null
  then
    select b.id into v_mevcut
    from public.auto_banners b
    where b.active = true
      and b.ref_type = p_ref_type
      and b.ref_id = p_ref_id
    order by b.score desc, b.created_at desc
    limit 1;
  end if;

  if v_mevcut is not null then
    -- Önce kardeşleri kapat (source_key unique yarışı olmasın)
    if p_ref_type in ('room', 'live_session') and nullif(trim(p_ref_id), '') is not null then
      update public.auto_banners
        set active = false,
            deactivated_at = now(),
            deactivate_reason = 'single_ref'
      where active = true
        and ref_type = p_ref_type
        and ref_id = p_ref_id
        and id <> v_mevcut;
    end if;

    update public.auto_banners
      set kind = p_kind,
          source_key = p_source_key,
          metric_value = greatest(metric_value, coalesce(p_metric_value, 0)),
          milestone = greatest(milestone, v_ms),
          score = greatest(
            score,
            public.auto_banner_skor_hesapla(
              greatest(metric_value, coalesce(p_metric_value, 0)),
              greatest(milestone, v_ms),
              created_at
            )
          ),
          title = coalesce(nullif(trim(p_title), ''), title),
          subtitle = coalesce(p_subtitle, subtitle),
          media_url = coalesce(nullif(trim(p_media_url), ''), media_url),
          badge = coalesce(nullif(trim(p_badge), ''), badge),
          action_type = coalesce(nullif(trim(p_action_type), ''), action_type),
          action_target = coalesce(nullif(trim(p_action_target), ''), action_target),
          gradient_json = coalesce(p_gradient_json, gradient_json),
          expires_at = greatest(
            expires_at,
            now() + make_interval(hours => v_ayar.ttl_hours)
          ),
          active = true,
          deactivated_at = null,
          deactivate_reason = null
    where id = v_mevcut;

    return v_mevcut;
  end if;

  select count(*)::int into v_aktif
  from public.auto_banners
  where active = true and expires_at > now();

  if v_aktif >= v_ayar.max_active then
    update public.auto_banners
      set active = false,
          deactivated_at = now(),
          deactivate_reason = 'max_active'
    where id = (
      select id from public.auto_banners
      where active = true
        and pinned = false
      order by admin_priority asc, score asc, created_at asc
      limit 1
    );
  end if;

  insert into public.auto_banners (
    kind, source_key, ref_type, ref_id,
    title, subtitle, badge, media_url, gradient_json,
    action_type, action_target, metric_value,
    expires_at, milestone, score
  ) values (
    p_kind, p_source_key, p_ref_type, p_ref_id,
    left(trim(p_title), 80),
    left(nullif(trim(p_subtitle), ''), 120),
    left(nullif(trim(p_badge), ''), 24),
    nullif(trim(p_media_url), ''),
    p_gradient_json,
    p_action_type,
    p_action_target,
    coalesce(p_metric_value, 0),
    now() + make_interval(hours => v_ayar.ttl_hours),
    v_ms,
    v_score
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    -- Yarış: mevcut aktif kaydı güncelle
    update public.auto_banners
      set metric_value = greatest(metric_value, coalesce(p_metric_value, 0)),
          milestone = greatest(milestone, v_ms),
          score = greatest(score, v_score),
          title = coalesce(nullif(trim(p_title), ''), title),
          subtitle = coalesce(p_subtitle, subtitle),
          badge = coalesce(nullif(trim(p_badge), ''), badge)
    where source_key = p_source_key and active = true
    returning id into v_id;
    return v_id;
end;
$$;

revoke all on function public.auto_banner_olustur(text, text, text, text, text, text, text, text, jsonb, text, text, bigint, int) from public;
grant execute on function public.auto_banner_olustur(text, text, text, text, text, text, text, text, jsonb, text, text, bigint, int) to service_role;

-- ---------------------------------------------------------------------------
-- Oda coin: sabit source_key (milestone yalnızca kolon)
-- ---------------------------------------------------------------------------
create or replace function public.auto_banner_oda_coin_degerlendir(
  p_room_id uuid,
  p_coins bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ayar public.auto_banner_settings%rowtype;
  v_title text;
  v_cover text;
  v_host text;
  v_avatar text;
  v_live boolean;
  v_esik bigint;
  v_ms int;
begin
  if p_room_id is null then return; end if;
  select * into v_ayar from public.auto_banner_settings where id = 1;
  if not found or not v_ayar.room_coins_enabled then return; end if;

  v_esik := greatest(v_ayar.room_coin_threshold, 1);
  if coalesce(p_coins, 0) < v_esik then return; end if;

  select r.is_live, r.title, r.cover_url, p.display_name, p.avatar_url
    into v_live, v_title, v_cover, v_host, v_avatar
  from public.rooms r
  left join public.profiles p on p.id = r.host_id
  where r.id = p_room_id;

  if not coalesce(v_live, false) then return; end if;

  v_ms := case
    when coalesce(v_ayar.milestone_enabled, true)
      then greatest(1, (coalesce(p_coins, 0) / v_esik)::int)
    else 1
  end;

  perform public.auto_banner_olustur(
    'room_coins',
    'room_coins:' || p_room_id::text,
    'room',
    p_room_id::text,
    coalesce(nullif(trim(v_title), ''), 'Canlı ses odası'),
    coalesce(v_host, 'Host') || ' · ' || coalesce(p_coins, 0)::text || ' coin',
    case when v_ms >= 5 then 'EFSANE' when v_ms >= 2 then 'ATEŞ' else 'HOT' end,
    coalesce(nullif(trim(v_cover), ''), v_avatar),
    jsonb_build_object('colors', jsonb_build_array('#0F3A36', '#3DCFB0')),
    'INTERNAL_ROOM',
    p_room_id::text,
    coalesce(p_coins, 0),
    v_ms
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Canlı coin: sabit source_key
-- ---------------------------------------------------------------------------
create or replace function public.auto_banner_canli_coin_degerlendir(
  p_session_id uuid,
  p_coins bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ayar public.auto_banner_settings%rowtype;
  v_title text;
  v_host text;
  v_avatar text;
  v_live boolean;
  v_esik bigint;
  v_ms int;
begin
  if p_session_id is null then return; end if;
  select * into v_ayar from public.auto_banner_settings where id = 1;
  if not found or not v_ayar.live_coins_enabled then return; end if;

  v_esik := greatest(v_ayar.live_coin_threshold, 1);
  if coalesce(p_coins, 0) < v_esik then return; end if;

  select s.is_live, s.title, p.display_name, p.avatar_url
    into v_live, v_title, v_host, v_avatar
  from public.live_sessions s
  left join public.profiles p on p.id = s.host_id
  where s.id = p_session_id;

  if not coalesce(v_live, false) then return; end if;

  v_ms := case
    when coalesce(v_ayar.milestone_enabled, true)
      then greatest(1, (coalesce(p_coins, 0) / v_esik)::int)
    else 1
  end;

  perform public.auto_banner_olustur(
    'live_coins',
    'live_coins:' || p_session_id::text,
    'live_session',
    p_session_id::text,
    coalesce(nullif(trim(v_title), ''), 'Canlı yayın'),
    coalesce(v_host, 'Yayıncı') || ' · ' || coalesce(p_coins, 0)::text || ' coin',
    case when v_ms >= 5 then 'EFSANE' when v_ms >= 2 then 'ATEŞ' else 'CANLI' end,
    v_avatar,
    jsonb_build_object('colors', jsonb_build_array('#3A1A38', '#E84091')),
    'INTERNAL_LIVE',
    p_session_id::text,
    coalesce(p_coins, 0),
    v_ms
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Mevcut duplicate aktifleri temizle (ref başına en iyi skor kalsın)
-- + eski :mN source_key'leri kanonik forma çek
-- ---------------------------------------------------------------------------
with ranked as (
  select
    id,
    ref_type,
    ref_id,
    row_number() over (
      partition by ref_type, ref_id
      order by score desc, milestone desc, metric_value desc, created_at desc
    ) as rn
  from public.auto_banners
  where active = true
    and ref_type in ('room', 'live_session')
    and nullif(trim(ref_id), '') is not null
)
update public.auto_banners b
  set active = false,
      deactivated_at = now(),
      deactivate_reason = 'single_ref_cleanup'
from ranked r
where b.id = r.id
  and r.rn > 1;

-- Kalan room_coins :mN → room_coins:{id}
update public.auto_banners
  set source_key = 'room_coins:' || ref_id
where active = true
  and kind = 'room_coins'
  and ref_type = 'room'
  and source_key ~ '^room_coins:[0-9a-f-]+:m[0-9]+$';

update public.auto_banners
  set source_key = 'live_coins:' || ref_id
where active = true
  and kind = 'live_coins'
  and ref_type = 'live_session'
  and source_key ~ '^live_coins:[0-9a-f-]+:m[0-9]+$';
