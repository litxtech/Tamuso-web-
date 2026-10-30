-- Herkese açık gönderi ve profil için kalıcı paylaşım adresi.
-- Gizli, silinmiş ve yayından kalkmış kayıtlar adres döndürmez.

create or replace function public.seo_paylasim_adresi(p_tur text, p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when c.tier < 3
      and c.removed_at is null
      and c.canonical_path ~ '^/(p|u)/[a-z0-9][a-z0-9._-]{1,120}$'
      then 'https://www.tamuso.com' || c.canonical_path
    else null
  end
  from public.content_seo c
  where c.content_id = p_id
    and c.content_type = case p_tur
      when 'post' then 'post'
      when 'profile' then 'profile'
      else ''
    end
  limit 1;
$$;

revoke all on function public.seo_paylasim_adresi(text, uuid) from public, anon;
grant execute on function public.seo_paylasim_adresi(text, uuid) to authenticated;
