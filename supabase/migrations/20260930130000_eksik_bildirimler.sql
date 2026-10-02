-- Unutulan bildirimler: ajans destek, ban, ödül, yorum beğenisi,
-- takip reddi, mahkeme kapanışı, arama sonucu, PK iptali.

insert into public.bildirim_tur_katalog (
  kod, grup, kitle, varsayilan_acik, grup_sira, sira, baslik, aciklama
)
select
  v.kod, v.grup, v.kitle, true, v.grup_sira, v.sira,
  jsonb_build_object('tr', v.baslik_tr, 'en', v.baslik_en),
  jsonb_build_object('tr', v.aciklama_tr, 'en', v.aciklama_en)
from (
  values
    ('comment_like', 'social', 'kullanici', 60, 60, 'Yorum beğenisi', 'Comment like', 'Yorumun beğenilince', 'When someone likes your comment'),
    ('follow_request_rejected', 'social', 'kullanici', 60, 35, 'Takip isteği reddi', 'Follow request declined', 'Takip isteğin reddedilince', 'When your follow request is declined'),
    ('call_rejected', 'calls', 'kullanici', 20, 30, 'Arama reddedildi', 'Call declined', 'Araman reddedilince', 'When your call is declined'),
    ('call_missed', 'calls', 'kullanici', 20, 40, 'Cevapsız arama', 'Missed call', 'Arama yanıtlanmadan kapanınca', 'When a call ends without an answer'),
    ('call_cancelled', 'calls', 'kullanici', 20, 50, 'Arama iptal', 'Call cancelled', 'Gelen arama sen açmadan kapanınca', 'When an incoming call is cancelled'),
    ('pk_invite_cancelled', 'live', 'kullanici', 40, 40, 'PK daveti iptal', 'PK invite cancelled', 'PK daveti geri çekilince', 'When a PK invite is withdrawn'),
    ('trade_dispute_closed', 'wallet', 'kullanici', 70, 160, 'Mahkeme kapandı', 'Dispute closed', 'Takas mahkemesi kapanınca', 'When a trade dispute is closed'),
    ('account_ban', 'system', 'kullanici', 90, 15, 'Hesap kapatıldı', 'Account closed', 'Hesabın kullanıma kapatılınca', 'When your account is closed'),
    ('agency_reward', 'agency', 'kullanici', 80, 45, 'Ajans ödülü', 'Agency reward', 'Ajans sana ödül verince', 'When your agency gives you a reward'),
    ('agency_support_opened', 'agency', 'ajans_sahibi', 80, 230, 'Yeni destek talebi', 'New support ticket', 'Üye destek talebi açınca', 'When a member opens a support ticket'),
    ('agency_support_member', 'agency', 'ajans_sahibi', 80, 240, 'Destek talebine yazıldı', 'Support ticket reply', 'Üye destek talebine yazınca', 'When a member writes on a support ticket')
) as v(kod, grup, kitle, grup_sira, sira, baslik_tr, baslik_en, aciklama_tr, aciklama_en)
on conflict (kod) do update set
  grup = excluded.grup,
  kitle = excluded.kitle,
  grup_sira = excluded.grup_sira,
  sira = excluded.sira,
  baslik = excluded.baslik,
  aciklama = excluded.aciklama;

create or replace function public.ajans_destek_olustur(
  p_agency_id uuid,
  p_subject text,
  p_body text,
  p_priority text default 'normal'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_owner uuid;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  if not (
    exists (
      select 1 from public.host_profiles
      where agency_id = p_agency_id and user_id = auth.uid() and status = 'agency'
    )
    or exists (select 1 from public.agencies where id = p_agency_id and owner_id = auth.uid())
    or public.agency_has_permission(p_agency_id, 'agency.manage_support')
  ) then raise exception 'Forbidden'; end if;

  insert into public.agency_support_tickets (
    agency_id, created_by, subject, body, priority
  ) values (
    p_agency_id, auth.uid(),
    left(trim(p_subject), 120),
    left(trim(p_body), 4000),
    coalesce(nullif(p_priority, ''), 'normal')
  ) returning id into v_id;

  perform public.agency_audit_yaz(p_agency_id, 'support_create', 'Destek talebi', auth.uid(),
    jsonb_build_object('ticket_id', v_id));

  select a.owner_id into v_owner
  from public.agencies a
  where a.id = p_agency_id;

  if v_owner is not null and v_owner is distinct from auth.uid() then
    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Bir üye')
    into v_name
    from public.profiles
    where id = auth.uid();

    begin
      perform public.bildirim_kuyruga_ekle(
        v_owner,
        'agency',
        'Yeni destek talebi',
        left(coalesce(v_name, 'Bir üye') || ': ' || left(trim(p_subject), 120), 160),
        '/ajans/' || p_agency_id::text || '/destek',
        jsonb_build_object(
          'type', 'agency_support_opened',
          'agency_id', p_agency_id,
          'ticket_id', v_id,
          'actor_id', auth.uid()
        )
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.trg_ajans_destek_mesaj_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.agency_support_tickets%rowtype;
  v_owner uuid;
  v_name text;
begin
  select * into v_ticket
  from public.agency_support_tickets
  where id = new.ticket_id;

  if not found then
    return new;
  end if;

  if v_ticket.created_by is distinct from new.sender_id then
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
  else
    select a.owner_id into v_owner
    from public.agencies a
    where a.id = v_ticket.agency_id;

    if v_owner is not null and v_owner is distinct from new.sender_id then
      select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Bir üye')
      into v_name
      from public.profiles
      where id = new.sender_id;

      begin
        perform public.bildirim_kuyruga_ekle(
          v_owner,
          'agency',
          'Destek talebine yazıldı',
          left(coalesce(v_name, 'Bir üye') || ': ' || coalesce(v_ticket.subject, '') || ' — ' || new.body, 160),
          '/ajans/' || v_ticket.agency_id::text || '/destek',
          jsonb_build_object(
            'type', 'agency_support_member',
            'agency_id', v_ticket.agency_id,
            'ticket_id', v_ticket.id,
            'actor_id', new.sender_id
          )
        );
      exception when others then
        null;
      end;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.admin_kullanici_banla(
  p_user_id uuid,
  p_reason text default 'policy_violation'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'policy_violation');
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if p_user_id = auth.uid() then raise exception 'Kendini banlayamazsin'; end if;

  update public.profiles set
    banned_at = now(),
    ban_reason = v_reason,
    updated_at = now()
  where id = p_user_id;

  update public.device_sessions
    set revoked_at = now()
  where user_id = p_user_id and revoked_at is null;

  perform public.platform_guvenlik_ban_cihazlar(p_user_id, v_reason);

  insert into public.security_events (user_id, event_type, severity, metadata)
  values (
    p_user_id, 'account_banned', 'high',
    jsonb_build_object('reason', v_reason, 'by', auth.uid())
  );

  perform public.admin_audit_yaz(
    p_user_id, 'ban',
    'Kullanici banlandi: ' || v_reason,
    jsonb_build_object('reason', v_reason)
  );

  begin
    perform public.bildirim_kuyruga_ekle(
      p_user_id,
      'system',
      'Hesabın kapatıldı',
      'Hesabın platform kuralları nedeniyle kullanıma kapatıldı.',
      '/guvenlik',
      jsonb_build_object('type', 'account_ban', 'reason', v_reason)
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('ok', true, 'kod', 'banned');
end;
$$;

create or replace function public.ajans_odul_ver(
  p_agency_id uuid,
  p_reward_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_title text;
  v_agency text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  perform public.agency_require_permission(p_agency_id, 'agency.manage_members');

  select r.title into v_title
  from public.agency_rewards r
  where r.id = p_reward_id and r.agency_id = p_agency_id and r.is_active;
  if not found then raise exception 'Ödül yok'; end if;

  insert into public.agency_reward_grants (reward_id, agency_id, user_id, granted_by)
  values (p_reward_id, p_agency_id, p_user_id, auth.uid())
  returning id into v_id;

  perform public.agency_audit_yaz(p_agency_id, 'reward_grant', 'Ödül verildi', p_user_id,
    jsonb_build_object('grant_id', v_id, 'reward_id', p_reward_id));

  if p_user_id is distinct from auth.uid() then
    select a.name into v_agency from public.agencies a where a.id = p_agency_id;
    begin
      perform public.bildirim_kuyruga_ekle(
        p_user_id,
        'agency',
        'Ajans ödülü',
        left(coalesce(v_agency, 'Ajans') || ' sana ödül verdi: ' || coalesce(v_title, 'Ödül'), 160),
        '/ajans/' || p_agency_id::text,
        jsonb_build_object(
          'type', 'agency_reward',
          'agency_id', p_agency_id,
          'reward_id', p_reward_id,
          'grant_id', v_id
        )
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.durum_yorum_begeni_toggle(p_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_c public.status_comments%rowtype;
  v_liked boolean;
  v_count int;
  v_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir begeni yapamaz'; end if;

  select * into v_c
  from public.status_comments
  where id = p_comment_id and deleted_at is null;
  if v_c.id is null then raise exception 'Yorum yok'; end if;

  if exists (
    select 1 from public.status_comment_likes
    where comment_id = p_comment_id and user_id = v_uid
  ) then
    delete from public.status_comment_likes
    where comment_id = p_comment_id and user_id = v_uid;
    v_liked := false;
  else
    insert into public.status_comment_likes (comment_id, user_id)
    values (p_comment_id, v_uid);
    v_liked := true;
  end if;

  select count(*)::int into v_count
  from public.status_comment_likes
  where comment_id = p_comment_id;

  update public.status_comments
  set like_count = v_count
  where id = p_comment_id;

  if v_liked and v_c.user_id is distinct from v_uid then
    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Birisi')
    into v_name
    from public.profiles
    where id = v_uid;

    begin
      perform public.bildirim_kuyruga_ekle(
        v_c.user_id,
        'social',
        'Yorumuna beğeni',
        coalesce(v_name, 'Birisi') || ' yorumunu beğendi',
        '/durum/' || v_c.status_id::text,
        jsonb_build_object(
          'type', 'comment_like',
          'status_id', v_c.status_id,
          'comment_id', p_comment_id,
          'actor_id', v_uid
        )
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'liked', v_liked, 'like_count', v_count);
end;
$$;

create or replace function public.takip_istegini_reddet(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.follow_requests%rowtype;
  v_name text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'unauthenticated');
  end if;
  select * into v_req from public.follow_requests where id = p_request_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_req.target_id <> v_uid then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', true, 'code', 'noop');
  end if;

  update public.follow_requests
    set status = 'rejected', responded_at = now()
    where id = v_req.id and status = 'pending';

  perform public.takip_aksiyon_logla(
    v_uid, v_req.requester_id, 'reject',
    jsonb_build_object('request_id', v_req.id)
  );

  select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Birisi')
  into v_name
  from public.profiles
  where id = v_uid;

  begin
    perform public.bildirim_kuyruga_ekle(
      v_req.requester_id,
      'social',
      'Takip isteği reddedildi',
      coalesce(v_name, 'Birisi') || ' takip isteğini reddetti.',
      '/kullanici/' || v_uid::text,
      jsonb_build_object(
        'type', 'follow_request_rejected',
        'actor_id', v_uid,
        'request_id', v_req.id
      )
    );
  exception when others then
    null;
  end;

  return jsonb_build_object('ok', true, 'code', 'rejected');
end;
$$;

create or replace function public.takas_mahkeme_kapat(
  p_dispute_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_d public.trade_disputes%rowtype;
  v_note text := left(trim(coalesce(p_note, 'Mahkeme platform tarafından kapatıldı.')), 1000);
  v_body text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_d from public.trade_disputes where id = p_dispute_id for update;
  if not found then raise exception 'Mahkeme bulunamadı'; end if;

  if v_uid <> v_d.yargic_id
     and not public.ben_admin_miyim()
     and not exists (
       select 1 from public.profiles p
       where p.id = v_uid and p.is_platform_yargic
     )
  then
    raise exception 'Forbidden: yalnızca yargıç / platform grubu kapatabilir';
  end if;

  update public.trade_disputes set
    status = case when status = 'kara' then 'kara' else 'closed' end,
    closed_at = now(),
    closed_by = v_uid,
    updated_at = now()
  where id = p_dispute_id;

  update public.message_threads set
    closed_at = now(),
    closed_by = v_uid,
    updated_at = now()
  where id = v_d.thread_id;

  v_body := '🔒 MAHKEME KAPATILDI' || E'\n\n' || v_note;

  insert into public.direct_messages (
    thread_id, sender_id, body, message_type
  ) values (
    v_d.thread_id, v_uid, left(v_body, 4000), 'system'
  );

  update public.message_threads set
    last_message_at = now(),
    last_message_preview = left(v_body, 120)
  where id = v_d.thread_id;

  insert into public.trade_dispute_actions (
    dispute_id, actor_id, action, body
  ) values (
    p_dispute_id, v_uid, 'close', v_note
  );

  if v_d.seller_id is not null and v_d.seller_id is distinct from v_uid then
    begin
      perform public.bildirim_kuyruga_ekle(
        v_d.seller_id,
        'wallet',
        'Mahkeme kapandı',
        left(v_note, 160),
        '/mesaj/' || v_d.thread_id::text,
        jsonb_build_object(
          'type', 'trade_dispute_closed',
          'dispute_id', p_dispute_id,
          'thread_id', v_d.thread_id
        )
      );
    exception when others then
      null;
    end;
  end if;

  if v_d.buyer_user_id is not null
     and v_d.buyer_user_id is distinct from v_uid
     and v_d.buyer_user_id is distinct from v_d.seller_id then
    begin
      perform public.bildirim_kuyruga_ekle(
        v_d.buyer_user_id,
        'wallet',
        'Mahkeme kapandı',
        left(v_note, 160),
        '/mesaj/' || v_d.thread_id::text,
        jsonb_build_object(
          'type', 'trade_dispute_closed',
          'dispute_id', p_dispute_id,
          'thread_id', v_d.thread_id
        )
      );
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object('ok', true, 'closed', true);
end;
$$;

create or replace function public.gorusme_reddet(p_call_id uuid)
returns public.direct_calls
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.direct_calls%rowtype;
  v_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  update public.direct_calls set
    status = 'rejected',
    ended_at = now(),
    ended_by = v_uid,
    end_reason = 'rejected',
    billing_status = case when is_paid then 'FINALIZING' else billing_status end
  where id = p_call_id
    and callee_id = v_uid
    and status = 'ringing'
  returning * into v_row;

  if not found then raise exception 'Cagri reddedilemedi'; end if;

  select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Birisi')
  into v_name
  from public.profiles
  where id = v_uid;

  begin
    perform public.bildirim_kuyruga_ekle(
      v_row.caller_id,
      'calls',
      'Arama reddedildi',
      coalesce(v_name, 'Birisi') || case when v_row.call_type = 'video' then ' görüntülü aramayı reddetti' else ' sesli aramayı reddetti' end,
      '/gorusme/' || v_row.id::text,
      jsonb_build_object(
        'type', 'call_rejected',
        'call_id', v_row.id,
        'actor_id', v_uid
      )
    );
  exception when others then
    null;
  end;

  if v_row.is_paid then
    return public.kisiler_gorusme_billing_finalize(p_call_id);
  end if;
  return v_row;
end;
$$;

create or replace function public.gorusme_bitir(
  p_call_id uuid,
  p_reason text default 'hangup'
)
returns public.direct_calls
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.direct_calls%rowtype;
  v_status text;
  v_name text;
  v_hedef uuid;
  v_kod text;
  v_baslik text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_row from public.direct_calls where id = p_call_id for update;
  if not found then raise exception 'Cagri yok'; end if;
  if v_uid <> v_row.caller_id and v_uid <> v_row.callee_id then
    raise exception 'Forbidden';
  end if;
  if v_row.status in ('ended', 'rejected', 'missed', 'cancelled') then
    if v_row.is_paid and v_row.billing_status not in ('FINALIZED', 'RELEASED') then
      return public.kisiler_gorusme_billing_finalize(p_call_id);
    end if;
    return v_row;
  end if;

  if v_row.status = 'ringing' and v_uid = v_row.caller_id then
    v_status := 'cancelled';
  elsif v_row.status = 'ringing' then
    v_status := 'missed';
  else
    v_status := 'ended';
  end if;

  update public.direct_calls set
    status = v_status,
    ended_at = now(),
    ended_by = v_uid,
    end_reason = coalesce(nullif(trim(p_reason), ''), 'hangup'),
    billing_status = case
      when is_paid and billing_status not in ('FINALIZED', 'RELEASED') then 'FINALIZING'
      else billing_status
    end
  where id = p_call_id
  returning * into v_row;

  if v_status = 'cancelled' then
    v_hedef := v_row.callee_id;
    v_kod := 'call_cancelled';
    v_baslik := 'Arama iptal edildi';
  elsif v_status = 'missed' then
    v_hedef := v_row.caller_id;
    v_kod := 'call_missed';
    v_baslik := 'Arama yanıtlanmadı';
  else
    v_hedef := null;
  end if;

  if v_hedef is not null then
    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Birisi')
    into v_name
    from public.profiles
    where id = v_uid;

    begin
      perform public.bildirim_kuyruga_ekle(
        v_hedef,
        'calls',
        v_baslik,
        coalesce(v_name, 'Birisi') || case
          when v_status = 'cancelled' and v_row.call_type = 'video' then ' görüntülü aramayı kapattı'
          when v_status = 'cancelled' then ' sesli aramayı kapattı'
          when v_row.call_type = 'video' then ' görüntülü aramayı açmadı'
          else ' sesli aramayı açmadı'
        end,
        '/gorusme/' || v_row.id::text,
        jsonb_build_object(
          'type', v_kod,
          'call_id', v_row.id,
          'actor_id', v_uid
        )
      );
    exception when others then
      null;
    end;
  end if;

  if v_row.is_paid then
    return public.kisiler_gorusme_billing_finalize(p_call_id);
  end if;

  return v_row;
end;
$$;

create or replace function public.gorusme_stale_temizle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ring int := 0;
  v_act int;
  v_row public.direct_calls%rowtype;
  v_name text;
begin
  for v_row in
    update public.direct_calls set
      status = 'missed',
      ended_at = now(),
      end_reason = 'ring_timeout'
    where status = 'ringing'
      and started_at < now() - interval '45 seconds'
    returning *
  loop
    v_ring := v_ring + 1;
    select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Birisi')
    into v_name
    from public.profiles
    where id = v_row.caller_id;

    begin
      perform public.bildirim_kuyruga_ekle(
        v_row.callee_id,
        'calls',
        'Cevapsız arama',
        coalesce(v_name, 'Birisi') || case when v_row.call_type = 'video' then ' görüntülü aradı' else ' sesli aradı' end,
        '/gorusme/' || v_row.id::text,
        jsonb_build_object(
          'type', 'call_missed',
          'call_id', v_row.id,
          'actor_id', v_row.caller_id
        )
      );
    exception when others then
      null;
    end;
  end loop;

  update public.direct_calls set
    status = 'ended',
    ended_at = now(),
    end_reason = 'stale_active'
  where status = 'active'
    and coalesce(answered_at, started_at) < now() - interval '15 minutes';
  get diagnostics v_act = row_count;

  return coalesce(v_ring, 0) + coalesce(v_act, 0);
end;
$$;

create or replace function public.pk_davet_iptal(p_invite_id uuid)
returns public.pk_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.pk_invites%rowtype;
  v_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_inv from public.pk_invites where id = p_invite_id for update;
  if not found then raise exception 'Invite not found'; end if;
  if v_inv.from_host_id <> v_uid then raise exception 'Not authorized'; end if;
  if v_inv.status <> 'pending' then raise exception 'Invite already resolved'; end if;

  update public.pk_invites
  set status = 'cancelled', responded_at = now()
  where id = p_invite_id
  returning * into v_inv;

  select coalesce(nullif(trim(display_name), ''), nullif(trim(username), ''), 'Yayıncı')
  into v_name
  from public.profiles
  where id = v_uid;

  begin
    perform public.bildirim_kuyruga_ekle(
      v_inv.to_host_id,
      'live',
      'PK daveti iptal',
      coalesce(v_name, 'Yayıncı') || ' PK davetini geri çekti',
      '/canli',
      jsonb_build_object(
        'type', 'pk_invite_cancelled',
        'invite_id', v_inv.id,
        'actor_id', v_uid
      )
    );
  exception when others then
    null;
  end;

  return v_inv;
end;
$$;
