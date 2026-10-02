import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { GradientButton } from '../../src/components/GradientButton';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { useKlavyeYuksekligi } from '../../src/bilesenler/klavye/useKlavyeYuksekligi';
import {
  DurumDetayGetir,
  DurumGuncelle,
  DurumMedyaHttpsMi,
  DurumSesPayloadAl,
  type DurumOggesi,
} from '../../src/moduller/durum/islemler/DurumIslemleri';
import { DurumSesKarti } from '../../src/moduller/durum/bilesenler/DurumSesKarti';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { MesajComposerLinkOnizleme } from '../../src/moduller/mesajlasma/bilesenler/MesajComposerLinkOnizleme';

export default function DurumDuzenleEkrani() {
  const { t } = useCeviri();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { acik: klavyeAcik } = useKlavyeYuksekligi();
  const scrollRef = useRef<ScrollView>(null);
  const captionY = useRef(0);
  const [oge, setOge] = useState<DurumOggesi | null>(null);
  const [caption, setCaption] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [busy, setBusy] = useState(false);

  const yukle = useCallback(async () => {
    if (!id) return;
    setYukleniyor(true);
    try {
      const d = await DurumDetayGetir(id);
      if (!d.is_mine) {
        Alert.alert(t('ortak.duzenle'), t('durum.duzenleyemezsin'));
        router.back();
        return;
      }
      setOge(d);
      setCaption(d.caption ?? '');
    } catch {
      setOge(null);
    } finally {
      setYukleniyor(false);
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      void yukle();
    }, [yukle]),
  );

  const kaydet = () => {
    if (!oge || busy) return;
    void (async () => {
      setBusy(true);
      const r = await DurumGuncelle(oge.id, caption.trim());
      setBusy(false);
      if (!r.ok) {
        Alert.alert(t('ortak.duzenle'), r.hata ?? t('ortak.kaydedilemedi'));
        return;
      }
      if (router.canGoBack()) router.back();
      else router.replace(`/durum/${oge.id}` as any);
    })();
  };

  const metneKaydir = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, captionY.current - 16),
        animated: true,
      });
    });
  };

  return (
    <Screen edges={['top']}>
      <ModulHataSiniri modulAdi="durum">
        <EkranBasligi
          title={t('durum.duzenleBaslik')}
          subtitle={t('durum.duzenleAlt')}
          fallbackHref={'/(tabs)/durum' as any}
        />

        {yukleniyor && !oge ? (
          <ActivityIndicator
            color={RenkTokenlari.primarySoft}
            style={{ marginTop: 40 }}
          />
        ) : !oge ? (
          <Text style={styles.bos}>{t('durum.gonderiBulunamadi')}</Text>
        ) : (
          <KlavyeGuvenliAlan style={styles.flex}>
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              onScrollBeginDrag={Keyboard.dismiss}
            >
              {oge.media_type === 'audio' ? (
                <DurumSesKarti
                  oynaticiId={`durum-ses:${oge.id}`}
                  uri={oge.media_url}
                  durationMs={DurumSesPayloadAl(oge)?.duration_ms}
                  aktif
                />
              ) : (
              <Pressable
                style={[styles.onizleme, klavyeAcik && styles.onizlemeKucuk]}
                onPress={Keyboard.dismiss}
              >
                {oge.media_type === 'video' ? (
                  <View
                    style={[
                      styles.img,
                      styles.videoPlaceholder,
                      klavyeAcik && styles.imgKucuk,
                    ]}
                  >
                    <Ionicons
                      name="play-circle"
                      size={48}
                      color="rgba(255,255,255,0.8)"
                    />
                  </View>
                ) : DurumMedyaHttpsMi(oge.media_url) ? (
                  <Image
                    source={{ uri: oge.media_url.trim() }}
                    style={[styles.img, klavyeAcik && styles.imgKucuk]}
                  />
                ) : (
                  <View
                    style={[
                      styles.img,
                      styles.videoPlaceholder,
                      klavyeAcik && styles.imgKucuk,
                    ]}
                  />
                )}
                {oge.media_type === 'video' ? (
                  <View style={styles.videoBadge}>
                    <Ionicons name="videocam" size={16} color="#fff" />
                    <Text style={styles.videoBadgeYazi}>{t('ortak.video')}</Text>
                  </View>
                ) : null}
              </Pressable>
              )}

              <View
                onLayout={(e) => {
                  captionY.current = e.nativeEvent.layout.y;
                }}
              >
                <TextInput
                  style={styles.caption}
                  value={caption}
                  onChangeText={setCaption}
                  placeholder={
                    oge?.media_type === 'text'
                      ? t('durum.neDusunuyorsun')
                      : t('durum.aciklamaPlaceholder')
                  }
                  placeholderTextColor={RenkTokenlari.textDim}
                  multiline
                  maxLength={oge?.media_type === 'text' ? undefined : 500}
                  onFocus={metneKaydir}
                />
                <MesajComposerLinkOnizleme metin={caption} />
              </View>
              {oge?.media_type === 'text' ? null : (
                <Text style={styles.sayac}>{caption.length}/500</Text>
              )}

              {busy ? (
                <ActivityIndicator color={RenkTokenlari.primarySoft} />
              ) : (
                <GradientButton title={t('ortak.kaydet')} onPress={kaydet} />
              )}

              <Pressable
                style={styles.bosAlan}
                onPress={Keyboard.dismiss}
                accessibilityRole="button"
                accessibilityLabel={t('ortak.klavyeyiKapat')}
              />
            </ScrollView>
          </KlavyeGuvenliAlan>
        )}
      </ModulHataSiniri>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: BoslukTokenlari.lg,
    gap: BoslukTokenlari.md,
    paddingBottom: BoslukTokenlari.xl,
  },
  bos: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  onizleme: {
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
  },
  onizlemeKucuk: {
    alignSelf: 'center',
    width: '55%',
  },
  img: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: RenkTokenlari.bgElevated,
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a22',
  },
  imgKucuk: {
    aspectRatio: 1,
    maxHeight: 160,
  },
  videoBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  videoBadgeYazi: {
    ...TipografiTokenlari.micro,
    color: '#fff',
    fontWeight: '700',
  },
  caption: {
    minHeight: 100,
    borderRadius: YaricapTokenlari.md,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    padding: BoslukTokenlari.md,
    color: RenkTokenlari.text,
    ...TipografiTokenlari.body,
    textAlignVertical: 'top',
  },
  sayac: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    textAlign: 'right',
    marginTop: -8,
  },
  bosAlan: {
    minHeight: 160,
    flexGrow: 1,
  },
});
