import { Platform } from 'react-native';
import type { Provider } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';

export type WebOAuthSonuc =
  | { ok: true; yonlendirildi: true }
  | { ok: false; hata: string };

/** Native şema veya tarayıcının kendi adresi. Supabase Redirect URLs listesinde olmalı. */
export function oauthDonusAdresi(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  const scheme = OrtamDegiskenleri.uygulamaSemasi || 'muta';
  return `${scheme}://auth/callback`;
}

/**
 * Webde sayfa Supabase OAuth adresine gider. Dönüşte oturum URL’den okunur.
 * Native’de null döner; mevcut expo-web-browser akışı sürer.
 */
export async function WebdeOAuthDene(
  provider: Provider,
  opts: {
    scopes?: string;
    queryParams?: Record<string, string>;
    hata: string;
  },
): Promise<WebOAuthSonuc | null> {
  if (Platform.OS !== 'web') return null;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: oauthDonusAdresi(),
      scopes: opts.scopes,
      queryParams: opts.queryParams,
      skipBrowserRedirect: false,
    },
  });

  if (error) return { ok: false, hata: opts.hata };
  return { ok: true, yonlendirildi: true };
}
