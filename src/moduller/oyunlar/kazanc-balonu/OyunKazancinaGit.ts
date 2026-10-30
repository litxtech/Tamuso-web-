/**
 * Kazanç kartı: kullanıcı bir ses odasındaysa oyunu açar.
 * Değilse çağıran taraf oda listesini gösterir.
 */
import { router } from 'expo-router';
import type { Room } from '../../../types/models';
import { YeniOdaOnbellegeYaz } from '../../ses-odalari/onbellek/YeniOdaOnbellek';
import { AktifSesOdasiDurumunuAl } from '../../ses-odalari/oturum/AktifSesOdasiOturumu';

/**
 * Bağımsız oyun rotası olan oyunlar.
 *
 * Ölü oyun motorları (zeus, nox, kaskad, fair-spin, astral-falls, sis-spin, dede)
 * ve storm-king iOS binary'sinden çıkarıldı; rotaları yok. Bu kodlar artık
 * oda içi oyun akışına düşer.
 */
const SAYFA: Record<string, string> = {};

export function OyunKazancSayfasi(kod: string): string | null {
  if (!kod || kod === 'fruit_wheel') return null;
  return SAYFA[kod] ?? null;
}

export function OyunKazancAktifOdaId(): string | null {
  return AktifSesOdasiDurumunuAl()?.roomId ?? null;
}

/** Aktif ses odası varsa oyunu açar. Yoksa false — oda listesi gösterilir. */
export function OyunKazanciAc(gameCode: string): boolean {
  const kod = gameCode || 'fruit_wheel';
  const roomId = OyunKazancAktifOdaId();
  if (!roomId) return false;
  const sayfa = OyunKazancSayfasi(kod);
  if (sayfa) {
    router.push(sayfa as never);
    return true;
  }
  router.push(`/room/${roomId}?oyun=${encodeURIComponent(kod)}` as never);
  return true;
}

/** Listeden seçilen odaya girip oyunu açar. */
export function OyunKazancOdayaAc(room: Room, gameCode: string) {
  const kod = gameCode || 'fruit_wheel';
  YeniOdaOnbellegeYaz(room, []);
  router.push(`/room/${room.id}?oyun=${encodeURIComponent(kod)}` as never);
}
