import i18n from '../../../i18n';
import { Alert, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ANDROID_BILDIRIM_KANALI,
  ANDROID_MESAJ_BILDIRIM_KANALI,
  MESAJ_BILDIRIM_SESI,
} from './BildirimKanallari';

const MESAJ_IZIN_SORULDU_KEY = 'tamuso_mesaj_push_izin_soruldu_v1';

export async function AndroidBildirimKanallariniKur(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_BILDIRIM_KANALI, {
    name: i18n.t('bildirimler.kanalGenel'),
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#E84091',
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(ANDROID_MESAJ_BILDIRIM_KANALI, {
    name: i18n.t('bildirimler.kanalMesajlar'),
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 180, 100, 180, 100, 180],
    lightColor: '#E84091',
    sound: MESAJ_BILDIRIM_SESI,
    enableVibrate: true,
    showBadge: true,
  });
}

export async function BildirimIzniDurumuAl(): Promise<
  Notifications.PermissionStatus
> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * OS bildirim iznini ister — FCM/APNs token'dan bağımsız.
 * iOS: alert/badge/sound. Android 13+: POST_NOTIFICATIONS.
 */
export async function BildirimIzniIste(): Promise<boolean> {
  try {
    await AndroidBildirimKanallariniKur();
  } catch (e) {
    console.warn('[Push] kanal', e instanceof Error ? e.message : e);
  }

  if (!Device.isDevice) {
    console.warn('[Push] Fiziksel cihaz gerekli.');
    return false;
  }

  const mevcut = await Notifications.getPermissionsAsync();
  if (mevcut.granted || mevcut.status === 'granted') return true;

  if (mevcut.status === 'denied' && mevcut.canAskAgain === false) {
    console.warn('[Push] Bildirim izni kalıcı reddedilmiş.');
    return false;
  }

  const req = await Notifications.requestPermissionsAsync(
    Platform.OS === 'ios'
      ? {
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: false,
            allowProvisional: false,
          },
        }
      : undefined,
  );

  return !!(req.granted || req.status === 'granted');
}

/**
 * Mesajlar sekmesi odaklanınca: açıklama + OS izni (bir kez).
 */
export async function MesajPushIzniGerekirseIste(): Promise<{
  granted: boolean;
  asked: boolean;
}> {
  if (!Device.isDevice) {
    return { granted: false, asked: false };
  }

  try {
    await AndroidBildirimKanallariniKur();
  } catch {
    /* ignore */
  }

  const perm = await Notifications.getPermissionsAsync();
  if (perm.granted || perm.status === 'granted') {
    return { granted: true, asked: false };
  }

  if (perm.status === 'denied' && perm.canAskAgain === false) {
    return { granted: false, asked: false };
  }

  const once = await AsyncStorage.getItem(MESAJ_IZIN_SORULDU_KEY);
  if (once === '1') {
    return { granted: false, asked: false };
  }

  return await new Promise((resolve) => {
    Alert.alert(
      i18n.t('bildirimler.mesajBaslik'),
      Platform.OS === 'ios'
        ? i18n.t('bildirimler.mesajBodyIos')
        : i18n.t('bildirimler.mesajBodyAndroid'),
      [
        {
          text: i18n.t('bildirimler.simdiDegil'),
          style: 'cancel',
          onPress: () => {
            void AsyncStorage.setItem(MESAJ_IZIN_SORULDU_KEY, '1');
            resolve({ granted: false, asked: true });
          },
        },
        {
          text: i18n.t('bildirimler.izinVer'),
          onPress: () => {
            void (async () => {
              const granted = await BildirimIzniIste();
              await AsyncStorage.setItem(MESAJ_IZIN_SORULDU_KEY, '1');
              resolve({ granted, asked: true });
            })();
          },
        },
      ],
      { cancelable: true },
    );
  });
}
