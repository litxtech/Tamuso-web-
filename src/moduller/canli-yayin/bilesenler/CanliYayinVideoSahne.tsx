import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';
import {
  LiveKitBaglantiYoneticisi,
  type LiveKitVideoDurumu,
} from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';
import { AktifRtcSaglayici } from '../../livekit/MedyaBaglantisi';
import { AgoraVideoYuzeyi } from '../../rtc/AgoraVideoYuzeyi';
import {
  LiveKitVideoViewAl,
  LiveKitVideoViewCacheTemizle,
} from '../../livekit/bilesenler/LiveKitVideoViewAl';
import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  /** host: yerel kamera; izleyici: uzak yayinci */
  rol: 'host' | 'izleyici';
  mock?: boolean;
  durumYazi?: string;
  /** Bağlantı başarısız — metinli bekleme ekranı */
  hata?: boolean;
  /** İzleyici bekleme anında bulanık arka plan (yayıncı avatarı) */
  kapakUrl?: string | null;
  /** Bağlantı hatasında "Tekrar dene" */
  onTekrarDene?: () => void;
};

/** İzleyiciye metinli ara sayfa yok: yalnız kapak, video, kamera kapalı veya hata */
type IzleyiciAsama = 'yukleniyor' | 'oynuyor' | 'kameraKapali' | 'hata';

/** İlk kare sinyali gelmese de video takıldıktan sonra kapak en geç bu süre sonra kalkar */
const KAPAK_AZAMI_MS = 1_200;

const BOS_DURUM: LiveKitVideoDurumu = {
  localVideo: null,
  remoteVideo: null,
  remoteIds: [],
  kameraFacing: 'user',
  nesil: 0,
  uzakIlkKare: false,
  uzakKamera: 'yok',
  uzakKatilimciVar: false,
  baglanti: 'idle',
  baglantiAni: null,
  yenidenBaglaniyor: false,
};

/**
 * Canli yayin video sahnesi — LiveKit VideoView.
 * Memo: yorum/hediye state degisince video remount olmaz.
 */
export const CanliYayinVideoSahne = React.memo(function CanliYayinVideoSahne({
  rol,
  mock,
  durumYazi,
  hata,
  kapakUrl,
  onTekrarDene,
}: Props) {
  const { t } = useCeviri();
  const [VideoViewComp, setVideoViewComp] = useState(() =>
    LiveKitVideoViewAl(),
  );
  // Mini çubuktan dönüş / PK sonrası remount: akan görüntü kapakla örtülmesin
  const [ilkDurum] = useState<LiveKitVideoDurumu>(() => {
    let s = BOS_DURUM;
    LiveKitBaglantiYoneticisi.videoDinle((x) => {
      s = x;
    })();
    return s;
  });
  const [localVideo, setLocalVideo] = useState<LocalVideoTrack | null>(ilkDurum.localVideo);
  const [remoteVideo, setRemoteVideo] = useState<RemoteVideoTrack | null>(
    ilkDurum.remoteVideo,
  );
  const [durum, setDurum] = useState<LiveKitVideoDurumu>(ilkDurum);
  const [kameraFacing, setKameraFacing] = useState<'user' | 'environment'>(
    () => LiveKitBaglantiYoneticisi.kameraFacingAl(),
  );
  const [streamTick, setStreamTick] = useState(0);
  const [nesil, setNesil] = useState(0);

  useEffect(() => {
    return LiveKitBaglantiYoneticisi.videoDinle((s) => {
      setLocalVideo(s.localVideo);
      setRemoteVideo(s.remoteVideo);
      setKameraFacing(s.kameraFacing);
      setNesil(s.nesil ?? 0);
      setDurum(s);
    });
  }, []);

  // Native VideoView geç yüklenirse yeniden dene
  useEffect(() => {
    if (VideoViewComp || mock) return;
    const t1 = setTimeout(() => {
      LiveKitVideoViewCacheTemizle();
      setVideoViewComp(LiveKitVideoViewAl());
    }, 400);
    const t2 = setTimeout(() => {
      LiveKitVideoViewCacheTemizle();
      setVideoViewComp(LiveKitVideoViewAl());
    }, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [VideoViewComp, mock]);

  // İkinci yayında track geç gelir veya readyState 'ended' kalır.
  // İzleyici SFU'dan görür; yerel VideoView ancak 'live' olunca bağlanır.
  useEffect(() => {
    if (mock) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      const yerel = LiveKitBaglantiYoneticisi.localVideoTrack();
      const uzak = LiveKitBaglantiYoneticisi.remoteVideoTrack();
      setLocalVideo(yerel);
      setRemoteVideo(uzak);
      setStreamTick((x) => x + 1);
      const aday = rol === 'host' ? yerel : uzak ?? yerel;
      const durum = aday?.mediaStreamTrack?.readyState;
      if ((!!durum && durum !== 'ended') || n >= 40) clearInterval(id);
      if (
        rol === 'host' &&
        n === 8 &&
        (!yerel || durum === 'ended')
      ) {
        LiveKitBaglantiYoneticisi.kameraArkaPlandaDene(4);
      }
    }, 300);
    return () => clearInterval(id);
  }, [mock, rol]);

  const track =
    rol === 'host'
      ? localVideo
      : remoteVideo ?? localVideo;
  const trackCanli = (() => {
    if (!track) return false;
    try {
      const durum = track.mediaStreamTrack?.readyState;
      // Android native readyState'i cihaz diliyle küçültüyor: Türkçede "lıve"
      return durum !== 'ended';
    } catch {
      return true;
    }
  })();
  const nativeOk = !mock && !!track && trackCanli && !!VideoViewComp;

  // Ön kamera: ayna (selfie konforu). Arka kamera: düz (sağ/sol ters olmasın).
  const mirrorLocal = rol === 'host' && kameraFacing === 'user';
  void streamTick; // poll re-render — mediaStream.id güncellensin
  const streamId = (() => {
    try {
      const ms = (track as { mediaStream?: { id?: string } } | null)
        ?.mediaStream;
      return ms?.id ?? '';
    } catch {
      return '';
    }
  })();
  const trackKey = `${track?.sid ?? 'none'}-${streamId || 'waiting'}-${nesil}`;

  const izleyici = rol === 'izleyici' && !mock;
  // Kare sinyali gecikse/hiç gelmese de takılan video kapağın altında kalmasın
  const [kapakYedekKey, setKapakYedekKey] = useState<string | null>(null);
  useEffect(() => {
    if (!izleyici || !nativeOk || durum.uzakIlkKare) return;
    const key = trackKey;
    const id = setTimeout(() => setKapakYedekKey(key), KAPAK_AZAMI_MS);
    return () => clearTimeout(id);
  }, [izleyici, nativeOk, durum.uzakIlkKare, trackKey]);

  const asama: IzleyiciAsama = (() => {
    if (hata) return 'hata';
    if (durum.uzakKamera === 'kapali') return 'kameraKapali';
    if (nativeOk && (durum.uzakIlkKare || kapakYedekKey === trackKey)) return 'oynuyor';
    return 'yukleniyor';
  })();
  const oynuyor = izleyici && asama === 'oynuyor';

  const teshisRef = useRef({ track, nativeOk, VideoViewComp, durum, trackCanli });
  teshisRef.current = { track, nativeOk, VideoViewComp, durum, trackCanli };
  useEffect(() => {
    if (!__DEV__ || !izleyici || asama !== 'yukleniyor') return;
    const id = setInterval(() => {
      const s = teshisRef.current;
      let readyState: string | undefined;
      try {
        readyState = s.track?.mediaStreamTrack?.readyState;
      } catch {
        readyState = 'okunamadi';
      }
      console.log('[CanliVideo] yukleniyor', {
        track: !!s.track,
        sid: s.track?.sid ?? null,
        readyState,
        trackCanli: s.trackCanli,
        videoView: !!s.VideoViewComp,
        nativeOk: s.nativeOk,
        ilkKare: s.durum.uzakIlkKare,
        kamera: s.durum.uzakKamera,
        baglanti: s.durum.baglanti,
        uzakVar: s.durum.uzakKatilimciVar,
        remoteIds: s.durum.remoteIds.length,
        yoneticiUzakVideo: !!LiveKitBaglantiYoneticisi.remoteVideoTrack(),
        yoneticiDurum: LiveKitBaglantiYoneticisi.durumGetir(),
      });
    }, 3_000);
    return () => clearInterval(id);
  }, [izleyici, asama]);

  // İlk kare gelince kapak yumuşakça kalkar; görüntü giderse geri gelir
  const baslangictaOynuyor =
    rol === 'izleyici' && ilkDurum.uzakIlkKare && ilkDurum.uzakKamera !== 'kapali';
  const kapakOpak = useRef(new Animated.Value(baslangictaOynuyor ? 0 : 1)).current;
  const [kapakGizli, setKapakGizli] = useState(baslangictaOynuyor);
  useEffect(() => {
    if (!izleyici) return;
    if (oynuyor) {
      const anim = Animated.timing(kapakOpak, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      });
      anim.start(({ finished }) => {
        if (finished) setKapakGizli(true);
      });
      return () => anim.stop();
    }
    kapakOpak.setValue(1);
    setKapakGizli(false);
    return undefined;
  }, [izleyici, oynuyor, kapakOpak]);

  if (!mock && AktifRtcSaglayici() === 'agora') {
    return (
      <View style={styles.root}>
        <AgoraVideoYuzeyi yerel={rol === 'host'} />
      </View>
    );
  }

  if (izleyici) {
    const videoGoster = nativeOk && asama !== 'kameraKapali' && asama !== 'hata';
    const kapakIcerik = (() => {
      switch (asama) {
        case 'kameraKapali':
          return (
            <DurumKarti ikon="videocam-off-outline" baslik={t('canliYayin.kameraKapali')} />
          );
        case 'hata':
          return (
            <DurumKarti
              ikon="cloud-offline-outline"
              baslik={t('canliYayin.baglantiKurulamadi')}
              alt={durumYazi}
              eylem={onTekrarDene ? t('ortak.tekrarDene') : undefined}
              onEylem={onTekrarDene}
            />
          );
        default:
          return <ActivityIndicator color="rgba(255,255,255,0.85)" />;
      }
    })();

    return (
      <View style={styles.root}>
        {videoGoster && VideoViewComp && track ? (
          <VideoViewComp
            key={trackKey}
            style={StyleSheet.absoluteFill}
            videoTrack={track}
            objectFit="cover"
            mirror={false}
            zOrder={0}
          />
        ) : null}
        {!kapakGizli ? (
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: kapakOpak }]}
            pointerEvents="box-none"
          >
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {kapakUrl ? (
                <Image
                  source={{ uri: kapakUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  blurRadius={28}
                />
              ) : (
                <LinearGradient
                  colors={['#241830', '#0E0A14', '#16121E']}
                  start={{ x: 0.1, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View style={[StyleSheet.absoluteFill, styles.kapakKarartma]} />
            </View>
            <View style={styles.bos} pointerEvents="box-none">
              {kapakIcerik}
            </View>
          </Animated.View>
        ) : null}
      </View>
    );
  }

  const baslik = mock
    ? t('canliYayin.demoYayin')
    : track
      ? t('canliYayin.goruntuBaglaniyor')
      : t('canliYayin.goruntuYok');
  const alt =
    durumYazi ||
    (mock
      ? t('canliYayin.demoAlt')
      : t('canliYayin.kameraBaglanmadi'));

  return (
    <View style={styles.root}>
      {nativeOk && VideoViewComp && track ? (
        <VideoViewComp
          key={trackKey}
          style={StyleSheet.absoluteFill}
          videoTrack={track}
          objectFit="cover"
          mirror={mirrorLocal}
          zOrder={0}
        />
      ) : (
        <LinearGradient
          colors={['#241830', '#0E0A14', '#16121E']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.bos}>
            <View style={styles.ikonHalka}>
              <Ionicons
                name={mock ? 'videocam-outline' : 'videocam-off-outline'}
                size={36}
                color={RenkTokenlari.primarySoft}
              />
            </View>
            <Text style={styles.bosBaslik}>{baslik}</Text>
            <Text style={styles.bosAlt} numberOfLines={3}>
              {alt}
            </Text>
            {!mock && !track ? (
              <ActivityIndicator
                color={RenkTokenlari.primarySoft}
                style={styles.spinner}
              />
            ) : null}
          </View>
        </LinearGradient>
      )}
    </View>
  );
});

function DurumKarti({
  ikon,
  baslik,
  alt,
  eylem,
  onEylem,
}: {
  ikon: React.ComponentProps<typeof Ionicons>['name'];
  baslik: string;
  alt?: string;
  eylem?: string;
  onEylem?: () => void;
}) {
  return (
    <>
      <View style={styles.ikonHalka}>
        <Ionicons name={ikon} size={32} color="#FFFFFF" />
      </View>
      <Text style={styles.bosBaslik}>{baslik}</Text>
      {alt ? (
        <Text style={styles.bosAlt} numberOfLines={3}>
          {alt}
        </Text>
      ) : null}
      {eylem && onEylem ? (
        <Pressable onPress={onEylem} style={styles.eylemBtn} hitSlop={8}>
          <Text style={styles.eylemYazi}>{eylem}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A0810',
  },
  bos: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  ikonHalka: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,64,145,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(232,64,145,0.32)',
    marginBottom: 4,
  },
  bosBaslik: {
    ...TipografiTokenlari.h2,
    color: RenkTokenlari.text,
    textAlign: 'center',
  },
  bosAlt: {
    ...TipografiTokenlari.caption,
    color: RenkTokenlari.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  spinner: { marginTop: 8 },
  kapakKarartma: {
    backgroundColor: 'rgba(8,6,12,0.35)',
  },
  eylemBtn: {
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: RenkTokenlari.primarySoft,
  },
  eylemYazi: {
    ...TipografiTokenlari.body,
    color: '#1A1220',
    fontWeight: '800',
  },
});
