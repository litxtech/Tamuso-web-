/**
 * App Launch Center API — thin Supabase RPC wrappers.
 */
import { supabase } from '../../../lib/supabase';
import {
  DepoyaMedyaYukle,
  MedyaUzantisiCoz,
} from '../../../ortak/medya/DepoyaMedyaYukle';
import type {
  LaunchAnalytics,
  LaunchApp,
  LaunchChildKind,
  LaunchDeletionRequest,
  LaunchMediaItem,
  LaunchSubscriber,
  LaunchSupportTicket,
  LaunchTemplate,
  LegalDocType,
} from './tipler';

const BUCKET = 'app-launch-media';

function asObj(data: unknown): any {
  return data && typeof data === 'object' ? data : {};
}

function asArr<T>(data: unknown, key?: string): T[] {
  if (Array.isArray(data)) return data as T[];
  const o = asObj(data);
  if (key && Array.isArray(o[key])) return o[key] as T[];
  if (Array.isArray(o.apps)) return o.apps as T[];
  if (Array.isArray(o.items)) return o.items as T[];
  return [];
}

export async function adminLaunchAppsList(
  filter: string = 'all',
): Promise<LaunchApp[]> {
  const { data, error } = await supabase.rpc('admin_launch_apps_list', {
    p_filter: filter,
  });
  if (error) throw new Error(error.message);
  return asArr<LaunchApp>(data, 'apps');
}

export async function adminLaunchAppGet(id: string): Promise<LaunchApp> {
  const { data, error } = await supabase.rpc('admin_launch_app_get', {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as LaunchApp;
}

export async function adminLaunchAppUpsert(
  payload: Partial<LaunchApp> & Record<string, unknown>,
): Promise<LaunchApp> {
  const { data, error } = await supabase.rpc('admin_launch_app_upsert', {
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as LaunchApp;
}

export async function adminLaunchAppPublish(id: string): Promise<LaunchApp> {
  const { data, error } = await supabase.rpc('admin_launch_app_publish', {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as LaunchApp;
}

export async function adminLaunchAppUnpublish(id: string): Promise<LaunchApp> {
  const { data, error } = await supabase.rpc('admin_launch_app_unpublish', {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as LaunchApp;
}

export async function adminLaunchAppDuplicate(
  id: string,
  name: string,
): Promise<LaunchApp> {
  const { data, error } = await supabase.rpc('admin_launch_app_duplicate', {
    p_id: id,
    p_name: name,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as LaunchApp;
}

export async function adminLaunchAppArchive(id: string): Promise<LaunchApp> {
  const { data, error } = await supabase.rpc('admin_launch_app_archive', {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as LaunchApp;
}

export async function adminLaunchAppDelete(id: string): Promise<{ ok?: boolean }> {
  const { data, error } = await supabase.rpc('admin_launch_app_delete', {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function adminLaunchChildrenSet(
  appId: string,
  kind: LaunchChildKind,
  items: unknown[],
): Promise<LaunchApp | Record<string, unknown>> {
  const { data, error } = await supabase.rpc('admin_launch_children_set', {
    p_app_id: appId,
    p_kind: kind,
    p_items: items,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function adminLaunchLegalUpsert(
  appId: string,
  docType: LegalDocType | string,
  locale: string,
  body: string,
  vars: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('admin_launch_legal_upsert', {
    p_app_id: appId,
    p_doc_type: docType,
    p_locale: locale,
    p_body: body,
    p_vars: vars,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function adminLaunchAnalyticsSummary(
  appId: string,
): Promise<LaunchAnalytics> {
  const { data, error } = await supabase.rpc('admin_launch_analytics_summary', {
    p_app_id: appId,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as LaunchAnalytics;
}

export async function adminLaunchSubscribersList(
  appId: string,
): Promise<LaunchSubscriber[]> {
  const { data, error } = await supabase.rpc('admin_launch_subscribers_list', {
    p_app_id: appId,
  });
  if (error) throw new Error(error.message);
  return asArr<LaunchSubscriber>(data, 'subscribers');
}

export async function adminLaunchDeletionRequestsList(
  appId?: string | null,
): Promise<LaunchDeletionRequest[]> {
  const { data, error } = await supabase.rpc(
    'admin_launch_deletion_requests_list',
    { p_app_id: appId ?? null },
  );
  if (error) throw new Error(error.message);
  return asArr<LaunchDeletionRequest>(data, 'requests');
}

export async function adminLaunchDeletionRequestUpdate(
  id: string,
  status: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc(
    'admin_launch_deletion_request_update',
    { p_id: id, p_status: status },
  );
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function adminLaunchSupportTicketsList(
  appId?: string | null,
): Promise<LaunchSupportTicket[]> {
  const { data, error } = await supabase.rpc(
    'admin_launch_support_tickets_list',
    { p_app_id: appId ?? null },
  );
  if (error) throw new Error(error.message);
  return asArr<LaunchSupportTicket>(data, 'tickets');
}

export async function adminLaunchTemplatesList(): Promise<LaunchTemplate[]> {
  const { data, error } = await supabase.rpc('admin_launch_templates_list');
  if (error) throw new Error(error.message);
  const rows = asArr<LaunchTemplate>(data, 'templates');
  return rows;
}

export async function adminLaunchMediaList(
  appId: string,
): Promise<LaunchMediaItem[]> {
  const { data, error } = await supabase.rpc('admin_launch_media_list', {
    p_app_id: appId,
  });
  if (error) throw new Error(error.message);
  return asArr<LaunchMediaItem>(data, 'media');
}

/** Public RPCs */

export async function launchAppPublicGet(
  slug: string,
  previewToken?: string | null,
): Promise<LaunchApp> {
  const { data, error } = await supabase.rpc('launch_app_public_get', {
    p_slug: slug,
    p_preview_token: previewToken ?? null,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as LaunchApp;
}

export async function launchAppEventTrack(
  slug: string,
  event: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.rpc('launch_app_event_track', {
    p_slug: slug,
    p_event: event,
    p_meta: meta,
  });
  if (error) throw new Error(error.message);
}

export async function launchAppNotifySubscribe(
  slug: string,
  email: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('launch_app_notify_subscribe', {
    p_slug: slug,
    p_email: email,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function launchAppSupportSubmit(
  slug: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('launch_app_support_submit', {
    p_slug: slug,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function launchAppDeletionRequest(
  slug: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('launch_app_deletion_request', {
    p_slug: slug,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return asObj(data);
}

export async function launchAppSmartRedirect(
  slug: string,
  platform?: string | null,
): Promise<{ url?: string | null }> {
  const { data, error } = await supabase.rpc('launch_app_smart_redirect', {
    p_slug: slug,
    p_platform: platform ?? null,
  });
  if (error) throw new Error(error.message);
  return asObj(data) as { url?: string | null };
}

export async function uploadAsset(
  appSlug: string,
  folder: string,
  uri: string,
  mime?: string | null,
): Promise<{ url: string; path: string }> {
  const slug = (appSlug || 'untitled').replace(/[^a-z0-9-_]/gi, '-');
  const folderSafe = (folder || 'misc').replace(/[^a-z0-9-_]/gi, '-');
  const ext = MedyaUzantisiCoz(uri, mime, 'jpg');
  const path = `apps/${slug}/${folderSafe}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;

  const tur =
    (mime ?? '').startsWith('video/')
      ? 'video'
      : (mime ?? '').startsWith('audio/')
        ? 'audio'
        : 'image';

  const yukleme = await DepoyaMedyaYukle(supabase, {
    bucket: BUCKET,
    path,
    uri,
    mime,
    tur,
    upsert: true,
  });
  if (!yukleme.ok) throw new Error(yukleme.hata);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(yukleme.path);
  return { url: urlData.publicUrl, path: yukleme.path };
}
