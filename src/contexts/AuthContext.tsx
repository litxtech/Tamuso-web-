import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import i18n from '../i18n';
import { supabase } from '../lib/supabase';
import type { Profile, Wallet } from '../types/models';
import { EmailIleGirisYap } from '../moduller/kimlik-dogrulama/giris/EmailIleGirisYap';
import { EmailIleKayitOl } from '../moduller/kimlik-dogrulama/giris/EmailIleKayitOl';
import { AppleIleGirisYap } from '../moduller/kimlik-dogrulama/giris/AppleIleGirisYap';
import { MisafirOlarakDevamEt } from '../moduller/misafir-hesabi/islemler/MisafirOlarakDevamEt';
import { CihazOturumuKaydet } from '../moduller/kimlik-dogrulama/oturum/CihazOturumuKaydet';
import { ManuelCikisYap } from '../moduller/kimlik-dogrulama/oturum/ManuelCikisYap';
import {
  AktifOturumuGecmiseKaydet,
  OturumGecmisindenGirisYap,
} from '../moduller/kimlik-dogrulama/oturum-gecmisi/OturumGecmisiIslemleri';
import { OturumGecmisindenKaldir } from '../moduller/kimlik-dogrulama/oturum-gecmisi/OturumGecmisiDepolama';
import type { OturumGecmisiKaydi } from '../moduller/kimlik-dogrulama/oturum-gecmisi/tipler';
import { OturumKorumaDurumunuGetir } from '../moduller/kimlik-dogrulama/oturum/OturumKorumaDurumunuGetir';
import { HesapSil } from '../moduller/kimlik-dogrulama/hesap/HesapSil';
import { GuvenlikOlayiKaydet } from '../moduller/guvenlik/olaylar/GuvenlikOlayiKaydet';
import { CihazPushTokeniniKaydet } from '../moduller/bildirimler/kayit/CihazPushTokeniniKaydet';
import {
  EmailOtpDogrula,
  type EmailOtpAmaci,
} from '../moduller/kimlik-dogrulama/dogrulama/EmailOtpDogrula';
import { EmailOtpYenidenGonder } from '../moduller/kimlik-dogrulama/dogrulama/EmailOtpYenidenGonder';
import { GirisLobisiOnbellekIsit } from '../moduller/giris-lobisi/islemler/GirisLobisiPublicGet';
import {
  AuthContext,
  type AuthContextValue,
} from './AuthContextNesnesi';

function tamSayi(deger: unknown, yedek = 0): number {
  const n = typeof deger === 'number' ? deger : Number(deger);
  if (!Number.isFinite(n)) return yedek;
  return Math.max(0, Math.floor(n));
}

function cuzdanSatiri(row: {
  user_id: string;
  coins: unknown;
  diamonds: unknown;
  updated_at?: string | null;
}): Wallet {
  return {
    user_id: row.user_id,
    coins: tamSayi(row.coins),
    diamonds: tamSayi(row.diamonds),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const korumaKontrolRef = useRef(false);

  /**
   * Misafir mi?
   * Kaynak: yalnızca profiles.is_guest.
   * Auth is_anonymous, e-posta bağlandıktan sonra bile kalabiliyor;
   * profile yüklenmeden buna bakmak tamamlanmış hesapta şifre/hesap kartını
   * yanlış açıyordu (özellikle yavaş Android ağında).
   */
  const isGuest = profile?.is_guest === true;

  const oturumuEngelDurumundaKapat = useCallback(async () => {
    if (korumaKontrolRef.current) return;
    korumaKontrolRef.current = true;
    try {
      const durum = await OturumKorumaDurumunuGetir();
      if (durum.ok) return;
      if (durum.kod === 'banned') {
        await ManuelCikisYap('ban');
        return;
      }
      if (durum.kod === 'deleted') {
        await ManuelCikisYap('account_deleted');
      }
    } finally {
      korumaKontrolRef.current = false;
    }
  }, []);

  const misafirBayraginiKaldir = useCallback(() => {
    setProfile((prev) => {
      if (!prev || prev.is_guest !== true) return prev;
      return { ...prev, is_guest: false };
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;
    if (!uid) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select(
        [
          'id',
          'public_user_id',
          'username',
          'display_name',
          'bio',
          'avatar_url',
          'cover_url',
          'phone_e164',
          'gender',
          'birth_date',
          'custom_fields',
          'country',
          'country_code',
          'region_id',
          'language',
          'is_host',
          'is_guest',
          'is_admin',
          'is_verified',
          'selected_title_id',
          'level',
          'xp',
          'primary_city_id',
          'created_at',
          'banned_at',
          'ban_reason',
          'deleted_at',
          'deletion_requested_at',
          'child_protection_consent_status',
          'child_protection_consent_at',
        ].join(', '),
      )
      .eq('id', uid)
      .maybeSingle();
    let next = (data as unknown as Profile) ?? null;

    if (next?.banned_at) {
      setProfile(null);
      await ManuelCikisYap('ban');
      return;
    }
    if (next?.deleted_at) {
      setProfile(null);
      await ManuelCikisYap('account_deleted');
      return;
    }

    // Hesap tamamlanmis ama is_guest bayragi takili kalmissa duzelt
    const emailKimligiVar = Boolean(
      authData.user?.email ||
        authData.user?.identities?.some(
          (i) =>
            i.provider === 'email' ||
            i.provider === 'spotify' ||
            i.provider === 'apple' ||
            i.provider === 'twitch' ||
            i.provider === 'x' ||
            i.provider === 'twitter' ||
            i.provider === 'google',
        ),
    );
    const metaMisafirDegil =
      authData.user?.user_metadata?.is_guest === false ||
      authData.user?.user_metadata?.is_guest === 'false';
    if (next?.is_guest === true && (emailKimligiVar || metaMisafirDegil)) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_guest: false })
        .eq('id', uid);
      if (!error) {
        next = { ...next, is_guest: false };
      } else {
        // RLS engellerse bile UI kilidini gecici kaldir
        next = { ...next, is_guest: false };
      }
    }

    setProfile(next);
  }, []);

  const refreshWallet = useCallback(async () => {
    const { data: oturum } = await supabase.auth.getSession();
    const uid = oturum.session?.user?.id;
    if (!uid) {
      setWallet(null);
      return;
    }
    const { data, error } = await supabase
      .from('wallets')
      .select('user_id, coins, diamonds, updated_at')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) return;
    if (!data) {
      setWallet({
        user_id: uid,
        coins: 0,
        diamonds: 0,
        updated_at: new Date().toISOString(),
      });
      return;
    }
    setWallet(
      cuzdanSatiri(
        data as {
          user_id: string;
          coins: unknown;
          diamonds: unknown;
          updated_at?: string | null;
        },
      ),
    );
  }, []);

  const patchWallet = useCallback(
    (patch: Partial<Pick<Wallet, 'coins' | 'diamonds'>>) => {
      setWallet((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          coins:
            patch.coins !== undefined
              ? Math.max(0, Math.floor(patch.coins))
              : prev.coins,
          diamonds:
            patch.diamonds !== undefined
              ? Math.max(0, Math.floor(patch.diamonds))
              : prev.diamonds,
          updated_at: new Date().toISOString(),
        };
      });
    },
    [],
  );

  const patchProfile = useCallback(
    (patch: Partial<Pick<Profile, 'avatar_url' | 'cover_url'>>) => {
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(patch.avatar_url !== undefined
            ? { avatar_url: patch.avatar_url }
            : {}),
          ...(patch.cover_url !== undefined
            ? { cover_url: patch.cover_url }
            : {}),
        };
      });
    },
    [],
  );

  const adjustWallet = useCallback(
    (delta: Partial<Pick<Wallet, 'coins' | 'diamonds'>>) => {
      setWallet((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          coins:
            delta.coins !== undefined
              ? Math.max(0, Math.floor(prev.coins + delta.coins))
              : prev.coins,
          diamonds:
            delta.diamonds !== undefined
              ? Math.max(0, Math.floor(prev.diamonds + delta.diamonds))
              : prev.diamonds,
          updated_at: new Date().toISOString(),
        };
      });
    },
    [],
  );

  // Cuzdan realtime — harcama / yukleme her ekranda aninda
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;

    const channel = supabase
      .channel(`wallet-live-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id?: string;
            coins?: unknown;
            diamonds?: unknown;
            updated_at?: string | null;
          } | null;
          if (!row?.user_id || row.coins == null || row.diamonds == null) return;
          setWallet(
            cuzdanSatiri({
              user_id: row.user_id,
              coins: row.coins,
              diamonds: row.diamonds,
              updated_at: row.updated_at,
            }),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    void GirisLobisiOnbellekIsit();
  }, []);

  useEffect(() => {
    void import('../moduller/cuzdan/katalog/EkonomiOranlariniGetir')
      .then((m) => m.EkonomiOranlariniGetir())
      .catch(() => undefined);
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) void oturumuEngelDurumundaKapat();
    }).catch(() => {
      if (!mounted) return;
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // TOKEN_REFRESHED / INITIAL_SESSION oturumu bitirmez — sadece engel kontrolu
      if (event === 'SIGNED_IN' && next) {
        GuvenlikOlayiKaydet('login_success', { event });
        void CihazOturumuKaydet();
        void CihazPushTokeniniKaydet();
        void oturumuEngelDurumundaKapat();
      }
      if (event === 'TOKEN_REFRESHED' && next) {
        void oturumuEngelDurumundaKapat();
      }
      // SIGNED_OUT: Guvenlik olayini ManuelCikisYap / signOut zaten yazar
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [oturumuEngelDurumundaKapat]);

  // On plana gelince ban/silme kontrolu — idle timeout yok
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && session?.user) {
        void oturumuEngelDurumundaKapat();
        void refreshWallet();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [session?.user, oturumuEngelDurumundaKapat, refreshWallet]);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setWallet(null);
      return;
    }
    void refreshProfile();
    void refreshWallet();
    void CihazOturumuKaydet();
    // Cikis sonrasi lobi medyasi aninda gelsin
    void GirisLobisiOnbellekIsit();
    // Uygulama tamamen kapatılıp açıldıysa takılı görüşmeleri bitir (1 kez / process)
    void import('../moduller/gorusme/oturum/GorusmeOturumYoneticisi').then(
      (m) => m.GorusmeUygulamaAcilisTemizligi(),
    );
  }, [session?.user?.id, refreshProfile, refreshWallet]);

  const oturumEngelMesaji = (kod: string, mesaj?: string) => {
    if (kod === 'deleted') {
      return i18n.t('auth.hesapSilinmis');
    }
    if (kod === 'banned') {
      return mesaj ?? i18n.t('auth.hesapAskida');
    }
    return mesaj ?? i18n.t('auth.hesapKullanilamiyor');
  };

  const signIn = useCallback(async (kimlik: string, password: string) => {
    const result = await EmailIleGirisYap(kimlik, password);
    if (result.error) {
      GuvenlikOlayiKaydet('login_failed');
      return result;
    }
    // refreshProfile oturumu kapatmadan önce kontrol et
    const durum = await OturumKorumaDurumunuGetir();
    if (!durum.ok && (durum.kod === 'banned' || durum.kod === 'deleted')) {
      await ManuelCikisYap(durum.kod === 'banned' ? 'ban' : 'account_deleted');
      return { error: oturumEngelMesaji(durum.kod, durum.mesaj) };
    }
    await refreshProfile();
    return {};
  }, [refreshProfile]);

  const signInWithApple = useCallback(async () => {
    const sonuc = await AppleIleGirisYap();
    if (!sonuc.ok) {
      if (sonuc.iptal) return { cancelled: true };
      GuvenlikOlayiKaydet('login_failed', { provider: 'apple' });
      return { error: sonuc.hata };
    }
    if (sonuc.yonlendirildi) return { redirected: true };
    // Silinmiş hesap: refreshProfile önce çıkış yaparsa kod no_auth olur — önce kontrol
    const durum = await OturumKorumaDurumunuGetir();
    if (!durum.ok && (durum.kod === 'banned' || durum.kod === 'deleted')) {
      await ManuelCikisYap(durum.kod === 'banned' ? 'ban' : 'account_deleted');
      return { error: oturumEngelMesaji(durum.kod, durum.mesaj) };
    }
    await refreshProfile();
    return {};
  }, [refreshProfile]);

  const signInWithSpotify = useCallback(async () => {
    // Lazy: expo-web-browser native yoksa AuthContext yüklenirken çökmesin
    let SpotifyIleGirisYap: typeof import('../moduller/kimlik-dogrulama/giris/SpotifyIleGirisYap').SpotifyIleGirisYap;
    try {
      ({ SpotifyIleGirisYap } = await import(
        '../moduller/kimlik-dogrulama/giris/SpotifyIleGirisYap'
      ));
    } catch {
      return {
        error: i18n.t('auth.spotifyBuildGerekli'),
      };
    }
    let sonuc: Awaited<ReturnType<typeof SpotifyIleGirisYap>>;
    try {
      sonuc = await SpotifyIleGirisYap();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('ExpoWebBrowser') || msg.includes('native module')) {
        return {
          error: i18n.t('auth.spotifyBuildGerekli'),
        };
      }
      GuvenlikOlayiKaydet('login_failed', { provider: 'spotify' });
      return { error: i18n.t('auth.spotifyBasarisiz') };
    }
    if (!sonuc.ok) {
      if (sonuc.iptal) return { cancelled: true };
      GuvenlikOlayiKaydet('login_failed', { provider: 'spotify' });
      return { error: sonuc.hata };
    }
    if (sonuc.yonlendirildi) return { redirected: true };
    const durum = await OturumKorumaDurumunuGetir();
    if (!durum.ok && (durum.kod === 'banned' || durum.kod === 'deleted')) {
      await ManuelCikisYap(durum.kod === 'banned' ? 'ban' : 'account_deleted');
      return { error: oturumEngelMesaji(durum.kod, durum.mesaj) };
    }
    await refreshProfile();
    return {};
  }, [refreshProfile]);

  const signInWithTwitch = useCallback(async () => {
    let TwitchIleGirisYap: typeof import('../moduller/kimlik-dogrulama/giris/TwitchIleGirisYap').TwitchIleGirisYap;
    try {
      ({ TwitchIleGirisYap } = await import(
        '../moduller/kimlik-dogrulama/giris/TwitchIleGirisYap'
      ));
    } catch {
      return { error: i18n.t('auth.twitchBuildGerekli') };
    }
    let sonuc: Awaited<ReturnType<typeof TwitchIleGirisYap>>;
    try {
      sonuc = await TwitchIleGirisYap();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('ExpoWebBrowser') || msg.includes('native module')) {
        return { error: i18n.t('auth.twitchBuildGerekli') };
      }
      GuvenlikOlayiKaydet('login_failed', { provider: 'twitch' });
      return { error: i18n.t('auth.twitchBasarisiz') };
    }
    if (!sonuc.ok) {
      if (sonuc.iptal) return { cancelled: true };
      GuvenlikOlayiKaydet('login_failed', { provider: 'twitch' });
      return { error: sonuc.hata };
    }
    if (sonuc.yonlendirildi) return { redirected: true };
    const durum = await OturumKorumaDurumunuGetir();
    if (!durum.ok && (durum.kod === 'banned' || durum.kod === 'deleted')) {
      await ManuelCikisYap(durum.kod === 'banned' ? 'ban' : 'account_deleted');
      return { error: oturumEngelMesaji(durum.kod, durum.mesaj) };
    }
    await refreshProfile();
    return {};
  }, [refreshProfile]);

  const signInWithX = useCallback(async () => {
    let XIleGirisYap: typeof import('../moduller/kimlik-dogrulama/giris/XIleGirisYap').XIleGirisYap;
    try {
      ({ XIleGirisYap } = await import(
        '../moduller/kimlik-dogrulama/giris/XIleGirisYap'
      ));
    } catch {
      return { error: i18n.t('auth.xBuildGerekli') };
    }
    let sonuc: Awaited<ReturnType<typeof XIleGirisYap>>;
    try {
      sonuc = await XIleGirisYap();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('ExpoWebBrowser') || msg.includes('native module')) {
        return { error: i18n.t('auth.xBuildGerekli') };
      }
      GuvenlikOlayiKaydet('login_failed', { provider: 'x' });
      return { error: i18n.t('auth.xBasarisiz') };
    }
    if (!sonuc.ok) {
      if (sonuc.iptal) return { cancelled: true };
      GuvenlikOlayiKaydet('login_failed', { provider: 'x' });
      return { error: sonuc.hata };
    }
    if (sonuc.yonlendirildi) return { redirected: true };
    const durum = await OturumKorumaDurumunuGetir();
    if (!durum.ok && (durum.kod === 'banned' || durum.kod === 'deleted')) {
      await ManuelCikisYap(durum.kod === 'banned' ? 'ban' : 'account_deleted');
      return { error: oturumEngelMesaji(durum.kod, durum.mesaj) };
    }
    await refreshProfile();
    return {};
  }, [refreshProfile]);

  const signInWithGoogle = useCallback(async () => {
    let GoogleIleGirisYap: typeof import('../moduller/kimlik-dogrulama/giris/GoogleIleGirisYap').GoogleIleGirisYap;
    try {
      ({ GoogleIleGirisYap } = await import(
        '../moduller/kimlik-dogrulama/giris/GoogleIleGirisYap'
      ));
    } catch {
      return { error: i18n.t('auth.googleBuildGerekli') };
    }
    let sonuc: Awaited<ReturnType<typeof GoogleIleGirisYap>>;
    try {
      sonuc = await GoogleIleGirisYap();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('ExpoWebBrowser') || msg.includes('native module')) {
        return { error: i18n.t('auth.googleBuildGerekli') };
      }
      GuvenlikOlayiKaydet('login_failed', { provider: 'google' });
      return { error: i18n.t('auth.googleBasarisiz') };
    }
    if (!sonuc.ok) {
      if (sonuc.iptal) return { cancelled: true };
      GuvenlikOlayiKaydet('login_failed', { provider: 'google' });
      return { error: sonuc.hata };
    }
    if (sonuc.yonlendirildi) return { redirected: true };
    const durum = await OturumKorumaDurumunuGetir();
    if (!durum.ok && (durum.kod === 'banned' || durum.kod === 'deleted')) {
      await ManuelCikisYap(durum.kod === 'banned' ? 'ban' : 'account_deleted');
      return { error: oturumEngelMesaji(durum.kod, durum.mesaj) };
    }
    await refreshProfile();
    return {};
  }, [refreshProfile]);

  const signUp = useCallback(
    async (input: {
      email?: string;
      phone?: string;
      password: string;
      username: string;
      displayName: string;
      gender?: string;
      birthDate?: string;
      customFields?: Record<string, string>;
    }) => EmailIleKayitOl(input),
    [],
  );

  const continueAsGuest = useCallback(async () => {
    const sonuc = await MisafirOlarakDevamEt();
    if (!sonuc.ok) return { error: sonuc.hata };
    GuvenlikOlayiKaydet('guest_continue');
    return {};
  }, []);

  const signOut = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await AktifOturumuGecmiseKaydet({
      session: data.session ?? session,
      profile,
    });
    // Lobi medyasini cikis oncesi taze tut
    void GirisLobisiOnbellekIsit();
    await ManuelCikisYap('manual');
  }, [session, profile]);

  const signInFromHistory = useCallback(
    async (kayit: OturumGecmisiKaydi) => {
      const sonuc = await OturumGecmisindenGirisYap(kayit);
      if (!sonuc.ok) {
        if (sonuc.needsPassword) {
          GuvenlikOlayiKaydet('login_failed', { source: 'oturum_gecmisi' });
        }
        return sonuc;
      }
      const durum = await OturumKorumaDurumunuGetir();
      if (!durum.ok && (durum.kod === 'banned' || durum.kod === 'deleted')) {
        await OturumGecmisindenKaldir(kayit.userId);
        await ManuelCikisYap(
          durum.kod === 'banned' ? 'ban' : 'account_deleted',
        );
        return {
          ok: false as const,
          hata: durum.mesaj ?? i18n.t('auth.hesapKullanilamiyor'),
        };
      }
      return { ok: true as const };
    },
    [],
  );

  const deleteAccount = useCallback(async (reason?: string) => {
    const uid = session?.user?.id;
    const r = await HesapSil({ reason });
    if (!r.ok) return { error: r.hata };
    if (uid) await OturumGecmisindenKaldir(uid);
    return {};
  }, [session?.user?.id]);

  const resetPassword = useCallback(async (email: string) => {
    // 6 haneli OTP — şablon {{ .Token }}; redirect/link kullanılmaz
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
    );
    return {
      error: error ? i18n.t('auth.sifreSifirlamaBasarisiz') : undefined,
    };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? i18n.t('auth.sifreGuncellenemedi') : undefined };
  }, []);

  const verifyEmailOtp = useCallback(
    async (email: string, kod: string, amac: EmailOtpAmaci) =>
      EmailOtpDogrula({ email, kod, amac }),
    [],
  );

  const resendEmailOtp = useCallback(
    async (email: string, amac: EmailOtpAmaci) =>
      EmailOtpYenidenGonder({ email, amac }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      wallet,
      loading,
      isGuest: !!isGuest,
      refreshProfile,
      refreshWallet,
      misafirBayraginiKaldir,
      patchWallet,
      patchProfile,
      adjustWallet,
      signIn,
      signInWithApple,
      signInWithSpotify,
      signInWithTwitch,
      signInWithX,
      signInWithGoogle,
      signUp,
      continueAsGuest,
      signOut,
      signInFromHistory,
      deleteAccount,
      resetPassword,
      updatePassword,
      verifyEmailOtp,
      resendEmailOtp,
    }),
    [
      session,
      profile,
      wallet,
      loading,
      isGuest,
      refreshProfile,
      refreshWallet,
      misafirBayraginiKaldir,
      patchWallet,
      patchProfile,
      adjustWallet,
      signIn,
      signInWithApple,
      signInWithSpotify,
      signInWithTwitch,
      signInWithX,
      signInWithGoogle,
      signUp,
      continueAsGuest,
      signOut,
      signInFromHistory,
      deleteAccount,
      resetPassword,
      updatePassword,
      verifyEmailOtp,
      resendEmailOtp,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
