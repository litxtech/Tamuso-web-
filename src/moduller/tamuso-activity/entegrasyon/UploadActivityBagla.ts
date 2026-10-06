import {
  TamusoActivityEnd,
  TamusoActivityStart,
  TamusoActivityUpdate,
} from '../TamusoActivityManager';

let startedFor: string | null = null;
let lastPct = -1;

export async function UploadActivityBaslat(input: {
  uploadId: string;
  title?: string;
}): Promise<void> {
  startedFor = input.uploadId;
  lastPct = 0;
  await TamusoActivityStart({
    type: 'upload',
    activityId: input.uploadId,
    title: input.title || 'Video yükleniyor',
    subtitle: 'Tamuso',
    progress: 0,
    deepLink: `muta://upload/${input.uploadId}`,
  });
}

export async function UploadActivityIlerleme(
  uploadId: string,
  progress01: number,
  etaSec?: number,
): Promise<void> {
  if (startedFor !== uploadId) return;
  const pct = Math.max(0, Math.min(100, Math.round(progress01 * 100)));
  if (lastPct >= 0 && Math.abs(pct - lastPct) < 3 && pct < 100) return;
  lastPct = pct;
  await TamusoActivityUpdate('upload', uploadId, {
    progress: pct,
    subtitle:
      typeof etaSec === 'number' && etaSec > 0
        ? `Tahmini ${Math.round(etaSec)} sn`
        : 'Video yükleniyor',
    status: 'active',
  });
}

export async function UploadActivityTamam(uploadId: string): Promise<void> {
  if (startedFor !== uploadId) return;
  await TamusoActivityEnd('upload', uploadId, {
    status: 'completed',
    subtitle: 'Video hazır',
    progress: 100,
  });
  startedFor = null;
  lastPct = -1;
}

export async function UploadActivityHata(uploadId: string): Promise<void> {
  if (startedFor !== uploadId) return;
  await TamusoActivityEnd('upload', uploadId, {
    status: 'failed',
    subtitle: 'Video yüklenemedi',
    progress: -1,
  });
  startedFor = null;
  lastPct = -1;
}
