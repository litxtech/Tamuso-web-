-- Gelen arama push: gorusme_baslat icinden kaldirilmisti; geri yukle.
-- Callee uygulama kapaliyken /gorusme/{id} deep_link ile push alir.

create or replace function public.gorusme_baslat(
  p_thread_id uuid,
  p_call_type text
)
returns public.direct_calls
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_peer uuid;
  v_guest boolean;
  v_type text := lower(trim(p_call_type));
  v_row public.direct_calls%rowtype;
  v_channel text;
  v_stale public.direct_calls%rowtype;
  v_caller_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_type not in ('audio', 'video') then raise exception 'Gecersiz cagri turu'; end if;

  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir arama yapamaz'; end if;

  if not exists (
    select 1 from public.message_thread_members
    where thread_id = p_thread_id and user_id = v_uid
  ) then
    raise exception 'Not a thread member';
  end if;

  select user_id into v_peer
  from public.message_thread_members
  where thread_id = p_thread_id and user_id <> v_uid
  limit 1;
  if v_peer is null then raise exception 'Karsi taraf yok'; end if;

  perform public.gorusme_stale_temizle();

  -- Bu cifteki / benim takili cagrilar: kendi tarafimdakileri kapat (ghost)
  update public.direct_calls set
    status = case
      when status = 'ringing' and caller_id = v_uid then 'cancelled'
      when status = 'ringing' then 'missed'
      else 'ended'
    end,
    ended_at = now(),
    ended_by = v_uid,
    end_reason = 'replaced_by_new_call'
  where status in ('ringing', 'active')
    and (
      (caller_id = v_uid and callee_id = v_peer)
      or (caller_id = v_peer and callee_id = v_uid)
    );

  -- Hâlâ baska bir aktif (nadir race) varsa engelle
  select * into v_stale
  from public.direct_calls
  where status in ('ringing', 'active')
    and (
      (caller_id = v_uid and callee_id = v_peer)
      or (caller_id = v_peer and callee_id = v_uid)
    )
  order by started_at desc
  limit 1;

  if found then
    raise exception 'Zaten aktif bir gorusme var';
  end if;

  v_channel := 'dm_call_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.direct_calls (
    thread_id, caller_id, callee_id, call_type, status, channel_name
  ) values (
    p_thread_id, v_uid, v_peer, v_type, 'ringing', v_channel
  ) returning * into v_row;

  insert into public.direct_messages (thread_id, sender_id, body, message_type)
  values (
    p_thread_id,
    v_uid,
    case when v_type = 'video' then '📹 Görüntülü arama' else '📞 Sesli arama' end,
    'system'
  );

  update public.message_threads set
    updated_at = now(),
    last_message_at = now(),
    last_message_preview = case when v_type = 'video' then 'Görüntülü arama' else 'Sesli arama' end
  where id = p_thread_id;

  -- Gelen arama push (arka planda / kapali app)
  begin
    select coalesce(
      nullif(trim(display_name), ''),
      nullif(trim(username), ''),
      'Birisi'
    ) into v_caller_name
    from public.profiles where id = v_uid;

    perform public.bildirim_kuyruga_ekle(
      v_peer,
      'messages',
      v_caller_name || ' arıyor',
      case when v_type = 'video' then 'Görüntülü arama' else 'Sesli arama' end,
      '/gorusme/' || v_row.id::text,
      jsonb_build_object(
        'type', 'incoming_call',
        'call_id', v_row.id,
        'call_type', v_type,
        'caller_id', v_uid,
        'thread_id', p_thread_id,
        'channel_name', v_channel
      )
    );
  exception when others then
    null;
  end;

  return v_row;
end;
$$;

grant execute on function public.gorusme_baslat(uuid, text) to authenticated;
