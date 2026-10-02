-- Gönderi ses kaydı: media_type audio, süre payload, status-media ses mime

alter table public.status_posts
  drop constraint if exists status_posts_media_type_check;

alter table public.status_posts
  add constraint status_posts_media_type_check
  check (media_type in ('image', 'video', 'card', 'text', 'audio'));

update storage.buckets
set allowed_mime_types = (
  select array(
    select distinct m
    from unnest(
      coalesce(allowed_mime_types, '{}'::text[])
      || array[
        'audio/mp4',
        'audio/m4a',
        'audio/x-m4a',
        'audio/aac',
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav'
      ]::text[]
    ) as m
  )
)
where id = 'status-media';

drop function if exists public.durum_olustur(text, text, text);

create or replace function public.durum_olustur(
  p_media_type text,
  p_media_url text,
  p_caption text default null,
  p_duration_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_guest boolean;
  v_id uuid;
  v_type text := lower(trim(coalesce(p_media_type, '')));
  v_url text := nullif(left(trim(coalesce(p_media_url, '')), 2000), '');
  v_caption_raw text := nullif(trim(coalesce(p_caption, '')), '');
  v_caption text;
  v_payload jsonb := '{}'::jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select is_guest into v_guest from public.profiles where id = v_uid;
  if coalesce(v_guest, false) then raise exception 'Misafir durum paylasamaz'; end if;

  if v_type = 'text' or (v_type = '' and v_url is null) then
    if v_caption_raw is null then
      raise exception 'Metin gerekli';
    end if;
    v_type := 'text';
    v_url := null;
    v_caption := left(v_caption_raw, 100000);
  elsif v_type = 'audio' then
    if v_url is null or length(v_url) < 8 or v_url !~* '^https?://' then
      raise exception 'Medya gerekli';
    end if;
    if p_duration_ms is null or p_duration_ms < 400 or p_duration_ms > 300000 then
      raise exception 'Ses suresi gecersiz';
    end if;
    v_caption := nullif(left(v_caption_raw, 500), '');
    v_payload := jsonb_build_object(
      'kind', 'voice',
      'duration_ms', p_duration_ms
    );
  elsif v_type in ('image', 'video') then
    if v_url is null or length(v_url) < 8 or v_url !~* '^https?://' then
      raise exception 'Medya gerekli';
    end if;
    v_caption := nullif(left(v_caption_raw, 500), '');
  else
    raise exception 'Gecersiz medya turu';
  end if;

  insert into public.status_posts (
    user_id, media_type, media_url, caption, post_kind, payload
  )
  values (
    v_uid,
    v_type,
    v_url,
    v_caption,
    'media',
    v_payload
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

grant execute on function public.durum_olustur(text, text, text, integer) to authenticated;
