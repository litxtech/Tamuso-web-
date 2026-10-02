-- READ-ONLY teşhis sorguları — production'da çalıştırılabilir
-- Hiçbir DML/DDL yok. EXPLAIN ANALYZE yok (load riski).

-- 1) Bağlantı limitleri
select name, setting
from pg_settings
where name in (
  'max_connections',
  'superuser_reserved_connections',
  'statement_timeout',
  'idle_in_transaction_session_timeout',
  'lock_timeout'
)
order by name;

-- 2) Anlık bağlantı özeti
select
  count(*) as total,
  count(*) filter (where state = 'active') as active,
  count(*) filter (where state = 'idle') as idle,
  count(*) filter (where state = 'idle in transaction') as idle_in_tx,
  count(*) filter (where wait_event_type is not null) as waiting_evt
from pg_stat_activity
where datname = current_database();

-- 3) Uygulama adına göre bağlantılar
select application_name, state, count(*)
from pg_stat_activity
where datname = current_database()
group by 1, 2
order by 3 desc;

-- 4) Bekleyen / uzun süren sorgular (anlık)
select
  pid,
  now() - query_start as runtime,
  wait_event_type,
  wait_event,
  state,
  left(query, 160) as query_preview
from pg_stat_activity
where datname = current_database()
  and pid <> pg_backend_pid()
  and state <> 'idle'
order by query_start nulls last
limit 50;

-- 5) Lock bekleme
select
  blocked.pid as blocked_pid,
  blocking.pid as blocking_pid,
  left(blocked.query, 120) as blocked_query,
  left(blocking.query, 120) as blocking_query
from pg_stat_activity blocked
join pg_locks bl on bl.pid = blocked.pid and not bl.granted
join pg_locks gl
  on gl.locktype = bl.locktype
 and gl.database is not distinct from bl.database
 and gl.relation is not distinct from bl.relation
 and gl.page is not distinct from bl.page
 and gl.tuple is not distinct from bl.tuple
 and gl.virtualxid is not distinct from bl.virtualxid
 and gl.transactionid is not distinct from bl.transactionid
 and gl.classid is not distinct from bl.classid
 and gl.objid is not distinct from bl.objid
 and gl.objsubid is not distinct from bl.objsubid
 and gl.granted
join pg_stat_activity blocking on blocking.pid = gl.pid
where blocked.datname = current_database()
limit 50;

-- 6) Tablo boyut / seq-scan oranı (istatistik; kesin plan değil)
select
  relname,
  seq_scan,
  idx_scan,
  n_live_tup,
  round(100.0 * seq_scan / nullif(seq_scan + idx_scan, 0), 2) as seq_pct
from pg_stat_user_tables
where schemaname = 'public'
  and relname in (
    'status_posts',
    'follows',
    'message_threads',
    'message_thread_members',
    'direct_messages',
    'leaderboard_snapshots',
    'rooms',
    'live_sessions',
    'profiles'
  )
order by seq_scan desc;

-- 7) Cache hit ratio (instance)
select
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  round(
    100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0),
    2
  ) as cache_hit_pct
from pg_statio_user_tables;
