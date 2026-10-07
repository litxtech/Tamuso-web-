import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Track } from 'livekit-client';
import { LiveKitBaglantiYoneticisi } from '../livekit/baglanti/LiveKitBaglantiYoneticisi';
import { kesitUzanti, type KesitSaniye } from './canliKesitDogrulama';

export type KesitDosya = {
  uri: string;
  mime: string;
  bayt: number;
  width: number | null;
  height: number | null;
};

type MediaRecorderSinifi = {
  new (stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
  isTypeSupported: (t: string) => boolean;
};

function videoKaydedici(): { MR: MediaRecorderSinifi; mime: string } | null {
  const MR = globalThis.MediaRecorder as MediaRecorderSinifi | undefined;
  if (!MR || typeof MR.isTypeSupported !== 'function') return null;
  const aday = [
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mime = aday.find((t) => {
    try {
      return MR.isTypeSupported(t);
    } catch {
      return false;
    }
  });
  if (!mime) return null;
  return { MR, mime };
}

/** RN shim yalnızca PCM ses kaydeder. Video desteği yoksa false. */
export function canliKesitYerelKayitVarMi(): boolean {
  return videoKaydedici() != null;
}

function yerelVideoAyar(): { track: MediaStreamTrack; width: number | null; height: number | null } | null {
  const lp = LiveKitBaglantiYoneticisi.oda()?.localParticipant;
  const yayin = lp?.getTrackPublication(Track.Source.Camera);
  const track = yayin?.track?.mediaStreamTrack;
  if (!track || track.readyState !== 'live') return null;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const s = track.getSettings?.();
    if (s?.width && s.width > 0) width = s.width;
    if (s?.height && s.height > 0) height = s.height;
  } catch {
    /* ayar okunamazsa kırpma yine izleyicide cover */
  }
  return { track, width, height };
}

function kayitAkisi(video: MediaStreamTrack): MediaStream | null {
  const Ctor = globalThis.MediaStream;
  if (typeof Ctor !== 'function') return null;
  if (Platform.OS !== 'web') {
    return new Ctor([video]);
  }
  const mic = LiveKitBaglantiYoneticisi.oda()
    ?.localParticipant?.getTrackPublication(Track.Source.Microphone)
    ?.track?.mediaStreamTrack;
  const parcalar = [video];
  if (mic && mic.readyState === 'live') parcalar.push(mic);
  return new Ctor(parcalar);
}

async function parcayiYaz(parcalar: Blob[], mime: string): Promise<{ uri: string; bayt: number }> {
  const blob = new Blob(parcalar, { type: mime });
  const bayt = blob.size;
  const ext = kesitUzanti(mime) ?? 'webm';
  const kok = FileSystem.cacheDirectory;
  if (!kok) {
    const url = URL.createObjectURL(blob);
    return { uri: url, bayt };
  }
  const uri = `${kok}kesit-${Date.now()}.${ext}`;
  const buf = new Uint8Array(await blob.arrayBuffer());
  let ikili = '';
  const adim = 8192;
  for (let i = 0; i < buf.length; i += adim) {
    ikili += String.fromCharCode(...buf.subarray(i, i + adim));
  }
  const b64 = globalThis.btoa(ikili);
  await FileSystem.writeAsStringAsync(uri, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { uri, bayt };
}

/**
 * Yayın track'ini kopyalamadan, yalnızca bu çağrı süresince kaydeder.
 * Track.stop / unpublish yok. RN'de video MediaRecorder yoksa null döner.
 */
export async function canliKesitYerelKaydet(opts: {
  saniye: KesitSaniye;
  sinyal?: AbortSignal;
  onIlerleme?: (oran: number) => void;
}): Promise<KesitDosya | null> {
  const kayit = videoKaydedici();
  const video = yerelVideoAyar();
  if (!kayit || !video) return null;
  const akis = kayitAkisi(video.track);
  if (!akis) return null;

  const { MR, mime } = kayit;
  const rec = new MR(akis, {
    mimeType: mime,
    videoBitsPerSecond: 2_000_000,
    audioBitsPerSecond: 96_000,
  });
  const parcalar: Blob[] = [];
  rec.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) parcalar.push(ev.data);
  };

  const ms = opts.saniye * 1000;
  const bas = Date.now();
  let zamanlayici: ReturnType<typeof setInterval> | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      const bitir = () => {
        try {
          if (rec.state !== 'inactive') rec.stop();
        } catch (e) {
          reject(e instanceof Error ? e : new Error('stop'));
        }
      };
      const iptal = () => {
        bitir();
        reject(new Error('iptal'));
      };
      if (opts.sinyal?.aborted) {
        reject(new Error('iptal'));
        return;
      }
      opts.sinyal?.addEventListener('abort', iptal, { once: true });
      rec.onerror = () => {
        opts.sinyal?.removeEventListener('abort', iptal);
        reject(new Error('kayit'));
      };
      rec.onstop = () => {
        opts.sinyal?.removeEventListener('abort', iptal);
        resolve();
      };
      try {
        rec.start(1000);
      } catch (e) {
        opts.sinyal?.removeEventListener('abort', iptal);
        reject(e instanceof Error ? e : new Error('start'));
        return;
      }
      zamanlayici = setInterval(() => {
        const oran = Math.min(1, (Date.now() - bas) / ms);
        opts.onIlerleme?.(oran);
        if (Date.now() - bas >= ms) {
          if (zamanlayici) clearInterval(zamanlayici);
          zamanlayici = null;
          bitir();
        }
      }, 250);
    });
  } finally {
    if (zamanlayici) clearInterval(zamanlayici);
  }

  if (opts.sinyal?.aborted) {
    parcalar.length = 0;
    throw new Error('iptal');
  }
  if (parcalar.length === 0) return null;
  const yazilan = await parcayiYaz(parcalar, mime);
  parcalar.length = 0;
  return {
    uri: yazilan.uri,
    mime,
    bayt: yazilan.bayt,
    width: video.width,
    height: video.height,
  };
}

export async function canliKesitDosyaSil(uri: string | null | undefined): Promise<void> {
  if (!uri) return;
  if (uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(uri);
    } catch {
      /* */
    }
    return;
  }
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* */
  }
}
