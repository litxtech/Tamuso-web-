import * as jose from 'npm:jose@5';

export type MagazaOrtami = 'production' | 'sandbox';

export type DogrulanmisIslem = {
  store: 'apple' | 'google';
  providerTxId: string;
  originalTxId: string | null;
  productId: string;
  environment: MagazaOrtami;
  purchasedAt: string | null;
};

export class MagazaDogrulamaHatasi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const APPLE_PROD = 'https://api.storekit.itunes.apple.com';
const APPLE_SANDBOX = 'https://api.storekit-sandbox.itunes.apple.com';

function ortam(name: string): string {
  const v = Deno.env.get(name);
  if (!v || !v.trim()) {
    throw new MagazaDogrulamaHatasi(`${name} tanımlı değil`, 503);
  }
  return v.trim();
}

async function appleJwt(): Promise<string> {
  const issuer = ortam('APPLE_IAP_ISSUER_ID');
  const keyId = ortam('APPLE_IAP_KEY_ID');
  const bundleId = ortam('APPLE_BUNDLE_ID');
  const pem = ortam('APPLE_IAP_PRIVATE_KEY').replace(/\\n/g, '\n');
  const key = await jose.importPKCS8(pem, 'ES256');
  return await new jose.SignJWT({ bid: bundleId })
    .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('appstoreconnect-v1')
    .sign(key);
}

type AppleIslem = {
  transactionId?: string;
  originalTransactionId?: string;
  bundleId?: string;
  productId?: string;
  purchaseDate?: number;
  type?: string;
  environment?: string;
  revocationDate?: number;
};

async function appleIslemGetir(base: string, jwt: string, transactionId: string): Promise<AppleIslem | null> {
  const res = await fetch(`${base}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (res.status === 404) return null;
  if (res.status === 401) throw new MagazaDogrulamaHatasi('Apple API kimlik doğrulaması reddedildi', 503);
  if (!res.ok) throw new MagazaDogrulamaHatasi(`Apple API hatası (${res.status})`, 502);
  const body = (await res.json()) as { signedTransactionInfo?: string };
  if (!body.signedTransactionInfo) throw new MagazaDogrulamaHatasi('Apple yanıtı eksik', 502);
  // Yanıt TLS üzerinden doğrudan Apple'dan geldiği için JWS yükü güvenilir kaynaktır.
  return jose.decodeJwt(body.signedTransactionInfo) as AppleIslem;
}

export async function appleIslemDogrula(transactionId: string, beklenenUrun: string): Promise<DogrulanmisIslem> {
  if (!/^\d{1,32}$/.test(transactionId)) {
    throw new MagazaDogrulamaHatasi('Geçersiz Apple işlem kimliği', 400);
  }
  const bundleId = ortam('APPLE_BUNDLE_ID');
  const jwt = await appleJwt();

  let tx = await appleIslemGetir(APPLE_PROD, jwt, transactionId);
  if (!tx) tx = await appleIslemGetir(APPLE_SANDBOX, jwt, transactionId);
  if (!tx) throw new MagazaDogrulamaHatasi('Apple işlemi bulunamadı', 404);

  if (tx.bundleId !== bundleId) throw new MagazaDogrulamaHatasi('Bundle uyuşmuyor', 400);
  if (tx.productId !== beklenenUrun) throw new MagazaDogrulamaHatasi('Ürün uyuşmuyor', 400);
  if (tx.type && tx.type !== 'Consumable') throw new MagazaDogrulamaHatasi('Ürün türü uyuşmuyor', 400);
  if (tx.revocationDate) throw new MagazaDogrulamaHatasi('İşlem iade edilmiş', 409);
  if (!tx.transactionId) throw new MagazaDogrulamaHatasi('Apple işlem kimliği eksik', 502);

  return {
    store: 'apple',
    providerTxId: tx.transactionId,
    originalTxId: tx.originalTransactionId ?? null,
    productId: tx.productId,
    environment: tx.environment === 'Sandbox' ? 'sandbox' : 'production',
    purchasedAt: tx.purchaseDate ? new Date(tx.purchaseDate).toISOString() : null,
  };
}

type ServisHesabi = { client_email: string; private_key: string };

async function googleErisimTokeni(): Promise<string> {
  const sa = JSON.parse(ortam('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')) as ServisHesabi;
  const key = await jose.importPKCS8(sa.private_key, 'RS256');
  const assertion = await new jose.SignJWT({ scope: 'https://www.googleapis.com/auth/androidpublisher' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) throw new MagazaDogrulamaHatasi('Google erişim tokeni alınamadı', 503);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new MagazaDogrulamaHatasi('Google erişim tokeni eksik', 503);
  return body.access_token;
}

type GoogleSatinAlma = {
  purchaseState?: number;
  orderId?: string;
  purchaseType?: number;
  purchaseTimeMillis?: string;
};

export async function googleIslemDogrula(purchaseToken: string, urunId: string): Promise<DogrulanmisIslem> {
  if (purchaseToken.length < 10 || purchaseToken.length > 4096) {
    throw new MagazaDogrulamaHatasi('Geçersiz Google satın alma tokeni', 400);
  }
  const paket = ortam('GOOGLE_PLAY_PACKAGE_NAME');
  const token = await googleErisimTokeni();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(paket)}` +
    `/purchases/products/${encodeURIComponent(urunId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404 || res.status === 410) throw new MagazaDogrulamaHatasi('Google satın alması bulunamadı', 404);
  if (!res.ok) throw new MagazaDogrulamaHatasi(`Google API hatası (${res.status})`, 502);
  const p = (await res.json()) as GoogleSatinAlma;
  if (p.purchaseState !== 0) throw new MagazaDogrulamaHatasi('Google satın alması tamamlanmamış', 409);

  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(purchaseToken));
  const tokenHash = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    store: 'google',
    providerTxId: p.orderId || `token_${tokenHash}`,
    originalTxId: null,
    productId: urunId,
    environment: p.purchaseType === 0 ? 'sandbox' : 'production',
    purchasedAt: p.purchaseTimeMillis ? new Date(Number(p.purchaseTimeMillis)).toISOString() : null,
  };
}
