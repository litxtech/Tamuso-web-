# SUPABASE_FREE_BASELINE_2026-09-23

**Immutable Free-tier baseline.** Do not overwrite, delete, or re-run into this folder.

Future compute upgrades must use a **new** `LOADTEST_RUN_ID` under `results/runs/` and compare against this baseline with the **same** scenario, traffic weights, think-time, hold/ramp, and thresholds.

## Locked parameters (birebir karşılaştırma)

| Parametre | Değer |
|---|---|
| Project | Tamuso `vdkqrqtrftzhbtquzked` |
| Plan (at capture) | Supabase Free (assumed / labeled) |
| Mode | Production READ-only (`LOADTEST_ALLOW_PROD_READ=1`) |
| Scenario | `scenarios/10_mixed_real_user_test.js` (mixed) |
| Think-time | `LOADTEST_THINK_MIN=2` … `LOADTEST_THINK_MAX=5` (action overrides may use 2–8s ranges in `actions.js`) |
| Hold | `LOADTEST_HOLD_SEC=180` |
| Ramp | `LOADTEST_RAMP_SEC=45` (ladder); diagnostic used stepped ramp |
| Soft thresholds (orchestrator health) | error &lt; 1%, p95 &lt; 800ms, p99 &lt; 1500ms |
| k6 THRESHOLDS (reference) | p50&lt;300, p95&lt;800, p99&lt;1500, fail rate&lt;1% |
| Circuit breaker | p95&gt;5000ms OR fail&gt;10% OR 5xx&gt;5% |
| Traffic weights | home 30, status 20, profile 15, messages 10, leaderboard 10, follow 5, notifications 5, other 5 |

## Captured artifacts (copies; originals also remain under `load-tests/results/`)

- Ladder: CCU 100 + 500 only (stopped at 500 on p99 gate)
- Tail diagnostic: slow ramp to 500
- Reports: `TAMUSO_LOAD_TEST_REPORT.md`, `TAMUSO_TAIL_LATENCY_RCA.md`
- See `manifest.json` for file list and key metrics

## How to run a comparable future test (do not overwrite this baseline)

```bash
cd load-tests
set LOADTEST_RUN_ID=SUPABASE_<TIER>_AFTER_UPGRADE_YYYY-MM-DD
set LOADTEST_ALLOW_PROD_READ=1
set LOADTEST_ENV=production
set LOADTEST_THINK_MIN=2
set LOADTEST_THINK_MAX=5
set LOADTEST_HOLD_SEC=180
set LOADTEST_RAMP_SEC=45
npm run load:prod-read
```

Results land in `results/runs/<LOADTEST_RUN_ID>/` — never in `baselines/`.
