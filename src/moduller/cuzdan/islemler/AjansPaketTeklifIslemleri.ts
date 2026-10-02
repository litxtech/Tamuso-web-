import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type AjansPaketTeklif = {
  id: string;
  agency_id: string;
  agency_name?: string | null;
  buyer_id: string;
  thread_id?: string | null;
  package_key: string;
  title: string;
  liste_fiyat_try: number;
  amount_try: number;
  coins: number;
  indirim_yuzde: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired' | string;
  expires_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

export type AjansPaketTeklifOlusturSonuc =
  | {
      ok: true;
      offerId: string;
      threadId: string;
      messageId: string;
      amountTry: number;
      coins: number;
      title: string;
      status: string;
    }
  | { ok: false; hata: string };

/** Cüzdan / ajans sohbetinden Stripe ödemeli paket teklifi oluşturur. */
export async function AjansPaketTeklifOlustur(input: {
  agencyId: string;
  listeFiyatTry: number;
  buyerId?: string | null;
  threadId?: string | null;
}): Promise<AjansPaketTeklifOlusturSonuc> {
  const { data, error } = await supabase.rpc('ajans_paket_teklif_olustur', {
    p_agency_id: input.agencyId,
    p_liste_fiyat_try: input.listeFiyatTry,
    p_buyer_id: input.buyerId ?? null,
    p_thread_id: input.threadId ?? null,
  });

  if (error) {
    return { ok: false, hata: error.message || i18n.t('cuzdanX.teklifOlusturulamadi') };
  }

  const row = data as Record<string, unknown> | null;
  if (!row?.ok || !row.offer_id || !row.thread_id) {
    return { ok: false, hata: i18n.t('cuzdanX.teklifOlusturulamadi') };
  }

  return {
    ok: true,
    offerId: String(row.offer_id),
    threadId: String(row.thread_id),
    messageId: String(row.message_id ?? ''),
    amountTry: Number(row.amount_try ?? 0),
    coins: Number(row.coins ?? 0),
    title: String(row.title ?? ''),
    status: String(row.status ?? 'pending'),
  };
}

export async function AjansPaketTeklifGetir(
  offerId: string,
): Promise<AjansPaketTeklif | null> {
  const { data, error } = await supabase.rpc('ajans_paket_teklif_getir', {
    p_offer_id: offerId,
  });
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    agency_id: String(row.agency_id),
    agency_name: (row.agency_name as string | null) ?? null,
    buyer_id: String(row.buyer_id),
    thread_id: (row.thread_id as string | null) ?? null,
    package_key: String(row.package_key ?? ''),
    title: String(row.title ?? ''),
    liste_fiyat_try: Number(row.liste_fiyat_try ?? 0),
    amount_try: Number(row.amount_try ?? 0),
    coins: Number(row.coins ?? 0),
    indirim_yuzde: Number(row.indirim_yuzde ?? 20),
    status: String(row.status ?? 'pending'),
    expires_at: (row.expires_at as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  };
}
