import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { FinansIdempotencyAnahtariOlustur } from '../islemler/FinansIdempotencyAnahtariOlustur';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';

export type YayinciKanal = 'live' | 'voice_room' | 'post' | 'message' | 'call' | 'other';

export type YayinciKazancDurumu =
  | 'ineligible'
  | 'paid'
  | 'in_payout'
  | 'on_hold'
  | 'pending'
  | 'available';

export type YayinciOdemeDurumu =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'sent_to_bank'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'on_hold';

export type YayinciOdemeTalebi = {
  id: string;
  amount_usd: number;
  fee_usd: number;
  net_usd: number;
  method: 'bank_transfer';
  account_holder: string | null;
  bank_name: string | null;
  iban_masked: string | null;
  status: YayinciOdemeDurumu;
  status_note: string | null;
  failure_reason: string | null;
  period_end: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type YayinciKazancOzeti = {
  currency: 'USD';
  eligible_gross_usd: number;
  creator_share_usd: number;
  deductions_usd: number;
  pending_usd: number;
  available_usd: number;
  on_hold_usd: number;
  in_payout_usd: number;
  paid_usd: number;
  ineligible_count: number;
  by_channel: Partial<Record<YayinciKanal, number>>;
  creator_share: number;
  platform_share: number;
  payout_min_usd: number;
  payout_fee_usd: number;
  current_period_start: string;
  current_period_end: string;
  next_processing_date: string;
  withdrawals_enabled: boolean;
  payout_method: 'bank_transfer';
  open_request: YayinciOdemeTalebi | null;
};

export type YayinciKazancKaydi = {
  id: string;
  created_at: string;
  source_type: 'gift' | 'call';
  channel: YayinciKanal;
  coin_source: 'purchased' | 'game' | 'bonus';
  coins: number;
  gross_usd: number;
  creator_rate: number;
  creator_usd: number;
  agency_usd: number;
  platform_usd: number;
  deductions_usd: number;
  net_usd: number;
  eligible: boolean;
  ineligible_reason: string | null;
  status: YayinciKazancDurumu;
  period_start: string;
  period_end: string;
  payer_name: string | null;
};

const SAYISAL_OZET = [
  'eligible_gross_usd',
  'creator_share_usd',
  'deductions_usd',
  'pending_usd',
  'available_usd',
  'on_hold_usd',
  'in_payout_usd',
  'paid_usd',
  'creator_share',
  'platform_share',
  'payout_min_usd',
  'payout_fee_usd',
] as const;

function sayi(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function YayinciKazancOzetiGetir(): Promise<YayinciKazancOzeti> {
  const { data, error } = await supabase.rpc('yayinci_kazanc_ozeti');
  if (error) throw new Error(error.message);
  const ham = (data ?? {}) as Record<string, unknown>;
  const ozet = { ...ham } as unknown as YayinciKazancOzeti;
  for (const k of SAYISAL_OZET) {
    (ozet as unknown as Record<string, number>)[k] = sayi(ham[k]);
  }
  const kanal = (ham.by_channel ?? {}) as Record<string, unknown>;
  ozet.by_channel = Object.fromEntries(
    Object.entries(kanal).map(([k, v]) => [k, sayi(v)]),
  ) as YayinciKazancOzeti['by_channel'];
  ozet.withdrawals_enabled = ham.withdrawals_enabled === true;
  return ozet;
}

export async function YayinciKazancKayitlariGetir(opts?: {
  kanal?: YayinciKanal | null;
  limit?: number;
  offset?: number;
}): Promise<YayinciKazancKaydi[]> {
  const { data, error } = await supabase.rpc('yayinci_kazanc_kayitlari', {
    p_channel: opts?.kanal ?? null,
    p_limit: opts?.limit ?? 50,
    p_offset: opts?.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...(r as unknown as YayinciKazancKaydi),
    coins: sayi(r.coins),
    gross_usd: sayi(r.gross_usd),
    creator_rate: sayi(r.creator_rate),
    creator_usd: sayi(r.creator_usd),
    agency_usd: sayi(r.agency_usd),
    platform_usd: sayi(r.platform_usd),
    deductions_usd: sayi(r.deductions_usd),
    net_usd: sayi(r.net_usd),
  }));
}

export async function YayinciOdemeTaleplerimiGetir(): Promise<YayinciOdemeTalebi[]> {
  const { data, error } = await supabase.rpc('yayinci_odeme_taleplerim');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...(r as unknown as YayinciOdemeTalebi),
    amount_usd: sayi(r.amount_usd),
    fee_usd: sayi(r.fee_usd),
    net_usd: sayi(r.net_usd),
  }));
}

const HATA_ANAHTARI: Record<string, CeviriAnahtari> = {
  withdrawals_unavailable: 'cuzdanY.cekimKullanilamiyor',
  open_request_exists: 'cuzdanY.hataAcikTalep',
  kyc_required: 'cuzdanY.hataKyc',
  bank_account_required: 'cuzdanY.hataBanka',
  security_review: 'cuzdanY.hataGuvenlik',
  below_minimum: 'cuzdanY.hataMinimum',
  cannot_cancel: 'cuzdanY.hataIptal',
};

export function YayinciOdemeHataMetni(mesaj: string): string {
  const kod = Object.keys(HATA_ANAHTARI).find((k) => mesaj.includes(k));
  return kod ? i18n.t(HATA_ANAHTARI[kod]) : i18n.t('cuzdanY.hataGenel');
}

export async function YayinciOdemeTalebiOlustur(): Promise<
  { ok: true; talep: YayinciOdemeTalebi } | { ok: false; hata: string }
> {
  const { data, error } = await supabase.rpc('yayinci_odeme_talebi_olustur', {
    p_idempotency_key: FinansIdempotencyAnahtariOlustur('creator_payout'),
  });
  if (error) return { ok: false, hata: YayinciOdemeHataMetni(error.message) };
  return { ok: true, talep: data as YayinciOdemeTalebi };
}

export async function YayinciOdemeTalebiIptal(
  talepId: string,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('yayinci_odeme_talebi_iptal', {
    p_request_id: talepId,
  });
  if (error) return { ok: false, hata: YayinciOdemeHataMetni(error.message) };
  return { ok: true };
}

export function UsdYazi(n: number, locale: string): string {
  return n.toLocaleString(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const ODEME_DURUM_ANAHTARI: Record<YayinciOdemeDurumu, CeviriAnahtari> = {
  pending: 'cuzdanY.odemeBekliyor',
  under_review: 'cuzdanY.odemeInceleniyor',
  approved: 'cuzdanY.odemeOnaylandi',
  sent_to_bank: 'cuzdanY.odemeBankayaGonderildi',
  completed: 'cuzdanY.odemeTamamlandi',
  failed: 'cuzdanY.odemeBasarisiz',
  cancelled: 'cuzdanY.odemeIptal',
  on_hold: 'cuzdanY.odemeGuvenlikIncelemesi',
};

export const KAZANC_DURUM_ANAHTARI: Record<YayinciKazancDurumu, CeviriAnahtari> = {
  ineligible: 'cuzdanY.kazancUygunDegil',
  paid: 'cuzdanY.kazancOdendi',
  in_payout: 'cuzdanY.kazancOdemede',
  on_hold: 'cuzdanY.kazancBeklemede',
  pending: 'cuzdanY.kazancDonemSurecek',
  available: 'cuzdanY.kazancCekilebilir',
};

export const KANAL_ANAHTARI: Record<YayinciKanal, CeviriAnahtari> = {
  live: 'cuzdanY.kanalCanli',
  voice_room: 'cuzdanY.kanalSesliOda',
  post: 'cuzdanY.kanalGonderi',
  message: 'cuzdanY.kanalMesaj',
  call: 'cuzdanY.kanalGorusme',
  other: 'cuzdanY.kanalDiger',
};

export const UYGUN_DEGIL_ANAHTARI: Record<string, CeviriAnahtari> = {
  game_coins: 'cuzdanY.nedenOyunCoin',
  bonus_coins: 'cuzdanY.nedenOdulCoin',
  self_gift: 'cuzdanY.nedenKendine',
};
