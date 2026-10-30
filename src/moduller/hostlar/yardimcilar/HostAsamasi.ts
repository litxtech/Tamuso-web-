import type { HostBasvurusu, HostProfil } from '../okuma/HostProfiliniGetir';

export type HostAsamasi = 'yok' | 'bagimsiz' | 'ajans' | 'askida';

/** host_profiles.status: independent | agency | suspended */
export function HostAsamasiBul(
  host: HostProfil | null,
  profilHostMu: boolean,
): HostAsamasi {
  if (host?.status === 'suspended') return 'askida';
  if (host?.status === 'agency' && host.agency_id) return 'ajans';
  if (host || profilHostMu) return 'bagimsiz';
  return 'yok';
}

export function BekleyenAjansBasvurusu(
  basvurular: HostBasvurusu[],
): HostBasvurusu | null {
  return (
    basvurular.find(
      (b) => b.path === 'join_agency' && b.status === 'agency_review',
    ) ?? null
  );
}

export type BasvuruGorunumu = {
  durum:
    | 'beklemede'
    | 'ajans'
    | 'platform'
    | 'onaylandi'
    | 'reddedildi'
    | 'tamamlandi';
  ton: 'bekliyor' | 'olumlu' | 'olumsuz';
};

/**
 * Bağımsız başvuru host_bagimsiz_aktif_et ile anında aktifleşir ama satır
 * platform_review'da kalır; host aktifse kullanıcıya tamamlandı gösterilir.
 */
export function BasvuruGorunumuBul(
  b: HostBasvurusu,
  asama: HostAsamasi,
): BasvuruGorunumu {
  if (b.status === 'approved') return { durum: 'onaylandi', ton: 'olumlu' };
  if (b.status === 'rejected') return { durum: 'reddedildi', ton: 'olumsuz' };
  if (b.path === 'independent' && asama !== 'yok') {
    return { durum: 'tamamlandi', ton: 'olumlu' };
  }
  if (b.status === 'agency_review') return { durum: 'ajans', ton: 'bekliyor' };
  if (b.status === 'platform_review') return { durum: 'platform', ton: 'bekliyor' };
  return { durum: 'beklemede', ton: 'bekliyor' };
}
