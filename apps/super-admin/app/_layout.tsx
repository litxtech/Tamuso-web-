import '../web-oturum-baslat';
import React from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../../../src/contexts/AuthContext';
import { DilSaglayici } from '../../../src/i18n/DilSaglayici';
import { TemaSaglayici, useTema } from '../../../src/tasarim-sistemi/tema/TemaSaglayici';
import { OzellikBayrakSaglayici } from '../../../src/moduller/ozellik-bayraklari/OzellikBayrakSaglayici';
import { CuzdanUiProvider } from '../../../src/moduller/cuzdan/ui-config/useCuzdanUiConfig';
import { WebAlertKatmani } from '../../../src/ortak/web/WebAlertKatmani';
import { AdminOturumKapisi } from '../../../src/moduller/admin/web/AdminOturumKapisi';
import { adminKayitlariniTemizle } from '../../../src/moduller/admin/web/AdminKayitGuvenligi';
import { adminGecmisKalkaniniKur } from '../../../src/moduller/admin/web/AdminGecmisKalkani';

/**
 * Super Admin kök yerleşimi.
 *
 * Mobil uygulamadan ayrılmıştır: bu binary iOS/Android mağazasına gönderilmez.
 * Yalnızca tarayıcıda, personel hesapları için çalışır.
 */

// Konsol kayıtları kimlik bilgisi sızdırmasın diye erkenden süzülür.
adminKayitlariniTemizle();

function DilKoku({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  return (
    <DilSaglayici
      profilDili={profile?.language ?? null}
      profilUlke={profile?.country_code ?? null}
    >
      {children}
    </DilSaglayici>
  );
}

function KokIcerik() {
  const { palet } = useTema();

  // Geri tuşu panelin dışına düşmesin.
  React.useEffect(() => adminGecmisKalkaniniKur(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palet.bg }}>
      <AuthProvider>
        <AdminOturumKapisi>
          <DilKoku>
            <OzellikBayrakSaglayici>
              <CuzdanUiProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: palet.bg },
                    animation: Platform.OS === 'web' ? 'none' : 'slide_from_right',
                  }}
                />
                <WebAlertKatmani />
              </CuzdanUiProvider>
            </OzellikBayrakSaglayici>
          </DilKoku>
        </AdminOturumKapisi>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <TemaSaglayici>
      <KokIcerik />
    </TemaSaglayici>
  );
}
