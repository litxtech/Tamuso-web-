import { useEffect } from 'react';
import { Platform } from 'react-native';
import { type Href, router } from 'expo-router';
import { WebTanitimAnasayfa } from '../src/moduller/web-tanitim/WebTanitimAnasayfa';
import { WebTanitimKabuk } from '../src/moduller/web-tanitim/WebTanitimKabuk';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../src/contexts/AuthContext';
import { AcilisEkrani } from '../src/bilesenler/acilis/AcilisEkrani';
import { useTema } from '../src/tasarim-sistemi/tema/TemaSaglayici';
import { useCeviri } from '../src/i18n/useCeviri';
import {
  BekleyenPushHedefiAlVeTemizle,
  PushNavigasyonKapisiAc,
} from '../src/moduller/bildirimler/islemler/BekleyenPushHedefi';
import {
  BildirimHedefineGecikmeliGit,
  BildirimYanitiniIsle,
} from '../src/moduller/bildirimler/islemler/BildirimPushYonlendirme';

/**
 * Giriş kapısı — marka açılış + oturum yönlendirme.
 * Push tıklama cold start: getLastNotificationResponse → tabs → hedef.
 * Native splash auto-hide (expo-splash-screen native modülü bu build'de yok).
 */
export default function Index() {
  const { session, loading } = useAuth();
  const { hazir } = useTema();
  const { t } = useCeviri();

  useEffect(() => {
    if (loading || !hazir) return;
    let iptal = false;

    const kos = async () => {
      await new Promise((r) => setTimeout(r, 220));
      if (iptal) return;

      try {
        const yanit = await Notifications.getLastNotificationResponseAsync();
        if (!iptal) {
          BildirimYanitiniIsle(yanit, {
            oturumVar: !!session,
            hemenGit: false,
          });
        }
      } catch {
        /* Expo Go / izin yok */
      }
      if (iptal) return;

      if (!session) {
        PushNavigasyonKapisiAc();
        if (Platform.OS === 'web') return;
        router.replace('/(auth)/login' as Href);
        return;
      }

      const hedef = BekleyenPushHedefiAlVeTemizle();
      router.replace('/(tabs)');
      PushNavigasyonKapisiAc();
      if (hedef) {
        // Tabs settle — boş stack / race önlemi
        BildirimHedefineGecikmeliGit(hedef, 160);
      }
    };

    void kos();
    return () => {
      iptal = true;
    };
  }, [loading, session, hazir]);

  if (Platform.OS === 'web' && !loading && hazir && !session) {
    return (
      <WebTanitimKabuk>
        <WebTanitimAnasayfa />
      </WebTanitimKabuk>
    );
  }

  return (
    <AcilisEkrani
      altYazi={loading || !hazir ? t('auth.hazirlaniyor') : t('auth.aciliyor')}
    />
  );
}
