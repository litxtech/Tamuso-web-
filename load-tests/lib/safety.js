/**
 * Production / staging güvenlik kapısı.
 * Write stress production'da ASLA açılmaz.
 */

const PROD_REFS = ['vdkqrqtrftzhbtquzked'];

export function assertSafeToRun(options = {}) {
  const url = String(__ENV.LOADTEST_SUPABASE_URL || '').trim();
  const envLabel = String(__ENV.LOADTEST_ENV || '').toLowerCase();
  const allowProdRead = __ENV.LOADTEST_ALLOW_PROD_READ === '1';
  const allowWrite = __ENV.LOADTEST_ALLOW_WRITE === '1';
  const wantsWrite = !!options.write;

  if (!url) {
    throw new Error(
      '[LOADTEST] LOADTEST_SUPABASE_URL eksik. load-tests/.env veya ortam değişkeni ayarla.',
    );
  }

  const isProdRef = PROD_REFS.some((r) => url.includes(r));
  const labeledProd = envLabel === 'production' || envLabel === 'prod';
  const isProd = isProdRef || labeledProd;

  if (isProd && wantsWrite) {
    throw new Error(
      '[LOADTEST] PRODUCTION üzerinde WRITE stress YASAK. Staging project kullanın.',
    );
  }

  if (isProd && !allowProdRead) {
    throw new Error(
      [
        '[LOADTEST] Hedef PRODUCTION görünüyor:',
        `  URL: ${url}`,
        '  Orgda ayrı staging project bulunamadı (yalnızca Tamuso / vdkqrqtrftzhbtquzked).',
        '',
        '  Kontrollü READ smoke için açık onay gerekir:',
        '    LOADTEST_ALLOW_PROD_READ=1',
        '',
        '  Yüksek CCU / write / gift / IAP / push ASLA production\'da çalıştırılmamalı.',
        '  Staging Supabase project oluşturup LOADTEST_ENV=staging ile bağlanın.',
      ].join('\n'),
    );
  }

  if (wantsWrite && !allowWrite) {
    throw new Error(
      '[LOADTEST] WRITE için LOADTEST_ALLOW_WRITE=1 ve staging gerekir.',
    );
  }

  return {
    url,
    isProd,
    allowProdRead,
    allowWrite: allowWrite && !isProd,
    mode: wantsWrite ? 'write' : 'read',
  };
}

export function restHeaders(token, anonKey) {
  const h = {
    apikey: anonKey,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}
