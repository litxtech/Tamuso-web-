/**
 * k6 runner + circuit breaker + CSV/JSON özet.
 * Usage:
 *   node load-tests/scripts/run.mjs --scenario mixed --ccu 100
 *   node load-tests/scripts/run.mjs --ladder   # 100→… circuit breaker ile
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveRunResultsDir, BASELINE_ID } from '../lib/results-dir.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const repoRoot = path.join(root, '..');
let ACTIVE_RESULTS_DIR = null;
let ACTIVE_RUN_ID = null;

function loadEnv() {
  const p = path.join(root, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const SCENARIOS = {
  auth: 'scenarios/01_auth_read_test.js',
  home: 'scenarios/02_home_feed_test.js',
  status: 'scenarios/03_status_feed_test.js',
  profile: 'scenarios/04_profile_test.js',
  messages: 'scenarios/05_messages_read_test.js',
  follow: 'scenarios/06_follow_test.js',
  leaderboard: 'scenarios/07_leaderboard_test.js',
  room: 'scenarios/08_room_metadata_test.js',
  notifications: 'scenarios/09_notifications_test.js',
  mixed: 'scenarios/10_mixed_real_user_test.js',
  peak: 'scenarios/12_peak_stress_test.js',
};

function parseArgs(argv) {
  const out = { scenario: 'mixed', ccu: 100, ladder: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ladder') out.ladder = true;
    else if (a === '--scenario') out.scenario = argv[++i];
    else if (a === '--ccu') out.ccu = Number(argv[++i]);
  }
  return out;
}

function findK6() {
  const local = path.join(root, 'bin', 'k6-v0.54.0-windows-amd64', 'k6.exe');
  if (fs.existsSync(local)) return local;
  const local2 = path.join(root, 'bin', 'k6.exe');
  if (fs.existsSync(local2)) return local2;

  const which = spawnSync('k6', ['version'], { encoding: 'utf8', shell: true });
  if (which.status === 0) return 'k6';
  const probe = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', "(Get-Command k6 -ErrorAction SilentlyContinue).Source"],
    { encoding: 'utf8' },
  );
  const src = (probe.stdout || '').trim();
  if (src) return src;
  return null;
}

function extractMetrics(summary) {
  const m = summary.metrics || {};
  const dur = m.http_req_duration || {};
  const vals = dur.values || {};
  const failed = m.http_req_failed?.values?.rate;
  const reqs = m.http_reqs?.values || {};
  const checks = m.checks?.values || {};

  // status code counters if present
  const status = (code) => m[`http_req_status_${code}`]?.values?.count;

  return {
    rps: reqs.rate ?? null,
    total: reqs.count ?? null,
    p50: vals.med ?? vals['p(50)'] ?? null,
    p90: vals['p(90)'] ?? null,
    p95: vals['p(95)'] ?? null,
    p99: vals['p(99)'] ?? null,
    max: vals.max ?? null,
    avg: vals.avg ?? null,
    error_rate: failed != null ? Number((failed * 100).toFixed(3)) : null,
    success_checks: checks.passes ?? null,
    fail_checks: checks.fails ?? null,
    // k6 doesn't give 429/5xx by default without custom metrics — N/A unless tagged
    c429: status?.(429) ?? null,
    c5xx: null,
  };
}

function shouldAbort(metrics) {
  const p95Limit = Number(process.env.LOADTEST_ABORT_P95_MS || 5000);
  const failLimit = Number(process.env.LOADTEST_ABORT_FAIL_RATE || 0.1) * 100;
  const reasons = [];
  if (metrics.p95 != null && metrics.p95 > p95Limit) {
    reasons.push(`p95 ${metrics.p95}ms > ${p95Limit}ms`);
  }
  if (metrics.error_rate != null && metrics.error_rate > failLimit) {
    reasons.push(`error_rate ${metrics.error_rate}% > ${failLimit}%`);
  }
  return reasons;
}

function runOne(k6bin, scenarioKey, ccu) {
  const rel = SCENARIOS[scenarioKey];
  if (!rel) throw new Error(`Bilinmeyen senaryo: ${scenarioKey}`);
  const script = path.join(root, rel);
  if (!ACTIVE_RESULTS_DIR) {
    const r = resolveRunResultsDir({
      label: process.env.LOADTEST_RUN_LABEL || 'load-run',
    });
    ACTIVE_RESULTS_DIR = r.dir;
    ACTIVE_RUN_ID = r.runId;
    console.log(`Run id: ${ACTIVE_RUN_ID} (vs ${BASELINE_ID}) → ${ACTIVE_RESULTS_DIR}`);
  }
  const resultsDir = ACTIVE_RESULTS_DIR;
  fs.mkdirSync(resultsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outJson = path.join(resultsDir, `${scenarioKey}-ccu${ccu}-${stamp}.summary.json`);

  const env = {
    ...process.env,
    LOADTEST_CCU: String(ccu),
    LOADTEST_SCENARIO: scenarioKey,
  };

  console.log(`\n=== RUN ${scenarioKey} @ ${ccu} CCU ===`);
  const r = spawnSync(
    k6bin,
    ['run', '--summary-export', outJson, script],
    {
      cwd: root,
      env,
      encoding: 'utf8',
      shell: true,
      maxBuffer: 20 * 1024 * 1024,
    },
  );

  if (r.stdout) process.stdout.write(r.stdout.slice(-4000));
  if (r.stderr) process.stderr.write(r.stderr.slice(-2000));

  let summary = {};
  if (fs.existsSync(outJson)) {
    summary = JSON.parse(fs.readFileSync(outJson, 'utf8'));
  }

  const metrics = extractMetrics(summary);
  return {
    scenario: scenarioKey,
    ccu,
    exit_code: r.status,
    aborted_by_safety: (r.stderr || '').includes('[LOADTEST]'),
    metrics,
    summary_path: outJson,
    abort_reasons: shouldAbort(metrics),
  };
}

function appendCsv(rows) {
  const csvPath = path.join(root, 'results', 'load-test-summary.csv');
  const header =
    'CCU,scenario,RPS,p50,p95,p99,max,success_checks,fail_checks,error_rate,429,5xx,exit_code\n';
  if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, header);
  for (const row of rows) {
    const m = row.metrics || {};
    fs.appendFileSync(
      csvPath,
      [
        row.ccu,
        row.scenario,
        m.rps ?? '',
        m.p50 ?? '',
        m.p95 ?? '',
        m.p99 ?? '',
        m.max ?? '',
        m.success_checks ?? '',
        m.fail_checks ?? '',
        m.error_rate ?? '',
        m.c429 ?? 'N/A',
        m.c5xx ?? 'N/A',
        row.exit_code,
      ].join(',') + '\n',
    );
  }
}

function main() {
  const args = parseArgs(process.argv);
  const k6bin = findK6();
  if (!k6bin) {
    console.error('k6 bulunamadı. winget install GrafanaLabs.k6');
    process.exit(1);
  }

  if (!process.env.LOADTEST_SUPABASE_URL) {
    // repo .env'den doldurmayı dene (sadece URL varlığını raporlamak için)
    try {
      const envPath = path.join(repoRoot, '.env');
      const t = fs.readFileSync(envPath, 'utf8');
      const u = t.match(/EXPO_PUBLIC_SUPABASE_URL=(.+)/);
      const k = t.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
      if (u) process.env.LOADTEST_SUPABASE_URL = u[1].trim();
      if (k) process.env.LOADTEST_SUPABASE_ANON_KEY = k[1].trim();
      if (!process.env.LOADTEST_ENV) process.env.LOADTEST_ENV = 'production';
    } catch (_) {}
  }

  const results = [];
  if (args.ladder) {
    const levels = [100, 500, 1000, 2500, 5000, 7500, 10000];
    for (const ccu of levels) {
      const row = runOne(k6bin, args.scenario, ccu);
      results.push(row);
      appendCsv([row]);
      if (row.aborted_by_safety) {
        console.error('Safety abort — ladder durdu.');
        break;
      }
      if (row.abort_reasons.length) {
        console.error('Circuit breaker:', row.abort_reasons.join('; '));
        console.error('Bir sonraki CCU seviyesine ÇIKILMIYOR.');
        break;
      }
      if (row.exit_code !== 0 && ccu === 100) {
        console.error('100 CCU smoke başarısız — ladder durdu.');
        break;
      }
    }
  } else {
    const row = runOne(k6bin, args.scenario, args.ccu);
    results.push(row);
    appendCsv([row]);
  }

  const aggPath = path.join(root, 'results', 'load-test-results.json');
  let prev = [];
  if (fs.existsSync(aggPath)) {
    try {
      prev = JSON.parse(fs.readFileSync(aggPath, 'utf8'));
      if (!Array.isArray(prev)) prev = [prev];
    } catch (_) {
      prev = [];
    }
  }
  fs.writeFileSync(aggPath, JSON.stringify(prev.concat(results), null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(
    'CCU | RPS | p50 | p95 | p99 | Error % | exit',
  );
  for (const r of results) {
    const m = r.metrics;
    console.log(
      [
        r.ccu,
        m.rps ?? 'N/A',
        m.p50 ?? 'N/A',
        m.p95 ?? 'N/A',
        m.p99 ?? 'N/A',
        m.error_rate ?? 'N/A',
        r.exit_code,
      ].join(' | '),
    );
  }
}

main();
