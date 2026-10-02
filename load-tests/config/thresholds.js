/** Başlangıç değerlendirme eşikleri (ürün garantisi değil). */
export const THRESHOLDS = {
  http_req_duration: [
    'p(50)<300',
    'p(95)<800',
    'p(99)<1500',
  ],
  http_req_failed: ['rate<0.01'],
};

/** Circuit breaker — aşılırsa bir sonraki CCU'ya çıkma (run orchestrator). */
export const CIRCUIT = {
  p95Ms: Number(__ENV.LOADTEST_ABORT_P95_MS || 5000),
  failRate: Number(__ENV.LOADTEST_ABORT_FAIL_RATE || 0.1),
  fiveXxRate: Number(__ENV.LOADTEST_ABORT_5XX_RATE || 0.05),
};
