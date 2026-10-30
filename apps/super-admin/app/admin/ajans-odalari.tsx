import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../../../src/components/Screen';
import { EkranBasligi, guvenliGeriDon } from '../../../../src/components/EkranBasligi';
import {
  AjansGorusmeAdminListe,
  AjansGorusmeForceEnd,
} from '../../../../src/moduller/ajans-gorusme/islemler/AjansGorusmeIslemleri';
import type { AjansGorusmeAdminSatir } from '../../../../src/moduller/ajans-gorusme/tipler';
import { useCeviri } from '../../../../src/i18n/useCeviri';
import { RenkTokenlari } from '../../../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari } from '../../../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AdminAjansOdalariEkrani() {
  const { t } = useCeviri();
  const [liste, setListe] = useState<AjansGorusmeAdminSatir[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [sebep, setSebep] = useState('');
  const [secili, setSecili] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    try {
      setListe(await AjansGorusmeAdminListe());
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : t('ajans.gorusmeErisim'));
    } finally {
      setYukleniyor(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('ajans.gorusmeAdmin')}
        border
        onBack={() => guvenliGeriDon('/admin' as any)}
      />
      {yukleniyor ? (
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.icerik}>
          {hata ? <Text style={styles.hata}>{hata}</Text> : null}
          {liste.length === 0 ? <Text style={styles.bos}>{t('ajans.gorusmeBos')}</Text> : null}
          {liste.map((o) => (
            <View key={o.id} style={styles.kart}>
              <Text style={styles.ajans}>{o.agency_name || t('ajans.gorusmeResmi')}</Text>
              <Text style={styles.baslik}>{o.title}</Text>
              <Text style={styles.meta}>
                {o.host_name || '—'} · {o.participant_count} {t('ajans.gorusmeKisi')} · {o.status}
                {o.locked ? ` · ${t('ajans.gorusmeKilitli')}` : ''}
              </Text>
              <View style={styles.satir}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('ajans.gorusmeDetay')}
                  onPress={() => router.push(`/ajans/gorusme/${o.id}` as any)}
                >
                  <Text style={styles.link}>{t('ajans.gorusmeDetay')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('ajans.gorusmeForceEnd')}
                  onPress={() => setSecili(o.id)}
                >
                  <Text style={styles.link}>{t('ajans.gorusmeForceEnd')}</Text>
                </Pressable>
              </View>
              {secili === o.id ? (
                <>
                  <TextInput
                    value={sebep}
                    onChangeText={setSebep}
                    placeholder={t('ajans.gorusmeSebep')}
                    placeholderTextColor={RenkTokenlari.textDim}
                    accessibilityLabel={t('ajans.gorusmeSebep')}
                    style={styles.girdi}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('ajans.gorusmeForceEnd')}
                    onPress={() =>
                      void AjansGorusmeForceEnd(o.id, sebep)
                        .then(() => {
                          setSecili(null);
                          setSebep('');
                          return yukle();
                        })
                        .catch((e) => setHata(e instanceof Error ? e.message : t('ajans.gorusmeVideoHata')))
                    }
                  >
                    <Text style={styles.tehlike}>{t('ajans.gorusmePlatformBitti')}</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
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
  baslik: { color: RenkTokenlari.text, fontWeight: '800', fontSize: 16 },
  meta: { color: RenkTokenlari.textDim },
  satir: { flexDirection: 'row', gap: 16, marginTop: 6 },
  link: { color: RenkTokenlari.primarySoft, fontWeight: '700' },
  tehlike: { color: RenkTokenlari.danger, fontWeight: '700' },
  bos: { color: RenkTokenlari.textDim },
  hata: { color: RenkTokenlari.danger },
  girdi: {
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    borderRadius: 12,
    color: RenkTokenlari.text,
    padding: 10,
    marginTop: 8,
  },
});
