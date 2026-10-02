-- Duyuru bildirimi tıklanınca ilgili /duyuru/{id} açılsın.
-- Ajans duyurusu (/ajans/.../duyurular) bu kurala girmez.

create or replace function public.bildirim_hedef_link(
  p_category text,
  p_deep_link text,
  p_payload jsonb
)
returns text
language plpgsql
immutable
as $$
declare
  v_type text := lower(coalesce(p_payload->>'type', ''));
  v_link text := nullif(trim(coalesce(p_deep_link, '')), '');
  v_ann text := nullif(lower(trim(coalesce(p_payload->>'announcement_id', ''))), '');
  v_thread text := nullif(trim(coalesce(p_payload->>'thread_id', '')), '');
  v_room text := nullif(trim(coalesce(p_payload->>'room_id', '')), '');
  v_live text := nullif(trim(coalesce(p_payload->>'live_id', '')), '');
  v_actor text := nullif(trim(coalesce(
    p_payload->>'follower_id',
    p_payload->>'sender_id',
    p_payload->>'host_id',
    p_payload->>'actor_id',
    ''
  )), '');
begin
  if v_ann ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and (
       v_type = 'announcement'
       or lower(coalesce(p_category, '')) = 'announcement'
       or coalesce(v_link, '') ~ '^/(duyuru|announcements)/'
     ) then
    return '/duyuru/' || v_ann;
  end if;

  if v_link is not null
     and v_link not in ('/(tabs)/profile', '/profile', '/bildirimler') then
    if v_link ~ '^/announcements/[0-9a-f-]{36}' then
      return '/duyuru/' || substring(v_link from '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
    end if;
    return v_link;
  end if;

  if v_thread is not null then
    return '/mesaj/' || v_thread;
  end if;
  if v_live is not null then
    return '/canli/' || v_live;
  end if;
  if v_room is not null then
    return '/lobi/' || v_room;
  end if;
  if v_type = 'follow_request' then
    return '/takip/istekler';
  end if;
  if v_type in ('follow', 'new_follower', 'follow_request_accepted') and v_actor is not null then
    return '/kullanici/' || v_actor;
  end if;
  if v_type in ('gift_received', 'dm') and v_actor is not null and v_room is null then
    return '/kullanici/' || v_actor;
  end if;
  if lower(coalesce(p_category, '')) = 'wallet' then
    return '/(tabs)/wallet';
  end if;
  if v_link is not null then
    return v_link;
  end if;
  if v_actor is not null then
    return '/kullanici/' || v_actor;
  end if;
  return null;
end;
$$;

update public.user_notifications n
set deep_link = '/duyuru/' || lower(n.payload->>'announcement_id')
where lower(coalesce(n.payload->>'type', n.category, '')) = 'announcement'
  and coalesce(n.payload->>'announcement_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and coalesce(n.deep_link, '') !~* '^/duyuru/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

update public.notification_outbox n
set deep_link = '/duyuru/' || lower(n.payload->>'announcement_id')
where n.status = 'pending'
  and lower(coalesce(n.payload->>'type', n.category, '')) = 'announcement'
  and coalesce(n.payload->>'announcement_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and coalesce(n.deep_link, '') !~* '^/duyuru/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
