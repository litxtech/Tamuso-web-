import {
  TamusoActivityEnd,
  TamusoActivityStart,
  TamusoActivityUpdate,
} from '../TamusoActivityManager';

let startedFor: string | null = null;
let startedAt = 0;
let lastViewers = -1;

function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

function formatViewers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K izleyici`;
  return `${n} izleyici`;
}

export async function CanliYayinActivityBaslat(input: {
  liveId: string;
  hostName: string;
  viewerCount?: number;
}): Promise<void> {
  if (startedFor === input.liveId) return;
  startedFor = input.liveId;
  startedAt = Date.now();
  lastViewers = input.viewerCount ?? 0;
  await TamusoActivityStart({
    type: 'live_stream',
    activityId: input.liveId,
    title: `${input.hostName} LIVE`,
    subtitle: 'Tamuso Canlı',
    countLabel: lastViewers > 0 ? formatViewers(lastViewers) : '',
    timeLabel: '00:00',
    deepLink: `muta://live/${input.liveId}`,
  });
}

export async function CanliYayinActivityGuncelle(input: {
  liveId: string;
  hostName?: string;
  viewerCount?: number;
  reconnecting?: boolean;
}): Promise<void> {
  if (startedFor !== input.liveId) return;
  if (typeof input.viewerCount === 'number') {
    lastViewers = input.viewerCount;
  }
  await TamusoActivityUpdate(
    'live_stream',
    input.liveId,
    {
      title: input.hostName ? `${input.hostName} LIVE` : undefined,
      subtitle: input.reconnecting ? 'Yeniden bağlanıyor...' : 'Tamuso Canlı',
      countLabel:
        lastViewers > 0 ? formatViewers(lastViewers) : undefined,
      timeLabel: formatElapsed(Date.now() - startedAt),
      status: input.reconnecting ? 'reconnecting' : 'active',
    },
    { force: !!input.reconnecting },
  );
}

export async function CanliYayinActivityBitir(liveId?: string): Promise<void> {
  const id = liveId ?? startedFor;
  if (!id) return;
  await TamusoActivityEnd('live_stream', id, {
    status: 'ended',
    subtitle: 'Yayın bitti',
  });
  if (startedFor === id) {
    startedFor = null;
    lastViewers = -1;
    startedAt = 0;
  }
}
