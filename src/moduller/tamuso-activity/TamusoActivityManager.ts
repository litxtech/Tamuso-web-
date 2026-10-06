import { Platform } from 'react-native';
import { OzellikBayragiAktifMi } from '../ozellik-bayraklari/OzellikBayragiAktifMi';
import TamusoLiveActivity from './ui/TamusoLiveActivity';
import {
  ACTIVITY_PRIORITY,
  activityAccent,
  activityIconKey,
  type TamusoActivityStatus,
  type TamusoActivityType,
  type TamusoLiveActivityProps,
} from './tipler';

type ActiveEntry = {
  type: TamusoActivityType;
  activityId: string;
  props: TamusoLiveActivityProps;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instance: any;
  lastUpdateAt: number;
  startedAt: number;
};

const active = new Map<string, ActiveEntry>();

/** Min interval between ActivityKit updates (ms) — battery / APNs budget */
const UPDATE_THROTTLE_MS: Record<TamusoActivityType, number> = {
  call: 15_000,
  video_call: 15_000,
  voice_room: 20_000,
  live_stream: 25_000,
  upload: 2_000,
  ai_music: 5_000,
  tournament: 30_000,
};

const COUNT_DELTA_THRESHOLD: Partial<Record<TamusoActivityType, number>> = {
  voice_room: 5,
  live_stream: 25,
};

function mapKey(type: TamusoActivityType, activityId: string): string {
  return `${type}:${activityId}`;
}

function flagForType(type: TamusoActivityType): boolean {
  if (!OzellikBayragiAktifMi('ios_dynamic_island_enabled')) return false;
  if (!OzellikBayragiAktifMi('live_activity_enabled')) return false;
  switch (type) {
    case 'call':
    case 'video_call':
      return OzellikBayragiAktifMi('callkit_enabled');
    case 'voice_room':
      return OzellikBayragiAktifMi('voice_room_live_activity_enabled');
    case 'live_stream':
      return OzellikBayragiAktifMi('live_stream_activity_enabled');
    case 'upload':
      return OzellikBayragiAktifMi('upload_activity_enabled');
    case 'ai_music':
      return OzellikBayragiAktifMi('ai_music_activity_enabled');
    case 'tournament':
      return OzellikBayragiAktifMi('tournament_activity_enabled');
    default:
      return false;
  }
}

function deepLinkFor(
  type: TamusoActivityType,
  activityId: string,
  explicit?: string,
): string {
  if (explicit) return explicit;
  switch (type) {
    case 'call':
    case 'video_call':
      return `muta://call/${activityId}`;
    case 'voice_room':
      return `muta://room/${activityId}`;
    case 'live_stream':
      return `muta://live/${activityId}`;
    case 'upload':
      return `muta://upload/${activityId}`;
    case 'ai_music':
      return `muta://music/${activityId}`;
    case 'tournament':
      return `muta://tournament/${activityId}`;
    default:
      return 'muta://';
  }
}

function buildProps(input: {
  type: TamusoActivityType;
  activityId: string;
  status?: TamusoActivityStatus;
  title: string;
  subtitle?: string;
  timeLabel?: string;
  countLabel?: string;
  progress?: number;
  deepLink?: string;
}): TamusoLiveActivityProps {
  return {
    activityType: input.type,
    activityId: input.activityId,
    status: input.status ?? 'active',
    title: input.title.slice(0, 48),
    subtitle: (input.subtitle ?? '').slice(0, 64),
    timeLabel: input.timeLabel ?? '',
    countLabel: input.countLabel ?? '',
    progress: input.progress ?? -1,
    iconKey: activityIconKey(input.type),
    deepLink: deepLinkFor(input.type, input.activityId, input.deepLink),
    accent: activityAccent(input.type),
  };
}

function parseCount(label: string): number | null {
  const m = label.replace(/\./g, '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function shouldThrottleUpdate(
  entry: ActiveEntry,
  next: TamusoLiveActivityProps,
  force: boolean,
): boolean {
  if (force) return false;
  const elapsed = Date.now() - entry.lastUpdateAt;
  const min = UPDATE_THROTTLE_MS[entry.type] ?? 10_000;
  if (elapsed < min) {
    // Always allow status / title / progress jumps
    if (next.status !== entry.props.status) return false;
    if (next.title !== entry.props.title) return false;
    if (
      next.progress >= 0 &&
      Math.abs(next.progress - entry.props.progress) >= 5
    ) {
      return false;
    }
    const thr = COUNT_DELTA_THRESHOLD[entry.type];
    if (thr != null) {
      const a = parseCount(entry.props.countLabel);
      const b = parseCount(next.countLabel);
      if (a != null && b != null && Math.abs(b - a) >= thr) return false;
    }
    return true;
  }
  return false;
}

export async function TamusoActivityIsSupported(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    // Factory exists after native rebuild with expo-widgets
    return typeof TamusoLiveActivity?.start === 'function';
  } catch {
    return false;
  }
}

export async function TamusoActivityStart(input: {
  type: TamusoActivityType;
  activityId: string;
  title: string;
  subtitle?: string;
  timeLabel?: string;
  countLabel?: string;
  progress?: number;
  status?: TamusoActivityStatus;
  deepLink?: string;
}): Promise<{ ok: boolean; key?: string; hata?: string }> {
  if (Platform.OS !== 'ios') return { ok: false, hata: 'platform' };
  if (!flagForType(input.type)) return { ok: false, hata: 'feature_flag' };

  const key = mapKey(input.type, input.activityId);
  const props = buildProps(input);

  try {
    // Replace same logical activity
    const existing = active.get(key);
    if (existing?.instance) {
      try {
        await existing.instance.end('immediate');
      } catch {
        /* ignore */
      }
      active.delete(key);
    }

    const instance = TamusoLiveActivity.start(props, props.deepLink);
    if (!instance) {
      return { ok: false, hata: 'start_failed' };
    }

    active.set(key, {
      type: input.type,
      activityId: input.activityId,
      props,
      instance,
      lastUpdateAt: Date.now(),
      startedAt: Date.now(),
    });

    return { ok: true, key };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : 'start_error',
    };
  }
}

export async function TamusoActivityUpdate(
  type: TamusoActivityType,
  activityId: string,
  patch: Partial<{
    title: string;
    subtitle: string;
    timeLabel: string;
    countLabel: string;
    progress: number;
    status: TamusoActivityStatus;
    deepLink: string;
  }>,
  opts?: { force?: boolean },
): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = mapKey(type, activityId);
  const entry = active.get(key);
  if (!entry) return { ok: false };

  const next = buildProps({
    type,
    activityId,
    title: patch.title ?? entry.props.title,
    subtitle: patch.subtitle ?? entry.props.subtitle,
    timeLabel: patch.timeLabel ?? entry.props.timeLabel,
    countLabel: patch.countLabel ?? entry.props.countLabel,
    progress: patch.progress ?? entry.props.progress,
    status: patch.status ?? entry.props.status,
    deepLink: patch.deepLink ?? entry.props.deepLink,
  });

  if (shouldThrottleUpdate(entry, next, !!opts?.force)) {
    return { ok: true, skipped: true };
  }

  try {
    await entry.instance.update(next);
    entry.props = next;
    entry.lastUpdateAt = Date.now();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function TamusoActivityEnd(
  type: TamusoActivityType,
  activityId: string,
  final?: Partial<TamusoLiveActivityProps>,
): Promise<void> {
  const key = mapKey(type, activityId);
  const entry = active.get(key);
  if (!entry) return;
  try {
    const props = final
      ? { ...entry.props, ...final, status: final.status ?? 'ended' }
      : { ...entry.props, status: 'ended' as const };
    await entry.instance.end('immediate', props);
  } catch {
    try {
      await entry.instance.end('immediate');
    } catch {
      /* ignore */
    }
  }
  active.delete(key);
}

export async function TamusoActivityEndAll(
  type?: TamusoActivityType,
): Promise<void> {
  const keys = [...active.keys()].filter((k) =>
    type ? k.startsWith(`${type}:`) : true,
  );
  await Promise.all(
    keys.map(async (k) => {
      const [t, id] = k.split(':') as [TamusoActivityType, string];
      await TamusoActivityEnd(t, id);
    }),
  );
}

export function TamusoActivityGetActive(): Array<{
  type: TamusoActivityType;
  activityId: string;
  props: TamusoLiveActivityProps;
  priority: number;
}> {
  return [...active.values()]
    .map((e) => ({
      type: e.type,
      activityId: e.activityId,
      props: e.props,
      priority: ACTIVITY_PRIORITY[e.type],
    }))
    .sort((a, b) => b.priority - a.priority);
}

export function TamusoActivityOpenDeepLink(
  type: TamusoActivityType,
  activityId: string,
): string {
  const entry = active.get(mapKey(type, activityId));
  return entry?.props.deepLink ?? deepLinkFor(type, activityId);
}

/** Recover instances after app relaunch */
export function TamusoActivityRecover(): void {
  if (Platform.OS !== 'ios') return;
  try {
    const instances = TamusoLiveActivity.getInstances?.() ?? [];
    for (const inst of instances) {
      try {
        // Props may be available on instance depending on expo-widgets version
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = (inst as any).props as TamusoLiveActivityProps | undefined;
        if (!p?.activityType || !p?.activityId) continue;
        const key = mapKey(p.activityType, p.activityId);
        if (active.has(key)) continue;
        active.set(key, {
          type: p.activityType,
          activityId: p.activityId,
          props: p,
          instance: inst,
          lastUpdateAt: Date.now(),
          startedAt: Date.now(),
        });
      } catch {
        /* ignore one */
      }
    }
  } catch {
    /* native unavailable */
  }
}
