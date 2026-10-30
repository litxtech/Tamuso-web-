import { AnalyticsOlayEkle } from '../../guvenlik/analytics/AnalyticsOlayEkle';

const OLAYLAR = [
  'agency_room_opened',
  'agency_room_created',
  'agency_meeting_created',
  'agency_meeting_joined',
  'agency_meeting_started',
  'agency_meeting_ended',
  'agency_invitation_sent',
  'agency_invitation_accepted',
  'agency_invitation_declined',
  'agency_profile_opened',
  'agency_recruitment_meeting_started',
  'agency_room_message_sent',
  'agency_room_reported',
  'tamuso_official_meeting_joined',
] as const;

export type AjansGorusmeAnalitikOlayi = (typeof OLAYLAR)[number];

export function AjansGorusmeAnalitik(
  olay: AjansGorusmeAnalitikOlayi,
  props?: Record<string, string | number | boolean | null>,
): void {
  void AnalyticsOlayEkle(olay, { source: 'agency_meeting', ...(props ?? {}) });
}
