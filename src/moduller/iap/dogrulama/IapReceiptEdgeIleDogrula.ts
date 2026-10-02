import { supabase } from '../../../lib/supabase';
import type {
  IapMagaza,
  IapReceiptDogrulamaSonuc,
} from './IapReceiptDogrulamaIstegiHazirla';
import i18n from '../../../i18n';

/**
 * Edge Function uzerinden receipt verify + coin yukleme.
 * URL yoksa null (caller RPC'ye duser).
 */
export async function IapReceiptEdgeIleDogrula(input: {
  store: IapMagaza;
  productId: string;
  packageId: string;
  transactionId: string;
  receiptData: string;
  idempotencyKey: string;
  amountUsd?: number;
  sandbox?: boolean;
  /** Edge body'sindeki store (manual dahil) */
  edgeStore?: IapMagaza | 'manual';
}): Promise<IapReceiptDogrulamaSonuc | null> {
  const edgeUrl = process.env.EXPO_PUBLIC_IAP_VERIFY_URL;
  if (!edgeUrl) return null;

  const { data: session } = await supabase.auth.getSession();
  const jwt = session.session?.access_token;
  if (!jwt) return { ok: false, hata: i18n.t('cuzdanX.oturumGerekli') };

  try {
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        packageId: input.packageId,
        store: input.edgeStore ?? input.store,
        providerTxId: input.transactionId,
        idempotencyKey: input.idempotencyKey,
        amountUsd: input.amountUsd,
        receipt: { data: input.receiptData, productId: input.productId },
        sandbox: input.sandbox ?? true,
      }),
    });
    const json = (await res.json()) as {
      error?: string;
      coins_added?: number;
    };
    if (!res.ok) return { ok: false, hata: json.error ?? `HTTP ${res.status}` };
    return { ok: true, coinsAdded: json.coins_added ?? 0 };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('cuzdanX.iapEdgeHatasi'),
    };
  }
}
