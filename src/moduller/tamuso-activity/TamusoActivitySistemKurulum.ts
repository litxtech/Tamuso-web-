import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import {
  CihazKimliginiGetir,
  CihazPlatformunuGetir,
  UygulamaVersiyonunuGetir,
} from '../kimlik-dogrulama/oturum/CihazKimliginiGetir';
import {
  TamusoCallKitBootstrap,
  TamusoCallKitOnVoipToken,
  TamusoCallKitVoipToken,
} from './callkit/TamusoCallKitBridge';
import { TamusoActivityRecover } from './TamusoActivityManager';
import { OzellikBayragiAktifMi } from '../ozellik-bayraklari/OzellikBayragiAktifMi';
// Register Live Activity factory at app boot (expo-widgets)
import './ui/TamusoLiveActivity';

async function voipTokenKaydet(token: string): Promise<void> {
  if (!token || token.length < 8) return;
  try {
    const deviceId = await CihazKimliginiGetir();
    const platform = CihazPlatformunuGetir();
    await supabase.rpc('cihaz_push_token_kaydet', {
      p_device_id: deviceId,
      p_platform: platform === 'unknown' ? 'ios' : platform,
      p_push_provider: 'voip',
      p_push_token: token.trim(),
      p_app_version: UygulamaVersiyonunuGetir(),
      p_locale: null,
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    });
  } catch {
    /* RPC/migration henüz yok */
  }
}

/**
 * CallKit/PushKit + Live Activity recovery — app root'ta bir kez.
 * Soft-fail: Expo Go / eski binary'de no-op.
 */
export function TamusoActivitySistemKurulum(): void {
  if (Platform.OS !== 'ios') return;

  try {
    TamusoActivityRecover();
  } catch {
    /* ignore */
  }

  if (!OzellikBayragiAktifMi('callkit_enabled')) return;

  try {
    TamusoCallKitBootstrap();
    TamusoCallKitOnVoipToken((token) => {
      void voipTokenKaydet(token);
    });
    const existing = TamusoCallKitVoipToken();
    if (existing) void voipTokenKaydet(existing);
  } catch {
    /* native module yok — yeni EAS iOS build gerekir */
  }
}
