-- Yetkili ajanslar kendi ajans paket kataloglarını yönetir (şablon = agency_id null).

alter table public.agency_coin_packages
  add column if not exists agency_id uuid references public.agencies(id) on delete cascade;

create index if not exists agency_coin_packages_agency_idx
  on public.agency_coin_packages (agency_id)
  where agency_id is not null;

-- package_key artık şablon + ajans kopyalarında tekrarlanabilir
alter table public.agency_coin_packages
  drop constraint if exists agency_coin_packages_package_key_key;

drop index if exists agency_coin_packages_package_key_key;

create unique index if not exists agency_coin_packages_template_key_uidx
  on public.agency_coin_packages (package_key)
  where agency_id is null;

create unique index if not exists agency_coin_packages_agency_key_uidx
  on public.agency_coin_packages (agency_id, package_key)
  where agency_id is not null;

-- ---------------------------------------------------------------------------
-- Şablondan ajans kataloğu kopyala (yoksa)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_paket_katalog_seed(p_agency_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_agency_id is null then
    raise exception 'Agency required';
  end if;

  if exists (
    select 1 from public.agency_coin_packages where agency_id = p_agency_id limit 1
  ) then
    return;
  end if;

  insert into public.agency_coin_packages (
    agency_id, package_key, title, liste_fiyat_try, coins,
    indirim_yuzde, sort_order, is_active
  )
  select
    p_agency_id,
    t.package_key,
    t.title,
    t.liste_fiyat_try,
    t.coins,
    t.indirim_yuzde,
    t.sort_order,
    t.is_active
  from public.agency_coin_packages t
  where t.agency_id is null
  order by t.sort_order, t.liste_fiyat_try;
end;
$$;

revoke all on function public.ajans_paket_katalog_seed(uuid) from public, anon, authenticated;
grant execute on function public.ajans_paket_katalog_seed(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Public liste: p_agency_id verilirse o ajansın paketleri (yoksa seed)
-- ---------------------------------------------------------------------------
drop function if exists public.ajans_paket_katalog_liste();

create or replace function public.ajans_paket_katalog_liste(p_agency_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_agency_id is not null then
    perform public.ajans_paket_katalog_seed(p_agency_id);
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        id,
        package_key,
        title,
        liste_fiyat_try,
        round(liste_fiyat_try * (1 - indirim_yuzde::numeric / 100), 2) as odenecek_try,
        coins,
        indirim_yuzde,
        sort_order,
        is_active,
        agency_id
      from public.agency_coin_packages
      where is_active = true
        and (
          (p_agency_id is null and agency_id is null)
          or agency_id = p_agency_id
        )
      order by sort_order asc, liste_fiyat_try asc
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_paket_katalog_liste(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Hesapla: ajans paketi tercih et, yoksa şablon
-- ---------------------------------------------------------------------------
drop function if exists public.ajans_paket_katalog_hesapla(numeric);

create or replace function public.ajans_paket_katalog_hesapla(
  p_liste_fiyat_try numeric,
  p_agency_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p public.agency_coin_packages%rowtype;
  v_liste numeric;
  v_amount numeric;
begin
  v_liste := round(coalesce(p_liste_fiyat_try, 0)::numeric, 2);

  if p_agency_id is not null then
    perform public.ajans_paket_katalog_seed(p_agency_id);

    select * into v_p
    from public.agency_coin_packages
    where is_active = true
      and agency_id = p_agency_id
      and liste_fiyat_try = v_liste
    order by sort_order
    limit 1;
  end if;

  if v_p.id is null then
    select * into v_p
    from public.agency_coin_packages
    where is_active = true
      and agency_id is null
      and liste_fiyat_try = v_liste
    order by sort_order
    limit 1;
  end if;

  if v_p.id is null then
    raise exception 'Gecersiz ajans paketi';
  end if;

  v_amount := round(
    v_p.liste_fiyat_try * (1 - v_p.indirim_yuzde::numeric / 100),
    2
  );

  return jsonb_build_object(
    'package_key', v_p.package_key,
    'title', v_p.title,
    'liste_fiyat_try', v_p.liste_fiyat_try,
    'amount_try', v_amount,
    'coins', v_p.coins,
    'indirim_yuzde', v_p.indirim_yuzde
  );
end;
$$;

grant execute on function public.ajans_paket_katalog_hesapla(numeric, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Teklif: ajansa özel katalogdan hesapla
-- ---------------------------------------------------------------------------
create or replace function public.ajans_paket_teklif_olustur(
  p_agency_id uuid,
  p_liste_fiyat_try numeric,
  p_buyer_id uuid default null,
  p_thread_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_name text;
  v_buyer uuid;
  v_thread uuid;
  v_kat jsonb;
  v_offer public.agency_package_offers%rowtype;
  v_msg public.direct_messages%rowtype;
  v_body text;
  v_preview text;
  v_guest boolean;
  v_meta jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_agency_id is null then raise exception 'Agency required'; end if;
  if public.kill_switch_aktif_mi('kill_coin_purchase') then
    raise exception 'Coin purchase temporarily disabled';
  end if;
  if not public.ozellik_bayragi_aktif_mi('messages_enabled') then
    raise exception 'Messages feature disabled';
  end if;

  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then
    raise exception 'Guest cannot create package offer';
  end if;

  select owner_id, name into v_owner, v_name
  from public.agencies
  where id = p_agency_id
    and status = 'active'
    and is_coin_distributor = true;
  if v_owner is null then raise exception 'Agency not found or not distributor'; end if;

  if v_uid = v_owner then
    v_buyer := coalesce(p_buyer_id, null);
    if v_buyer is null and p_thread_id is not null then
      select m.user_id into v_buyer
      from public.message_thread_members m
      where m.thread_id = p_thread_id
        and m.user_id <> v_uid
      limit 1;
    end if;
    if v_buyer is null then raise exception 'Buyer required'; end if;
    if v_buyer = v_uid then raise exception 'Cannot offer to self'; end if;
  else
    v_buyer := v_uid;
  end if;

  if public.kullanicilar_engelli_mi(v_buyer, v_owner) then
    raise exception 'Bu kullaniciyla iletisim engellenmis';
  end if;

  v_kat := public.ajans_paket_katalog_hesapla(p_liste_fiyat_try, p_agency_id);

  if p_thread_id is not null then
    if not exists (
      select 1 from public.message_thread_members
      where thread_id = p_thread_id and user_id = v_uid
    ) then
      raise exception 'Not a thread member';
    end if;
    if not exists (
      select 1 from public.message_thread_members
      where thread_id = p_thread_id and user_id = v_buyer
    ) then
      raise exception 'Buyer not in thread';
    end if;
    v_thread := p_thread_id;
  else
    v_thread := public.ajans_sohbet_ac_veya_getir(p_agency_id);
  end if;

  insert into public.agency_package_offers (
    agency_id, buyer_id, created_by, thread_id,
    package_key, title, liste_fiyat_try, amount_try, coins, indirim_yuzde
  ) values (
    p_agency_id, v_buyer, v_uid, v_thread,
    v_kat->>'package_key',
    v_kat->>'title',
    (v_kat->>'liste_fiyat_try')::numeric,
    (v_kat->>'amount_try')::numeric,
    (v_kat->>'coins')::bigint,
    (v_kat->>'indirim_yuzde')::int
  )
  returning * into v_offer;

  v_body := format(
    '%s paket teklifi · %s coin · %s ₺ (%%%s ajans indirimi)',
    v_offer.title,
    to_char(v_offer.coins, 'FM999,999,999'),
    to_char(v_offer.amount_try, 'FM999,999,990.00'),
    v_offer.indirim_yuzde
  );
  v_preview := left(v_body, 120);

  v_meta := jsonb_build_object(
    'offer_id', v_offer.id,
    'agency_id', v_offer.agency_id,
    'agency_name', coalesce(nullif(trim(v_name), ''), 'Ajans'),
    'buyer_id', v_offer.buyer_id,
    'package_key', v_offer.package_key,
    'title', v_offer.title,
    'liste_fiyat_try', v_offer.liste_fiyat_try,
    'amount_try', v_offer.amount_try,
    'coins', v_offer.coins,
    'indirim_yuzde', v_offer.indirim_yuzde,
    'status', v_offer.status,
    'expires_at', v_offer.expires_at
  );

  insert into public.direct_messages (
    thread_id, sender_id, body, message_type, ref_id, media_meta
  ) values (
    v_thread, v_owner, left(v_body, 4000), 'agency_package_offer', v_offer.id, v_meta
  )
  returning * into v_msg;

  update public.agency_package_offers
  set message_id = v_msg.id, updated_at = now()
  where id = v_offer.id;

  update public.message_threads set
    last_message_at = now(),
    last_message_preview = v_preview,
    updated_at = now()
  where id = v_thread;

  return jsonb_build_object(
    'ok', true,
    'offer_id', v_offer.id,
    'thread_id', v_thread,
    'message_id', v_msg.id,
    'amount_try', v_offer.amount_try,
    'coins', v_offer.coins,
    'title', v_offer.title,
    'status', v_offer.status
  );
end;
$$;

grant execute on function public.ajans_paket_teklif_olustur(uuid, numeric, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: yalnız şablon (agency_id null)
-- ---------------------------------------------------------------------------
create or replace function public.admin_ajans_paket_katalogu()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;
  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        id,
        package_key,
        title,
        liste_fiyat_try,
        round(liste_fiyat_try * (1 - indirim_yuzde::numeric / 100), 2) as odenecek_try,
        coins,
        indirim_yuzde,
        sort_order,
        is_active
      from public.agency_coin_packages
      where agency_id is null
      order by sort_order asc, liste_fiyat_try asc
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_ajans_paket_katalogu() to authenticated;

create or replace function public.admin_ajans_paket_guncelle(
  p_id uuid,
  p_title text default null,
  p_liste_fiyat_try numeric default null,
  p_coins bigint default null,
  p_indirim_yuzde int default null,
  p_sort_order int default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.agency_coin_packages%rowtype;
begin
  if not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  update public.agency_coin_packages set
    title = coalesce(nullif(trim(p_title), ''), title),
    liste_fiyat_try = coalesce(p_liste_fiyat_try, liste_fiyat_try),
    coins = coalesce(p_coins, coins),
    indirim_yuzde = coalesce(p_indirim_yuzde, indirim_yuzde),
    sort_order = coalesce(p_sort_order, sort_order),
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id
    and agency_id is null
  returning * into v_row;

  if not found then
    raise exception 'Paket bulunamadi';
  end if;

  if v_row.is_active and coalesce(v_row.coins, 0) <= 0 then
    raise exception 'Aktif paket icin coin miktari > 0 olmali';
  end if;
  if v_row.is_active and coalesce(v_row.liste_fiyat_try, 0) <= 0 then
    raise exception 'Aktif paket icin fiyat > 0 olmali';
  end if;

  return jsonb_build_object(
    'ok', true,
    'paket', jsonb_build_object(
      'id', v_row.id,
      'package_key', v_row.package_key,
      'title', v_row.title,
      'liste_fiyat_try', v_row.liste_fiyat_try,
      'odenecek_try', round(v_row.liste_fiyat_try * (1 - v_row.indirim_yuzde::numeric / 100), 2),
      'coins', v_row.coins,
      'indirim_yuzde', v_row.indirim_yuzde,
      'sort_order', v_row.sort_order,
      'is_active', v_row.is_active
    )
  );
end;
$$;

grant execute on function public.admin_ajans_paket_guncelle(
  uuid, text, numeric, bigint, int, int, boolean
) to authenticated;

-- ---------------------------------------------------------------------------
-- Ajansım: kendi katalog (yetkili + coin yetkisi)
-- ---------------------------------------------------------------------------
create or replace function public.ajans_ajans_paket_katalogu(p_agency_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_dist boolean;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_agency_id is null then raise exception 'Agency required'; end if;

  select is_coin_distributor into v_dist
  from public.agencies
  where id = p_agency_id and status = 'active';

  if v_dist is null then raise exception 'Agency not found'; end if;
  if not coalesce(v_dist, false) then
    raise exception 'Agency is not a coin distributor';
  end if;

  if not (
    public.agency_has_permission(p_agency_id, 'agency.manage_coin_operations')
    or public.agency_has_permission(p_agency_id, 'agency.view_finance')
  ) then
    raise exception 'Forbidden';
  end if;

  perform public.ajans_paket_katalog_seed(p_agency_id);

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb)
    from (
      select
        id,
        package_key,
        title,
        liste_fiyat_try,
        round(liste_fiyat_try * (1 - indirim_yuzde::numeric / 100), 2) as odenecek_try,
        coins,
        indirim_yuzde,
        sort_order,
        is_active
      from public.agency_coin_packages
      where agency_id = p_agency_id
      order by sort_order asc, liste_fiyat_try asc
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.ajans_ajans_paket_katalogu(uuid) to authenticated;

create or replace function public.ajans_ajans_paket_guncelle(
  p_agency_id uuid,
  p_id uuid,
  p_title text default null,
  p_liste_fiyat_try numeric default null,
  p_coins bigint default null,
  p_indirim_yuzde int default null,
  p_sort_order int default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_dist boolean;
  v_row public.agency_coin_packages%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_agency_id is null or p_id is null then
    raise exception 'Agency and package required';
  end if;

  select is_coin_distributor into v_dist
  from public.agencies
  where id = p_agency_id and status = 'active';

  if v_dist is null then raise exception 'Agency not found'; end if;
  if not coalesce(v_dist, false) then
    raise exception 'Agency is not a coin distributor';
  end if;

  if not public.agency_has_permission(p_agency_id, 'agency.manage_coin_operations') then
    raise exception 'Forbidden: coin package edit requires manage_coin_operations';
  end if;

  update public.agency_coin_packages set
    title = coalesce(nullif(trim(p_title), ''), title),
    liste_fiyat_try = coalesce(p_liste_fiyat_try, liste_fiyat_try),
    coins = coalesce(p_coins, coins),
    indirim_yuzde = coalesce(p_indirim_yuzde, indirim_yuzde),
    sort_order = coalesce(p_sort_order, sort_order),
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id
    and agency_id = p_agency_id
  returning * into v_row;

  if not found then
    raise exception 'Paket bulunamadi';
  end if;

  if v_row.is_active and coalesce(v_row.coins, 0) <= 0 then
    raise exception 'Aktif paket icin coin miktari > 0 olmali';
  end if;
  if v_row.is_active and coalesce(v_row.liste_fiyat_try, 0) <= 0 then
    raise exception 'Aktif paket icin fiyat > 0 olmali';
  end if;
  if coalesce(v_row.indirim_yuzde, -1) < 0 or coalesce(v_row.indirim_yuzde, 100) >= 100 then
    raise exception 'Indirim %%0-99 olmali';
  end if;

  return jsonb_build_object(
    'ok', true,
    'paket', jsonb_build_object(
      'id', v_row.id,
      'package_key', v_row.package_key,
      'title', v_row.title,
      'liste_fiyat_try', v_row.liste_fiyat_try,
      'odenecek_try', round(v_row.liste_fiyat_try * (1 - v_row.indirim_yuzde::numeric / 100), 2),
      'coins', v_row.coins,
      'indirim_yuzde', v_row.indirim_yuzde,
      'sort_order', v_row.sort_order,
      'is_active', v_row.is_active
    )
  );
end;
$$;

grant execute on function public.ajans_ajans_paket_guncelle(
  uuid, uuid, text, numeric, bigint, int, int, boolean
) to authenticated;
