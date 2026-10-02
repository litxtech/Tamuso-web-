import React, { useEffect, useRef, useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { GradientButton } from '../../src/components/GradientButton';
import { ModulHataSiniri } from '../../src/ortak/hata-sinirlari/ModulHataSiniri';
import { ImagePickerOnIsit } from '../../src/ortak/medya/ImagePickerHazirMi';
import { KlavyeGuvenliAlan } from '../../src/bilesenler/klavye/KlavyeGuvenliAlan';
import { useKlavyeYuksekligi } from '../../src/bilesenler/klavye/useKlavyeYuksekligi';
import { useAuth } from '../../src/contexts/AuthContext';
import { useMisafirIslemKapisi } from '../../src/moduller/misafir-hesabi/islemler/useMisafirIslemKapisi';
import { HesabiTamamlaKarti } from '../../src/moduller/misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { DurumMedyasiSecVeYukle, DurumSesDosyasiYukle } from '../../src/moduller/durum/islemler/DurumMedyasiYukle';
import {
  DurumMedyaHttpsMi,
  DurumOlustur,
} from '../../src/moduller/durum/islemler/DurumIslemleri';
import { DurumSesKarti } from '../../src/moduller/durum/bilesenler/DurumSesKarti';
import { DurumSesKayitPaneli } from '../../src/moduller/durum/bilesenler/DurumSesKayitPaneli';
import { MesajSesYoneticisi } from '../../src/moduller/mesajlasma/ses/MesajSesYoneticisi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import {
  BoslukTokenlari,
  YaricapTokenlari,
} from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';
import { useCeviri } from '../../src/i18n/useCeviri';
import { MesajComposerLinkOnizleme } from '../../src/moduller/mesajlasma/bilesenler/MesajComposerLinkOnizleme';

export default function DurumOlusturEkrani() {
  const { t } = useCeviri();
  const { isGuest } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const { acik: klavyeAcik } = useKlavyeYuksekligi();
  const scrollRef = useRef<ScrollView>(null);
  const captionY = useRef(0);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [sesTaslak, setSesTaslak] = useState<{
    uri: string;
    durationMs: number;
  } | null>(null);
  const [sesKayit, setSesKayit] = useState(false);
  const [caption, setCaption] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Video seçiminde izin dialog’u picker’dan önce gelmesin
    ImagePickerOnIsit({ izinIste: true });
  }, []);

  const MOODLAR: { kod: string; etiket: string; emoji: string }[] = [
    { kod: 'mutlu', etiket: t('durum.moodMutlu'), emoji: '😊' },
    { kod: 'enerjik', etiket: t('durum.moodEnerjik'), emoji: '⚡' },
    { kod: 'sakin', etiket: t('durum.moodSakin'), emoji: '🌙' },
    { kod: 'sosyal', etiket: t('durum.moodSosyal'), emoji: '💬' },
    { kod: 'muzik', etiket: t('durum.moodMuzik'), emoji: '🎧' },
    { kod: 'oyun', etiket: t('durum.moodOyun'), emoji: '🎮' },
  ];

  const sec = (tur: 'image' | 'video') => {
    islemiDene('durum_paylas', () => {
      void (async () => {
        const r = await DurumMedyasiSecVeYukle(tur, {
          onYuklemeBasladi: () => setBusy(true),
        });
        setBusy(false);
        if (r.ok === false) {
          if (!r.iptal) Alert.alert(t('ortak.medya'), r.hata);
          return;
        }
        // Yalnızca https public URL — file:// / content:// Image/Video crash önlenir.
        if (!DurumMedyaHttpsMi(r.url)) {
          Alert.alert(t('ortak.medya'), t('durum.medyaGecersiz'));
          return;
        }
        setMediaUrl(r.url.trim());
        setMediaType(r.mediaType);
        setSesTaslak(null);
        setSesKayit(false);
        void MesajSesYoneticisi.durdur();
      })();
    });
  };

  const yayinla = () => {
    const moodEtiket = MOODLAR.find((m) => m.kod === mood);
    const birlesik = [
      moodEtiket ? `${moodEtiket.emoji} ${moodEtiket.etiket}` : null,
      caption.trim() || null,
    ]
      .filter(Boolean)
      .join(' · ');

    if (sesKayit) {
      Alert.alert(t('durum.baslik'), t('durum.sesOnceDurdur'));
      return;
    }

    if (!mediaUrl && !sesTaslak && !birlesik) {
      Alert.alert(t('durum.baslik'), t('durum.bosUyari'));
      return;
    }

    const medyaVar = !!mediaUrl && DurumMedyaHttpsMi(mediaUrl);
    if (mediaUrl && !medyaVar) {
      Alert.alert(t('durum.baslik'), t('durum.medyaAdresGecersiz'));
      return;
    }

    islemiDene('durum_paylas', () => {
      void (async () => {
        setBusy(true);
        let yayinUrl = mediaUrl;
        let yayinTur: 'image' | 'video' | 'text' | 'audio' = medyaVar
          ? mediaType
          : 'text';
        let sureMs: number | null = null;
        if (sesTaslak) {
          const up = await DurumSesDosyasiYukle(sesTaslak.uri);
          if (!up.ok) {
            setBusy(false);
            Alert.alert(t('durum.baslik'), up.hata);
            return;
          }
          yayinUrl = up.url;
          yayinTur = 'audio';
          sureMs = sesTaslak.durationMs;
        }
        const r = await DurumOlustur(
          yayinTur === 'text'
            ? {
                mediaType: 'text',
                mediaUrl: null,
                caption: birlesik,
              }
            : {
                mediaType: yayinTur,
                mediaUrl: yayinUrl!.trim(),
                caption: birlesik || undefined,
                durationMs: sureMs,
              },
        );
        setBusy(false);
        if (!r.ok) {
          Alert.alert(t('durum.baslik'), r.hata ?? t('durum.paylasilamadi'));
          return;
        }
        try {
          router.replace('/(tabs)/durum' as any);
        } catch {
          try {
            router.navigate('/(tabs)/durum' as any);
          } catch {
            if (router.canGoBack()) router.back();
          }
        }
      })();
    });
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
          title={t('durum.olusturBaslik')}
          subtitle={t('durum.olusturAlt')}
          fallbackHref={'/(tabs)/durum' as any}
        />
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
            <Text style={styles.moodBaslik}>{t('durum.moodSoru')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moodSerit}
            >
              {MOODLAR.map((m) => {
                const secili = mood === m.kod;
                return (
                  <Pressable
                    key={m.kod}
                    onPress={() => setMood(secili ? null : m.kod)}
                    style={[styles.moodChip, secili && styles.moodChipAktif]}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text
                      style={[styles.moodYazi, secili && styles.moodYaziAktif]}
                      numberOfLines={1}
                    >
                      {m.etiket}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {sesKayit ? (
              <DurumSesKayitPaneli
                onBitti={(uri, durationMs) => {
                  setMediaUrl(null);
                  setSesTaslak({ uri, durationMs });
                  setSesKayit(false);
                }}
                onVazgec={() => setSesKayit(false)}
                onHata={(mesaj) => Alert.alert(t('durum.baslik'), mesaj)}
              />
            ) : sesTaslak ? (
              <View style={styles.sesOnizleme}>
                <DurumSesKarti
                  oynaticiId="durum-ses-taslak"
                  uri={sesTaslak.uri}
                  durationMs={sesTaslak.durationMs}
                />
                <Pressable
                  onPress={() => {
                    setSesTaslak(null);
                    void MesajSesYoneticisi.durdur();
                  }}
                  style={styles.sesKaldir}
                  accessibilityRole="button"
                  accessibilityLabel={t('durum.sesKaldir')}
                >
                  <Text style={styles.sesKaldirYazi}>{t('durum.sesKaldir')}</Text>
                </Pressable>
              </View>
            ) : mediaUrl && DurumMedyaHttpsMi(mediaUrl) ? (
              <Pressable
                style={[styles.onizleme, klavyeAcik && styles.onizlemeKucuk]}
                onPress={Keyboard.dismiss}
              >
                {mediaType === 'video' ? (
                  // Oluştur ekranında native VideoPlayer mount etme —
                  // paylaş / geri navigasyonunda crash + çoklu player riski.
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
                ) : (
                  <Image
                    source={{ uri: mediaUrl.trim() }}
                    style={[styles.img, klavyeAcik && styles.imgKucuk]}
                  />
                )}
                {mediaType === 'video' ? (
                  <View style={styles.videoBadge}>
                    <Ionicons name="videocam" size={16} color="#fff" />
                    <Text style={styles.videoBadgeYazi}>{t('ortak.video')}</Text>
                  </View>
                ) : null}
                <Pressable
                  style={styles.degistir}
                  onPress={() => setMediaUrl(null)}
                >
                  <Text style={styles.degistirYazi}>{t('ortak.degistir')}</Text>
                </Pressable>
              </Pressable>
            ) : (
              <View style={styles.secim}>
                <Pressable style={styles.secBtn} onPress={() => sec('image')}>
                  <Ionicons
                    name="image-outline"
                    size={28}
                    color={RenkTokenlari.primarySoft}
                  />
                  <Text style={styles.secYazi}>{t('durum.fotograf')}</Text>
                </Pressable>
                <Pressable style={styles.secBtn} onPress={() => sec('video')}>
                  <Ionicons
                    name="videocam-outline"
                    size={28}
                    color={RenkTokenlari.accent}
                  />
                  <Text style={styles.secYazi}>{t('ortak.video')}</Text>
                </Pressable>
                <Pressable
                  style={styles.secBtn}
                  onPress={() => {
                    islemiDene('durum_paylas', () => {
                      setMediaUrl(null);
                      setSesKayit(true);
                    });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('durum.ses')}
                >
                  <Ionicons
                    name="mic-outline"
                    size={28}
                    color={RenkTokenlari.mint}
                  />
                  <Text style={styles.secYazi}>{t('durum.ses')}</Text>
                </Pressable>
              </View>
            )}
            {!mediaUrl && !sesTaslak && !sesKayit ? (
              <Text style={styles.istegeBagli}>
                {t('durum.medyaIstegeBagli')}
              </Text>
            ) : null}

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
                  mediaUrl || sesTaslak
                    ? t('durum.aciklamaPlaceholder')
                    : t('durum.neDusunuyorsun')
                }
                placeholderTextColor={RenkTokenlari.textDim}
                multiline
                maxLength={mediaUrl || sesTaslak ? 500 : undefined}
                onFocus={metneKaydir}
              />
              <MesajComposerLinkOnizleme metin={caption} />
              {mediaUrl || sesTaslak ? (
                <Text style={styles.sayac}>{caption.length}/500</Text>
              ) : null}
            </View>

            {busy ? (
              <ActivityIndicator color={RenkTokenlari.primarySoft} />
            ) : (
              <GradientButton title={t('ortak.paylas')} onPress={yayinla} />
            )}

            <Pressable
              style={styles.bosAlan}
              onPress={Keyboard.dismiss}
              accessibilityRole="button"
              accessibilityLabel={t('ortak.klavyeyiKapat')}
            />
          </ScrollView>
        </KlavyeGuvenliAlan>

        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={upgradeKapat}
        />
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
  moodBaslik: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  moodSerit: {
    gap: BoslukTokenlari.sm,
    paddingRight: BoslukTokenlari.md,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: YaricapTokenlari.pill,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
  },
  moodChipAktif: {
    borderColor: RenkTokenlari.borderAccent,
    backgroundColor: 'rgba(232,64,145,0.16)',
  },
  moodEmoji: {
    fontSize: 16,
  },
  moodYazi: {
    ...TipografiTokenlari.micro,
    color: RenkTokenlari.textDim,
    fontWeight: '600',
  },
  moodYaziAktif: {
    color: RenkTokenlari.primarySoft,
    fontWeight: '800',
  },
  secim: {
    flexDirection: 'row',
    gap: 12,
  },
  secBtn: {
    flex: 1,
    height: 120,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: 1,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.text,
    fontWeight: '700',
  },
  sesOnizleme: {
    gap: 8,
  },
  sesKaldir: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sesKaldirYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.primarySoft,
    fontWeight: '700',
  },
  istegeBagli: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 4,
    lineHeight: 18,
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
  degistir: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  degistirYazi: {
    ...TipografiTokenlari.caption,
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
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  bosAlan: {
    minHeight: 160,
    flexGrow: 1,
  },
});
