import { AdminDogrulamaDashboardGetir } from '../dogrulama/AdminDogrulamaIslemleri';
import type { AdminPlatformOzeti } from '../tipler/PlatformTipleri';
import { AdminSatinAlmaItirazListele } from '../../cuzdan/itiraz/SatinAlmaItirazIslemleri';

export type AdminOnayBalonu = {
  id: string;
  adet: number;
  etiket: string;
  href: string;
};

/** Bekleyen onay kuyrukları. Bir kaynak düşerse diğerleri durur. */
export async function AdminOnayBalonlariGetir(
  platform?: AdminPlatformOzeti | null,
): Promise<AdminOnayBalonu[]> {
  const [dogrulama, itiraz] = await Promise.all([
    AdminDogrulamaDashboardGetir().catch(() => null),
    AdminSatinAlmaItirazListele('pending', 40).catch(() => []),
  ]);

  const adaylar: AdminOnayBalonu[] = [
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
