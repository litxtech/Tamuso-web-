-- Yorum tekrarı: 4 argümanlı durum_yorum_ekle durur.
-- 5. argüman p_client_id aynı kullanıcının aynı yorumunu ikinci kez yazmaz.

alter table public.status_comments
  add column if not exists client_id uuid;

create unique index if not exists status_comments_user_client_uidx
  on public.status_comments (user_id, client_id)
  where client_id is not null and deleted_at is null;

create or replace function public.durum_yorum_ekle(
  p_client_id uuid,
  p_status_id uuid,
  p_body text default null,
  p_parent_id uuid default null,
  p_media_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_owner uuid;
  v_id uuid;
  v_body text := left(trim(coalesce(p_body, '')), 500);
  v_media text := nullif(trim(coalesce(p_media_url, '')), '');
  v_parent public.status_comments%rowtype;
  v_parent_id uuid := p_parent_id;
  v_notify uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir yorum yapamaz'; end if;

  if p_client_id is not null then
    select c.id into v_id
    from public.status_comments c
    where c.user_id = v_uid
      and c.client_id = p_client_id
      and c.deleted_at is null
    limit 1;
    if v_id is not null then
      return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true);
    end if;
  end if;

  if length(v_body) < 1 and v_media is null then
    raise exception 'Yorum bos olamaz';
  end if;
  if v_media is not null and length(v_media) < 8 then
    raise exception 'Gecersiz medya';
  end if;
  if v_media is not null then
    v_media := left(v_media, 2000);
  end if;

  select user_id into v_owner
  from public.status_posts
  where id = p_status_id and deleted_at is null;
  if v_owner is null then raise exception 'Durum yok'; end if;

  if v_parent_id is not null then
    select * into v_parent
    from public.status_comments
    where id = v_parent_id and status_id = p_status_id and deleted_at is null;
    if v_parent.id is null then raise exception 'Yanitlanacak yorum yok'; end if;
    if v_parent.parent_id is not null then
      v_parent_id := v_parent.parent_id;
      select * into v_parent
      from public.status_comments
      where id = v_parent_id;
    end if;
  end if;

  insert into public.status_comments (
    status_id, user_id, body, parent_id, media_url, client_id
  )
  values (p_status_id, v_uid, v_body, v_parent_id, v_media, p_client_id)
  returning id into v_id;

  update public.status_posts
  set
    comment_count = (
      select count(*)::int from public.status_comments c
      where c.status_id = p_status_id and c.deleted_at is null
    ),
    updated_at = now()
  where id = p_status_id;

  v_notify := case
    when v_parent_id is not null and v_parent.user_id <> v_uid then v_parent.user_id
    when v_owner <> v_uid then v_owner
    else null
  end;

  if v_notify is not null then
    perform public.bildirim_kuyruga_ekle(
      v_notify,
      'social',
      case when v_parent_id is not null then 'Yorumuna yanıt' else 'Durumuna yorum' end,
      coalesce(
        (select display_name from public.profiles where id = v_uid),
        'Birisi'
      ) || case
        when length(v_body) > 0 then ': ' || left(v_body, 80)
        when v_media is not null then ' bir fotoğraf gönderdi'
        else ''
      end,
      '/durum/' || p_status_id::text,
      jsonb_build_object(
        'type', 'status_comment',
        'status_id', p_status_id,
        'comment_id', v_id,
        'parent_id', v_parent_id,
        'actor_id', v_uid
      )
    );
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    select c.id into v_id
    from public.status_comments c
    where c.user_id = v_uid
      and c.client_id = p_client_id
      and c.deleted_at is null
    limit 1;
    if v_id is not null then
      return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', true);
    end if;
    raise;
end;
$$;

grant execute on function public.durum_yorum_ekle(uuid, uuid, text, uuid, text) to authenticated;
