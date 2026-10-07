/**
 * Canlı yayın başlatma state machine — tek aktif operasyon, retry, timed stages.
 * UI countdown ile bağlantı hazırlığını paralel yürütür; "CANLI" yalnız gerçek publish sonrası.
 */

import i18n from '../../../i18n';
import {
  AktifRtcSaglayici,
  MedyaKameraAcVeBekle,
  MedyaOdasiBaglan,
  MedyaOdasiKes,
} from '../../livekit/MedyaBaglantisi';
import { LiveKitBaglantiYoneticisi } from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';
import { MedyaIzinleriniIste } from '../../livekit/izin/MedyaIzinleriniIste';
import {
  CanliYayinBaslat,
  CanliYayinBitir,
  CanliYayinAktifEt,
} from './CanliYayinIslemleri';

export type CanliBaslatDurum =
  | 'idle'
  | 'preparing'
  | 'countdown'
  | 'connecting'
  | 'publishing'
  | 'live'
  | 'failed';

export type CanliBaslatAsama =
  | 'permissions'
  | 'token'
  | 'room_connect'
  | 'publish'
  | 'server_active'
  | 'completed';

export type CanliBaslatMetrik = {
  button_to_countdown_ms: number;
  token_request_ms: number;
  livekit_connect_ms: number;
  total_start_ms: number;
};

export type CanliBaslatSonuc =
  | {
      ok: true;
      session: { id: string; livekit_room_name?: string };
      mock: boolean;
      metrik: CanliBaslatMetrik;
    }
  | { ok: false; hata: string; stage?: CanliBaslatAsama; metrik?: Partial<CanliBaslatMetrik> };

type ProgressCb = (p: {
  durum: CanliBaslatDurum;
  countdown?: number;
  asama?: CanliBaslatAsama;
  mesaj?: string;
}) => void;

const TOKEN_TIMEOUT_MS = 12_000;
const CONNECT_TIMEOUT_MS = 18_000;
const MAX_RETRY = 3;

let kilit = false;
let baslatNesli = 0;

/** Uygulama arka plana geçince süren açılışı iptal eder. */
export function CanliYayinBaslatIptalEt() {
  baslatNesli += 1;
}

function log(msg: string, extra?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[LIVE_START] ${msg}`, extra ?? '');
  }
}

function logErr(
  stage: string,
  err: unknown,
  extra?: Record<string, unknown>,
) {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[LIVE_START_ERROR]`, { stage, message, ...extra });
}

async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) => {
        timer = setTimeout(
          () => rej(new Error(`${label} timeout (${ms}ms)`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Stüdyo açılışında güvenli ön ısıtma — room oluşturmaz, Alert yok */
export async function CanliYayinOnHazirlik(video: boolean): Promise<void> {
  try {
    await MedyaIzinleriniIste({
      mikrofon: true,
      kamera: video,
      amac: 'yayin',
      ayarlarDiyalog: false,
    });
    log('permissions_prewarm');
  } catch (e) {
    logErr('permissions_prewarm', e);
  }
}

export function CanliBaslatKilitliMi(): boolean {
  return kilit;
}

/**
 * Başlat: countdown UI (onProgress) + arka planda connect.
 * Server session yalnız LiveKit bağlandıktan sonra keşfete düşmüş kabul edilir;
 * connect fail → session bitirilir.
 */
export async function CanliYayinBaslatMotoru(input: {
  title: string;
  videoEnabled: boolean;
  onProgress?: ProgressCb;
  /** Geri sayım saniye (3,2,1) — bağlantı paralel */
  countdownSn?: number;
}): Promise<CanliBaslatSonuc> {
  if (kilit) {
    return { ok: false, hata: i18n.t('canliYayin.zatenBaslatiliyor') };
  }
  kilit = true;
  const nesil = baslatNesli;
  const iptalEdildi = () => nesil !== baslatNesli;
  const t0 = Date.now();
  const metrik: Partial<CanliBaslatMetrik> = {};
  const countdownSn = input.countdownSn ?? 3;
  let sessionId: string | null = null;

  const progress = (p: Parameters<ProgressCb>[0]) => {
    try {
      input.onProgress?.(p);
    } catch {
      /* UI */
    }
  };

  try {
    progress({ durum: 'preparing', asama: 'permissions', mesaj: i18n.t('canliYayin.hazirlaniyor') });
    log('permissions_ready');

    // İzin ve eski oda aynı anda. Kamera önizlemesi hâlâ açıkken bırakmayı bekleme.
    const izinP = MedyaIzinleriniIste({
      mikrofon: true,
      kamera: input.videoEnabled,
      amac: 'yayin',
    });
    const kesP = MedyaOdasiKes({ hizli: true }).catch(() => undefined);

    const [izin] = await Promise.all([izinP, kesP]);
    if (!izin.ok) {
      progress({ durum: 'failed', mesaj: izin.hata });
      return {
        ok: false,
        hata: izin.hata ?? i18n.t('canliYayin.kameraMikrofonIzni'),
        stage: 'permissions',
        metrik,
      };
    }

    metrik.button_to_countdown_ms = Date.now() - t0;
    progress({ durum: 'countdown', countdown: countdownSn });
    // Geri sayım stüdyo CameraView'i kapatır; yakalama bu sırada başlar.
    if (input.videoEnabled && AktifRtcSaglayici() !== 'agora') {
      LiveKitBaglantiYoneticisi.kameraOncedenAc();
    }

    // Server session + LiveKit paralel (countdown süresinde)
    const tToken = Date.now();
    log('token_request_started');

    const baslatPromise = (async () => {
      const sonuc = await CanliYayinBaslat({
        title: input.title,
        mode: 'solo',
      });
      if (!sonuc.ok) throw new Error(sonuc.hata);
      sessionId = sonuc.session.id;
      log('session_created_pending', { sessionId });
      return sonuc.session;
    })();

    // Countdown 3→2→1 (CANLI yalnız gerçek connect sonrası)
    const countdownPromise = (async () => {
      for (let n = countdownSn; n >= 1; n--) {
        progress({ durum: 'countdown', countdown: n });
        await sleep(380);
      }
    })();

    let session: { id: string; livekit_room_name?: string };
    try {
      session = await withTimeout(baslatPromise, TOKEN_TIMEOUT_MS, 'session');
    } catch (e) {
      logErr('server_active', e);
      progress({ durum: 'failed', asama: 'server_active' });
      return {
        ok: false,
        hata: e instanceof Error ? e.message : i18n.t('canliYayin.yayinOlusturulamadi'),
        stage: 'server_active',
        metrik,
      };
    }

    metrik.token_request_ms = Date.now() - tToken;
    log('token_received', { ms: metrik.token_request_ms });

    progress({
      durum: 'connecting',
      asama: 'room_connect',
      mesaj: i18n.t('canliYayin.baglaniyor'),
    });

    const roomName = session.livekit_room_name ?? `live_${session.id}`;
    const tConnect = Date.now();
    log('room_connect_started', { roomName });

    let medya: Awaited<ReturnType<typeof MedyaOdasiBaglan>> | null = null;
    let lastErr = i18n.t('canliYayin.baglantiKurulamadi');

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
      try {
        progress({
          durum: 'connecting',
          asama: 'room_connect',
          mesaj:
            attempt === 1
              ? i18n.t('canliYayin.baglaniyor')
              : i18n.t('canliYayin.baglantiRetry', { attempt, max: MAX_RETRY }),
        });
        if (attempt > 1) {
          await MedyaOdasiKes({ hizli: true }).catch(() => undefined);
        }
        medya = await withTimeout(
          MedyaOdasiBaglan({
            roomName,
            role: 'host',
            video: input.videoEnabled,
            zorla: attempt > 1,
          }),
          CONNECT_TIMEOUT_MS,
          'livekit_connect',
        );
        if (medya.ok) break;
        lastErr = medya.hata;
        logErr('room_connect', medya.hata, { attempt });
      } catch (e) {
        lastErr = e instanceof Error ? e.message : i18n.t('canliYayin.baglantiHatasi');
        logErr('room_connect', e, { attempt });
      }
      if (attempt < MAX_RETRY) {
        const wait =
          400 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
        await sleep(wait);
      }
    }

    await countdownPromise.catch(() => undefined);
    metrik.livekit_connect_ms = Date.now() - tConnect;

    if (!medya?.ok) {
      progress({ durum: 'failed', asama: 'room_connect', mesaj: lastErr });
      await CanliYayinBitir(session.id).catch(() => undefined);
      await MedyaOdasiKes().catch(() => undefined);
      sessionId = null;
      return {
        ok: false,
        hata: lastErr,
        stage: 'room_connect',
        metrik,
      };
    }

    progress({
      durum: 'publishing',
      asama: 'publish',
      mesaj: i18n.t('canliYayin.yayinAciliyor'),
    });

    // Bağlanırken kamera zaten yayınlandıysa ikinci kez bekleme.
    if (input.videoEnabled && AktifRtcSaglayici() === 'agora') {
      await MedyaKameraAcVeBekle(8_000);
    } else if (input.videoEnabled && !LiveKitBaglantiYoneticisi.localVideoTrack()) {
      const camOk = await LiveKitBaglantiYoneticisi.kameraAcVeBekle(2_500);
      if (!camOk) {
        log('camera_pending_background_retry');
        LiveKitBaglantiYoneticisi.kameraArkaPlandaDene(4);
      } else {
        log('camera_published');
      }
    } else if (input.videoEnabled) {
      log('camera_published');
    }
    log('microphone_published');

    if (iptalEdildi()) {
      await CanliYayinBitir(session.id).catch(() => undefined);
      await MedyaOdasiKes({ hizli: true }).catch(() => undefined);
      sessionId = null;
      return {
        ok: false as const,
        hata: i18n.t('canliYayin.yayinBitti'),
        stage: 'completed' as const,
        metrik,
      };
    }

    const aktif = await CanliYayinAktifEt(session.id);
    if (iptalEdildi()) {
      await CanliYayinBitir(session.id).catch(() => undefined);
      await MedyaOdasiKes({ hizli: true }).catch(() => undefined);
      sessionId = null;
      return {
        ok: false as const,
        hata: i18n.t('canliYayin.yayinBitti'),
        stage: 'server_active' as const,
        metrik,
      };
    }
    if (!aktif.ok) {
      logErr('server_live_status_active', aktif.hata);
      progress({ durum: 'failed', asama: 'server_active', mesaj: aktif.hata });
      await CanliYayinBitir(session.id).catch(() => undefined);
      await MedyaOdasiKes().catch(() => undefined);
      sessionId = null;
      return {
        ok: false,
        hata: aktif.hata,
        stage: 'server_active',
        metrik,
      };
    }
    log('server_live_status_active', { sessionId: session.id });

    metrik.total_start_ms = Date.now() - t0;
    log('completed', metrik);
    progress({
      durum: 'live',
      asama: 'completed',
      countdown: 0,
      mesaj: 'CANLI',
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { CanliYayinActivityBaslat } = require('../../tamuso-activity/entegrasyon/CanliYayinActivityBagla') as {
        CanliYayinActivityBaslat: (i: {
          liveId: string;
          hostName: string;
          viewerCount?: number;
        }) => Promise<void>;
      };
      void CanliYayinActivityBaslat({
        liveId: session.id,
        hostName: input.title?.trim() || 'Tamuso',
        viewerCount: 0,
      });
    } catch {
      /* Live Activity yok */
    }

    return {
      ok: true,
      session,
      mock: !!medya.mock,
      metrik: metrik as CanliBaslatMetrik,
    };
  } catch (e) {
    logErr('unexpected', e);
    if (sessionId) {
      await CanliYayinBitir(sessionId).catch(() => undefined);
    }
    await MedyaOdasiKes().catch(() => undefined);
    progress({
      durum: 'failed',
      mesaj: e instanceof Error ? e.message : i18n.t('canliYayin.baslatilamadi'),
    });
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('canliYayin.baslatilamadi'),
      metrik,
    };
  } finally {
    kilit = false;
  }
}
