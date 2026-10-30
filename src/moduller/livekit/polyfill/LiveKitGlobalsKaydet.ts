import { Platform } from 'react-native';
import { LiveKitNativeVarMi } from '../bilesenler/LiveKitVideoViewAl';

/**
 * Konuşmacı kayıt — VPIO / yankı iptali (kendi sesini duyma).
 * mixWithOthers: expo-audio SFX ile çakışmayı azaltır.
 * allowBluetooth: HFP (kendi AEC).
 */
/** Konuşmacı kayıt — VPIO / yankı iptali + Bluetooth HFP/A2DP */
const IOS_KAYIT_SECENEK = [
  'mixWithOthers',
  'allowBluetooth',
  'allowBluetoothA2DP',
  'defaultToSpeaker',
] as const;

const IOS_MEDYA_SECENEK = [
  'mixWithOthers',
  'allowBluetooth',
  'allowBluetoothA2DP',
  'allowAirPlay',
  'defaultToSpeaker',
] as const;

/**
 * Misafir playout — oda müziği (expo-audio) ile karışır.
 * duckOthers YOK: LiveKit uzak ses varken sistem oda müziğini boğuyordu (iPhone sessiz müzik).
 * Konuşurken kısma yazılımda (useOdaMuzikDucking).
 */
const IOS_MISAFIR_SECENEK = [
  'mixWithOthers',
  'allowBluetooth',
  'allowBluetoothA2DP',
  'defaultToSpeaker',
] as const;

/**
 * Konuşmacı / mic açık — playAndRecord + voiceChat (AEC / yankı iptali).
 * mixWithOthers: oda müziği karışır; voiceChat konuşmaların birbirine gitmesini sağlar.
 */
export const IOS_SES_ODA_AYAR = {
  audioCategory: 'playAndRecord' as const,
  audioCategoryOptions: [...IOS_KAYIT_SECENEK],
  audioMode: 'voiceChat' as const,
};

/**
 * Ses odası misafir — playAndRecord + voiceChat (uzak Opus stabil).
 * mixWithOthers: müzik; videoChat yerine voiceChat → konuşma kopması azalır.
 */
export const IOS_SES_ODA_MISAFIR = {
  audioCategory: 'playAndRecord' as const,
  audioCategoryOptions: [...IOS_MISAFIR_SECENEK],
  audioMode: 'voiceChat' as const,
};

const IOS_KAYIT_VPIO_KAPALI = {
  audioCategory: 'playAndRecord' as const,
  audioCategoryOptions: [...IOS_MEDYA_SECENEK],
  audioMode: 'default' as const,
};

/**
 * Canlı izleyici (RTMP/yayın) — ses odası DIŞI.
 * Ses odasında kullanılmaz (Android uzak sesi boğar).
 */
const IOS_YAYIN_DINLEME = {
  audioCategory: 'playback' as const,
  audioCategoryOptions: ['mixWithOthers', 'duckOthers'] as const,
  audioMode: 'spokenAudio' as const,
};

let hazir = false;

type LiveKitNativeMod = {
  registerGlobals: (opts?: { autoConfigureAudioSession?: boolean }) => void;
  setupIOSAudioManagement?: (
    preferSpeaker?: boolean,
    policy?: {
      recording?: typeof IOS_SES_ODA_AYAR;
      recordingWithoutVoiceProcessing?: typeof IOS_KAYIT_VPIO_KAPALI;
      playout?:
        | typeof IOS_SES_ODA_AYAR
        | typeof IOS_SES_ODA_MISAFIR
        | typeof IOS_YAYIN_DINLEME;
      deactivateOnStop?: boolean;
    },
  ) => () => void;
};

/**
 * WebRTC globals + iOS ses motoru — uygulama açılışında bir kez.
 *
 * ÖNEMLİ: autoConfigureAudioSession:false + setupIOSAudioManagement.
 * İkisini birden açmak (true + setup) AVAudioSession yarışı → Android→iOS sessizlik.
 * Bağlantı sırasında manuel setAppleAudioConfiguration ÇAĞIRMA.
 */
export function LiveKitGlobalsKaydet(): boolean {
  if (hazir) return true;
  if (!LiveKitNativeVarMi()) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require('@livekit/react-native') as LiveKitNativeMod;
    if (typeof native.registerGlobals !== 'function') return false;

    // Custom policy kullanıyorsak autoConfigure KAPALI olmalı (LiveKit docs)
    native.registerGlobals({ autoConfigureAudioSession: false });

    if (Platform.OS === 'ios' && typeof native.setupIOSAudioManagement === 'function') {
      try {
        // preferSpeaker=true → BT yokken hoparlör; BT varsa sistem rotası
        native.setupIOSAudioManagement(true, {
          // Mic açık (konuşmacı/yayıncı): AEC + Bluetooth HFP
          recording: IOS_SES_ODA_AYAR,
          recordingWithoutVoiceProcessing: IOS_KAYIT_VPIO_KAPALI,
          // Mic kapalı (misafir/izleyici): duck + A2DP kulaklık
          playout: IOS_SES_ODA_MISAFIR,
          deactivateOnStop: false,
        });
      } catch {
        try {
          native.setupIOSAudioManagement(true);
        } catch {
          /* eski native */
        }
      }
    }

    hazir = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Kesit kaydı: yankı iptalini kapat, oturumu video kaydına al.
 * voiceChat hoparlördeki müziği ve YouTube sesini mikrofondan siler.
 * Bırakınca yayın oturumu (voiceChat + yankı iptali) geri gelir.
 */
export async function IosKesitKayitSesi(kayit: boolean): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require('@livekit/react-native') as {
      AudioSession: {
        setAppleAudioConfiguration: (config: {
          audioCategory?: string;
          audioCategoryOptions?: string[];
          audioMode?: string;
        }) => Promise<void>;
      };
      AudioDeviceModule?: {
        setVoiceProcessingEnabled?: (enabled: boolean) => Promise<void>;
        setVoiceProcessingBypassed?: (bypassed: boolean) => void;
      };
    };
    if (kayit) {
      native.AudioDeviceModule?.setVoiceProcessingBypassed?.(true);
      await native.AudioDeviceModule?.setVoiceProcessingEnabled?.(false).catch(() => undefined);
      await native.AudioSession.setAppleAudioConfiguration({
        audioCategory: 'playAndRecord',
        audioCategoryOptions: [
          'mixWithOthers',
          'defaultToSpeaker',
          'allowBluetoothA2DP',
          'allowAirPlay',
        ],
        audioMode: 'videoRecording',
      });
      return;
    }
    await native.AudioSession.setAppleAudioConfiguration(IOS_SES_ODA_AYAR);
  } catch {
    /* eski native */
  }
  if (!kayit) IosYankIptaliAc();
}

/**
 * Canlı yayın iOS oturumu — bağlantı bittikten SONRA.
 * Yayıncı: videoChat. voiceChat + kamera mikrofonu susturur.
 * İzleyici: playAndRecord + hoparlör. playback sessiz anahtarda kesilir.
 */
export async function IosCanliYayinOturumu(yayinci: boolean): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require('@livekit/react-native') as {
      AudioSession: {
        startAudioSession: () => Promise<void>;
        getAudioOutputs?: () => Promise<string[]>;
        selectAudioOutput?: (output: string) => Promise<void>;
        setAppleAudioConfiguration: (config: {
          audioCategory?: string;
          audioCategoryOptions?: string[];
          audioMode?: string;
        }) => Promise<void>;
      };
    };
    await native.AudioSession.setAppleAudioConfiguration(
      yayinci
        ? {
            audioCategory: 'playAndRecord',
            audioCategoryOptions: [
              'mixWithOthers',
              'defaultToSpeaker',
              'allowBluetooth',
              'allowBluetoothA2DP',
            ],
            audioMode: 'videoChat',
          }
        : {
            audioCategory: 'playAndRecord',
            audioCategoryOptions: [
              'mixWithOthers',
              'defaultToSpeaker',
              'allowBluetooth',
              'allowBluetoothA2DP',
            ],
            audioMode: 'voiceChat',
          },
    );
    await native.AudioSession.startAudioSession();
    const outputs = await native.AudioSession.getAudioOutputs?.().catch(
      () => [] as string[],
    );
    const kulaklik = (outputs ?? []).some((o) =>
      /bluetooth|headset|airplay/i.test(String(o)),
    );
    await native.AudioSession.selectAudioOutput?.(
      kulaklik ? 'default' : 'force_speaker',
    ).catch(() => undefined);
  } catch {
    /* eski native */
  }
  if (yayinci) IosYankIptaliAc();
}

export function IosYankIptaliAc(): void {
  if (Platform.OS !== 'ios') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const native = require('@livekit/react-native') as {
      AudioDeviceModule?: {
        isVoiceProcessingEnabled?: () => boolean;
        setVoiceProcessingEnabled?: (enabled: boolean) => Promise<void>;
        setVoiceProcessingBypassed?: (bypassed: boolean) => void;
      };
    };
    const adm = native.AudioDeviceModule;
    if (!adm) return;
    adm.setVoiceProcessingBypassed?.(false);
    if (
      typeof adm.isVoiceProcessingEnabled === 'function' &&
      typeof adm.setVoiceProcessingEnabled === 'function' &&
      !adm.isVoiceProcessingEnabled()
    ) {
      void adm.setVoiceProcessingEnabled(true).catch(() => undefined);
    }
  } catch {
    /* native yok / eski SDK */
  }
}
