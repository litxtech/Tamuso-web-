-- ACİL GÜVENLİK: Yalnızca sunucu (service_role / SECURITY DEFINER tetikleyiciler) tarafından
-- çağrılması gereken, parametre olarak kullanıcı kimliği alıp bakiye/kredi yazan fonksiyonlar
-- anon ve authenticated rollerine açıktı. Örneğin coin_satin_al_onayla_servis doğrudan REST ile
-- çağrılarak ödeme yapılmadan coin yüklenebiliyordu.
--
-- İstemci kodunda bu fonksiyonların hiçbiri çağrılmıyor; çağıranlar edge function'lar
-- (service_role) ve SECURITY DEFINER veritabanı fonksiyonlarıdır. Bakiye veya veri değiştirmez.

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.coin_satin_al_onayla_servis(uuid,uuid,text,text,text,text,numeric,jsonb)',
    'public.astral_falls_settle_spin(uuid,text,numeric,uuid,jsonb,boolean,boolean)',
    'public.ai_music_credit_purchase(uuid,text,text,integer,integer,uuid,text)',
    'public.ai_music_entitlement_capture(uuid,uuid,integer)',
    'public.ai_music_entitlement_release(uuid,uuid,integer)',
    'public.ai_music_entitlement_reserve(uuid,uuid,integer,text)',
    'public.ai_music_stripe_satin_al_onayla(uuid,text,text,text,numeric,numeric,jsonb)',
    'public.ajans_paket_teklif_stripe_onayla(uuid,uuid,text,text,numeric,jsonb)',
    'public.cuzdan_ters_kayit(uuid,text,bigint,text,text,uuid)',
    'public.sehir_gucu_hediyeden_uygula(uuid,bigint,uuid)',
    'public.tv_recalc_user(uuid)',
    'public.tv_upsert_contribution(uuid,text,uuid,text,text,text,numeric,text,numeric,text,text,numeric,timestamp with time zone,timestamp with time zone,jsonb)'
  ] loop
    if to_regprocedure(f) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', f);
      execute format('grant execute on function %s to service_role', f);
    end if;
  end loop;
end $$;
