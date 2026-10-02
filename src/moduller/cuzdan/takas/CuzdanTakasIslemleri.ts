import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { FinansIdempotencyAnahtariOlustur } from '../islemler/FinansIdempotencyAnahtariOlustur';
import type { CoinTradeOffer } from './CuzdanTakasTipleri';

export async function CuzdanNoIleTransfer(input: {
  walletNumber: string;
  firstName: string;
  lastName: string;
  coins: number;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('cuzdan_no_ile_coin_transfer', {
    p_wallet_number: input.walletNumber.replace(/\D/g, ''),
    p_first_name: input.firstName.trim(),
    p_last_name: input.lastName.trim(),
    p_coins: Math.floor(input.coins),
    p_idempotency_key: FinansIdempotencyAnahtariOlustur('wallet_tx'),
  });
  if (error) {
    const m = error.message || '';
    if (/name mismatch/i.test(m)) {
      return {
        ok: false,
        hata: i18n.t('takas.isimEslesmedi'),
      };
    }
    if (/kyc required/i.test(m)) {
      return { ok: false, hata: i18n.t('takas.aliciKycEksik') };
    }
    if (/18 digits/i.test(m)) {
      return { ok: false, hata: i18n.t('takas.cuzdan18Hane') };
    }
    if (/insufficient/i.test(m)) {
      return { ok: false, hata: i18n.t('takas.yetersizCoinBakiye') };
    }
    if (/not found/i.test(m)) {
      return { ok: false, hata: i18n.t('takas.cuzdanBulunamadi') };
    }
    return { ok: false, hata: m };
  }
  return { ok: true };
}

/** QR / yazım sonrası: 18 haneli no → KYC adı soyadı */
export async function CuzdanNoIleAliciGetir(
  walletNumber: string,
): Promise<
  | {
      ok: true;
      walletNumber: string;
      firstName: string | null;
      lastName: string | null;
      kycStatus: string;
    }
  | { ok: false; hata: string }
> {
  const num = walletNumber.replace(/\D/g, '');
  if (num.length !== 18) {
    return { ok: false, hata: i18n.t('takas.cuzdan18Hane') };
  }
  const { data, error } = await supabase.rpc('cuzdan_no_ile_alici_getir', {
    p_wallet_number: num,
  });
  if (error) return { ok: false, hata: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, hata: i18n.t('takas.cuzdanBulunamadi') };
  return {
    ok: true,
    walletNumber: String(row.wallet_number),
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    kycStatus: String(row.kyc_status ?? 'none'),
  };
}

/** QR içeriğinden 18 haneli cüzdan no çıkar */
export function CuzdanNoQrdenCoz(data: string): string | null {
  const raw = (data ?? '').trim();
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length === 18) return digitsOnly;
  const m = /(?:mutapay|muta)[:\/]+w[\/:]?(\d{18})/i.exec(raw);
  if (m) return m[1];
  const m2 = /(\d{18})/.exec(raw);
  return m2 ? m2[1] : null;
}

export function CuzdanNoQrPayload(walletNumber: string): string {
  const n = walletNumber.replace(/\D/g, '');
  return `mutapay://w/${n}`;
}

/** Ajans public ID QR */
export function AjansNoQrPayload(agencyPublicId: string): string {
  return `mutapay://a/${agencyPublicId.trim()}`;
}

export function AjansNoQrdenCoz(data: string): string | null {
  const raw = (data ?? '').trim();
  const m = /(?:mutapay|muta)[:\/]+a[\/:]?([A-Za-z0-9_-]+)/i.exec(raw);
  if (m?.[1]) return m[1];
  return null;
}

export type TakasAjansSatir = {
  id: string;
  name: string;
  agency_public_id: string | null;
  logo_url: string | null;
  status: string;
  owner_id?: string | null;
};

export type TakasKullaniciSatir = {
  id: string;
  display_name: string | null;
  username: string | null;
  wallet_number: string;
  avatar_url: string | null;
  legal_first_name?: string | null;
  legal_last_name?: string | null;
};

export async function TakasAjansAra(q?: string): Promise<TakasAjansSatir[]> {
  const { data, error } = await supabase.rpc('takas_ajans_ara', {
    p_q: q ?? null,
  });
  if (error) return [];
  return (data ?? []) as TakasAjansSatir[];
}

export async function TakasKullaniciAra(q: string): Promise<TakasKullaniciSatir[]> {
  const { data, error } = await supabase.rpc('takas_kullanici_ara', {
    p_q: q,
  });
  if (error) return [];
  return (data ?? []) as TakasKullaniciSatir[];
}

export function TakasKullaniciGorunenAd(k: TakasKullaniciSatir): string {
  const ad = [k.legal_first_name, k.legal_last_name]
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
    .join(' ');
  if (ad) return ad;
  return (k.display_name ?? k.username ?? i18n.t('ortak.kullanici')).trim() || i18n.t('ortak.kullanici');
}

export async function TakasTeklifOlustur(input: {
  buyerType: 'user' | 'agency';
  buyerUserId?: string | null;
  buyerAgencyId?: string | null;
  coins: number;
  note?: string;
}): Promise<{ ok: true; offer: CoinTradeOffer } | { ok: false; hata: string }> {
  const { OzellikBayragiAktifMiSunucu } = await import(
    '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu'
  );
  if (!(await OzellikBayragiAktifMiSunucu('wallet_exchange_enabled'))) {
    return { ok: false, hata: i18n.t('takas.takasKullanilamiyor') };
  }

  const { data, error } = await supabase.rpc('coin_takas_teklif_olustur', {
    p_buyer_type: input.buyerType,
    p_buyer_user_id: input.buyerUserId ?? null,
    p_buyer_agency_id: input.buyerAgencyId ?? null,
    p_coins: Math.floor(input.coins),
    p_note: input.note ?? null,
  });
  if (error) {
    if (/takas kapali|wallet_exchange/i.test(error.message)) {
      return { ok: false, hata: i18n.t('takas.takasKullanilamiyor') };
    }
    if (/kyc required/i.test(error.message)) {
      return { ok: false, hata: i18n.t('takas.kycGerekli') };
    }
    if (/refund risk/i.test(error.message)) {
      return {
        ok: false,
        hata: i18n.t('takas.iadeRiskKapali'),
      };
    }
    if (/iap cooling/i.test(error.message)) {
      return {
        ok: false,
        hata: i18n.t('takas.iapSogutma'),
      };
    }
    return { ok: false, hata: error.message };
  }
  return { ok: true, offer: data as CoinTradeOffer };
}

export async function TakasAliciYanit(
  offerId: string,
  accept: boolean,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('coin_takas_alici_yanit', {
    p_offer_id: offerId,
    p_accept: accept,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function TakasOdemeBilgisiKaydet(input: {
  offerId: string;
  coinsBought: number;
  paymentSource: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('coin_takas_odeme_bilgisi_kaydet', {
    p_offer_id: input.offerId,
    p_coins_bought: Math.floor(input.coinsBought),
    p_payment_source: input.paymentSource.trim(),
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function TakasDekontYukle(input: {
  offerId: string;
  receiptPath: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('coin_takas_dekont_yukle', {
    p_offer_id: input.offerId,
    p_receipt_path: input.receiptPath,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function TakasTekliflerimiGetir(): Promise<CoinTradeOffer[]> {
  const { data, error } = await supabase.rpc('takas_tekliflerimi_listele', {
    p_limit: 50,
  });
  if (error) {
    // Eski fallback
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) return [];
    const fb = await supabase
      .from('coin_trade_offers')
      .select('*')
      .or(`seller_id.eq.${uid},buyer_user_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(40);
    return (fb.data as CoinTradeOffer[]) ?? [];
  }
  return (data as CoinTradeOffer[]) ?? [];
}

export async function TakasDekontUrl(
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('trade-receipts')
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
