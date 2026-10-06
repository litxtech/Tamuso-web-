import {
  TamusoActivityEnd,
  TamusoActivityStart,
  TamusoActivityUpdate,
} from '../TamusoActivityManager';
import {
  TamusoCallKitMarkConnected,
  TamusoCallKitMarkConnecting,
  TamusoCallKitEnd,
  TamusoCallKitFailed,
  TamusoCallKitMissed,
} from '../callkit/TamusoCallKitBridge';

let startedFor: string | null = null;
let startedAt = 0;
let isVideo = false;

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

/**
 * Start Live Activity only after LiveKit is connected (not while ringing).
 */
export async function GorusmeActivityBaglandi(input: {
  callId: string;
  peerName: string;
  video: boolean;
  isCaller?: boolean;
}): Promise<void> {
  isVideo = input.video;
  const type = input.video ? 'video_call' : 'call';

  if (input.isCaller) {
    // Outgoing already reported at ring start; ensure connecting→connected
  }

  TamusoCallKitMarkConnected(input.callId);

  if (startedFor === input.callId) {
    await TamusoActivityUpdate(
      type,
      input.callId,
      { status: 'active', subtitle: input.video ? 'Tamuso Görüntülü Arama' : 'Tamuso Sesli Arama' },
      { force: true },
    );
    return;
  }

  startedFor = input.callId;
  startedAt = Date.now();
  await TamusoActivityStart({
    type,
    activityId: input.callId,
    title: input.peerName || 'Arama',
    subtitle: input.video ? 'Tamuso Görüntülü Arama' : 'Tamuso Sesli Arama',
    timeLabel: '00:00',
    deepLink: `muta://call/${input.callId}`,
  });
}

export async function GorusmeActivityBaglaniyor(callId: string): Promise<void> {
  TamusoCallKitMarkConnecting(callId);
  const type = isVideo ? 'video_call' : 'call';
  if (startedFor === callId) {
    await TamusoActivityUpdate(
      type,
      callId,
      { status: 'connecting', subtitle: 'Bağlanıyor...' },
      { force: true },
    );
  }
}

export async function GorusmeActivityYenidenBaglan(callId: string): Promise<void> {
  const type = isVideo ? 'video_call' : 'call';
  if (startedFor !== callId) return;
  await TamusoActivityUpdate(
    type,
    callId,
    { status: 'reconnecting', subtitle: 'Yeniden bağlanıyor...' },
    { force: true },
  );
}

export async function GorusmeActivitySureGuncelle(callId: string): Promise<void> {
  if (startedFor !== callId) return;
  const type = isVideo ? 'video_call' : 'call';
  await TamusoActivityUpdate(type, callId, {
    timeLabel: formatElapsed(Date.now() - startedAt),
  });
}

export async function GorusmeActivityBitir(
  callId: string,
  reason: 'ended' | 'missed' | 'failed' | 'declined' = 'ended',
): Promise<void> {
  const type = isVideo ? 'video_call' : 'call';
  if (reason === 'missed') TamusoCallKitMissed(callId);
  else if (reason === 'failed') TamusoCallKitFailed(callId);
  else TamusoCallKitEnd(callId);

  if (startedFor === callId) {
    await TamusoActivityEnd(type, callId, {
      status: reason === 'failed' ? 'failed' : 'ended',
      subtitle:
        reason === 'missed'
          ? 'Cevapsız'
          : reason === 'failed'
            ? 'Bağlantı başarısız'
            : 'Arama bitti',
    });
    startedFor = null;
    startedAt = 0;
  }
}
