import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { BildirimIzniIste } from './BildirimIzniIste';
import {
  ANDROID_ARAMA_BILDIRIM_KANALI,
  ANDROID_BILDIRIM_KANALI,
  ANDROID_MESAJ_BILDIRIM_KANALI,
  ARAMA_BILDIRIM_SESI,
  MESAJ_BILDIRIM_SESI,
} from './BildirimKanallari';

export {
  ANDROID_ARAMA_BILDIRIM_KANALI,
  ANDROID_BILDIRIM_KANALI,
  ANDROID_MESAJ_BILDIRIM_KANALI,
  ARAMA_BILDIRIM_SESI,
  MESAJ_BILDIRIM_SESI,
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = String(
      (notification.request.content.data as { type?: string } | undefined)
        ?.type ?? '',
    );
    const isCall = type === 'incoming_call';
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: !isCall,
    };
  },
});

function androidFcmHazirMi(): boolean {
  return Constants.expoConfig?.extra?.androidFcmEnabled === true;
}

/**
 * Android: native FCM device token (Firebase).
 * google-services.json + native build gerekir.
 */
export async function AndroidFcmTokeniniAl(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  // İzin FCM'den bağımsız — her zaman dene
  if (!(await BildirimIzniIste())) return null;

  if (!androidFcmHazirMi()) {
    console.warn(
      '[Push] FCM kapalı — google-services.json ekleyip yeni Android build al.',
    );
    return null;
  }

  try {
    const device = await Notifications.getDevicePushTokenAsync();
    if (device?.type === 'fcm' && typeof device.data === 'string' && device.data) {
      return device.data;
    }
    if (typeof device?.data === 'string' && device.data) {
      return device.data;
    }
    console.warn('[Push] FCM token alınamadı — google-services.json / yeni build gerekli.');
    return null;
  } catch (e) {
    console.warn('[Push] FCM', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Expo Push Token (iOS APNs / Android FCM Expo üzerinden).
 * Android'de asıl kanal FCM native; Expo token yedek / EAS push için.
 */
export async function ExpoPushTokeniniAl(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  // Önce OS izni — FCM bayrağından bağımsız (dialog çıksın)
  if (!(await BildirimIzniIste())) return null;

  if (Platform.OS === 'android' && !androidFcmHazirMi()) {
    console.warn(
      '[Push] Expo token (Android) FCM ister — google-services.json yok.',
    );
    return null;
  }

  if (!Device.isDevice) {
    console.warn('[Push] Fiziksel cihaz gerekli.');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId || typeof projectId !== 'string') {
    console.warn('[Push] EAS projectId yok.');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch (e) {
    console.warn('[Push] Expo token', e instanceof Error ? e.message : e);
    return null;
  }
}
