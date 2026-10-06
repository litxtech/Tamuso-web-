import { AnalyticsOlayEkle } from '../../guvenlik/analytics/AnalyticsOlayEkle';

const OLAYLAR = [
  'story_tray_open',
  'story_tray_tap',
  'story_create_open',
  'story_create_publish',
  'story_create_fail',
  'story_view_start',
  'story_view_complete',
  'story_reply',
  'story_react',
  'story_gift_open',
  'story_mute',
  'story_unmute',
  'story_delete',
  'story_share_to',
  'story_archive_open',
] as const;

export type HikayeAnalitikOlayi = (typeof OLAYLAR)[number];

/** PII gönderme — yalnızca olay tipi + güvenli meta */
export function HikayeAnalitik(
  olay: HikayeAnalitikOlayi,
  props?: Record<string, unknown>,
): void {
  void AnalyticsOlayEkle(olay, { source: 'story', ...(props ?? {}) });
}
