import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import { OAuthProfiliniTamamla } from './OAuthProfiliniTamamla';

type WebBrowserModulu = typeof import('expo-web-browser');

let webBrowserPromise: Promise<WebBrowserModulu> | null = null;

function webBrowserAl(): Promise<WebBrowserModulu> {
  if (!webBrowserPromise) {
    webBrowserPromise = import('expo-web-browser')
      .then((mod) => {
        try {
          mod.maybeCompleteAuthSession();
        } catch {
          /* native yok */
        }
        return mod;
      })
      .catch((e) => {
        webBrowserPromise = null;
        throw e;
      });
  }
  return webBrowserPromise;
}

export type TwitchGirisSonuc =
  | { ok: true }
  | { ok: false; hata: string; iptal?: boolean };

/** E-posta + temel profil — Twitch Developer Console’da da aynı scope’lar olmalı */
const TWITCH_SCOPES = 'user:read:email openid';

function oauthRedirectUri(): string {
  const scheme = OrtamDegiskenleri.uygulamaSemasi || 'muta';
  return `${scheme}://auth/callback`;
}

function queryParamsAl(url: string): {
  params: Record<string, string>;
  errorCode?: string;
  errorDescription?: string;
} {
  const params: Record<string, string> = {};
  try {
    const qIndex = url.indexOf('?');
    const hIndex = url.indexOf('#');
    const query =
      qIndex >= 0
        ? url.slice(qIndex + 1, hIndex >= 0 && hIndex > qIndex ? hIndex : undefined)
        : '';
    const hash =
      hIndex >= 0
        ? url.slice(hIndex + 1, qIndex >= 0 && qIndex > hIndex ? qIndex : undefined)
        : '';
    const raw = [query, hash].filter(Boolean).join('&');
    for (const part of raw.split('&')) {
      if (!part) continue;
      const eq = part.indexOf('=');
      const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part);
      const val = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : '');
      if (key) params[key] = val;
    }
  } catch {
    /* bozuk URL */
  }
  const errorCode = params.error || params.error_code || undefined;
  const errorDescription =
    params.error_description || params.error_message || undefined;
  return { params, errorCode, errorDescription };
}

function twitchOauthHataMesaji(
  errorCode?: string,
  errorDescription?: string,
): string {
  const raw = `${errorCode ?? ''} ${errorDescription ?? ''}`.toLowerCase();
  if (raw.includes('redirect')) {
    return i18n.t('auth.twitchYonlendirme');
  }
  if (raw.includes('access_denied') || raw.includes('user denied')) {
    return i18n.t('auth.iptalEdildi');
  }
  if (errorDescription?.trim()) {
    return errorDescription.trim();
  }
  return i18n.t('auth.twitchBasarisiz');
}

async function oturumuUrlDenOlustur(url: string): Promise<void> {
  const { params, errorCode, errorDescription } = queryParamsAl(url);
  if (errorCode) {
    throw new Error(twitchOauthHataMesaji(errorCode, errorDescription));
  }

  const code = params.code;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;
  if (!access_token) {
    throw new Error(i18n.t('auth.oauthOturumYok'));
  }

  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });
  if (error) throw error;
}

function nativeModulHatasiMi(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return (
    msg.includes('ExpoWebBrowser') ||
    msg.includes('Cannot find native module') ||
    msg.includes('native module')
  );
}

/**
 * Supabase Twitch OAuth (PKCE) → uygulama şemasına dönüş.
 * Native expo-web-browser yoksa kontrollü hata döner.
 */
export async function TwitchIleGirisYap(): Promise<TwitchGirisSonuc> {
  const redirectTo = oauthRedirectUri();

  let WebBrowser: WebBrowserModulu;
  try {
    WebBrowser = await webBrowserAl();
  } catch (e) {
    if (nativeModulHatasiMi(e)) {
      return { ok: false, hata: i18n.t('auth.twitchBuildGerekli') };
    }
    return { ok: false, hata: i18n.t('auth.twitchTarayiciAcilamadi') };
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitch',
      options: {
        redirectTo,
        scopes: TWITCH_SCOPES,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { ok: false, hata: i18n.t('auth.twitchBaslatilamadi') };
    }
    if (!data.url) {
      return { ok: false, hata: i18n.t('auth.twitchAdresAlinamadi') };
    }

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (res.type === 'cancel' || res.type === 'dismiss') {
      return { ok: false, hata: i18n.t('auth.iptalEdildi'), iptal: true };
    }
    if (res.type !== 'success' || !('url' in res) || !res.url) {
      return { ok: false, hata: i18n.t('auth.twitchTamamlanamadi') };
    }

    await oturumuUrlDenOlustur(res.url);
    await OAuthProfiliniTamamla();
    return { ok: true };
  } catch (e: unknown) {
    if (nativeModulHatasiMi(e)) {
      return { ok: false, hata: i18n.t('auth.twitchBuildGerekli') };
    }
    const msg = e instanceof Error ? e.message : '';
    return {
      ok: false,
      hata: twitchOauthHataMesaji(undefined, msg || undefined),
    };
  }
}
