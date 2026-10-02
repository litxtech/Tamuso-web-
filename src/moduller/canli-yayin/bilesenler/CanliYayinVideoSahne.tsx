import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';
import { LiveKitBaglantiYoneticisi } from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';
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
};

/**
 * Canli yayin video sahnesi — LiveKit VideoView.
 * Memo: yorum/hediye state degisince video remount olmaz.
 */
export const CanliYayinVideoSahne = React.memo(function CanliYayinVideoSahne({
  rol,
  mock,
  durumYazi,
}: Props) {
  const { t } = useCeviri();
  const [VideoViewComp, setVideoViewComp] = useState(() =>
    LiveKitVideoViewAl(),
  );
  const [localVideo, setLocalVideo] = useState<LocalVideoTrack | null>(null);
  const [remoteVideo, setRemoteVideo] = useState<RemoteVideoTrack | null>(null);
  const [kameraFacing, setKameraFacing] = useState<'user' | 'environment'>(
    () => LiveKitBaglantiYoneticisi.kameraFacingAl(),
  );
  const [streamTick, setStreamTick] = useState(0);

  useEffect(() => {
    return LiveKitBaglantiYoneticisi.videoDinle((s) => {
      setLocalVideo(s.localVideo);
      setRemoteVideo(s.remoteVideo);
      setKameraFacing(s.kameraFacing);
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

  // mediaStream gecikmeli gelince RTCView boş URL kalmasın — kısa poll
  useEffect(() => {
    if (mock) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setLocalVideo(LiveKitBaglantiYoneticisi.localVideoTrack());
      setRemoteVideo(LiveKitBaglantiYoneticisi.remoteVideoTrack());
      setStreamTick((x) => x + 1);
      if (n >= 12) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [mock, rol]);

  const track =
    rol === 'host'
      ? localVideo
      : remoteVideo ?? localVideo;
  const nativeOk = !mock && !!track && !!VideoViewComp;
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
  const trackKey = `${track?.sid ?? 'none'}-${streamId || 'waiting'}`;

  if (!mock && AktifRtcSaglayici() === 'agora') {
    return (
      <View style={styles.root}>
        <AgoraVideoYuzeyi yerel={rol === 'host'} />
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
      : rol === 'host'
        ? t('canliYayin.kameraBaglanmadi')
        : t('canliYayin.yayinciBekleniyor'));

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
});
