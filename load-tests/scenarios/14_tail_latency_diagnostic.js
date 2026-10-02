/**
 * Tail latency diagnostic — production READ-only, slow ramp to 500 CCU.
 */
import { assertSafeToRun } from '../lib/safety.js';
import { slowRampStages } from '../lib/diagnostics.js';
import { runMixedIteration } from '../lib/actions.js';
import { loadFixtures } from '../lib/auth.js';

assertSafeToRun({ write: false });

const fixtures = loadFixtures();
if (!fixtures.tokens.length) {
  throw new Error('[LOADTEST] Diagnostic abort: token yok');
}
console.log(`[LOADTEST] diagnostic tokens=${fixtures.tokens.length}`);

export const options = {
  noConnectionReuse: false,
  noVUConnectionReuse: false,
  batch: 10,
  batchPerHost: 6,
  scenarios: {
    default: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: slowRampStages(),
      gracefulRampDown: '20s',
    },
  },
  thresholds: {},
  summaryTrendStats: [
    'avg',
    'min',
    'med',
    'p(90)',
    'p(95)',
    'p(99)',
    'max',
    'count',
  ],
};

export default function () {
  runMixedIteration();
}
