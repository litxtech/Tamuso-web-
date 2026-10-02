import { stagesForCcu } from '../config/stages.js';
import { THRESHOLDS } from '../config/thresholds.js';
import { assertSafeToRun } from '../lib/safety.js';

export function makeOptions(opts = {}) {
  const safety = assertSafeToRun({ write: !!opts.write });
  const ccu = Number(__ENV.LOADTEST_CCU || opts.ccu || 100);
  const soft = __ENV.LOADTEST_SOFT_THRESHOLDS === '1';
  return {
    safety,
    options: {
      scenarios: {
        default: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: stagesForCcu(ccu),
          gracefulRampDown: '20s',
        },
      },
      thresholds: soft ? {} : opts.thresholds || THRESHOLDS,
      summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
    },
    ccu,
  };
}
