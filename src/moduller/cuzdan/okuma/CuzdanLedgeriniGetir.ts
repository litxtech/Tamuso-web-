import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type LedgerSatiri = {
  id: string;
  currency: string;
  delta: number;
  balance_after: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
};

const SEBEP_ANAHTAR: Record<string, string> = {
  gift_send: 'cuzdan.ledgerGiftSend',
  gift_receive: 'cuzdan.ledgerGiftReceive',
  gift_sent: 'cuzdan.ledgerGiftSend',
  gift_received: 'cuzdan.ledgerGiftReceive',
  purchase: 'cuzdan.ledgerPurchase',
  coin_purchase: 'cuzdan.ledgerPurchase',
  iap: 'cuzdan.ledgerIap',
  stripe: 'cuzdan.ledgerStripe',
  withdraw: 'cuzdan.ledgerWithdraw',
  withdrawal: 'cuzdan.ledgerWithdraw',
  withdrawal_hold: 'cuzdan.ledgerWithdrawalHold',
  withdrawal_refund: 'cuzdan.ledgerWithdrawalRefund',
  agency_commission: 'cuzdan.ledgerAgencyCommission',
  agency_distribution: 'cuzdan.ledgerAgencyDistribution',
  host_earning: 'cuzdan.ledgerHostEarning',
  refund: 'cuzdan.ledgerRefund',
  bonus: 'cuzdan.ledgerBonus',
  admin_adjust: 'cuzdan.ledgerAdminAdjust',
  admin_topup: 'cuzdan.ledgerAdminTopup',
  admin_deduct: 'cuzdan.ledgerAdminDeduct',
  admin_penalty: 'cuzdan.ledgerAdminPenalty',
  game_entry: 'cuzdan.ledgerGameEntry',
  game_reward: 'cuzdan.ledgerGameReward',
  game_refund: 'cuzdan.ledgerGameRefund',
  kaskad_bet: 'cuzdan.ledgerKaskadBet',
  kaskad_win: 'cuzdan.ledgerKaskadWin',
  kaskad_refund: 'cuzdan.ledgerKaskadRefund',
  zeus_bet: 'cuzdan.ledgerZeusBet',
  zeus_win: 'cuzdan.ledgerZeusWin',
  live_gift: 'cuzdan.ledgerLiveGift',
  status_gift: 'cuzdan.ledgerStatusGift',
};

const REF_ANAHTAR: Record<string, string> = {
  gift: 'cuzdan.refGift',
  purchase: 'cuzdan.refPurchase',
  coin_purchase: 'cuzdan.refCoinPurchase',
  iap: 'cuzdan.refIap',
  stripe: 'cuzdan.refStripe',
  withdrawal: 'cuzdan.refWithdrawal',
  withdraw: 'cuzdan.refWithdrawal',
  game_session: 'cuzdan.refGameSession',
  kaskad_round: 'cuzdan.refKaskadRound',
  admin: 'cuzdan.refAdmin',
  agency: 'cuzdan.refAgency',
  agency_transfer: 'cuzdan.refAgencyTransfer',
  host: 'cuzdan.refHost',
  live: 'cuzdan.refLive',
  room: 'cuzdan.refRoom',
};

function sebepKok(reason: string): string {
  const i = reason.indexOf(':');
  return i > 0 ? reason.slice(0, i) : reason;
}

export function LedgerSebepEtiketi(reason: string): string {
  const kok = sebepKok(reason);
  const key = SEBEP_ANAHTAR[kok] ?? SEBEP_ANAHTAR[reason];
  const etiket = key ? (i18n.t(key) as string) : undefined;
  if (etiket) {
    const not =
      reason.includes(':') ? reason.slice(reason.indexOf(':') + 1).trim() : '';
    return not ? `${etiket} · ${not}` : etiket;
  }
  return reason.replace(/_/g, ' ');
}

export function LedgerRefEtiketi(refType: string | null | undefined): string {
  if (!refType) return i18n.t('cuzdan.tire') as string;
  const key = REF_ANAHTAR[refType];
  return key ? (i18n.t(key) as string) : refType.replace(/_/g, ' ');
}

export function LedgerBirimEtiketi(currency: string): string {
  if (currency === 'diamonds' || currency === 'diamond') {
    return i18n.t('cuzdan.birimElmas') as string;
  }
  if (currency === 'coins' || currency === 'coin') {
    return i18n.t('cuzdan.birimCoin') as string;
  }
  return currency;
}

/** Satırın kullanıcıya gösterilecek kısa özeti */
export function LedgerAnlasilirOzet(row: LedgerSatiri): string {
  const sebep = LedgerSebepEtiketi(row.reason);
  const kok = sebepKok(row.reason);
  if (kok === 'agency_distribution') return sebep;
  const ref = LedgerRefEtiketi(row.ref_type);
  if (!row.ref_type || ref === (i18n.t('cuzdan.tire') as string) || sebep.includes(ref)) {
    return sebep;
  }
  return `${sebep} · ${ref}`;
}

export function LedgerTutarYazi(row: LedgerSatiri): string {
  const isaret = row.delta >= 0 ? '+' : '';
  const lng = (i18n.language ?? 'en').toLowerCase();
  const dil = lng.startsWith('pt')
    ? 'pt-BR'
    : lng.startsWith('en')
      ? 'en-US'
      : lng.startsWith('es')
        ? 'es-ES'
        : lng.startsWith('ar')
          ? 'ar'
          : lng.startsWith('fr')
            ? 'fr-FR'
            : lng.startsWith('fil') || lng.startsWith('tl')
              ? 'fil-PH'
              : lng.startsWith('tr')
                ? 'tr-TR'
                : 'en-US';
  return `${isaret}${row.delta.toLocaleString(dil)} ${LedgerBirimEtiketi(row.currency)}`;
}

export async function CuzdanLedgeriniGetir(limit = 50): Promise<LedgerSatiri[]> {
  const { data, error } = await supabase
    .from('wallet_ledger')
    .select('id, currency, delta, balance_after, reason, ref_type, ref_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data as LedgerSatiri[]) ?? []).map((r) => ({
    ...r,
    delta: Number(r.delta ?? 0),
    balance_after: Number(r.balance_after ?? 0),
    ref_id: (r.ref_id as string | null) ?? null,
  }));
}
