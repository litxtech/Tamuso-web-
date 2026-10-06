import i18n from '../../../i18n';
/**
 * 1:1 görüşme oturumu — UI ekranından bağımsız yaşam döngüsü.
 * Minimize: sunum=minimized; LiveKit/DB bağlantısı açık kalır.
 * Bitir: GorusmeBitir + MedyaOdasiKes + oturumu temizle.
 */

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import {
  MedyaHoparlorAyarla,
  MedyaKameraAyarla,
  MedyaMikrofonAyarla,
  MedyaOdasiBaglan,
  MedyaOdasiKes,
} from '../../livekit/MedyaBaglantisi';
import { LiveKitBaglantiYoneticisi } from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';
import {
  GorusmeBenimAktifleriBitir,
  GorusmeBitir,
  GorusmeGetir,
  MesajThreadKarsiProfil,
} from '../islemler/GorusmeIslemleri';
import { GorusmeEkranKorumaBaslat } from '../guvenlik/GorusmeEkranKoruma';
import type { DirectCall, ThreadKarsiProfil } from '../tipler';

const KEEP_TAG = 'gorusme-call';

export type GorusmeSunum = 'fullscreen' | 'minimized';

export type GorusmeOturumDurum = {
  callId: string;
  call: DirectCall;
  peer: ThreadKarsiProfil | null;
  muted: boolean;
  speaker: boolean;
  cameraOn: boolean;
  baglandi: boolean;
  mock: boolean;
  durumYazi: string;
  sunum: GorusmeSunum;
  /** Bağlantı kuruluyor / kuruldu */
  hazir: boolean;
  hata: string | null;
  /** Tahmini kalan konuşma (sn) — heartbeat + lokal tick */
  billingRemainingSec: number | null;
  freeSecondsRemaining: number | null;
  billingLowBalance: boolean;
  /** Son 1 dk’da coin paket sheet bir kez açılsın */
  coinPaketAc: boolean;
};

type Dinleyici = (d: GorusmeOturumDurum | null) => void;

let durum: GorusmeOturumDurum | null = null;
const dinleyiciler = new Set<Dinleyici>();
let kanal: RealtimeChannel | null = null;
let ringTimer: ReturnType<typeof setTimeout> | undefined;
let billingTimer: ReturnType<typeof setInterval> | undefined;
let billingTickTimer: ReturnType<typeof setInterval> | undefined;
let korumaStop: (() => void) | undefined;
let baslatmaSayaci = 0;
let coinPaketAcildi = false;

function yayinla() {
  dinleyiciler.forEach((fn) => fn(durum));
}

function patch(p: Partial<GorusmeOturumDurum>) {
  if (!durum) return;
  durum = { ...durum, ...p };
  yayinla();
}

export function GorusmeOturumAl(): GorusmeOturumDurum | null {
  return durum;
}

export function GorusmeOturumDinle(fn: Dinleyici): () => void {
  dinleyiciler.add(fn);
  fn(durum);
  return () => {
    dinleyiciler.delete(fn);
  };
}

function kanalTemizle() {
  if (ringTimer) {
    clearTimeout(ringTimer);
    ringTimer = undefined;
  }
  if (billingTimer) {
    clearInterval(billingTimer);
    billingTimer = undefined;
  }
  if (billingTickTimer) {
    clearInterval(billingTickTimer);
    billingTickTimer = undefined;
  }
  korumaStop?.();
  korumaStop = undefined;
  if (kanal) {
    void supabase.removeChannel(kanal);
    kanal = null;
  }
}

function billingTickBaslat() {
  if (billingTickTimer) {
    clearInterval(billingTickTimer);
    billingTickTimer = undefined;
  }
  billingTickTimer = setInterval(() => {
    if (!durum?.billingLowBalance) return;
    if (durum.billingRemainingSec == null) return;
    const next = Math.max(0, durum.billingRemainingSec - 1);
    patch({ billingRemainingSec: next });
  }, 1000);
}

function billingHeartbeatBaslat(callId: string) {
  if (billingTimer) {
    clearInterval(billingTimer);
    billingTimer = undefined;
  }
  billingTickBaslat();

  const calistir = () => {
    void (async () => {
      try {
        const { KisilerBillingHeartbeat } = await import(
          '../../kisiler-kesif/islemler/KisilerKesifIslemleri'
        );
        const r = await KisilerBillingHeartbeat(callId);
        if (r.ended || !r.continue) {
          await GorusmeOturumTamamenBitir({ reason: 'insufficient_balance' });
          return;
        }
        const remaining =
          r.estimated_remaining_sec == null
            ? null
            : Math.max(0, Math.floor(r.estimated_remaining_sec));
        const low = !!r.low_balance || (remaining != null && remaining <= 60);
        const acPaket = low && !coinPaketAcildi;
        if (acPaket) coinPaketAcildi = true;
        patch({
          billingRemainingSec: remaining,
          freeSecondsRemaining:
            r.free_seconds_remaining == null
              ? null
              : Math.max(0, Math.floor(r.free_seconds_remaining)),
          billingLowBalance: low,
          coinPaketAc: acPaket ? true : durum?.coinPaketAc ?? false,
          durumYazi: low
            ? i18n.t('gorusme.coinAzaliyor')
            : durum?.baglandi
              ? i18n.t('gorusme.baglandi')
              : durum?.durumYazi ?? i18n.t('gorusme.baglaniyor'),
        });
      } catch {
        /* billing heartbeat opsiyonel */
      }
    })();
  };

  calistir();
  billingTimer = setInterval(calistir, 20_000);
}

/** UI coin paketini kapattı — arama devam eder */
export function GorusmeOturumCoinPaketKapat() {
  patch({ coinPaketAc: false });
}

async function keepAc() {
  try {
    await activateKeepAwakeAsync(KEEP_TAG);
  } catch {
    /* ignore */
  }
}

function keepKapat() {
  void deactivateKeepAwake(KEEP_TAG);
}

/**
 * Tam temizlik — bağlantı + DB bitiş (isteğe bağlı) + state.
 * `dbBitir` false: karşı taraf zaten bitirdi / unmount ghost değil.
 */
export async function GorusmeOturumTamamenBitir(opts?: {
  reason?: string;
  dbBitir?: boolean;
}): Promise<void> {
  const callId = durum?.callId;
  const reason = opts?.reason ?? 'hangup';
  const dbBitir = opts?.dbBitir !== false;
  kanalTemizle();
  baslatmaSayaci += 1;
  coinPaketAcildi = false;
  durum = null;
  yayinla();
  keepKapat();
  if (dbBitir && callId) {
    try {
      await GorusmeBitir(callId, reason);
    } catch {
      /* DB fail olsa bile medyayı kes */
    }
  }
  if (callId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GorusmeActivityBitir } = require('../../tamuso-activity/entegrasyon/GorusmeActivityBagla') as {
        GorusmeActivityBitir: (
          id: string,
          reason?: 'ended' | 'missed' | 'failed' | 'declined',
        ) => Promise<void>;
      };
      const mapped =
        reason === 'ring_timeout'
          ? 'missed'
          : reason === 'start_error'
            ? 'failed'
            : 'ended';
      void GorusmeActivityBitir(callId, mapped);
    } catch {
      /* ignore */
    }
  }
  await MedyaOdasiKes();
}

export function GorusmeOturumSunumAyarla(sunum: GorusmeSunum): void {
  if (!durum) return;
  // Minimize yalnızca aktif bağlantıda
  if (sunum === 'minimized' && !durum.baglandi) return;
  patch({ sunum });
}

export function GorusmeOturumMuteAyarla(muted: boolean): void {
  if (!durum) return;
  patch({ muted });
  MedyaMikrofonAyarla(!muted);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TamusoCallKitSetMuted } = require('../../tamuso-activity/callkit/TamusoCallKitBridge') as {
      TamusoCallKitSetMuted: (id: string, muted: boolean) => void;
    };
    TamusoCallKitSetMuted(durum.callId, muted);
  } catch {
    /* ignore */
  }
}

export function GorusmeOturumSpeakerAyarla(speaker: boolean): void {
  if (!durum) return;
  patch({ speaker });
  MedyaHoparlorAyarla(speaker);
}

export function GorusmeOturumKameraAyarla(cameraOn: boolean): void {
  if (!durum) return;
  patch({ cameraOn });
  if (durum.call.call_type === 'video') {
    MedyaKameraAyarla(cameraOn);
  }
}

function realtimeKur(callId: string) {
  kanalTemizle();
  kanal = supabase
    .channel(`gorusme-oturum-${callId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        filter: `id=eq.${callId}`,
        table: 'direct_calls',
      },
      (payload) => {
        const next = payload.new as DirectCall;
        if (!durum || durum.callId !== callId) return;
        patch({ call: next });
        if (next.status === 'active') {
          if (ringTimer) {
            clearTimeout(ringTimer);
            ringTimer = undefined;
          }
          patch({ baglandi: true, durumYazi: i18n.t('gorusme.baglandi') });
          if (next.call_type === 'video') {
            MedyaKameraAyarla(true);
          }
          MedyaMikrofonAyarla(!GorusmeOturumAl()?.muted);
          if (next.is_paid) {
            billingHeartbeatBaslat(callId);
          }
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { GorusmeActivityBaglandi } = require('../../tamuso-activity/entegrasyon/GorusmeActivityBagla') as {
              GorusmeActivityBaglandi: (i: {
                callId: string;
                peerName: string;
                video: boolean;
              }) => Promise<void>;
            };
            const peer = GorusmeOturumAl()?.peer;
            void GorusmeActivityBaglandi({
              callId,
              peerName:
                peer?.display_name?.trim() ||
                peer?.username?.trim() ||
                i18n.t('gorusme.arayan'),
              video: next.call_type === 'video',
            });
          } catch {
            /* ignore */
          }
        }
        if (['ended', 'rejected', 'missed', 'cancelled'].includes(next.status)) {
          void GorusmeOturumTamamenBitir({
            reason: next.end_reason ?? 'remote_end',
            dbBitir: false,
          });
        }
      },
    )
    .subscribe();
}

/**
 * Ekran mount — mevcut oturum varsa yeniden bağlanma; yoksa kur.
 * Aynı callId için ikinci mount = fullscreen geri dönüş.
 */
export async function GorusmeOturumEkranAc(input: {
  callId: string;
  userId: string | undefined;
}): Promise<'reuse' | 'started' | 'ended' | 'error'> {
  const { callId, userId } = input;

  GorusmeOturumEkranKapandiIptal();

  if (durum?.callId === callId) {
    patch({ sunum: 'fullscreen' });
    return 'reuse';
  }

  // Farklı görüşme açıkken yenisini başlatma — eskisini kapat
  if (durum && durum.callId !== callId) {
    await GorusmeOturumTamamenBitir({ reason: 'replaced' });
  }

  const ticket = ++baslatmaSayaci;
  kanalTemizle();
  await keepAc();

  try {
    void (async () => {
      try {
        await supabase.rpc('gorusme_stale_temizle');
      } catch {
        /* RPC yoksa sorun değil */
      }
    })();

    const c = await GorusmeGetir(callId);
    if (ticket !== baslatmaSayaci) return 'error';

    if (['ended', 'rejected', 'missed', 'cancelled'].includes(c.status)) {
      keepKapat();
      return 'ended';
    }

    const isVideo = c.call_type === 'video';
    const benArayan = c.caller_id === userId;

    durum = {
      callId,
      call: c,
      peer: null,
      muted: false,
      speaker: isVideo,
      cameraOn: isVideo,
      baglandi: c.status === 'active',
      mock: false,
      durumYazi:
        c.status === 'ringing'
          ? benArayan
            ? i18n.t('gorusme.caliyor')
            : i18n.t('gorusme.baglaniyor')
          : c.status === 'active'
            ? i18n.t('gorusme.baglandi')
            : i18n.t('gorusme.baglaniyor'),
      sunum: 'fullscreen',
      hazir: false,
      hata: null,
      billingRemainingSec: null,
      freeSecondsRemaining: null,
      billingLowBalance: false,
      coinPaketAc: false,
    };
    coinPaketAcildi = false;
    yayinla();
    realtimeKur(callId);

    if (c.status === 'ringing' && benArayan) {
      ringTimer = setTimeout(() => {
        void GorusmeOturumTamamenBitir({ reason: 'ring_timeout' });
      }, 55_000);
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { TamusoCallKitStartOutgoing } = require('../../tamuso-activity/callkit/TamusoCallKitBridge') as {
          TamusoCallKitStartOutgoing: (i: {
            callId: string;
            calleeName: string;
            hasVideo: boolean;
          }) => Promise<boolean>;
        };
        void TamusoCallKitStartOutgoing({
          callId,
          calleeName: i18n.t('gorusme.arayan'),
          hasVideo: isVideo,
        });
      } catch {
        /* CallKit yok */
      }
    }

    if (isVideo) {
      await new Promise((r) => setTimeout(r, 120));
    }
    if (ticket !== baslatmaSayaci) return 'error';

    const [, medya] = await Promise.all([
      MesajThreadKarsiProfil(c.thread_id).then((p) => {
        if (ticket === baslatmaSayaci && durum?.callId === callId) {
          patch({ peer: p });
        }
      }),
      MedyaOdasiBaglan({
        roomName: c.channel_name,
        role: 'host',
        video: isVideo,
        gorusmeModu: true,
      }),
    ]);

    if (ticket !== baslatmaSayaci || !durum || durum.callId !== callId) {
      return 'error';
    }

    if (!medya.ok) {
      patch({ hata: medya.hata ?? i18n.t('gorusme.baglanilamadi'), durumYazi: medya.hata ?? i18n.t('ortak.hata') });
      return 'error';
    }

    if (medya.mock) {
      patch({
        mock: true,
        hazir: true,
        durumYazi: i18n.t('gorusme.demoSesYok'),
      });
      return 'started';
    }

    MedyaHoparlorAyarla(isVideo);
    MedyaMikrofonAyarla(true);
    if (isVideo) {
      MedyaKameraAyarla(true);
    }

    if (c.status === 'active' || durum.baglandi) {
      patch({ baglandi: true, durumYazi: i18n.t('gorusme.baglandi'), hazir: true, mock: false });
      if (c.is_paid) billingHeartbeatBaslat(callId);
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GorusmeActivityBaglandi } = require('../../tamuso-activity/entegrasyon/GorusmeActivityBagla') as {
          GorusmeActivityBaglandi: (i: {
            callId: string;
            peerName: string;
            video: boolean;
            isCaller?: boolean;
          }) => Promise<void>;
        };
        void GorusmeActivityBaglandi({
          callId,
          peerName:
            durum.peer?.display_name?.trim() ||
            durum.peer?.username?.trim() ||
            i18n.t('gorusme.arayan'),
          video: isVideo,
          isCaller: benArayan,
        });
      } catch {
        /* CallKit / Live Activity yok */
      }
    } else {
      patch({ hazir: true, mock: false });
    }

    korumaStop = await GorusmeEkranKorumaBaslat(c.id);
    return 'started';
  } catch (e) {
    if (ticket === baslatmaSayaci) {
      const msg = e instanceof Error ? e.message : i18n.t('gorusme.acilamadi');
      patch({ hata: msg, durumYazi: msg });
      await GorusmeOturumTamamenBitir({ reason: 'start_error', dbBitir: true });
    }
    return 'error';
  }
}

/**
 * Ekran unmount:
 * - minimized → dokunma
 * - baglandi → otomatik minimize
 * - ringing → kısa gecikme (Strict Mode remount iptal eder), sonra bitir
 */
let kapandiZamanlayici: ReturnType<typeof setTimeout> | null = null;
let kapandiNesil = 0;

export function GorusmeOturumEkranKapandiIptal(): void {
  kapandiNesil += 1;
  if (kapandiZamanlayici) {
    clearTimeout(kapandiZamanlayici);
    kapandiZamanlayici = null;
  }
}

export function GorusmeOturumEkranKapandi(callId: string): void {
  if (!durum || durum.callId !== callId) return;
  if (durum.sunum === 'minimized') return;
  if (durum.baglandi) {
    patch({ sunum: 'minimized' });
    return;
  }

  const nesil = ++kapandiNesil;
  if (kapandiZamanlayici) clearTimeout(kapandiZamanlayici);
  kapandiZamanlayici = setTimeout(() => {
    kapandiZamanlayici = null;
    if (nesil !== kapandiNesil) return;
    if (!durum || durum.callId !== callId) return;
    if (durum.sunum === 'minimized' || durum.baglandi) return;
    void GorusmeOturumTamamenBitir({ reason: 'client_unmount' });
  }, 450);
}

/**
 * JS process ilk açılış (uygulama tamamen kapatılıp açılınca).
 * Background→foreground'da ÇALIŞMAZ — flag process ömrü boyunca kalır.
 * Takılı DB ringing/active + yerel session + LiveKit temizlenir.
 */
let acilisTemizligiYapildi = false;

export async function GorusmeUygulamaAcilisTemizligi(): Promise<void> {
  if (acilisTemizligiYapildi) return;
  acilisTemizligiYapildi = true;

  // Yerel ghost (HMR / kill sonrasi bellek)
  if (durum) {
    kanalTemizle();
    baslatmaSayaci += 1;
    durum = null;
    yayinla();
    keepKapat();
  }

  try {
    // Yalnızca birkaç saniyeden eski kayıtlar — yeni arama yarışını ezme
    await supabase.rpc('gorusme_stale_temizle');
    await GorusmeBenimAktifleriBitir('app_closed');
  } catch {
    /* ignore */
  }
  // Yeni arama başladıysa LiveKit'i kesme
  if (durum) return;
  try {
    await MedyaOdasiKes();
  } catch {
    /* ignore */
  }
}
