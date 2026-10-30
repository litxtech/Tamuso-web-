-- Örnek profiller: auth kullanıcısı silinse bile profiles satırı kalıyordu.
-- Admin silme bu satırları ve onlara bağlı kayıtları kaldırır.

create or replace function public.admin_ornek_kullanicilari_sil()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_n int;
  r record;
  v_sql text;
  v_pass int;
begin
  if coalesce(auth.role(), '') is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin')
     and not public.ben_admin_miyim() then
    raise exception 'Forbidden: admin only';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
    into v_ids
  from public.profiles
  where is_sample = true;

  v_n := cardinality(v_ids);
  if v_n = 0 then
    return jsonb_build_object('ok', true, 'silinen', 0);
  end if;

  update public.rooms
    set is_live = false,
        ended_at = coalesce(ended_at, now())
  where is_sample = true
     or host_id = any (v_ids);

  for v_pass in 1..3 loop
    for r in
      select
        c.conrelid::regclass as tablo,
        a.attname as kolon,
        a.attnotnull as notnull
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid
       and a.attnum = c.conkey[1]
      where c.confrelid = 'public.profiles'::regclass
        and c.contype = 'f'
        and coalesce(array_length(c.conkey, 1), 0) = 1
        and c.confdeltype not in ('c', 'n')
    loop
      if r.notnull then
        v_sql := format('delete from %s where %I = any ($1)', r.tablo, r.kolon);
      else
        v_sql := format(
          'update %s set %I = null where %I = any ($1)',
          r.tablo, r.kolon, r.kolon
        );
      end if;
      begin
        execute v_sql using v_ids;
      exception when others then
        null;
      end;
    end loop;
  end loop;

  -- Örnek hesapların sahte defter satırları da kalksın; tetikleyici gerçek
  -- kullanıcı defterini korur, bu blok yalnızca silme süresince kapanır.
  begin
    alter table public.wallet_ledger disable trigger trg_wallet_ledger_immutable;
    alter table public.host_earnings_ledger disable trigger trg_host_earnings_ledger_immutable;
    alter table public.agency_earnings_ledger disable trigger trg_agency_earnings_ledger_immutable;
    alter table public.agency_wallet_ledger disable trigger trg_agency_wallet_ledger_immutable;

    delete from public.profiles
    where id = any (v_ids);

    alter table public.wallet_ledger enable trigger trg_wallet_ledger_immutable;
    alter table public.host_earnings_ledger enable trigger trg_host_earnings_ledger_immutable;
    alter table public.agency_earnings_ledger enable trigger trg_agency_earnings_ledger_immutable;
    alter table public.agency_wallet_ledger enable trigger trg_agency_wallet_ledger_immutable;
  exception when others then
    alter table public.wallet_ledger enable trigger trg_wallet_ledger_immutable;
    alter table public.host_earnings_ledger enable trigger trg_host_earnings_ledger_immutable;
    alter table public.agency_earnings_ledger enable trigger trg_agency_earnings_ledger_immutable;
    alter table public.agency_wallet_ledger enable trigger trg_agency_wallet_ledger_immutable;
    raise;
  end;

  insert into public.admin_audit_logs (admin_id, action, summary, details)
  values (
    auth.uid(),
    'sample_users_purge',
    format('%s örnek kullanıcı silindi', v_n),
    jsonb_build_object('silinen', v_n, 'kaynak', 'admin_ornek_kullanicilari_sil')
  );

  return jsonb_build_object('ok', true, 'silinen', v_n);
end;
$$;

revoke all on function public.admin_ornek_kullanicilari_sil() from public;
grant execute on function public.admin_ornek_kullanicilari_sil() to authenticated, service_role;

notify pgrst, 'reload schema';
