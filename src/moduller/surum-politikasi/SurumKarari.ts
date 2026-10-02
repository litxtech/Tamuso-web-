import { BuildCoz, SemverKarsilastir } from './SemverKarsilastir';

export type SurumPolitikasi = {
  platform: 'ios' | 'android';
  latestVersion: string;
  latestBuild: number;
  minimumVersion: string;
  minimumBuild: number;
  forceUpdate: boolean;
  optionalUpdate: boolean;
  title: string;
  message: string;
  buttonText: string;
  storeUrl: string;
  maintenanceMessage: string;
  updatedAt: string | null;
};

export type KuruluSurum = {
  platform: 'ios' | 'android' | 'diger';
  version: string;
  build: number | null;
};

export type SurumKararTuru = 'izin' | 'zorunlu' | 'istege_bagli';

/**
 * Zorunlu: force açık ve (sürüm < minimum veya sürüm eşit ve build < minimum).
 * Sürüm çözülemezse veya build eşit sürümde bilinmiyorsa kilitleme.
 * İsteğe bağlı yalnız zorunlu değilken, son sürüme göre.
 */
export function SurumKarariVer(
  kurulu: KuruluSurum,
  policy: SurumPolitikasi | null,
): SurumKararTuru {
  if (!policy || kurulu.platform === 'diger') return 'izin';
  if (policy.platform !== kurulu.platform) return 'izin';

  const minKarsilastir = SemverKarsilastir(kurulu.version, policy.minimumVersion);
  if (minKarsilastir === null) return 'izin';

  const minAltinda =
    minKarsilastir < 0 ||
    (minKarsilastir === 0 &&
      kurulu.build !== null &&
      BuildCoz(policy.minimumBuild) !== null &&
      kurulu.build < policy.minimumBuild);

  if (policy.forceUpdate && minAltinda) return 'zorunlu';

  if (!policy.optionalUpdate || policy.forceUpdate) return 'izin';

  const sonKarsilastir = SemverKarsilastir(kurulu.version, policy.latestVersion);
  if (sonKarsilastir === null) return 'izin';
  const sonunAltinda =
    sonKarsilastir < 0 ||
    (sonKarsilastir === 0 &&
      kurulu.build !== null &&
      kurulu.build < policy.latestBuild);
  return sonunAltinda ? 'istege_bagli' : 'izin';
}
