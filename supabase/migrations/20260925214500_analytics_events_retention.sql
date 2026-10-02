-- Analytics retention: sadece analytics_events temizler.
-- Oyun / cüzdan / ledger / banner_impressions dokunulmaz.
-- Admin CTR banner_* tablolarından gelir; analytics'teki banner_impression çift kopyadır.

create or replace function public.analytics_events_retention_temizle(
  p_keep_days int default 14,
  p_banner_keep_days int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_banner int := 0;
  v_deleted_old int := 0;
  v_keep int := greatest(coalesce(p_keep_days, 14), 1);
  v_banner_keep int := greatest(coalesce(p_banner_keep_days, 0), 0);
begin
  if auth.role() <> 'service_role' and not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  -- Çift yazılmış banner olayları (asıl kaynak: banner_impressions / banner_events)
  delete from public.analytics_events
  where event_name in ('banner_impression', 'banner_click')
    and created_at < now() - make_interval(days => v_banner_keep);
  get diagnostics v_deleted_banner = row_count;

  -- Genel retention
  delete from public.analytics_events
  where created_at < now() - make_interval(days => v_keep);
  get diagnostics v_deleted_old = row_count;

  return jsonb_build_object(
    'deleted_banner_dup', v_deleted_banner,
    'deleted_older_than_keep', v_deleted_old,
    'keep_days', v_keep,
    'banner_keep_days', v_banner_keep
  );
end;
$$;

revoke all on function public.analytics_events_retention_temizle(int, int) from public;
grant execute on function public.analytics_events_retention_temizle(int, int) to authenticated;
grant execute on function public.analytics_events_retention_temizle(int, int) to service_role;

comment on function public.analytics_events_retention_temizle(int, int) is
  'Güvenli analytics_events temizliği. Oyun/cüzdan tablolarına dokunmaz. Admin veya service_role.';
