/**
 * Push / cold-start ile gelen arama — GorusmeGelenSaglayici okur.
 * Yalnızca type=incoming_call.
 */
import type { DirectCall, GorusmeTuru } from '../tipler';

export type BekleyenGelenArama = {
  callId: string;
  callerId: string;
  callType: GorusmeTuru;
  threadId?: string | null;
  channelName?: string | null;
  receivedAt: number;
};

let bekleyen: BekleyenGelenArama | null = null;
type Dinleyici = (b: BekleyenGelenArama | null) => void;
const dinleyiciler = new Set<Dinleyici>();

function yayinla() {
  dinleyiciler.forEach((fn) => fn(bekleyen));
}

export function BekleyenGelenAramaDinle(fn: Dinleyici): () => void {
  dinleyiciler.add(fn);
  fn(bekleyen);
  return () => {
    dinleyiciler.delete(fn);
  };
}

export function BekleyenGelenAramaAl(): BekleyenGelenArama | null {
  return bekleyen;
}

export function BekleyenGelenAramaTemizle(): void {
  if (!bekleyen) return;
  bekleyen = null;
  yayinla();
}

export function BekleyenGelenAramaAyarla(
  input: Omit<BekleyenGelenArama, 'receivedAt'>,
): void {
  bekleyen = { ...input, receivedAt: Date.now() };
  yayinla();
}

/** notification data → bekleyen arama */
export function GelenAramaPushVerisindenIsle(
  data: Record<string, unknown> | null | undefined,
): BekleyenGelenArama | null {
  if (!data) return null;
  const type = String(data.type ?? '');
  if (type !== 'incoming_call') return null;

  const callId = String(data.call_id ?? data.callId ?? '').trim();
  if (!callId) return null;

  const callerId = String(data.caller_id ?? data.callerId ?? '').trim();
  const callTypeRaw = String(data.call_type ?? data.callType ?? 'audio').toLowerCase();
  const callType: GorusmeTuru =
    callTypeRaw === 'video' ? 'video' : 'audio';

  const entry: BekleyenGelenArama = {
    callId,
    callerId,
    callType,
    threadId: data.thread_id ? String(data.thread_id) : null,
    channelName: data.channel_name ? String(data.channel_name) : null,
    receivedAt: Date.now(),
  };
  bekleyen = entry;
  yayinla();
  return entry;
}

/** Minimal DirectCall stub — UI gosterimi icin (DB satiri sonra yuklenir) */
export function BekleyenGelenAramaDirectCallStub(
  b: BekleyenGelenArama,
): DirectCall {
  return {
    id: b.callId,
    thread_id: b.threadId ?? '',
    caller_id: b.callerId || 'unknown',
    callee_id: '',
    call_type: b.callType,
    status: 'ringing',
    channel_name: b.channelName ?? '',
    started_at: new Date(b.receivedAt).toISOString(),
    answered_at: null,
    ended_at: null,
    ended_by: null,
    end_reason: null,
  };
}
