/**
 * Tamuso Activity — typed models for Dynamic Island / Live Activities.
 * No coin/diamond/earnings/payment/private message content.
 */

export type TamusoActivityType =
  | 'call'
  | 'video_call'
  | 'voice_room'
  | 'live_stream'
  | 'upload'
  | 'ai_music'
  | 'tournament';

export type TamusoActivityStatus =
  | 'active'
  | 'connecting'
  | 'reconnecting'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'ended';

/** Props rendered by the Live Activity widget (must be JSON-serializable). */
export type TamusoLiveActivityProps = {
  activityType: TamusoActivityType;
  activityId: string;
  status: TamusoActivityStatus;
  title: string;
  subtitle: string;
  /** Elapsed / remaining displayed as text (timer dates preferred when possible). */
  timeLabel: string;
  /** Participant or viewer count label, e.g. "128 kişi" — empty if N/A */
  countLabel: string;
  /** 0..100 for upload/AI; -1 if not applicable */
  progress: number;
  /** SF Symbol-ish glyph key for leading icon */
  iconKey: string;
  /** Deep link opened when user taps the activity */
  deepLink: string;
  /** Accent hint: call | live | room | upload | music | tournament */
  accent: string;
};

export const ACTIVITY_PRIORITY: Record<TamusoActivityType, number> = {
  call: 100,
  video_call: 95,
  live_stream: 80,
  voice_room: 70,
  upload: 50,
  ai_music: 40,
  tournament: 30,
};

export function activityIconKey(type: TamusoActivityType): string {
  switch (type) {
    case 'call':
      return 'phone.fill';
    case 'video_call':
      return 'video.fill';
    case 'voice_room':
      return 'headphones';
    case 'live_stream':
      return 'dot.radiowaves.left.and.right';
    case 'upload':
      return 'arrow.up.circle.fill';
    case 'ai_music':
      return 'music.note';
    case 'tournament':
      return 'trophy.fill';
    default:
      return 'app.fill';
  }
}

export function activityAccent(type: TamusoActivityType): string {
  switch (type) {
    case 'call':
    case 'video_call':
      return 'call';
    case 'live_stream':
      return 'live';
    case 'voice_room':
      return 'room';
    case 'upload':
      return 'upload';
    case 'ai_music':
      return 'music';
    case 'tournament':
      return 'tournament';
    default:
      return 'default';
  }
}

export type CallUiState =
  | 'IDLE'
  | 'RINGING'
  | 'ACCEPTING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'ENDED'
  | 'DECLINED'
  | 'MISSED'
  | 'FAILED';
