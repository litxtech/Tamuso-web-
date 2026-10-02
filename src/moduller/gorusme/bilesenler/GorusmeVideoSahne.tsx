import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';
import { LiveKitBaglantiYoneticisi } from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';
import { AktifRtcSaglayici } from '../../livekit/MedyaBaglantisi';
import { LiveKitVideoViewAl } from '../../livekit/bilesenler/LiveKitVideoViewAl';
import { AgoraVideoYuzeyi } from '../../rtc/AgoraVideoYuzeyi';
import { MedyaUriGuvenli } from '../../mesajlasma/yardimcilar/MedyaUriGecerliMi';
import { TipografiTokenlari } from '../../../tasarim-sistemi/TipografiTokenlari';
import { useCeviri } from '../../../i18n/useCeviri';

type Props = {
  video: boolean;
  cameraOn: boolean;
  mock?: boolean;
  peerAvatar?: string | null;
  peerName?: string;
};

/**
 * WhatsApp tarzı: uzak tam ekran + yerel PiP.
 * Karşı taraf yokken yerel kamera tam ekran (bağlantı kontrolü).
 */
export function GorusmeVideoSahne({
  video,
  cameraOn,
  mock,
  peerAvatar,
  peerName,
}: Props) {
  const { t } = useCeviri();
  const VideoViewComp = LiveKitVideoViewAl();
  const [localVideo, setLocalVideo] = useState<LocalVideoTrack | null>(null);
  const [remoteVideo, setRemoteVideo] = useState<RemoteVideoTrack | null>(null);
  const [remoteIds, setRemoteIds] = useState<string[]>([]);
  const [kameraFacing, setKameraFacing] = useState<'user' | 'environment'>(
    () =>
      typeof LiveKitBaglantiYoneticisi.kameraFacingAl === 'function'
        ? LiveKitBaglantiYoneticisi.kameraFacingAl()
        : 'user',
  );

  useEffect(() => {
    return LiveKitBaglantiYoneticisi.videoDinle((s) => {
      setLocalVideo(s.localVideo);
      setRemoteVideo(s.remoteVideo);
      setRemoteIds(s.remoteIds);
      setKameraFacing(s.kameraFacing);
    });
  }, []);

  const harf = (peerName ?? '?').charAt(0).toLocaleUpperCase('tr-TR');
  const nativeOk = !mock && video && !!VideoViewComp;
  const hasRemote = !!remoteVideo;
  const localHazir = nativeOk && cameraOn && !!localVideo && !!VideoViewComp;
  // Ön: ayna; arka: düz — sağ/sol ters olmasın
  const mirrorLocal = kameraFacing === 'user';

  if (!mock && video && AktifRtcSaglayici() === 'agora') {
    return (
      <View style={styles.root}>
        <AgoraVideoYuzeyi />
        <View style={styles.pip}>
          <AgoraVideoYuzeyi yerel />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {nativeOk && hasRemote && VideoViewComp && remoteVideo ? (
        <VideoViewComp
          style={StyleSheet.absoluteFill}
          videoTrack={remoteVideo}
          objectFit="cover"
          zOrder={0}
        />
      ) : localHazir && localVideo && VideoViewComp ? (
        <VideoViewComp
          style={StyleSheet.absoluteFill}
          videoTrack={localVideo}
          objectFit="cover"
          mirror={mirrorLocal}
          zOrder={0}
        />
      ) : (
        // Tek arka plan katmanı GorusmeArkaPlan'da — burada ikinci gradient YOK
        <View style={styles.uzakBos} pointerEvents="none">
          {MedyaUriGuvenli(peerAvatar) ? (
            <Image source={{ uri: MedyaUriGuvenli(peerAvatar)! }} style={styles.uzakAvatar} />
          ) : (
            <View style={styles.uzakAvatarBos}>
              <Text style={styles.harf}>{harf}</Text>
            </View>
          )}
          <Text style={styles.uzakHint}>
            {video
              ? remoteIds.length > 0
                ? t('gorusme.kameraBaglaniyor')
                : mock
                  ? t('gorusme.demoGoruntu')
                  : t('gorusme.karsiBekleniyor')
              : t('gorusme.sesliArama')}
          </Text>
        </View>
      )}

      {video && hasRemote ? (
        <View style={styles.pip}>
          {localHazir && localVideo && VideoViewComp ? (
            <VideoViewComp
              style={StyleSheet.absoluteFill}
              videoTrack={localVideo}
              objectFit="cover"
              mirror={mirrorLocal}
              zOrder={1}
            />
          ) : (
            <View style={styles.pipKapali}>
              <Text style={styles.pipYazi}>
                {cameraOn
                  ? mock
                    ? t('gorusme.sen')
                    : t('gorusme.kamera')
                  : t('gorusme.kapali')}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  uzakBos: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  uzakAvatar: { width: 120, height: 120, borderRadius: 60 },
  uzakAvatarBos: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  harf: { fontSize: 44, fontWeight: '800', color: '#fff' },
  uzakHint: {
    ...TipografiTokenlari.caption,
    color: 'rgba(255,255,255,0.65)',
  },
  pip: {
    position: 'absolute',
    // Header satırının altında; SafeArea padding parent'ta
    top: 100,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pipKapali: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pipYazi: {
    ...TipografiTokenlari.micro,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
  },
});
