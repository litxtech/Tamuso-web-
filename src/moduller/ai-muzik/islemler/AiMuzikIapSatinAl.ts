import { Platform } from 'react-native';
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { KillSwitchAktifMiSunucu } from '../../ozellik-bayraklari/okuma/KillSwitchAktifMiSunucu';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import type { AiMuzikProduct } from '../tipler';

export type AiMuzikIapSonuc =
  | { ok: true; secondsAdded: number; availableSeconds: number; mock?: boolean }
  | { ok: false; hata: string; kod?: 'kill_switch' | 'flag' | 'store' | 'verify' | 'cancel' };

function storeProductId(pkg: AiMuzikProduct): string {
  if (Platform.OS === 'ios') {
    return pkg.apple_product_id ?? pkg.product_id;
  }
  return pkg.google_product_id ?? pkg.product_id;
}

function edgeVerifyUrl(): string {
  const base =
    process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ??
    'https://placeholder.supabase.co';
  return `${base}/functions/v1/ai-music-iap-verify`;
}

async function AiMuzikIapDogrula(input: {
  productId: string;
  store: 'apple' | 'google';
  transactionId?: string;
  purchaseToken?: string;
  idempotencyKey: string;
}): Promise<
  | { ok: true; secondsAdded: number; availableSeconds: number }
  | { ok: false; hata: string }
> {
  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!jwt) return { ok: false, hata: i18n.t('aiMuzik.oturumGerekli') };

  try {
    const res = await fetch(edgeVerifyUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        productId: input.productId,
        store: input.store,
        transactionId: input.transactionId,
        purchaseToken: input.purchaseToken,
        idempotencyKey: input.idempotencyKey,
      }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      seconds_added?: number;
      available_seconds?: number;
      error?: string;
    };
    if (!res.ok || !json.ok) {
      return { ok: false, hata: json.error ?? `Verify ${res.status}` };
    }
    return {
      ok: true,
      secondsAdded: Number(json.seconds_added ?? 0),
      availableSeconds: Number(json.available_seconds ?? 0),
    };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : 'Verify network error' };
  }
}

function idempotencyKeyOlustur(): string {
  const r =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `ai_music_purchase_${r}`;
}

/**
 * AI müzik paketleri (pack 9–12). expo-iap + ai-music-iap-verify edge.
 */
export async function AiMuzikIapSatinAl(
  pkg: AiMuzikProduct,
): Promise<AiMuzikIapSonuc> {
  if (await KillSwitchAktifMiSunucu('kill_ai_music_generation')) {
    return {
      ok: false,
      hata: i18n.t('aiMuzik.satinAlmaGeciciKapali'),
      kod: 'kill_switch',
    };
  }
  if (!(await OzellikBayragiAktifMiSunucu('ai_music_enabled'))) {
    return { ok: false, hata: i18n.t('aiMuzik.ozellikKapali'), kod: 'flag' };
  }
  if (!(await OzellikBayragiAktifMiSunucu('iap_enabled'))) {
    return { ok: false, hata: i18n.t('aiMuzik.iapKapali'), kod: 'flag' };
  }
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { ok: false, hata: i18n.t('aiMuzik.iapSadeceMobil'), kod: 'store' };
  }

  try {
    const Constants = (await import('expo-constants')).default;
    if (Constants.appOwnership === 'expo') {
      return {
        ok: false,
        hata: i18n.t('aiMuzik.expoGoDesteklemez'),
        kod: 'store',
      };
    }
  } catch {
    /* devam */
  }

  let iap: typeof import('expo-iap');
  try {
    iap = await import('expo-iap');
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('aiMuzik.iapModuluYok'),
      kod: 'store',
    };
  }

  const {
    endConnection,
    fetchProducts,
    finishTransaction,
    initConnection,
    purchaseErrorListener,
    purchaseUpdatedListener,
    requestPurchase,
  } = iap;

  const sku = storeProductId(pkg);
  const idempotencyKey = idempotencyKeyOlustur();

  try {
    await initConnection();
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('aiMuzik.storeBaglantisiYok'),
      kod: 'store',
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = (r: AiMuzikIapSonuc) => {
      if (settled) return;
      settled = true;
      subUpdate.remove();
      subErr.remove();
      void endConnection().catch(() => undefined);
      resolve(r);
    };

    const subUpdate = purchaseUpdatedListener(async (purchase) => {
      try {
        const productId = purchase.productId;
        if (productId !== sku) return;

        const verify = await AiMuzikIapDogrula({
          productId,
          store: Platform.OS === 'ios' ? 'apple' : 'google',
          transactionId: purchase.transactionId ?? undefined,
          purchaseToken: purchase.purchaseToken ?? undefined,
          idempotencyKey,
        });

        await finishTransaction({ purchase, isConsumable: true });

        if (!verify.ok) {
          done({ ok: false, hata: verify.hata, kod: 'verify' });
          return;
        }
        done({
          ok: true,
          secondsAdded: verify.secondsAdded,
          availableSeconds: verify.availableSeconds,
        });
      } catch (e) {
        done({
          ok: false,
          hata: e instanceof Error ? e.message : i18n.t('aiMuzik.satinAlmaIslenemedi'),
          kod: 'verify',
        });
      }
    });

    const subErr = purchaseErrorListener((err) => {
      const msg = err?.message ?? i18n.t('aiMuzik.satinAlmaIptalHata');
      const cancel = /cancel|user.?cancel/i.test(msg);
      done({ ok: false, hata: msg, kod: cancel ? 'cancel' : 'store' });
    });

    void (async () => {
      try {
        const products = await fetchProducts({ skus: [sku], type: 'in-app' });
        if (!products?.length) {
          done({
            ok: false,
            hata: i18n.t('aiMuzik.storeUrunuYok', { sku }),
            kod: 'store',
          });
          return;
        }
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
          hata: e instanceof Error ? e.message : 'requestPurchase failed',
          kod: 'store',
        });
      }
    })();
  });
}

/** Mağaza fiyat etiketleri — hard-code yok. */
export async function AiMuzikStoreFiyatlari(
  products: AiMuzikProduct[],
): Promise<Record<string, string>> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return {};
  try {
    const Constants = (await import('expo-constants')).default;
    if (Constants.appOwnership === 'expo') return {};
  } catch {
    return {};
  }

  let iap: typeof import('expo-iap');
  try {
    iap = await import('expo-iap');
  } catch {
    return {};
  }

  const skus = products.map(storeProductId).filter(Boolean);
  if (!skus.length) return {};

  try {
    await iap.initConnection();
    const rows = await iap.fetchProducts({ skus, type: 'in-app' });
    await iap.endConnection().catch(() => undefined);
    const map: Record<string, string> = {};
    for (const p of rows ?? []) {
      const id = p.id ?? (p as { productId?: string }).productId;
      const price = (p as { displayPrice?: string }).displayPrice;
      if (id && price) map[id] = price;
    }
    return map;
  } catch {
    try {
      await iap.endConnection().catch(() => undefined);
    } catch {
      /* noop */
    }
    return {};
  }
}
