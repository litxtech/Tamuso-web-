import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  Room,
  RoomEvent,
  Track,
  type RemoteAudioTrack,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type RemoteVideoTrack,
} from 'livekit-client';
import { LiveKitTokenAl } from '../../livekit/token/LiveKitTokenAl';
import { AktifRtcSaglayici } from '../../livekit/MedyaBaglantisi';

/** Android izleyici: ana oda ile aynı uzak ses yükseltmesi. Yayıncıda 1 — yankı iptali bozulmasın. */
const ANDROID_IZLEYICI_SES = 3.5;

function kameraTrack(room: Room): RemoteVideoTrack | null {
  for (const p of room.remoteParticipants.values()) {
    const cam = p.getTrackPublication(Track.Source.Camera);
    if (cam?.track && cam.track.kind === Track.Kind.Video) {
      return cam.track as RemoteVideoTrack;
    }
    for (const pub of p.trackPublications.values()) {
      if (pub.kind === Track.Kind.Video && pub.track) {
        return pub.track as RemoteVideoTrack;
      }
    }
  }
  return null;
}

function sesSeviyesi(izleyiciBoost: boolean): number {
  if (Platform.OS === 'android' && izleyiciBoost) return ANDROID_IZLEYICI_SES;
  return 1;
}

function webSesiBagla(track: RemoteAudioTrack) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    const el = track.attach();
    el.autoplay = true;
    el.setAttribute('playsinline', 'true');
    el.volume = 1;
    el.style.display = 'none';
    if (!el.parentElement) document.body.appendChild(el);
    void el.play?.().catch(() => undefined);
  } catch {
    /* native çalma devam eder */
  }
}

function webSesiKopar(room: Room) {
  if (Platform.OS !== 'web') return;
  for (const p of room.remoteParticipants.values()) {
    for (const pub of p.trackPublications.values()) {
      if (pub.kind === Track.Kind.Audio && pub.track) {
        try {
          (pub.track as RemoteAudioTrack).detach().forEach((el) => el.remove());
        } catch {
          /* ignore */
        }
      }
    }
  }
}

function sesIziniAc(pub: RemoteTrackPublication, seviye: number) {
  if (pub.kind !== Track.Kind.Audio) return;
  try {
    if (!pub.isSubscribed) pub.setSubscribed(true);
  } catch {
    /* ignore */
  }
  const track = pub.track as RemoteAudioTrack | undefined;
  if (!track) return;
  try {
    track.mediaStreamTrack.enabled = true;
  } catch {
    /* ignore */
  }
  try {
    track.setVolume(seviye);
  } catch {
    /* ignore */
  }
  webSesiBagla(track);
}

/** Rakip odasındaki mikrofonları aç. Kendi kimliğini çalmaz. */
function rakipSesleriniAc(room: Room, seviye: number) {
  const yerel = room.localParticipant.identity;
  for (const p of room.remoteParticipants.values()) {
    katilimciSesiniAc(p, yerel, seviye);
  }
}

function katilimciSesiniAc(
  p: RemoteParticipant,
  yerelKimlik: string,
  seviye: number,
) {
  const kendi = !!p.identity && p.identity === yerelKimlik;
  try {
    p.setVolume(kendi ? 0 : Math.min(1, seviye > 0 ? 1 : 0));
  } catch {
    /* ignore */
  }
  if (kendi) return;
  for (const pub of p.trackPublications.values()) {
    sesIziniAc(pub, seviye);
  }
}

async function pkSesOturumunuAc(room: Room) {
  if (Platform.OS === 'web') {
    const oda = room as Room & { startAudio?: () => Promise<void> };
    await oda.startAudio?.().catch(() => undefined);
    return;
  }
  try {
    const native = require('@livekit/react-native') as {
      AudioSession?: { startAudioSession: () => Promise<void> };
    };
    await native.AudioSession?.startAudioSession();
  } catch {
    /* ana yayın oturumu zaten açık */
  }
}

/**
 * Rakibin canlı görüntüsü ve sesi. Kendi yayın odasına dokunmaz;
 * PK bitince yalnız bu bağlantı kapanır.
 */
export function usePkRakipGoruntu(
  roomName: string | null,
  mock?: boolean,
  /** true: Android izleyici sesini yükselt. Yayıncı false kalsın. */
  izleyiciBoost = false,
) {
  const [track, setTrack] = useState<RemoteVideoTrack | null>(null);

  useEffect(() => {
    if (!roomName || mock || AktifRtcSaglayici() !== 'livekit') {
      setTrack(null);
      return;
    }

    const tut: { room: Room | null; iptal: boolean } = {
      room: null,
      iptal: false,
    };
    const seviye = sesSeviyesi(izleyiciBoost);

    void (async () => {
      const token = await LiveKitTokenAl({ roomName, role: 'listener' });
      if (!token.ok || tut.iptal) return;
      const room = new Room({
        // Yarım ekranda video kalitesi ses aboneliğini düşürmesin
        adaptiveStream: false,
        dynacast: false,
        disconnectOnPageLeave: false,
      });
      tut.room = room;

      const yenile = () => {
        if (tut.iptal) return;
        rakipSesleriniAc(room, seviye);
        setTrack(kameraTrack(room));
      };

      room.on(RoomEvent.TrackPublished, (pub, participant) => {
        if (
          pub.kind === Track.Kind.Audio &&
          participant.identity !== room.localParticipant.identity
        ) {
          try {
            pub.setSubscribed(true);
          } catch {
            /* ignore */
          }
        }
      });
      room.on(RoomEvent.TrackSubscribed, (gelen, _pub, participant) => {
        if (gelen.kind === Track.Kind.Audio) {
          const kendi =
            !!participant?.identity &&
            participant.identity === room.localParticipant.identity;
          if (!kendi) {
            try {
              (gelen as RemoteAudioTrack).setVolume(seviye);
            } catch {
              /* ignore */
            }
            try {
              gelen.mediaStreamTrack.enabled = true;
            } catch {
              /* ignore */
            }
            webSesiBagla(gelen as RemoteAudioTrack);
          }
        }
        yenile();
      });
      room.on(RoomEvent.TrackUnsubscribed, yenile);
      room.on(RoomEvent.TrackMuted, yenile);
      room.on(RoomEvent.TrackUnmuted, yenile);
      room.on(RoomEvent.ParticipantConnected, yenile);
      room.on(RoomEvent.ParticipantDisconnected, yenile);

      try {
        await room.connect(token.url, token.token, { autoSubscribe: true });
        if (tut.iptal) {
          void room.disconnect();
          return;
        }
        await pkSesOturumunuAc(room);
        yenile();
      } catch {
        if (!tut.iptal) setTrack(null);
      }
    })();

    const tekrar = setInterval(() => {
      const room = tut.room;
      if (!room || tut.iptal || room.state !== 'connected') return;
      rakipSesleriniAc(room, seviye);
    }, 1500);

    return () => {
      tut.iptal = true;
      clearInterval(tekrar);
      const room = tut.room;
      tut.room = null;
      setTrack(null);
      if (room) {
        webSesiKopar(room);
        void room.disconnect();
      }
    };
  }, [roomName, mock, izleyiciBoost]);

  return track;
}
