/**
 * Controlled 500 CCU tail-latency diagnostic (READ-only).
 * Slow ramp + generator sampler. NO giant --out json.
 *
 * node scripts/run-tail-diagnostic.mjs
 */
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { resolveRunResultsDir, BASELINE_ID } from '../lib/results-dir.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

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
process.env.LOADTEST_SOFT_THRESHOLDS = '1';
process.env.LOADTEST_STEP_SEC = process.env.LOADTEST_STEP_SEC || '45';
process.env.LOADTEST_STEP_HOLD_SEC = process.env.LOADTEST_STEP_HOLD_SEC || '30';
process.env.LOADTEST_HOLD_SEC = process.env.LOADTEST_HOLD_SEC || '120';
process.env.LOADTEST_TOKENS_FILE = path.join(root, 'fixtures', 'tokens.json');

const { runId: ACTIVE_RUN_ID, dir: resultsDir } = resolveRunResultsDir({
  label: process.env.LOADTEST_RUN_LABEL || 'tail-diag',
});
console.log(`Run id: ${ACTIVE_RUN_ID} (vs ${BASELINE_ID}) → ${resultsDir}`);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const summaryPath = path.join(resultsDir, `tail-diag-500-${stamp}.summary.json`);
const consoleLog = path.join(resultsDir, `tail-diag-500-${stamp}.console.log`);
const genCsv = path.join(resultsDir, `tail-diag-500-${stamp}.generator.csv`);
const SCRIPT = path.join(root, 'scenarios', '14_tail_latency_diagnostic.js');

function findK6() {
  const local = path.join(root, 'bin', 'k6-v0.54.0-windows-amd64', 'k6.exe');
  return fs.existsSync(local) ? local : 'k6';
}

function remintIfNeeded() {
  const r = spawnSync(
    process.execPath,
    [path.join(__dirname, 'mint-sample-sessions.mjs')],
    { cwd: root, env: process.env, encoding: 'utf8' },
  );
  if (r.stdout) process.stdout.write(String(r.stdout).slice(-800));
  if (r.status !== 0) console.warn('mint warning exit', r.status);
}

function startGeneratorSampler() {
  fs.writeFileSync(
    genCsv,
    'ts,cpu_pct,mem_used_pct,freemem_mb,k6_cpu,k6_ws_mb,tcp_established\n',
  );
  const ps = `
$csv = '${genCsv.replace(/'/g, "''")}'
$deadline = (Get-Date).AddMinutes(20)
while ((Get-Date) -lt $deadline) {
  $cpu = 0
  try {
    $cpu = [math]::Round((Get-Counter '\\Processor(_Total)\\% Processor Time' -ErrorAction Stop).CounterSamples.CookedValue, 1)
  } catch { $cpu = -1 }
  $os = Get-CimInstance Win32_OperatingSystem
  $total = [double]$os.TotalVisibleMemorySize
  $free = [double]$os.FreePhysicalMemory
  $memPct = [math]::Round((($total - $free) / $total) * 100, 1)
  $freeMb = [math]::Round($free / 1024, 0)
  $k6 = Get-Process k6 -ErrorAction SilentlyContinue | Select-Object -First 1
  $k6cpu = if ($k6) { [math]::Round($k6.CPU, 2) } else { '' }
  $k6mb = if ($k6) { [math]::Round($k6.WorkingSet64 / 1MB, 1) } else { '' }
  $tcp = 0
  try { $tcp = @(Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue).Count } catch {}
  $line = ((Get-Date).ToUniversalTime().ToString('o')) + ',' + $cpu + ',' + $memPct + ',' + $freeMb + ',' + $k6cpu + ',' + $k6mb + ',' + $tcp
  Add-Content -Path $csv -Value $line -Encoding utf8
  if (-not $k6) {
    Start-Sleep -Seconds 5
    $k6 = Get-Process k6 -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $k6) { break }
  }
  Start-Sleep -Seconds 5
}
`;
  const tmp = path.join(resultsDir, `_gen_sampler_${stamp}.ps1`);
  fs.writeFileSync(tmp, ps, 'utf8');
  const child = spawn(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmp],
    { detached: true, stdio: 'ignore', windowsHide: true },
  );
  child.unref();
  return child.pid;
}

function main() {
  remintIfNeeded();
  const tok = JSON.parse(
    fs.readFileSync(path.join(root, 'fixtures', 'tokens.json'), 'utf8'),
  );
  if (!tok.tokens?.length) throw new Error('tokens empty');

  const k6bin = findK6();
  const started = new Date().toISOString();
  console.log('TAIL DIAG START', started);
  console.log('tokens', tok.tokens.length);
  console.log('summary', summaryPath);

  const samplerPid = startGeneratorSampler();
  console.log('generator sampler pid', samplerPid);

  const outFd = fs.openSync(consoleLog, 'w');
  const env = {
    ...process.env,
    LOADTEST_ALLOW_PROD_READ: '1',
    LOADTEST_ENV: 'production',
    LOADTEST_SOFT_THRESHOLDS: '1',
    LOADTEST_TOKENS_FILE: path.join(root, 'fixtures', 'tokens.json'),
  };

  // IMPORTANT: no shell:true — wait for real k6 exit
  const r = spawnSync(
    k6bin,
    ['run', '--summary-export', summaryPath, SCRIPT],
    {
      cwd: root,
      env,
      encoding: 'utf8',
      shell: false,
      maxBuffer: 80 * 1024 * 1024,
    },
  );

  const combined = `${r.stdout || ''}\n${r.stderr || ''}`;
  fs.writeSync(outFd, combined);
  fs.closeSync(outFd);

  // Extract [SLOW] lines
  const slows = combined
    .split(/\r?\n/)
    .filter((l) => l.includes('[SLOW]'))
    .map((l) => {
      const i = l.indexOf('[SLOW]');
      try {
        return JSON.parse(l.slice(i + 6));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  fs.writeFileSync(
    path.join(resultsDir, `tail-diag-500-${stamp}.slows.json`),
    JSON.stringify(slows, null, 2),
  );

  const ended = new Date().toISOString();
  console.log('TAIL DIAG END', ended, 'exit', r.status);
  console.log('slow samples', slows.length);
  if (r.stdout) process.stdout.write(r.stdout.slice(-2500));
  if (r.stderr) process.stderr.write(r.stderr.slice(-1000));

  let summary = {};
  if (fs.existsSync(summaryPath)) {
    summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  }

  const meta = {
    started_at: started,
    ended_at: ended,
    exit_code: r.status,
    summary_path: summaryPath,
    console_log: consoleLog,
    generator_csv: genCsv,
    slows_path: path.join(resultsDir, `tail-diag-500-${stamp}.slows.json`),
    slow_count: slows.length,
    host: {
      cpus: os.cpus().length,
      totalmem_mb: Math.round(os.totalmem() / 1024 / 1024),
      platform: os.platform(),
    },
  };
  fs.writeFileSync(
    path.join(resultsDir, `tail-diag-500-${stamp}.meta.json`),
    JSON.stringify(meta, null, 2),
  );

  // Compact RCA extract
  const m = summary.metrics || {};
  const c = (n) => m[n]?.count ?? 0;
  const t = (n) => m[n] || null;
  const rca = {
    meta,
    buckets: {
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
    stages: {
      100: { reqs: c('reqs_stage_100'), slow20: c('slow20_stage_100'), lat: t('lat_stage_100') },
      200: { reqs: c('reqs_stage_200'), slow20: c('slow20_stage_200'), lat: t('lat_stage_200') },
      300: { reqs: c('reqs_stage_300'), slow20: c('slow20_stage_300'), lat: t('lat_stage_300') },
      400: { reqs: c('reqs_stage_400'), slow20: c('slow20_stage_400'), lat: t('lat_stage_400') },
      500: { reqs: c('reqs_stage_500'), slow20: c('slow20_stage_500'), lat: t('lat_stage_500') },
    },
    slow_phases: {
      count: c('slow_20s_count'),
      blocked: t('slow_blocked'),
      connecting: t('slow_connecting'),
      tls: t('slow_tls'),
      sending: t('slow_sending'),
      waiting: t('slow_waiting'),
      receiving: t('slow_receiving'),
      duration: t('slow_duration'),
    },
    phases_all: {
      duration: t('http_req_duration'),
      waiting: t('http_req_waiting'),
      blocked: t('http_req_blocked'),
      connecting: t('http_req_connecting'),
      tls: t('http_req_tls_handshaking'),
      sending: t('http_req_sending'),
      receiving: t('http_req_receiving'),
    },
    http: {
      reqs: t('http_reqs'),
      failed: t('http_req_failed'),
      status_2xx: c('status_2xx'),
      status_429: c('status_429'),
      status_5xx: c('status_5xx'),
    },
    slows_sample_first20: slows.slice(0, 20),
    slows_by_stage: slows.reduce((acc, s) => {
      acc[s.stage] = (acc[s.stage] || 0) + 1;
      return acc;
    }, {}),
    slows_by_op: slows.reduce((acc, s) => {
      acc[s.name] = (acc[s.name] || 0) + 1;
      return acc;
    }, {}),
  };
  const rcaPath = path.join(resultsDir, 'tail-rca-analysis.json');
  fs.writeFileSync(
    rcaPath,
    JSON.stringify(
      { run_id: ACTIVE_RUN_ID, compare_against_baseline: BASELINE_ID, ...rca },
      null,
      2,
    ),
  );
  console.log('RCA written', rcaPath);
  console.log(JSON.stringify({ buckets: rca.buckets, stages: Object.fromEntries(Object.entries(rca.stages).map(([k,v]) => [k, {reqs:v.reqs, slow20:v.slow20, p99:v.lat?.['p(99)'], p95:v.lat?.['p(95)']}])), slow_phases: rca.slow_phases, http: rca.http }, null, 2));
}

main();
