/**
 * Supabase Realtime WebSocket harness (k6 native WS supabase protokolü için yetersiz kalabilir).
 * Node 18+ — ayrı ölçüm; HTTP load sonuçlarıyla karıştırma.
 *
 * Env:
 *   LOADTEST_SUPABASE_URL
 *   LOADTEST_SUPABASE_ANON_KEY
 *   LOADTEST_ACCESS_TOKEN (opsiyonel — RLS tabloları için)
 *   LOADTEST_RT_CLIENTS=100
 *   LOADTEST_RT_DURATION_SEC=60
 *   LOADTEST_ALLOW_PROD_READ=1  (production ise zorunlu)
 */
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    const v = m[2].trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvFile();

const PROD_REF = 'vdkqrqtrftzhbtquzked';
const url = (process.env.LOADTEST_SUPABASE_URL || '').replace(/\/$/, '');
const anon = process.env.LOADTEST_SUPABASE_ANON_KEY || '';
const token = process.env.LOADTEST_ACCESS_TOKEN || anon;
const clients = Number(process.env.LOADTEST_RT_CLIENTS || 100);
const durationSec = Number(process.env.LOADTEST_RT_DURATION_SEC || 60);
const allowProd = process.env.LOADTEST_ALLOW_PROD_READ === '1';

if (!url || !anon) {
  console.error('LOADTEST_SUPABASE_URL / ANON_KEY gerekli');
  process.exit(1);
}
if (url.includes(PROD_REF) && !allowProd) {
  console.error('PRODUCTION Realtime testi için LOADTEST_ALLOW_PROD_READ=1 gerekir.');
  process.exit(2);
}

const wsBase = url.replace(/^https/, 'wss') + `/realtime/v1/websocket?apikey=${encodeURIComponent(anon)}&vsn=1.0.0`;

const stats = {
  attempted: clients,
  connected: 0,
  failed: 0,
  disconnects: 0,
  messages: 0,
  errors: [],
  connectMs: [],
};

function connectOne(i) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let settled = false;
    const ws = new WebSocket(wsBase, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const done = (ok) => {
      if (settled) return;
      settled = true;
      resolve({ ok, ws });
    };

    ws.on('open', () => {
      stats.connected += 1;
      stats.connectMs.push(Date.now() - t0);
      // Phoenix join — rooms is_live filter benzeri kanal (minimal)
      const topic = `realtime:public:rooms:${i}`;
      ws.send(
        JSON.stringify({
          topic,
          event: 'phx_join',
          payload: {
            config: {
              postgres_changes: [
                {
                  event: '*',
                  schema: 'public',
                  table: 'rooms',
                  filter: 'is_live=eq.true',
                },
              ],
            },
          },
          ref: String(i),
        }),
      );
      done(true);
    });

    ws.on('message', () => {
      stats.messages += 1;
    });

    ws.on('close', () => {
      stats.disconnects += 1;
    });

    ws.on('error', (e) => {
      stats.failed += 1;
      if (stats.errors.length < 20) stats.errors.push(String(e.message || e));
      done(false);
    });

    setTimeout(() => {
      if (!settled) {
        stats.failed += 1;
        try {
          ws.close();
        } catch (_) {}
        done(false);
      }
    }, 15000);
  });
}

async function main() {
  console.log(`[RT] connecting ${clients} clients for ${durationSec}s → ${url}`);
  const sockets = [];
  const batch = 25;
  for (let i = 0; i < clients; i += batch) {
    const chunk = [];
    for (let j = i; j < Math.min(i + batch, clients); j++) chunk.push(connectOne(j));
    const res = await Promise.all(chunk);
    for (const r of res) if (r.ok && r.ws) sockets.push(r.ws);
  }

  await new Promise((r) => setTimeout(r, durationSec * 1000));

  for (const ws of sockets) {
    try {
      ws.close();
    } catch (_) {}
  }

  const avgConnect =
    stats.connectMs.length === 0
      ? null
      : Math.round(stats.connectMs.reduce((a, b) => a + b, 0) / stats.connectMs.length);

  const out = {
    type: 'realtime',
    url,
    clients_requested: clients,
    connected: stats.connected,
    failed: stats.failed,
    success_rate:
      clients > 0 ? Number(((stats.connected / clients) * 100).toFixed(2)) : 0,
    disconnects: stats.disconnects,
    messages_received: stats.messages,
    events_per_sec: Number((stats.messages / Math.max(durationSec, 1)).toFixed(2)),
    avg_connect_ms: avgConnect,
    duration_sec: durationSec,
    sample_errors: stats.errors,
    note: 'HTTP load metrikleriyle karıştırma. Supabase Dashboard Realtime connections ile korele et.',
  };

  const resultsDir = path.join(__dirname, '..', 'results');
  fs.mkdirSync(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(resultsDir, `realtime-${clients}-${stamp}.json`),
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
