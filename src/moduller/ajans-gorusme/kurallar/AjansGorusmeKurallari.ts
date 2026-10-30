/** İstemci yalnızca UI kararı verir. Yetki sunucu RPC'sindedir. */

export type GorusmeDurumu =
  | 'draft'
  | 'scheduled'
  | 'waiting'
  | 'live'
  | 'ended'
  | 'cancelled';

export type DavetDurumu =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export type OdaIzgarasi = 'single' | 'split' | 'grid' | 'scroll';

export type CanliYayinRolu = 'host' | 'speaker' | 'listener';

const GECIS: Record<GorusmeDurumu, readonly GorusmeDurumu[]> = {
  draft: ['scheduled', 'waiting', 'cancelled'],
  scheduled: ['waiting', 'live', 'cancelled'],
  waiting: ['live', 'cancelled'],
  live: ['ended'],
  ended: [],
  cancelled: [],
};

const DAVET: Record<DavetDurumu, readonly DavetDurumu[]> = {
  pending: ['accepted', 'declined', 'expired', 'cancelled'],
  accepted: [],
  declined: [],
  expired: [],
  cancelled: [],
};

export function GorusmeGecisGecerli(
  from: GorusmeDurumu,
  to: GorusmeDurumu,
): boolean {
  return GECIS[from].includes(to);
}

export function DavetGecisGecerli(from: DavetDurumu, to: DavetDurumu): boolean {
  return DAVET[from].includes(to);
}

export function OdaIzgarasiSec(kisi: number): OdaIzgarasi {
  if (kisi <= 1) return 'single';
  if (kisi === 2) return 'split';
  if (kisi <= 4) return 'grid';
  return 'scroll';
}

/** LiveKit grant ile aynı eşleme. İstemci bunu yetki sanmasın. */
export function CanliRolYayinlar(
  role: string,
  canSpeak: boolean,
): CanliYayinRolu {
  if (role === 'host' || role === 'co_host') return 'host';
  if ((role === 'speaker' || role === 'platform') && canSpeak) return 'speaker';
  return 'listener';
}

export function ToplantiBaslangicIso(
  tarih: string,
  saat: string,
): string | null {
  const t = tarih.trim();
  const s = saat.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  if (!/^\d{2}:\d{2}$/.test(s)) return null;
  const d = new Date(`${t}T${s}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
