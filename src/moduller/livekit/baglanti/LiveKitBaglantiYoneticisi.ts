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
  type VideoTrack,
} from 'livekit-client';
import { KonusmaciSesSeviyesi } from '../ses/KonusmaciSesSeviyesi';
// Native kontrol — VideoViewAl ile aynı kaynak
import { LiveKitNativeVarMi } from '../bilesenler/LiveKitVideoViewAl';
import {
  IosYankIptaliAc,
  LiveKitGlobalsKaydet,
} from '../polyfill/LiveKitGlobalsKaydet';
import i18n from '../../../i18n';
import { KameraOnizlemeSerbestBirak } from '../kamera/KameraOnizlemeKilidi';

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
 * Ses odası misafir + canlı izleyici — STREAM_MUSIC.
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
type VideoDinleyici = (state: {
  localVideo: LocalVideoTrack | null;
  remoteVideo: RemoteVideoTrack | null;
  remoteIds: string[];
  /** user = ön (ayna), environment = arka (düz) */
  kameraFacing: 'user' | 'environment';
}) => void;

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
  private speakerTimer: ReturnType<typeof setTimeout> | null = null;
  private speakerBekleyen: Participant[] | null = null;
  /** Uzak ses hacmi 0..1 (kullanıcı tercihi) — reconnect ezmez */
  private uzakSesHacmi = 1;
  /** Bu oturumda yayın hakkı var mı (host/speaker). Dinleyici false. */
  private asPublisher = false;
  /** Uygulama mikrofonu açık istiyor mu — reconnect setTimeout mute'u ezmesin */
  private micIstenenAcik = false;
  /** bilerek kes / rol upgrade — UI "Bağlantı koptu" göstermesin */
  private kasitliKes = false;

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

  private async bagliOlanaKadarBekle(timeoutMs = 12_000): Promise<boolean> {
    const room = this.room;
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
    if (!e || typeof e !== 'object') {
      return /leave request/i.test(String(e));
    }
    const err = e as {
      reasonName?: string;
      message?: string;
      name?: string;
    };
    if (err.reasonName === 'LeaveRequest') return true;
    if (err.name === 'ConnectionError' && /leave request/i.test(err.message ?? '')) {
      return true;
    }
    return /leave request/i.test(err.message ?? String(e));
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
  }

  private videoDurumu() {
    return {
      localVideo: this.localVideoTrack(),
      remoteVideo: this.remoteVideoTrack(),
      remoteIds: this.remoteParticipantIds(),
      kameraFacing: this.kameraFacing,
    };
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
    if (this.localVideoTrack()) {
      this.yayinlaVideo();
      return true;
    }
    // Expo CameraView hâlâ tutuyorsa önce serbest bırakmayı bekle
    await KameraOnizlemeSerbestBirak(
      Math.min(2_000, Math.max(400, timeoutMs / 2)),
    ).catch(() => undefined);

    while (Date.now() - basla < timeoutMs) {
      if (this.room?.state !== ConnectionState.Connected) return false;
      const ok = await this.kameraGucluAc();
      if (ok && this.localVideoTrack()) {
        this.yayinlaVideo();
        return true;
      }
      // Publish uçuşta — yıkıcı unpublish yapmadan bekle
      if (this.localVideoYayindaMi()) {
        await new Promise((r) => setTimeout(r, 220));
        if (this.localVideoTrack()) {
          this.yayinlaVideo();
          return true;
        }
        // Publication var ama track yok — yine de "yayında" say (UI poll bağlar)
        if (Date.now() - basla > timeoutMs * 0.65) {
          this.yayinlaVideo();
          return true;
        }
      }
      await new Promise((r) => setTimeout(r, 280));
    }
    if (this.localVideoTrack() || this.localVideoYayindaMi()) {
      this.yayinlaVideo();
      return true;
    }
    return false;
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
    if (input.publishVideo) this.kameraFacing = 'user';
    // undefined → false (dinleyici güvenli); sadece açık true yayıncı
    this.asPublisher = !!input.asPublisher;
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
    // Rol / mod değişince ses profilini yeniden kur
    this.sonSesImza = null;

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

    await this.baglantiyiKesIc({ rolSifirla: false });
    if (nesil !== this.baglantiNesil) {
      return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
    }

    // baglantiyiKesIc odayı keser; rol bayrakları bu join için yeniden yazılır
    this.gorusmeModu = !!input.gorusmeModu;
    this.sesOdasiModu = !!input.sesOdasi;
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
      return {
        ok: false,
        hata:
          'Canlı medya yok (mock). LiveKit yapılandırması veya native WebRTC build gerekli.',
      };
    }

    try {
      globalsKaydet();
      const native = livekitNativeAl();
      if (!native) {
        this.durum = 'error';
        this.mock = false;
        this.yayinla('native-missing');
        return {
          ok: false,
          hata:
            'WebRTC native modülü yok. Expo Go değil, LiveKit’li development/production build kullan.',
        };
      }

      await this.sesOturumuHazirla(native);

      if (nesil !== this.baglantiNesil) {
        await this.baglantiyiKesIc();
        return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
      }

      const gorusme = !!input.gorusmeModu;
      // Canlı izleyici video:true → sesOdasi=false (MedyaBaglantisi).
      // Eski: !publishVideo ile izleyiciyi ses odası sanıyordu.
      const sesOdasi =
        typeof input.sesOdasi === 'boolean'
          ? input.sesOdasi
          : !gorusme && !input.publishVideo;
      const videoYayin = !!input.publishVideo && !gorusme;
      const room = new Room({
        adaptiveStream: sesOdasi ? false : { pixelDensity: 'screen' },
        dynacast: !sesOdasi,
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
                ...SES_ODA_PUBLISH,
                simulcast: true,
                videoSimulcastLayers: [
                  VideoPresets.h180,
                  VideoPresets.h360,
                  VideoPresets.h720,
                ],
                videoEncoding: VideoPresets.h720.encoding,
                degradationPreference: 'balanced',
              }
            : SES_ODA_PUBLISH,
      });
      this.room = room;

      const yenile = () => this.yayinlaVideo();

      room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
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
          if (!kendi) {
            // Dinleyici join: track gelince çıkış + hacim — sessiz kalmasın
            void this.hoparlorGucluAc().catch(() => undefined);
            this.uzakSesleriGucluAc();
            if (Platform.OS === 'ios') IosYankIptaliAc();
          }
        }
        yenile();
      });
      room.on(RoomEvent.TrackUnsubscribed, yenile);
      room.on(RoomEvent.TrackPublished, yenile);
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
        if (this.room === room) this.yayinla('reconnecting');
      });
      room.on(RoomEvent.SignalReconnecting, () => {
        if (this.room === room) this.yayinla('signal-reconnecting');
      });
      room.on(RoomEvent.Reconnected, () => {
        if (this.room !== room) return;
        this.durum = 'connected';
        this.yayinla('reconnected');
        void this.hoparlorGucluAc().catch(() => undefined);
        this.uzakSesleriGucluAc();
        // Koltuk onayı yokken / mute iken mic'i zorla açma
        void this.mikrofonDurumunuDogrula().catch((e) => {
          console.warn('[LiveKit] reconnect mic', e);
        });
        this.yayinlaVideo();
      });

      try {
        await room.connect(input.url, input.token, {
          autoSubscribe: true,
          maxRetries: 5,
          peerConnectionTimeout: 20_000,
        });
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

      // PC + native audio engine otursun — erken publish "engine not connected" üretir
      await this.motorHazirOlanaKadarBekle(nesil);

      await this.hoparlorGucluAc();
      this.uzakSesleriGucluAc();

      // Kamera, mic'ten BAĞIMSIZ — mute host da görüntü yayınlayabilsin
      if (this.asPublisher && input.publishVideo) {
        // Expo CameraView serbest bırakılmadan WebRTC kamera açılmaz
        await KameraOnizlemeSerbestBirak(2_800).catch(() => undefined);
        if (nesil !== this.baglantiNesil) {
          await this.odayiGuvenliKes(room);
          if (this.room === room) this.room = null;
          return { ok: false, hata: i18n.t('sesOda.baglantiIptalEdildi') };
        }
        const camOk = await this.kameraAcVeBekle(7_500);
        if (!camOk) {
          // Odayı düşürme — sesle devam, kamera arka planda bağlansın
          console.warn(
            '[LiveKit] kamera ilk denemede bağlanamadı — arka plan retry',
          );
          this.kameraArkaPlandaDene(8);
        }
      }

      if (this.asPublisher && this.micIstenenAcik) {
        const micOk = await this.mikrofonGucluAc();
        if (!micOk) {
          // Bir kez daha dene — engine gecikmeli açılabiliyor
          await new Promise((r) => setTimeout(r, 500));
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
      } else if (!this.asPublisher || !this.micIstenenAcik) {
        // Dinleyici veya mute: OS/capture sızmasın
        await this.mikrofonuGuvenliKapat();
      }

      // Join sonrası: hoparlör + uzak ses (tam configure TEKRAR etme)
      await this.hoparlorGucluAc();
      this.uzakSesleriGucluAc();
      if (Platform.OS === 'ios' && this.asPublisher) {
        IosYankIptaliAc();
      }

      this.durum = 'connected';
      this.mock = false;
      this.yayinla('connected');
      this.yayinlaVideo();
      setTimeout(() => {
        if (nesil !== this.baglantiNesil) return;
        if (this.room?.state !== ConnectionState.Connected) return;
        void this.mikrofonDurumunuDogrula();
        // Çalışan kamerayı yeniden publish etme — yalnızca yoksa arka plan dene
        if (this.asPublisher && input.publishVideo && !this.localVideoTrack()) {
          this.kameraArkaPlandaDene(5);
        }
        void this.hoparlorGucluAc();
        this.uzakSesleriGucluAc();
        this.yayinlaVideo();
      }, 700);
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
      // Sadece gerçekten native/modul yok hataları — "null" tek başına yakalanmaz
      const nativeYok =
        /Expo Go|Native module not found|WebRTC native module|Cannot find module|registerGlobals is not a function/i.test(
          msg,
        );
      if (nativeYok) {
        this.durum = 'error';
        this.mock = false;
        this.yayinla('native-error:' + msg);
        return {
          ok: false,
          hata:
            'WebRTC/LiveKit native hatası. Yeni development build al (Expo Go yeterli değil).',
        };
      }
      const hata = /invalid api key|unauthorized|403|Forbidden/i.test(msg)
        ? 'LiveKit API anahtari gecersiz — Cloud Keys yenile'
        : /Could not fetch region|network|timeout|ECONNRESET|Failed to fetch|Load failed/i.test(
              msg,
            )
          ? 'Ses sunucusuna ulaşılamadı. İnterneti kontrol edip tekrar dene.'
          : msg;
      this.durum = 'error';
      this.yayinla(hata);
      return { ok: false, hata };
    }
  }

  /**
   * Ses oturumu — connect ÖNCESİ bir kez (aynı profilde tekrar YOK).
   * Konuşmacı / 1:1: exclusive communication (Android↔iOS Opus).
   * Ses odası misafir: media + duck — harici müzik devam eder.
   * iOS: setupIOSAudioManagement otomatik; manuel setApple YOK (sıfır sample bug).
   */
  private async sesOturumuHazirla(
    native: LiveKitNative,
    zorla = false,
  ): Promise<void> {
    // Ses odası: yayıncı + dinleyici aynı communication profili
    // (media/duck dinleyicide Opus uzak ses sık kaçıyordu — koltuk isteyince duyuluyordu)
    const iletisim =
      this.gorusmeModu || this.asPublisher || this.sesOdasiModu;
    const profil = iletisim ? 'com' : 'duck';
    const imza = `${Platform.OS}:${profil}:${this.asPublisher ? 1 : 0}`;
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
          if (pub.kind === Track.Kind.Audio && pub.track) {
            try {
              (pub.track as RemoteAudioTrack).setVolume(v);
            } catch {
              /* ignore */
            }
          }
        }
      }
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
        if (this.asPublisher || this.gorusmeModu) {
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
          ...SES_ODA_CAPTURE,
        });
        await new Promise((r) => setTimeout(r, 200));
        const pub = lp.getTrackPublication(Track.Source.Microphone);
        if (pub?.isMuted) {
          await pub.unmute().catch(() => undefined);
        }
        if (pub?.track && !pub.isMuted) {
          if (Platform.OS === 'ios') IosYankIptaliAc();
          if (Platform.OS === 'android' && (this.sesOdasiModu || this.gorusmeModu)) {
            // Mic açılınca Android bazen media'ya düşer — communication'a kilitle
            const native = livekitNativeAl();
            if (native) {
              await this.sesOturumuHazirla(native, true).catch(() => undefined);
              await this.hoparlorGucluAc().catch(() => undefined);
            }
          }
          return true;
        }
        if (pub && !pub.isMuted) {
          if (Platform.OS === 'ios') IosYankIptaliAc();
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
          ...SES_ODA_CAPTURE,
        });
        await lp.publishTrack(track, {
          source: Track.Source.Microphone,
          audioPreset: AudioPresets.speech,
          dtx: false,
          red: true,
        });
        await new Promise((r) => setTimeout(r, 140));
        const pub = lp.getTrackPublication(Track.Source.Microphone);
        if (pub?.track && !pub.isMuted) {
          if (Platform.OS === 'android' && (this.sesOdasiModu || this.gorusmeModu)) {
            const native = livekitNativeAl();
            if (native) {
              await this.sesOturumuHazirla(native, true).catch(() => undefined);
              await this.hoparlorGucluAc().catch(() => undefined);
            }
          }
          if (Platform.OS === 'ios') IosYankIptaliAc();
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
   */
  private async motorHazirOlanaKadarBekle(nesil: number): Promise<void> {
    const room = this.room;
    if (!room) return;
    const basla = Date.now();
    // Dinleyici: daha kısa bekle — uzak ses gecikmesin
    const limitMs = this.asPublisher ? 2500 : 1200;
    while (Date.now() - basla < limitMs) {
      if (nesil !== this.baglantiNesil) return;
      if (room.state === ConnectionState.Connected) {
        await new Promise((r) => setTimeout(r, this.asPublisher ? 220 : 80));
        if (nesil !== this.baglantiNesil) return;
        if (room.state === ConnectionState.Connected) return;
      }
      await new Promise((r) => setTimeout(r, 80));
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

    // Zaten track varsa dokunma — gereksiz unpublish yayın keser
    if (this.localVideoTrack()) {
      const pub = lp.getTrackPublication(Track.Source.Camera);
      if (pub?.isMuted) await pub.unmute().catch(() => undefined);
      this.yayinlaVideo();
      return true;
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
          await lp.setMicrophoneEnabled(true, { ...SES_ODA_CAPTURE }).catch(() => undefined);
          if (mevcut.isMuted) {
            await mevcut.unmute().catch(() => undefined);
          }
          this.uzakSesleriGucluAc();
          if (Platform.OS === 'ios') IosYankIptaliAc();
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
        if (Platform.OS === 'ios') IosYankIptaliAc();
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
      if (native && (zorla || !this.audioSessionAcik)) {
        await this.sesOturumuHazirla(native, zorla).catch(() => undefined);
      }
      await this.hoparlorGucluAc();
      this.uzakSesleriGucluAc();
      // Ses odasında iOS dinleyici de playAndRecord — VPIO açık kalsın
      if (Platform.OS === 'ios') {
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
   * Hoparlör + uzak hacim — soft. Tam configure için sesOturumunuYenile(true).
   */
  private async sesPipelineGucluAc(): Promise<void> {
    await this.hoparlorGucluAc();
    this.uzakSesleriGucluAc();
  }

  async baglantiyiKes() {
    this.baglantiNesil += 1;
    try {
      await this.sirayaAl(() => this.baglantiyiKesIc());
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

  private async baglantiyiKesIc(opts?: { rolSifirla?: boolean }) {
    const rolSifirla = opts?.rolSifirla !== false;
    this.kasitliKes = true;
    try {
      const room = this.room;
      // Connecting/Reconnecting iken disconnect → LeaveRequest + STATE_MISMATCH.
      // Önce Connected|Disconnected terminal state; sonra temiz kes.
      if (
        room &&
        (room.state === ConnectionState.Connecting ||
          room.state === ConnectionState.Reconnecting ||
          room.state === ConnectionState.SignalReconnecting)
      ) {
        await this.bagliOlanaKadarBekle(12_000);
      }
      // Hâlâ mid-flight (yavaş ICE) — kısa ikinci bekleme
      if (
        room &&
        (room.state === ConnectionState.Reconnecting ||
          room.state === ConnectionState.SignalReconnecting)
      ) {
        await this.bagliOlanaKadarBekle(8_000);
      }
      // room'u disconnect bitmeden null'lama — paralel baglan eski WS ile yarışmasın
      if (room && room.state !== ConnectionState.Disconnected) {
        await this.odayiGuvenliKes(room);
        await this.odaDuseneKadarBekle(room, 3_000);
      }
      if (this.room === room) this.room = null;
    } catch {
      /* ignore */
      if (this.room) this.room = null;
    }
    try {
      if (this.audioSessionAcik) {
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
      }
      this.roomName = null;
      this.sonSesImza = null;
      this.kameraFacing = 'user';
      // uzakSesHacmi korunur — tercih kullanıcı slider'ında; kesince 1'e çekme
      if (rolSifirla) {
        this.gorusmeModu = false;
        this.sesOdasiModu = false;
        this.asPublisher = false;
        this.micIstenenAcik = false;
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
};

export const LiveKitBaglantiYoneticisi =
  globalKayit.__tamusoLiveKitYoneticisi ??
  (globalKayit.__tamusoLiveKitYoneticisi =
    new LiveKitBaglantiYoneticisiImpl());

// Fast Refresh: global singleton eski prototipte kalırsa yeni metotları bağla
if (
  typeof (LiveKitBaglantiYoneticisi as { kameraFacingAl?: unknown })
    .kameraFacingAl !== 'function'
) {
  Object.setPrototypeOf(
    LiveKitBaglantiYoneticisi,
    LiveKitBaglantiYoneticisiImpl.prototype,
  );
}
if (Platform.OS !== 'web' && !globalKayit.__tamusoLiveKitAppState) {
  globalKayit.__tamusoLiveKitAppState = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      // Soft yenile — tam configure arka plandan dönüşte yarış yaratır
      void LiveKitBaglantiYoneticisi.sesOturumunuYenile(false);
    }
  });
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
