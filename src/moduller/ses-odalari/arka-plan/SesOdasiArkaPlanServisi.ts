/**
 * Ses odası arka plan oturumu.
 * Bildirim yalnızca uygulama arka plana alınca 1 kez — odadayken gösterilmez.
 * Android: FGS ile süreç canlı kalır; iOS: UIBackgroundModes audio yeter.
 */

import { AppState, type AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { leaveRoom } from '../../../services/api';
import {
  AktifSesOdasiBitir,
  AktifSesOdasiDurumunuAl,
  AktifSesOdasiDinle,
} from '../oturum/AktifSesOdasiOturumu';
import { MedyaOdasiKes, MedyaSesOturumunuYenile } from '../../livekit/MedyaBaglantisi';
import { KonusmaciSesSeviyesi } from '../../livekit/ses/KonusmaciSesSeviyesi';

const FGS_ID = 88421;
const IOS_BILDIRIM_ID = 'ses-odasi-arka-plan';
const ANDROID_KANAL = 'ses_odasi_canli';

let kayitli = false;
/** Bildirim / FGS şu an ekranda mı — tekrar basma */
let gosteriliyor = false;
let gosterilenOdaId: string | null = null;
let temizleyiciler: Array<() => void> = [];

function safeRequireFgs(): typeof import('@supersami/rn-foreground-service').default | null {
  if (Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@supersami/rn-foreground-service').default;
  } catch {
    return null;
  }
}

async function androidKanalHazirla() {
  if (Platform.OS !== 'android') return;
  const izin = await Notifications.getPermissionsAsync().catch(() => null);
  if (izin && izin.status !== 'granted') {
    await Notifications.requestPermissionsAsync().catch(() => undefined);
  }
  await Notifications.setNotificationChannelAsync(ANDROID_KANAL, {
    name: i18n.t('sesOda.sesOdasi'),
    importance: Notifications.AndroidImportance.LOW,
    bypassDnd: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0],
    enableVibrate: false,
    showBadge: false,
  }).catch(() => undefined);
}

function appArkaPlandaMi(state?: AppStateStatus): boolean {
  const s = state ?? AppState.currentState;
  return s === 'background';
}

/**
 * Uygulama açılışında bir kez — headless task kaydı (Android).
 */
export function SesOdasiArkaPlanKurulum(): void {
  if (kayitli) return;
  kayitli = true;

  const Fgs = safeRequireFgs();
  if (Fgs) {
    try {
      Fgs.register({
        config: {
          alert: false,
          onServiceErrorCallBack: () => {
            gosteriliyor = false;
            gosterilenOdaId = null;
            console.warn('[SesOdasiArkaPlan] FGS hata');
          },
        },
      });
    } catch (e) {
      console.warn('[SesOdasiArkaPlan] register', e);
    }

    const unsub = Fgs.eventListener(
      (event: { main?: boolean; button?: boolean; button2?: boolean }) => {
        const durum = AktifSesOdasiDurumunuAl();
        if (!durum) return;
        if (event?.button2) {
          void SesOdasiArkaPlanTamamenCik();
          return;
        }
        try {
          router.push(`/room/${durum.roomId}` as any);
        } catch {
          /* ignore */
        }
      },
    );
    temizleyiciler.push(unsub);
  }

  void androidKanalHazirla();

  // Push / local bildirim tıklama → BildirimSaglayici + app/index (cold start)
  // Burada ayrı listener yok: çift navigasyon / stack race olmasın.

  // Oturum bitince bildirimi kaldır — odadayken ASLA başlatma
  const unsubDurum = AktifSesOdasiDinle((durum) => {
    if (!durum) {
      void SesOdasiArkaPlanDurdur();
      return;
    }
    // Ön planda / odadayken bildirim yok
    if (!appArkaPlandaMi()) {
      void SesOdasiArkaPlanDurdur();
    }
  });
  temizleyiciler.push(unsubDurum);

  // Yalnızca gerçek arka plan → 1 kez bildirim; ön plana dönüş → kaldır
  const appSub = AppState.addEventListener('change', (state) => {
    const durum = AktifSesOdasiDurumunuAl();
    if (!durum) {
      void SesOdasiArkaPlanDurdur();
      return;
    }

    if (state === 'background') {
      MedyaSesOturumunuYenile(false);
      void SesOdasiArkaPlanBaslat({
        roomId: durum.roomId,
        title: durum.title,
        yayinciMi: durum.micAcik,
      });
      return;
    }

    if (state === 'active') {
      MedyaSesOturumunuYenile(false);
      // Odadayken / ön planda bildirim gereksiz
      void SesOdasiArkaPlanDurdur();
    }
  });
  temizleyiciler.push(() => appSub.remove());
}

type BaslatGirdi = {
  roomId: string;
  title: string;
  yayinciMi?: boolean;
};

/** Sadece arka planda çağrılmalı — aynı oda için tekrar basmaz */
export async function SesOdasiArkaPlanBaslat(girdi: BaslatGirdi): Promise<void> {
  if (!appArkaPlandaMi()) return;
  if (!AktifSesOdasiDurumunuAl()) return;

  // Aynı oda için zaten gösteriliyor → tekrar bildirim yok
  if (gosteriliyor && gosterilenOdaId === girdi.roomId) return;

  const sesOdasi = i18n.t('sesOda.sesOdasi');
  const baslik = (girdi.title || sesOdasi).trim() || sesOdasi;
  const mesaj = i18n.t('sesOda.sesDevamOdayaDon');

  if (Platform.OS === 'android') {
    await androidKanalHazirla();
    const Fgs = safeRequireFgs();
    if (!Fgs) return;
    const ServiceType = girdi.yayinciMi ? 'microphone' : 'mediaPlayback';
    try {
      await Fgs.start({
        id: FGS_ID,
        title: baslik,
        message: mesaj,
        ServiceType,
        importance: 'low',
        vibration: false,
        icon: 'ic_launcher',
        largeIcon: 'ic_launcher',
        button: true,
        buttonText: i18n.t('sesOda.odayaDon'),
        buttonOnPress: 'mainOnPress',
        button2: true,
        button2Text: i18n.t('sesOda.cik'),
        button2OnPress: 'button2OnPress',
        mainOnPress: 'mainOnPress',
        color: '#E84091',
      } as any);
      gosteriliyor = true;
      gosterilenOdaId = girdi.roomId;
    } catch (e) {
      // Zaten çalışıyorsa sessiz geç
      if (Fgs.is_running()) {
        gosteriliyor = true;
        gosterilenOdaId = girdi.roomId;
      } else {
        console.warn('[SesOdasiArkaPlan] android start', e);
        gosteriliyor = false;
        gosterilenOdaId = null;
      }
    }
    return;
  }

  if (Platform.OS === 'ios') {
    try {
      const izin = await Notifications.getPermissionsAsync();
      if (izin.status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      // Eski kopyayı temizle, tek bildirim
      await Notifications.dismissNotificationAsync(IOS_BILDIRIM_ID).catch(
        () => undefined,
      );
      await Notifications.cancelScheduledNotificationAsync(IOS_BILDIRIM_ID).catch(
        () => undefined,
      );
      await Notifications.scheduleNotificationAsync({
        identifier: IOS_BILDIRIM_ID,
        content: {
          title: baslik,
          body: mesaj,
          data: { tip: 'ses_odasi', roomId: girdi.roomId },
          sound: false,
          sticky: true,
          autoDismiss: false,
        },
        trigger: null,
      });
      gosteriliyor = true;
      gosterilenOdaId = girdi.roomId;
    } catch (e) {
      console.warn('[SesOdasiArkaPlan] ios bildirim', e);
    }
  }
}

export async function SesOdasiArkaPlanDurdur(): Promise<void> {
  if (!gosteriliyor && Platform.OS === 'ios') {
    // Yine de iOS bildirimini temizle (orphan)
  }

  if (Platform.OS === 'android') {
    const Fgs = safeRequireFgs();
    if (Fgs && (gosteriliyor || Fgs.is_running())) {
      try {
        await Fgs.stopAll();
      } catch {
        try {
          await Fgs.stop();
        } catch {
          /* ignore */
        }
      }
    }
  }

  try {
    await Notifications.dismissNotificationAsync(IOS_BILDIRIM_ID);
  } catch {
    /* ignore */
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(IOS_BILDIRIM_ID);
  } catch {
    /* ignore */
  }

  gosteriliyor = false;
  gosterilenOdaId = null;
}

/** Bildirimden çık — LiveKit + oturum temizle */
export async function SesOdasiArkaPlanTamamenCik(): Promise<void> {
  const durum = AktifSesOdasiDurumunuAl();
  const roomId = durum?.roomId;
  KonusmaciSesSeviyesi.mockDurdur();
  await SesOdasiArkaPlanDurdur();
  await MedyaOdasiKes();
  AktifSesOdasiBitir();

  if (roomId) {
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (uid) await leaveRoom(roomId, uid).catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
}
