/**
 * Analyze k6 JSON output for tail-latency RCA.
 * node scripts/analyze-tail-json.mjs <jsonl-path> [summary-json]
 */
import fs from 'fs';
import readline from 'readline';
import path from 'path';

const jsonlPath = process.argv[2];
const summaryPath = process.argv[3];
if (!jsonlPath) {
  console.error('Usage: node analyze-tail-json.mjs <out.json> [summary.json]');
  process.exit(1);
}

const WINDOW_MS = Number(process.env.TAIL_WINDOW_MS || 10000);

const buckets = [
  { key: '<100ms', min: 0, max: 100 },
  { key: '100-250ms', min: 100, max: 250 },
  { key: '250-500ms', min: 250, max: 500 },
  { key: '500ms-1s', min: 500, max: 1000 },
  { key: '1-2s', min: 1000, max: 2000 },
  { key: '2-5s', min: 2000, max: 5000 },
  { key: '5-10s', min: 5000, max: 10000 },
  { key: '10-20s', min: 10000, max: 20000 },
  { key: '20-30s', min: 20000, max: 30000 },
  { key: '>30s', min: 30000, max: Infinity },
];

function bucketOf(ms) {
  return buckets.find((b) => ms >= b.min && ms < b.max)?.key || '>30s';
}

function pctile(sorted, p) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)];
}

const bucketCounts = Object.fromEntries(buckets.map((b) => [b.key, 0]));
const windows = new Map(); // t0 -> { durations, byOp, errors, s429, s5xx, vuMax, waiting, blocked, connecting, tls }
const slowSamples = [];
let total = 0;
let slow20 = 0;
let firstSlowTs = null;
let vuByTime = [];

const rl = readline.createInterface({
  input: fs.createReadStream(jsonlPath, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  if (!line.trim()) continue;
  let row;
  try {
    row = JSON.parse(line);
  } catch {
    continue;
  }

  // MetricPoint format: type Metric, or Point with metric/data
  if (row.type === 'Point' && row.metric === 'http_req_duration') {
    const ms = row.data?.value;
    const ts = new Date(row.data?.time || row.data?.tags?.time || 0).getTime();
    const name = row.data?.tags?.name || 'unknown';
    const status = Number(row.data?.tags?.status || 0);
    if (ms == null || !ts) continue;
    total += 1;
    bucketCounts[bucketOf(ms)] += 1;

    const w0 = Math.floor(ts / WINDOW_MS) * WINDOW_MS;
    if (!windows.has(w0)) {
      windows.set(w0, {
        durations: [],
        byOp: {},
        errors: 0,
        s429: 0,
        s5xx: 0,
        waiting: [],
        blocked: [],
        connecting: [],
        tls: [],
      });
    }
    const w = windows.get(w0);
    w.durations.push(ms);
    if (!w.byOp[name]) w.byOp[name] = [];
    w.byOp[name].push(ms);
    if (status === 429) w.s429 += 1;
    if (status >= 500) w.s5xx += 1;
    if (status >= 400) w.errors += 1;

    if (ms >= 20000) {
      slow20 += 1;
      if (!firstSlowTs) firstSlowTs = ts;
      slowSamples.push({ ts, ms, name, status });
    }
  }

  if (row.type === 'Point' && row.metric === 'vus') {
    const ts = new Date(row.data?.time || 0).getTime();
    const v = row.data?.value;
    if (ts && v != null) vuByTime.push({ ts, v });
  }

  if (row.type === 'Point' && row.metric === 'http_req_waiting' && row.data?.value >= 20000) {
    const ts = new Date(row.data.time).getTime();
    const w0 = Math.floor(ts / WINDOW_MS) * WINDOW_MS;
    const w = windows.get(w0);
    if (w) w.waiting.push(row.data.value);
  }
  if (row.type === 'Point' && row.metric === 'http_req_blocked' && row.data?.tags) {
    // only track if paired — skip bulk
  }
}

// Correlate spikes: windows where >=3 distinct op families have max>=20000
function opFamily(name) {
  if (name.startsWith('profile')) return 'profile';
  if (name.startsWith('home:rooms') || name.startsWith('room:')) return 'rooms';
  if (name.includes('durum') || name.startsWith('home:live')) return 'feed';
  if (name.includes('mesaj')) return 'messages';
  if (name.includes('liderlik')) return 'leaderboard';
  if (name.includes('takip')) return 'follow';
  if (name.includes('bildirim')) return 'notifications';
  if (name.startsWith('live:')) return 'live';
  return name.split(':')[0] || name;
}

const correlated = [];
const series = [];
for (const [w0, w] of [...windows.entries()].sort((a, b) => a[0] - b[0])) {
  const sorted = w.durations.slice().sort((a, b) => a - b);
  const vuNear = vuByTime.filter((x) => x.ts >= w0 && x.ts < w0 + WINDOW_MS);
  const vuMax = vuNear.length ? Math.max(...vuNear.map((x) => x.v)) : null;
  const families = {};
  for (const [op, arr] of Object.entries(w.byOp)) {
    const mx = Math.max(...arr);
    if (mx >= 20000) {
      const f = opFamily(op);
      families[f] = Math.max(families[f] || 0, mx);
    }
  }
  const famCount = Object.keys(families).length;
  if (famCount >= 3) {
    correlated.push({
      window_start: new Date(w0).toISOString(),
      families,
      famCount,
      p99: pctile(sorted, 99),
      max: sorted[sorted.length - 1],
      count: sorted.length,
      vuMax,
    });
  }
  series.push({
    window_start: new Date(w0).toISOString(),
    count: sorted.length,
    rps: sorted.length / (WINDOW_MS / 1000),
    p50: pctile(sorted, 50),
    p95: pctile(sorted, 95),
    p99: pctile(sorted, 99),
    max: sorted.length ? sorted[sorted.length - 1] : null,
    slow20: sorted.filter((x) => x >= 20000).length,
    errors: w.errors,
    s429: w.s429,
    s5xx: w.s5xx,
    vuMax,
  });
}

// Infer CCU when first slow appeared
let tailStartCcu = null;
if (firstSlowTs) {
  const near = vuByTime.filter((x) => x.ts <= firstSlowTs).sort((a, b) => b.ts - a.ts)[0];
  tailStartCcu = near?.v ?? null;
}

let summaryExtras = {};
if (summaryPath && fs.existsSync(summaryPath)) {
  const s = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const m = s.metrics || {};
  const c = (n) => m[n]?.count ?? m[n]?.values?.count ?? 0;
  summaryExtras = {
    buckets_from_summary: {
      '<100ms': c('bucket_lt_100'),
      '100-250ms': c('bucket_100_250'),
      '250-500ms': c('bucket_250_500'),
      '500ms-1s': c('bucket_500_1s'),
      '1-2s': c('bucket_1_2s'),
      '2-5s': c('bucket_2_5s'),
      '5-10s': c('bucket_5_10s'),
      '10-20s': c('bucket_10_20s'),
      '20-30s': c('bucket_20_30s'),
      '>30s': c('bucket_gt_30s'),
    },
    slow_phases: {
      count: c('slow_20s_count'),
      blocked: m.slow_blocked,
      connecting: m.slow_connecting,
      tls: m.slow_tls,
      sending: m.slow_sending,
      waiting: m.slow_waiting,
      receiving: m.slow_receiving,
      duration: m.slow_duration,
    },
    phases_all: {
      blocked: m.http_req_blocked,
      connecting: m.http_req_connecting,
      tls: m.http_req_tls_handshaking,
      sending: m.http_req_sending,
      waiting: m.http_req_waiting,
      receiving: m.http_req_receiving,
      duration: m.http_req_duration,
    },
  };
}

const out = {
  analyzed_at: new Date().toISOString(),
  source: path.basename(jsonlPath),
  window_ms: WINDOW_MS,
  total_http_req_duration_points: total,
  buckets: Object.fromEntries(
    Object.entries(bucketCounts).map(([k, v]) => [
      k,
      { count: v, pct: total ? Number(((v / total) * 100).toFixed(4)) : 0 },
    ]),
  ),
  slow_20s: {
    count: slow20,
    pct: total ? Number(((slow20 / total) * 100).toFixed(4)) : 0,
    first_ts: firstSlowTs ? new Date(firstSlowTs).toISOString() : null,
    first_vu_approx: tailStartCcu,
  },
  correlated_spike_windows: correlated,
  common_spike: correlated.length > 0,
  time_series: series,
  summaryExtras,
};

const dest = path.join(path.dirname(jsonlPath), 'tail-rca-analysis.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  total,
  slow20,
  slow_pct: out.slow_20s.pct,
  first_slow: out.slow_20s.first_ts,
  first_vu: tailStartCcu,
  correlated_windows: correlated.length,
  buckets: out.buckets,
  out: dest,
}, null, 2));
