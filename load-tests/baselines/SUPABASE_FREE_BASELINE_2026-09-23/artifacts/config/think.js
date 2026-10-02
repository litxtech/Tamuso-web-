import { sleep } from 'k6';

/** Randomized think-time (saniye). */
export function think(minSec, maxSec) {
  const lo = Number(minSec ?? __ENV.LOADTEST_THINK_MIN ?? 2);
  const hi = Number(maxSec ?? __ENV.LOADTEST_THINK_MAX ?? 6);
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const t = a + Math.random() * (b - a);
  sleep(t);
}
