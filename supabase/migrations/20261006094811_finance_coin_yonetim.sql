-- Finance coin yönetimi: platform vs kullanıcı ayrımı + set/reset
-- Applied remotely as finance_coin_yonetim (CREATE OR REPLACE — idempotent)

create or replace function public.admin_finance_coin_yonetim(
  p_limit int default 40,
  p_offset int default 0,
  p_q text default null,
  p_filtre text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit,40),1),100);
  v_offset int := greatest(coalesce(p_offset,0),0);
  v_q text := nullif(trim(p_q),'');
  v_filtre text := lower(trim(coalesce(p_filtre,'all')));
  v_rows jsonb;
  v_plat bigint;
  v_satinal bigint;
  v_supply bigint;
  v_users bigint;
begin
  if not public.finance_yetkisi_var_mi('SUPPORT_ADMIN') then
    raise exception 'Forbidden: finance access required';
  end if;

  select coalesce(sum(cp.coins_added),0)::bigint into v_satinal
  from public.coin_purchases cp
  where coalesce(cp.status,'completed')='completed';

  select coalesce(sum(case when wl.delta > 0 then wl.delta else 0 end),0)::bigint into v_plat
  from public.wallet_ledger wl
  where wl.currency='coins'
    and (
      wl.reason like 'admin_topup%'
      or wl.reason in ('bonus','bonus_coin','promotional','promo','promotional_coin','agency_transfer','agency_coin')
      or wl.ref_type = 'admin'
    );

  select coalesce(sum(w.coins),0)::bigint into v_supply from public.wallets w;
  select count(*)::bigint into v_users from public.wallets w where coalesce(w.coins,0) > 0;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_rows from (
    select
      p.id as user_id,
      coalesce(nullif(trim(p.display_name),''), nullif(trim(p.username),''),'Kullanici') as display_name,
      p.username,
      p.public_user_id,
      p.avatar_url,
      a.id as agency_id,
      a.name as agency_name,
      coalesce(w.coins,0)::bigint as current_coin,
      coalesce((
        select sum(cp.coins_added) from public.coin_purchases cp
        where cp.user_id=p.id and coalesce(cp.status,'completed')='completed'
      ),0)::bigint as coin_purchased,
      coalesce((
        select sum(case when wl.delta > 0 then wl.delta else 0 end)
        from public.wallet_ledger wl
        where wl.user_id=p.id and wl.currency='coins'
          and (
            wl.reason like 'admin_topup%'
            or wl.reason in ('bonus','bonus_coin','promotional','promo','promotional_coin','agency_transfer','agency_coin')
            or wl.ref_type = 'admin'
          )
      ),0)::bigint as coin_platform,
      coalesce((
        select sum(case when wl.delta < 0 then -wl.delta else 0 end)
        from public.wallet_ledger wl
        where wl.user_id=p.id and wl.currency='coins'
      ),0)::bigint as coin_spent
    from public.profiles p
    left join public.wallets w on w.user_id = p.id
    left join public.host_profiles hp on hp.user_id = p.id
    left join public.agencies a on a.id = hp.agency_id
    where (
      v_q is null
      or p.username ilike '%'||v_q||'%'
      or p.display_name ilike '%'||v_q||'%'
      or p.public_user_id::text ilike '%'||v_q||'%'
      or p.id::text ilike v_q||'%'
    )
    and (
      v_filtre = 'all'
      or (v_filtre in ('platform','platform_loaded') and coalesce((
        select sum(case when wl.delta > 0 then wl.delta else 0 end)
        from public.wallet_ledger wl
        where wl.user_id=p.id and wl.currency='coins'
          and (wl.reason like 'admin_topup%' or wl.ref_type='admin'
            or wl.reason in ('bonus','bonus_coin','promotional','promo','agency_transfer','agency_coin'))
      ),0) > 0)
      or (v_filtre in ('purchase','user','satin') and coalesce((
        select sum(cp.coins_added) from public.coin_purchases cp
        where cp.user_id=p.id and coalesce(cp.status,'completed')='completed'
      ),0) > 0)
      or (v_filtre in ('balance','bakiye') and coalesce(w.coins,0) > 0)
    )
    order by coalesce(w.coins,0) desc, p.created_at desc
    limit v_limit offset v_offset
  ) t;

  return jsonb_build_object(
    'ok', true,
    'ozet', jsonb_build_object(
      'platform_yuklenen', v_plat,
      'kullanici_satin_alan', v_satinal,
      'cuzdan_toplam', v_supply,
      'bakiye_olan_kullanici', v_users
    ),
    'items', v_rows,
    'limit', v_limit,
    'offset', v_offset,
    'filtre', v_filtre
  );
end;
$$;

grant execute on function public.admin_finance_coin_yonetim(int, int, text, text) to authenticated;

create or replace function public.admin_finance_coin_ayarla(
  p_user_id uuid,
  p_islem text,
  p_miktar bigint default null,
  p_not text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_islem text := lower(trim(coalesce(p_islem,'')));
  v_cur bigint;
  v_target bigint;
  v_delta bigint;
  v_miktar bigint;
  v_ref text;
  v_res jsonb;
begin
  if not public.finance_yetkisi_var_mi('FINANCE_ADMIN') and not public.ben_admin_miyim() then
    raise exception 'Forbidden: finance write required';
  end if;
  if p_user_id is null then raise exception 'Kullanici gerekli'; end if;

  select coalesce(w.coins,0) into v_cur from public.wallets w where w.user_id = p_user_id;
  if v_cur is null then
    insert into public.wallets (user_id, coins, diamonds) values (p_user_id, 0, 0)
    on conflict (user_id) do nothing;
    v_cur := 0;
  end if;

  v_ref := p_user_id::text;

  if v_islem in ('reset','sifirla') then
    if v_cur <= 0 then
      return jsonb_build_object('ok', true, 'user_id', p_user_id, 'islem', 'reset', 'delta', 0, 'balance_after', 0);
    end if;
    v_res := public.admin_kullanici_coin_isle(v_ref, 'deduct', v_cur, coalesce(p_not, 'Finans Merkezi: sifirlama'));
    perform public.finance_audit_yaz('coin_reset','user', p_user_id::text,
      jsonb_build_object('before', v_cur), v_res, '{}'::jsonb);
    return v_res;
  end if;

  if v_islem in ('set','ayarla','hedef') then
    v_target := greatest(coalesce(p_miktar,0), 0);
    v_delta := v_target - v_cur;
    if v_delta = 0 then
      return jsonb_build_object('ok', true, 'user_id', p_user_id, 'islem', 'set', 'delta', 0, 'balance_after', v_cur);
    elsif v_delta > 0 then
      v_res := public.admin_kullanici_coin_isle(v_ref, 'topup', v_delta, coalesce(p_not, 'Finans Merkezi: miktar ayarla'));
    else
      v_res := public.admin_kullanici_coin_isle(v_ref, 'deduct', abs(v_delta), coalesce(p_not, 'Finans Merkezi: miktar ayarla'));
    end if;
    perform public.finance_audit_yaz('coin_set','user', p_user_id::text,
      jsonb_build_object('before', v_cur, 'target', v_target), v_res, '{}'::jsonb);
    return v_res;
  end if;

  if v_islem in ('topup','yukle','yukselt') then
    v_miktar := abs(coalesce(p_miktar,0));
    if v_miktar <= 0 then raise exception 'Miktar pozitif olmali'; end if;
    v_res := public.admin_kullanici_coin_isle(v_ref, 'topup', v_miktar, coalesce(p_not, 'Finans Merkezi: yukleme'));
    perform public.finance_audit_yaz('coin_topup','user', p_user_id::text, null, v_res, '{}'::jsonb);
    return v_res;
  end if;

  if v_islem in ('deduct','eksilt','dusur') then
    v_miktar := abs(coalesce(p_miktar,0));
    if v_miktar <= 0 then raise exception 'Miktar pozitif olmali'; end if;
    v_res := public.admin_kullanici_coin_isle(v_ref, 'deduct', v_miktar, coalesce(p_not, 'Finans Merkezi: dusurme'));
    perform public.finance_audit_yaz('coin_deduct','user', p_user_id::text, null, v_res, '{}'::jsonb);
    return v_res;
  end if;

  raise exception 'Gecersiz islem';
end;
$$;

grant execute on function public.admin_finance_coin_ayarla(uuid, text, bigint, text) to authenticated;
