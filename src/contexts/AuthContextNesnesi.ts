/**
 * Auth context nesnesi — ayrı dosyada tutulur ki Metro Fast Refresh
 * AuthContext.tsx’i yenilediğinde createContext yeniden çalışıp
 * Provider / useAuth örneklerini ayırmasın.
 */
import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile, Wallet } from '../types/models';
import type { EmailOtpAmaci } from '../moduller/kimlik-dogrulama/dogrulama/EmailOtpDogrula';
import type { OturumGecmisindenGirisSonuc } from '../moduller/kimlik-dogrulama/oturum-gecmisi/OturumGecmisiIslemleri';
import type { OturumGecmisiKaydi } from '../moduller/kimlik-dogrulama/oturum-gecmisi/tipler';

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  wallet: Wallet | null;
  loading: boolean;
  isGuest: boolean;
  refreshProfile: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  /** Hesap tamamlandıktan sonra UI'yı anında misafir olmaktan çıkar */
  misafirBayraginiKaldir: () => void;
  /** Harcama / yukleme sonrasi UI aninda guncelle (realtime gelene kadar) */
  patchWallet: (patch: Partial<Pick<Wallet, 'coins' | 'diamonds'>>) => void;
  /** Avatar / kapak vb. sonrasi UI aninda guncelle (refresh bitene kadar) */
  patchProfile: (
    patch: Partial<Pick<Profile, 'avatar_url' | 'cover_url'>>,
  ) => void;
  /** Relatif degisim — hizli art arda islemlerde stale bakiye riski yok */
  adjustWallet: (delta: Partial<Pick<Wallet, 'coins' | 'diamonds'>>) => void;
  signIn: (kimlik: string, password: string) => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string; cancelled?: boolean }>;
  signInWithSpotify: () => Promise<{ error?: string; cancelled?: boolean }>;
  signInWithTwitch: () => Promise<{ error?: string; cancelled?: boolean }>;
  signInWithX: () => Promise<{ error?: string; cancelled?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string; cancelled?: boolean }>;
  signUp: (input: {
    email?: string;
    phone?: string;
    password: string;
    username: string;
    displayName: string;
    gender?: string;
    birthDate?: string;
    customFields?: Record<string, string>;
  }) => Promise<{ error?: string; needsConfirm?: boolean }>;
  continueAsGuest: () => Promise<{ error?: string }>;
  /** Sadece manuel cikis — otomatik sonlandirma yok */
  signOut: () => Promise<void>;
  /** Lobideki kayitli hesaba tek dokunusla gir */
  signInFromHistory: (
    kayit: OturumGecmisiKaydi,
  ) => Promise<OturumGecmisindenGirisSonuc>;
  deleteAccount: (reason?: string) => Promise<{ error?: string }>;
  /** Şifre sıfırlama: e-postaya 6 haneli kod gönderir (link değil) */
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  verifyEmailOtp: (
    email: string,
    kod: string,
    amac: EmailOtpAmaci,
  ) => Promise<{ ok: boolean; hata?: string }>;
  resendEmailOtp: (
    email: string,
    amac: EmailOtpAmaci,
  ) => Promise<{ ok: boolean; hata?: string }>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
