-- Bildirim tür kataloğu: kullanıcı bildirim merkezinden her türü açar/kapatır.
-- Yeni bir push payload.type veya payload.kind ile kuyruğa girerse kataloga eklenir.

create table if not exists public.bildirim_tur_katalog (
  kod text primary key,
  grup text not null,
  kitle text not null default 'kullanici',
  varsayilan_acik boolean not null default true,
  grup_sira integer not null default 90,
  sira integer not null default 100,
  baslik jsonb not null default '{}'::jsonb,
  aciklama jsonb not null default '{}'::jsonb,
  constraint bildirim_tur_katalog_kitle_chk
    check (kitle in ('kullanici', 'ajans_sahibi', 'yonetici'))
);

create table if not exists public.kullanici_bildirim_tercihi (
  user_id uuid not null references auth.users (id) on delete cascade,
  kod text not null references public.bildirim_tur_katalog (kod) on delete cascade,
  acik boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kod)
);

alter table public.bildirim_tur_katalog enable row level security;
alter table public.kullanici_bildirim_tercihi enable row level security;

create or replace function public.bildirim_kitle_gorunur_mu(
  p_kitle text,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_user_id is distinct from auth.uid() then
    return false;
  end if;
  if p_kitle = 'kullanici' then
    return true;
  end if;
  if p_kitle = 'ajans_sahibi' then
    return exists (
      select 1 from public.agencies a where a.owner_id = p_user_id
    );
  end if;
  if p_kitle = 'yonetici' then
    return public.ben_admin_miyim();
  end if;
  return false;
end;
$$;

revoke all on function public.bildirim_kitle_gorunur_mu(text, uuid) from public, anon;
grant execute on function public.bildirim_kitle_gorunur_mu(text, uuid) to authenticated;

drop policy if exists bildirim_tur_katalog_oku on public.bildirim_tur_katalog;
create policy bildirim_tur_katalog_oku
  on public.bildirim_tur_katalog
  for select
  to authenticated
  using (public.bildirim_kitle_gorunur_mu(kitle, auth.uid()));

drop policy if exists kullanici_bildirim_tercihi_oku on public.kullanici_bildirim_tercihi;
create policy kullanici_bildirim_tercihi_oku
  on public.kullanici_bildirim_tercihi
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.bildirim_tur_katalog to authenticated;
grant select on public.kullanici_bildirim_tercihi to authenticated;

insert into public.bildirim_tur_katalog (
  kod, grup, kitle, varsayilan_acik, grup_sira, sira, baslik, aciklama
)
select
  v.kod,
  v.grup,
  v.kitle,
  v.varsayilan,
  v.grup_sira,
  v.sira,
  jsonb_build_object('tr', v.baslik_tr, 'en', v.baslik_en),
  jsonb_build_object('tr', v.aciklama_tr, 'en', v.aciklama_en)
from (
  values
    ('dm', 'messages', 'kullanici', true, 10, 10, 'Özel mesaj', 'Private message', 'Özel mesaj ve dosya gelince', 'When a private message or file arrives'),
    ('incoming_call', 'calls', 'kullanici', true, 20, 10, 'Gelen arama', 'Incoming call', 'Sesli veya görüntülü arama', 'Voice or video call'),
    ('calls', 'calls', 'kullanici', true, 20, 20, 'Arama denemesi', 'Call attempt', 'Kişiler araması ve kapalıyken gelen deneme', 'Contacts call and an attempt while calls are closed'),
    ('gift_received', 'gifts', 'kullanici', true, 30, 10, 'Hediye', 'Gift', 'Sana hediye gelince', 'When you receive a gift'),
    ('status_gift', 'gifts', 'kullanici', true, 30, 20, 'Durum hediyesi', 'Status gift', 'Gönderine hediye gelince', 'When a gift arrives on your post'),
    ('live_start', 'live', 'kullanici', true, 40, 10, 'Canlı yayın', 'Live', 'Takip ettiğin biri canlıya geçince', 'When someone you follow goes live'),
    ('pk_invite', 'live', 'kullanici', true, 40, 20, 'PK daveti', 'PK invite', 'Canlı PK daveti', 'Live PK invitation'),
    ('pk_rejected', 'live', 'kullanici', true, 40, 30, 'PK yanıtı', 'PK reply', 'PK davetin reddedilince', 'When your PK invite is declined'),
    ('live', 'live', 'kullanici', true, 40, 90, 'Diğer canlı', 'Other live', 'Tür kodu olmayan canlı bildirimleri', 'Live alerts without their own switch'),
    ('room_live', 'rooms', 'kullanici', true, 50, 10, 'Oda canlı', 'Room live', 'Bir oda canlıya geçince', 'When a room goes live'),
    ('follow_request', 'social', 'kullanici', true, 60, 10, 'Takip isteği', 'Follow request', 'Biri seni takip etmek istediğinde', 'When someone requests to follow you'),
    ('new_follower', 'social', 'kullanici', true, 60, 20, 'Yeni takip', 'New follower', 'Biri seni takip edince', 'When someone follows you'),
    ('follow_request_accepted', 'social', 'kullanici', true, 60, 30, 'İstek kabul edildi', 'Request accepted', 'Takip isteğin kabul edilince', 'When your follow request is accepted'),
    ('status_comment', 'social', 'kullanici', true, 60, 40, 'Yorum', 'Comment', 'Durumuna yorum gelince', 'When someone comments on your status'),
    ('status_like', 'social', 'kullanici', true, 60, 50, 'Beğeni', 'Like', 'Durumun beğenilince', 'When someone likes your status'),
    ('wallet_transfer_in', 'wallet', 'kullanici', true, 70, 10, 'Gelen coin', 'Incoming coins', 'Cüzdanına coin gelince', 'When coins arrive in your wallet'),
    ('wallet_transfer_out', 'wallet', 'kullanici', true, 70, 20, 'Gönderilen coin', 'Sent coins', 'Coin gönderince', 'When you send coins'),
    ('coin_purchase', 'wallet', 'kullanici', true, 70, 30, 'Coin yüklemesi', 'Coin top-up', 'Yükleme tamamlanınca', 'When a top-up completes'),
    ('agency_topup', 'wallet', 'kullanici', true, 70, 40, 'Ajanstan coin', 'Agency coins', 'Ajans sana coin yükleyince', 'When an agency sends you coins'),
    ('withdrawal_approved', 'wallet', 'kullanici', true, 70, 50, 'Çekim onayı', 'Withdrawal approved', 'Çekim isteğin onaylanınca', 'When a withdrawal is approved'),
    ('withdrawal_paid', 'wallet', 'kullanici', true, 70, 60, 'Çekim ödemesi', 'Withdrawal paid', 'Çekim ödenince', 'When a withdrawal is paid'),
    ('withdrawal_rejected', 'wallet', 'kullanici', true, 70, 70, 'Çekim reddi', 'Withdrawal rejected', 'Çekim isteğin reddedilince', 'When a withdrawal is rejected'),
    ('trade_offer_new', 'wallet', 'kullanici', true, 70, 80, 'Takas teklifi', 'Trade offer', 'Yeni coin teklifi', 'A new coin trade offer'),
    ('trade_offer_accepted', 'wallet', 'kullanici', true, 70, 90, 'Takas kabulü', 'Trade accepted', 'Teklif kabul edilince', 'When an offer is accepted'),
    ('trade_offer_rejected', 'wallet', 'kullanici', true, 70, 100, 'Takas reddi', 'Trade declined', 'Teklif reddedilince', 'When an offer is declined'),
    ('trade_payment_info', 'wallet', 'kullanici', true, 70, 110, 'Ödeme bilgisi', 'Payment details', 'Takasta ödeme bilgisi girilince', 'When trade payment details are added'),
    ('trade_receipt_uploaded', 'wallet', 'kullanici', true, 70, 120, 'Dekont', 'Receipt', 'Takas dekontu yüklenince', 'When a trade receipt is uploaded'),
    ('trade_completed', 'wallet', 'kullanici', true, 70, 130, 'Takas tamam', 'Trade complete', 'Takas platform onayından geçince', 'When a trade is completed'),
    ('trade_platform_rejected', 'wallet', 'kullanici', true, 70, 140, 'Takas iptali', 'Trade cancelled', 'Platform takası iptal edince', 'When the platform cancels a trade'),
    ('mahkeme', 'wallet', 'kullanici', true, 70, 150, 'Takas mahkemesi', 'Trade dispute', 'Mahkeme açılınca', 'When a trade dispute opens'),
    ('agency_announcement', 'agency', 'kullanici', true, 80, 10, 'Ajans duyurusu', 'Agency announcement', 'Ajansın duyuru yayınlayınca', 'When your agency posts an announcement'),
    ('agency_support_reply', 'agency', 'kullanici', true, 80, 20, 'Ajans destek', 'Agency support', 'Destek talebine yanıt veya kapanış', 'Reply or closure on an agency support ticket'),
    ('agency_host_approved', 'agency', 'kullanici', true, 80, 30, 'Başvurun onaylandı', 'Application approved', 'Ajans üyelik başvurun onaylanınca', 'When your agency application is approved'),
    ('agency_host_rejected', 'agency', 'kullanici', true, 80, 40, 'Başvurun reddedildi', 'Application declined', 'Ajans üyelik başvurun reddedilince', 'When your agency application is declined'),
    ('agency_application_submitted', 'agency', 'kullanici', true, 80, 50, 'Ajans başvurun alındı', 'Agency application received', 'Ajans açma başvurun kayda geçince', 'When your agency application is received'),
    ('agency_application', 'agency', 'kullanici', true, 80, 55, 'Ajans başvurusu', 'Agency application', 'Başvuru durumu', 'Application status'),
    ('verification_required', 'agency', 'kullanici', true, 80, 60, 'Doğrulama gerekli', 'Verification required', 'Ajans hesabını etkinleştirmek için', 'Required to activate the agency account'),
    ('agency_under_review', 'agency', 'kullanici', true, 80, 70, 'Başvuru inceleniyor', 'Application in review', 'Ajans başvurun incelemeye alınınca', 'When your agency application is in review'),
    ('agency_more_info', 'agency', 'kullanici', true, 80, 80, 'Ek bilgi', 'More information', 'Başvuru için ek bilgi istenince', 'When more information is requested'),
    ('agency_approved', 'agency', 'kullanici', true, 80, 90, 'Ajans ön onayı', 'Agency pre-approval', 'Ajans başvurun ön onay alınca', 'When the agency application is pre-approved'),
    ('agency_activated', 'agency', 'kullanici', true, 80, 100, 'Ajans etkin', 'Agency active', 'Ajans hesabın etkinleşince', 'When the agency account is activated'),
    ('agency_rejected', 'agency', 'kullanici', true, 80, 110, 'Ajans başvurusu reddi', 'Agency application declined', 'Ajans açma başvurun reddedilince', 'When the agency application is declined'),
    ('document_submitted', 'agency', 'kullanici', true, 80, 120, 'Belge alındı', 'Document received', 'Doğrulama belgen kayda geçince', 'When your verification document is received'),
    ('document_reviewed', 'agency', 'kullanici', true, 80, 130, 'Belge sonucu', 'Document result', 'Belgen onaylanınca, reddedilince veya yeniden istenince', 'When a document is approved, declined, or must be resent'),
    ('agency_closed', 'agency', 'kullanici', true, 80, 140, 'Ajans kapatıldı', 'Agency closed', 'Ajansın kapatılınca', 'When the agency is closed'),
    ('agency_host_apply', 'agency', 'ajans_sahibi', true, 80, 200, 'Üyelik başvurusu', 'Membership application', 'Biri ajansına katılmak istediğinde', 'When someone applies to join your agency'),
    ('agency_sale_paid', 'agency', 'ajans_sahibi', true, 80, 210, 'Stripe satışı', 'Stripe sale', 'Satış ödemesi tamamlanınca', 'When a sale payment completes'),
    ('agency_sale_gift', 'agency', 'ajans_sahibi', true, 80, 220, 'Satış hediyesi', 'Sale gift', 'Hediye coin ajans cüzdanına eklenince', 'When gift coins are added to the agency wallet'),
    ('support_reply', 'system', 'kullanici', true, 90, 10, 'Destek yanıtı', 'Support reply', 'Canlı destek yazınca', 'When live support replies'),
    ('admin_warning', 'system', 'kullanici', true, 90, 20, 'Hesap uyarısı', 'Account warning', 'Yönetim uyarı verince', 'When moderation sends a warning'),
    ('user_verification', 'system', 'kullanici', true, 90, 30, 'Kimlik doğrulama', 'Identity verification', 'Doğrulama durumun değişince', 'When your verification status changes'),
    ('feedback_status', 'system', 'kullanici', true, 90, 40, 'Fikir durumu', 'Idea update', 'Fikir merkezinde durum veya yanıt', 'Status or reply in the ideas center'),
    ('report_status', 'system', 'kullanici', true, 90, 50, 'Rapor sonucu', 'Report update', 'Gönderdiğin raporun durumu değişince', 'When a report you sent changes status'),
    ('purchase_dispute_decision', 'system', 'kullanici', true, 90, 60, 'Satın alma itirazı', 'Purchase dispute', 'İtirazın sonuçlanınca', 'When a purchase dispute is decided'),
    ('purchase_dispute', 'system', 'kullanici', true, 90, 70, 'İtiraz kaydı', 'Dispute filed', 'Satın alma itirazı açılınca', 'When a purchase dispute is opened'),
    ('upload_ban', 'system', 'kullanici', true, 90, 80, 'Yükleme cezası', 'Upload restriction', 'Yükleme kısıtı uygulanınca', 'When an upload restriction is applied'),
    ('room_create_ban', 'system', 'kullanici', true, 90, 90, 'Oda açma yasağı', 'Room restriction', 'Oda açma yasağı uygulanınca', 'When a room-creation restriction is applied'),
    ('system', 'system', 'kullanici', true, 90, 900, 'Diğer sistem', 'Other system', 'Ayrı anahtarı olmayan sistem bildirimleri', 'System alerts without their own switch'),
    ('admin_new_registration', 'system', 'yonetici', true, 95, 10, 'Yeni kayıt', 'New registration', 'Platforma yeni kullanıcı gelince', 'When a new user registers'),
    ('admin_daily_registrations', 'system', 'yonetici', true, 95, 20, 'Günlük kayıt özeti', 'Daily signups', 'Günlük kayıt özeti', 'Daily registration summary'),
    ('admin_platform_security', 'system', 'yonetici', true, 95, 30, 'Platform güvenliği', 'Platform security', 'Güvenlik uyarısı', 'Security alert')
) as v (
  kod, grup, kitle, varsayilan, grup_sira, sira,
  baslik_tr, baslik_en, aciklama_tr, aciklama_en
)
on conflict (kod) do update set
  grup = excluded.grup,
  kitle = excluded.kitle,
  grup_sira = excluded.grup_sira,
  sira = excluded.sira,
  baslik = excluded.baslik,
  aciklama = excluded.aciklama;

create or replace function public.bildirim_turu_acik_mi(
  p_user_id uuid,
  p_kod text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select t.acik
      from public.kullanici_bildirim_tercihi t
      where t.user_id = p_user_id
        and t.kod = p_kod
    ),
    (
      select k.varsayilan_acik
      from public.bildirim_tur_katalog k
      where k.kod = p_kod
    ),
    true
  );
$$;

revoke all on function public.bildirim_turu_acik_mi(uuid, text) from public, anon, authenticated;

create or replace function public.bildirim_ana_acik_mi(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.all_enabled
      from public.user_push_preferences p
      where p.user_id = p_user_id
    ),
    true
  );
$$;

revoke all on function public.bildirim_ana_acik_mi(uuid) from public, anon, authenticated;

create or replace function public.bildirim_kuyruga_ekle(
  p_user_id uuid,
  p_category text,
  p_title text,
  p_body text default null,
  p_deep_link text default null,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inbox_id uuid;
  v_outbox_id uuid;
  v_cat text := lower(trim(coalesce(p_category, 'system')));
  v_title text;
  v_body text;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_actor uuid;
  v_link text;
  v_mesaj_mi boolean := v_cat in ('messages', 'message');
  v_thread uuid;
  v_kod text;
  v_grup text;
begin
  if p_user_id is null then return null; end if;
  if p_title is null or length(trim(p_title)) = 0 then return null; end if;
  if not public.hesap_aktif_mi(p_user_id) then return null; end if;
  if not public.bildirim_ana_acik_mi(p_user_id) then return null; end if;

  v_title := left(trim(p_title), 120);
  v_body := case when p_body is null then null else left(trim(p_body), 400) end;
  v_actor := public.bildirim_payload_actor_id(v_payload);
  v_link := public.bildirim_hedef_link(v_cat, p_deep_link, v_payload);

  if v_actor is not null and (v_payload->>'actor_id') is null then
    v_payload := v_payload || jsonb_build_object('actor_id', v_actor);
  end if;

  v_kod := lower(left(trim(coalesce(
    nullif(v_payload->>'type', ''),
    nullif(v_payload->>'kind', ''),
    v_cat
  )), 64));

  v_grup := case v_cat
    when 'message' then 'messages'
    when 'gift' then 'gifts'
    when 'call' then 'calls'
    when 'room' then 'rooms'
    when 'follow' then 'social'
    when 'agency_announcement' then 'agency'
    else v_cat
  end;

  insert into public.bildirim_tur_katalog (
    kod, grup, kitle, varsayilan_acik, grup_sira, sira, baslik, aciklama
  ) values (
    v_kod,
    v_grup,
    'kullanici',
    true,
    100,
    500,
    jsonb_build_object(
      'tr', initcap(replace(v_kod, '_', ' ')),
      'en', initcap(replace(v_kod, '_', ' '))
    ),
    '{}'::jsonb
  )
  on conflict (kod) do nothing;

  if not public.bildirim_turu_acik_mi(p_user_id, v_kod) then
    return null;
  end if;

  if v_mesaj_mi then
    begin
      v_thread := nullif(v_payload->>'thread_id', '')::uuid;
    exception when others then
      v_thread := null;
    end;
    if v_thread is not null
       and public.ozellik_bayragi_aktif_mi('conversation_mute_enabled')
       and public.mesaj_thread_muted_mi(p_user_id, v_thread) then
      return null;
    end if;

    insert into public.notification_outbox (
      user_id, category, title, body, deep_link, payload, status
    ) values (
      p_user_id, v_cat, v_title, v_body, v_link, v_payload, 'pending'
    )
    returning id into v_outbox_id;
    return v_outbox_id;
  end if;

  insert into public.user_notifications (
    user_id, category, title, body, deep_link, payload, actor_id
  ) values (
    p_user_id, v_cat, v_title, v_body, v_link, v_payload, v_actor
  )
  returning id into v_inbox_id;

  insert into public.notification_outbox (
    user_id, category, title, body, deep_link, payload, status
  ) values (
    p_user_id, v_cat, v_title, v_body, v_link, v_payload, 'pending'
  )
  returning id into v_outbox_id;

  return coalesce(v_outbox_id, v_inbox_id);
end;
$$;

create or replace function public.benim_bildirim_anahtarlarim(p_dil text default 'tr')
returns table (
  kod text,
  grup text,
  baslik text,
  aciklama text,
  acik boolean,
  sira integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_dil text := lower(left(coalesce(nullif(trim(p_dil), ''), 'tr'), 2));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    k.kod,
    k.grup,
    coalesce(k.baslik->>v_dil, k.baslik->>'en', k.baslik->>'tr', k.kod)::text,
    coalesce(k.aciklama->>v_dil, k.aciklama->>'en', k.aciklama->>'tr', '')::text,
    coalesce(t.acik, k.varsayilan_acik),
    k.sira
  from public.bildirim_tur_katalog k
  left join public.kullanici_bildirim_tercihi t
    on t.kod = k.kod
   and t.user_id = v_uid
  where public.bildirim_kitle_gorunur_mu(k.kitle, v_uid)
  order by k.grup_sira, k.sira, k.kod;
end;
$$;

create or replace function public.bildirim_anahtarini_kaydet(
  p_kod text,
  p_acik boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kod text := lower(left(trim(coalesce(p_kod, '')), 64));
  v_kitle text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_acik is null or v_kod = '' then
    raise exception 'Gecersiz bildirim anahtari';
  end if;

  select k.kitle into v_kitle
  from public.bildirim_tur_katalog k
  where k.kod = v_kod;

  if not found or not public.bildirim_kitle_gorunur_mu(v_kitle, v_uid) then
    raise exception 'Bildirim turu yok';
  end if;

  insert into public.kullanici_bildirim_tercihi (user_id, kod, acik)
  values (v_uid, v_kod, p_acik)
  on conflict (user_id, kod) do update
  set acik = excluded.acik,
      updated_at = now();

  return p_acik;
end;
$$;

grant execute on function public.benim_bildirim_anahtarlarim(text) to authenticated;
grant execute on function public.bildirim_anahtarini_kaydet(text, boolean) to authenticated;

-- PK davetleri ayrı anahtara bağlansın
do $$
declare
  r record;
  src text;
  patched text;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('pk_davet_gonder', 'pk_davet_yanitla')
  loop
    src := pg_get_functiondef(r.sig);
    patched := src;
    if r.proname = 'pk_davet_gonder' and position('''type'', ''pk_invite''' in src) = 0 then
      patched := replace(
        src,
        '''invite_id'', v_row.id,',
        '''type'', ''pk_invite'', ''invite_id'', v_row.id,'
      );
    elsif r.proname = 'pk_davet_yanitla' and position('''type'', ''pk_rejected''' in src) = 0 then
      patched := replace(
        src,
        'jsonb_build_object(''invite_id'', v_inv.id, ''status'', ''rejected'')',
        'jsonb_build_object(''type'', ''pk_rejected'', ''invite_id'', v_inv.id, ''status'', ''rejected'')'
      );
    end if;
    if patched = src then
      if position('''type'', ''pk_invite''' in src) > 0
         or position('''type'', ''pk_rejected''' in src) > 0 then
        continue;
      end if;
      raise exception 'PK bildirim tipi eklenemedi: %', r.proname;
    end if;
    execute patched;
  end loop;
end;
$$;
