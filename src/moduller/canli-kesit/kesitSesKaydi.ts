import { Platform } from 'react-native';
import { LiveKitBaglantiYoneticisi } from '../livekit/baglanti/LiveKitBaglantiYoneticisi';
import { IosKesitKayitSesi } from '../livekit/polyfill/LiveKitGlobalsKaydet';
import { canliMuzikDevam, canliMuzikKesitSes } from '../canli-yayin/bilesenler/CanliMuzikDinle';

/**
 * Kesit penceresi: yayın mikrofonunu bırak, yankı iptalini kapat.
 * Kamera hem konuşmayı hem hoparlördeki müziği (kütüphane ve YouTube) kaydeder.
 * YouTube başka uygulamadaysa iOS onu karışıma bırakır; kulaklıktan gelen ses mikrofona girmez.
 */
export async function kesitSesKaydiAc(): Promise<void> {
  const lp = LiveKitBaglantiYoneticisi.oda()?.localParticipant;
  try {
    await lp?.setMicrophoneEnabled(false);
  } catch {
    /* mikrofon zaten kapalı olabilir */
  }
  if (Platform.OS === 'ios') {
    await IosKesitKayitSesi(true);
  } else if (Platform.OS === 'android') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const native = require('@livekit/react-native') as {
        AudioSession: { configureAudio: (opts: unknown) => Promise<void> };
      };
      await native.AudioSession.configureAudio({
        android: {
          preferredOutputList: ['speaker', 'bluetooth', 'headset', 'earpiece'],
          audioTypeOptions: {
            manageAudioFocus: false,
            audioMode: 'normal',
            audioFocusMode: 'gainTransientMayDuck',
            audioStreamType: 'music',
            audioAttributesUsageType: 'media',
            audioAttributesContentType: 'music',
            forceHandleAudioRouting: false,
          },
        },
      });
    } catch {
      /* yayın sesi duruyorsa kamera yine de konuşmayı yazar */
    }
  }
  canliMuzikKesitSes(true);
  canliMuzikDevam();
  await new Promise((r) => setTimeout(r, 180));
}

/** Kamera mikrofonu açınca LiveKit ses modunu yeniden video kaydına çeker. */
export async function kesitSesModunuTut(): Promise<void> {
  if (Platform.OS === 'ios') await IosKesitKayitSesi(true);
  canliMuzikDevam();
}

/** Yayın oturumunu ve mikrofonu kesitten önceki haline getirir. */
export async function kesitSesKaydiKapat(): Promise<void> {
  canliMuzikKesitSes(false);
  if (Platform.OS === 'ios') {
    await IosKesitKayitSesi(false);
  }
  await LiveKitBaglantiYoneticisi.sesOturumunuYenile(true);
  canliMuzikDevam();
}
