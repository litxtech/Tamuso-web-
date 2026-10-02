-- Bildirim merkezi: mesaj kategori inbox disi + tekli/toplu silme

-- Mevcut mesaj bildirimlerini gelen kutudan temizle (push zaten outbox'ta)
delete from public.user_notifications
where lower(category) in ('messages', 'message');

-- Mesajlar: sadece push (outbox); uygulama ici gelen kutuya yazma
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
begin
  if p_user_id is null then return null; end if;
  if p_title is null or length(trim(p_title)) = 0 then return null; end if;
  if not public.hesap_aktif_mi(p_user_id) then return null; end if;

  v_title := left(trim(p_title), 120);
  v_body := case when p_body is null then null else left(trim(p_body), 400) end;
  v_actor := public.bildirim_payload_actor_id(v_payload);
  v_link := public.bildirim_hedef_link(v_cat, p_deep_link, v_payload);

  if v_actor is not null and (v_payload->>'actor_id') is null then
    v_payload := v_payload || jsonb_build_object('actor_id', v_actor);
  end if;

  -- Mesaj: inbox yok; tercih aciksa sadece push kuyrugu
  if v_mesaj_mi then
    if public.push_tercihi_aktif_mi(p_user_id, v_cat) then
      insert into public.notification_outbox (
        user_id, category, title, body, deep_link, payload, status
      ) values (
        p_user_id,
        v_cat,
        v_title,
        v_body,
        v_link,
        v_payload,
        'pending'
      )
      returning id into v_outbox_id;
      return v_outbox_id;
    end if;
    return null;
  end if;

  insert into public.user_notifications (
    user_id, category, title, body, deep_link, payload, actor_id
  ) values (
    p_user_id,
    v_cat,
    v_title,
    v_body,
    v_link,
    v_payload,
    v_actor
  )
  returning id into v_inbox_id;

  if public.push_tercihi_aktif_mi(p_user_id, v_cat) then
    insert into public.notification_outbox (
      user_id, category, title, body, deep_link, payload, status
    ) values (
      p_user_id,
      v_cat,
      v_title,
      v_body,
      v_link,
      v_payload,
      'pending'
    )
    returning id into v_outbox_id;

    update public.user_notifications
    set outbox_id = v_outbox_id
    where id = v_inbox_id;
  end if;

  return v_inbox_id;
exception when others then
  return null;
end;
$$;

-- Liste: mesaj kategorisi yok
drop function if exists public.bildirimlerimi_listele(int);

create or replace function public.bildirimlerimi_listele(p_limit int default 50)
returns table (
  id uuid,
  category text,
  title text,
  body text,
  deep_link text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz,
  actor_id uuid,
  actor_name text,
  actor_username text,
  actor_avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  return query
  select
    n.id,
    n.category,
    n.title,
    n.body,
    coalesce(
      nullif(trim(n.deep_link), ''),
      public.bildirim_hedef_link(n.category, n.deep_link, n.payload)
    ) as deep_link,
    n.payload,
    n.read_at,
    n.created_at,
    coalesce(n.actor_id, public.bildirim_payload_actor_id(n.payload)) as actor_id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.username), ''),
      case
        when n.category = 'system' then 'Tamuso'
        when n.category = 'wallet' then 'Cüzdan'
        else null
      end
    ) as actor_name,
    p.username as actor_username,
    p.avatar_url as actor_avatar_url
  from public.user_notifications n
  left join public.profiles p
    on p.id = coalesce(n.actor_id, public.bildirim_payload_actor_id(n.payload))
  where n.user_id = v_uid
    and lower(n.category) not in ('messages', 'message')
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;
$$;

grant execute on function public.bildirimlerimi_listele(int) to authenticated;

-- Okunmamis sayi: mesaj haric
create or replace function public.bildirim_okunmamis_sayim()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n bigint;
begin
  if v_uid is null then return 0; end if;
  select count(*) into v_n
  from public.user_notifications
  where user_id = v_uid
    and read_at is null
    and lower(category) not in ('messages', 'message');
  return coalesce(v_n, 0);
end;
$$;

grant execute on function public.bildirim_okunmamis_sayim() to authenticated;

-- Hepsini okundu: mesaj haric
create or replace function public.bildirimleri_hepsini_okundu()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n bigint;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  with upd as (
    update public.user_notifications
    set read_at = now()
    where user_id = v_uid
      and read_at is null
      and lower(category) not in ('messages', 'message')
    returning 1
  )
  select count(*) into v_n from upd;
  return coalesce(v_n, 0);
end;
$$;

grant execute on function public.bildirimleri_hepsini_okundu() to authenticated;

-- Tek bildirim sil
create or replace function public.bildirim_sil(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_unread bigint;
  v_n int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_id is null then raise exception 'id gerekli'; end if;

  delete from public.user_notifications
  where id = p_id
    and user_id = v_uid
    and lower(category) not in ('messages', 'message');

  get diagnostics v_n = row_count;

  select count(*) into v_unread
  from public.user_notifications
  where user_id = v_uid
    and read_at is null
    and lower(category) not in ('messages', 'message');

  return jsonb_build_object(
    'ok', v_n > 0,
    'deleted', coalesce(v_n, 0),
    'unread', coalesce(v_unread, 0)
  );
end;
$$;

grant execute on function public.bildirim_sil(uuid) to authenticated;

-- Secili bildirimleri sil
create or replace function public.bildirimleri_toplu_sil(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_unread bigint;
  v_n int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_ids is null or cardinality(p_ids) = 0 then
    return jsonb_build_object('ok', true, 'deleted', 0, 'unread', 0);
  end if;

  delete from public.user_notifications
  where user_id = v_uid
    and id = any(p_ids)
    and lower(category) not in ('messages', 'message');

  get diagnostics v_n = row_count;

  select count(*) into v_unread
  from public.user_notifications
  where user_id = v_uid
    and read_at is null
    and lower(category) not in ('messages', 'message');

  return jsonb_build_object(
    'ok', true,
    'deleted', coalesce(v_n, 0),
    'unread', coalesce(v_unread, 0)
  );
end;
$$;

grant execute on function public.bildirimleri_toplu_sil(uuid[]) to authenticated;

-- Bildirim merkezindeki tumunu sil (mesaj haric)
create or replace function public.bildirimleri_hepsini_sil()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_n int;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  delete from public.user_notifications
  where user_id = v_uid
    and lower(category) not in ('messages', 'message');

  get diagnostics v_n = row_count;

  return jsonb_build_object(
    'ok', true,
    'deleted', coalesce(v_n, 0),
    'unread', 0
  );
end;
$$;

grant execute on function public.bildirimleri_hepsini_sil() to authenticated;

-- RLS: kullanici kendi bildirimini silebilsin
drop policy if exists "Own notifications delete" on public.user_notifications;
create policy "Own notifications delete"
  on public.user_notifications for delete to authenticated
  using (auth.uid() = user_id);

grant delete on public.user_notifications to authenticated;
