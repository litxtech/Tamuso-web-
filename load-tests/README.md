# Tamuso Load Tests (k6)

Supabase altyapısı için **ayrı** load/stress test paketi. Uygulama (`app/`, `src/`) koduna dokunmaz.

## 0) Kritik güvenlik bulgusu

| Madde | Değer |
|-------|--------|
| Org içindeki project sayısı | **1** (`Tamuso` / `vdkqrqtrftzhbtquzked`) |
| `.env` / `.env.test` URL | **Aynı production project** |
| Staging project | **YOK** |
| Immutable Free baseline | `baselines/SUPABASE_FREE_BASELINE_2026-09-23/` |
| Yeni run çıktısı | `results/runs/<LOADTEST_RUN_ID>/` (baseline üzerine yazılmaz) |

Bu yüzden:

- **WRITE / gift / IAP / wallet / push / mesaj gönderimi** production’da **çalıştırılmaz** (kod gate).
- **Yüksek CCU** production’a otomatik basılmaz.
- Production’da yalnızca **kontrollü READ** için açık onay: `LOADTEST_ALLOW_PROD_READ=1`.
- Gerçek kapasite ölçümü için **ayrı staging Supabase project** oluşturman önerilir.
- Compute yükseltmesi sonrası karşılaştırma: aynı scenario / traffic / think-time / thresholds; `LOADTEST_RUN_ID` ile yeni klasör.

## 1) Kurulum

### k6

```powershell
winget install GrafanaLabs.k6
# Yeni terminal aç (PATH)
k6 version
```

### npm (repo zaten npm)

```powershell
cd load-tests
copy .env.example .env
# .env doldur
npm install ws   # realtime harness (repo root'tan da: npm i ws -w yok, load-tests lokal)
```

Repo root’tan:

```powershell
npm install ws --no-save
# veya load-tests/package.json üzerinden
```

Bu klasörde `package.json` var; `cd load-tests && npm install`.

## 2) Environment

`load-tests/.env`:

```env
LOADTEST_SUPABASE_URL=https://xxxx.supabase.co
LOADTEST_SUPABASE_ANON_KEY=...
LOADTEST_ENV=staging   # veya production
# Production READ smoke:
# LOADTEST_ALLOW_PROD_READ=1
LOADTEST_TOKENS_FILE=./fixtures/tokens.json
LOADTEST_CCU=100
LOADTEST_THINK_MIN=2
LOADTEST_THINK_MAX=6
```

## 3) Test kullanıcıları / token

Login flood **yok**. Önceden JWT üret:

```powershell
# Yalnızca STAGING + service role
$env:LOADTEST_SERVICE_ROLE_KEY="..."
$env:LOADTEST_USER_COUNT="50"
node scripts/mint-tokens.mjs
```

Çıktı: `fixtures/tokens.json`  
Email pattern: `loadtest_00001@loadtest.tamuso.local`  
`user_metadata.is_load_test=true`

Production mint varsayılan **kapalı**.

## 4) Senaryolar

| Dosya | Komut anahtarı |
|-------|----------------|
| `01_auth_read_test.js` | `auth` |
| `02_home_feed_test.js` | `home` |
| `03_status_feed_test.js` | `status` |
| `04_profile_test.js` | `profile` |
| `05_messages_read_test.js` | `messages` |
| `06_follow_test.js` | `follow` |
| `07_leaderboard_test.js` | `leaderboard` |
| `08_room_metadata_test.js` | `room` |
| `09_notifications_test.js` | `notifications` |
| `10_mixed_real_user_test.js` | `mixed` |
| `12_peak_stress_test.js` | `peak` |
| `13_staging_write_test.js` | (doğrudan k6 + WRITE flags) |

Realtime (ayrı harness, HTTP ile karıştırma):

```powershell
$env:LOADTEST_RT_CLIENTS="100"
$env:LOADTEST_RT_DURATION_SEC="60"
$env:LOADTEST_ALLOW_PROD_READ="1"   # sadece prod ise
node realtime/harness.mjs
```

## 5) Çalıştırma (repo root npm scripts)

```powershell
# 100 CCU smoke (mixed) — prod ise ALLOW_PROD_READ şart
npm run load:100

npm run load:500
npm run load:1000
npm run load:2500
npm run load:5000
npm run load:7500
npm run load:10000

# Tek senaryo
npm run load:run -- --scenario home --ccu 100

# Ladder + circuit breaker (100→…; bozulursa durur)
npm run load:ladder

# Realtime
npm run load:realtime
```

Doğrudan:

```powershell
cd load-tests
node scripts/run.mjs --scenario mixed --ccu 100
```

## 6) Trafik dağılımı (mixed)

Merkezi: `config/traffic.js`  
Override: `LOADTEST_WEIGHT_HOME=30` vb.

Think-time: `LOADTEST_THINK_MIN` / `MAX` (varsayılan 2–6s).

## 7) Threshold / circuit breaker

- p50&lt;300ms, p95&lt;800ms, p99&lt;1500ms, error&lt;1% (`config/thresholds.js`)
- Ladder abort: p95&gt;5s veya error&gt;10% (`LOADTEST_ABORT_*`)

## 8) Sonuçlar

- `results/*.summary.json` — k6 export
- `results/load-test-results.json` — aggregate
- `results/load-test-summary.csv` — CCU satırları
- `results/realtime-*.json`
- `TAMUSO_LOAD_TEST_REPORT.md` — manuel doldurulacak şablon (ölçüm sonrası)

## 9) Yasaklar

- IAP / Stripe / withdrawal / coin yükleme / wallet transfer / `send_gift` / gerçek push  
- Gerçek kullanıcı hesabı / mesaj  
- `liderlik_siralamasi_yenile` load altında (listele only)

## 10) Supabase Dashboard metrikleri

CPU/RAM/connections otomatik çekilemiyorsa raporda **N/A** yaz; dashboard’dan zaman damgasıyla korele et.
