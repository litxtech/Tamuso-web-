/**
 * Production READ-ONLY ladder with circuit breaker + generator stats.
 *
 * node scripts/run-prod-read-ladder.mjs
 */
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { resolveRunResultsDir, BASELINE_ID } from '../lib/results-dir.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const { runId: ACTIVE_RUN_ID, dir: ACTIVE_RESULTS_DIR } = resolveRunResultsDir({
  label: process.env.LOADTEST_RUN_LABEL || 'prod-read-ladder',
});
console.log(`Run id: ${ACTIVE_RUN_ID}`);
console.log(`Results → ${ACTIVE_RESULTS_DIR}`);
console.log(`Compare vs baseline: ${BASELINE_ID}`);

function loadEnv() {
  const p = path.join(root, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    process.env[k] = v;
  }
}
loadEnv();

process.env.LOADTEST_ALLOW_PROD_READ = '1';
process.env.LOADTEST_ENV = 'production';
process.env.LOADTEST_HOLD_SEC = process.env.LOADTEST_HOLD_SEC || '180';
process.env.LOADTEST_RAMP_SEC = process.env.LOADTEST_RAMP_SEC || '45';
process.env.LOADTEST_THINK_MIN = process.env.LOADTEST_THINK_MIN || '2';
process.env.LOADTEST_THINK_MAX = process.env.LOADTEST_THINK_MAX || '5';

const LEVELS = [100, 500, 1000, 2500, 5000, 7500, 10000];
const COOLDOWN_MS = Number(process.env.LOADTEST_COOLDOWN_MS || 45000);
const SCRIPT = path.join(root, 'scenarios', '10_mixed_real_user_test.js');

function findK6() {
  const local = path.join(root, 'bin', 'k6-v0.54.0-windows-amd64', 'k6.exe');
  if (fs.existsSync(local)) return local;
  return 'k6';
}

function windowsCpuPct() {
  if (process.platform !== 'win32') return null;
  try {
    const r = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        "(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue",
      ],
      { encoding: 'utf8', timeout: 15000 },
    );
    const n = Number(String(r.stdout || '').trim().replace(',', '.'));
    return Number.isFinite(n) ? Number(n.toFixed(1)) : null;
  } catch {
    return null;
  }
}

function generatorSnapshot() {
  const cpus = os.cpus();
  const load = os.loadavg?.() || [0, 0, 0];
  const freemem = os.freemem();
  const totalmem = os.totalmem();
  const cpu_pct = windowsCpuPct();
  return {
    at: new Date().toISOString(),
    cpu_count: cpus.length,
    loadavg_1m: load[0] ?? null,
    cpu_pct,
    freemem_mb: Math.round(freemem / 1024 / 1024),
    totalmem_mb: Math.round(totalmem / 1024 / 1024),
    mem_used_pct: Number((((totalmem - freemem) / totalmem) * 100).toFixed(1)),
    platform: os.platform(),
  };
}

function jwtExp(token) {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
    );
    return Number(payload.exp) || 0;
  } catch {
    return 0;
  }
}

function tokensNeedRefresh(minTtlSec = 900) {
  const tokensPath = path.join(root, 'fixtures', 'tokens.json');
  if (!fs.existsSync(tokensPath)) return true;
  try {
    const tok = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    if (!tok.tokens?.length || tok.tokens.length < 5) return true;
    const minExp = Math.min(...tok.tokens.map(jwtExp));
    return minExp * 1000 - Date.now() < minTtlSec * 1000;
  } catch {
    return true;
  }
}

function remintSessions({ force = false } = {}) {
  if (!force && !tokensNeedRefresh()) {
    const tok = JSON.parse(
      fs.readFileSync(path.join(root, 'fixtures', 'tokens.json'), 'utf8'),
    );
    console.log(`Tokens OK: ${tok.tokens.length} (TTL yeterli, mint atlandı)`);
    return tok;
  }
  console.log('Ensuring sample sessions (refresh veya mint)...');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'mint-sample-sessions.mjs')], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    // Mevcut yeterli token varsa devam et
    if (!tokensNeedRefresh(60)) {
      console.warn('mint exit non-zero ama mevcut token TTL >60s — devam');
      return JSON.parse(
        fs.readFileSync(path.join(root, 'fixtures', 'tokens.json'), 'utf8'),
      );
    }
    throw new Error(`mint-sample-sessions failed exit=${r.status}`);
  }
  const tok = JSON.parse(
    fs.readFileSync(path.join(root, 'fixtures', 'tokens.json'), 'utf8'),
  );
  console.log(`Tokens ready: ${tok.tokens?.length || 0}`);
  return tok;
}

function extract(summary) {
  const m = summary.metrics || {};
  const dur = m.http_req_duration?.values || m.http_req_duration || {};
  const reqs = m.http_reqs?.values || m.http_reqs || {};
  const failedRaw =
    m.http_req_failed?.values?.rate ??
    m.http_req_failed?.rate ??
    m.http_req_failed?.value ??
    null;

  const c = (name) => {
    const x = m[name];
    if (!x) return 0;
    return x.values?.count ?? x.count ?? 0;
  };
  const s2 = c('status_2xx');
  const s4 = c('status_4xx');
  const s5 = c('status_5xx');
  const s401 = c('status_401');
  const s403 = c('status_403');
  const s409 = c('status_409');
  const s429 = c('status_429');
  const totalStatus = s2 + s4 + s5 + c('status_other');
  const rate5xx = totalStatus > 0 ? s5 / totalStatus : 0;
  const rate429 = totalStatus > 0 ? s429 / totalStatus : 0;

  const ops = [];
  for (const [key, metric] of Object.entries(m)) {
    if (!key.startsWith('lat_')) continue;
    const safe = key.slice(4);
    const name = safe.replace(/_/g, ':').replace(/^rpc:/, 'rpc:').replace(/^home:/, 'home:');
    // reverse safe encode: we used replace non-alnum with _
    // better: map known names
    const known = [
      'home:rooms',
      'home:live_sessions',
      'home:hosts',
      'home:blocks',
      'rpc:durum_akisi',
      'rpc:durum_akisi_takip',
      'profile:get',
      'profile:stats',
      'profile:fallback',
      'rpc:mesaj_konularini_getir',
      'rpc:mesajlari_getir',
      'rpc:takipcileri_listele',
      'rpc:takip_edilenleri_listele',
      'rpc:liderlik_siralamasi_listele',
      'rpc:bildirim_okunmamis_sayim',
      'rpc:bildirimlerimi_listele',
      'room:live_list',
      'live:live_list',
      'auth:user',
    ];
    const opName =
      known.find((n) => n.replace(/[^a-zA-Z0-9_]/g, '_') === safe) || safe;
    const v = metric.values || metric;
    const ok = c(`ok_${safe}`);
    const fail = c(`fail_${safe}`);
    const count = ok + fail || v.count || null;
    const errRate =
      count && count > 0 ? Number(((fail / count) * 100).toFixed(3)) : 0;
    ops.push({
      name: opName,
      count,
      p50: v.med ?? v['p(50)'] ?? null,
      p95: v['p(95)'] ?? null,
      p99: v['p(99)'] ?? null,
      max: v.max ?? null,
      error_rate: errRate,
      ok,
      fail,
    });
  }

  return {
    rps: reqs.rate ?? null,
    total: reqs.count ?? null,
    p50: dur.med ?? dur['p(50)'] ?? null,
    p90: dur['p(90)'] ?? null,
    p95: dur['p(95)'] ?? null,
    p99: dur['p(99)'] ?? null,
    max: dur.max ?? null,
    error_rate: failedRaw != null ? Number((failedRaw * 100).toFixed(4)) : null,
    http_2xx: s2,
    http_4xx: s4,
    http_401: s401,
    http_403: s403,
    http_409: s409,
    http_429: s429,
    http_5xx: s5,
    rate_5xx_pct: Number((rate5xx * 100).toFixed(4)),
    rate_429_pct: Number((rate429 * 100).toFixed(4)),
    successful: s2,
    failed: (c('op_fail') || s4 + s5),
    operations: ops.sort((a, b) => (b.p95 || 0) - (a.p95 || 0)),
  };
}

function healthy(metrics) {
  const reasons = [];
  if (metrics.error_rate != null && metrics.error_rate >= 1) {
    reasons.push(`error_rate ${metrics.error_rate}% >= 1%`);
  }
  if (metrics.p95 != null && metrics.p95 >= 800) {
    reasons.push(`p95 ${metrics.p95}ms >= 800ms`);
  }
  if (metrics.p99 != null && metrics.p99 >= 1500) {
    reasons.push(`p99 ${metrics.p99}ms >= 1500ms`);
  }
  if (metrics.rate_5xx_pct != null && metrics.rate_5xx_pct >= 1) {
    reasons.push(`5xx ${metrics.rate_5xx_pct}% kritik eşik`);
  }
  if (metrics.rate_429_pct != null && metrics.rate_429_pct >= 1) {
    reasons.push(`429 ${metrics.rate_429_pct}% kritik eşik`);
  }
  return { ok: reasons.length === 0, reasons };
}

function circuitTrip(metrics) {
  const reasons = [];
  if (metrics.rate_5xx_pct != null && metrics.rate_5xx_pct > 5) {
    reasons.push(`5xx ${metrics.rate_5xx_pct}% > 5%`);
  }
  if (metrics.error_rate != null && metrics.error_rate > 10) {
    reasons.push(`failure ${metrics.error_rate}% > 10%`);
  }
  if (metrics.p95 != null && metrics.p95 > 5000) {
    reasons.push(`p95 ${metrics.p95}ms > 5000ms`);
  }
  return reasons;
}

function runLevel(k6bin, ccu) {
  const resultsDir = ACTIVE_RESULTS_DIR;
  fs.mkdirSync(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outJson = path.join(
    resultsDir,
    `prod-read-ccu${ccu}-${stamp}.summary.json`,
  );

  const started_at = new Date().toISOString();
  const genBefore = generatorSnapshot();
  console.log(`\n========== CCU ${ccu} START ${started_at} ==========`);

  const env = {
    ...process.env,
    LOADTEST_CCU: String(ccu),
    LOADTEST_ALLOW_PROD_READ: '1',
    LOADTEST_ENV: 'production',
    LOADTEST_TOKENS_FILE: path.join(root, 'fixtures', 'tokens.json'),
    LOADTEST_SOFT_THRESHOLDS: '1',
  };

  const r = spawnSync(
    k6bin,
    ['run', '--summary-export', outJson, SCRIPT],
    {
      cwd: root,
      env,
      encoding: 'utf8',
      shell: true,
      maxBuffer: 40 * 1024 * 1024,
    },
  );

  const ended_at = new Date().toISOString();
  const genAfter = generatorSnapshot();

  if (r.stdout) {
    const tail = r.stdout.slice(-2500);
    process.stdout.write(tail);
  }
  if (r.stderr) process.stderr.write(r.stderr.slice(-1500));

  let summary = {};
  if (fs.existsSync(outJson)) {
    summary = JSON.parse(fs.readFileSync(outJson, 'utf8'));
  }
  const metrics = extract(summary);

  const generator_bottleneck =
    genAfter.mem_used_pct >= 95 ||
    (genAfter.cpu_pct != null && genAfter.cpu_pct >= 95) ||
    (genAfter.loadavg_1m != null &&
      genAfter.cpu_count &&
      genAfter.loadavg_1m > genAfter.cpu_count * 1.5);

  const combined = String(r.stderr || '') + String(r.stdout || '');
  const aborted_by_safety =
    combined.includes('PRODUCTION üzerinde WRITE') ||
    combined.includes('LOADTEST_ALLOW_PROD_READ') ||
    combined.includes('WRITE stress YASAK');

  return {
    ccu,
    started_at,
    ended_at,
    exit_code: r.status,
    aborted_by_safety,
    metrics,
    generator_before: genBefore,
    generator_after: genAfter,
    generator_bottleneck,
    summary_path: outJson,
    healthy: healthy(metrics),
    circuit: circuitTrip(metrics),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitConnectionsDrain() {
  console.log(`Cooldown ${COOLDOWN_MS}ms (VU drain / cooldown)...`);
  spawnSync(
    process.platform === 'win32' ? 'powershell' : 'sleep',
    process.platform === 'win32'
      ? ['-NoProfile', '-Command', `Start-Sleep -Milliseconds ${COOLDOWN_MS}`]
      : [String(Math.ceil(COOLDOWN_MS / 1000))],
    { stdio: 'ignore' },
  );
}

async function main() {
  remintSessions({ force: true });

  const k6bin = findK6();
  const results = [];
  let stopReason = null;
  let stoppedAt = null;

  for (const ccu of LEVELS) {
    remintSessions({ force: false });
    const row = runLevel(k6bin, ccu);
    results.push(row);

    // persist incremental (run-scoped — never overwrite Free baseline)
    fs.writeFileSync(
      path.join(ACTIVE_RESULTS_DIR, 'load-test-results.json'),
      JSON.stringify(results, null, 2),
    );
    appendCsv(row);

    if (row.aborted_by_safety) {
      stopReason = 'safety_gate';
      stoppedAt = ccu;
      break;
    }
    if (row.circuit.length) {
      stopReason = `circuit_breaker: ${row.circuit.join('; ')}`;
      stoppedAt = ccu;
      console.error('CIRCUIT BREAKER — stop.', stopReason);
      break;
    }
    if (!row.healthy.ok) {
      stopReason = `unhealthy_for_escalation: ${row.healthy.reasons.join('; ')}`;
      stoppedAt = ccu;
      console.error('Sağlık eşiği tutmadı — daha yüksek CCU yok.', stopReason);
      break;
    }

    if (ccu !== LEVELS[LEVELS.length - 1]) {
      waitConnectionsDrain();
    }
  }

  const report = buildReport(results, stopReason, stoppedAt);
  fs.writeFileSync(
    path.join(ACTIVE_RESULTS_DIR, 'TAMUSO_LOAD_TEST_REPORT.md'),
    report.md,
  );
  fs.writeFileSync(
    path.join(ACTIVE_RESULTS_DIR, 'load-test-final.json'),
    JSON.stringify(
      {
        run_id: ACTIVE_RUN_ID,
        compare_against_baseline: BASELINE_ID,
        results,
        stopReason,
        stoppedAt,
        table: report.table,
      },
      null,
      2,
    ),
  );

  console.log('\n===== FINAL TABLE =====');
  console.log('CCU | RPS | p50 | p90 | p95 | p99 | Max | Error % | 429 | 5xx');
  for (const line of report.tableLines) console.log(line);
  console.log(report.footer);
}

function appendCsv(row) {
  const csvPath = path.join(ACTIVE_RESULTS_DIR, 'load-test-summary.csv');
  if (!fs.existsSync(csvPath) || fs.statSync(csvPath).size < 10) {
    fs.writeFileSync(
      csvPath,
      'CCU,started_at,ended_at,RPS,p50,p90,p95,p99,max,total,successful,failed,error_rate,http_2xx,http_4xx,http_401,http_403,http_409,http_429,http_5xx,exit_code,generator_mem_pct\n',
    );
  }
  const m = row.metrics;
  fs.appendFileSync(
    csvPath,
    [
      row.ccu,
      row.started_at,
      row.ended_at,
      m.rps ?? '',
      m.p50 ?? '',
      m.p90 ?? '',
      m.p95 ?? '',
      m.p99 ?? '',
      m.max ?? '',
      m.total ?? '',
      m.successful ?? '',
      m.failed ?? '',
      m.error_rate ?? '',
      m.http_2xx ?? '',
      m.http_4xx ?? '',
      m.http_401 ?? '',
      m.http_403 ?? '',
      m.http_409 ?? '',
      m.http_429 ?? '',
      m.http_5xx ?? '',
      row.exit_code,
      row.generator_after?.mem_used_pct ?? '',
    ].join(',') + '\n',
  );
}

function fmt(n, d = 2) {
  if (n == null || Number.isNaN(n)) return 'N/A';
  return typeof n === 'number' ? Number(n.toFixed(d)) : n;
}

function buildReport(results, stopReason, stoppedAt) {
  const byCcu = Object.fromEntries(LEVELS.map((c) => [c, null]));
  for (const r of results) byCcu[r.ccu] = r;

  const tableLines = [];
  const table = [];
  for (const ccu of LEVELS) {
    const r = byCcu[ccu];
    if (!r) {
      tableLines.push(`${ccu} | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A`);
      table.push({ ccu, ran: false });
      continue;
    }
    const m = r.metrics;
    tableLines.push(
      [
        ccu,
        fmt(m.rps, 2),
        fmt(m.p50, 2),
        fmt(m.p90, 2),
        fmt(m.p95, 2),
        fmt(m.p99, 2),
        fmt(m.max, 2),
        fmt(m.error_rate, 4),
        m.http_429 ?? 0,
        m.http_5xx ?? 0,
      ].join(' | '),
    );
    table.push({ ccu, ran: true, ...m, started_at: r.started_at, ended_at: r.ended_at });
  }

  const ran = results.filter((r) => !r.aborted_by_safety);
  const healthyLevels = ran.filter((r) => r.healthy.ok).map((r) => r.ccu);
  const maxHealthy = healthyLevels.length
    ? Math.max(...healthyLevels)
    : null;

  let firstDegrade = null;
  for (const r of ran) {
    if (!r.healthy.ok) {
      firstDegrade = r.ccu;
      break;
    }
  }

  let breaking = stoppedAt || firstDegrade || null;
  const slowOps = [];
  for (const r of ran) {
    for (const op of r.metrics.operations || []) {
      slowOps.push({ ccu: r.ccu, ...op });
    }
  }
  slowOps.sort((a, b) => (b.p95 || 0) - (a.p95 || 0));
  const top10 = slowOps.slice(0, 10);

  const mostErrors = [...slowOps]
    .filter((o) => o.fail > 0)
    .sort((a, b) => (b.fail || 0) - (a.fail || 0))[0];

  const first429 = ran.find((r) => (r.metrics.http_429 || 0) > 0)?.ccu ?? null;
  const first5xx = ran.find((r) => (r.metrics.http_5xx || 0) > 0)?.ccu ?? null;
  const genBottleneck = ran.some((r) => r.generator_bottleneck);

  const footer = [
    '',
    `İLK PERFORMANS BOZULMASI: ${firstDegrade ?? 'N/A (ölçülen seviyelerde eşik aşılmadı / test erken durdu)'}`,
    `BREAKING POINT: ${breaking ?? 'N/A'}`,
    `EN YÜKSEK SAĞLIKLI TEST EDİLEN CCU: ${maxHealthy ?? 'N/A'}`,
    `STOP REASON: ${stopReason ?? 'completed_all_levels'}`,
    `EN YAVAŞ 10 RPC/OPERATION:`,
    ...top10.map(
      (o, i) =>
        `  ${i + 1}. [CCU ${o.ccu}] ${o.name} p95=${fmt(o.p95)} p99=${fmt(o.p99)} count=${o.count} err%=${o.error_rate ?? 'N/A'}`,
    ),
    `EN FAZLA HATA VEREN OPERATION: ${
      mostErrors
        ? `${mostErrors.name} fail=${mostErrors.fail} @ CCU ${mostErrors.ccu}`
        : 'N/A'
    }`,
    `429 BAŞLADIĞI CCU: ${first429 ?? 'N/A'}`,
    `5xx BAŞLADIĞI CCU: ${first5xx ?? 'N/A'}`,
    `TEST GENERATOR DURUMU: ${
      genBottleneck
        ? 'LOAD GENERATOR BOTTLENECK'
        : 'belirgin generator bottleneck yok (cpu/mem eşiği)'
    }`,
    ...ran.map(
      (r) =>
        `  gen@CCU${r.ccu}: cpu%=${r.generator_after?.cpu_pct ?? 'N/A'} mem%=${r.generator_after?.mem_used_pct ?? 'N/A'}`,
    ),
    `SUPABASE CPU: N/A`,
    `SUPABASE RAM: N/A`,
    `DB CONNECTIONS: N/A`,
    `DISK IO: N/A`,
  ].join('\n');

  const md = `# TAMUSO LOAD TEST REPORT — Production READ-ONLY

## Ortam
- Project: Tamuso \`vdkqrqtrftzhbtquzked\`
- Mode: READ-ONLY (RPC mutating yasak listesi uygulandı)
- Tokens: existing \`is_sample\` users only

## Zaman aralıkları
${ran
  .map(
    (r) =>
      `- CCU ${r.ccu}: ${r.started_at} → ${r.ended_at} | gen_mem% ${r.generator_after?.mem_used_pct}`,
  )
  .join('\n')}

## Tablo
CCU | RPS | p50 | p90 | p95 | p99 | Max | Error % | 429 | 5xx
${tableLines.join('\n')}

${footer}

## Detay JSON
\`results/load-test-final.json\`
`;

  return { md, table, tableLines, footer };
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
