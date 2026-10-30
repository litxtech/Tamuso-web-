import { AppState, Platform } from 'react-native';
import {
  AudioPresets,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  createLocalAudioTrack,
  createLocalVideoTrack,
  type LocalVideoTrack,
  type Participant,
  type RemoteAudioTrack,
  type RemoteVideoTrack,
  type RoomOptions,
  type VideoTrack,
} from 'livekit-client';
import { KonusmaciSesSeviyesi } from '../ses/KonusmaciSesSeviyesi';
import { CanliOlcumIsaretle } from '../../canli-yayin/olcum/CanliIzlemeOlcum';
// Native kontrol — VideoViewAl ile aynı kaynak
import { LiveKitNativeVarMi } from '../bilesenler/LiveKitVideoViewAl';
import {
  IosCanliYayinOturumu,
  IosYankIptaliAc,
  LiveKitGlobalsKaydet,
} from '../polyfill/LiveKitGlobalsKaydet';
import i18n from '../../../i18n';
import {
  KameraOnizlemeSerbestBirak,
  KameraOnizlemeTutuluyorMu,
} from '../kamera/KameraOnizlemeKilidi';
import { SesHataMetni } from './SesHataMetni';

/** 1:1 görüşme — WhatsApp benzeri: düşük gecikme, az kasma */
const GORUSME_VIDEO = VideoPresets.h360;
const GORUSME_VIDEO_SIMULCAST = [VideoPresets.h180, VideoPresets.h360];

/**
 * Capture — sampleRate ZORLAMA (cihaz WebRTC'ye bırak).
 * Android'de sabit 48k bazı cihazlarda iOS'a sessiz / bozuk Opus üretir.
 * Mono + AEC zorunlu (stereo/yankı Android↔iOS kırar).
 */
const SES_ODA_CAPTURE = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
} as const;

/**
 * Konuşma preset — mono, çapraz platform.
 * dtx:false → Android→iOS'ta kesik/sessiz Opus riskini azaltır.
 * stopMicTrackOnMute:false → soft mute (Clubhouse/Bigo tarzı).
 * Track stop/start tıklama sesi yok; yayın yine mute ile kesilir.
 */
const SES_ODA_PUBLISH = {
  audioPreset: AudioPresets.speech,
  dtx: false,
  red: false,
  forceStereo: false,
  stopMicTrackOnMute: false,
} as const;

/**
 * Canlı yayın mikrofonu — AEC/NS kapalı.
 * Kamera + hoparlör açıkken donanım yankı iptali konuşmayı sıfırlar;
 * izleyici track görür ama ses gelmez. Solo yayında uzak mikrofon yok.
 */
const CANLI_YAYIN_CAPTURE = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
  channelCount: 1,
} as const;

const CANLI_YAYIN_PUBLISH = {
  audioPreset: AudioPresets.music,
  dtx: false,
  red: false,
  forceStereo: false,
  stopMicTrackOnMute: false,
} as const;

/**
 * Eski canlı izleyici profili. Canlıda kullanılmaz: media/duck uzak konuşmayı keser.
 * gainTransientMayDuck: Spotify/YouTube Music kesilmez, oda konuşması varken kısılır.
 * Exclusive `gain` + inCommunication müzik uygulamalarını durdurur.
 */
const ANDROID_SES_ODASI_MISAFIR = {
  manageAudioFocus: true,
  audioMode: 'normal' as const,
  audioFocusMode: 'gainTransientMayDuck' as const,
  audioStreamType: 'music' as const,
  audioAttributesUsageType: 'media' as const,
  audioAttributesContentType: 'speech' as const,
  forceHandleAudioRouting: true,
};

/**
 * Konuşmacı / host / 1:1 — voiceCommunication (Android→iOS şart).
 * Media tipi Android yayın → iPhone'da sık sessiz kalır.
 * Yalnız yayıncılarda; misafir ANDROID_SES_ODASI_MISAFIR kullanır.
 */
const ANDROID_ILETISIM_AUDIO = {
  manageAudioFocus: true,
  audioMode: 'inCommunication' as const,
  audioFocusMode: 'gain' as const,
  audioStreamType: 'voiceCall' as const,
  audioAttributesUsageType: 'voiceCommunication' as const,
  audioAttributesContentType: 'speech' as const,
  forceHandleAudioRouting: true,
};

/** Cihaz çıkış önceliği — LiveKit varsayılanı (BT kulaklık önce) */
const ANDROID_CIKIS_ONCELIK = [
  'bluetooth',
  'headset',
  'speaker',
  'earpiece',
] as const;

/**
 * Android dinleyici uzak track — WebRTC setVolume [0,10].
 * Yalnız mikrofonu kapalı dinlemede. Yayıncıda AEC bozulmasın diye yok.
 */
const ANDROID_UZAK_SES_MAX = 3.5;

/** İlk kare: receiver stats yoklama aralığı */
const ILK_KARE_ARALIK_MS = 100;
/** Stats hiç okunamazsa (eski native) video bu süre sonra görünür sayılır */
const ILK_KARE_STATSIZ_MS = 900;
/** Çözülen kare sayısı hiç artmazsa kapak en geç bu süre sonra kalkar */
const ILK_KARE_AZAMI_MS = 2_500;
/** prepareConnection ile ısıtılmış oda — bölge URL'si bu süre geçerli sayılır */
const HAZIR_ODA_OMRU_MS = 4 * 60_000;

type LiveKitNative = {
  AndroidAudioTypePresets: { communication: unknown; media: unknown };
  AudioSession: {
    configureAudio: (opts: unknown) => Promise<void>;
    startAudioSession: () => Promise<void>;
    stopAudioSession: () => Promise<void>;
    selectAudioOutput: (output: string) => Promise<void>;
    getAudioOutputs: () => Promise<string[]>;
    setDefaultRemoteAudioTrackVolume: (volume: number) => Promise<void>;
    setAppleAudioConfiguration?: (config: {
      audioCategory?: string;
      audioCategoryOptions?: string[];
      audioMode?: string;
    }) => Promise<void>;
  };
  registerGlobals: (opts?: { autoConfigureAudioSession?: boolean }) => void;
  setupIOSAudioManagement?: (preferSpeaker?: boolean) => () => void;
};

let livekitNative: LiveKitNative | null | undefined;

function livekitNativeAl(): LiveKitNative | null {
  if (livekitNative !== undefined) return livekitNative;
  if (!LiveKitNativeVarMi()) {
    livekitNative = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    livekitNative = require('@livekit/react-native') as LiveKitNative;
    if (!livekitNative?.AudioSession || !livekitNative?.registerGlobals) {
      livekitNative = null;
    }
  } catch {
    livekitNative = null;
  }
  return livekitNative;
}

type BaglantiDurumu = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
type Dinleyici = (durum: BaglantiDurumu, detay?: string) => void;
export type LiveKitVideoDurumu = {
  localVideo: LocalVideoTrack | null;
  remoteVideo: RemoteVideoTrack | null;
  remoteIds: string[];
  /** user = ön (ayna), environment = arka (düz) */
  kameraFacing: 'user' | 'environment';
  nesil: number;
  /** Uzak videoda en az bir kare çözüldü */
  uzakIlkKare: boolean;
  /** Uzak video yayını: yok / var ama kapalı (mute) / açık */
  uzakKamera: 'yok' | 'kapali' | 'var';
  uzakKatilimciVar: boolean;
  baglanti: BaglantiDurumu;
  /** Odaya bağlanılan an (ms) — "görüntü yok" kararı için bekleme payı */
  baglantiAni: number | null;
  yenidenBaglaniyor: boolean;
};
type VideoDinleyici = (state: LiveKitVideoDurumu) => void;

type MedyaBolumIstegi = { numAudios?: number; numVideos?: number };

type LiveKitMotor = {
  isClosed?: boolean;
  pcManager?: unknown;
  client?: {
    onMediaSectionsRequirement?: (requirement: MedyaBolumIstegi) => void;
    __tamusoPazarlik?: boolean;
  };
  addMediaSections?: (numAudios: number, numVideos: number) => void;
  negotiate?: () => Promise<void>;
};

type OdaMotoru = Room & {
  engine?: LiveKitMotor;
  maybeCreateEngine?: () => void;
  recreateEngine?: (sendLeave?: boolean) => void;
};

function pcYoneticiKapali(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  return /PC manager is closed|cannot negotiate on closed engine/i.test(msg);
}

/**
 * livekit-client `onMediaSectionsRequirement` → `negotiate()` sözünü yakalamaz.
 * Kopuş sırasında PC kapanınca bu, konsola uncaught NegotiationError basar.
 * Motor yeniden kurulunca (reconnect) aynı sarmalayıcıyı tekrar tak.
 */
function pazarlikReddiniYut(room: Room): void {
  const motor = (room as OdaMotoru).engine;
  const client = motor?.client;
  if (!motor || !client || client.__tamusoPazarlik) return;
  client.__tamusoPazarlik = true;
  client.onMediaSectionsRequirement = (requirement) => {
    if (motor.isClosed || !motor.pcManager) return;
    try {
      motor.addMediaSections?.(
        requirement?.numAudios ?? 0,
        requirement?.numVideos ?? 0,
      );
      void motor.negotiate?.().catch((e: unknown) => {
        if (pcYoneticiKapali(e) || motor.isClosed || !motor.pcManager) return;
        console.warn('[LiveKit] negotiate', e);
      });
    } catch (e) {
      if (pcYoneticiKapali(e)) return;
      console.warn('[LiveKit] media sections', e);
    }
  };
}

function motorYenilemesiniSar(room: Room): void {
  const hedef = room as OdaMotoru;
  const maybe = hedef.maybeCreateEngine;
  if (typeof maybe === 'function' && !(maybe as { __tamuso?: boolean }).__tamuso) {
    const orig = maybe.bind(hedef);
    const sarilmis = () => {
      orig();
      pazarlikReddiniYut(room);
    };
    (sarilmis as { __tamuso?: boolean }).__tamuso = true;
    hedef.maybeCreateEngine = sarilmis;
  }
  const recreate = hedef.recreateEngine;
  if (
    typeof recreate === 'function' &&
    !(recreate as { __tamuso?: boolean }).__tamuso
  ) {
    const orig = recreate.bind(hedef);
    const sarilmis = (sendLeave?: boolean) => {
      orig(sendLeave);
      pazarlikReddiniYut(room);
    };
    (sarilmis as { __tamuso?: boolean }).__tamuso = true;
    hedef.recreateEngine = sarilmis;
  }
  pazarlikReddiniYut(room);
}

function globalsKaydet() {
  try {
    if (!LiveKitGlobalsKaydet()) {
      console.warn('[LiveKit] registerGlobals: native yok');
    }
  } catch (e) {
    console.warn('[LiveKit] registerGlobals', e);
  }
}

/**
 * LiveKit baglanti izolasyonu — 1:1 gorusme, ses odasi, canli.
 * Gift / PK / chat buraya yazilmaz.
 */
class LiveKitBaglantiYoneticisiImpl {
  private durum: BaglantiDurumu = 'idle';
  private dinleyiciler = new Set<Dinleyici>();
  private videoDinleyiciler = new Set<VideoDinleyici>();
  private mock = false;
  private roomName: string | null = null;
  private room: Room | null = null;
  private audioSessionAcik = false;
  /** Son configure imzası — aynı profilde tekrar configure etme (Android↔iOS sessizlik) */
  private sonSesImza: string | null = null;
  /** Sıralı baglan/kes — paralel çift join (DUPLICATE_IDENTITY) engeli */
  private islemKuyrugu: Promise<unknown> = Promise.resolve();
  private baglantiNesil = 0;
  /** user = ön kamera, environment = arka */
  private kameraFacing: 'user' | 'environment' = 'user';
  private gorusmeModu = false;
  /** Ses odası (video yayını yok) — misafir duck, konuşmacı communication */
  private sesOdasiModu = false;
  /** Canlı yayın (video, 1:1 değil) — izleyici de communication duysun */
  private canliYayinModu = false;
  private speakerTimer: ReturnType<typeof setTimeout> | null = null;
  private speakerBekleyen: Participant[] | null = null;
  /** Uzak ses hacmi 0..1 (kullanıcı tercihi) — reconnect ezmez */
  private uzakSesHacmi = 1;
  /** Bu oturumda yayın hakkı var mı (host/speaker). Dinleyici false. */
  private asPublisher = false;
  /** Yayıncı kamerayı açık istiyor — arka plandan dönüşte yeniden açılır. */
  private kameraIstenenAcik = false;
  /** VideoView yeniden bağlansın diye artar. */
  private onizlemeNesil = 0;
  private oneGetirme: Promise<void> | null = null;
  /** Uygulama mikrofonu açık istiyor mu — reconnect setTimeout mute'u ezmesin */
  private micIstenenAcik = false;
  /** bilerek kes / rol upgrade — UI "Bağlantı koptu" göstermesin */
  private kasitliKes = false;
  /** Yayın odası bağlanmadan açılan yerel kamera — ilk kare gecikmesin */
  private onKamera: LocalVideoTrack | null = null;
  private kameraAcma: Promise<LocalVideoTrack | null> | null = null;
  private kameraNesil = 0;
  /** İlk karesi çözülmüş uzak video track sid'leri (konuk / PK'da birden çok video) */
  private ilkKareSidler = new Set<string>();
  private yenidenBaglaniyor = false;
  private baglantiAni: number | null = null;
  /** Aktif oda canlı yayın izleyici bağlantısı mı (yayın hakkı yok) */
  private canliIzleyiciOdasi = false;
  /** Arka planda kapanan odalar — aynı odaya yeniden girişte beklenir */
  private kapananOdalar = new Map<string, Promise<void>>();
  /** prepareConnection yapılmış, henüz katılınmamış izleyici odası */
  private hazirOda: { room: Room; url: string; zaman: number } | null = null;
  private sesHazirlikIs: { imza: string; is: Promise<void> } | null = null;

  /** Track'e yazılacak seviye (Android dinleyicide boost; yayıncıda AEC için 1×) */
  private uzakSesUygulanacak(): number {
    if (this.uzakSesHacmi <= 0) return 0;
    const tercih = Math.min(1, this.uzakSesHacmi);
    if (
      Platform.OS === 'android' &&
      !this.gorusmeModu &&
      !this.asPublisher
    ) {
      return tercih * ANDROID_UZAK_SES_MAX;
    }
    return tercih;
  }

  private sirayaAl<T>(islem: () => Promise<T>): Promise<T> {
    const sonraki = this.islemKuyrugu.then(islem, islem);
    this.islemKuyrugu = sonraki.then(
      () => undefined,
      () => undefined,
    );
    return sonraki;
  }

  /** Aynı oda bağlı, bağlanıyor veya LiveKit yeniden bağlanıyor — hard disconnect yasak */
  private odaAyniVeCanliMi(roomName: string): boolean {
    if (this.roomName !== roomName || !this.room) return false;
    const s = this.room.state;
    return (
      s === ConnectionState.Connected ||
      s === ConnectionState.Connecting ||
      s === ConnectionState.Reconnecting ||
      s === ConnectionState.SignalReconnecting
    );
  }

  private async bagliOlanaKadarBekle(
    timeoutMs = 12_000,
    room: Room | null = this.room,
  ): Promise<boolean> {
    if (!room) return false;
    if (room.state === ConnectionState.Connected) return true;

    return new Promise((resolve) => {
      let bitti = false;
      const bitir = (ok: boolean) => {
        if (bitti) return;
        bitti = true;
        clearTimeout(timer);
        room.off(RoomEvent.ConnectionStateChanged, onChange);
        resolve(ok);
      };
      const onChange = (state: ConnectionState) => {
        if (state === ConnectionState.Connected) bitir(true);
        else if (state === ConnectionState.Disconnected) bitir(false);
      };
      const timer = setTimeout(
        () => bitir(room.state === ConnectionState.Connected),
        timeoutMs,
      );
      room.on(RoomEvent.ConnectionStateChanged, onChange);
    });
  }

  /** disconnect sonrası server oturumu düşsün — hemen join STATE_MISMATCH üretir */
  private async odaDuseneKadarBekle(
    room: Room,
    timeoutMs = 3_000,
  ): Promise<void> {
    if (room.state === ConnectionState.Disconnected) return;
    await new Promise<void>((resolve) => {
      let bitti = false;
      const bitir = () => {
        if (bitti) return;
        bitti = true;
        clearTimeout(timer);
        room.off(RoomEvent.Disconnected, onDisc);
        room.off(RoomEvent.ConnectionStateChanged, onChange);
        resolve();
      };
      const onDisc = () => bitir();
      const onChange = (state: ConnectionState) => {
        if (state === ConnectionState.Disconnected) bitir();
      };
      const timer = setTimeout(bitir, timeoutMs);
      room.on(RoomEvent.Disconnected, onDisc);
      room.on(RoomEvent.ConnectionStateChanged, onChange);
    });
  }

  private leaveRequestMi(e: unknown): boolean {
    const metin =
      !e || typeof e !== 'object'
        ? String(e)
        : `${(e as { reasonName?: string }).reasonName ?? ''} ${(e as { message?: string }).message ?? ''} ${(e as { name?: string }).name ?? ''}`;
    // Kasıtlı kes / çift join yarışı — kullanıcıya "ses bağlanamadı" gösterme
    if (
      /leave request|client initiated|connection closed|websocket.*(close|abort)|negotiat|cancelled|canceled|aborted|state_mismatch|duplicate identity/i.test(
        metin,
      )
    ) {
      return true;
    }
    if (!e || typeof e !== 'object') return false;
    const err = e as { reasonName?: string; name?: string };
    return err.reasonName === 'LeaveRequest';
  }

  durumGetir() {
    return this.durum;
  }

  mockMu() {
    return this.mock;
  }

  odaAdi() {
    return this.roomName;
  }

  oda(): Room | null {
    return this.room;
  }

  yayinciMi() {
    return this.asPublisher && this.durum === 'connected';
  }

  dinle(fn: Dinleyici) {
    this.dinleyiciler.add(fn);
    return () => {
      this.dinleyiciler.delete(fn);
    };
  }

  videoDinle(fn: VideoDinleyici) {
    this.videoDinleyiciler.add(fn);
    fn(this.videoDurumu());
    return () => {
      this.videoDinleyiciler.delete(fn);
    };
  }

  private yayinla(detay?: string) {
    this.dinleyiciler.forEach((fn) => fn(this.durum, detay));
    // Video sahnesi bağlantı aşamasını da izler (bağlanıyor / koptu / yeniden)
    this.yayinlaVideo();
  }

  private videoDurumu(): LiveKitVideoDurumu {
    const remoteVideo = this.remoteVideoTrack();
    return {
      localVideo: this.localVideoTrack() ?? this.onKameraCanli(),
      remoteVideo,
      remoteIds: this.remoteParticipantIds(),
      kameraFacing: this.kameraFacing,
      nesil: this.onizlemeNesil,
      uzakIlkKare:
        !!remoteVideo?.sid && this.ilkKareSidler.has(remoteVideo.sid),
      uzakKamera: this.uzakKameraDurumu(),
      uzakKatilimciVar: (this.room?.remoteParticipants.size ?? 0) > 0,
      baglanti: this.durum,
      baglantiAni: this.baglantiAni,
      yenidenBaglaniyor: this.yenidenBaglaniyor,
    };
  }

  private uzakKameraDurumu(): 'yok' | 'kapali' | 'var' {
    if (!this.room) return 'yok';
    let sonuc: 'yok' | 'kapali' = 'yok';
    for (const p of this.room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.kind !== Track.Kind.Video) continue;
        if (!pub.isMuted) return 'var';
        sonuc = 'kapali';
      }
    }
    return sonuc;
  }

  /**
   * Uzak videoda çözülen ilk kareyi bekler (receiver stats `framesDecoded`).
   * VideoView boş/siyah karede açılmasın; kapak ilk kare gelince kalkar.
   */
  private ilkKareIzle(room: Room, track: RemoteVideoTrack, roomName: string): void {
    const sid = track.sid;
    if (!sid || this.ilkKareSidler.has(sid)) return;
    const basla = Date.now();
    let statsVar = false;
    const hazir = () => {
      if (this.room !== room || this.ilkKareSidler.has(sid)) return;
      this.ilkKareSidler.add(sid);
      CanliOlcumIsaretle('ilkKare', roomName);
      this.yayinlaVideo();
    };
    type StatsRapor = { forEach: (cb: (s: Record<string, unknown>) => void) => void };
    const bak = async () => {
      if (this.room !== room || room.state === ConnectionState.Disconnected) return;
      if (this.ilkKareSidler.has(sid)) return;
      try {
        const receiver = (
          track as unknown as { receiver?: { getStats?: () => Promise<StatsRapor> } }
        ).receiver;
        const rapor = await receiver?.getStats?.();
        let kare = 0;
        rapor?.forEach((s) => {
          if (s.type !== 'inbound-rtp') return;
          if ((s.kind ?? s.mediaType) !== 'video') return;
          statsVar = true;
          kare = Math.max(kare, Number(s.framesDecoded ?? 0));
        });
        if (kare > 0) {
          hazir();
          return;
        }
      } catch {
        /* stats okunamadı — süre yedeği */
      }
      const gecen = Date.now() - basla;
      if ((!statsVar && gecen >= ILK_KARE_STATSIZ_MS) || gecen >= ILK_KARE_AZAMI_MS) {
        hazir();
        return;
      }
      setTimeout(() => void bak(), ILK_KARE_ARALIK_MS);
    };
    void bak();
  }

  /** Oda ayarları — hazır (prepareConnection) oda ile bağlanılan oda aynı olmalı */
  private odaSecenekleri(tur: {
    gorusme: boolean;
    sesOdasi: boolean;
    videoYayin: boolean;
  }): RoomOptions {
    const { gorusme, sesOdasi, videoYayin } = tur;
    // Canlı (yayıncı veya izleyici): RN VideoView boyutu geç gelir.
    // adaptiveStream / dynacast ilk kareyi saniyelerce tutar.
    const canliVideo = !sesOdasi && !gorusme;
    return {
      // livekit-client ≥2.19.2 tek PeerConnection yolu RN'de (özellikle iOS) uzak
      // videoyu siyah bırakıyor; ses ve kare çözümü sürüyor (client-sdk-js#1977).
      ...(canliVideo && Platform.OS !== 'web' ? { singlePeerConnection: false } : null),
      adaptiveStream:
        canliVideo || sesOdasi ? false : { pixelDensity: 'screen' },
      dynacast: !canliVideo && !sesOdasi,
      stopLocalTrackOnUnpublish: true,
      audioCaptureDefaults: {
        ...SES_ODA_CAPTURE,
      },
      videoCaptureDefaults: gorusme
        ? {
            facingMode: 'user',
            resolution: GORUSME_VIDEO.resolution,
          }
        : {
            facingMode: 'user',
            resolution: VideoPresets.h720.resolution,
          },
      publishDefaults: gorusme
        ? {
            ...SES_ODA_PUBLISH,
            simulcast: true,
            videoSimulcastLayers: GORUSME_VIDEO_SIMULCAST,
            videoEncoding: GORUSME_VIDEO.encoding,
            degradationPreference: 'maintain-framerate',
          }
        : videoYayin
          ? {
              ...CANLI_YAYIN_PUBLISH,
              simulcast: false,
              videoEncoding: VideoPresets.h720.encoding,
              degradationPreference: 'maintain-framerate',
            }
          : SES_ODA_PUBLISH,
    };
  }

  /**
   * Canlı liste görünürken: LiveKit Cloud bölge seçimi + DNS/TLS ısıtması.
   * Odaya katılmaz, medya açmaz; tek hazır oda tutulur. İlk izleyici bağlantısı onu kullanır.
   */
  izleyiciBaglantisiniHazirla(url: string, token: string): void {
    if (Platform.OS === 'web' || !url || !token) return;
    const mevcut = this.hazirOda;
    if (
      mevcut &&
      mevcut.url === url &&
      Date.now() - mevcut.zaman < HAZIR_ODA_OMRU_MS
    ) {
      return;
    }
    globalsKaydet();
    if (!livekitNativeAl()) return;
    let room: Room;
    try {
      room = new Room(
        this.odaSecenekleri({ gorusme: false, sesOdasi: false, videoYayin: false }),
      );
    } catch {
      return;
    }
    this.hazirOda = { room, url, zaman: Date.now() };
    void room.prepareConnection(url, token).catch(() => undefined);
  }

  private hazirOdaAl(url: string): Room | null {
    const hazir = this.hazirOda;
    this.hazirOda = null;
    if (!hazir || hazir.url !== url) return null;
    if (Date.now() - hazir.zaman >= HAZIR_ODA_OMRU_MS) return null;
    if (hazir.room.state !== ConnectionState.Disconnected) return null;
    return hazir.room;
  }

  private onKameraCanli(): LocalVideoTrack | null {
    const t = this.onKamera;
    if (!t) return null;
    try {
      if (t.mediaStreamTrack?.readyState === 'ended') return null;
    } catch {
      return null;
    }
    return t;
  }

  private yayinlaVideo() {
    const state = this.videoDurumu();
    this.videoDinleyiciler.forEach((fn) => fn(state));
  }

  localVideoTrack(): LocalVideoTrack | null {
    const lp = this.room?.localParticipant;
    if (!lp) return null;
    const pub = lp.getTrackPublication(Track.Source.Camera);
    const t = pub?.track;
    if (t && (t.kind === Track.Kind.Video || t.kind === 'video')) {
      return t as LocalVideoTrack;
    }
    // Kaynak etiketi gecikebilir — herhangi bir yerel video
    for (const p of lp.trackPublications.values()) {
      if (
        (p.kind === Track.Kind.Video || p.kind === 'video') &&
        p.track
      ) {
        return p.track as LocalVideoTrack;
      }
    }
    return null;
  }

  /** Kamera yayını var mı (track henüz attach olmasa da publication sayılır). */
  localVideoYayindaMi(): boolean {
    if (this.localVideoTrack()) return true;
    const lp = this.room?.localParticipant;
    if (!lp) return false;
    const pub = lp.getTrackPublication(Track.Source.Camera);
    if (pub && !pub.isMuted) return true;
    for (const p of lp.trackPublications.values()) {
      if (p.kind === Track.Kind.Video || p.kind === 'video') return true;
    }
    return false;
  }

  /**
   * Kamera aç + track gelene kadar bekle.
   * Stüdyo CameraView bırakma / RN WebRTC SDP gecikmesine dayanıklı.
   */
  async kameraAcVeBekle(timeoutMs = 5_000): Promise<boolean> {
    const basla = Date.now();
    const mevcut = this.localVideoTrack();
    const mevcutCanli =
      !!mevcut && mevcut.mediaStreamTrack?.readyState !== 'ended';
    if (mevcutCanli) {
      this.yayinlaVideo();
      await this.canliKameraSonrasiSes();
      return true;
    }

    while (Date.now() - basla < timeoutMs) {
      if (this.room?.state !== ConnectionState.Connected) return false;
      const ok = await this.kameraGucluAc();
      if (ok && this.localVideoTrack()) {
        this.yayinlaVideo();
        await this.canliKameraSonrasiSes();
        return true;
      }
      if (this.localVideoTrack()) {
        this.yayinlaVideo();
        await this.canliKameraSonrasiSes();
        return true;
      }
      await new Promise((r) => setTimeout(r, 160));
    }
    if (this.localVideoTrack()) {
      this.yayinlaVideo();
      await this.canliKameraSonrasiSes();
      return true;
    }
    return false;
  }

  /** Geri sayımda stüdyo kamerası kapanır kapanmaz yakalamayı başlat. */
  kameraOncedenAc(): void {
    if (Platform.OS === 'web') return;
    void (async () => {
      if (Platform.OS === 'ios') {
        await IosCanliYayinOturumu(true);
      } else {
        const native = livekitNativeAl();
        if (native) await this.sesOturumuHazirla(native).catch(() => undefined);
      }
      const track = await this.yerelKameraHazirla();
      if (track) this.yayinlaVideo();
    })();
  }

  private async yerelKameraHazirla(): Promise<LocalVideoTrack | null> {
    const yayinda = this.localVideoTrack();
    if (yayinda) {
      try {
        if (yayinda.mediaStreamTrack?.readyState !== 'ended') return yayinda;
      } catch {
        /* yeniden aç */
      }
    }
    const hazir = this.onKameraCanli();
    if (hazir) return hazir;
    if (this.kameraAcma) return this.kameraAcma;
    const nesil = this.kameraNesil;
    let is: Promise<LocalVideoTrack | null>;
    is = (async () => {
      await KameraOnizlemeSerbestBirak(700).catch(() => undefined);
      if (nesil !== this.kameraNesil) return null;
      const tekrar = this.onKameraCanli();
      if (tekrar) return tekrar;
      try {
        const track = await createLocalVideoTrack(this.videoCaptureOpts());
        if (nesil !== this.kameraNesil) {
          try {
            track.stop();
          } catch {
            /* iptal */
          }
          return null;
        }
        this.onKamera = track;
        this.yayinlaVideo();
        return track;
      } catch (e) {
        console.warn('[LiveKit] kamera ön açma', e);
        return null;
      } finally {
        if (this.kameraAcma === is) this.kameraAcma = null;
      }
    })();
    this.kameraAcma = is;
    return is;
  }

  private onKamerayiDurdur() {
    this.kameraNesil += 1;
    this.kameraAcma = null;
    const t = this.onKamera;
    this.onKamera = null;
    if (!t) return;
    try {
      t.stop();
    } catch {
      /* zaten kapalı */
    }
  }

  /**
   * Connect sonrası kamera hâlâ yoksa arka planda birkaç kez dene.
   * Odayı düşürmez — yayın sesle devam eder, görüntü gelince UI bağlanır.
   */
  kameraArkaPlandaDene(deneme = 6): void {
    const nesil = this.baglantiNesil;
    void (async () => {
      for (let i = 0; i < deneme; i++) {
        if (nesil !== this.baglantiNesil) return;
        if (this.room?.state !== ConnectionState.Connected) return;
        if (this.localVideoTrack()) {
          this.yayinlaVideo();
          return;
        }
        await KameraOnizlemeSerbestBirak(1_200).catch(() => undefined);
        if (nesil !== this.baglantiNesil) return;
        const ok = await this.kameraGucluAc().catch(() => false);
        if (ok || this.localVideoYayindaMi()) {
          this.yayinlaVideo();
          await this.canliKameraSonrasiSes();
          return;
        }
        await new Promise((r) => setTimeout(r, 700 + i * 350));
      }
      console.warn('[LiveKit] kamera arka plan denemeleri bitti');
      this.yayinlaVideo();
    })();
  }

  /**
   * Ses odası: mic publish gecikirse odayı düşürme — arka planda birkaç kez dene.
   * Kullanıcı başkalarını duymaya devam eder; mic gelince yayınlanır.
   */
  mikrofonArkaPlandaDene(deneme = 6): void {
    if (!this.micIstenenAcik || !this.asPublisher) return;
    const nesil = this.baglantiNesil;
    void (async () => {
      for (let i = 0; i < deneme; i++) {
        if (nesil !== this.baglantiNesil) return;
        if (!this.micIstenenAcik || !this.asPublisher) return;
        if (this.room?.state !== ConnectionState.Connected) return;
        const pub = this.room?.localParticipant?.getTrackPublication(
          Track.Source.Microphone,
        );
        if (pub?.track && !pub.isMuted) return;
        await new Promise((r) => setTimeout(r, 600 + i * 400));
        if (nesil !== this.baglantiNesil) return;
        const ok = await this.mikrofonGucluAc().catch(() => false);
        if (ok) {
          this.yayinla('mic-recovered');
          return;
        }
      }
      console.warn('[LiveKit] mikrofon arka plan denemeleri bitti');
      this.yayinla('mic-failed-soft');
    })();
  }

  remoteVideoTrack(): RemoteVideoTrack | null {
    if (!this.room) return null;
    for (const p of this.room.remoteParticipants.values()) {
      const cam = p.getTrackPublication(Track.Source.Camera);
      if (cam?.track && cam.track.kind === 'video') {
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

  remoteParticipantIds(): string[] {
    if (!this.room) return [];
    return [...this.room.remoteParticipants.keys()];
  }

  ilkRemoteId(): string | null {
    return this.remoteParticipantIds()[0] ?? null;
  }

  /**
   * Connect öncesi AudioSession ısıt — odaya girişte ilk saniye sessizlik olmasın.
   * Bağlantı açmaz; yalnızca native oturumu hazırlar.
   */
  async sesOturumuIsit(opts?: {
    sesOdasi?: boolean;
    asPublisher?: boolean;
    gorusmeModu?: boolean;
  }): Promise<void> {
    if (Platform.OS === 'web') return;
    if (typeof opts?.sesOdasi === 'boolean') this.sesOdasiModu = opts.sesOdasi;
    if (typeof opts?.asPublisher === 'boolean') this.asPublisher = opts.asPublisher;
    if (typeof opts?.gorusmeModu === 'boolean') this.gorusmeModu = opts.gorusmeModu;
    this.canliYayinModu = !this.gorusmeModu && !this.sesOdasiModu;
    globalsKaydet();
    const native = livekitNativeAl();
    if (!native) return;
    await this.sesOturumuHazirla(native).catch(() => undefined);
  }

  async baglan(input: {
    url: string;
    token: string;
    roomName: string;
    mock?: boolean;
    asPublisher?: boolean;
    publishVideo?: boolean;
    /** 1:1 görüşme — düşük çözünürlük / speech audio (donma yok) */
    gorusmeModu?: boolean;
    /** Ses odası (video yok) — herkes communication (dinleyici de duysun) */
    sesOdasi?: boolean;
    /** true: aynı odaya yeniden bağlan (token/rol yükseltme) */
    zorla?: boolean;
    /** Yayıncı mikrofon başlangıç — ses odası koltuk izni true */
    micAcik?: boolean;
  }): Promise<{ ok: boolean; hata?: string }> {
    return this.sirayaAl(() => this.baglanIc(input));
  }

  private async baglanIc(input: {
    url: string;
    token: string;
    roomName: string;
    mock?: boolean;
    asPublisher?: boolean;
    publishVideo?: boolean;
    gorusmeModu?: boolean;
    sesOdasi?: boolean;
    zorla?: boolean;
    micAcik?: boolean;
  }): Promise<{ ok: boolean; hata?: string }> {
    const nesil = ++this.baglantiNesil;
    this.gorusmeModu = !!input.gorusmeModu;
    this.sesOdasiModu = !!input.sesOdasi;
    this.canliYayinModu = !this.gorusmeModu && !this.sesOdasiModu;
    if (input.publishVideo) this.kameraFacing = 'user';
    // undefined → false (dinleyici güvenli); sadece açık true yayıncı
    this.asPublisher = !!input.asPublisher;
    if (this.asPublisher && input.publishVideo) this.kameraIstenenAcik = true;
    else if (!this.asPublisher) this.kameraIstenenAcik = false;
    const ayniOdaCanli =
      !input.mock &&
      !input.token.startsWith('mock.') &&
      this.odaAyniVeCanliMi(input.roomName);

    // Mikrofon hedefi
    if (!this.asPublisher) {
      this.micIstenenAcik = false;
    } else if (typeof input.micAcik === 'boolean') {
      this.micIstenenAcik = input.micAcik;
    } else if (input.sesOdasi) {
      // Eski davranış yedek: ses odasında belirsizse kapalı (UI açar)
      if (!ayniOdaCanli || input.zorla) {
        this.micIstenenAcik = false;
      }
    } else if (!ayniOdaCanli || input.zorla) {
      this.micIstenenAcik = true;
    }
    // Profil imzası aynıysa ısıtılmış oturumu koru (navigasyon warmup)
    {
      const iletisim =
        this.gorusmeModu ||
        this.asPublisher ||
        this.sesOdasiModu ||
        this.canliYayinModu;
      const imza = `${Platform.OS}:${iletisim ? 'com' : 'duck'}:${this.asPublisher ? 1 : 0}`;
      if (this.sonSesImza !== imza) this.sonSesImza = null;
    }

    // Aynı oda bağlı / bağlanıyor / reconnecting iken disconnect etme —
    // "leave while reconnect" ve ICE/WS race üretir. Rol yükseltmede (zorla)
    // önce terminal state (Connected|Disconnected) beklenir.
    if (ayniOdaCanli) {
      if (input.zorla) {
        const hazir = await this.bagliOlanaKadarBekle();
        if (nesil !== this.baglantiNesil) {
          return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
        }
        if (!hazir) {
          // Hâlâ mid-flight ise bir kez daha terminal bekle, sonra temiz kes
          await this.bagliOlanaKadarBekle(5_000);
          if (nesil !== this.baglantiNesil) {
            return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
          }
        }
        // Bağlı veya düşmüş — aşağıda token/rol için yeniden join
      } else {
        if (this.room?.state !== ConnectionState.Connected) {
          const hazir = await this.bagliOlanaKadarBekle();
          if (!hazir) {
            // Düşmüş — aşağıda yeniden bağlan
          } else if (nesil !== this.baglantiNesil) {
            return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
          } else {
            try {
              await this.mikrofonDurumunuDogrula();
              if (this.asPublisher && input.publishVideo) {
                const camOk = await this.kameraAcVeBekle(4_000);
                if (!camOk) {
                  return {
                    ok: false,
                    hata:
                      'Kamera yayınlanamadı. İzinleri kontrol et ve tekrar dene.',
                  };
                }
              }
              await this.hoparlorGucluAc();
              this.uzakSesleriGucluAc();
            } catch (e) {
              console.warn('[LiveKit] yeniden yayın', e);
              return {
                ok: false,
                hata:
                  e instanceof Error
                    ? e.message
                    : 'Mikrofon/kamera yeniden açılamadı',
              };
            }
            this.durum = 'connected';
            this.yayinlaVideo();
            return { ok: true };
          }
        } else {
          try {
            await this.mikrofonDurumunuDogrula();
            if (this.asPublisher && input.publishVideo) {
              const camOk = await this.kameraAcVeBekle(4_000);
              if (!camOk) {
                return {
                  ok: false,
                  hata:
                    'Kamera yayınlanamadı. İzinleri kontrol et ve tekrar dene.',
                };
              }
            }
            await this.hoparlorGucluAc();
            this.uzakSesleriGucluAc();
          } catch (e) {
            console.warn('[LiveKit] yeniden yayın', e);
            return {
              ok: false,
              hata:
                e instanceof Error
                  ? e.message
                  : 'Mikrofon/kamera yeniden açılamadı',
            };
          }
          this.durum = 'connected';
          this.yayinlaVideo();
          return { ok: true };
        }
      }
    }

    const gorusme = !!input.gorusmeModu;
    // Canlı izleyici video:true → sesOdasi=false (MedyaBaglantisi).
    // Eski: !publishVideo ile izleyiciyi ses odası sanıyordu.
    const sesOdasi =
      typeof input.sesOdasi === 'boolean'
        ? input.sesOdasi
        : !gorusme && !input.publishVideo;
    const videoYayin = !!input.publishVideo && !gorusme;
    const canliIzleyici = !sesOdasi && !gorusme && !videoYayin && !input.asPublisher;

    // Farklı odaya geçiş: eski odanın sunucuda düşmesini bekleme (STATE_MISMATCH
    // yalnız aynı odaya yeniden join'de oluşur) — yayından yayına geçiş saniyeler sürmesin.
    // Eski oda canlı izleyiciyse kapanışı tamamen arka plana alınır (uzak ses hemen susar).
    const farkliOda = !!this.roomName && this.roomName !== input.roomName;
    const eskiCanliIzleyici = this.canliIzleyiciOdasi;
    await this.baglantiyiKesIc({
      rolSifirla: false,
      kameraKoru: !!input.publishVideo,
      hizli: farkliOda,
      arkaPlanda: farkliOda && eskiCanliIzleyici,
      sesKoru: farkliOda && eskiCanliIzleyici && canliIzleyici,
    });
    if (nesil !== this.baglantiNesil) {
      return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
    }
    // Aynı odadan az önce çıkıldıysa sunucudaki eski katılım düşsün (DUPLICATE_IDENTITY)
    const kapanan = this.kapananOdalar.get(input.roomName);
    if (kapanan) {
      await Promise.race([kapanan, new Promise((r) => setTimeout(r, 3_500))]);
      if (nesil !== this.baglantiNesil) {
        return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
      }
    }

    // baglantiyiKesIc odayı keser; rol bayrakları bu join için yeniden yazılır
    this.gorusmeModu = !!input.gorusmeModu;
    this.sesOdasiModu = !!input.sesOdasi;
    this.canliYayinModu = !this.gorusmeModu && !this.sesOdasiModu;
    this.asPublisher = !!input.asPublisher;
    if (!this.asPublisher) {
      this.micIstenenAcik = false;
    } else if (typeof input.micAcik === 'boolean') {
      this.micIstenenAcik = input.micAcik;
    } else {
      // Görüşme/video: açık. Ses odası belirsiz: kapalı (UI açar).
      this.micIstenenAcik = !this.sesOdasiModu;
    }

    this.durum = 'connecting';
    this.roomName = input.roomName;
    this.mock = !!input.mock;
    this.yayinla('connecting');

    if (input.mock || input.token.startsWith('mock.')) {
      // Sessiz mock = "bağlı" ama ses/görüntü yok — görüşmede kabul etme
      this.durum = 'error';
      this.mock = true;
      this.yayinla('mock-rejected');
      return { ok: false, hata: SesHataMetni() };
    }

    try {
      // Web: tarayıcı WebRTC (livekit-client). Native AudioSession yalnız iOS/Android.
      // Canlı izleyici: ses oturumu bağlantıyla paralel hazırlanır — video sesi beklemez.
      let sesHazirlik: Promise<void> | null = null;
      if (Platform.OS !== 'web') {
        globalsKaydet();
        const native = livekitNativeAl();
        if (!native) {
          this.durum = 'error';
          this.mock = false;
          this.yayinla('native-missing');
          return { ok: false, hata: SesHataMetni() };
        }
        if (canliIzleyici) {
          sesHazirlik = this.sesOturumuHazirla(native).catch(() => undefined);
        } else {
          await this.sesOturumuHazirla(native);
        }
      }

      if (nesil !== this.baglantiNesil) {
        await this.baglantiyiKesIc();
        return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
      }

      const room =
        (canliIzleyici ? this.hazirOdaAl(input.url) : null) ??
        new Room(this.odaSecenekleri({ gorusme, sesOdasi, videoYayin }));
      motorYenilemesiniSar(room);
      this.room = room;
      this.canliIzleyiciOdasi = canliIzleyici;
      this.ilkKareSidler.clear();
      this.baglantiAni = null;
      this.yenidenBaglaniyor = false;

      const yenile = () => this.yayinlaVideo();

      room.on(RoomEvent.SignalConnected, () => {
        CanliOlcumIsaretle('sinyal', input.roomName);
      });
      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
        // Arka planda kapanan eski oda: geç gelen track çalınmaz (çift ses)
        if (this.room !== room) {
          try {
            track.mediaStreamTrack.enabled = false;
          } catch {
            /* ignore */
          }
          return;
        }
        if (
          track.kind === Track.Kind.Video &&
          participant?.identity !== room.localParticipant.identity
        ) {
          CanliOlcumIsaretle('videoAbone', input.roomName);
          this.ilkKareIzle(room, track as RemoteVideoTrack, input.roomName);
        }
        if (track.kind === Track.Kind.Audio) {
          const kendi =
            !!participant?.identity &&
            participant.identity === room.localParticipant.identity;
          try {
            // Kendi track asla çalınmaz; uzaklar tercih hacminde
            (track as RemoteAudioTrack).setVolume(
              kendi ? 0 : this.uzakSesUygulanacak(),
            );
          } catch {
            /* ignore */
          }
          if (!kendi && Platform.OS === 'web') {
            this.webUzakSesiBagla(track as RemoteAudioTrack);
          }
          if (!kendi) {
            try {
              track.mediaStreamTrack.enabled = true;
            } catch {
              /* ignore */
            }
            try {
              const baslat = track as RemoteAudioTrack & {
                start?: () => Promise<void> | void;
              };
              void Promise.resolve(baslat.start?.()).catch(() => undefined);
            } catch {
              /* native çalma devam eder */
            }
            // Dinleyici join: track gelince çıkış + hacim — sessiz kalmasın
            void this.hoparlorGucluAc().catch(() => undefined);
            this.uzakSesleriGucluAc();
            if (Platform.OS === 'ios' && this.canliYayinModu && !this.asPublisher) {
              void IosCanliYayinOturumu(false);
            } else if (Platform.OS === 'ios' && !this.canliYayinModu) {
              IosYankIptaliAc();
            }
          }
        }
        yenile();
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (Platform.OS === 'web' && track.kind === Track.Kind.Audio) {
          this.webUzakSesiKopar(track as RemoteAudioTrack);
        }
        if (track.sid) this.ilkKareSidler.delete(track.sid);
        yenile();
      });
      room.on(RoomEvent.TrackPublished, (pub, participant) => {
        if (
          pub.kind === Track.Kind.Audio &&
          participant.identity !== room.localParticipant.identity
        ) {
          try {
            pub.setSubscribed(true);
          } catch {
            /* autoSubscribe yedek */
          }
        }
        yenile();
      });
      room.on(RoomEvent.TrackMuted, (pub, participant) => {
        if (pub.kind === Track.Kind.Audio && participant?.identity) {
          try {
            KonusmaciSesSeviyesi.seviyeYaz(participant.identity, 0);
          } catch {
            /* ignore */
          }
        }
        yenile();
      });
      room.on(RoomEvent.TrackUnmuted, yenile);
      room.on(RoomEvent.LocalTrackPublished, yenile);
      room.on(RoomEvent.LocalTrackUnpublished, yenile);
      room.on(RoomEvent.ParticipantConnected, (p) => {
        if (this.room !== room) return;
        try {
          const kendi = p.identity === room.localParticipant.identity;
          p.setVolume(kendi ? 0 : Math.min(1, this.uzakSesUygulanacak()));
        } catch {
          /* ignore */
        }
        this.yayinla('remote-joined');
        yenile();
      });
      room.on(RoomEvent.ParticipantDisconnected, () => {
        this.yayinla('remote-left');
        yenile();
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        this.konusmacilariKuyrugaAl(speakers);
      });
      room.on(RoomEvent.Disconnected, () => {
        if (this.room === room) {
          this.durum = 'disconnected';
          this.yenidenBaglaniyor = false;
          this.speakerGuvenliTemizle();
          try {
            if (this.kasitliKes) {
              this.kasitliKes = false;
              this.yayinla('left');
            } else {
              this.yayinla('disconnected');
            }
          } catch {
            /* ignore */
          }
        }
      });
      room.on(RoomEvent.Reconnecting, () => {
        if (this.room !== room) return;
        this.yenidenBaglaniyor = true;
        this.yayinla('reconnecting');
      });
      room.on(RoomEvent.SignalReconnecting, () => {
        if (this.room !== room) return;
        this.yenidenBaglaniyor = true;
        this.yayinla('signal-reconnecting');
      });
      room.on(RoomEvent.Reconnected, () => {
        if (this.room !== room) return;
        this.durum = 'connected';
        this.yenidenBaglaniyor = false;
        this.yayinla('reconnected');
        void this.hoparlorGucluAc().catch(() => undefined);
        this.uzakSesleriGucluAc();
        // Koltuk onayı yokken / mute iken mic'i zorla açma
        void this.mikrofonDurumunuDogrula().catch((e) => {
          console.warn('[LiveKit] reconnect mic', e);
        });
        this.yayinlaVideo();
      });

      CanliOlcumIsaretle('baglantiBasla', input.roomName);
      try {
        await room.connect(input.url, input.token, {
          autoSubscribe: true,
          maxRetries: 5,
          peerConnectionTimeout: 20_000,
        });
        if (this.room === room) this.baglantiAni = Date.now();
        CanliOlcumIsaretle('odaBagli', input.roomName);
      } catch (connectErr) {
        // baglantiyiKes nesil artırır → kasıtlı iptal; LeaveRequest burada beklenen
        if (nesil !== this.baglantiNesil || this.kasitliKes) {
          if (this.room === room) this.room = null;
          this.durum = 'disconnected';
          this.yayinla('left');
          return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
        }
        throw connectErr;
      }

      if (nesil !== this.baglantiNesil) {
        await this.odayiGuvenliKes(room);
        if (this.room === room) this.room = null;
        return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
      }

      if (sesHazirlik) await sesHazirlik;
      await this.tarayiciSesiniAc();

      // Ses odası dinleyici: uzak sesi HEMEN aç — motor/mic bekleme yok.
      // Yayıncı: kısa motor hazırlığı (erken publish "engine not connected" üretir).
      if (this.asPublisher) {
        await this.motorHazirOlanaKadarBekle(nesil);
      }

      await this.hoparlorGucluAc();
      this.uzakSesleriGucluAc();

      // Dinleyici: bağlı say + dön — mic/kamera yolu uzak sesi geciktirmesin
      if (!this.asPublisher) {
        void this.mikrofonuGuvenliKapat().catch(() => undefined);
        this.durum = 'connected';
        this.mock = false;
        this.yayinla('connected');
        this.yayinlaVideo();
        setTimeout(() => {
          if (nesil !== this.baglantiNesil) return;
          if (this.room?.state !== ConnectionState.Connected) return;
          void this.hoparlorGucluAc().catch(() => undefined);
          this.uzakSesleriGucluAc();
        }, 280);
        return { ok: true };
      }

      // Kamera, mic'ten BAĞIMSIZ — mute host da görüntü yayınlayabilsin.
      // Yakalama geri sayımda başladıysa burada yalnız publish edilir.
      if (input.publishVideo) {
        if (nesil !== this.baglantiNesil) {
          await this.odayiGuvenliKes(room);
          if (this.room === room) this.room = null;
          return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
        }
        const camOk = await this.kameraAcVeBekle(4_000);
        if (!camOk) {
          // Odayı düşürme — sesle devam, kamera arka planda bağlansın
          console.warn(
            '[LiveKit] kamera ilk denemede bağlanamadı — arka plan retry',
          );
          this.kameraArkaPlandaDene(8);
        }
      }

      if (this.micIstenenAcik) {
        const micOk = await this.mikrofonGucluAc();
        if (!micOk) {
          // Bir kez daha dene — engine gecikmeli açılabiliyor
          await new Promise((r) => setTimeout(r, 350));
          if (nesil === this.baglantiNesil) {
            const tekrar = await this.mikrofonGucluAc();
            if (!tekrar) {
              // Ses odası / canlı: odayı düşürme — dinleme açık kalsın, mic arka planda
              console.warn(
                '[LiveKit] mikrofon ilk denemede yayınlanamadı — arka plan retry',
              );
              this.mikrofonArkaPlandaDene(6);
            }
          }
        }
      } else {
        void this.mikrofonuGuvenliKapat().catch(() => undefined);
      }

      // Android: kamera media moda düşürmesin.
      if (this.canliYayinModu && Platform.OS === 'android') {
        await this.androidIletisimKilitle();
      }
      await this.hoparlorGucluAc();
      this.uzakSesleriGucluAc();
      // iOS: hoparlörden sonra videoChat / voiceChat. Kamera voiceChat'i ezer.
      if (Platform.OS === 'ios' && this.canliYayinModu) {
        await IosCanliYayinOturumu(this.asPublisher);
        if (this.micIstenenAcik) {
          const mic = room.localParticipant.getTrackPublication(
            Track.Source.Microphone,
          );
          if (mic?.track && !mic.isMuted) await this.canliMikrofonuYenile(mic.track);
        }
      } else if (Platform.OS === 'ios') {
        IosYankIptaliAc();
      } else if (this.canliYayinModu && this.micIstenenAcik) {
        const mic = room.localParticipant.getTrackPublication(
          Track.Source.Microphone,
        );
        if (mic?.track && !mic.isMuted) await this.canliMikrofonuYenile(mic.track);
      }

      this.durum = 'connected';
      this.mock = false;
      this.yayinla('connected');
      this.yayinlaVideo();
      setTimeout(() => {
        if (nesil !== this.baglantiNesil) return;
        if (this.room?.state !== ConnectionState.Connected) return;
        void (async () => {
          await this.mikrofonDurumunuDogrula().catch((e) => {
            console.warn('[LiveKit] gecikmeli mic', e);
          });
          if (input.publishVideo && !this.localVideoTrack()) {
            this.kameraArkaPlandaDene(5);
          }
          await this.hoparlorGucluAc();
          if (Platform.OS === 'ios' && this.canliYayinModu) {
            await IosCanliYayinOturumu(this.asPublisher);
          } else if (this.canliYayinModu && Platform.OS === 'android') {
            await this.androidIletisimKilitle();
          }
          if (
            nesil === this.baglantiNesil &&
            this.canliYayinModu &&
            this.micIstenenAcik
          ) {
            const mic = this.room?.localParticipant?.getTrackPublication(
              Track.Source.Microphone,
            );
            if (mic?.track && !mic.isMuted) {
              await this.canliMikrofonuYenile(mic.track);
            }
          }
          this.uzakSesleriGucluAc();
          this.yayinlaVideo();
        })();
      }, 450);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (
        nesil !== this.baglantiNesil ||
        this.kasitliKes ||
        this.leaveRequestMi(e)
      ) {
        this.durum = 'disconnected';
        this.yayinla('left');
        return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
      }
      const hata = SesHataMetni(msg);
      this.durum = 'error';
      this.mock = false;
      this.yayinla('error');
      return { ok: false, hata };
    }
  }

  /**
   * Ses oturumu — connect ÖNCESİ bir kez (aynı profilde tekrar YOK).
   * Konuşmacı / 1:1: exclusive communication (Android↔iOS Opus).
   * Ses odası misafir: media + duck — harici müzik devam eder.
   * iOS: setupIOSAudioManagement otomatik; manuel setApple YOK (sıfır sample bug).
   */
  private sesImzasi(): string {
    // Ses odası ve canlı yayın: yayıncı + dinleyici aynı communication profili.
    // media/duck uzak Opus'u düşürür — canlı izleyici hostu duymaz.
    const iletisim =
      this.gorusmeModu ||
      this.asPublisher ||
      this.sesOdasiModu ||
      this.canliYayinModu;
    const profil = iletisim ? 'com' : 'duck';
    return `${Platform.OS}:${profil}:${this.asPublisher ? 1 : 0}`;
  }

  /** Aynı profil için uçuştaki hazırlık paylaşılır — ısıtma + bağlan çift configure etmesin */
  private sesOturumuHazirla(
    native: LiveKitNative,
    zorla = false,
  ): Promise<void> {
    if (zorla) return this.sesOturumuHazirlaIc(native, true);
    const imza = this.sesImzasi();
    const ucusta = this.sesHazirlikIs;
    if (ucusta && ucusta.imza === imza) return ucusta.is;
    const is: Promise<void> = this.sesOturumuHazirlaIc(native, false).finally(() => {
      if (this.sesHazirlikIs?.is === is) this.sesHazirlikIs = null;
    });
    this.sesHazirlikIs = { imza, is };
    return is;
  }

  private async sesOturumuHazirlaIc(
    native: LiveKitNative,
    zorla: boolean,
  ): Promise<void> {
    const iletisim =
      this.gorusmeModu ||
      this.asPublisher ||
      this.sesOdasiModu ||
      this.canliYayinModu;
    const imza = this.sesImzasi();
    if (!zorla && this.audioSessionAcik && this.sonSesImza === imza) {
      await native.AudioSession.startAudioSession().catch(() => undefined);
      return;
    }

    if (Platform.OS === 'android') {
      // Yayıncı: communication. Misafir: media + duck (müzik karışır).
      const androidOpts = iletisim
        ? {
            ...(native.AndroidAudioTypePresets.communication as object),
            ...ANDROID_ILETISIM_AUDIO,
          }
        : {
            ...(native.AndroidAudioTypePresets.media as object),
            ...ANDROID_SES_ODASI_MISAFIR,
          };

      await native.AudioSession.configureAudio({
        android: {
          preferredOutputList: [...ANDROID_CIKIS_ONCELIK],
          audioTypeOptions: androidOpts,
        },
        // speaker = BT yokken varsayılan; BT/headset varken sistem onları seçer
        ios: { defaultOutput: 'speaker' },
      });
    } else if (Platform.OS === 'ios') {
      // defaultOutput yalnızca BT/headset YOKKEN geçerli
      await native.AudioSession.configureAudio({
        ios: { defaultOutput: 'speaker' },
      }).catch(() => undefined);
    }

    await native.AudioSession.startAudioSession();
    this.audioSessionAcik = true;
    this.sonSesImza = imza;

    const hedef = Math.min(1, Math.max(0, this.uzakSesHacmi));
    await native.AudioSession.setDefaultRemoteAudioTrackVolume(
      hedef > 0.02 ? hedef : 1,
    ).catch(() => undefined);
  }

  /**
   * Uzak ses hacmi (tek kaynak) — 0..1 kullanıcı tercihi.
   * 0 = sessiz; Android'de 1 → track boost (ANDROID_UZAK_SES_MAX).
   * Reconnect / TrackSubscribed bunu ezmez.
   */
  setRemoteAudioVolume(volume: number): void {
    const v = !Number.isFinite(volume)
      ? 1
      : Math.max(0, Math.min(1, volume));
    this.uzakSesHacmi = v;
    const nativeHedef = v > 0.02 ? v : 0;
    try {
      void livekitNativeAl()
        ?.AudioSession.setDefaultRemoteAudioTrackVolume(nativeHedef)
        .catch(() => undefined);
    } catch {
      /* ignore */
    }
    this.uzakSesleriGucluAc();
  }

  /** Mevcut uzak ses tercihine göre seviyeleri uygula — yerel kimlik her zaman 0 (kendi sesini duyma) */
  private uzakSesleriGucluAc(): void {
    const room = this.room;
    if (!room) return;
    const v = this.uzakSesUygulanacak();
    const yerelKimlik = room.localParticipant.identity;
    try {
      for (const p of room.remoteParticipants.values()) {
        // Kendi identity remote listesinde olmamalı; yine de savunma
        if (p.identity && p.identity === yerelKimlik) {
          try {
            p.setVolume(0);
          } catch {
            /* ignore */
          }
          continue;
        }
        try {
          p.setVolume(Math.min(1, v > 0 ? Math.max(v, 0.01) : 0));
        } catch {
          /* ignore */
        }
        for (const pub of p.trackPublications.values()) {
          if (pub.kind !== Track.Kind.Audio) continue;
          const uzak = pub as {
            isSubscribed?: boolean;
            setSubscribed?: (on: boolean) => void;
            track?: RemoteAudioTrack;
          };
          if (uzak.isSubscribed === false) {
            try {
              uzak.setSubscribed?.(true);
            } catch {
              /* autoSubscribe yedek */
            }
          }
          const track = uzak.track;
          if (!track) continue;
          try {
            track.mediaStreamTrack.enabled = true;
          } catch {
            /* ignore */
          }
          try {
            track.setVolume(v);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  /** Tarayıcı otomatik oynatmayı kullanıcı dokunuşundan sonra açar. */
  private async tarayiciSesiniAc(): Promise<void> {
    if (Platform.OS !== 'web' || !this.room) return;
    const oda = this.room as Room & { startAudio?: () => Promise<void> };
    await oda.startAudio?.().catch(() => undefined);
  }

  private webUzakSesiBagla(track: RemoteAudioTrack): void {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      const el = track.attach();
      el.autoplay = true;
      el.setAttribute('playsinline', 'true');
      el.style.display = 'none';
      if (!el.parentElement) document.body.appendChild(el);
      void el.play?.().catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  private webUzakSesiKopar(track: RemoteAudioTrack): void {
    if (Platform.OS !== 'web') return;
    try {
      track.detach().forEach((el) => el.remove());
    } catch {
      /* ignore */
    }
  }

  private async hoparlorGucluAc(): Promise<void> {
    await this.sesCikisiniUygula('oto');
  }

  /**
   * Ses çıkışı:
   * - oto: Bluetooth / kablolu kulaklık varsa onu kullan; yoksa hoparlör
   * - hoparlor: BT/headset yoksa hoparlör (BT varsa çalma)
   * - ahize: kulaklık yoksa ahize
   *
   * iOS'ta `force_speaker` Bluetooth'u ezer → mümkünse `default`.
   */
  private async sesCikisiniUygula(
    tercih: 'oto' | 'hoparlor' | 'ahize' = 'oto',
  ): Promise<void> {
    if (Platform.OS === 'web') {
      await this.tarayiciSesiniAc();
      return;
    }
    try {
      const AudioSession = livekitNativeAl()?.AudioSession;
      if (!AudioSession) return;
      if (!this.audioSessionAcik) {
        await AudioSession.startAudioSession().catch(() => undefined);
        this.audioSessionAcik = true;
      }

      if (Platform.OS === 'ios') {
        // iOS: yalnız "default" | "force_speaker".
        // force_speaker Bluetooth/AirPods'u keser — otomatik rotada ASLA kullanma.
        // default + defaultToSpeaker: kulaklık yoksa hoparlör, varsa BT/kablolu.
        await AudioSession.selectAudioOutput('default').catch(() => undefined);
        if ((this.asPublisher || this.gorusmeModu) && !this.canliYayinModu) {
          IosYankIptaliAc();
        }
        return;
      }

      const outputs = await AudioSession.getAudioOutputs().catch(
        () => [] as string[],
      );
      const set = new Set(outputs.map((o) => String(o).toLowerCase()));
      const sec = async (id: string) => {
        await AudioSession.selectAudioOutput(id).catch(() => undefined);
      };

      if (set.has('bluetooth')) {
        await sec('bluetooth');
        return;
      }
      if (set.has('headset')) {
        await sec('headset');
        return;
      }
      if (tercih === 'ahize' && set.has('earpiece')) {
        await sec('earpiece');
        return;
      }
      if (set.has('speaker')) {
        await sec('speaker');
        return;
      }
      if (outputs[0]) await sec(outputs[0]);
    } catch {
      /* ignore */
    }
  }

  /**
   * Android canlı: AEC kapalı (kamera konuşmayı yer).
   * iOS canlı: AEC açık. Kapalı VPIO sessiz örnek yollar.
   */
  private mikrofonCapture() {
    if (this.canliYayinModu && Platform.OS === 'android') return CANLI_YAYIN_CAPTURE;
    return SES_ODA_CAPTURE;
  }

  /**
   * Kamera Android ses modunu media'ya düşürür.
   * Media yayın iOS izleyicide sessiz kalır — communication'a geri kilitle.
   */
  private async androidIletisimKilitle(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (
      !this.asPublisher &&
      !this.sesOdasiModu &&
      !this.gorusmeModu &&
      !this.canliYayinModu
    ) {
      return;
    }
    const native = livekitNativeAl();
    if (!native) return;
    await this.sesOturumuHazirla(native, true).catch(() => undefined);
    await this.hoparlorGucluAc().catch(() => undefined);
  }

  /** Kamera ses modunu bozduysa canlı mikrofonu communication altında yenile. */
  private async canliKameraSonrasiSes(): Promise<void> {
    await this.androidIletisimKilitle();
    if (!this.canliYayinModu || !this.asPublisher || !this.micIstenenAcik) return;
    const pub = this.room?.localParticipant?.getTrackPublication(
      Track.Source.Microphone,
    );
    if (!pub?.track || pub.isMuted) return;
    await this.canliMikrofonuYenile(pub.track);
  }

  /** Oturum kilitlendikten sonra mikrofonu doğru modda yeniden yakala. */
  private async canliMikrofonuYenile(track: {
    restartTrack?: (opts: object) => Promise<unknown>;
    mediaStreamTrack?: { enabled: boolean };
  }): Promise<void> {
    try {
      if (track.mediaStreamTrack) track.mediaStreamTrack.enabled = true;
    } catch {
      /* ignore */
    }
    if (Platform.OS === 'ios') await IosCanliYayinOturumu(true);
    const capture = Platform.OS === 'ios' ? SES_ODA_CAPTURE : CANLI_YAYIN_CAPTURE;
    if (track.restartTrack) {
      await track.restartTrack({ ...capture }).catch(() => undefined);
    }
    const pub = this.room?.localParticipant?.getTrackPublication(
      Track.Source.Microphone,
    );
    if (pub?.isMuted) await pub.unmute().catch(() => undefined);
    try {
      if (pub?.track?.mediaStreamTrack) pub.track.mediaStreamTrack.enabled = true;
    } catch {
      /* ignore */
    }
    if (Platform.OS === 'ios') IosYankIptaliAc();
  }

  /** Mikrofonu aç + yayın doğrula (retry + manuel publish yedegi) */
  private async mikrofonGucluAc(opts?: {
    /** true: unpublish/republish yok — reconnect sonrası güvenli */
    yalnizcaEnable?: boolean;
  }): Promise<boolean> {
    const room = this.room;
    const lp = room?.localParticipant;
    if (!lp || !room) return false;
    if (
      room.state === ConnectionState.Reconnecting ||
      room.state === ConnectionState.SignalReconnecting
    ) {
      return false;
    }

    for (let i = 0; i < 5; i++) {
      if (room.state !== ConnectionState.Connected) return false;
      try {
        // Oturum yoksa aç; aktif görüşmede tekrar configure ETME
        if (i === 0 && !this.audioSessionAcik) {
          const native = livekitNativeAl();
          if (native) await this.sesOturumuHazirla(native).catch(() => undefined);
        }
        await lp.setMicrophoneEnabled(true, {
          ...this.mikrofonCapture(),
        });
        await new Promise((r) => setTimeout(r, 200));
        const pub = lp.getTrackPublication(Track.Source.Microphone);
        if (pub?.isMuted) {
          await pub.unmute().catch(() => undefined);
        }
        if (pub?.track) {
          try {
            pub.track.mediaStreamTrack.enabled = true;
          } catch {
            /* ignore */
          }
        }
        if (pub?.track && !pub.isMuted) {
          if (Platform.OS === 'ios' && !this.canliYayinModu) IosYankIptaliAc();
          await this.androidIletisimKilitle();
          return true;
        }
        if (pub && !pub.isMuted) {
          if (Platform.OS === 'ios' && !this.canliYayinModu) IosYankIptaliAc();
          return true;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[LiveKit] mikrofon', e);
        if (/engine\s*not\s*connected|not connected within timeout/i.test(msg)) {
          await new Promise((r) => setTimeout(r, 350 + i * 150));
          continue;
        }
      }

      if (opts?.yalnizcaEnable) {
        await new Promise((r) => setTimeout(r, 220));
        continue;
      }

      // PC yeniyken unpublish "Sender does not belong" üretir — sadece Connected
      if (room.state !== ConnectionState.Connected) return false;
      try {
        const mevcut = lp.getTrackPublication(Track.Source.Microphone);
        if (mevcut?.track) {
          await lp.unpublishTrack(mevcut.track).catch(() => undefined);
        }
        if (room.state !== ConnectionState.Connected) return false;
        const track = await createLocalAudioTrack({
          ...this.mikrofonCapture(),
        });
        const yayin = this.canliYayinModu ? CANLI_YAYIN_PUBLISH : SES_ODA_PUBLISH;
        await lp.publishTrack(track, {
          source: Track.Source.Microphone,
          ...yayin,
        });
        await new Promise((r) => setTimeout(r, 140));
        const pub = lp.getTrackPublication(Track.Source.Microphone);
        if (pub?.track && !pub.isMuted) {
          try {
            pub.track.mediaStreamTrack.enabled = true;
          } catch {
            /* ignore */
          }
          await this.androidIletisimKilitle();
          if (Platform.OS === 'ios' && !this.canliYayinModu) IosYankIptaliAc();
          return true;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('[LiveKit] mikrofon publish', e);
        if (/engine\s*not\s*connected|not connected within timeout/i.test(msg)) {
          await new Promise((r) => setTimeout(r, 350 + i * 150));
          continue;
        }
      }
      await new Promise((r) => setTimeout(r, 280));
    }
    return false;
  }

  /**
   * Connect sonrası native audio engine / PC'nin publish kabul etmesi için kısa bekleme.
   * Erken setMicrophoneEnabled → "engine not connected within timeout".
   * Yalnız yayıncılar çağırır — dinleyici yolu uzak sesi bekletmez.
   */
  private async motorHazirOlanaKadarBekle(nesil: number): Promise<void> {
    const room = this.room;
    if (!room) return;
    const basla = Date.now();
    const limitMs = 1_600;
    while (Date.now() - basla < limitMs) {
      if (nesil !== this.baglantiNesil) return;
      if (room.state === ConnectionState.Connected) {
        await new Promise((r) => setTimeout(r, 120));
        if (nesil !== this.baglantiNesil) return;
        if (room.state === ConnectionState.Connected) return;
      }
      await new Promise((r) => setTimeout(r, 60));
    }
  }

  private videoCaptureOpts() {
    return {
      facingMode: this.kameraFacing,
      resolution: this.gorusmeModu
        ? GORUSME_VIDEO.resolution
        : VideoPresets.h720.resolution,
    };
  }

  /** Kamera aç + yayın doğrula (retry + manuel publish) */
  private async kameraGucluAc(): Promise<boolean> {
    const room = this.room;
    const lp = room?.localParticipant;
    if (!lp || !room) return false;
    if (
      room.state === ConnectionState.Reconnecting ||
      room.state === ConnectionState.SignalReconnecting
    ) {
      return false;
    }
    const opts = this.videoCaptureOpts();

    const hazir = await this.yerelKameraHazirla();
    if (hazir && room.state === ConnectionState.Connected) {
      try {
        if (hazir.mediaStreamTrack?.readyState === 'ended') {
          if (this.onKamera === hazir) this.onKamera = null;
        } else {
          const pub = lp.getTrackPublication(Track.Source.Camera);
          if (pub?.track !== hazir) {
            await lp.publishTrack(hazir, { source: Track.Source.Camera });
          }
          if (this.onKamera === hazir) this.onKamera = null;
          const yeni = lp.getTrackPublication(Track.Source.Camera);
          if (yeni?.isMuted) await yeni.unmute().catch(() => undefined);
          this.yayinlaVideo();
          return true;
        }
      } catch (e) {
        console.warn('[LiveKit] hazır kamera publish', e);
      }
    }

    // Ölü track (önceki yayın) yerel önizlemeyi karartır; izleyici SFU'dan görür.
    const mevcutVideo = this.localVideoTrack();
    if (mevcutVideo) {
      const hazir = mevcutVideo.mediaStreamTrack?.readyState;
      if (hazir === 'ended') {
        await lp.unpublishTrack(mevcutVideo).catch(() => undefined);
        try {
          mevcutVideo.stop();
        } catch {
          /* zaten kapalı */
        }
      } else {
        const pub = lp.getTrackPublication(Track.Source.Camera);
        if (pub?.isMuted) await pub.unmute().catch(() => undefined);
        this.yayinlaVideo();
        return true;
      }
    }

    for (let i = 0; i < 4; i++) {
      if (room.state !== ConnectionState.Connected) return false;
      try {
        await lp.setCameraEnabled(true, opts);
        // RN: SDP / track attach uzun sürebilir — poll
        const beklenen = Date.now() + 2_400;
        while (Date.now() < beklenen) {
          const pub = lp.getTrackPublication(Track.Source.Camera);
          if (pub?.isMuted) {
            await pub.unmute().catch(() => undefined);
          }
          if (pub?.track && !pub.isMuted) {
            this.yayinlaVideo();
            return true;
          }
          // Yayın uçuşta (trackID henüz yok) — unpublish etme
          if (pub && !pub.track) {
            await new Promise((r) => setTimeout(r, 140));
            continue;
          }
          await new Promise((r) => setTimeout(r, 140));
        }
        if (this.localVideoTrack()) {
          this.yayinlaVideo();
          return true;
        }
        // Publication var ama track gecikmeli — başarı say, UI bağlar
        if (this.localVideoYayindaMi()) {
          this.yayinlaVideo();
          return true;
        }
      } catch (camErr) {
        console.warn('[LiveKit] kamera açma', camErr);
        const msg = camErr instanceof Error ? camErr.message : String(camErr);
        // Cihaz meşgul / kilidi: CameraView serbest bırakmayı tekrar bekle
        if (/device|busy|in use|NotReadable|AbortError|Could not start/i.test(msg)) {
          await KameraOnizlemeSerbestBirak(1_500).catch(() => undefined);
        }
      }

      if (room.state !== ConnectionState.Connected) return false;
      // Uçuştaki setCameraEnabled bitmeden yeniden create etme
      const bekleyen = lp.getTrackPublication(Track.Source.Camera);
      if (bekleyen && !bekleyen.track) {
        await new Promise((r) => setTimeout(r, 500));
        if (this.localVideoTrack() || this.localVideoYayindaMi()) {
          this.yayinlaVideo();
          return true;
        }
      }
      try {
        const mevcut = lp.getTrackPublication(Track.Source.Camera);
        if (mevcut?.track) {
          await lp.unpublishTrack(mevcut.track).catch(() => undefined);
        }
        if (room.state !== ConnectionState.Connected) return false;
        await KameraOnizlemeSerbestBirak(800).catch(() => undefined);
        if (room.state !== ConnectionState.Connected) return false;
        const track = await createLocalVideoTrack(opts);
        await lp.publishTrack(track, { source: Track.Source.Camera });
        const beklenen = Date.now() + 2_000;
        while (Date.now() < beklenen) {
          const pub = lp.getTrackPublication(Track.Source.Camera);
          if (pub?.track && !pub.isMuted) {
            this.yayinlaVideo();
            return true;
          }
          await new Promise((r) => setTimeout(r, 120));
        }
        if (this.localVideoTrack() || this.localVideoYayindaMi()) {
          this.yayinlaVideo();
          return true;
        }
      } catch (e) {
        console.warn('[LiveKit] kamera publish', e);
      }
      await new Promise((r) => setTimeout(r, 320 + i * 180));
    }
    this.yayinlaVideo();
    return !!this.localVideoTrack() || this.localVideoYayindaMi();
  }

  /** Ön ↔ arka kamera (WhatsApp flip) */
  async kameraCevir(): Promise<void> {
    this.kameraFacing =
      this.kameraFacing === 'user' ? 'environment' : 'user';
    // Ayna/düz önizleme hemen güncellensin (track restart bitmeden)
    this.yayinlaVideo();
    const track = this.localVideoTrack();
    try {
      if (track) {
        await track.restartTrack(this.videoCaptureOpts());
      } else {
        await this.kameraGucluAc();
      }
    } catch (e) {
      console.warn('[LiveKit] kameraCevir', e);
      await this.kameraGucluAc().catch(() => undefined);
    }
    this.yayinlaVideo();
  }

  kameraFacingAl(): 'user' | 'environment' {
    return this.kameraFacing;
  }

  muteLocalAudio(mute: boolean) {
    // Yayıncı değilse açma isteklerini yok say — koltuk onayı öncesi ses sızmasın
    if (!mute && !this.asPublisher) {
      this.micIstenenAcik = false;
      void this.mikrofonuGuvenliKapat();
      return;
    }
    this.micIstenenAcik = !mute;
    const lp = this.room?.localParticipant;
    if (!lp) return;
    void (async () => {
      try {
        if (mute) {
          await this.mikrofonuGuvenliKapat();
          this.yerelKonusmaSeviyesiniSifirla();
          return;
        }

        // Soft unmute: mevcut track varsa cihazı yeniden açma / session zorla yenileme yok
        // (Clubhouse/Bigo — mute tıklama sesi + hoparlör kesilmesi olmasın)
        const mevcut = lp.getTrackPublication(Track.Source.Microphone);
        if (mevcut?.track) {
          await lp.setMicrophoneEnabled(true, { ...this.mikrofonCapture() }).catch(() => undefined);
          if (mevcut.isMuted) {
            await mevcut.unmute().catch(() => undefined);
          }
          this.uzakSesleriGucluAc();
          if (Platform.OS === 'ios' && !this.canliYayinModu) IosYankIptaliAc();
          return;
        }

        const ok = await this.mikrofonGucluAc();
        if (!ok) {
          this.micIstenenAcik = false;
          await this.mikrofonuGuvenliKapat();
          return;
        }
        // İlk mic açılışı — hoparlör + AEC
        await this.hoparlorGucluAc().catch(() => undefined);
        this.uzakSesleriGucluAc();
        if (Platform.OS === 'ios' && !this.canliYayinModu) IosYankIptaliAc();
      } catch (e) {
        console.warn('[LiveKit] muteLocalAudio', e);
      }
    })();
  }

  /** Reconnect / gecikmeli doğrulama — istenmeyen mic yayınını engeller */
  private async mikrofonDurumunuDogrula(): Promise<void> {
    if (!this.asPublisher || !this.micIstenenAcik) {
      await this.mikrofonuGuvenliKapat();
      this.yerelKonusmaSeviyesiniSifirla();
      return;
    }
    await this.mikrofonGucluAc({ yalnizcaEnable: true });
  }

  /** Dinleyici veya mute: capture + yayın tamamen kapalı */
  private async mikrofonuGuvenliKapat(): Promise<void> {
    const lp = this.room?.localParticipant;
    if (!lp) return;
    try {
      // stopMicTrackOnMute:false → soft mute; cihaz tıklaması yok
      await lp.setMicrophoneEnabled(false).catch(() => undefined);
      const pub = lp.getTrackPublication(Track.Source.Microphone);
      if (pub && !pub.isMuted) {
        await pub.mute().catch(() => undefined);
      }
    } catch (e) {
      console.warn('[LiveKit] mikrofon kapat', e);
    }
  }

  private yerelKonusmaSeviyesiniSifirla() {
    const id = this.room?.localParticipant?.identity;
    if (id) {
      try {
        KonusmaciSesSeviyesi.seviyeYaz(id, 0);
      } catch {
        /* ignore */
      }
    }
  }

  setLocalVideoEnabled(enabled: boolean) {
    this.kameraIstenenAcik = enabled && this.asPublisher;
    void (async () => {
      try {
        if (enabled) await this.kameraAcVeBekle(4_000);
        else await this.room?.localParticipant.setCameraEnabled(false);
        this.yayinlaVideo();
      } catch (e) {
        console.warn('[LiveKit] setLocalVideoEnabled', e);
      }
    })();
  }

  async setSpeakerphone(on: boolean) {
    try {
      await this.sesCikisiniUygula(on ? 'hoparlor' : 'ahize');
    } catch {
      /* ignore */
    }
  }

  /**
   * Oyun SFX / arka plan sonrası LiveKit sesini yenile.
   * zorla: tam configure (oyun çıkışı). Soft: yalnız hoparlör + hacim.
   */
  async sesOturumunuYenile(zorla = false): Promise<void> {
    try {
      const room = this.room;
      if (!room || room.state !== ConnectionState.Connected) return;
      const native = livekitNativeAl();
      // iOS modal kapanınca oturum düşer; bayrak true kalsa da yeniden başlat.
      if (native) {
        await native.AudioSession.startAudioSession().catch(() => undefined);
        this.audioSessionAcik = true;
      }
      if (native && (zorla || !this.sonSesImza)) {
        await this.sesOturumuHazirla(native, zorla).catch(() => undefined);
      }
      await this.hoparlorGucluAc();
      this.uzakSesleriGucluAc();
      // Ses odasında iOS dinleyici de playAndRecord — VPIO açık kalsın.
      // Canlı: videoChat (yayıncı) / voiceChat+hoparlör (izleyici).
      if (Platform.OS === 'ios' && this.canliYayinModu) {
        await IosCanliYayinOturumu(this.asPublisher);
      } else if (Platform.OS === 'ios') {
        IosYankIptaliAc();
      }
      if (this.asPublisher && this.micIstenenAcik) {
        await this.mikrofonGucluAc({ yalnizcaEnable: true }).catch(() => undefined);
      } else if (!this.asPublisher || !this.micIstenenAcik) {
        await this.mikrofonuGuvenliKapat().catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * Uygulama öne gelince: sesi tazele, kapanan kamerayı yeniden yayınla.
   * iOS arka planda kamerayı kapatır; track 'ended' kalırsa görüntü dönmez.
   */
  kamerayiOneGetir(): Promise<void> {
    if (this.oneGetirme) return this.oneGetirme;
    let is: Promise<void>;
    is = this.kamerayiOneGetirIc().finally(() => {
      if (this.oneGetirme === is) this.oneGetirme = null;
    });
    this.oneGetirme = is;
    return is;
  }

  private async kamerayiOneGetirIc(): Promise<void> {
    await this.sesOturumunuYenile(false);
    const room = this.room;
    if (!room || room.state !== ConnectionState.Connected) return;
    if (
      this.asPublisher &&
      this.kameraIstenenAcik &&
      !KameraOnizlemeTutuluyorMu()
    ) {
      const lp = room.localParticipant;
      const mevcut = this.localVideoTrack();
      const bitti = !mevcut || mevcut.mediaStreamTrack?.readyState === 'ended';
      if (!bitti && mevcut) {
        try {
          await mevcut.restartTrack(this.videoCaptureOpts());
          const pub = lp.getTrackPublication(Track.Source.Camera);
          if (pub?.isMuted) await pub.unmute().catch(() => undefined);
        } catch (e) {
          console.warn('[LiveKit] kamera geri', e);
          await lp.unpublishTrack(mevcut).catch(() => undefined);
          try {
            mevcut.stop();
          } catch {
            /* zaten kapalı */
          }
          await this.kameraAcVeBekle(5_000);
        }
      } else {
        if (mevcut) {
          await lp.unpublishTrack(mevcut).catch(() => undefined);
          try {
            mevcut.stop();
          } catch {
            /* zaten kapalı */
          }
        }
        await this.kameraAcVeBekle(5_000);
      }
    }
    this.onizlemeNesil += 1;
    this.yayinlaVideo();
  }

  /**
   * Hoparlör + uzak hacim — soft. Tam configure için sesOturumunuYenile(true).
   */
  private async sesPipelineGucluAc(): Promise<void> {
    await this.hoparlorGucluAc();
    this.uzakSesleriGucluAc();
  }

  async baglantiyiKes(hizli = false) {
    this.baglantiNesil += 1;
    try {
      // Canlı izleyici çıkışı sıradaki bağlantıyı (başka yayın) bekletmesin
      await this.sirayaAl(() =>
        this.baglantiyiKesIc({ hizli, arkaPlanda: this.canliIzleyiciOdasi }),
      );
    } catch {
      /* caller'a unhandled rejection sızmasın */
    }
  }

  private konusmacilariKuyrugaAl(speakers: Participant[]) {
    this.speakerBekleyen = speakers;
    if (this.speakerTimer) return;
    this.speakerTimer = setTimeout(() => {
      this.speakerTimer = null;
      const list = this.speakerBekleyen ?? [];
      this.speakerBekleyen = null;
      try {
        // Mute'lu / mikrofonu kapalı yereli animasyona yazma
        const yerel = this.room?.localParticipant;
        const yerelMute =
          !!yerel &&
          (!this.micIstenenAcik ||
            !!yerel.getTrackPublication(Track.Source.Microphone)?.isMuted);
        KonusmaciSesSeviyesi.aktifleriYaz(
          list
            .filter((s) => {
              if (yerelMute && s.identity === yerel?.identity) return false;
              // Uzak mute track → animasyon yok
              try {
                const mic = s.getTrackPublication?.(Track.Source.Microphone);
                if (mic?.isMuted) return false;
              } catch {
                /* ignore */
              }
              return true;
            })
            .map((s) => ({
              userId: s.identity,
              level: s.audioLevel ?? 0,
            })),
        );
      } catch {
        /* ignore */
      }
    }, 320);
  }

  /** Fast Refresh singleton'da prototype method kaybolabiliyor — instance-safe */
  private speakerGuvenliTemizle() {
    try {
      if (this.speakerTimer) {
        clearTimeout(this.speakerTimer);
        this.speakerTimer = null;
      }
      this.speakerBekleyen = null;
      KonusmaciSesSeviyesi.temizle?.();
    } catch {
      /* ignore */
    }
  }

  private async odayiGuvenliKes(room: Room | null | undefined) {
    if (!room) return;
    const disconnect = room.disconnect;
    if (typeof disconnect !== 'function') return;
    try {
      // RN'de WS 1001 sonrası disconnect bazen asılı kalır — çıkışı bloklama
      await Promise.race([
        Promise.resolve(disconnect.call(room, true)),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch {
      /* AbortReason / native race / beklenen WS close */
    }
  }

  /**
   * Canlı izleyici odasını beklemeden bırak: uzak ses/görüntü hemen kapanır,
   * sunucudan çıkış arka planda sürer. Aynı odaya dönüş `kapananOdalar` ile bekler.
   */
  private odayiArkaPlandaKapat(room: Room, roomName: string | null): void {
    try {
      for (const p of room.remoteParticipants.values()) {
        try {
          p.setVolume(0);
        } catch {
          /* ignore */
        }
        for (const pub of p.trackPublications.values()) {
          try {
            if (pub.track) pub.track.mediaStreamTrack.enabled = false;
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
    if (this.room === room) this.room = null;
    const is = (async () => {
      if (
        room.state === ConnectionState.Connecting ||
        room.state === ConnectionState.Reconnecting ||
        room.state === ConnectionState.SignalReconnecting
      ) {
        await this.bagliOlanaKadarBekle(8_000, room);
      }
      if (room.state !== ConnectionState.Disconnected) {
        await this.odayiGuvenliKes(room);
        await this.odaDuseneKadarBekle(room, 3_000);
      }
    })().catch(() => undefined);
    if (!roomName) return;
    this.kapananOdalar.set(roomName, is);
    void is.finally(() => {
      if (this.kapananOdalar.get(roomName) === is) this.kapananOdalar.delete(roomName);
    });
  }

  private async baglantiyiKesIc(opts?: {
    rolSifirla?: boolean;
    hizli?: boolean;
    kameraKoru?: boolean;
    /** Oda kapanışını bekleme (yalnız canlı izleyici odası) */
    arkaPlanda?: boolean;
    /** Hemen yeni odaya bağlanılacak — Android ses oturumunu kapatıp açma */
    sesKoru?: boolean;
  }) {
    const rolSifirla = opts?.rolSifirla !== false;
    const hizli = !!opts?.hizli;
    this.kasitliKes = true;
    if (!opts?.kameraKoru) this.onKamerayiDurdur();
    /** Gerçek oda vardıysa oturumu kapat; yoksa navigasyon ısıtmasını koru */
    let odaVardi = false;
    try {
      const room = this.room;
      odaVardi = !!room;
      if (room && opts?.arkaPlanda) {
        this.odayiArkaPlandaKapat(room, this.roomName);
      } else {
        // Connecting/Reconnecting iken disconnect → LeaveRequest + STATE_MISMATCH.
        // Önce Connected|Disconnected terminal state; sonra temiz kes.
        if (
          room &&
          (room.state === ConnectionState.Connecting ||
            room.state === ConnectionState.Reconnecting ||
            room.state === ConnectionState.SignalReconnecting)
        ) {
          await this.bagliOlanaKadarBekle(hizli ? 700 : 12_000);
        }
        // Hâlâ mid-flight (yavaş ICE) — kısa ikinci bekleme
        if (
          room &&
          (room.state === ConnectionState.Reconnecting ||
            room.state === ConnectionState.SignalReconnecting)
        ) {
          await this.bagliOlanaKadarBekle(hizli ? 400 : 8_000);
        }
        // room'u disconnect bitmeden null'lama — paralel baglan eski WS ile yarışmasın
        if (room && room.state !== ConnectionState.Disconnected) {
          await this.odayiGuvenliKes(room);
          await this.odaDuseneKadarBekle(room, hizli ? 800 : 3_000);
        }
      }
      if (this.room === room) this.room = null;
      this.canliIzleyiciOdasi = false;
      this.ilkKareSidler.clear();
      this.baglantiAni = null;
      this.yenidenBaglaniyor = false;
    } catch {
      /* ignore */
      if (this.room) this.room = null;
    }
    try {
      // Isıtılmış (oda yok) oturumu silme — join öncesi warmup boşa gitmesin
      if (!opts?.kameraKoru && !opts?.sesKoru && this.audioSessionAcik && odaVardi) {
        // iOS: registerGlobals/setupIOSAudioManagement oturumu yönetir —
        // agresif stop sonraki odada uzak sesi kırabilir. Android'de kapat.
        if (Platform.OS === 'android') {
          try {
            await livekitNativeAl()?.AudioSession.stopAudioSession?.();
          } catch {
            /* ignore */
          }
        }
        this.audioSessionAcik = false;
        this.sonSesImza = null;
      }
      this.roomName = null;
      if (!opts?.kameraKoru) this.kameraFacing = 'user';
      // uzakSesHacmi korunur — tercih kullanıcı slider'ında; kesince 1'e çekme
      if (rolSifirla) {
        this.gorusmeModu = false;
        this.sesOdasiModu = false;
        this.canliYayinModu = false;
        this.asPublisher = false;
        this.micIstenenAcik = false;
        this.kameraIstenenAcik = false;
      }
      this.durum = 'disconnected';
      this.speakerGuvenliTemizle();
      try {
        this.yayinlaVideo();
      } catch {
        /* ignore */
      }
      try {
        // Kasitli kes: 'left' — UI bağlantı koptu göstermesin
        this.yayinla('left');
        this.kasitliKes = false;
      } catch {
        this.kasitliKes = false;
      }
    } catch {
      this.durum = 'disconnected';
      this.kasitliKes = false;
    }
  }
}

const globalKayit = globalThis as typeof globalThis & {
  __tamusoLiveKitYoneticisi?: LiveKitBaglantiYoneticisiImpl;
  __tamusoLiveKitAppState?: boolean;
  __tamusoLiveKitAppStateSub?: { remove: () => void };
};

export const LiveKitBaglantiYoneticisi =
  globalKayit.__tamusoLiveKitYoneticisi ??
  (globalKayit.__tamusoLiveKitYoneticisi =
    new LiveKitBaglantiYoneticisiImpl());

// Fast Refresh: global singleton eski prototipte kalırsa yeni metotları bağla
Object.setPrototypeOf(
  LiveKitBaglantiYoneticisi,
  LiveKitBaglantiYoneticisiImpl.prototype,
);
// Yeni public API'yi instance'a da yaz — HMR'de "undefined is not a function" olmasın
(
  LiveKitBaglantiYoneticisi as LiveKitBaglantiYoneticisiImpl
).sesOturumuIsit =
  LiveKitBaglantiYoneticisiImpl.prototype.sesOturumuIsit.bind(
    LiveKitBaglantiYoneticisi,
  );
if (Platform.OS !== 'web') {
  globalKayit.__tamusoLiveKitAppStateSub?.remove();
  globalKayit.__tamusoLiveKitAppState = true;
  globalKayit.__tamusoLiveKitAppStateSub = AppState.addEventListener(
    'change',
    (state) => {
      if (state !== 'active') return;
      setTimeout(() => {
        if (AppState.currentState !== 'active') return;
        void LiveKitBaglantiYoneticisi.kamerayiOneGetir();
      }, 350);
    },
  );
}

const hmr =
  typeof module !== 'undefined'
    ? (module as { hot?: { dispose: (cb: () => void) => void } }).hot
    : undefined;
hmr?.dispose(() => {
  void LiveKitBaglantiYoneticisi.baglantiyiKes();
  // Fast Refresh: eski singleton prototipte yeni metotlar olmaz
  globalKayit.__tamusoLiveKitYoneticisi = undefined;
});

/** UI icin VideoView track tipi */
export type LiveKitVideoTrackRef = VideoTrack | null;
