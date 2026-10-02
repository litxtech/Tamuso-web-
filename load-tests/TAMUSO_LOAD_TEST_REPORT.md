# TAMUSO LOAD TEST REPORT — Production READ-ONLY

## Ortam
- Project: Tamuso `vdkqrqtrftzhbtquzked`
- Mode: READ-ONLY (RPC mutating yasak listesi uygulandı)
- Tokens: existing `is_sample` users only

## Zaman aralıkları
- CCU 100: 2026-09-23T16:12:19.841Z → 2026-09-23T16:16:09.019Z | gen_mem% 67.3
- CCU 500: 2026-09-23T16:16:55.758Z → 2026-09-23T16:20:57.113Z | gen_mem% 67.4

## Tablo
CCU | RPS | p50 | p90 | p95 | p99 | Max | Error % | 429 | 5xx
100 | 39.13 | 78.66 | 89.67 | 95.06 | 127.51 | 1171.81 | 0 | 0 | 0
500 | 166.02 | 76.39 | 94.51 | 277.69 | 22960.25 | 31566.96 | 0 | 0 | 0
1000 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A
2500 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A
5000 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A
7500 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A
10000 | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A


İLK PERFORMANS BOZULMASI: 500
BREAKING POINT: 500
EN YÜKSEK SAĞLIKLI TEST EDİLEN CCU: 100
STOP REASON: unhealthy_for_escalation: p99 22960.253354000022ms >= 1500ms
EN YAVAŞ 10 RPC/OPERATION:
  1. [CCU 500] rpc:durum_akisi_takip p95=799.19 p99=26068.81 count=1992 err%=0
  2. [CCU 500] rpc:durum_akisi p95=633.27 p99=24913.08 count=2248 err%=0
  3. [CCU 500] profile:get p95=613.53 p99=25964.77 count=3113 err%=0
  4. [CCU 500] home:rooms p95=339.68 p99=24687.85 count=6258 err%=0
  5. [CCU 500] rpc:mesaj_konularini_getir p95=339.01 p99=25198.8 count=2139 err%=0
  6. [CCU 500] rpc:liderlik_siralamasi_listele p95=317.96 p99=24281.18 count=2075 err%=0
  7. [CCU 500] rpc:takipcileri_listele p95=281.69 p99=25447.66 count=1044 err%=0
  8. [CCU 500] home:live_sessions p95=276.43 p99=24798.14 count=6258 err%=0
  9. [CCU 500] room:live_list p95=261.57 p99=25772.41 count=1065 err%=0
  10. [CCU 500] profile:stats p95=246.75 p99=1934.96 count=3113 err%=0
EN FAZLA HATA VEREN OPERATION: N/A
429 BAŞLADIĞI CCU: N/A
5xx BAŞLADIĞI CCU: N/A
TEST GENERATOR DURUMU: belirgin generator bottleneck yok (cpu/mem eşiği)
  gen@CCU100: cpu%=0 mem%=67.3
  gen@CCU500: cpu%=0 mem%=67.4
SUPABASE CPU: N/A
SUPABASE RAM: N/A
DB CONNECTIONS: N/A
DISK IO: N/A

## Detay JSON
`results/load-test-final.json`
