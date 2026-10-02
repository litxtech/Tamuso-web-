-- Yönetim uyarısı: hedef adminin kendisiyse veya iletişim engelliyse
-- 1:1 sohbet açılamaz (Invalid peer). Görüşme sohbetine yazılır;
-- sohbet yoksa bildirim kutusuna düşer.

create or replace function public.admin_gorusme_uyari_gonder(
  p_event_id uuid,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.call_security_events%rowtype;
  v_msg text := trim(p_message);
  v_uid uuid := auth.uid();
  v_thread uuid;
  v_body text;
  v_kanal text := 'dm';
begin
  if not public.ben_admin_miyim() then raise exception 'Forbidden: admin only'; end if;
  if v_msg is null or length(v_msg) < 3 then raise exception 'Uyari metni gerekli'; end if;
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_e from public.call_security_events where id = p_event_id;
  if not found then raise exception 'Olay yok'; end if;
  if v_e.user_id is null then raise exception 'Hedef kullanici yok'; end if;

  v_body := '⚠️ Yönetim uyarısı: ' || left(v_msg, 3500);

  if v_e.user_id is distinct from v_uid
     and not public.kullanicilar_engelli_mi(v_uid, v_e.user_id) then
    v_thread := public.ozel_sohbet_ac_veya_getir(v_e.user_id);
  end if;

  if v_thread is null and v_e.thread_id is not null then
    v_thread := v_e.thread_id;
    v_kanal := 'gorusme';
  end if;

  if v_thread is not null then
    insert into public.direct_messages (thread_id, sender_id, body, message_type)
    values (v_thread, v_uid, v_body, 'system');

    update public.message_threads set
      updated_at = now(),
      last_message_at = now(),
      last_message_preview = 'Yönetim uyarısı'
    where id = v_thread;
  else
    v_kanal := 'bildirim';
    perform public.bildirim_kuyruga_ekle(
      v_e.user_id,
      'security',
      'Yönetim uyarısı',
      left(v_msg, 400),
      null,
      jsonb_build_object(
        'type', 'call_security_warn',
        'event_id', p_event_id,
        'call_id', v_e.call_id
      )
    );
  end if;

  update public.call_security_events set
    admin_seen = true,
    warning_sent_at = now(),
    warning_message = left(v_msg, 2000)
  where id = p_event_id;

  perform public.admin_audit_yaz(
    v_e.user_id,
    'call_security_warn',
    'Gorusme guvenlik uyarisi gonderildi',
    jsonb_build_object(
      'event_id', p_event_id,
      'call_id', v_e.call_id,
      'kanal', v_kanal
    )
  );

  return jsonb_build_object('ok', true, 'thread_id', v_thread, 'kanal', v_kanal);
end;
$$;
