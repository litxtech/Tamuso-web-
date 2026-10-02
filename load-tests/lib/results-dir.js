/**
 * Run-scoped results directory.
 * Baselines are immutable; new runs NEVER write into baselines/.
 *
 * Env:
 *   LOADTEST_RUN_ID   — optional explicit id (e.g. SUPABASE_PRO_AFTER_UPGRADE_2026-10-01)
 *   LOADTEST_RUN_LABEL — optional label prefix (default: run)
 *
 * Output: load-tests/results/runs/<RUN_ID>/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

export const BASELINE_ID = 'SUPABASE_FREE_BASELINE_2026-09-23';
export const BASELINES_DIR = path.join(root, 'baselines');
export const BASELINE_DIR = path.join(BASELINES_DIR, BASELINE_ID);
export const RUNS_DIR = path.join(root, 'results', 'runs');

export function makeRunId(label) {
  if (process.env.LOADTEST_RUN_ID && String(process.env.LOADTEST_RUN_ID).trim()) {
    return String(process.env.LOADTEST_RUN_ID).trim().replace(/[^\w.\-]+/g, '_');
  }
  const prefix = (label || process.env.LOADTEST_RUN_LABEL || 'run')
    .trim()
    .replace(/[^\w.\-]+/g, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${stamp}`;
}

/** Resolve writable results dir for a new run (creates folder). */
export function resolveRunResultsDir(opts = {}) {
  const runId = makeRunId(opts.label);
  if (runId === BASELINE_ID || runId.startsWith('SUPABASE_FREE_BASELINE')) {
    throw new Error(
      `[LOADTEST] Refusing to write into baseline id "${runId}". Set a different LOADTEST_RUN_ID.`,
    );
  }
  const dir = path.join(RUNS_DIR, runId);
  if (dir.includes(`${path.sep}baselines${path.sep}`)) {
    throw new Error('[LOADTEST] Refusing to write under baselines/');
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'run-meta.json'),
    JSON.stringify(
      {
        run_id: runId,
        compare_against_baseline: BASELINE_ID,
        started_at: new Date().toISOString(),
        label: opts.label || process.env.LOADTEST_RUN_LABEL || null,
        note: 'Do not overwrite baselines; each run is isolated under results/runs/',
      },
      null,
      2,
    ),
  );
  return { runId, dir, baselineId: BASELINE_ID };
}
