import {
  TamusoActivityEnd,
  TamusoActivityStart,
  TamusoActivityUpdate,
} from '../TamusoActivityManager';

let lastCount = -1;
let startedFor: string | null = null;
let startedAt = 0;

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

export async function SesOdasiActivityBaslat(input: {
  roomId: string;
  roomName: string;
  participantCount?: number;
}): Promise<void> {
  if (startedFor === input.roomId) return;
  startedFor = input.roomId;
  startedAt = Date.now();
  lastCount = input.participantCount ?? 0;
  const count = lastCount;
  await TamusoActivityStart({
    type: 'voice_room',
    activityId: input.roomId,
    title: input.roomName || 'Ses Odası',
    subtitle: 'Tamuso Ses Odası',
    countLabel: count > 0 ? `${count} kişi` : '',
    timeLabel: '00:00',
    deepLink: `muta://room/${input.roomId}`,
  });
}

export async function SesOdasiActivityGuncelle(input: {
  roomId: string;
  roomName?: string;
  participantCount?: number;
}): Promise<void> {
  if (startedFor !== input.roomId) return;
  const count = input.participantCount;
  if (typeof count === 'number') {
    // Meaningful delta only — manager also throttles
    if (lastCount >= 0 && Math.abs(count - lastCount) < 5 && count !== 0) {
      // still refresh time occasionally via throttle window
    }
    lastCount = count;
  }
  await TamusoActivityUpdate('voice_room', input.roomId, {
    title: input.roomName,
    countLabel:
      typeof count === 'number' && count > 0 ? `${count} kişi` : undefined,
    timeLabel: formatElapsed(Date.now() - startedAt),
  });
}

export async function SesOdasiActivityBitir(roomId?: string): Promise<void> {
  const id = roomId ?? startedFor;
  if (!id) return;
  await TamusoActivityEnd('voice_room', id, {
    status: 'ended',
    subtitle: 'Oda kapandı',
  });
  if (startedFor === id) {
    startedFor = null;
    lastCount = -1;
    startedAt = 0;
  }
}
