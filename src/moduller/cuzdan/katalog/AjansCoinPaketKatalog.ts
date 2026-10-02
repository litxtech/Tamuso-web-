/**
 * Yetkili ajans üzerinden yükleme paketleri.
 * Kaynak: agency_coin_packages (şablon admin; ajans kopyası ajansım).
 * Fallback: sabit liste.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { AktifSayiLocale, DilNormalizeEt } from '../../../i18n/diller';
import { COIN_TRY_ORANI, TabanCoinHesapla } from './CoinPaketHesap';

export const AJANS_COIN_INDIRIM_YUZDE = 20;

/** Fallback liste fiyatları — DB yoksa / hata */
export const AJANS_COIN_LISTE_FIYATLARI: readonly number[] = [
  99, 249, 499, 999, 2_499, 4_999, 9_999, 24_999, 49_999, 99_999, 199_999,
  300_000,
] as const;

export type AjansCoinPaket = {
  id: string;
  packageKey?: string;
  title: string;
  /** Katalog / liste fiyatı */
  listeFiyatTry: number;
  /** Kullanıcının ödeyeceği tutar (indirimli) */
  odenecekTry: number;
  coins: number;
  indirimYuzde: number;
};

function paketBaslik(fiyat: number): string {
  if (fiyat <= 99) return i18n.t('cuzdan.ajansPaketBaslangic');
  if (fiyat <= 499) return i18n.t('cuzdan.ajansPaketStandart');
  if (fiyat <= 2_499) return i18n.t('cuzdan.ajansPaketPopuler');
  if (fiyat <= 9_999) return i18n.t('cuzdan.ajansPaketPrestij');
  if (fiyat <= 49_999) return i18n.t('cuzdan.ajansPaketVip');
  if (fiyat <= 99_999) return i18n.t('cuzdan.ajansPaketElite');
  return i18n.t('cuzdan.ajansPaketMax');
}

export function AjansIndirimliFiyat(
  listeFiyatTry: number,
  indirimYuzde = AJANS_COIN_INDIRIM_YUZDE,
): number {
  const p = Number(listeFiyatTry);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return Math.round(p * (1 - indirimYuzde / 100) * 100) / 100;
}

/** Senkron fallback — DB gelene kadar / hata */
export function AjansCoinPaketleriniUret(): AjansCoinPaket[] {
  return AJANS_COIN_LISTE_FIYATLARI.map((listeFiyatTry) => {
    const coins = TabanCoinHesapla(listeFiyatTry);
    return {
      id: `ajans_try_${listeFiyatTry}`,
      packageKey: `ajans_try_${listeFiyatTry}`,
      title: paketBaslik(listeFiyatTry),
      listeFiyatTry,
      odenecekTry: AjansIndirimliFiyat(listeFiyatTry),
      coins,
      indirimYuzde: AJANS_COIN_INDIRIM_YUZDE,
    };
  });
}

function satirdanPaket(row: Record<string, unknown>): AjansCoinPaket | null {
  const liste = Number(row.liste_fiyat_try ?? 0);
  const coins = Math.floor(Number(row.coins ?? 0));
  if (!(liste > 0) || !(coins > 0)) return null;
  const indirim = Math.floor(
    Number(row.indirim_yuzde ?? AJANS_COIN_INDIRIM_YUZDE),
  );
  const odenecek = Number(row.odenecek_try);
  return {
    id: String(row.id ?? `ajans_try_${liste}`),
    packageKey: String(row.package_key ?? ''),
    title: String(row.title || paketBaslik(liste)),
    listeFiyatTry: liste,
    odenecekTry:
      Number.isFinite(odenecek) && odenecek > 0
        ? odenecek
        : AjansIndirimliFiyat(liste, indirim),
    coins,
    indirimYuzde: indirim,
  };
}

/**
 * DB kataloğu — aktif ajans paketleri.
 * `agencyId` verilirse o ajansın kendi kataloğu (yoksa şablondan seed).
 * Hata/boşsa fallback.
 */
export async function AjansCoinPaketleriniGetir(
  agencyId?: string | null,
): Promise<AjansCoinPaket[]> {
  try {
    const { data, error } = await supabase.rpc('ajans_paket_katalog_liste', {
      p_agency_id: agencyId ?? null,
    });
    if (error) throw error;
    const arr = Array.isArray(data) ? data : [];
    const paketler = arr
      .map((r) => satirdanPaket((r ?? {}) as Record<string, unknown>))
      .filter((p): p is AjansCoinPaket => p != null);
    if (paketler.length > 0) return paketler;
  } catch {
    /* fallback */
  }
  return AjansCoinPaketleriniUret();
}

export function AjansPaketMesajMetni(paket: AjansCoinPaket): string {
  const loc = AktifSayiLocale(i18n.language);
  const coinYazi = paket.coins.toLocaleString(loc);
  const liste = paket.listeFiyatTry.toLocaleString(loc);
  const ode = paket.odenecekTry.toLocaleString(loc, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const oran =
    DilNormalizeEt(i18n.language) === 'tr'
      ? COIN_TRY_ORANI.toFixed(2).replace('.', ',')
      : COIN_TRY_ORANI.toFixed(2);
  return i18n.t('cuzdan.ajansPaketMesaj', {
    title: paket.title,
    coins: coinYazi,
    liste,
    pct: paket.indirimYuzde,
    ode,
    oran,
  });
}
