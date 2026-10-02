import { AdminDogrulamaDashboardGetir } from '../dogrulama/AdminDogrulamaIslemleri';
import type { AdminPlatformOzeti } from '../tipler/PlatformTipleri';
import { StudioAdminListe } from '../../studio/v2/StudioAdminApi';
import { AdminSatinAlmaItirazListele } from '../../cuzdan/itiraz/SatinAlmaItirazIslemleri';

export type AdminOnayBalonu = {
  id: string;
  adet: number;
  etiket: string;
  href: string;
};

const OYUN_ONAY = new Set(['SUBMITTED', 'IN_REVIEW']);

/** Bekleyen onay kuyrukları. Bir kaynak düşerse diğerleri durur. */
export async function AdminOnayBalonlariGetir(
  platform?: AdminPlatformOzeti | null,
): Promise<AdminOnayBalonu[]> {
  const [studio, dogrulama, itiraz] = await Promise.all([
    StudioAdminListe().catch(() => []),
    AdminDogrulamaDashboardGetir().catch(() => null),
    AdminSatinAlmaItirazListele('pending', 40).catch(() => []),
  ]);

  const adaylar: AdminOnayBalonu[] = [
    {
      id: 'oyun',
      adet: studio.filter((o) => OYUN_ONAY.has(o.status)).length,
      etiket: 'Oyun onayı',
      href: '/admin/studio',
    },
    {
      id: 'kimlik',
      adet: dogrulama?.pending_kyc ?? 0,
      etiket: 'Kimlik onayı',
      href: '/admin/kyc',
    },
    {
      id: 'ajans',
      adet: (dogrulama?.pending_applications ?? 0) + (dogrulama?.in_review ?? 0),
      etiket: 'Ajans doğrulama',
      href: '/admin/dogrulama',
    },
    {
      id: 'cekim',
      adet: platform?.finans.bekleyen_cekim ?? 0,
      etiket: 'Bekleyen çekim',
      href: '/admin/finans',
    },
    {
      id: 'itiraz',
      adet: itiraz.length,
      etiket: 'Satın alma itirazı',
      href: '/admin/satin-alma-itirazlar',
    },
    {
      id: 'rapor',
      adet: platform?.sosyal.acik_rapor ?? 0,
      etiket: 'Açık rapor',
      href: '/admin/moderasyon',
    },
  ];

  return adaylar.filter((b) => b.adet > 0);
}
