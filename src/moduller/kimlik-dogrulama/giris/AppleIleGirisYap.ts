import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { OrtamDegiskenleri } from '../../../yapilandirma/OrtamDegiskenleri';
import { GenelGirisHatasiMesaji } from './GenelGirisHatasiMesaji';
import { OAUTH_TARAYICI, oauthTarayiciAcilmadanOnce } from './OAuthTarayici';
import { OAuthProfiliniTamamla } from './OAuthProfiliniTamamla';
import { WebdeOAuthDene } from './WebOAuthYonlendir';

export type AppleGirisSonuc =
  | { ok: true; yonlendirildi?: boolean }
  | { ok: false; hata: string; iptal?: boolean };

/**
 * Native Sign in with Apple → Supabase signInWithIdToken.
 * İlk yetkilendirmede Apple adı + e-posta profile yazılır.
 */
async function androidAppleOAuth(): Promise<AppleGirisSonuc> {
  const redirectTo = `${OrtamDegiskenleri.uygulamaSemasi || 'muta'}://auth/callback`;
  let WebBrowser: typeof import('expo-web-browser');
  try {
    WebBrowser = await import('expo-web-browser');
  } catch {
    return { ok: false, hata: i18n.t('auth.appleBasarisiz') };
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) {
      return { ok: false, hata: i18n.t('auth.appleBasarisiz') };
    }
    await oauthTarayiciAcilmadanOnce();
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, OAUTH_TARAYICI);
    if (res.type === 'cancel' || res.type === 'dismiss') {
      return { ok: false, hata: i18n.t('auth.iptalEdildi'), iptal: true };
    }
    if (res.type !== 'success' || !('url' in res) || !res.url) {
      return { ok: false, hata: i18n.t('auth.appleBasarisiz') };
    }
    const qIndex = res.url.indexOf('?');
    const hIndex = res.url.indexOf('#');
    const query =
      qIndex >= 0
        ? res.url.slice(qIndex + 1, hIndex > qIndex ? hIndex : undefined)
        : '';
    const hash = hIndex >= 0 ? res.url.slice(hIndex + 1) : '';
    const params = new URLSearchParams(query);
    if (hash) {
      new URLSearchParams(hash).forEach((v, k) => {
        if (!params.has(k)) params.set(k, v);
      });
    }
    const code = params.get('code');
    if (code) {
      const { error: exch } = await supabase.auth.exchangeCodeForSession(code);
      if (exch) return { ok: false, hata: GenelGirisHatasiMesaji(exch.message) };
    } else {
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token) return { ok: false, hata: i18n.t('auth.appleTokenAlinamadi') };
      const { error: sess } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token ?? '',
      });
      if (sess) return { ok: false, hata: GenelGirisHatasiMesaji(sess.message) };
    }
    await OAuthProfiliniTamamla();
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    return { ok: false, hata: GenelGirisHatasiMesaji(msg || i18n.t('auth.appleBasarisiz')) };
  }
}

export async function AppleIleGirisYap(): Promise<AppleGirisSonuc> {
  const web = await WebdeOAuthDene('apple', {
    hata: i18n.t('auth.appleBasarisiz'),
  });
  if (web) return web;

  if (Platform.OS === 'android') {
    return androidAppleOAuth();
  }

  if (Platform.OS !== 'ios') {
    return { ok: false, hata: i18n.t('auth.appleYalnizcaIos') };
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { ok: false, hata: i18n.t('auth.appleBuCihazdaYok') };
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { ok: false, hata: i18n.t('auth.appleTokenAlinamadi') };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      return { ok: false, hata: GenelGirisHatasiMesaji(error.message) };
    }

    // Apple ad/soyadı + e-posta yalnızca ilk yetkilendirmede gelir
    const parts = credential.fullName
      ? ([
          credential.fullName.givenName,
          credential.fullName.middleName,
          credential.fullName.familyName,
        ].filter(Boolean) as string[])
      : [];
    const appleAd = parts.length > 0 ? parts.join(' ') : null;
    const appleMail =
      typeof credential.email === 'string' && credential.email.includes('@')
        ? credential.email.trim()
        : null;

    if (appleAd || appleMail) {
      const data: Record<string, string> = {};
      if (appleAd) {
        data.full_name = appleAd;
        data.display_name = appleAd;
      }
      if (credential.fullName?.givenName) {
        data.given_name = credential.fullName.givenName;
      }
      if (credential.fullName?.familyName) {
        data.family_name = credential.fullName.familyName;
      }
      if (appleMail) data.email = appleMail;
      try {
        await supabase.auth.updateUser({ data });
      } catch {
        /* metadata opsiyonel */
      }
    }

    await OAuthProfiliniTamamla({
      displayName: appleAd,
      emailHint: appleMail,
    });

    return { ok: true };
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, hata: i18n.t('auth.iptalEdildi'), iptal: true };
    }
    return {
      ok: false,
      hata: GenelGirisHatasiMesaji(err.message ?? i18n.t('auth.appleBasarisiz')),
    };
  }
}
