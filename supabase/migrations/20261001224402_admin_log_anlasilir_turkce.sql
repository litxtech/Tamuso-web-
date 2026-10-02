-- Yönetim loglarını Türkçe, okunabilir cümle olarak sakla

create or replace function public.ozellik_anahtar_tr(p_key text)
returns text
language sql
immutable
set search_path = public
as $$
  select case coalesce(p_key, '')
    when 'nox_reels_enabled' then 'Nox Reels'
    when 'kozmik_kaskad_enabled' then 'Kozmik Kaskad'
    when 'zeus_enabled' then 'Zeus'
    when 'games_enabled' then 'Oyunlar'
    when 'iap_enabled' then 'Uygulama içi satın alma'
    when 'stripe_enabled' then 'Stripe ödemesi'
    when 'live_enabled' then 'Canlı yayın'
    when 'pk_enabled' then 'PK'
    when 'gifts_enabled' then 'Hediyeler'
    when 'voice_rooms_enabled' then 'Ses odaları'
    when 'messages_enabled' then 'Mesajlar'
    when 'agency_enabled' then 'Ajans'
    when 'kill_games' then 'Oyunları durdur'
    when 'kill_heavy_animations' then 'Ağır animasyonları durdur'
    when 'kill_coin_purchase' then 'Coin satın almayı durdur'
    when 'kill_gift_send' then 'Hediye göndermeyi durdur'
    when 'kill_withdrawal' then 'Çekim taleplerini durdur'
    when 'kill_live' then 'Canlı yayını durdur'
    when 'kill_pk' then 'PK’yi durdur'
    else nullif(
      initcap(
        replace(
          replace(replace(coalesce(p_key, ''), '_enabled', ''), 'kill_', ''),
          '_',
          ' '
        )
      ),
      ''
    )
  end;
$$;

create or replace function public.admin_log_anlasilir_metin(p_action text, p_summary text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_action text := lower(coalesce(p_action, ''));
  v text := btrim(coalesce(p_summary, ''));
  v_sayi text;
  v_kuyruk text;
  v_anahtar text;
  v_acik boolean;
begin
  v_sayi := substring(v from '([+-]?[0-9][0-9.,]*)');
  v_kuyruk := nullif(btrim(substring(v from ':(.*)$')), '');
  v_acik := case
    when v ~* '(^|[^a-z])true([^a-z]|$)' then true
    when v ~* '(^|[^a-z])false([^a-z]|$)' then false
    else null
  end;

  if v_action = 'wallet_topup' and v_sayi is not null then
    return 'Cüzdana ' || v_sayi || ' coin yüklendi';
  end if;
  if v_action = 'agency_coin_topup' and v_sayi is not null then
    return 'Ajans cüzdanına ' || v_sayi || ' coin eklendi';
  end if;
  if v_action = 'agency_distributor' and v_acik is not null then
    return case when v_acik
      then 'Ajans dağıtıcı yetkisi açıldı'
      else 'Ajans dağıtıcı yetkisi kapatıldı'
    end;
  end if;
  if v_action in ('agency_approve') then
    return 'Ajans başvurusu onaylandı';
  end if;
  if v_action = 'agency_close' then
    return 'Ajans kapatıldı';
  end if;
  if v_action = 'agency_limits' then
    return 'Ajans limitleri güncellendi';
  end if;
  if v_action = 'agency_commission' then
    if v ilike 'Ajans komisyon%' then
      return v;
    end if;
    return 'Ajans komisyon oranları güncellendi'
      || case when v_kuyruk is null then '' else ' (' || v_kuyruk || ')' end;
  end if;
  if v_action = 'agency_earnings_penalty' then
    return 'Ajans kazancına ceza uygulandı';
  end if;
  if v_action = 'admin_grant' then
    return 'Yönetici yetkisi verildi';
  end if;
  if v_action = 'warning' then
    return 'İhtar verildi' || case when v_kuyruk is null then '' else ': ' || v_kuyruk end;
  end if;
  if v_action = 'warning_clear' then
    return 'İhtar kaldırıldı';
  end if;
  if v_action = 'delete' then
    return 'Hesap yönetici tarafından silindi';
  end if;
  if v_action = 'unban' then
    return 'Ban kaldırıldı';
  end if;
  if v_action = 'kyc_delete' then
    return 'Kimlik onayı silindi';
  end if;
  if v_action = 'room_moderation' then
    return 'Ses odası kapatıldı ve yaptırım uygulandı'
      || case when v_kuyruk is null then '' else ': ' || v_kuyruk end;
  end if;
  if v_action in ('report_reviewing', 'report_reviewed') then
    return 'Rapor incelemeye alındı';
  end if;
  if v_action = 'purchase_dispute_rejected' then
    return 'Satın alma itirazı reddedildi';
  end if;
  if v_action = 'purchase_dispute_approved' then
    return 'Satın alma itirazı kabul edildi';
  end if;
  if v_action = 'sample_users_seed' and v_sayi is not null then
    return v_sayi || ' örnek kullanıcı eklendi';
  end if;
  if v_action = 'sample_users_purge' and v_sayi is not null then
    return v_sayi || ' örnek kullanıcı silindi';
  end if;
  if v_action = 'ai_music_adjust' and v_sayi is not null then
    return 'AI müzik süresi ' || v_sayi || ' saniye olarak ayarlandı';
  end if;
  if v_action = 'city_election_start' then
    if v ilike 'Şehir lider seçimi%' then
      return v;
    end if;
    return 'Şehir lider seçimi başlatıldı'
      || case when v = '' then '' else ': ' || v end;
  end if;
  if v_action = 'feature_flag' then
    v_anahtar := substring(v from '([a-z][a-z0-9_]*_enabled)');
    if v_anahtar is not null and v_acik is not null then
      return case when v_acik then 'Özellik açıldı: ' else 'Özellik kapatıldı: ' end
        || coalesce(public.ozellik_anahtar_tr(v_anahtar), v_anahtar);
    end if;
  end if;
  if v_action = 'kill_switch' then
    v_anahtar := substring(v from '(kill_[a-z0-9_]+)');
    if v_anahtar is not null and v_acik is not null then
      return case when v_acik
        then 'Acil durdurma açıldı: '
        else 'Acil durdurma kapatıldı: '
      end || coalesce(public.ozellik_anahtar_tr(v_anahtar), v_anahtar);
    end if;
  end if;

  v := regexp_replace(v, '\mreviewing\M', 'inceleniyor', 'gi');
  v := regexp_replace(v, '\mrejected\M', 'reddedildi', 'gi');
  v := regexp_replace(v, '\mapproved\M', 'onaylandı', 'gi');
  v := regexp_replace(v, '\mpending\M', 'bekliyor', 'gi');
  v := replace(v, 'yukleme', 'yükleme');
  v := replace(v, 'kaldirildi', 'kaldırıldı');
  v := replace(v, 'verildi', 'verildi');
  v := replace(v, 'kapatildi', 'kapatıldı');
  v := replace(v, 'onaylandi', 'onaylandı');
  v := replace(v, 'guncellendi', 'güncellendi');
  v := replace(v, 'silindi', 'silindi');
  v := replace(v, 'tarafindan', 'tarafından');
  v := replace(v, 'basvurusu', 'başvurusu');
  v := replace(v, 'odasi', 'odası');
  return nullif(v, '');
end;
$$;

create or replace function public.admin_audit_yaz(
  p_target uuid,
  p_action text,
  p_summary text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_audit_logs (admin_id, target_user_id, action, summary, details)
  values (
    auth.uid(),
    p_target,
    p_action,
    coalesce(public.admin_log_anlasilir_metin(p_action, p_summary), p_summary),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

update public.admin_audit_logs
set summary = public.admin_log_anlasilir_metin(action, summary)
where summary is distinct from public.admin_log_anlasilir_metin(action, summary);

revoke all on function public.ozellik_anahtar_tr(text) from public;
revoke all on function public.admin_log_anlasilir_metin(text, text) from public;
grant execute on function public.ozellik_anahtar_tr(text) to authenticated;
grant execute on function public.admin_log_anlasilir_metin(text, text) to authenticated;
