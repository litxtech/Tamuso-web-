import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { type Href, Tabs, router } from 'expo-router';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  TabsBirKezMountMu,
  TabsMountIsaretle,
} from '../../src/components/tab-navigasyon/TabBarGuvenlik';
import { useCeviri } from '../../src/i18n/useCeviri';

/**
 * Sekme ekranları — tab BAR burada YOK.
 * Bar root’ta (YuzenTabBar) — oda modal’ı Tabs’ı dondursa bile bozulmaz.
 */
export default function TabsLayout() {
  const { session, loading } = useAuth();
  const { t } = useCeviri();

  useEffect(() => {
    if (session) TabsMountIsaretle();
  }, [session]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        if (path === '/' || path.startsWith('/tanitim')) {
          router.replace((path === '/' ? '/tanitim' : path) as Href);
          return;
        }
      }
      router.replace('/(auth)/login');
    }
  }, [loading, session]);

  const tabsKoruma = TabsBirKezMountMu() || !!session;

  if (!tabsKoruma) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: RenkTokenlari.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={RenkTokenlari.primary} size="large" />
      </View>
    );
  }

  return (
    <ModulHataSiniri
      modulAdi="ana-navigasyon"
      varyant="ekran"
      fallbackHref="/(auth)/login"
    >
      <Tabs
        backBehavior="none"
        detachInactiveScreens
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
          animation: 'none',
          lazy: true,
          freezeOnBlur: true,
          tabBarStyle: {
            display: 'none',
            height: 0,
            overflow: 'hidden',
            borderTopWidth: 0,
            elevation: 0,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('sekmeler.anaSayfa'),
            lazy: false,
            freezeOnBlur: false,
          }}
        />
        <Tabs.Screen
          name="durum"
          options={{ title: t('sekmeler.durum'), lazy: true }}
        />
        <Tabs.Screen
          name="create"
          options={{ title: t('sekmeler.olustur'), lazy: true }}
        />
        <Tabs.Screen
          name="messages"
          options={{ title: t('sekmeler.mesajlar'), lazy: true }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: t('sekmeler.profil'), lazy: true }}
        />
        <Tabs.Screen
          name="rooms"
          options={{ href: null, title: t('sekmeler.odalar') }}
        />
        <Tabs.Screen
          name="wallet"
          options={{ href: null, title: t('sekmeler.cuzdan') }}
        />
        <Tabs.Screen
          name="cihazlar"
          options={{ href: null, title: t('sekmeler.cihazlar') }}
        />
      </Tabs>
    </ModulHataSiniri>
  );
}
