-- Ajanstan coin: alıcı paket seçince ajansa talep mesajı gider (öde butonu yok).
-- Ödenebilir teklif kartını yalnızca ajans sahibi gönderir.

create or replace function public.ajans_paket_teklif_olustur(
  p_agency_id uuid,
  p_liste_fiyat_try numeric,
  p_buyer_id uuid default null::uuid,
  p_thread_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  v_talep boolean;
  v_alici_ad text;
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

  v_talep := v_uid <> v_owner;

  if not v_talep then
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
      where thread_id = p_thread_id and user_id = case when v_talep then v_owner else v_buyer end
    ) then
      raise exception 'Buyer not in thread';
    end if;
    v_thread := p_thread_id;
  else
    v_thread := public.ajans_sohbet_ac_veya_getir(p_agency_id);
  end if;

  if v_talep then
    v_body := format(
      E'Paket talebi: %s · %s coin · %s ₺ (%%%s ajans indirimi)\nÖdeme kartını gönderebilir misiniz?',
      v_kat->>'title',
      to_char((v_kat->>'coins')::bigint, 'FM999,999,999'),
      to_char((v_kat->>'amount_try')::numeric, 'FM999,999,990.00'),
      v_kat->>'indirim_yuzde'
    );
    v_preview := left(v_body, 120);

    insert into public.direct_messages (
      thread_id, sender_id, body, message_type, media_meta
    ) values (
      v_thread, v_uid, left(v_body, 4000), 'text',
      jsonb_build_object(
        'kind', 'agency_package_request',
        'agency_id', p_agency_id,
        'package_key', v_kat->>'package_key',
        'title', v_kat->>'title',
        'liste_fiyat_try', (v_kat->>'liste_fiyat_try')::numeric,
        'amount_try', (v_kat->>'amount_try')::numeric,
        'coins', (v_kat->>'coins')::bigint,
        'indirim_yuzde', (v_kat->>'indirim_yuzde')::int
      )
    )
    returning * into v_msg;

    update public.message_threads set
      last_message_at = now(),
      last_message_preview = v_preview,
      updated_at = now()
    where id = v_thread;

    update public.message_thread_members set
      archived_at = null,
      deleted_at = null
    where thread_id = v_thread
      and (archived_at is not null or deleted_at is not null);

    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Kullanıcı')
      into v_alici_ad
    from public.profiles where id = v_uid;

    perform public.bildirim_kuyruga_ekle(
      v_owner,
      'messages',
      v_alici_ad,
      v_preview,
      '/mesaj/' || v_thread::text,
      jsonb_build_object(
        'thread_id', v_thread,
        'sender_id', v_uid,
        'type', 'dm',
        'message_id', v_msg.id
      )
    );

    -- Eski istemciler offer_id bekler; talepte mesaj id'si döner, kart oluşmaz.
    return jsonb_build_object(
      'ok', true,
      'request', true,
      'offer_id', v_msg.id,
      'thread_id', v_thread,
      'message_id', v_msg.id,
      'amount_try', (v_kat->>'amount_try')::numeric,
      'coins', (v_kat->>'coins')::bigint,
      'title', v_kat->>'title',
      'status', 'requested'
    );
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
$function$;

-- Alıcının kendi açtığı bekleyen teklifler kapanır (son 2 saatte ödeme başlatılmışsa dokunulmaz).
with iptal as (
  update public.agency_package_offers o
  set status = 'cancelled', updated_at = now()
  where o.status = 'pending'
    and o.created_by = o.buyer_id
    and not exists (
      select 1 from public.payment_orders p
      where p.agency_package_offer_id = o.id
        and p.created_at > now() - interval '2 hours'
    )
  returning o.message_id
)
update public.direct_messages d
set media_meta = coalesce(d.media_meta, '{}'::jsonb) || jsonb_build_object('status', 'cancelled')
from iptal
where d.id = iptal.message_id;
