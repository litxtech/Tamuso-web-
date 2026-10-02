import { Linking, Alert } from 'react-native';
import type { BannerAction } from '../core/BannerTypes';
import {
  openInAppWebView,
  type ActionContext,
} from './BannerActionContext';
import { isSafeHttpsUrl } from '../webview/WebViewSecurity';
import i18n from '../../i18n';

export async function handleWebAction(
  action: BannerAction,
  ctx: ActionContext,
): Promise<{ ok: boolean; error?: string }> {
  const url = (action.url ?? action.target ?? '').trim();
  if (!url || url === 'https://' || url === 'http://') {
    Alert.alert(
      i18n.t('banner.eksikBaglantiBaslik'),
      i18n.t('banner.eksikBaglantiBody'),
    );
    return { ok: false, error: 'URL yok' };
  }

  const check = isSafeHttpsUrl(url);
  if (!check.ok) {
    Alert.alert(
      i18n.t('banner.gecersizBaglantiBaslik'),
      check.reason ?? i18n.t('banner.gecersizBaglantiBody'),
    );
    return { ok: false, error: check.reason };
  }

  // WEB_URL ve IN_APP_WEBVIEW → harici tarayıcı AÇILMAZ
  await openInAppWebView(
    check.url!,
    action.button_text ?? action.payload_json?.title as string | undefined,
    ctx,
  );
  return { ok: true };
}

/** Fallback — sadece güvenlik dışı acil durumlarda (kullanılmıyor varsayılan) */
export async function openExternalBrowser(url: string): Promise<void> {
  const check = isSafeHttpsUrl(url);
  if (!check.ok || !check.url) return;
  await Linking.openURL(check.url);
}
