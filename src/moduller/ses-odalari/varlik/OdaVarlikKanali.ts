/**
 * Ses odası anlık varlık — Supabase Realtime Presence.
 * Odadaki her istemci kendini kanala bildirir; uygulama kapanınca veya bağlantı
 * kopunca sunucu kaydı kendiliğinden düşürür (room_members'ta kalan hayaletler görünmez).
 * Küçültülmüş oturum boyunca varlık sürer; oturum bitince ayrılır.
 */

import { AppState, type NativeEventSubscription } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import {
  AktifSesOdasiDinle,
  AktifSesOdasiDurumunuAl,
  AktifSesOdasiGuncelle,
} from '../oturum/AktifSesOdasiOturumu';

export type OdaVarlikDurum = {
  roomId: string;
  /** Şu an odaya bağlı kullanıcılar — en son gelen önce */
  userIds: string[];
  /** İlk presence snapshot'ı geldi */
  senkron: boolean;
  /** Kanal kurulamadı — çağıran üyelik listesine dönmeli */
  hata: boolean;
};

type Dinleyici = (durum: OdaVarlikDurum | null) => void;
type VarlikMeta = { user_id?: string; online_at?: string };

let kanal: RealtimeChannel | null = null;
let kanalOdaId: string | null = null;
let kanalUserId: string | null = null;
let katilmaAni = '';
let durum: OdaVarlikDurum | null = null;
/** Aktif ses oturumu bu oda için başladı mı — bitişinde varlıktan çıkılır */
let oturumGoruldu = false;
/** Aynı topic'li eski kanal tamamen kapanmadan yenisi açılamaz */
let kapanis: Promise<unknown> = Promise.resolve();
let nesil = 0;
let appStateAbonelik: NativeEventSubscription | null = null;
let oturumAbonelik: (() => void) | null = null;
const dinleyiciler = new Map<Dinleyici, string>();

function yayinla(roomId: string, deger: OdaVarlikDurum | null) {
  for (const [fn, oda] of dinleyiciler) {
    if (oda === roomId) fn(deger);
  }
}

function durumGuncelle(patch: Partial<Omit<OdaVarlikDurum, 'roomId'>>) {
  if (!kanalOdaId) return;
  durum = {
    roomId: kanalOdaId,
    userIds: durum?.userIds ?? [],
    senkron: durum?.senkron ?? false,
    hata: durum?.hata ?? false,
    ...patch,
  };
  yayinla(kanalOdaId, durum);
  oturumSayisiniEsitle();
}

/** Mini bar / PiP / Live Activity sayacı — ekran küçültülmüşken de canlı */
function oturumSayisiniEsitle() {
  if (!durum?.senkron || durum.hata) return;
  const oturum = AktifSesOdasiDurumunuAl();
  if (oturum?.roomId !== durum.roomId) return;
  if (oturum.dinleyiciSayisi === durum.userIds.length) return;
  AktifSesOdasiGuncelle({ dinleyiciSayisi: durum.userIds.length });
}

function varlikListesi(ch: RealtimeChannel): string[] {
  const state = ch.presenceState<VarlikMeta>();
  const satirlar: Array<{ id: string; an: number }> = [];
  for (const [key, metalar] of Object.entries(state)) {
    if (!key) continue;
    const anlar = metalar
      .map((m) => Date.parse(m.online_at ?? ''))
      .filter((n) => Number.isFinite(n));
    satirlar.push({ id: key, an: anlar.length > 0 ? Math.min(...anlar) : 0 });
  }
  satirlar.sort((a, b) => b.an - a.an);
  return satirlar.map((s) => s.id);
}

function kendiniBildir() {
  if (!kanal || !kanalUserId) return;
  void kanal
    .track({ user_id: kanalUserId, online_at: katilmaAni })
    .catch(() => undefined);
}

function oturumuIzle() {
  if (oturumAbonelik) return;
  oturumAbonelik = AktifSesOdasiDinle((oturum) => {
    if (!kanalOdaId) return;
    if (oturum?.roomId === kanalOdaId) {
      oturumGoruldu = true;
      oturumSayisiniEsitle();
      return;
    }
    if (oturumGoruldu) OdaVarlikAyril(kanalOdaId);
  });
}

function uygulamaDurumunuIzle() {
  if (appStateAbonelik) return;
  // Arka plandan dönüşte soket yeniden bağlanmış olabilir — kaydı tazele
  appStateAbonelik = AppState.addEventListener('change', (s) => {
    if (s === 'active') kendiniBildir();
  });
}

/** Odaya girişte çağrılır; aynı oda/kullanıcı için tekrar çağrı etkisizdir. */
export function OdaVarlikKatil(roomId: string, userId: string): void {
  if (kanalOdaId === roomId && kanalUserId === userId) return;
  if (kanalOdaId) OdaVarlikAyril(kanalOdaId);

  const benimNesil = ++nesil;
  kanalOdaId = roomId;
  kanalUserId = userId;
  katilmaAni = new Date().toISOString();
  oturumGoruldu = false;
  durum = { roomId, userIds: [], senkron: false, hata: false };
  yayinla(roomId, durum);
  oturumuIzle();
  uygulamaDurumunuIzle();

  void kapanis.then(() => {
    if (benimNesil !== nesil) return;
    const ch = supabase.channel(`oda-varlik:${roomId}`, {
      config: { presence: { key: userId } },
    });
    kanal = ch;
    try {
      ch.on('presence', { event: 'sync' }, () => {
        if (kanal !== ch) return;
        durumGuncelle({ userIds: varlikListesi(ch), senkron: true, hata: false });
      }).subscribe((status) => {
        if (kanal !== ch) return;
        if (status === 'SUBSCRIBED') {
          kendiniBildir();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          durumGuncelle({ hata: true });
        }
      });
    } catch {
      durumGuncelle({ hata: true });
    }
  });
}

/** Odadan çıkış. roomId verilirse yalnızca o oda aktifse çıkar. */
export function OdaVarlikAyril(roomId?: string): void {
  if (!kanalOdaId) return;
  if (roomId && roomId !== kanalOdaId) return;
  const eskiOda = kanalOdaId;
  const ch = kanal;
  nesil += 1;
  kanal = null;
  kanalOdaId = null;
  kanalUserId = null;
  durum = null;
  oturumGoruldu = false;
  yayinla(eskiOda, null);
  if (ch) {
    kapanis = (async () => {
      try {
        await ch.untrack();
      } catch {
        /* soket zaten kopuk */
      }
      await supabase.removeChannel(ch).catch(() => undefined);
    })();
  }
}

export function OdaVarlikDurumunuAl(roomId: string): OdaVarlikDurum | null {
  return durum?.roomId === roomId ? durum : null;
}

export function OdaVarlikDinle(roomId: string, fn: Dinleyici): () => void {
  dinleyiciler.set(fn, roomId);
  fn(OdaVarlikDurumunuAl(roomId));
  return () => {
    dinleyiciler.delete(fn);
  };
}
