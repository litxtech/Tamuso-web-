import { Linking, Alert } from 'react-native';
import type { BannerAction } from '../core/BannerTypes';
import { isSafeHttpsUrl } from '../webview/WebViewSecurity';
import i18n from '../../i18n';

/**
 * Genel external app resolver — Telegram, YouTube, TikTok, X, Facebook, Maps.
 * Her platform için ayrı zorunlu handler yok.
 */
type AppResolver = {
  schemes: string[];
  webFallback?: (target: string, payload: Record<string, unknown>) => string | null;
};

const RESOLVERS: Record<string, AppResolver> = {
  telegram: {
    schemes: ['tg://', 'telegram://'],
    webFallback: (t) =>
      t.startsWith('http') ? t : `https://t.me/${t.replace(/^@/, '')}`,
  },
  youtube: {
    schemes: ['youtube://', 'vnd.youtube://'],
    webFallback: (t) =>
      t.startsWith('http') ? t : `https://www.youtube.com/${t}`,
  },
  tiktok: {
    schemes: ['tiktok://', 'snssdk1128://'],
    webFallback: (t) =>
      t.startsWith('http') ? t : `https://www.tiktok.com/@${t.replace(/^@/, '')}`,
  },
  x: {
    schemes: ['twitter://'],
    webFallback: (t) =>
      t.startsWith('http') ? t : `https://x.com/${t.replace(/^@/, '')}`,
  },
  twitter: {
    schemes: ['twitter://'],
    webFallback: (t) =>
      t.startsWith('http') ? t : `https://x.com/${t.replace(/^@/, '')}`,
  },
  facebook: {
    schemes: ['fb://'],
    webFallback: (t) =>
      t.startsWith('http') ? t : `https://www.facebook.com/${t}`,
  },
  maps: {
    schemes: ['maps://', 'geo:'],
    webFallback: (t) =>
      t.startsWith('http')
        ? t
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`,
  },
};

export async function handleExternalApp(
  action: BannerAction,
): Promise<{ ok: boolean; error?: string }> {
  const payload = action.payload_json ?? {};
  const app = String(payload.app ?? payload.provider ?? action.target ?? '')
    .toLowerCase()
    .trim();
  const target = String(
    payload.target ?? action.url ?? action.target ?? '',
  ).trim();

  const resolver = RESOLVERS[app];
  if (!resolver) {
    const url = action.url ?? target;
    if (!url) {
      Alert.alert(
        i18n.t('banner.uygulamaBaslik'),
        i18n.t('banner.hedefTanimliDegil'),
      );
      return { ok: false, error: 'no_target' };
    }
    try {
      const can = await Linking.canOpenURL(url);
      if (can) {
        await Linking.openURL(url);
        return { ok: true };
      }
    } catch {
      /* */
    }
    Alert.alert(
      i18n.t('banner.uygulamaBaslik'),
      i18n.t('banner.uygulamaAcilamadi'),
    );
    return { ok: false, error: 'open_failed' };
  }

  const deep = String(payload.deepLink ?? '');
  if (deep) {
    try {
      const can = await Linking.canOpenURL(deep);
      if (can) {
        await Linking.openURL(deep);
        return { ok: true };
      }
    } catch {
      /* */
    }
  }

  for (const scheme of resolver.schemes) {
    const candidate = deep || `${scheme}${target.replace(/^\/+/, '')}`;
    try {
      const can = await Linking.canOpenURL(candidate);
      if (can) {
        await Linking.openURL(candidate);
        return { ok: true };
      }
    } catch {
      /* next */
    }
  }

  const web = resolver.webFallback?.(target, payload);
  if (web) {
    const check = isSafeHttpsUrl(web);
    if (check.ok && check.url) {
      await Linking.openURL(check.url);
      return { ok: true };
    }
  }

  Alert.alert(
    i18n.t('banner.uygulamaBaslik'),
    i18n.t('banner.uygulamaAdAcilamadi', { app }),
  );
  return { ok: false, error: 'open_failed' };
}
