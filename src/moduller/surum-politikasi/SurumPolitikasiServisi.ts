import { supabase } from '../../lib/supabase';
import { AnalyticsOlayEkle } from '../guvenlik/analytics/AnalyticsOlayEkle';
import { KuruluSurumuOku } from './KuruluSurum';
import { PolitikaCoz } from './KuruluSurum';
import {
  SURUM_ONBELLEK_TTL_MS,
  SurumOnbellegiOku,
  SurumOnbellegiYaz,
} from './SurumOnbellek';
import { SurumKarariVer, type SurumKararTuru, type SurumPolitikasi } from './SurumKarari';

const ZAMAN_ASIMI_MS = 5000;

export type SurumYukleme = {
  karar: SurumKararTuru;
  policy: SurumPolitikasi | null;
  /** Ağ doğrulanamadı. Bu durum "eski sürüm" değildir. */
  agHatasi: boolean;
};

async function PolitikaCek(platform: 'ios' | 'android'): Promise<SurumPolitikasi | null> {
  const kontrol = new AbortController();
  const zaman = setTimeout(() => kontrol.abort(), ZAMAN_ASIMI_MS);
  try {
    const istek = supabase.rpc('surum_politikasi_oku', { p_platform: platform });
    if (typeof istek.abortSignal === 'function') istek.abortSignal(kontrol.signal);
    const { data, error } = await Promise.race([
      istek,
      new Promise<never>((_, reddet) => {
        kontrol.signal.addEventListener('abort', () => reddet(new Error('timeout')));
      }),
    ]);
    if (error) throw error;
    if (data == null) return null;
    const policy = PolitikaCoz(data);
    if (!policy) throw new Error('policy');
    return policy;
  } finally {
    clearTimeout(zaman);
  }
}

/**
 * Önce ağ. Başarısızsa yalnız TTL içindeki son doğrulanmış politika
 * zorunlu kilidi sürdürebilir. TTL dolmuş veya hiç yoksa uygulama açılır.
 */
export async function SurumPolitikasiniYukle(): Promise<SurumYukleme> {
  const kurulu = KuruluSurumuOku();
  if (kurulu.platform === 'diger') {
    return { karar: 'izin', policy: null, agHatasi: false };
  }

  try {
    const policy = await PolitikaCek(kurulu.platform);
    if (policy) {
      await SurumOnbellegiYaz({
        platform: kurulu.platform,
        fetchedAt: Date.now(),
        policy,
      });
    }
    return {
      karar: SurumKarariVer(kurulu, policy),
      policy,
      agHatasi: false,
    };
  } catch {
    const onbellek = await SurumOnbellegiOku(kurulu.platform);
    const taze =
      onbellek != null && Date.now() - onbellek.fetchedAt < SURUM_ONBELLEK_TTL_MS;
    if (taze && onbellek) {
      const karar = SurumKarariVer(kurulu, onbellek.policy);
      if (karar === 'zorunlu') {
        return { karar, policy: onbellek.policy, agHatasi: true };
      }
    }
    return { karar: 'izin', policy: null, agHatasi: true };
  }
}

export function SurumOlayEkle(
  ad:
    | 'force_update_shown'
    | 'force_update_store_clicked'
    | 'optional_update_shown'
    | 'optional_update_later'
    | 'store_open_failed',
  policy: SurumPolitikasi | null,
): void {
  const kurulu = KuruluSurumuOku();
  void AnalyticsOlayEkle(ad, {
    platform: kurulu.platform,
    installed_version: kurulu.version,
    installed_build: kurulu.build,
    latest_version: policy?.latestVersion ?? null,
    minimum_version: policy?.minimumVersion ?? null,
  });
}
