import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { LiveKitTokenAl, LiveKitTokenOncedenAl } from '../../livekit/token/LiveKitTokenAl';
import { LiveKitBaglantiYoneticisi } from '../../livekit/baglanti/LiveKitBaglantiYoneticisi';
import { CanliOlcumBaslat } from '../olcum/CanliIzlemeOlcum';
import {
  AktifRtcSaglayici,
  MedyaOdaBagliMi,
  MedyaOdasiBaglan,
  type MedyaBaglantiSonuc,
} from '../../livekit/MedyaBaglantisi';
import {
  AktifCanliYayinBitir,
  AktifCanliYayinDurumunuAl,
} from '../oturum/AktifCanliYayinOturumu';
import { CanliYayinIzleyiciCik } from '../islemler/CanliYayinIslemleri';

/** Kart verisinden ekran açılır açılmaz gösterilecek özet */
export type CanliYayinOnizleme = {
  id: string;
  host_id?: string | null;
  title?: string | null;
  hostAd?: string | null;
  hostAvatar?: string | null;
  viewer_count?: number | null;
};

type OturumSatiriSonuc = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

const ONIZLEME_TTL_MS = 60_000;
const SATIR_TTL_MS = 12_000;
const ON_BAGLANTI_TTL_MS = 10_000;

const onizlemeler = new Map<string, { veri: CanliYayinOnizleme; zaman: number }>();
const satirlar = new Map<string, { istek: Promise<OturumSatiriSonuc>; zaman: number }>();
let onBaglanti: {
  sessionId: string;
  istek: Promise<MedyaBaglantiSonuc>;
  zaman: number;
} | null = null;

/**
 * `canli_yayin_baslat` oda adını tiresiz `live_<id>` üretir.
 * 2026-10-25 öncesi yayınlar rastgele ad taşır — kesin ad `livekit_room_name`.
 */
export function CanliOdaAdi(sessionId: string): string {
  return `live_${sessionId.replace(/-/g, '')}`;
}

function satirGetir(sessionId: string): Promise<OturumSatiriSonuc> {
  return Promise.resolve(
    supabase
      .from('live_sessions')
      .select(
        '*, host:profiles!live_sessions_host_id_fkey(display_name, username, avatar_url)',
      )
      .eq('id', sessionId)
      .maybeSingle(),
  ).then(
    ({ data, error }) => ({
      data: (data as Record<string, unknown> | null) ?? null,
      error: error ? { message: error.message } : null,
    }),
    (e: unknown) => ({
      data: null,
      error: { message: e instanceof Error ? e.message : String(e) },
    }),
  );
}

/**
 * Yayın satırı — kart dokunuşunda başlamış istek tazeyse onu kullanır.
 * Bir kez tüketilir; sonraki yükleme taze okur.
 */
export function CanliOturumSatiriAl(sessionId: string): Promise<OturumSatiriSonuc> {
  const kayit = satirlar.get(sessionId);
  satirlar.delete(sessionId);
  if (kayit && Date.now() - kayit.zaman < SATIR_TTL_MS) return kayit.istek;
  return satirGetir(sessionId);
}

export function CanliOnizlemeAl(sessionId: string | undefined): CanliYayinOnizleme | null {
  if (!sessionId) return null;
  const kayit = onizlemeler.get(sessionId);
  if (!kayit) return null;
  if (Date.now() - kayit.zaman > ONIZLEME_TTL_MS) {
    onizlemeler.delete(sessionId);
    return null;
  }
  return kayit.veri;
}

/**
 * Kart dokunuşunda başlamış izleyici bağlantısı (bir kez tüketilir).
 * Bağlantı bu arada kesildiyse aynı odaya yeniden bağlanır.
 */
export function CanliOnBaglantiAl(sessionId: string): Promise<MedyaBaglantiSonuc> | null {
  const kayit = onBaglanti;
  onBaglanti = null;
  if (!kayit || kayit.sessionId !== sessionId) return null;
  if (Date.now() - kayit.zaman > ON_BAGLANTI_TTL_MS) return null;
  const oda = CanliOdaAdi(sessionId);
  return kayit.istek.then((sonuc) =>
    sonuc.ok && MedyaOdaBagliMi(oda)
      ? sonuc
      : MedyaOdasiBaglan({ roomName: oda, role: 'listener', video: true }),
  );
}

/**
 * Küçültülmüş başka bir yayını izliyorsa onu bitir — yeni yayına geçerken
 * eski izleyici kaydı açık kalmasın. Yayıncı oturumuna dokunmaz.
 * @returns false: kullanıcı yayıncı (yeni bağlantı açılmamalı)
 */
export function CanliOncekiIzlemeyiBitir(sessionId: string): boolean {
  const aktif = AktifCanliYayinDurumunuAl();
  if (!aktif || aktif.sessionId === sessionId) return true;
  if (aktif.rol === 'host') return false;
  void CanliYayinIzleyiciCik(aktif.sessionId).catch(() => undefined);
  AktifCanliYayinBitir();
  return true;
}

/** Ekran açılmadan token + yayın satırını ısıt (izleyici yolu). */
export function CanliYayinOnIsit(sessionId: string, onizleme?: Omit<CanliYayinOnizleme, 'id'>) {
  if (!sessionId) return;
  if (onizleme) {
    onizlemeler.set(sessionId, { veri: { id: sessionId, ...onizleme }, zaman: Date.now() });
  }
  const mevcut = satirlar.get(sessionId);
  if (!mevcut || Date.now() - mevcut.zaman >= SATIR_TTL_MS) {
    satirlar.set(sessionId, { istek: satirGetir(sessionId), zaman: Date.now() });
  }
  if (AktifRtcSaglayici() === 'livekit') {
    LiveKitTokenOncedenAl({ roomName: CanliOdaAdi(sessionId), role: 'listener' });
  }
}

/**
 * Liste görünürken ilk yayınların token'larını ısıt — dokununca bekleme yok.
 * İlk yayının token'ıyla LiveKit bağlantısı hazırlanır (bölge + DNS/TLS);
 * hiçbir odaya katılınmaz, medya açılmaz.
 */
export function CanliYayinListesiniIsit(sessionIds: readonly string[], adet = 4) {
  if (AktifRtcSaglayici() !== 'livekit') return;
  const ilkler = sessionIds.filter(Boolean).slice(0, adet);
  for (const sessionId of ilkler) {
    LiveKitTokenOncedenAl({ roomName: CanliOdaAdi(sessionId), role: 'listener' });
  }
  const ilk = ilkler[0];
  if (!ilk) return;
  void LiveKitTokenAl({ roomName: CanliOdaAdi(ilk), role: 'listener' }).then((t) => {
    if (t.ok && !t.mock) LiveKitBaglantiYoneticisi.izleyiciBaglantisiniHazirla(t.url, t.token);
  });
}

/**
 * İzleyici bağlantısını navigasyon animasyonu sırasında başlat.
 * Ekran açıldığında oda çoğunlukla bağlı, video akmaya başlamış olur.
 */
function izleyiciOnBaglan(sessionId: string) {
  const aktif = AktifCanliYayinDurumunuAl();
  if (aktif?.sessionId === sessionId) return;
  if (aktif?.rol === 'host') return;
  if (!CanliOncekiIzlemeyiBitir(sessionId)) return;
  onBaglanti = {
    sessionId,
    istek: MedyaOdasiBaglan({
      roomName: CanliOdaAdi(sessionId),
      role: 'listener',
      video: true,
    }),
    zaman: Date.now(),
  };
}

/**
 * Yayına git. `benimId` verilirse ve yayın kullanıcının kendisininse
 * izleyici ön bağlantısı açılmaz (ekran yayıncı olarak bağlanır).
 */
export function CanliYayinaGit(
  sessionId: string,
  onizleme?: Omit<CanliYayinOnizleme, 'id'>,
  benimId?: string | null,
) {
  CanliOlcumBaslat(CanliOdaAdi(sessionId), { zorla: true });
  CanliYayinOnIsit(sessionId, onizleme);
  if (!(benimId && onizleme?.host_id && onizleme.host_id === benimId)) {
    izleyiciOnBaglan(sessionId);
  }
  router.push(`/canli/${sessionId}` as never);
}
