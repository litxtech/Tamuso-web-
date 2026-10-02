/**
 * Peak stress — mixed + yükselen CCU.
 * Production'da LOADTEST_ALLOW_PROD_READ=1 olmadan abort.
 * Circuit breaker: orchestrator (scripts/run.mjs) summary'ye bakar.
 */
import { makeOptions } from '../lib/options.js';
import { runMixedIteration } from '../lib/actions.js';

const { options } = makeOptions({
  ccu: Number(__ENV.LOADTEST_CCU || 1000),
});
export { options };

export default function () {
  runMixedIteration();
}
