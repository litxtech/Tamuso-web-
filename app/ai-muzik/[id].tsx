import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { EkranBasligi } from '../../src/components/EkranBasligi';
import { useCeviri } from '../../src/i18n/useCeviri';
import { CamArkaplan } from '../../src/bilesenler/yuzey/CamArkaplan';
import { AiMuzikBeklemeAnimasyonu } from '../../src/moduller/ai-muzik/bilesenler/AiMuzikBeklemeAnimasyonu';
import { AiMuzikDurumPaylasSheet } from '../../src/moduller/ai-muzik/bilesenler/AiMuzikDurumPaylasSheet';
import { AiMuzikDuzenleSheet } from '../../src/moduller/ai-muzik/bilesenler/AiMuzikDuzenleSheet';
import {
  AiMuzikFavoriToggle,
  AiMuzikIdempotencyAnahtari,
  AiMuzikKapakYukle,
  AiMuzikKirp,
  AiMuzikKutuphanedenCikar,
  AiMuzikKutuphaneyeEkle,
  AiMuzikOlustur,
  AiMuzikParcaDetay,
  AiMuzikParcaSil,
  AiMuzikParcaYenidenAdlandir,
  DurumMuzikOlustur,
} from '../../src/moduller/ai-muzik/islemler/AiMuzikApi';
import {
  AiMuzikCal,
  AiMuzikCaliyorMu,
  AiMuzikCaliyorTrackId,
  AiMuzikDuraklat,
  AiMuzikDurdur,
  AiMuzikPozisyonSn,
  AiMuzikSeekVeOynat,
  AiMuzikSureSn,
  AiMuzikTekrarBaslat,
} from '../../src/moduller/ai-muzik/oynatici/AiMuzikOynatici';
import { AiMuzikSeekCubugu } from '../../src/moduller/ai-muzik/bilesenler/AiMuzikSeekCubugu';
import { AiMuzikSesCubugu } from '../../src/moduller/ai-muzik/bilesenler/AiMuzikSesCubugu';
import type { AiMuzikTrackDetay } from '../../src/moduller/ai-muzik/tipler';
import { MsSureFormat } from '../../src/moduller/ai-muzik/utils/SureFormat';
import { useAiMuzikBakiye } from '../../src/moduller/ai-muzik/kancalar/useAiMuzikBakiye';
import { MedyaUriGuvenli } from '../../src/moduller/mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { OzellikBayragiAktifMi } from '../../src/moduller/ozellik-bayraklari/OzellikBayragiAktifMi';
import { RenkTokenlari } from '../../src/tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../src/tasarim-sistemi/TipografiTokenlari';
import { BoslukTokenlari, YaricapTokenlari } from '../../src/tasarim-sistemi/BoslukVeYaricapTokenlari';

export default function AiMuzikDetayEkrani() {
  const { t } = useCeviri();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trackId = String(id ?? '');
  const { yenile: bakiyeYenile } = useAiMuzikBakiye();
  const [detay, setDetay] = useState<AiMuzikTrackDetay | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [duzenAcik, setDuzenAcik] = useState(false);
  const [durumSheetAcik, setDurumSheetAcik] = useState(false);
  const [bekle, setBekle] = useState(false);
  const [scrubSn, setScrubSn] = useState<number | null>(null);
  const scrubbingRef = useRef(false);
  const [, tick] = useState(0);

  const yukle = useCallback(async () => {
    if (!trackId) return;
    setYukleniyor(true);
    try {
      const d = await AiMuzikParcaDetay(trackId);
      setDetay(d);
    } catch (e) {
      Alert.alert(t('ortak.hata'), e instanceof Error ? e.message : t('aiMuzik.parcaYuklenemedi'));
    } finally {
      setYukleniyor(false);
    }
  }, [trackId, t]);

  useEffect(() => {
    void yukle();
    return () => {
      void AiMuzikDurdur();
    };
  }, [yukle]);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  const oynat = () => {
    const url = detay?.track.audio_url;
    if (!url) return;
    if (AiMuzikCaliyorTrackId() === trackId && AiMuzikCaliyorMu()) {
      AiMuzikDuraklat();
      return;
    }
    // Aynı parça bitmiş / durmuş → Cal içinde başa sar veya devam
    void AiMuzikCal(url, trackId);
  };

  const paylas = async () => {
    if (!detay) return;
    const kod = detay.track.public_track_code ?? detay.track.id;
    await Share.share({
      message: `${detay.track.title} — Tamuso ${t('aiMuzik.baslik')} (${kod})`,
    });
  };

  const disaAktar = async () => {
    if (!OzellikBayragiAktifMi('ai_music_export_enabled')) {
      Alert.alert(t('aiMuzik.disaAktarma'), t('aiMuzik.disaAktarmaKapali'));
      return;
    }
    const url = detay?.track.audio_url;
    if (!url) return;
    try {
      const FS = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      if (!FS.cacheDirectory) throw new Error(t('aiMuzik.onbellekYok'));
      const ext = url.includes('.mp3') ? 'mp3' : 'm4a';
      const hedef = `${FS.cacheDirectory}ai-music-${trackId}.${ext}`;
      const dl = await FS.downloadAsync(url, hedef);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dl.uri);
      } else {
        Alert.alert(t('aiMuzik.kaydedildiUri'), dl.uri);
      }
    } catch (e) {
      Alert.alert(t('aiMuzik.disaAktarma'), e instanceof Error ? e.message : t('aiMuzik.uretimBasarisiz'));
    }
  };

  const durumPaylasAc = () => {
    if (!OzellikBayragiAktifMi('ai_music_status_share_enabled')) {
      Alert.alert(t('aiMuzik.alertDurum'), t('aiMuzik.durumPaylasKapali'));
      return;
    }
    setDurumSheetAcik(true);
  };

  const kutuphaneToggle = async () => {
    if (!detay) return;
    const inLib = !!(detay.in_user_library ?? detay.track.in_user_library);
    if (inLib) {
      const r = await AiMuzikKutuphanedenCikar(trackId);
      if (r.ok) void yukle();
      else Alert.alert(t('aiMuzik.alertKutuphane'), r.hata ?? t('aiMuzik.kaldirilamadi'));
    } else {
      const r = await AiMuzikKutuphaneyeEkle(trackId);
      if (r.ok) {
        Alert.alert(t('aiMuzik.eklendi'), t('aiMuzik.kutuphaneyeEklendi'));
        void yukle();
      } else Alert.alert(t('aiMuzik.alertKutuphane'), r.hata ?? t('aiMuzik.eklenemedi'));
    }
  };

  if (yukleniyor || !detay) {
    return (
      <Screen>
        <EkranBasligi title={t('aiMuzik.parca')} fallbackHref="/ai-muzik/kutuphane" />
        <ActivityIndicator color={RenkTokenlari.primarySoft} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const cover = MedyaUriGuvenli(detay.track.cover_thumb_url ?? detay.track.cover_url);
  const caliyor = AiMuzikCaliyorTrackId() === trackId && AiMuzikCaliyorMu();
  const posLive = AiMuzikPozisyonSn();
  const durLive = AiMuzikSureSn() || (detay.track.duration_ms ?? 0) / 1000;
  const pos = scrubSn ?? posLive;
  const dur = durLive;
  const inLibrary = !!(detay.in_user_library ?? detay.track.in_user_library);
  const lastPrompt =
    detay.last_user_prompt ?? detay.track.last_user_prompt ?? '';
  const sureSn = Math.max(
    60,
    Math.round((detay.track.duration_ms ?? 120000) / 1000),
  );

  return (
    <Screen>
      <EkranBasligi
        title={t('aiMuzik.parcaDetay')}
        fallbackHref="/ai-muzik/kutuphane"
        right={
          <Pressable
            onPress={() => setDuzenAcik(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('ortak.duzenle')}
            style={styles.ustBtn}
          >
            <Ionicons name="create-outline" size={22} color={RenkTokenlari.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverBos]}>
            <Ionicons name="musical-notes" size={48} color={RenkTokenlari.primarySoft} />
          </View>
        )}

        <Text style={styles.baslik}>{detay.track.title}</Text>
        <Text style={styles.meta}>
          {MsSureFormat(detay.track.duration_ms)} · {detay.track.status}
          {detay.track.public_track_code ? ` · ${detay.track.public_track_code}` : ''}
        </Text>

        <View style={styles.ctaCam}>
          <CamArkaplan intensity={55} style={StyleSheet.absoluteFill} hafif />
          <Pressable
            style={styles.ctaSatir}
            onPress={() => void kutuphaneToggle()}
            accessibilityRole="button"
            accessibilityLabel={
              inLibrary ? t('aiMuzik.kutuphanedenCikar') : t('aiMuzik.kutuphaneyeEkle')
            }
          >
            <View style={styles.ctaIkon}>
              <Ionicons
                name={inLibrary ? 'library' : 'library-outline'}
                size={20}
                color={RenkTokenlari.primarySoft}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaBaslik}>
                {inLibrary ? t('aiMuzik.kutuphanede') : t('aiMuzik.kutuphaneyeEkle')}
              </Text>
              <Text style={styles.ctaAlt}>
                {inLibrary
                  ? t('aiMuzik.kutuphanedenKaldirHint')
                  : t('aiMuzik.kutuphaneyeEkleHint')}
              </Text>
            </View>
            <Ionicons
              name={inLibrary ? 'remove-circle-outline' : 'add-circle-outline'}
              size={22}
              color={RenkTokenlari.primarySoft}
            />
          </Pressable>
          <View style={styles.ctaCizgi} />
          <Pressable
            style={styles.ctaSatir}
            onPress={() => setDuzenAcik(true)}
            accessibilityRole="button"
            accessibilityLabel={t('aiMuzik.sarkiyiDuzenle')}
          >
            <View style={styles.ctaIkon}>
              <Ionicons name="pencil" size={18} color={RenkTokenlari.primarySoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaBaslik}>{t('ortak.duzenle')}</Text>
              <Text style={styles.ctaAlt}>{t('aiMuzik.duzenleAlt')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={RenkTokenlari.textDim} />
          </Pressable>
        </View>

        <Pressable
          style={styles.playBtn}
          onPress={oynat}
          onLongPress={() => void AiMuzikTekrarBaslat()}
          accessibilityRole="button"
          accessibilityLabel={caliyor ? t('aiMuzik.duraklat') : t('aiMuzik.oynat')}
        >
          <Ionicons name={caliyor ? 'pause' : 'play'} size={28} color="#fff" />
        </Pressable>

        <View style={styles.progressWrap}>
          <AiMuzikSeekCubugu
            positionSn={pos}
            durationSn={dur}
            onSeekStart={() => {
              scrubbingRef.current = true;
            }}
            onSeek={(sn) => setScrubSn(sn)}
            onSeekEnd={(sn) => {
              scrubbingRef.current = false;
              setScrubSn(null);
              void AiMuzikSeekVeOynat(sn);
            }}
          />
          <AiMuzikSesCubugu />
        </View>

        <View style={styles.aksiyonlar}>
          <Pressable
            style={styles.aksiyon}
            onPress={async () => {
              const r = await AiMuzikKapakYukle(trackId);
              if (r.ok) void yukle();
              else if (r.hata !== t('ortak.iptal') && r.hata !== 'İptal') Alert.alert(t('aiMuzik.alertKapak'), r.hata ?? t('aiMuzik.uretimBasarisiz'));
            }}
          >
            <Ionicons name="image-outline" size={20} color={RenkTokenlari.text} />
            <Text style={styles.aksiyonYazi}>{t('aiMuzik.alertKapak')}</Text>
          </Pressable>
          <Pressable
            style={styles.aksiyon}
            onPress={() => {
              const total = detay.track.duration_ms ?? 0;
              if (total < 5000) {
                Alert.alert(t('aiMuzik.kirp'), t('aiMuzik.kirpCokKisa'));
                return;
              }
              Alert.alert(
                t('aiMuzik.kirpYeniSurum'),
                t('aiMuzik.kirpBody'),
                [
                  { text: t('ortak.iptal'), style: 'cancel' },
                  {
                    text: t('ortak.kaydet'),
                    onPress: async () => {
                      const start = Math.floor(total * 0.1);
                      const end = Math.floor(total * 0.9);
                      const r = await AiMuzikKirp(trackId, start, end);
                      if (r.ok) {
                        Alert.alert(t('aiMuzik.kirpildi'), t('aiMuzik.kirpildiBody'));
                        void yukle();
                      } else Alert.alert(t('aiMuzik.kirp'), r.hata ?? t('aiMuzik.uretimBasarisiz'));
                    },
                  },
                ],
              );
            }}
          >
            <Ionicons name="cut-outline" size={20} color={RenkTokenlari.text} />
            <Text style={styles.aksiyonYazi}>{t('aiMuzik.kirp')}</Text>
          </Pressable>
          <Pressable style={styles.aksiyon} onPress={() => void paylas()}>
            <Ionicons name="share-outline" size={20} color={RenkTokenlari.text} />
            <Text style={styles.aksiyonYazi}>{t('ortak.paylas')}</Text>
          </Pressable>
          <Pressable style={styles.aksiyon} onPress={() => void disaAktar()}>
            <Ionicons name="download-outline" size={20} color={RenkTokenlari.text} />
            <Text style={styles.aksiyonYazi}>{t('aiMuzik.disaAktarma')}</Text>
          </Pressable>
          <Pressable style={styles.aksiyon} onPress={durumPaylasAc}>
            <Ionicons name="megaphone-outline" size={20} color={RenkTokenlari.text} />
            <Text style={styles.aksiyonYazi}>{t('aiMuzik.alertDurum')}</Text>
          </Pressable>
          <Pressable
            style={styles.aksiyon}
            onPress={async () => {
              const r = await AiMuzikFavoriToggle(trackId);
              if (r.ok) void yukle();
            }}
          >
            <Ionicons
              name={detay.is_favorite ? 'heart' : 'heart-outline'}
              size={20}
              color={RenkTokenlari.primarySoft}
            />
            <Text style={styles.aksiyonYazi}>{t('aiMuzik.tabFavoriler')}</Text>
          </Pressable>
        </View>

        {detay.passport ? (
          <Pressable
            style={styles.pasaport}
            onPress={() =>
              router.push(`/ai-muzik/pasaport/${trackId}` as Href)
            }
          >
            <CamArkaplan intensity={40} style={StyleSheet.absoluteFill} hafif />
            <Ionicons name="document-text-outline" size={22} color={RenkTokenlari.primarySoft} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pasaportBaslik}>Music Passport</Text>
              <Text style={styles.pasaportAlt}>
                {t('aiMuzik.pasaportUyari').slice(0, 60)}…
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={RenkTokenlari.textDim} />
          </Pressable>
        ) : null}

        <Pressable
          style={styles.sil}
          onPress={() => {
            Alert.alert(t('aiMuzik.silBaslik'), t('aiMuzik.silKaliciSoru'), [
              { text: t('ortak.iptal'), style: 'cancel' },
              {
                text: t('ortak.sil'),
                style: 'destructive',
                onPress: async () => {
                  const r = await AiMuzikParcaSil(trackId);
                  if (r.ok) {
                    if (AiMuzikCaliyorTrackId() === trackId) {
                      void AiMuzikDurdur();
                    }
                    router.replace('/ai-muzik/kutuphane' as Href);
                  }
                  else Alert.alert(t('aiMuzik.silBaslik'), r.hata ?? t('aiMuzik.uretimBasarisiz'));
                },
              },
            ]);
          }}
        >
          <Text style={styles.silYazi}>{t('aiMuzik.parcaSil')}</Text>
        </Pressable>
      </ScrollView>

      <AiMuzikDuzenleSheet
        visible={duzenAcik}
        title={detay.track.title}
        prompt={lastPrompt}
        durationSeconds={sureSn}
        onClose={() => setDuzenAcik(false)}
        onKaydetBaslik={async (title) => {
          const r = await AiMuzikParcaYenidenAdlandir(trackId, title);
          if (r.ok) {
            setDuzenAcik(false);
            void yukle();
          } else {
            Alert.alert(t('aiMuzik.alertAd'), r.hata ?? t('aiMuzik.kaydedilemedi'));
          }
        }}
        onYenidenUret={async ({ title, prompt, duration_seconds }) => {
          setDuzenAcik(false);
          setBekle(true);
          if (title.trim() && title.trim() !== detay.track.title) {
            await AiMuzikParcaYenidenAdlandir(trackId, title.trim());
          }
          const sonuc = await AiMuzikOlustur({
            prompt,
            duration_seconds,
            idempotency_key: AiMuzikIdempotencyAnahtari(),
            revise_track_id: trackId,
          });
          setBekle(false);
          void bakiyeYenile();
          if (!sonuc.ok) {
            Alert.alert(t('aiMuzik.yenidenUretim'), sonuc.message ?? sonuc.error ?? t('aiMuzik.uretimBasarisiz'));
            return;
          }
          void AiMuzikDurdur();
          Alert.alert(t('aiMuzik.guncellendi'), t('aiMuzik.guncellendiBody'));
          void yukle();
        }}
      />

      <AiMuzikDurumPaylasSheet
        visible={durumSheetAcik}
        trackTitle={detay.track.title}
        onClose={() => setDurumSheetAcik(false)}
        onPaylas={async (caption) => {
          const r = await DurumMuzikOlustur(trackId, caption || undefined);
          if (r.ok) {
            setDurumSheetAcik(false);
            Alert.alert(t('aiMuzik.paylasildi'), t('aiMuzik.paylasildiBody'));
          } else {
            Alert.alert(t('aiMuzik.alertDurum'), r.hata ?? t('aiMuzik.paylasilamadi'));
          }
        }}
      />

      <AiMuzikBeklemeAnimasyonu
        visible={bekle}
        alt={t('aiMuzik.yeniTalimatlaUretiliyor')}
        onKapat={() => setBekle(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: BoslukTokenlari.lg,
    paddingBottom: 48,
    alignItems: 'center',
  },
  ustBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    width: 240,
    height: 240,
    borderRadius: YaricapTokenlari.lg,
    marginBottom: BoslukTokenlari.lg,
  },
  coverBos: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.surface,
  },
  baslik: {
    ...TipografiTokenlari.title,
    color: RenkTokenlari.text,
    textAlign: 'center',
  },
  meta: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 6,
    marginBottom: BoslukTokenlari.md,
  },
  ctaCam: {
    width: '100%',
    borderRadius: YaricapTokenlari.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    backgroundColor: RenkTokenlari.bgGlass,
    marginBottom: BoslukTokenlari.lg,
  },
  ctaSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: BoslukTokenlari.md,
    paddingVertical: 14,
    minHeight: 64,
  },
  ctaIkon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primarySoft + '22',
  },
  ctaBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  ctaAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
    marginTop: 2,
  },
  ctaCizgi: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: RenkTokenlari.border,
    marginLeft: 64,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RenkTokenlari.primarySoft,
    marginBottom: BoslukTokenlari.md,
  },
  progressWrap: {
    width: '100%',
    maxWidth: 320,
    marginBottom: BoslukTokenlari.xl,
  },
  aksiyonlar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginBottom: BoslukTokenlari.lg,
  },
  aksiyon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 76,
    minHeight: 64,
    gap: 4,
  },
  aksiyonYazi: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
  },
  pasaport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: BoslukTokenlari.md,
    borderRadius: YaricapTokenlari.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RenkTokenlari.border,
    overflow: 'hidden',
    backgroundColor: RenkTokenlari.bgGlass,
    marginBottom: BoslukTokenlari.lg,
    minHeight: 64,
  },
  pasaportBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
  },
  pasaportAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textDim,
  },
  sil: {
    marginTop: BoslukTokenlari.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  silYazi: {
    ...TipografiTokenlari.body,
    color: RenkTokenlari.danger,
  },
});
