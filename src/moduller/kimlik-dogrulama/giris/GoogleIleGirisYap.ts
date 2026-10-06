import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import { OAuthProfiliniTamamla } from './OAuthProfiliniTamamla';
import { WebdeOAuthDene } from './WebOAuthYonlendir';

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

export type GoogleGirisSonuc =
  | { ok: true; yonlendirildi?: boolean }
  | { ok: false; hata: string; iptal?: boolean };

/** openid + profil + e-posta — Google Cloud Data Access scopes ile uyumlu */
const GOOGLE_SCOPES = 'openid email profile';

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

function googleOauthHataMesaji(
  errorCode?: string,
  errorDescription?: string,
): string {
  const raw = `${errorCode ?? ''} ${errorDescription ?? ''}`.toLowerCase();
  if (raw.includes('redirect')) {
    return i18n.t('auth.googleYonlendirme');
  }
  if (raw.includes('access_denied') || raw.includes('user denied')) {
    return i18n.t('auth.iptalEdildi');
  }
  if (errorDescription?.trim()) {
    return errorDescription.trim();
  }
  return i18n.t('auth.googleBasarisiz');
}

async function oturumuUrlDenOlustur(url: string): Promise<void> {
  const { params, errorCode, errorDescription } = queryParamsAl(url);
  if (errorCode) {
    throw new Error(googleOauthHataMesaji(errorCode, errorDescription));
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
 * Supabase Google OAuth (PKCE) — iOS + Android (expo-web-browser).
 * Dashboard’da Web Client ID/Secret gerekir; Authorized redirect URI:
 * https://<project>.supabase.co/auth/v1/callback
 */
export async function GoogleIleGirisYap(): Promise<GoogleGirisSonuc> {
  const web = await WebdeOAuthDene('google', {
    scopes: GOOGLE_SCOPES,
    queryParams: { prompt: 'select_account' },
    hata: i18n.t('auth.googleBaslatilamadi'),
  });
  if (web) return web;

  const redirectTo = oauthRedirectUri();

  let WebBrowser: WebBrowserModulu;
  try {
    WebBrowser = await webBrowserAl();
  } catch (e) {
    if (nativeModulHatasiMi(e)) {
      return { ok: false, hata: i18n.t('auth.googleBuildGerekli') };
    }
    return { ok: false, hata: i18n.t('auth.googleTarayiciAcilamadi') };
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: GOOGLE_SCOPES,
        skipBrowserRedirect: true,
        queryParams: {
          // Hesap seçici — her seferinde consent zorlamaz
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      return { ok: false, hata: i18n.t('auth.googleBaslatilamadi') };
    }
    if (!data.url) {
      return { ok: false, hata: i18n.t('auth.googleAdresAlinamadi') };
    }

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (res.type === 'cancel' || res.type === 'dismiss') {
      return { ok: false, hata: i18n.t('auth.iptalEdildi'), iptal: true };
    }
    if (res.type !== 'success' || !('url' in res) || !res.url) {
      return { ok: false, hata: i18n.t('auth.googleTamamlanamadi') };
    }

    await oturumuUrlDenOlustur(res.url);
    await OAuthProfiliniTamamla();
    return { ok: true };
  } catch (e: unknown) {
    if (nativeModulHatasiMi(e)) {
      return { ok: false, hata: i18n.t('auth.googleBuildGerekli') };
    }
    const msg = e instanceof Error ? e.message : '';
    return {
      ok: false,
      hata: googleOauthHataMesaji(undefined, msg || undefined),
    };
  }
}
