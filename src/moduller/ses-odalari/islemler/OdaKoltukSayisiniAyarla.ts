import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { ODA_KOLTUK_MAX, ODA_KOLTUK_MIN } from './OdaKoltukSinirlari';

export type OdaKoltukSayisiSonuc =
  | {
      ok: true;
      maxSeats: number;
      kicked: number;
      capacityTierCode?: string | null;
    }
  | { ok: false; hata: string };

/**
 * Oda sahibi: canlı odada mikrofon/koltuk sayısını 2–20 arası değiştirir.
 * Azaltırken kapasiteyi aşan konuşmacılar (en son odaya girenler) koltuktan düşer.
 */
export async function OdaKoltukSayisiniAyarla(
  roomId: string,
  maxSeats: number,
): Promise<OdaKoltukSayisiSonuc> {
  const hedef = Math.min(
    Math.max(Math.floor(maxSeats), ODA_KOLTUK_MIN),
    ODA_KOLTUK_MAX,
  );
  const { data, error } = await supabase.rpc('oda_koltuk_sayisini_ayarla', {
    p_room_id: roomId,
    p_max_seats: hedef,
  });

  if (error) {
    const msg = error.message ?? '';
    if (/not host|Not host/i.test(msg)) {
      return { ok: false, hata: i18n.t('sesOda.sadeceHostKoltuk') };
    }
    if (/not authenticated|Not authenticated/i.test(msg)) {
      return { ok: false, hata: i18n.t('lobi.oturumGerekli') };
    }
    if (/Room not found/i.test(msg)) {
      return { ok: false, hata: i18n.t('sesOda.odaBulunamadi') };
    }
    return { ok: false, hata: msg || i18n.t('sesOda.koltukGuncellenemedi') };
  }

  const row = (data ?? {}) as {
    ok?: boolean;
    max_seats?: number;
    kicked?: number;
    capacity_tier_code?: string | null;
  };

  return {
    ok: true,
    maxSeats: Number(row.max_seats ?? hedef),
    kicked: Number(row.kicked ?? 0),
    capacityTierCode: row.capacity_tier_code ?? null,
  };
}
