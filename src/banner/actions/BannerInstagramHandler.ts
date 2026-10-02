import { Linking, Alert } from 'react-native';
import type { BannerAction } from '../core/BannerTypes';
import {
  openInAppWebView,
  type ActionContext,
} from './BannerActionContext';
import { isSafeHttpsUrl } from '../webview/WebViewSecurity';
import i18n from '../../i18n';

function resolveInstagram(action: BannerAction): {
  username?: string;
  webUrl: string;
  appUrl?: string;
} {
  const payload = action.payload_json ?? {};
  let username = String(
    payload.username ?? action.target ?? '',
  ).replace(/^@/, '').trim();
  let webUrl = String(action.url ?? payload.profileUrl ?? '').trim();

  if (!webUrl && username) {
    webUrl = `https://www.instagram.com/${username}/`;
  }
  if (!username && webUrl) {
    const m = webUrl.match(/instagram\.com\/([^/?#]+)/i);
    if (m) username = m[1];
  }

  return {
    username: username || undefined,
    webUrl,
    appUrl: username ? `instagram://user?username=${username}` : undefined,
  };
}

export async function handleInstagram(
  action: BannerAction,
  ctx: ActionContext,
): Promise<{ ok: boolean; error?: string }> {
  const { username, webUrl, appUrl } = resolveInstagram(action);
  if (!webUrl && !username) {
    Alert.alert(i18n.t('banner.instagram'), i18n.t('banner.profilTanimliDegil'));
    return { ok: false, error: 'no_profile' };
  }

  try {
    if (appUrl) {
      const can = await Linking.canOpenURL(appUrl);
      if (can) {
        await Linking.openURL(appUrl);
        return { ok: true };
      }
    }
  } catch {
    /* fall through to webview */
  }

  const check = isSafeHttpsUrl(webUrl || `https://www.instagram.com/${username}/`);
  if (!check.ok || !check.url) {
    return { ok: false, error: check.reason };
  }

  await openInAppWebView(check.url, username ? `@${username}` : 'Instagram', ctx);
  return { ok: true };
}
