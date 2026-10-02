-- Çekim sonucu, ajans satış hediyesi ve destek yanıtı push.
-- Ajans üyelik başvurusu / onay / red: system → agency.

-- ---------------------------------------------------------------------------
-- Çekim: onay, ödeme, red
-- ---------------------------------------------------------------------------
create or replace function public.admin_cekim_durum_guncelle(
  p_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.withdrawal_requests%rowtype;
  v_row public.withdrawal_requests%rowtype;
  v_wallet_bal bigint;
  v_host_bal bigint;
  v_refunded boolean;
  v_title text;
  v_body text;
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if p_status not in ('pending','under_review','approved','paid','rejected','frozen') then
    raise exception 'Gecersiz durum';
  end if;

  select * into v_old from public.withdrawal_requests where id = p_id for update;
  if not found then raise exception 'Cekim bulunamadi'; end if;

  v_refunded := coalesce((v_old.details->>'refunded')::boolean, false);

  if p_status = 'rejected'
     and v_old.status not in ('rejected', 'paid')
     and not v_refunded then
    insert into public.wallets (user_id, coins, diamonds)
    values (v_old.user_id, 0, 0)
    on conflict (user_id) do nothing;

    insert into public.host_earnings (user_id, diamonds)
    values (v_old.user_id, 0)
    on conflict (user_id) do nothing;

    update public.wallets
    set diamonds = diamonds + v_old.diamonds, updated_at = now()
    where user_id = v_old.user_id
    returning diamonds into v_wallet_bal;

    update public.host_earnings
    set diamonds = diamonds + v_old.diamonds, updated_at = now()
    where user_id = v_old.user_id
    returning diamonds into v_host_bal;

    insert into public.wallet_ledger (user_id, currency, delta, balance_after, reason, ref_type, ref_id)
    values (
      v_old.user_id, 'diamonds', v_old.diamonds, v_wallet_bal,
      'withdrawal_refund', 'withdrawal', v_old.id
    );

    insert into public.host_earnings_ledger (user_id, delta, balance_after, reason, ref_type, ref_id)
    values (
      v_old.user_id, v_old.diamonds, v_host_bal,
      'withdrawal_refund', 'withdrawal', v_old.id
    );

    v_refunded := true;
  end if;

  update public.withdrawal_requests set
    status = p_status,
    processed_at = case
      when p_status in ('approved','paid','rejected') then now()
      else processed_at
    end,
    details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
      'admin_note', p_note,
      'admin_id', auth.uid(),
      'admin_at', now(),
      'refunded', v_refunded
    )
  where id = p_id
  returning * into v_row;

  perform public.admin_audit_yaz(
    v_row.user_id,
    'withdrawal_' || p_status,
    'Cekim ' || p_status || ': ' || v_row.diamonds::text || ' elmas',
    jsonb_build_object('withdrawal_id', p_id, 'note', p_note, 'refunded', v_refunded)
  );

  if v_old.status is distinct from p_status
     and p_status in ('approved', 'paid', 'rejected') then
    v_title := case p_status
      when 'approved' then 'Çekim onaylandı'
      when 'paid' then 'Çekim ödendi'
      else 'Çekim reddedildi'
    end;
    v_body := case
      when p_status = 'rejected' and v_refunded then
        v_row.diamonds::text || ' elmas çekimin reddedildi. Tutar iade edildi.'
      when p_status = 'rejected' then
        v_row.diamonds::text || ' elmas çekimin reddedildi.'
      when p_status = 'paid' then
        v_row.diamonds::text || ' elmas çekimin ödendi.'
      else
        v_row.diamonds::text || ' elmas çekimin onaylandı.'
    end;
    begin
      perform public.bildirim_kuyruga_ekle(
        v_row.user_id,
        'wallet',
        v_title,
        v_body,
        '/(tabs)/wallet',
        jsonb_build_object(
          'type', 'withdrawal_' || p_status,
          'withdrawal_id', v_row.id
        )
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'id', v_row.id, 'status', v_row.status, 'refunded', v_refunded);
end;
$$;

-- ---------------------------------------------------------------------------
-- Ajans satış hediyesi (10.000 → 1.000). Geçmiş backfill sessiz kalır.
-- ---------------------------------------------------------------------------
create or replace function public.trg_ajans_satis_hediye_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name text;
begin
  if new.reason is distinct from 'sale_volume_gift' or coalesce(new.delta, 0) <= 0 then
    return new;
  end if;

  select a.owner_id, a.name
  into v_owner, v_name
  from public.agencies a
  where a.id = new.agency_id;

  if v_owner is null then
    return new;
  end if;

  begin
    perform public.bildirim_kuyruga_ekle(
      v_owner,
      'agency',
      'Satış hediyesi',
      new.delta::text || ' coin ' || coalesce(v_name, 'ajans') || ' cüzdanına eklendi.',
      '/ajans/' || new.agency_id::text || '/cuzdan',
      jsonb_build_object(
        'type', 'agency_sale_gift',
        'agency_id', new.agency_id,
        'coins', new.delta,
        'ledger_id', new.id
      )
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_ajans_satis_hediye_push on public.agency_wallet_ledger;
create trigger trg_ajans_satis_hediye_push
  after insert on public.agency_wallet_ledger
  for each row
  execute function public.trg_ajans_satis_hediye_push();

revoke all on function public.trg_ajans_satis_hediye_push() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Canlı destek: temsilci yazınca talep sahibine
-- ---------------------------------------------------------------------------
create or replace function public.destek_mesaj_gonder(
  p_session_id uuid,
  p_body text
)
returns public.support_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.support_sessions%rowtype;
  v_msg public.support_messages%rowtype;
  v_body text := trim(coalesce(p_body, ''));
  v_role text;
begin
  if v_uid is null then raise exception 'Oturum gerekli'; end if;
  if char_length(v_body) < 1 then raise exception 'Bos mesaj'; end if;
  if char_length(v_body) > 2000 then raise exception 'Mesaj cok uzun'; end if;

  select * into v_row from public.support_sessions where id = p_session_id for update;
  if not found then raise exception 'Oturum bulunamadi'; end if;

  v_row := public.destek_oturum_idle_kapat(p_session_id);
  if v_row.status not in ('waiting', 'active') then
    raise exception 'Gorusme kapandi';
  end if;

  if v_row.user_id = v_uid then
    v_role := 'user';
  elsif v_row.agent_id = v_uid and public.ben_destek_temsilcisi_miyim() then
    v_role := 'agent';
  elsif public.ben_admin_miyim() then
    v_role := 'agent';
    if v_row.agent_id is null then
      insert into public.support_agents (user_id, is_active, assigned_by)
      values (v_uid, true, v_uid)
      on conflict (user_id) do update set is_active = true, updated_at = now();

      update public.support_sessions set
        agent_id = v_uid,
        status = 'active'
      where id = p_session_id
      returning * into v_row;

      insert into public.support_messages (session_id, sender_id, sender_role, body)
      values (
        p_session_id, null, 'system',
        'Temsilci Toprak görüşmeye katıldı.'
      );
    end if;
  else
    raise exception 'Yetkisiz';
  end if;

  insert into public.support_messages (session_id, sender_id, sender_role, body)
  values (p_session_id, v_uid, v_role, v_body)
  returning * into v_msg;

  update public.support_sessions set
    last_activity_at = now(),
    status = case when status = 'waiting' and v_role = 'agent' then 'active' else status end
  where id = p_session_id;

  if v_role = 'agent' and v_row.user_id is distinct from v_uid then
    begin
      perform public.bildirim_kuyruga_ekle(
        v_row.user_id,
        'system',
        'Destek yanıtı',
        left(v_body, 160),
        '/destek',
        jsonb_build_object(
          'type', 'support_reply',
          'session_id', p_session_id
        )
      );
    exception when others then
      null;
    end;
  end if;

  return v_msg;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ajans destek: mesaj yazılınca ve talep sonuçlanınca
-- ---------------------------------------------------------------------------
create or replace function public.trg_ajans_destek_mesaj_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.agency_support_tickets%rowtype;
begin
  select * into v_ticket
  from public.agency_support_tickets
  where id = new.ticket_id;

  if not found or v_ticket.created_by is not distinct from new.sender_id then
    return new;
  end if;

  begin
    perform public.bildirim_kuyruga_ekle(
      v_ticket.created_by,
      'agency',
      'Destek yanıtı',
      left(coalesce(v_ticket.subject, 'Ajans destek') || ': ' || new.body, 160),
      '/ajans/' || v_ticket.agency_id::text || '/destek',
      jsonb_build_object(
        'type', 'agency_support_reply',
        'agency_id', v_ticket.agency_id,
        'ticket_id', v_ticket.id
      )
    );
  exception when others then
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_ajans_destek_mesaj_push on public.agency_support_messages;
create trigger trg_ajans_destek_mesaj_push
  after insert on public.agency_support_messages
  for each row
  execute function public.trg_ajans_destek_mesaj_push();

revoke all on function public.trg_ajans_destek_mesaj_push() from public, anon, authenticated;

create or replace function public.ajans_destek_durum(
  p_ticket_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.agency_support_tickets%rowtype;
  v_body text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_ticket from public.agency_support_tickets where id = p_ticket_id;
  if not found then raise exception 'Talep yok'; end if;
  perform public.agency_require_permission(v_ticket.agency_id, 'agency.manage_support');

  update public.agency_support_tickets
  set status = p_status, updated_at = now()
  where id = p_ticket_id;

  if p_status in ('resolved', 'closed')
     and v_ticket.status is distinct from p_status
     and v_ticket.created_by is distinct from auth.uid() then
    v_body := case p_status
      when 'resolved' then coalesce(v_ticket.subject, 'Talebin') || ' çözüldü.'
      else coalesce(v_ticket.subject, 'Talebin') || ' kapatıldı.'
    end;
    begin
      perform public.bildirim_kuyruga_ekle(
        v_ticket.created_by,
        'agency',
        'Destek talebi',
        left(v_body, 160),
        '/ajans/' || v_ticket.agency_id::text || '/destek',
        jsonb_build_object(
          'type', 'agency_support_reply',
          'agency_id', v_ticket.agency_id,
          'ticket_id', v_ticket.id,
          'status', p_status
        )
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Üyelik bildirimleri Ajans kategorisine
-- ---------------------------------------------------------------------------
do $$
declare
  src text;
  patched text;
  targets text[] := array[
    'public.ajans_uye_basvurusu_olustur(uuid, text)',
    'public.ajans_host_basvurusunu_onayla(uuid)',
    'public.ajans_host_basvurusunu_reddet(uuid, text)'
  ];
  titles text[] := array[
    'Ajans katilim basvurusu',
    'Ajans başvurun onaylandı',
    'Ajans başvurun reddedildi'
  ];
  i int;
begin
  for i in 1..3 loop
    src := pg_get_functiondef(targets[i]::regprocedure);
    patched := regexp_replace(
      src,
      '(''system'')(\s*,\s*''' || titles[i] || ''')',
      '''agency''\2'
    );
    if patched = src then
      if src ~ ('''agency''[[:space:]]*,[[:space:]]*''' || titles[i] || '''') then
        continue;
      end if;
      raise exception 'Ajans bildirim kategorisi guncellenemedi: %', titles[i];
    end if;
    execute patched;
  end loop;
end;
$$;
