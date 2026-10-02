-- Push worker: pending outbox'u her dakika + insert'te isle
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto;

create table if not exists public.push_worker_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.push_worker_config enable row level security;

revoke all on public.push_worker_config from anon, authenticated;
grant select, insert, update on public.push_worker_config to service_role;

insert into public.push_worker_config (key, value)
values (
  'cron_secret',
  encode(gen_random_bytes(32), 'hex')
)
on conflict (key) do nothing;

insert into public.push_worker_config (key, value)
values (
  'function_url',
  'https://vdkqrqtrftzhbtquzked.supabase.co/functions/v1/notification-push'
)
on conflict (key) do update
  set value = excluded.value, updated_at = now();

create or replace function public.push_worker_tetikle(p_limit int default 50)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net
as $$
declare
  v_secret text;
  v_url text;
  v_req_id bigint;
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  select value into v_secret
  from public.push_worker_config
  where key = 'cron_secret';

  select value into v_url
  from public.push_worker_config
  where key = 'function_url';

  if v_secret is null or v_url is null then
    return null;
  end if;

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', v_secret
    ),
    body := jsonb_build_object('limit', v_limit),
    timeout_milliseconds := 60000
  ) into v_req_id;

  return v_req_id;
exception when others then
  raise warning 'push_worker_tetikle: %', SQLERRM;
  return null;
end;
$$;

revoke all on function public.push_worker_tetikle(int) from public;
grant execute on function public.push_worker_tetikle(int) to service_role;

create or replace function public.trg_notification_outbox_push_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    perform public.push_worker_tetikle(30);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notification_outbox_push_worker on public.notification_outbox;
create trigger trg_notification_outbox_push_worker
  after insert on public.notification_outbox
  for each row
  execute function public.trg_notification_outbox_push_worker();

do $$
begin
  perform cron.unschedule('notification-push-worker');
exception when others then
  null;
end $$;

select cron.schedule(
  'notification-push-worker',
  '* * * * *',
  $cron$ select public.push_worker_tetikle(50); $cron$
);
