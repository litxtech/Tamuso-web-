-- Webden (veya uygulamadan) yazılan canlı destek mesajı
-- aktif temsilcilere, temsilci yoksa yöneticilere bildirim düşer.
-- Cevap penceresi 30 dakikadır.

alter table public.support_messages
  add column if not exists kaynak text;

alter table public.support_messages
  drop constraint if exists support_messages_kaynak_chk;

alter table public.support_messages
  add constraint support_messages_kaynak_chk
  check (kaynak is null or kaynak in ('web', 'uygulama'));

insert into public.bildirim_tur_katalog (
  kod, grup, kitle, varsayilan_acik, grup_sira, sira, baslik, aciklama
) values (
  'support_incoming',
  'system',
  'yonetici',
  true,
  95,
  15,
  jsonb_build_object('tr', 'Gelen destek', 'en', 'Incoming support'),
  jsonb_build_object(
    'tr', 'Webden veya uygulamadan canlı destek yazılınca',
    'en', 'When someone writes to live support from the web or the app'
  )
)
on conflict (kod) do update set
  grup = excluded.grup,
  kitle = excluded.kitle,
  varsayilan_acik = excluded.varsayilan_acik,
  grup_sira = excluded.grup_sira,
  sira = excluded.sira,
  baslik = excluded.baslik,
  aciklama = excluded.aciklama;

create or replace function public.destek_oturum_idle_kapat(p_session_id uuid)
returns public.support_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.support_sessions%rowtype;
begin
  select * into v_row from public.support_sessions where id = p_session_id for update;
  if not found then raise exception 'Oturum bulunamadi'; end if;
  if v_row.status not in ('waiting', 'active') then return v_row; end if;

  if v_row.last_activity_at > now() - interval '30 minutes' then
    return v_row;
  end if;

  update public.support_sessions set
    status = 'idle_closed',
    closed_at = now(),
    close_reason = 'idle_30m'
  where id = p_session_id
  returning * into v_row;

  insert into public.support_messages (session_id, sender_id, sender_role, body)
  values (
    p_session_id, null, 'system',
    'Görüşme, 30 dakika boyunca mesaj olmadığı için sonlandırıldı.'
  );

  return v_row;
end;
$$;

create or replace function public.destek_gelen_yaziyi_bildir(
  p_session_id uuid,
  p_yazar uuid,
  p_body text,
  p_kaynak text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hedef uuid;
  v_n int := 0;
  v_web boolean := lower(coalesce(p_kaynak, '')) = 'web';
  v_baslik text := case when v_web then 'Web destek' else 'Canlı destek' end;
  v_link text := '/admin/destek/' || p_session_id::text;
  v_payload jsonb := jsonb_build_object(
    'type', 'support_incoming',
    'session_id', p_session_id,
    'kaynak', case when v_web then 'web' else 'uygulama' end
  );
begin
  for v_hedef in
    select a.user_id
    from public.support_agents a
    where a.is_active
      and a.user_id is distinct from p_yazar
  loop
    v_n := v_n + 1;
    begin
      perform public.bildirim_kuyruga_ekle(
        v_hedef,
        'system',
        v_baslik,
        left(p_body, 160),
        v_link,
        v_payload
      );
    exception when others then
      null;
    end;
  end loop;

  if v_n > 0 then
    return;
  end if;

  for v_hedef in
    select p.id
    from public.profiles p
    where coalesce(p.is_admin, false) = true
      and p.deleted_at is null
      and p.banned_at is null
      and p.id is distinct from p_yazar
  loop
    begin
      perform public.bildirim_kuyruga_ekle(
        v_hedef,
        'system',
        v_baslik,
        left(p_body, 160),
        v_link,
        v_payload
      );
    exception when others then
      null;
    end;
  end loop;
end;
$$;

revoke all on function public.destek_gelen_yaziyi_bildir(uuid, uuid, text, text)
  from public, anon, authenticated;

drop function if exists public.destek_mesaj_gonder(uuid, text);

create or replace function public.destek_mesaj_gonder(
  p_session_id uuid,
  p_body text,
  p_kaynak text default null
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
  v_kaynak text := case
    when lower(coalesce(p_kaynak, '')) = 'web' then 'web'
    else null
  end;
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

  insert into public.support_messages (session_id, sender_id, sender_role, body, kaynak)
  values (
    p_session_id,
    v_uid,
    v_role,
    v_body,
    case when v_role = 'user' then v_kaynak else null end
  )
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
  elsif v_role = 'user' then
    perform public.destek_gelen_yaziyi_bildir(p_session_id, v_uid, v_body, v_kaynak);
  end if;

  return v_msg;
end;
$$;

revoke all on function public.destek_mesaj_gonder(uuid, text, text) from public, anon;
grant execute on function public.destek_mesaj_gonder(uuid, text, text) to authenticated;

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
  v_msg public.support_messages;
begin
  v_msg := public.destek_mesaj_gonder(p_session_id, p_body, null);
  return v_msg;
end;
$$;

revoke all on function public.destek_mesaj_gonder(uuid, text) from public, anon;
grant execute on function public.destek_mesaj_gonder(uuid, text) to authenticated;

notify pgrst, 'reload schema';
