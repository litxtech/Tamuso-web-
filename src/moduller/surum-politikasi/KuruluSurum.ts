import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { BuildCoz } from './SemverKarsilastir';
import type { KuruluSurum, SurumPolitikasi } from './SurumKarari';
import { GuvenliGuncellemeMetni } from './MagazaUrl';

export function KuruluPlatform(): KuruluSurum['platform'] {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'diger';
}

/** Kurulu paket sürümü ve build. Expo config yedek; mağaza build'i nativeBuildVersion. */
export function KuruluSurumuOku(): KuruluSurum {
  const version =
    Constants.nativeAppVersion ??
    Constants.expoConfig?.version ??
    '0.0.0';
  const buildHam =
    Constants.nativeBuildVersion ??
    (Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString());
  return {
    platform: KuruluPlatform(),
    version: String(version),
    build: BuildCoz(buildHam),
  };
}

export function PolitikaCoz(ham: unknown): SurumPolitikasi | null {
  if (!ham || typeof ham !== 'object') return null;
  const o = ham as Record<string, unknown>;
  const platform = o.platform === 'android' ? 'android' : o.platform === 'ios' ? 'ios' : null;
  if (!platform) return null;
  const latestBuild = BuildCoz(o.latest_build as number | string);
  const minimumBuild = BuildCoz(o.minimum_supported_build as number | string);
  if (latestBuild === null || minimumBuild === null) return null;
  const latestVersion = String(o.latest_version ?? '').trim();
  const minimumVersion = String(o.minimum_supported_version ?? '').trim();
  if (!latestVersion || !minimumVersion) return null;
  return {
    platform,
    latestVersion,
    latestBuild,
    minimumVersion,
    minimumBuild,
    forceUpdate: o.force_update_enabled === true,
    optionalUpdate: o.optional_update_enabled === true,
    title: GuvenliGuncellemeMetni(o.update_title as string, 120),
    message: GuvenliGuncellemeMetni(o.update_message as string, 2000),
    buttonText: GuvenliGuncellemeMetni(o.button_text as string, 40),
    storeUrl: String(o.store_url ?? '').trim(),
    maintenanceMessage: GuvenliGuncellemeMetni(o.maintenance_message as string, 500),
    updatedAt: o.updated_at ? String(o.updated_at) : null,
  };
}
