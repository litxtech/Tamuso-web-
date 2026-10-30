-- livekit-token edge fonksiyonu soğuk başlatması (~4-5 sn) canlı izleyiciyi bekletmesin:
-- dakikada bir GET ile sıcak tut. GET yalnız {ok:true} döner; anon JWT gateway için.

create or replace function public.livekit_token_isit()
returns bigint
language plpgsql
security definer
set search_path to 'public', 'extensions', 'net'
as $$
declare
  v_req_id bigint;
begin
  select net.http_get(
    url := 'https://vdkqrqtrftzhbtquzked.supabase.co/functions/v1/livekit-token',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZka3FycXRyZnR6aGJ0cXV6a2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4OTc1OTEsImV4cCI6MjEwNDQ3MzU5MX0.iOT-xDDl5xazvhNY9wXCH1Qcm5M1tbqUHQkFUNDaBBM'
    ),
    timeout_milliseconds := 10000
  ) into v_req_id;
  return v_req_id;
exception when others then
  raise warning 'livekit_token_isit: %', SQLERRM;
  return null;
end;
$$;

revoke all on function public.livekit_token_isit() from public, anon, authenticated;

select cron.unschedule('livekit-token-isit')
where exists (select 1 from cron.job where jobname = 'livekit-token-isit');

select cron.schedule('livekit-token-isit', '* * * * *', $$ select public.livekit_token_isit(); $$);
