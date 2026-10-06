import { Platform, InteractionManager } from 'react-native';
import { supabase } from '../../../lib/supabase';
import {
  CihazKimliginiGetir,
  CihazPlatformunuGetir,
  UygulamaVersiyonunuGetir,
} from '../../kimlik-dogrulama/oturum/CihazKimliginiGetir';
import {
  AndroidFcmTokeniniAl,
  ExpoPushTokeniniAl,
} from './ExpoPushTokeniniAl';
import { BildirimIzniIste } from './BildirimIzniIste';

type PushProvider = 'apns' | 'fcm' | 'expo' | 'none';

function tokenDoluMu(token: string | null | undefined): token is string {
  return typeof token === 'string' && token.trim().length > 8;
}

async function tokenKaydet(
  deviceId: string,
  platform: string,
  provider: PushProvider,
  pushToken: string,
): Promise<{ ok: boolean; hata?: string }> {
  if (!tokenDoluMu(pushToken) || provider === 'none') {
    return { ok: false, hata: 'bos_token' };
  }
  const { error } = await supabase.rpc('cihaz_push_token_kaydet', {
    p_device_id: deviceId,
    p_platform: platform === 'unknown' ? 'web' : platform,
    p_push_provider: provider,
    p_push_token: pushToken.trim(),
    p_app_version: UygulamaVersiyonunuGetir(),
    p_locale: null,
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

/**
 * Android → Firebase FCM device token (asıl) + Expo yedek.
 * iOS → yalnızca dolu Expo Push Token (APNs Expo üzerinden).
 * Boş apns/fcm satırı ASLA yazılmaz.
 */
export async function CihazPushTokeniniKaydet(input?: {
  pushToken?: string | null;
}): Promise<{ ok: boolean; hata?: string; token?: string | null }> {
  try {
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => resolve());
    });

    await BildirimIzniIste();

    const deviceId = await CihazKimliginiGetir();
    const platform = CihazPlatformunuGetir();
    const plat = platform === 'unknown' ? 'web' : platform;

    if (Platform.OS === 'android') {
      const fcm =
        input?.pushToken && !input.pushToken.startsWith('ExponentPushToken')
          ? input.pushToken
          : await AndroidFcmTokeniniAl();

      if (tokenDoluMu(fcm)) {
        const r = await tokenKaydet(deviceId, plat, 'fcm', fcm);
        if (!r.ok) return { ...r, token: fcm };
        // FCM ana kanal — Expo yedek kayıt etme (çift bildirim)
        return { ok: true, token: fcm };
      }

      const expo = await ExpoPushTokeniniAl();
      if (tokenDoluMu(expo)) {
        await tokenKaydet(deviceId, plat, 'expo', expo);
        return { ok: true, token: expo };
      }

      return {
        ok: false,
        hata: 'Bildirim izni veya FCM/Expo token yok',
        token: null,
      };
    }

    // iOS: sadece Expo token — boş apns kaydı yok
    const pushToken =
      tokenDoluMu(input?.pushToken) &&
      input!.pushToken!.startsWith('ExponentPushToken')
        ? input!.pushToken!.trim()
        : await ExpoPushTokeniniAl();

    if (!tokenDoluMu(pushToken)) {
      return {
        ok: false,
        hata: 'Expo push token alınamadı (izin veya APNs/build)',
        token: null,
      };
    }

    const r = await tokenKaydet(deviceId, plat, 'expo', pushToken);
    if (!r.ok) return { ...r, token: pushToken };
    return { ok: true, token: pushToken };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : 'push kayit hatasi',
    };
  }
}

export function BildirimPlatformuSec(): PushProvider {
  if (Platform.OS === 'ios') return 'apns';
  if (Platform.OS === 'android') return 'fcm';
  return 'none';
}
