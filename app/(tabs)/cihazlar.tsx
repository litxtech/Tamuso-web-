import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { BosDurum } from '../../src/components/BosDurum';
import { GradientButton } from '../../src/components/GradientButton';
import { YUZEN_TAB_ICERIK_BOSLUGU } from '../../src/components/YuzenTabBar';
import {
  CihazOturumlariniListele,
  TekCihazOturumunuKapat,
  TumCihazOturumlariniKapat,
} from '../../src/moduller/kimlik-dogrulama/oturum/CihazOturumlariniYonet';
import { CihazKimliginiGetir } from '../../src/moduller/kimlik-dogrulama/oturum/CihazKimliginiGetir';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { DIL_LOCALE_MAP } from '../../src/i18n/diller';
import { useCeviri } from '../../src/i18n/useCeviri';

type Oturum = {
  id: string;
  device_id: string;
  platform: string | null;
  app_version: string | null;
  last_seen_at: string;
};

export default function CihazlarEkrani() {
  const { t, dil } = useCeviri();
  const sayiLocale = DIL_LOCALE_MAP[dil];
  const [liste, setListe] = useState<Oturum[]>([]);
  const [buCihaz, setBuCihaz] = useState('');
  const [loading, setLoading] = useState(true);

  const yukle = useCallback(async () => {
    try {
      setLoading(true);
      const [deviceId, data] = await Promise.all([
        CihazKimliginiGetir(),
        CihazOturumlariniListele(),
      ]);
      setBuCihaz(deviceId);
      setListe(data as Oturum[]);
    } catch (e) {
      Alert.alert(
        t('cihazlar.oturumlar'),
        e instanceof Error ? e.message : t('cihazlar.migrationHint'),
      );
      setListe([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const tekKapat = async (id: string) => {
    try {
      await TekCihazOturumunuKapat(id);
      await yukle();
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('cihazlar.kapatilamadi'),
      );
    }
  };

  const hepsiniKapat = async () => {
    try {
      await TumCihazOturumlariniKapat(buCihaz);
      await yukle();
      Alert.alert(t('ortak.tamam'), t('cihazlar.digerCikisYapildi'));
    } catch (e) {
      Alert.alert(
        t('ortak.hata'),
        e instanceof Error ? e.message : t('cihazlar.islemBasarisiz'),
      );
    }
  };

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('profil.aktifCihazlar')}
        subtitle={t('cihazlar.altBaslik')}
        fallbackHref="/(tabs)/profile"
      />
      {loading ? (
        <ActivityIndicator color={RenkTokenlari.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={liste}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <BosDurum
              icon="phone-portrait-outline"
              title={t('cihazlar.kayitliCihazYok')}
              body={t('cihazlar.kayitliCihazYokBody')}
            />
          }
          ListFooterComponent={
            liste.length > 0 ? (
              <GradientButton
                title={t('cihazlar.tumCihazlardanCikis')}
                variant="ghost"
                onPress={hepsiniKapat}
                style={{ marginTop: BoslukTokenlari.md }}
              />
            ) : null
          }
          renderItem={({ item }) => {
            const bu = item.device_id === buCihaz;
            return (
              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>
                    {item.platform ?? t('cihazlar.cihaz')}
                    {bu ? ` · ${t('cihazlar.buCihaz')}` : ''}
                  </Text>
                  <Text style={styles.cardMeta}>
                    v{item.app_version ?? '?'} ·{' '}
                    {new Date(item.last_seen_at).toLocaleString(sayiLocale)}
                  </Text>
                </View>
                {!bu ? (
                  <Pressable onPress={() => tekKapat(item.id)} style={styles.kick}>
                    <Text style={styles.kickText}>{t('cihazlar.cikis')}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: BoslukTokenlari.xl,
    paddingBottom: YUZEN_TAB_ICERIK_BOSLUGU,
    gap: BoslukTokenlari.md,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BoslukTokenlari.md,
    padding: BoslukTokenlari.lg,
    borderRadius: YaricapTokenlari.lg,
    backgroundColor: RenkTokenlari.bgCard,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  cardBody: { flex: 1, gap: BoslukTokenlari.xs },
  cardTitle: { ...TipografiTokenlari.h2, color: RenkTokenlari.text },
  cardMeta: { ...TipografiTokenlari.caption, color: RenkTokenlari.textMuted },
  kick: {
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: BoslukTokenlari.sm,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: 'rgba(232, 75, 106, 0.18)',
  },
  kickText: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.danger,
    fontWeight: '700',
  },
});
