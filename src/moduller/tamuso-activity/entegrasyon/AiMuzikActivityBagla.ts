import {
  TamusoActivityEnd,
  TamusoActivityStart,
  TamusoActivityUpdate,
} from '../TamusoActivityManager';
import { AiMuzikJobDurumuGetir } from '../../ai-muzik/islemler/AiMuzikApi';

const polls = new Map<string, ReturnType<typeof setInterval>>();

function statusLabel(status: string): { subtitle: string; progress: number } {
  const s = status.toUpperCase();
  if (s === 'QUEUED' || s === 'PENDING') {
    return { subtitle: 'Sırada bekliyor', progress: 8 };
  }
  if (s === 'PROCESSING' || s === 'RUNNING') {
    return { subtitle: 'AI üretimi devam ediyor', progress: 42 };
  }
  if (s === 'FINALIZING') {
    return { subtitle: 'Son dokunuşlar', progress: 85 };
  }
  if (s === 'COMPLETED' || s === 'READY' || s === 'SUCCESS') {
    return { subtitle: 'Parçan hazır', progress: 100 };
  }
  if (s === 'FAILED' || s === 'ERROR') {
    return { subtitle: 'Üretim başarısız', progress: -1 };
  }
  return { subtitle: 'Müzik oluşturuluyor', progress: 20 };
}

export async function AiMuzikActivityBaslat(input: {
  jobId: string;
  title?: string;
}): Promise<void> {
  await TamusoActivityStart({
    type: 'ai_music',
    activityId: input.jobId,
    title: input.title || 'Yeni Parça',
    subtitle: 'AI üretimi devam ediyor',
    progress: 10,
    deepLink: `muta://music/${input.jobId}`,
  });

  if (polls.has(input.jobId)) return;

  const timer = setInterval(() => {
    void (async () => {
      const r = await AiMuzikJobDurumuGetir(input.jobId);
      if (!r.ok || !r.job) return;
      const { subtitle, progress } = statusLabel(r.job.status);
      const done =
        /COMPLETED|READY|SUCCESS/i.test(r.job.status) ||
        /FAILED|ERROR/i.test(r.job.status);

      if (done) {
        clearInterval(timer);
        polls.delete(input.jobId);
        const failed = /FAILED|ERROR/i.test(r.job.status);
        await TamusoActivityEnd('ai_music', input.jobId, {
          status: failed ? 'failed' : 'completed',
          subtitle: failed ? 'Üretim başarısız' : 'Parçan hazır',
          progress: failed ? -1 : 100,
        });
        return;
      }

      await TamusoActivityUpdate('ai_music', input.jobId, {
        subtitle,
        progress,
        status: 'active',
      });
    })();
  }, 8_000);

  polls.set(input.jobId, timer);
}

export async function AiMuzikActivityBitir(jobId: string): Promise<void> {
  const t = polls.get(jobId);
  if (t) {
    clearInterval(t);
    polls.delete(jobId);
  }
  await TamusoActivityEnd('ai_music', jobId);
}
