# Tamuso Finance Control Center — Final Report

Date: 2026-10-06  
Project: Tamuso (`vdkqrqtrftzhbtquzked`)

## 1. Created screens

Route tree under `app/admin/finance/`:

- Overview / Command Center — `index.tsx`
- Coin Economy — `coin-economy.tsx`
- Sales — `sales.tsx`
- Users list / detail — `users/index.tsx`, `users/[id].tsx`
- Agencies list / detail — `agencies/index.tsx`, `agencies/[id].tsx`
- Creators — `creators.tsx`
- Revenue — `revenue.tsx`
- Expenses — `expenses.tsx`
- Liabilities — `liabilities.tsx`
- P&L — `pnl.tsx`
- Forecast — `forecast.tsx`
- Simulator — `simulator.tsx`
- Reconciliation — `reconciliation.tsx`
- Transactions — `transactions.tsx`
- Alerts — `alerts.tsx`
- Reports list / job — `reports/index.tsx`, `reports/[jobId].tsx`

Admin catalog: **Finans Merkezi → Finance Control Center** (`AdminModulKatalogu.ts`).

Existing ops screens kept: `/admin/ciro`, `/admin/finans`, `/admin/ekonomi`.

## 2. Created tables

- `finance_admin_roles`
- `finance_audit_logs`
- `finance_settings`
- `finance_expenses`
- `finance_daily_snapshots`
- `finance_hourly_snapshots`
- `finance_live_events`
- `finance_alerts`
- `finance_report_jobs`
- `finance_report_snapshots`
- `finance_reconciliation_runs`
- `finance_reconciliation_items`
- `finance_forecast_snapshots`
- `finance_snapshot_state`

## 3. Reused existing tables

- `wallets`, `wallet_ledger`
- `host_earnings`, `host_earnings_ledger`
- `agency_wallets`, `agency_wallet_ledger`, `agency_earnings_ledger`
- `coin_purchases`, `coin_packages`, `payment_orders`
- `gift_transactions`
- `withdrawal_requests`
- `purchase_disputes`
- `platform_economy_config`, `agency_commission_rates`
- `agencies`, `host_profiles`, `profiles`
- `finance_idempotency_keys` (pre-existing)
- `reconciliation_runs` (pre-existing; new finance recon is separate)

**No duplicate wallet/ledger write path.**

## 4. Migrations

Local files:

- `supabase/migrations/20261006090211_finance_control_center.sql`
- `supabase/migrations/20261006090306_finance_control_center_rpcs.sql`

Applied remotely as:

- `finance_control_center_tables`
- `finance_control_center_helpers`
- `finance_control_center_rpcs_core`
- `finance_control_center_rpcs_users`
- `finance_control_center_rpcs_ops`

Plus hotfixes: finance gate for service_role/SQL console, reconcile `run_id` uniqueness, `admin_finance_user_profile` timeline alias.

## 5. RPC / Edge Functions

**New RPCs (29):**  
`admin_finance_overview`, `coin_economy`, `liabilities`, `forecast`, `pnl`, `transactions`, `revenue`, `sales`, `users`, `user_profile`, `agencies`, `agency_detail`, `creators`, `expenses_list`, `expense_upsert`, `settings_get`, `settings_update`, `simulate`, `alerts_list`, `alert_ack`, `anomaly_scan`, `reconcile_run`, `search`, `report_create`, `report_list`, `report_get`, `report_attach_storage`, `report_signed_url_audit`, `role_ayarla`

**Helpers:** `finance_yetkisi_var_mi`, `finance_rolum`, `finance_rates`, `finance_snapshot_yenile`, `finance_audit_yaz`, period helpers, live-event triggers.

**Edge Functions:** none new (reuse existing IAP/Stripe write path).

## 6. Realtime

- `finance_live_events` + `finance_hourly_snapshots` added to `supabase_realtime` publication
- Overview screen subscribes to INSERT on `finance_live_events` and refreshes via `admin_finance_overview` (no full-table client scan)
- Purchase/gift triggers mark snapshot dirty + insert live events

## 7. Ledger system

- Source of truth: existing ledgers
- Hard immutability: BEFORE UPDATE/DELETE triggers on `wallet_ledger`, `host_earnings_ledger`, `agency_earnings_ledger`, `agency_wallet_ledger`
- Corrections: compensating entries only (`cuzdan_ters_kayit` / new rows)
- **Verified:** UPDATE on `wallet_ledger` raises `Immutable ledger...`

## 8. P&L calculation

Operational (not tax):

- Gross sales from completed `coin_purchases` (TRY via `ciro_try_hesapla`)
- Minus refunds/chargebacks (purchase status)
- Minus estimated store fees (`iap_store_fee_estimate` / finance_settings)
- Minus `finance_expenses`
- Creator/agency payable shown separately from host/agency diamond balances × `diamond_try`
- Month-end estimate = MTD run-rate extrapolation, labeled **TAHMİN**

## 9. Liability calculation

- Creator payable = Σ `host_earnings.diamonds` × `diamond_try`
- Agency payable = Σ `agency_wallets.diamonds` × `diamond_try`
- Pending withdrawals = open `withdrawal_requests.diamonds` × `diamond_try`
- Pending refunds = open `purchase_disputes` TRY snapshots
- Other = pending `finance_expenses`
- Coin supply is **not** treated as cash liability (separate Coin Economy metric)

## 10. Forecast

- `admin_finance_forecast` + `finance_forecast_snapshots`
- Explicit `badge: TAHMİN` / `is_estimate: true`
- Current payable vs estimated month-end separated

## 11. PDF system

- Report job creates immutable JSON snapshot (`finance_report_jobs` + `finance_report_snapshots`)
- Client: `FinanceBelgesiOlustur` → `BelgeHtmlSablonOlustur` → `PdfDosyasiOlustur`
- Upload to private bucket `finance-reports`
- Attach path via `admin_finance_report_attach_storage`
- 14 report type cards in Reports UI

## 12. WhatsApp share

- Reuses `BelgePaylasimPaneli` / `WhatsAppBelgeGonder` / native share sheet
- Secure link = short-lived signed URL (TTL 600s) after private upload
- **Device WhatsApp open:** TEST EDİLEMEDİ (no physical device session in this run)

## 13. Print

- Reuses `BelgeYazdir` (`expo-print`)
- **Physical printer:** TEST EDİLEMEDİ

## 14. RBAC

- Roles table: `finance_admin_roles`
- `profiles.is_admin` → `SUPER_ADMIN` via `finance_rolum()`
- Roles: SUPER_ADMIN, FINANCE_ADMIN, AGENCY_ADMIN, SUPPORT_ADMIN, AUDITOR, READ_ONLY_FINANCE
- Write ops require FINANCE_ADMIN+; role assign requires SUPER_ADMIN
- Legacy screens still use `ben_admin_miyim()` / `is_admin`

## 15. RLS

- RLS enabled on all new `finance_*` tables
- Policies gate on `finance_yetkisi_var_mi(...)`
- Storage bucket `finance-reports` private + select/insert/update policies for finance roles

## 16. Audit log

- `finance_audit_logs` + `finance_audit_yaz`
- Logged: expense upsert, settings update, alert ack, reconcile, report create/view/signed URL/PDF attach, role set
- Verified: audit rows created during acceptance (`audits >= 6`)

## 17. Reconciliation

- `admin_finance_reconcile_run(source, external_amount, period)`
- Sources: `wallet_ledger`, `apple`, `google`, `stripe`, summary vs ledger
- External store amounts are **manual** (no Apple/Google API pull)
- Wallet↔ledger mismatch creates `LEDGER_BALANCE_MISMATCH` alert
- Acceptance: status `review_required`, unmatched users **25**

## 18. Test results

| Test | Result |
|---|---|
| 1 Coin load → sales KPI | PARTIAL — overview/sales RPCs work on real `coin_purchases`; today sales `0.00` at test time; admin coin adjust path not exerciseed end-to-end in this session (requires authenticated admin JWT for `admin_kullanici_coin_isle`) |
| 2 Coin spend → balance/ledger/dashboard | TEST EDİLEMEDİ (no gift/spend transaction executed in this session) |
| 3 Gift → creator/agency/platform | TEST EDİLEMEDİ (no gift send in session); liability RPCs read live diamond balances PASS |
| 4 Refund | TEST EDİLEMEDİ (no refund/chargeback created) |
| 5 Agency finance detail | PASS (`admin_finance_agencies` returned 3) |
| 6 User coin history | PASS — profile timeline 3 rows; reconciliation **MATCHED** (1090/1090) |
| 7 Period filter | PASS (sales/revenue period bounds RPC) |
| 8 PDF layout | PARTIAL — report payload + Belge HTML path wired (`FIN-2026-000003`); visual PDF page overflow not rendered on device |
| 9 PDF private | PASS — bucket `finance-reports` `public=false` + RLS; signed URL flow coded |
| 10 WhatsApp share | TEST EDİLEMEDİ (device) |
| 11 Print | TEST EDİLEMEDİ (device) |
| 12 Ledger vs dashboard | PASS for overview/sales sourced from purchases/ledgers |
| 13 Wallet vs ledger mismatch detection | PASS — reconcile found 25 mismatches + alert |
| 14 Duplicate transaction prevention | TEST EDİLEMEDİ for new purchase; existing `finance_idempotency_keys` / purchase idempotency unchanged |

Additional PASS:

- `admin_finance_overview` ok
- `admin_finance_coin_economy` ok
- `admin_finance_simulate(1_000_000)` / `5_000_000` ok
- `admin_finance_forecast` badge `TAHMİN`
- Expense upsert ok
- Ledger immutability enforced
- Snapshot refresh ok

## 19. Found issues

1. One wallet has extreme balance `~9.99e16` coins → distorts USER COIN SUPPLY totals (data quality / prior ops issue, not introduced by FCC UI math).
2. 25 wallet↔ledger mismatches already in production data (surfaced by recon).
3. Initial `admin_finance_user_profile` failed on `order by t.created_at` after aliasing column as `timestamp` — fixed to `ts`.
4. Reconcile `run_id` second-precision collision — fixed with UUID suffix.
5. JS number precision risk for huge bigint coin supplies when jsonb→number.

## 20. Fixed issues

- Finance gate for SQL console / service_role (ops testing)
- User profile timeline SQL alias
- Reconcile run_id uniqueness
- Overview `EkranBasligi` prop (`title` not `baslik`)
- FinanceBelgesi export on belge public surface

## 21. Unresolved

- Physical WhatsApp / Print / native PDF visual QA on device
- Real IAP/Stripe refund & chargeback end-to-end
- Auto-fetch Apple/Google settlement files (by design: manual external amount)
- Cleanup of anomalous mega-wallet balance (ops decision)
- Resolving 25 historical ledger mismatches (needs dedicated ops pass; alerts only, no silent rewrite)
- Fine-grained UI permission filtering beyond binary `is_admin` on existing admin hub (catalog has `permissionKey` but finance screens still gate with `AdminYetkisiVarMi` / `is_admin`)

---

**Bottom line:** Finance Control Center is live as server-authoritative control plane on top of existing Tamuso ledgers. Client is display-only. Production data anomalies (mega wallet + mismatches) are now visible instead of hidden.
