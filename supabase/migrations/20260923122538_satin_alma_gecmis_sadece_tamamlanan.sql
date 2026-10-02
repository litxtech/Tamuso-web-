-- Satın alma geçmişi: yalnız gerçekten tamamlananlar (tıklama / pending / failed yok)

create or replace function public.satin_alma_gecmisim(p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc)
    from (
      select * from (
        select
          cp.id::text as id,
          'coin'::text as kind,
          coalesce(pkg.title, 'Coin paketi') as title,
          ('+' || (cp.coins_added)::text || ' coin') as detail,
          cp.coins_added::numeric as quantity,
          'coin'::text as unit,
          cp.amount_try,
          cp.amount_usd,
          cp.provider as channel,
          cp.store,
          cp.status,
          cp.created_at,
          cp.verified_at as completed_at,
          jsonb_build_object(
            'package_id', cp.package_id,
            'provider_tx_id', cp.provider_tx_id
          ) as meta
        from public.coin_purchases cp
        left join public.coin_packages pkg on pkg.id = cp.package_id
        where cp.user_id = v_uid
          and cp.status = 'completed'
          and coalesce(cp.coins_added, 0) > 0

        union all

        select
          ap.id::text,
          'ai_music'::text,
          coalesce(ap.display_name_snapshot, ap.product_id),
          (
            '+' ||
            round((ap.seconds_snapshot + coalesce(ap.bonus_seconds_snapshot, 0)) / 60.0)::text ||
            ' dk AI müzik'
          ),
          (ap.seconds_snapshot + coalesce(ap.bonus_seconds_snapshot, 0))::numeric,
          'seconds'::text,
          ap.amount_try,
          ap.amount_usd,
          ap.store,
          ap.store,
          ap.status,
          coalesce(ap.credited_at, ap.created_at),
          ap.credited_at,
          jsonb_build_object(
            'product_id', ap.product_id,
            'transaction_id', ap.transaction_id,
            'seconds', ap.seconds_snapshot,
            'bonus_seconds', ap.bonus_seconds_snapshot
          )
        from public.ai_music_purchases ap
        where ap.user_id = v_uid
          and ap.status = 'CREDITED'
          and ap.credited_at is not null
      ) u
      order by u.created_at desc
      limit v_limit
    ) x
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.satin_alma_gecmisim(int) to authenticated;
