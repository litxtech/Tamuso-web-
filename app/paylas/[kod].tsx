import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { GradientButton } from '../../src/components/GradientButton';
import { useCeviri } from '../../src/i18n/useCeviri';
import { AktifPaylasimLinkleriniGetir } from '../../src/moduller/paylasim-linkleri/okuma/PaylasimLinkleriniGetir';
import { PaylasimTiklamaKaydet } from '../../src/moduller/paylasim-linkleri/okuma/DavetKodunuAl';
import type { AppPaylasimLinki } from '../../src/moduller/paylasim-linkleri/tipler';
import { OrtamDegiskenleri } from '../../src/yapilandirma/OrtamDegiskenleri';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

/** Deep link / paylaşım açılışı: indirme hedefleri + davet kodu */
export default function PaylasAcilisEkrani() {
  const { t } = useCeviri();
  const { kod } = useLocalSearchParams<{ kod?: string }>();
  const davet = (kod ?? '').toString().trim().toUpperCase();
  const [linkler, setLinkler] = useState<AppPaylasimLinki[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        await PaylasimTiklamaKaydet({
          shareCode: davet || null,
          platformHint: Platform.OS,
        });
        const rows = await AktifPaylasimLinkleriniGetir();
        setLinkler(rows);
      } catch {
        setLinkler([]);
      } finally {
        setYukleniyor(false);
      }
    })();
  }, [davet]);

  const ac = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('paylasim.baglanti'), t('paylasim.linkAcilamadi'));
    }
  }, [t]);

  const platformOncelik =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  const onerilen =
    linkler.find((l) => l.code === platformOncelik) ??
    linkler.find((l) => l.platform === platformOncelik) ??
    linkler.find((l) => l.code === 'web') ??
    linkler[0];

  return (
    <Screen edges={['top']}>
      <EkranBasligi
        title={t('paylasim.uygulamayiIndir')}
        subtitle={
          davet
            ? t('paylasim.davetEtiket', { kod: davet })
            : OrtamDegiskenleri.uygulamaAdi
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[...RenkTokenlari.gradientCard]} style={styles.hero}>
          <Text style={styles.heroBaslik}>{OrtamDegiskenleri.uygulamaAdi}</Text>
          <Text style={styles.heroAlt}>{t('paylasim.heroAlt')}</Text>
          {davet ? (
            <View style={styles.kodChip}>
              <Text style={styles.kodYazi}>{davet}</Text>
            </View>
          ) : null}
        </LinearGradient>

        {yukleniyor ? (
          <ActivityIndicator color={RenkTokenlari.primarySoft} />
        ) : (
          <>
            {onerilen ? (
              <GradientButton
                title={t('paylasim.ileIndir', { title: onerilen.title })}
                onPress={() => void ac(onerilen.url)}
              />
            ) : null}

            <View style={styles.liste}>
              {linkler.map((l) => (
                <Pressable
                  key={l.id}
                  style={styles.satir}
                  onPress={() => void ac(l.url)}
                >
                  <View style={styles.ikon}>
                    <Ionicons
                      name={
                        l.platform === 'ios'
                          ? 'logo-apple'
                          : l.platform === 'android'
                            ? 'logo-google-playstore'
                            : 'globe-outline'
                      }
                      size={18}
                      color={RenkTokenlari.primarySoft}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.satirBaslik}>{l.title}</Text>
                    <Text style={styles.satirAlt} numberOfLines={1}>
                      {l.description ?? l.url}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={RenkTokenlari.textDim} />
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => router.replace('/(tabs)')} style={styles.ana}>
              <Text style={styles.anaYazi}>{t('paylasim.uygulamayaDevam')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: BoslukTokenlari.lg,
    paddingBottom: BoslukTokenlari.xxxl,
    gap: BoslukTokenlari.md,
  },
  hero: {
    padding: BoslukTokenlari.xl,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.borderAccent,
    gap: 8,
  },
  heroBaslik: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
  },
  heroAlt: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
  },
  kodChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: YaricapTokenlari.pill,
    backgroundColor: `${RenkTokenlari.primary}22`,
  },
  kodYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  liste: { gap: 8 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  ikon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${RenkTokenlari.primarySoft}18`,
  },
  satirBaslik: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  satirAlt: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  ana: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  anaYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
  },
});
