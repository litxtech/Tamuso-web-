import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi, guvenliGeriDon } from '../../src/components/EkranBasligi';
import {
  AjansGorusmeDavetYanit,
  AjansGorusmeDavetlerimGetir,
} from '../../src/moduller/ajans-gorusme/islemler/AjansGorusmeIslemleri';
import type { AjansGorusmeDavet } from '../../src/moduller/ajans-gorusme/tipler';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCeviri } from '../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AjansGorusmelerimEkrani() {
  const { t } = useCeviri();
  const { user } = useAuth();
  const [liste, setListe] = useState<AjansGorusmeDavet[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    if (!user) {
      router.replace('/(auth)/login' as any);
      return;
    }
    setYukleniyor(true);
    try {
      setListe(await AjansGorusmeDavetlerimGetir());
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.gorusmeVideoHata'));
    } finally {
      setYukleniyor(false);
    }
  }, [t, user]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('ajans.gorusmeDavetlerim')}
        border
        onBack={() => guvenliGeriDon('/(tabs)/profile' as any)}
      />
      {yukleniyor ? (
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.icerik}>
          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          {liste.length === 0 ? <Text style={styles.bos}>{t('ajans.gorusmeBos')}</Text> : null}
          {liste.map((d) => (
            <ViewCard key={d.invitation_id}>
              <Text style={styles.ajans}>
                {d.agency_name || t('ajans.gorusmeResmi')}
                {d.is_verified ? ` · ${t('ajans.gorusmeDogrulanmis')}` : ''}
              </Text>
              <Text style={styles.baslik}>{d.title}</Text>
              <Text style={styles.meta}>
                {d.scheduled_at ? new Date(d.scheduled_at).toLocaleString() : t('ajans.gorusmeHemen')}
              </Text>
              <ViewRow>
                {d.status === 'pending' ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('ajans.gorusmeKabul')}
                      onPress={() =>
                        void AjansGorusmeDavetYanit(d.invitation_id, true).then(() =>
                          router.push(`/ajans/gorusme/${d.meeting_id}` as any),
                        )
                      }
                    >
                      <Text style={styles.link}>{t('ajans.gorusmeKabul')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('ajans.gorusmeReddet')}
                      onPress={() => void AjansGorusmeDavetYanit(d.invitation_id, false).then(yukle)}
                    >
                      <Text style={styles.link}>{t('ajans.gorusmeReddet')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('ajans.gorusmeSonra')}
                      onPress={() => router.back()}
                    >
                      <Text style={styles.link}>{t('ajans.gorusmeSonra')}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('ajans.gorusmeKatil')}
                    onPress={() => router.push(`/ajans/gorusme/${d.meeting_id}` as any)}
                  >
                    <Text style={styles.link}>{t('ajans.gorusmeKatil')}</Text>
                  </Pressable>
                )}
              </ViewRow>
            </ViewCard>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function ViewCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.kart}>{children}</View>;
}

function ViewRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.satir}>{children}</View>;
}

const styles = StyleSheet.create({
  icerik: { padding: BoslukTokenlari.lg, gap: 12 },
  kart: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  ajans: { ...TipografiTokenlari.caption, color: RenkTokenlari.primarySoft },
  baslik: { ...TipografiTokenlari.title, color: RenkTokenlari.text, fontSize: 18 },
  meta: { color: RenkTokenlari.textDim },
  link: { color: RenkTokenlari.primarySoft, fontWeight: '700', marginRight: 12 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  bos: { color: RenkTokenlari.textDim },
  hata: { color: RenkTokenlari.danger },
});
