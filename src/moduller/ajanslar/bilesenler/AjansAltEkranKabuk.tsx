import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/Screen';
import { EkranBasligi, guvenliGeriDon } from '../../../components/EkranBasligi';
import { ModulHataSiniri } from '../../../ortak/hata-sinirlari/ModulHataSiniri';
import { AjansAtmosfer } from './AjansAtmosfer';
import { AjansBolumRayi } from './AjansBolumRayi';
import { AjansCekmeceMenu, AjansMenuDugmesi } from './AjansCekmeceMenu';
import { ajansHref } from '../kancalar/useAjansRouteId';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { BoslukTokenlari, HeaderTokenlari } from '../../../tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useTemayaAboneOl } from '../../../tasarim-sistemi/tema/useTemayaAboneOl';

export {
  AjansKart,
  AjansBolumBaslik,
  AjansHint,
  AjansBos,
  AjansInput,
  AjansCta,
  AjansKpiHucre,
  AjansListeSatir,
  AjansCanliNokta,
  AjansHeroKapak,
} from './AjansYonetimPrimitifleri';

export function AjansAltEkranKabuk({
  agencyId,
  agencyName,
  title,
  subtitle,
  aktif,
  yukleniyor,
  refreshing,
  children,
  onRefresh,
}: {
  agencyId: string;
  agencyName?: string | null;
  title: string;
  subtitle?: string;
  aktif: string;
  yukleniyor?: boolean;
  refreshing?: boolean;
  children: React.ReactNode;
  onRefresh?: () => void;
}) {
  useTemayaAboneOl();
  const [menuAcik, setMenuAcik] = useState(false);

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri
        modulAdi={`ajans-${aktif}`}
        varyant="ekran"
        fallbackHref={ajansHref(agencyId) as any}
      >
        <View style={styles.root}>
          <AjansAtmosfer />
          <EkranBasligi
            title={title}
            subtitle={subtitle}
            border
            onBack={() => guvenliGeriDon(ajansHref(agencyId) as any)}
            right={<AjansMenuDugmesi onPress={() => setMenuAcik(true)} />}
          />
          <AjansBolumRayi agencyId={agencyId} aktif={aktif} />
          {yukleniyor ? (
            <ActivityIndicator
              color={RenkTokenlari.primarySoft}
              style={{ marginTop: 32 }}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                onRefresh ? (
                  <RefreshControl
                    refreshing={!!refreshing}
                    onRefresh={onRefresh}
                    tintColor={RenkTokenlari.primarySoft}
                  />
                ) : undefined
              }
            >
              {children}
            </ScrollView>
          )}

          <AjansCekmeceMenu
            acik={menuAcik}
            onKapat={() => setMenuAcik(false)}
            agencyId={agencyId}
            agencyName={agencyName}
            aktif={aktif}
            onOgeSec={(href) => router.push(href as any)}
          />
        </View>
      </ModulHataSiniri>
    </Screen>
  );
}

export function gitMesaj(threadId: string) {
  router.push(`/mesaj/${threadId}` as any);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: HeaderTokenlari.horizontal,
    paddingTop: HeaderTokenlari.contentGap,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
  },
});
