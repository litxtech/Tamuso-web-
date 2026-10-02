import { NativeModules, Platform } from 'react-native';
import { KonusmaciSesSeviyesi } from '../livekit/ses/KonusmaciSesSeviyesi';
import { AgoraTokenAl } from './AgoraTokenAl';
import type { LiveKitRol } from '../livekit/token/LiveKitTokenAl';

type VideoDinleyici = (s: { uzakUidler: number[]; kameraOn: boolean }) => void;

type AgoraEngine = {
  initialize: (cfg: { appId: string }) => number;
  registerEventHandler: (handler: Record<string, unknown>) => void;
  enableAudio: () => number;
  enableVideo: () => number;
  disableVideo: () => number;
  setChannelProfile: (profile: number) => number;
  setClientRole: (role: number) => number;
  joinChannelWithUserAccount: (
    token: string,
    channel: string,
    account: string,
    options: Record<string, unknown>,
  ) => number;
  leaveChannel: () => number;
  muteLocalAudioStream: (mute: boolean) => number;
  setEnableSpeakerphone: (enable: boolean) => number;
  enableLocalVideo: (enable: boolean) => number;
  startPreview: () => number;
  stopPreview: () => number;
  switchCamera: () => number;
  renewToken: (token: string) => number;
  enableAudioVolumeIndication: (interval: number, smooth: number, reportVad: boolean) => number;
  getUserInfoByUid: (uid: number) => { userAccount?: string };
  release: () => void;
};

let engine: AgoraEngine | null = null;
let appId = '';
let kanal = '';
let hesap = '';
let rol: LiveKitRol = 'listener';
let video = false;
let yayinci = false;
let kameraOn = false;
let facingOn = true;
const uzakUidler = new Set<number>();
const videoDinleyiciler = new Set<VideoDinleyici>();
let yenileTimer: ReturnType<typeof setInterval> | undefined;

export function AgoraNativeVarMi(): boolean {
  if (Platform.OS === 'web') return false;
  const nm = NativeModules as Record<string, unknown>;
  return !!(nm.AgoraRtcNg || nm.AgoraRtcEngineModule || nm.AgoraRtc);
}

function haber() {
  const snap = { uzakUidler: [...uzakUidler], kameraOn };
  videoDinleyiciler.forEach((fn) => fn(snap));
}

function motor(): AgoraEngine | null {
  if (engine) return engine;
  if (!AgoraNativeVarMi()) return null;
  try {
    // Native yoksa import uygulama acilisinda patlamasin.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-agora') as {
      createAgoraRtcEngine: () => AgoraEngine;
    };
    engine = mod.createAgoraRtcEngine();
    return engine;
  } catch {
    return null;
  }
}

function sabitler(): { yayin: number; dinleyici: number; profil: number } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-agora') as {
      ClientRoleType: { ClientRoleBroadcaster: number; ClientRoleAudience: number };
      ChannelProfileType: { ChannelProfileLiveBroadcasting: number };
    };
    return {
      yayin: mod.ClientRoleType.ClientRoleBroadcaster,
      dinleyici: mod.ClientRoleType.ClientRoleAudience,
      profil: mod.ChannelProfileType.ChannelProfileLiveBroadcasting,
    };
  } catch {
    return null;
  }
}

async function tokenYenile() {
  if (!kanal) return;
  const t = await AgoraTokenAl({ roomName: kanal, role: rol });
  if (!t.ok) return;
  try {
    engine?.renewToken(t.token);
  } catch {
    /* sonraki volume/olayda tekrar denenir */
  }
}

export function AgoraVideoDinle(fn: VideoDinleyici): () => void {
  videoDinleyiciler.add(fn);
  fn({ uzakUidler: [...uzakUidler], kameraOn });
  return () => {
    videoDinleyiciler.delete(fn);
  };
}

export function AgoraUzakUidler(): number[] {
  return [...uzakUidler];
}

export async function AgoraBaglan(input: {
  roomName: string;
  role: LiveKitRol;
  video?: boolean;
  micAcik?: boolean;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  const eng = motor();
  const sab = sabitler();
  if (!eng || !sab) {
    return {
      ok: false,
      hata: 'Bu uygulama sürümü yedek ses altyapısını taşımıyor. Uygulamayı güncelleyin.',
    };
  }
  const token = await AgoraTokenAl({ roomName: input.roomName, role: input.role });
  if (!token.ok) return { ok: false, hata: token.hata };

  rol = token.role;
  video = !!input.video;
  yayinci = rol !== 'listener';
  kanal = token.channelName;
  hesap = token.uid;
  appId = token.appId;
  uzakUidler.clear();

  try {
    eng.initialize({ appId: token.appId });
    eng.registerEventHandler({
      onTokenPrivilegeWillExpire: () => {
        void tokenYenile();
      },
      onUserJoined: (_conn: unknown, uid: number) => {
        if (uid > 0) uzakUidler.add(uid);
        haber();
      },
      onUserOffline: (_conn: unknown, uid: number) => {
        uzakUidler.delete(uid);
        haber();
      },
      onAudioVolumeIndication: (
        _conn: unknown,
        speakers: Array<{ uid?: number; volume?: number }> | undefined,
      ) => {
        const aktifler: { userId: string; level: number }[] = [];
        for (const s of speakers ?? []) {
          const uid = s.uid ?? 0;
          const level = Math.min(1, (s.volume ?? 0) / 255);
          if (uid === 0) {
            if (hesap) aktifler.push({ userId: hesap, level });
            continue;
          }
          let userId = '';
          try {
            userId = eng.getUserInfoByUid(uid)?.userAccount ?? '';
          } catch {
            userId = '';
          }
          if (userId) aktifler.push({ userId, level });
        }
        if (aktifler.length) KonusmaciSesSeviyesi.aktifleriYaz(aktifler);
      },
    });
    eng.enableAudio();
    eng.enableAudioVolumeIndication(300, 3, true);
    eng.setChannelProfile(sab.profil);
    eng.setClientRole(yayinci ? sab.yayin : sab.dinleyici);
    if (video && yayinci) {
      eng.enableVideo();
      eng.enableLocalVideo(true);
      eng.startPreview();
      kameraOn = true;
    } else {
      eng.enableLocalVideo(false);
      kameraOn = false;
    }
    const kod = eng.joinChannelWithUserAccount(token.token, token.channelName, token.uid, {
      clientRoleType: yayinci ? sab.yayin : sab.dinleyici,
      publishMicrophoneTrack: yayinci && (input.micAcik ?? true),
      publishCameraTrack: video && yayinci,
      autoSubscribeAudio: true,
      autoSubscribeVideo: true,
    });
    if (kod < 0) return { ok: false, hata: 'Bağlantı kurulamadı' };
    eng.muteLocalAudioStream(!(yayinci && (input.micAcik ?? false)));
    eng.setEnableSpeakerphone(true);
    if (yenileTimer) clearInterval(yenileTimer);
    yenileTimer = setInterval(() => {
      void tokenYenile();
    }, 45 * 60 * 1000);
    haber();
    return { ok: true };
  } catch {
    return { ok: false, hata: 'Bağlantı kurulamadı' };
  }
}

export async function AgoraKes() {
  if (yenileTimer) clearInterval(yenileTimer);
  yenileTimer = undefined;
  try {
    engine?.leaveChannel();
  } catch {
    /* zaten kapalı */
  }
  kanal = '';
  uzakUidler.clear();
  kameraOn = false;
  haber();
}

export function AgoraMikrofon(acik: boolean) {
  try {
    engine?.muteLocalAudioStream(!acik);
  } catch {
    /* motor yok */
  }
}

export function AgoraHoparlor(acik: boolean) {
  try {
    engine?.setEnableSpeakerphone(acik);
  } catch {
    /* motor yok */
  }
}

export function AgoraKamera(acik: boolean) {
  if (!engine || !video) return;
  try {
    engine.enableLocalVideo(acik);
    if (acik) engine.startPreview();
    else engine.stopPreview();
    kameraOn = acik;
    haber();
  } catch {
    /* motor yok */
  }
}

export function AgoraKameraCevir() {
  try {
    engine?.switchCamera();
    facingOn = !facingOn;
    haber();
  } catch {
    /* motor yok */
  }
}

export async function AgoraKameraAcVeBekle(): Promise<boolean> {
  AgoraKamera(true);
  return kameraOn;
}

export function AgoraYayinciMi(): boolean {
  return yayinci && !!kanal;
}

export function AgoraOnKameraMi(): boolean {
  return facingOn;
}
