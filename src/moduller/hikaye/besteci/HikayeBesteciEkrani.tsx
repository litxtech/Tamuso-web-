import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ModulHataSiniri } from '../../../ortak/hata-sinirlari/ModulHataSiniri';
import { ImagePickerOnIsit } from '../../../ortak/medya/ImagePickerHazirMi';
import { useAuth } from '../../../contexts/AuthContext';
import { useMisafirIslemKapisi } from '../../misafir-hesabi/islemler/useMisafirIslemKapisi';
import { HesabiTamamlaKarti } from '../../misafir-hesabi/bilesenler/HesabiTamamlaKarti';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';
import {
  HIKAYE_METIN_ARKAPLANLAR,
  HIKAYE_MUZIK_KLIP_MS,
  HIKAYE_VIDEO_MAX_BYTES,
} from '../sabitler';
import type { HikayeGorunurluk, HikayeMedyaTuru } from '../tipler';
import {
  HikayeMedyasiGaleriSec,
  HikayeYerelMedyaYukle,
} from '../islemler/HikayeMedyasiYukle';
import { HikayeOlustur } from '../islemler/HikayeIslemleri';
import { HikayeAnalitik } from '../islemler/HikayeAnalitik';
import { HikayePaylasServisi } from '../islemler/HikayePaylasServisi';
import { HikayeVideoDosyaKirp } from '../islemler/HikayeVideoKirp';
import {
  Video1080OnIsit,
  Video1080OnIsitIptal,
} from '../../../ortak/medya/VideoSikistir';
import { HikayePaylasBeklemeNotu } from '../yardimcilar/HikayePaylasBekleme';
import {
  HikayeKameraSahne,
  type HikayeKameraCekim,
} from './HikayeKameraSahne';
import {
  HikayeMedyaEditoru,
  type HikayeEditorSonuc,
  type HikayeMuzikSecim,
} from './HikayeMedyaEditoru';

type Taslak = {
  mediaType: HikayeMedyaTuru;
  mediaUrl: string | null;
  localUri: string | null;
  mime?: string | null;
  caption: string;
  backgroundColor: string;
  durationMs?: number;
};

/**
 * Hikaye oluşturma — kamera → Instagram tarzı editör (metin/efekt/müzik/link).
 */
export function HikayeBesteciEkrani() {
  const { t } = useCeviri();
  const { isGuest } = useAuth();
  const { upgradeAcik, upgradeKapat, islemiDene } = useMisafirIslemKapisi(isGuest);
  const params = useLocalSearchParams<{
    statusId?: string;
    previewUrl?: string;
    caption?: string;
    musicTrackId?: string;
    musicTitle?: string;
    musicCover?: string;
    musicArtist?: string;
  }>();

  const [taslak, setTaslak] = useState<Taslak | null>(null);
  const [visibility, setVisibility] = useState<HikayeGorunurluk>('public');
  const [busy, setBusy] = useState(false);
  const [yuklemePct, setYuklemePct] = useState<string | null>(null);
  const [adim, setAdim] = useState<'kamera' | 'onizle'>(
    params.statusId || params.musicTrackId ? 'onizle' : 'kamera',
  );

  const initialMusic = useMemo<HikayeMuzikSecim | null>(() => {
    if (typeof params.musicTrackId !== 'string' || !params.musicTrackId) {
      return null;
    }
    return {
      track_id: params.musicTrackId,
      title:
        typeof params.musicTitle === 'string' && params.musicTitle
          ? params.musicTitle
          : t('hikaye.muzik'),
      cover_url:
        typeof params.musicCover === 'string' && params.musicCover
          ? params.musicCover
          : null,
      audio_url: null,
      duration_ms: null,
      artist_name:
        typeof params.musicArtist === 'string' && params.musicArtist
          ? params.musicArtist
          : null,
      clip_start_ms: 0,
    };
  }, [
    params.musicTrackId,
    params.musicTitle,
    params.musicCover,
    params.musicArtist,
    t,
  ]);

  useEffect(() => {
    ImagePickerOnIsit({ izinIste: false });
    HikayeAnalitik('story_create_open');
  }, []);

  useEffect(() => {
    if (params.statusId && typeof params.statusId === 'string') {
      setTaslak({
        mediaType: params.previewUrl ? 'image' : 'text',
        mediaUrl:
          typeof params.previewUrl === 'string' ? params.previewUrl : null,
        localUri: null,
        caption:
          typeof params.caption === 'string'
            ? params.caption
            : t('hikaye.paylasimVarsayilan'),
        backgroundColor: HIKAYE_METIN_ARKAPLANLAR[0]!,
      });
      setAdim('onizle');
      return;
    }
    if (params.musicTrackId && typeof params.musicTrackId === 'string') {
      setTaslak({
        mediaType: 'text',
        mediaUrl: null,
        localUri: null,
        caption: '',
        backgroundColor: HIKAYE_METIN_ARKAPLANLAR[0]!,
      });
      setAdim('onizle');
    }
  }, [
    params.statusId,
    params.previewUrl,
    params.caption,
    params.musicTrackId,
    t,
  ]);

  const yerelTaslakKur = (input: {
    mediaType: Exclude<HikayeMedyaTuru, 'text'>;
    uri: string;
    mime?: string | null;
    durationMs?: number;
  }) => {
    // Video: sıkıştırmayı editörde arka planda başlat → yayın anında bekleme azalır
    if (input.mediaType === 'video') {
      Video1080OnIsit(input.uri, { durationMs: input.durationMs });
    }
    setTaslak({
      mediaType: input.mediaType,
      mediaUrl: null,
      localUri: input.uri,
      mime: input.mime,
      caption: '',
      backgroundColor: HIKAYE_METIN_ARKAPLANLAR[0]!,
      durationMs: input.durationMs,
    });
    setAdim('onizle');
  };

  const galeriAc = () => {
    islemiDene('durum_paylas', () => {
      void (async () => {
        const r = await HikayeMedyasiGaleriSec();
        if (!r.ok) {
          if (!r.iptal) Alert.alert(t('ortak.hata'), r.hata);
          return;
        }
        yerelTaslakKur({
          mediaType: r.mediaType,
          uri: r.uri,
          mime: r.mime,
          durationMs: r.durationMs,
        });
      })();
    });
  };

  const galeriVideoAc = () => {
    islemiDene('durum_paylas', () => {
      void (async () => {
        const r = await HikayeMedyasiGaleriSec({ onlyVideo: true });
        if (!r.ok) {
          if (!r.iptal) Alert.alert(t('ortak.hata'), r.hata);
          return;
        }
        yerelTaslakKur({
          mediaType: 'video',
          uri: r.uri,
          mime: r.mime,
          durationMs: r.durationMs,
        });
      })();
    });
  };

  const kameraCekim = (cek: HikayeKameraCekim) => {
    islemiDene('durum_paylas', () => {
      yerelTaslakKur({
        mediaType: cek.mediaType,
        uri: cek.uri,
        mime: cek.mime,
        durationMs: cek.durationMs,
      });
    });
  };

  const editorGeri = () => {
    if (taslak?.localUri) Video1080OnIsitIptal(taslak.localUri);
    if (params.statusId || params.musicTrackId) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)' as any);
      return;
    }
    setAdim('kamera');
    setTaslak(null);
  };

  const yayinla = (sonuc: HikayeEditorSonuc) => {
    if (!taslak || busy) return;
    islemiDene('durum_paylas', () => {
      void (async () => {
        setBusy(true);
        setYuklemePct(t('hikaye.yayinlaniyor'));
        try {
          if (params.statusId && typeof params.statusId === 'string') {
            const r = await HikayePaylasServisi({
              kaynak: {
                tur: 'status_post',
                id: params.statusId,
                previewUrl: taslak.mediaUrl ?? taslak.localUri,
                caption: sonuc.caption || taslak.caption,
              },
              caption: sonuc.caption || taslak.caption,
              backgroundColor:
                sonuc.backgroundColor ?? taslak.backgroundColor,
            });
            if (!r.ok) {
              HikayeAnalitik('story_create_fail');
              Alert.alert(t('ortak.hata'), r.hata);
              return;
            }
          } else {
            if (taslak.mediaType === 'text' && !sonuc.caption.trim()) {
              Alert.alert(t('ortak.hata'), t('hikaye.metinBos'));
              return;
            }

            let remoteUrl = taslak.mediaUrl;
            let yerelUri = taslak.localUri;
            let videoDosyaKirpildi = false;
            let sureMs: number | null = null;

            if (taslak.mediaType === 'video' && sonuc.videoTrim) {
              sureMs = Math.max(
                500,
                sonuc.videoTrim.endMs - sonuc.videoTrim.startMs,
              );
            } else if (sonuc.music && taslak.mediaType !== 'video') {
              sureMs = HIKAYE_MUZIK_KLIP_MS;
            } else if (taslak.durationMs && taslak.durationMs > 0) {
              sureMs = taslak.durationMs;
            }

            // Video: kırpma aralığını gerçek dosyaya uygula → MB düşer
            if (
              taslak.mediaType === 'video' &&
              yerelUri &&
              !remoteUrl &&
              sonuc.videoTrim
            ) {
              setYuklemePct(t('hikaye.paylasBekleHazirlaniyor'));
              const kirp = await HikayeVideoDosyaKirp({
                uri: yerelUri,
                startMs: sonuc.videoTrim.startMs,
                endMs: sonuc.videoTrim.endMs,
                fullDurationMs: taslak.durationMs ?? null,
                maxBytes: HIKAYE_VIDEO_MAX_BYTES,
              });
              if (!kirp.ok) {
                HikayeAnalitik('story_create_fail');
                Alert.alert(t('ortak.hata'), kirp.hata);
                return;
              }
              if (kirp.trimmed && kirp.uri !== yerelUri) {
                // Prefetch orijinal URI içindi; kırpılmış dosya için yeniden başlat
                Video1080OnIsitIptal(yerelUri);
                Video1080OnIsit(kirp.uri, { durationMs: sureMs });
              }
              yerelUri = kirp.uri;
              videoDosyaKirpildi = kirp.trimmed;
            }

            if (taslak.mediaType !== 'text' && !remoteUrl && yerelUri) {
              setYuklemePct(
                taslak.mediaType === 'video'
                  ? HikayePaylasBeklemeNotu(0, t)
                  : t('hikaye.yukleniyor'),
              );
              const up = await HikayeYerelMedyaYukle({
                uri: yerelUri,
                mime: taslak.mime,
                tur: taslak.mediaType,
                durationMs: sureMs ?? taslak.durationMs,
                onSikistirma: (pct) => {
                  setYuklemePct(HikayePaylasBeklemeNotu(pct, t));
                },
              });
              if (!up.ok) {
                HikayeAnalitik('story_create_fail');
                Alert.alert(t('ortak.hata'), up.hata);
                return;
              }
              remoteUrl = up.url;
            }

            setYuklemePct(t('hikaye.paylasBekleGonderiliyor'));

            // Dosya zaten kırpıldıysa playback trim meta’sına gerek yok
            const videoTrimMeta =
              taslak.mediaType === 'video' &&
              sonuc.videoTrim &&
              !videoDosyaKirpildi
                ? {
                    video_trim_start_ms: sonuc.videoTrim.startMs,
                    video_trim_end_ms: sonuc.videoTrim.endMs,
                  }
                : {};

            const r = await HikayeOlustur({
              mediaType: taslak.mediaType,
              mediaUrl: remoteUrl,
              caption: sonuc.caption.trim() || null,
              durationMs: sureMs,
              backgroundColor:
                taslak.mediaType === 'text'
                  ? sonuc.backgroundColor ?? taslak.backgroundColor
                  : null,
              textStyle: {
                effect_id: sonuc.effectId,
                ...videoTrimMeta,
              },
              overlays: sonuc.overlays.length ? sonuc.overlays : null,
              visibility,
            });
            if (!r.ok) {
              HikayeAnalitik('story_create_fail');
              Alert.alert(t('ortak.hata'), r.hata);
              return;
            }
          }
          HikayeAnalitik('story_create_publish', {
            media_type: taslak.mediaType,
            effect: sonuc.effectId,
            has_music: !!sonuc.music,
            has_link: !!sonuc.link,
          });
          router.replace('/(tabs)' as any);
        } finally {
          setBusy(false);
          setYuklemePct(null);
        }
      })();
    });
  };

  if (adim === 'kamera' && !params.statusId) {
    return (
      <View style={styles.full}>
        <ModulHataSiniri modulAdi="hikaye-kamera">
          <HikayeKameraSahne
            onCekim={kameraCekim}
            onGaleri={galeriAc}
            onGaleriVideo={galeriVideoAc}
            onKapat={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)' as any);
            }}
          />
        </ModulHataSiniri>
        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => undefined}
        />
      </View>
    );
  }

  if (!taslak) {
    return (
      <View style={styles.full}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const onizleUri = taslak.localUri ?? taslak.mediaUrl;

  return (
    <View style={styles.full}>
      <ModulHataSiniri modulAdi="hikaye-besteci">
        <HikayeMedyaEditoru
          mediaType={taslak.mediaType}
          mediaUri={onizleUri}
          initialCaption={taslak.caption}
          initialBackground={taslak.backgroundColor}
          initialMusic={initialMusic}
          initialDurationMs={taslak.durationMs ?? null}
          busy={busy}
          publishLabel={t('hikaye.yayinla')}
          onPublish={yayinla}
          onBack={editorGeri}
          visibility={visibility}
          onVisibilityChange={setVisibility}
        />

        {busy && yuklemePct ? (
          <View style={styles.yukleOverlay}>
            <ActivityIndicator color={RenkTokenlari.primary} size="large" />
            <Text style={styles.yukleYazi}>{yuklemePct}</Text>
          </View>
        ) : null}

        <HesabiTamamlaKarti
          visible={upgradeAcik}
          onClose={upgradeKapat}
          onCompleted={() => undefined}
        />
      </ModulHataSiniri>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  yukleOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 20,
  },
  yukleYazi: {
    ...TipografiTokenlari.caption,
    color: '#fff',
    fontWeight: '600',
  },
});
