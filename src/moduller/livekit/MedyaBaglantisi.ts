import { MedyaIzinleriniIste } from './izin/MedyaIzinleriniIste';
import { LiveKitTokenAl, type LiveKitRol } from './token/LiveKitTokenAl';
import { LiveKitBaglantiYoneticisi } from './baglanti/LiveKitBaglantiYoneticisi';
import { SesHataMetni } from './baglanti/SesHataMetni';
import { RtcAktifSaglayici } from '../rtc/RtcProviderDurumu';
import { CanliOlcumIsaretle } from '../canli-yayin/olcum/CanliIzlemeOlcum';
import {
  AgoraBaglan,
  AgoraHoparlor,
  AgoraKamera,
  AgoraKameraAcVeBekle,
  AgoraKameraCevir,
  AgoraKes,
  AgoraMikrofon,
  AgoraYayinciMi,
} from '../rtc/AgoraMotoru';

export type RtcSaglayici = 'livekit' | 'agora';

export function AktifRtcSaglayici(): RtcSaglayici {
  return RtcAktifSaglayici() === 'AGORA' ? 'agora' : 'livekit';
}

type SonBaglanti = {
  roomName: string;
  role: LiveKitRol;
  video?: boolean;
  gorusmeModu?: boolean;
  micAcik?: boolean;
};

let sonBaglanti: SonBaglanti | null = null;
let acikMotor: RtcSaglayici | null = null;

/** Küçültülmüş oda/yayın varken blur temizliği bağlantıyı kesmesin. */
function miniOturumSesiKoru(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ses = require('../ses-odalari/oturum/AktifSesOdasiOturumu') as {
      AktifSesOdasiArkaPlandaMi: () => boolean;
      AktifSesOdasiKucultmeTazeMi: (ms?: number) => boolean;
    };
    if (ses.AktifSesOdasiArkaPlandaMi() || ses.AktifSesOdasiKucultmeTazeMi()) {
      return true;
    }
  } catch {
    /* oturum modülü yok */
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const canli = require('../canli-yayin/oturum/AktifCanliYayinOturumu') as {
      AktifCanliYayinArkaPlandaMi: () => boolean;
      AktifCanliYayinKucultmeTazeMi: (ms?: number) => boolean;
    };
    if (canli.AktifCanliYayinArkaPlandaMi() || canli.AktifCanliYayinKucultmeTazeMi()) {
      return true;
    }
  } catch {
    /* oturum modülü yok */
  }
  return false;
}

export type MedyaBaglantiSonuc =
  | { ok: true; saglayici: RtcSaglayici; mock: boolean; kanal: string }
  | { ok: false; hata: string };

/**
 * Oda / canli / 1:1 gorusme — LiveKit facade.
 * Gift / PK / chat buraya yazilmaz.
 */
export async function MedyaOdasiBaglan(input: {
  roomName: string;
  role: LiveKitRol;
  video?: boolean;
  /** 1:1 görüşme — düşük çözünürlük, speech audio, az kasma */
  gorusmeModu?: boolean;
  /** true: aynı odaya zorla yeniden bağlan (rol yükseltme) */
  zorla?: boolean;
  /**
   * Yayıncıda mikrofon başlangıç durumu.
   * Ses odası koltuk izni → true; dinleyici → yok sayılır.
   */
  micAcik?: boolean;
}): Promise<MedyaBaglantiSonuc> {
  sonBaglanti = {
    roomName: input.roomName,
    role: input.role,
    video: input.video,
    gorusmeModu: input.gorusmeModu,
    micAcik: input.micAcik,
  };

  if (RtcAktifSaglayici() === 'AGORA') {
    if (acikMotor === 'livekit') {
      await LiveKitBaglantiYoneticisi.baglantiyiKes();
    }
    const bag = await AgoraBaglan({
      roomName: input.roomName,
      role: input.role,
      video: !!input.video,
      micAcik: input.micAcik,
    });
    if (!bag.ok) return { ok: false, hata: bag.hata };
    acikMotor = 'agora';
    AgoraHoparlor(true);
    return { ok: true, saglayici: 'agora', mock: false, kanal: input.roomName };
  }

  if (acikMotor === 'agora') {
    await AgoraKes();
  }

  const asPublisher =
    input.role === 'host' ||
    input.role === 'publisher' ||
    input.role === 'speaker';
  const publishVideo = !!input.video && asPublisher;
  /** Ses odası: dinleyici de OS mic izni — iOS playAndRecord (uzak Opus) için */
  const sesOdasi = !input.gorusmeModu && !input.video;

  // İzin + token + ses oturumu ısıtması paralel — odaya giriş gecikmesini kes
  const sesIsit =
    typeof LiveKitBaglantiYoneticisi.sesOturumuIsit === 'function'
      ? LiveKitBaglantiYoneticisi.sesOturumuIsit({
          sesOdasi,
          asPublisher,
          gorusmeModu: !!input.gorusmeModu,
        }).catch(() => undefined)
      : Promise.resolve();
  const [izin, token] = await Promise.all([
    MedyaIzinleriniIste({
      mikrofon: asPublisher || sesOdasi,
      kamera: publishVideo,
      amac: asPublisher ? 'yayin' : 'dinleme',
    }),
    LiveKitTokenAl({
      roomName: input.roomName,
      role: input.role,
    }),
    sesIsit,
  ]);
  if (!izin.ok) return { ok: false, hata: izin.hata ?? 'Medya izni yok' };
  if (!token.ok) return { ok: false, hata: token.hata };
  CanliOlcumIsaretle('token', input.roomName);

  const bag = await LiveKitBaglantiYoneticisi.baglan({
    url: token.url,
    token: token.token,
    roomName: token.roomName,
    mock: token.mock,
    asPublisher,
    publishVideo,
    gorusmeModu: !!input.gorusmeModu,
    /** Ses odası: herkes communication — dinleyici de anında duysun */
    sesOdasi,
    zorla: input.zorla,
    micAcik: asPublisher ? (input.micAcik ?? !sesOdasi) : false,
  });
  if (!bag.ok) return { ok: false, hata: bag.hata ?? SesHataMetni() };

  // Bluetooth / kulaklık varsa onu kullan; yoksa hoparlör
  void LiveKitBaglantiYoneticisi.setSpeakerphone(true);
  // Uzak ses hemen tam — dinleyici join'de sessizlik olmasın
  LiveKitBaglantiYoneticisi.setRemoteAudioVolume(1);

  acikMotor = 'livekit';
  return {
    ok: true,
    saglayici: 'livekit',
    mock: token.mock || LiveKitBaglantiYoneticisi.mockMu(),
    kanal: token.roomName,
  };
}

/** Aktif medyayı yeni sağlayıcıya taşır. Oda / arama / yayın kaydı silinmez. */
export async function MedyaSaglayiciGecisi(): Promise<void> {
  const girdi = sonBaglanti;
  if (!girdi) return;
  await MedyaOdasiKes();
  await MedyaOdasiBaglan({ ...girdi, zorla: true });
}

export async function MedyaOdasiKes(opts?: { hizli?: boolean; zorla?: boolean }) {
  if (!opts?.zorla && miniOturumSesiKoru()) return;
  const motor = acikMotor;
  acikMotor = null;
  if (motor === 'agora') {
    await AgoraKes();
    return;
  }
  await LiveKitBaglantiYoneticisi.baglantiyiKes(!!opts?.hizli);
}

/** Yerel mikrofonu aç/kapat (yayıncı token gerekir). */
export function MedyaMikrofonAyarla(acik: boolean) {
  if (acikMotor === 'agora') {
    AgoraMikrofon(acik);
    return;
  }
  LiveKitBaglantiYoneticisi.muteLocalAudio(!acik);
}

export function MedyaHoparlorAyarla(acik: boolean) {
  if (acikMotor === 'agora') {
    AgoraHoparlor(acik);
    return;
  }
  void LiveKitBaglantiYoneticisi.setSpeakerphone(acik);
}

export function MedyaKameraAyarla(acik: boolean) {
  if (acikMotor === 'agora') {
    AgoraKamera(acik);
    return;
  }
  LiveKitBaglantiYoneticisi.setLocalVideoEnabled(acik);
}

export function MedyaKameraCevir() {
  if (acikMotor === 'agora') {
    AgoraKameraCevir();
    return;
  }
  void LiveKitBaglantiYoneticisi.kameraCevir();
}

export async function MedyaKameraAcVeBekle(ms = 8000): Promise<boolean> {
  if (acikMotor === 'agora') return AgoraKameraAcVeBekle();
  return LiveKitBaglantiYoneticisi.kameraAcVeBekle(ms);
}

/**
 * Dinleyici → konuşmacı: yeni token + yeniden bağlan.
 * Mikrofon kabulünden sonra çağır — mic açık başlar.
 */
export async function MedyaKonusmaciyaYukselt(
  roomName: string,
): Promise<MedyaBaglantiSonuc> {
  return MedyaOdasiBaglan({
    roomName,
    role: 'speaker',
    zorla: true,
    micAcik: true,
  });
}

/**
 * Konuşmacı → dinleyici: yayın hakkını geri al.
 * Koltuktan düşünce / red sonrası çağır — mute yetmez, token canPublish kapatılmalı.
 */
export async function MedyaDinleyiciyeDusur(
  roomName: string,
): Promise<MedyaBaglantiSonuc> {
  return MedyaOdasiBaglan({ roomName, role: 'listener', zorla: true });
}

/**
 * Uzak ses hacmi (hoparlör) — mikrofon değil.
 * 0..1 sürekli seviye; boolean geriye uyum (true=1, false=0).
 */
export function MedyaUzakSesHacmiAyarla(hacim: number | boolean) {
  const v = typeof hacim === 'boolean' ? (hacim ? 1 : 0) : hacim;
  LiveKitBaglantiYoneticisi.setRemoteAudioVolume(v);
}

/**
 * Oyun çıkışı sonrası: expo-audio LiveKit oturumunu bozduysa yeniden aç.
 * zorla=true → tam AudioSession configure (oyun SFX sonrası şart).
 */
export function MedyaSesOturumunuYenile(zorla = false) {
  if (acikMotor === 'agora') return;
  void LiveKitBaglantiYoneticisi.sesOturumunuYenile(zorla);
}

/**
 * Navigasyon anında AudioSession + globals ısıt — connect öncesi sessizlik olmasın.
 * Bağlantı açmaz; müzik/odak profilini ses odası dinleyiciye alır.
 */
export function MedyaSesOturumuIsit(opts?: {
  asPublisher?: boolean;
}): void {
  if (RtcAktifSaglayici() === 'AGORA') return;
  // Fast Refresh: eski singleton prototipinde metot yoksa sessizce geç
  if (typeof LiveKitBaglantiYoneticisi.sesOturumuIsit !== 'function') return;
  void LiveKitBaglantiYoneticisi.sesOturumuIsit({
    sesOdasi: true,
    asPublisher: !!opts?.asPublisher,
    gorusmeModu: false,
  }).catch(() => undefined);
}

/** Ekran kapanınca iOS ses oturumunu yeniden aç — bağlantı duruyorsa ses geri gelir. */
export function MedyaMiniSesiniTut() {
  const muzigiSurdur = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { OdaMuzikDevamEttir } = require('../oda-muzik/oynatici/OdaMuzikOynatici') as {
        OdaMuzikDevamEttir: () => void;
      };
      OdaMuzikDevamEttir();
    } catch {
      /* müzik yok */
    }
  };
  const dene = () => {
    if (miniOturumSesiKoru()) {
      MedyaHoparlorAyarla(true);
      MedyaSesOturumunuYenile(true);
      setTimeout(muzigiSurdur, 500);
    }
  };
  setTimeout(dene, 200);
  setTimeout(dene, 800);
}

/** Bu oturumda mikrofon yayın hakkı var mı (host/konuşmacı ve bağlı). */
export function MedyaYayinciMi(): boolean {
  if (acikMotor === 'agora') return AgoraYayinciMi();
  return LiveKitBaglantiYoneticisi.yayinciMi();
}

/** En son bağlanması istenen oda — eski ekranın gecikmeli temizliği yenisini kesmesin. */
export function MedyaSonHedefOda(): string | null {
  return sonBaglanti?.roomName ?? null;
}

/** Aynı odaya LiveKit ile bağlı mı — yarış sonrası sahte hata bastırmak için. */
export function MedyaOdaBagliMi(roomName?: string): boolean {
  if (acikMotor === 'agora') return !!acikMotor;
  if (LiveKitBaglantiYoneticisi.durumGetir() !== 'connected') return false;
  if (roomName && LiveKitBaglantiYoneticisi.odaAdi() !== roomName) return false;
  return !!LiveKitBaglantiYoneticisi.oda();
}
