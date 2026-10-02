/**
 * Tail-latency diagnostics: buckets, slow-phase trends, stage tags.
 * READ-only — sadece metrik; write yok.
 */
import exec from 'k6/execution';
import { Counter, Trend, Gauge } from 'k6/metrics';

export const bucket_lt_100 = new Counter('bucket_lt_100');
export const bucket_100_250 = new Counter('bucket_100_250');
export const bucket_250_500 = new Counter('bucket_250_500');
export const bucket_500_1s = new Counter('bucket_500_1s');
export const bucket_1_2s = new Counter('bucket_1_2s');
export const bucket_2_5s = new Counter('bucket_2_5s');
export const bucket_5_10s = new Counter('bucket_5_10s');
export const bucket_10_20s = new Counter('bucket_10_20s');
export const bucket_20_30s = new Counter('bucket_20_30s');
export const bucket_gt_30s = new Counter('bucket_gt_30s');

export const slow_20s_count = new Counter('slow_20s_count');
export const slow_blocked = new Trend('slow_blocked', true);
export const slow_connecting = new Trend('slow_connecting', true);
export const slow_tls = new Trend('slow_tls', true);
export const slow_sending = new Trend('slow_sending', true);
export const slow_waiting = new Trend('slow_waiting', true);
export const slow_receiving = new Trend('slow_receiving', true);
export const slow_duration = new Trend('slow_duration', true);

export const lat_stage_100 = new Trend('lat_stage_100', true);
export const lat_stage_200 = new Trend('lat_stage_200', true);
export const lat_stage_300 = new Trend('lat_stage_300', true);
export const lat_stage_400 = new Trend('lat_stage_400', true);
export const lat_stage_500 = new Trend('lat_stage_500', true);
export const slow20_stage_100 = new Counter('slow20_stage_100');
export const slow20_stage_200 = new Counter('slow20_stage_200');
export const slow20_stage_300 = new Counter('slow20_stage_300');
export const slow20_stage_400 = new Counter('slow20_stage_400');
export const slow20_stage_500 = new Counter('slow20_stage_500');
export const reqs_stage_100 = new Counter('reqs_stage_100');
export const reqs_stage_200 = new Counter('reqs_stage_200');
export const reqs_stage_300 = new Counter('reqs_stage_300');
export const reqs_stage_400 = new Counter('reqs_stage_400');
export const reqs_stage_500 = new Counter('reqs_stage_500');

export const inflight_gauge = new Gauge('diag_inflight');

let inflight = 0;

const stageLat = {
  100: lat_stage_100,
  200: lat_stage_200,
  300: lat_stage_300,
  400: lat_stage_400,
  500: lat_stage_500,
};
const stageSlow = {
  100: slow20_stage_100,
  200: slow20_stage_200,
  300: slow20_stage_300,
  400: slow20_stage_400,
  500: slow20_stage_500,
};
const stageReqs = {
  100: reqs_stage_100,
  200: reqs_stage_200,
  300: reqs_stage_300,
  400: reqs_stage_400,
  500: reqs_stage_500,
};

function stageFromVus(vus) {
  if (vus > 400) return 500;
  if (vus > 300) return 400;
  if (vus > 200) return 300;
  if (vus > 100) return 200;
  return 100;
}

export function beginRequest() {
  inflight += 1;
  inflight_gauge.add(inflight);
}

export function endRequest() {
  inflight = Math.max(0, inflight - 1);
  inflight_gauge.add(inflight);
}

export function recordLatency(res, opName) {
  const d = res.timings.duration;
  if (d < 100) bucket_lt_100.add(1);
  else if (d < 250) bucket_100_250.add(1);
  else if (d < 500) bucket_250_500.add(1);
  else if (d < 1000) bucket_500_1s.add(1);
  else if (d < 2000) bucket_1_2s.add(1);
  else if (d < 5000) bucket_2_5s.add(1);
  else if (d < 10000) bucket_5_10s.add(1);
  else if (d < 20000) bucket_10_20s.add(1);
  else if (d < 30000) bucket_20_30s.add(1);
  else bucket_gt_30s.add(1);

  let vus = 0;
  try {
    vus = exec.instance.vusActive || 0;
  } catch (_) {
    vus = 0;
  }
  const stage = stageFromVus(vus);
  stageLat[stage].add(d);
  stageReqs[stage].add(1);

  if (d >= 20000) {
    slow_20s_count.add(1);
    stageSlow[stage].add(1);
    slow_blocked.add(res.timings.blocked);
    slow_connecting.add(res.timings.connecting);
    slow_tls.add(res.timings.tls_handshaking);
    slow_sending.add(res.timings.sending);
    slow_waiting.add(res.timings.waiting);
    slow_receiving.add(res.timings.receiving);
    slow_duration.add(d);
    console.log(
      `[SLOW]${JSON.stringify({
        t: new Date().toISOString(),
        vus,
        stage,
        name: opName || 'unknown',
        status: res.status,
        duration: d,
        blocked: res.timings.blocked,
        connecting: res.timings.connecting,
        tls: res.timings.tls_handshaking,
        sending: res.timings.sending,
        waiting: res.timings.waiting,
        receiving: res.timings.receiving,
      })}`,
    );
  }
}

/** Yavaş kademeli ramp: 0→100→200→300→400→500 + hold */
export function slowRampStages() {
  const step = Number(__ENV.LOADTEST_STEP_SEC || 45);
  const stepHold = Number(__ENV.LOADTEST_STEP_HOLD_SEC || 30);
  const finalHold = Number(__ENV.LOADTEST_HOLD_SEC || 120);
  const targets = [100, 200, 300, 400, 500];
  const stages = [];
  for (const t of targets) {
    stages.push({ target: t, duration: `${step}s` });
    stages.push({
      target: t,
      duration: `${t === 500 ? finalHold : stepHold}s`,
    });
  }
  stages.push({ target: 0, duration: '20s' });
  return stages;
}
