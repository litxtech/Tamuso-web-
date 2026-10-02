-- DM link URL ayıklama: www. + trailing punct temizliği (trigger)
-- mesaj_gonder / mesaj_duzenle RPC gövdesine dokunmadan zenginleştirir.

create or replace function public.mesaj_metinden_url_ayikla(p_body text)
returns text
language plpgsql
immutable
as $$
declare
  v_link text;
begin
  if p_body is null or length(trim(p_body)) = 0 then
    return null;
  end if;

  v_link := (regexp_match(p_body, 'https?://[^\s<>"'']+', 'i'))[1];
  if v_link is null then
    v_link := (regexp_match(p_body, 'www\.[^\s<>"'']+', 'i'))[1];
    if v_link is not null then
      v_link := 'https://' || v_link;
    end if;
  end if;

  if v_link is null then
    return null;
  end if;

  -- Mesaj sonu noktalama
  v_link := regexp_replace(v_link, '[.,;:!?)>\]]+$', '');
  if length(v_link) < 8 then
    return null;
  end if;
  return left(v_link, 2048);
end;
$$;

comment on function public.mesaj_metinden_url_ayikla(text) is
  'DM body içinden ilk http(s)/www URL ayıklar';

create or replace function public.direct_messages_link_url_doldur()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.message_type = 'text' and NEW.body is not null then
    NEW.link_url := public.mesaj_metinden_url_ayikla(NEW.body);
  elsif NEW.message_type is distinct from 'text' then
    -- medya vs. — link kolonunu zorla temizleme (caption linkleri client önizler)
    null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists direct_messages_link_url_doldur_trg on public.direct_messages;
create trigger direct_messages_link_url_doldur_trg
  before insert or update of body, message_type
  on public.direct_messages
  for each row
  execute function public.direct_messages_link_url_doldur();
