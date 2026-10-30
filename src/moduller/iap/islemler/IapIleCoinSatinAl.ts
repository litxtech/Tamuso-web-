import i18n from '../../../i18n';
import { Platform } from 'react-native';
import { FinansIdempotencyAnahtariOlustur } from '../../cuzdan/islemler/FinansIdempotencyAnahtariOlustur';
import { KillSwitchAktifMiSunucu } from '../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import type { CoinPackage } from '../../../types/models';
import { IapReceiptDogrula } from '../dogrulama/IapReceiptDogrula';
import { IapUrunId } from '../IapUrunId';
import {
  IapBaglantisiniAc,
  IapOrtamUygunMu,
  IapTxnIsle,
  IapTxnIslendiMi,
} from '../oturum/IapOturum';
import { MagazaSkuCacheteMi } from '../../cuzdan/katalog/MagazaFiyatlariniYukle';

export type IapSatinAlSonuc =
  | { ok: true; coinsAdded: number; mock?: boolean }
  | {
      ok: false;
      hata: string;
      kod?: 'kill_switch' | 'flag' | 'store' | 'verify' | 'cancel';
    };

let satinAlmaKilit = false;

type PurchaseLike = {
  productId?: string;
  transactionId?: string;
  id?: string;
  purchaseToken?: string;
  transactionDate?: number;
};

/**
 * Bitmemiş StoreKit txn kuyruğunu temizle.
 * Bitmemiş consumable varken 2. requestPurchase sheet/side-button
 * göstermeden eski txn'i tekrar basar.
 */
async function bekleyenleriTemizle(
  iap: typeof import('expo-iap'),
  sku: string,
  pkgId: string,
): Promise<boolean> {
  let pending: PurchaseLike[] = [];
  try {
    pending = (await iap.getAvailablePurchases()) as PurchaseLike[];
  } catch {
    return true;
  }
  let temiz = true;
  for (const p of pending ?? []) {
    if (p.productId !== sku) continue;
    const txnId = p.transactionId ?? p.id ?? null;

    if (IapTxnIslendiMi(txnId)) {
      try {
        await iap.finishTransaction({
          purchase: p as never,
          isConsumable: true,
        });
      } catch {
        /* */
      }
      continue;
    }

    // Ödemesi alınmış ama coin'i yazılmamış işlem kapatılırsa kullanıcı kaybeder:
    // yalnızca sunucu onaylarsa veya kesin reddederse kapat.
    const sonuc = await IapReceiptDogrula({
      packageId: pkgId,
      store: Platform.OS === 'ios' ? 'apple' : 'google',
      productId: sku,
      transactionId: txnId ?? undefined,
      purchaseToken: p.purchaseToken ?? undefined,
      idempotencyKey: FinansIdempotencyAnahtariOlustur('coin_purchase_drain'),
    });
    if (!sonuc.ok && !sonuc.kesin) {
      temiz = false;
      continue;
    }
    try {
      await iap.finishTransaction({
        purchase: p as never,
        isConsumable: true,
      });
    } catch {
      /* */
    }
    if (txnId) IapTxnIsle(txnId);
  }
  return temiz;
}

/**
 * Native IAP (StoreKit / Play Billing).
 * - Kalıcı bağlantı (IapOturum)
 * - requestPurchase ÖNCESİ pending drain (2. alımda side-button atlama)
 * - transactionId dedupe
 */
export async function IapIleCoinSatinAl(
  pkg: CoinPackage,
): Promise<IapSatinAlSonuc> {
  if (await KillSwitchAktifMiSunucu('kill_coin_purchase')) {
    return {
      ok: false,
      hata: i18n.t('cuzdanX.coinSatinAlmaKapali'),
      kod: 'kill_switch',
    };
  }
  if (!(await OzellikBayragiAktifMiSunucu('iap_enabled'))) {
    return { ok: false, hata: i18n.t('cuzdanX.iapKapaliFlag'), kod: 'flag' };
  }
  if (!IapOrtamUygunMu()) {
    return {
      ok: false,
      hata: i18n.t('cuzdanX.coinExpoGo'),
      kod: 'store',
    };
  }
  if (satinAlmaKilit) {
    return {
      ok: false,
      hata: i18n.t('cuzdanX.satinAlma'),
      kod: 'store',
    };
  }

  const sku = IapUrunId(pkg);
  if (!sku) {
    return { ok: false, hata: i18n.t('cuzdanY.storeUrunuYok', { sku: '?' }), kod: 'store' };
  }

  let iap: typeof import('expo-iap');
  try {
    iap = await IapBaglantisiniAc();
  } catch (e) {
    return {
      ok: false,
      hata:
        e instanceof Error
          ? e.message
          : i18n.t('cuzdanX.storeBaglantisiYokNative'),
      kod: 'store',
    };
  }

  const {
    fetchProducts,
    finishTransaction,
    purchaseErrorListener,
    purchaseUpdatedListener,
    requestPurchase,
  } = iap;

  const idempotencyKey = FinansIdempotencyAnahtariOlustur('coin_purchase');

  satinAlmaKilit = true;

  return new Promise((resolve) => {
    let settled = false;
    /** requestPurchase çağrılana kadar false — eski pending'i yutma */
    let purchaseArmed = false;
    const armedAt = { ms: 0 };

    const done = (r: IapSatinAlSonuc) => {
      if (settled) return;
      settled = true;
      purchaseArmed = false;
      satinAlmaKilit = false;
      try {
        subUpdate.remove();
      } catch {
        /* */
      }
      try {
        subErr.remove();
      } catch {
        /* */
      }
      // endConnection YOK — oturum açık kalsın
      resolve(r);
    };

    const subUpdate = purchaseUpdatedListener(async (purchase) => {
      try {
        const productId = purchase.productId;
        if (productId !== sku) return;

        const txnId =
          purchase.transactionId ??
          (purchase as { id?: string }).id ??
          null;

        // 1) Zaten işledik → finish et (kuyruk temizlensin)
        if (IapTxnIslendiMi(txnId)) {
          try {
            await finishTransaction({ purchase, isConsumable: true });
          } catch {
            /* */
          }
          return;
        }

        // 2) requestPurchase öncesi replay — verify, onaylanırsa finish; promise'i çözme
        if (!purchaseArmed) {
          const onceki = await IapReceiptDogrula({
            packageId: pkg.id,
            store: Platform.OS === 'ios' ? 'apple' : 'google',
            productId,
            transactionId: txnId ?? undefined,
            purchaseToken: purchase.purchaseToken ?? undefined,
            idempotencyKey: FinansIdempotencyAnahtariOlustur(
              'coin_purchase_drain',
            ),
          });
          if (!onceki.ok && !onceki.kesin) return;
          try {
            await finishTransaction({ purchase, isConsumable: true });
          } catch {
            /* */
          }
          if (txnId) IapTxnIsle(txnId);
          return;
        }

        // 3) Çok eski txn (armed'dan önce) — Apple bazen eskiyi tekrar basar; sunucu idempotent
        const txnMs = Number(
          (purchase as { transactionDate?: number }).transactionDate ?? 0,
        );
        if (txnMs > 0 && armedAt.ms > 0 && txnMs + 2000 < armedAt.ms) {
          const eski = await IapReceiptDogrula({
            packageId: pkg.id,
            store: Platform.OS === 'ios' ? 'apple' : 'google',
            productId,
            transactionId: txnId ?? undefined,
            purchaseToken: purchase.purchaseToken ?? undefined,
            idempotencyKey: FinansIdempotencyAnahtariOlustur('coin_purchase_drain'),
          });
          if (!eski.ok && !eski.kesin) return;
          try {
            await finishTransaction({ purchase, isConsumable: true });
          } catch {
            /* */
          }
          if (txnId) IapTxnIsle(txnId);
          return;
        }

        const verify = await IapReceiptDogrula({
          packageId: pkg.id,
          store: Platform.OS === 'ios' ? 'apple' : 'google',
          productId,
          transactionId: txnId ?? undefined,
          purchaseToken: purchase.purchaseToken ?? undefined,
          idempotencyKey,
        });

        if (!verify.ok && !verify.kesin) {
          // İşlem açık kalır; mağaza bir sonraki açılışta yeniden iletir ve tekrar doğrulanır.
          done({ ok: false, hata: i18n.t('cuzdanY.satinAlmaDogrulamaBekliyor'), kod: 'verify' });
          return;
        }

        try {
          await finishTransaction({ purchase, isConsumable: true });
        } catch {
          /* finish başarısız olsa da verify OK ise coin yazılmış olabilir */
        }

        if (txnId) IapTxnIsle(txnId);

        if (!verify.ok) {
          done({ ok: false, hata: verify.hata, kod: 'verify' });
          return;
        }
        done({ ok: true, coinsAdded: verify.coinsAdded });
      } catch (e) {
        done({
          ok: false,
          hata:
            e instanceof Error
              ? e.message
              : i18n.t('cuzdanY.satinAlmaIslenemedi'),
          kod: 'verify',
        });
      }
    });

    const subErr = purchaseErrorListener((err) => {
      if (!purchaseArmed) return;
      const msg = err?.message ?? i18n.t('cuzdanY.satinAlmaIptalHata');
      const cancel = /cancel|user.?cancel/i.test(msg);
      done({ ok: false, hata: msg, kod: cancel ? 'cancel' : 'store' });
    });

    void (async () => {
      try {
        // Önce bitmemiş txn'leri temizle — aksi halde 2. alım sheet atlar
        const temiz = await bekleyenleriTemizle(iap, sku, pkg.id);
        if (!temiz) {
          done({ ok: false, hata: i18n.t('cuzdanY.satinAlmaDogrulamaBekliyor'), kod: 'verify' });
          return;
        }

        // Fiyat cache'te varsa ürün zaten biliniyor — ekstra fetchProducts gecikmesi yok
        if (!MagazaSkuCacheteMi(sku)) {
          const products = await fetchProducts({ skus: [sku], type: 'in-app' });
          if (!products?.length) {
            done({
              ok: false,
              hata: i18n.t('cuzdanY.storeUrunuYok', { sku }),
              kod: 'store',
            });
            return;
          }
        }

        purchaseArmed = true;
        armedAt.ms = Date.now();

        await requestPurchase({
          request: {
            apple: { sku },
            google: { skus: [sku] },
          },
          type: 'in-app',
        });
      } catch (e) {
        done({
          ok: false,
          hata:
            e instanceof Error
              ? e.message
              : i18n.t('cuzdanX.satinAlmaIstekBasarisiz'),
          kod: 'store',
        });
      }
    })();
  });
}
