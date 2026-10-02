/**
 * Tek StoreKit / Play bağlantısı — her satın alma / fiyat çekiminde
 * init+end yapma (Apple pending txn + yavaş sheet).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

type ExpoIap = typeof import('expo-iap');

let iapMod: ExpoIap | null = null;
let bagli = false;
let baglantiPromise: Promise<ExpoIap> | null = null;
const islenenTxn = new Set<string>();

export function IapOrtamUygunMu(): boolean {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

export function IapTxnIslendiMi(txnId: string | null | undefined): boolean {
  if (!txnId) return false;
  return islenenTxn.has(txnId);
}

export function IapTxnIsle(txnId: string | null | undefined): void {
  if (!txnId) return;
  islenenTxn.add(txnId);
  if (islenenTxn.size > 200) {
    const first = islenenTxn.values().next().value;
    if (first) islenenTxn.delete(first);
  }
}

async function modulAl(): Promise<ExpoIap> {
  if (iapMod) return iapMod;
  iapMod = await import('expo-iap');
  return iapMod;
}

/**
 * Bağlantıyı aç (veya yeniden kullan). endConnection ÇAĞIRMA —
 * fiyat + satın alma aynı oturumu paylaşsın.
 */
export async function IapBaglantisiniAc(): Promise<ExpoIap> {
  if (!IapOrtamUygunMu()) {
    throw new Error('IAP ortamı uygun değil');
  }
  if (bagli && iapMod) return iapMod;
  if (baglantiPromise) return baglantiPromise;

  baglantiPromise = (async () => {
    const iap = await modulAl();
    await iap.initConnection();
    bagli = true;

    // Daha önce işlediğimiz pending'leri finish et — kuyruk şişmesin.
    // Henüz işlemediğimiz txn'ler IapIleCoinSatinAl drain'inde gider.
    try {
      const pending = await iap.getAvailablePurchases();
      for (const p of pending ?? []) {
        const txn =
          (p as { transactionId?: string }).transactionId ??
          (p as { id?: string }).id ??
          null;
        if (!txn || !IapTxnIslendiMi(txn)) continue;
        try {
          await iap.finishTransaction({
            purchase: p,
            isConsumable: true,
          });
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* getAvailablePurchases yok / hata — devam */
    }

    return iap;
  })();

  try {
    return await baglantiPromise;
  } finally {
    baglantiPromise = null;
  }
}

/** Cüzdan / mağaza açılınca arka planda ısıt — sheet gecikmesi azalır */
export function IapBaglantisiniIsit(): void {
  if (!IapOrtamUygunMu()) return;
  void IapBaglantisiniAc().catch(() => undefined);
}

/** Test / logout için — normal akışta çağırma */
export async function IapBaglantisiniKapat(): Promise<void> {
  if (!iapMod || !bagli) return;
  try {
    await iapMod.endConnection();
  } catch {
    /* ignore */
  } finally {
    bagli = false;
  }
}
