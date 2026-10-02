import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { PolitikaGetir } from '../../src/moduller/politikalar/islemler/PolitikaIslemleri';
import type { PolitikaGorunum } from '../../src/moduller/politikalar/tipler/PolitikaTipleri';
import { PolitikaZenginGovde } from '../../src/moduller/politikalar/bilesenler/PolitikaZenginGovde';
import { BoslukTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';

/** Temiz koyu arka plan · beyaz tipografi — modern politika sayfası */
export default function PolitikaDetayEkrani() {
  const { t } = useCeviri();
  const { kod } = useLocalSearchParams<{ kod: string }>();
  const [politika, setPolitika] = useState<PolitikaGorunum | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let iptal = false;
      void (async () => {
        setYukleniyor(true);
        try {
          const p = await PolitikaGetir(String(kod ?? ''));
          if (!iptal) setPolitika(p);
        } catch {
          if (!iptal) setPolitika(null);
        } finally {
          if (!iptal) setYukleniyor(false);
        }
      })();
      return () => {
        iptal = true;
      };
    }, [kod]),
  );

  return (
    <Screen edges={['top']} style={styles.screen}>
      <ModulHataSiniri modulAdi="politikalar">
        <View style={styles.baslikWrap}>
          <EkranBasligi
            title={politika?.baslik ?? t('politika.tekBaslik')}
            subtitle={politika?.kisa}
            fallbackHref={'/politika' as any}
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          {yukleniyor ? (
            <ActivityIndicator color="#fff" />
          ) : politika ? (
            <PolitikaZenginGovde
              govde={politika.govde}
              tema={{ metin: '#ffffff', link: '#93c5fd' }}
              metinStil={styles.govde}
            />
          ) : (
            <Text style={styles.bos}>{t('politika.bulunamadi')}</Text>
          )}
        </ScrollView>
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#0c0c0c', flex: 1 },
  baslikWrap: {
    backgroundColor: '#0c0c0c',
  },
  pad: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: BoslukTokenlari.xxxl,
    backgroundColor: '#0c0c0c',
  },
  govde: {
    ...TipografiTokenlari.body,
    fontSize: 16,
    lineHeight: 26,
    color: '#ffffff',
  },
  bos: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
  },
});
