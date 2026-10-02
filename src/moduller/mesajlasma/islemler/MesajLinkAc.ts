import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import { openUrlSafely } from '../../../banner/webview/openUrlSafely';
import i18n from '../../../i18n';
import { MesajUrlNormalize } from '../yardimcilar/MesajUrlAyikla';

/**
 * Mesajdaki her linki aç:
 * - Uygulama deep link / path → router
 * - https → uygulama içi webview
 * - http / mailto / tel / diğer → sistem Linking
 */
export async function MesajLinkAc(hamUrl: string): Promise<boolean> {
  const url = MesajUrlNormalize(hamUrl);
  if (!url) {
    Alert.alert(
      i18n.t('mesajV2.openLink'),
      i18n.t('webview.gecersizUrl'),
    );
    return false;
  }

  const lower = url.toLowerCase();
  const scheme = (OrtamDegiskenleri.uygulamaSemasi || 'muta').toLowerCase();

  // mailto / tel
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }

  // App scheme: muta://mesaj/… → /mesaj/…
  if (lower.startsWith(`${scheme}:`)) {
    const path = ExpoLinking.parse(url).path;
    const hedef = path
      ? path.startsWith('/')
        ? path
        : `/${path}`
      : null;
    if (hedef) {
      try {
        router.push(hedef as never);
        return true;
      } catch {
        /* fall through */
      }
    }
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Absolute in-app path (nadir — /mesaj/uuid)
  if (url.startsWith('/') && !url.startsWith('//')) {
    try {
      router.push(url as never);
      return true;
    } catch {
      return false;
    }
  }

  // https → in-app webview
  if (lower.startsWith('https://')) {
    try {
      router.push({
        pathname: '/webview',
        params: { url, title: i18n.t('mesajV2.openLink') },
      } as never);
      return true;
    } catch {
      const r = await openUrlSafely(url);
      return r === 'linking';
    }
  }

  // http ve diğerleri
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    /* ignore */
  }

  // http → https dene (webview)
  if (lower.startsWith('http://')) {
    const https = `https://${url.slice('http://'.length)}`;
    try {
      router.push({
        pathname: '/webview',
        params: { url: https, title: i18n.t('mesajV2.openLink') },
      } as never);
      return true;
    } catch {
      const r = await openUrlSafely(https);
      return r === 'linking';
    }
  }

  Alert.alert(
    i18n.t('mesajV2.openLink'),
    i18n.t('webview.gecersizBaglantiBody'),
  );
  return false;
}
