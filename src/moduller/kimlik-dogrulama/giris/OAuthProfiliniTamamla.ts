import { supabase } from '../../../lib/supabase';

function metaMetin(
  meta: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const k of keys) {
    const v = meta[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function otomatikKullaniciAdiMi(u: string | null | undefined): boolean {
  if (!u) return true;
  return /^(user_|guest_|deleted_)/i.test(u);
}

function otomatikGorunenAdMi(
  ad: string | null | undefined,
  username: string | null | undefined,
): boolean {
  if (!ad?.trim()) return true;
  if (username && ad.trim() === username.trim()) return true;
  return /^(user_|guest_|deleted_)/i.test(ad.trim());
}

function emaildenKullaniciAdi(email: string): string | null {
  const local = email.split('@')[0]?.trim().toLowerCase() ?? '';
  const temiz = local
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 20);
  if (temiz.length < 3) return null;
  return temiz;
}

async function benzersizKullaniciAdi(aday: string, userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', aday)
    .maybeSingle();
  if (!data || data.id === userId) return aday;

  const suffix = userId.replace(/-/g, '').slice(0, 4);
  const kisa = aday.slice(0, Math.max(3, 20 - suffix.length - 1));
  return `${kisa}_${suffix}`;
}

/**
 * Apple / Spotify (ve benzeri OAuth) sonrası profili
 * sağlayıcıdaki isim + e-posta ile doldurur.
 * Yalnızca boş / otomatik (user_xxx) alanları yazar — kullanıcı düzenlemesini ezmez.
 */
export async function OAuthProfiliniTamamla(opts?: {
  displayName?: string | null;
  emailHint?: string | null;
  avatarUrl?: string | null;
}): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const given = metaMetin(meta, 'given_name', 'givenName');
  const family = metaMetin(meta, 'family_name', 'familyName');
  const birlesik =
    [given, family].filter(Boolean).join(' ').trim() || null;

  const displayName =
    (opts?.displayName?.trim() || null) ||
    metaMetin(meta, 'full_name', 'name', 'display_name') ||
    birlesik;

  const avatarUrl =
    (opts?.avatarUrl?.trim() || null) ||
    metaMetin(meta, 'avatar_url', 'picture');

  const email =
    (typeof user.email === 'string' && user.email.includes('@')
      ? user.email
      : null) ||
    (opts?.emailHint?.trim().includes('@') ? opts.emailHint.trim() : null) ||
    metaMetin(meta, 'email');

  const { data: profil } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, deleted_at, banned_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profil) return;
  if (profil.deleted_at || profil.banned_at) return;

  const patch: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  } = {};

  if (
    displayName &&
    otomatikGorunenAdMi(profil.display_name, profil.username)
  ) {
    patch.display_name = displayName;
  }

  if (otomatikKullaniciAdiMi(profil.username)) {
    const metaHandle = metaMetin(
      meta,
      'preferred_username',
      'user_name',
      'nickname',
      'login',
    );
    const adayHam =
      (metaHandle
        ? metaHandle
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, '')
            .replace(/^[._-]+|[._-]+$/g, '')
            .slice(0, 20)
        : null) || (email ? emaildenKullaniciAdi(email) : null);
    if (adayHam && adayHam.length >= 3) {
      patch.username = await benzersizKullaniciAdi(adayHam, user.id);
    }
  }

  if (avatarUrl && !profil.avatar_url) {
    patch.avatar_url = avatarUrl;
  }

  if (Object.keys(patch).length === 0) return;

  await supabase.from('profiles').update(patch).eq('id', user.id);

  // Auth metadata senkron — sonraki oturumlarda handle_new_user / UI için
  const metaPatch: Record<string, string> = {};
  if (patch.display_name) metaPatch.full_name = patch.display_name;
  if (patch.display_name) metaPatch.display_name = patch.display_name;
  if (Object.keys(metaPatch).length > 0) {
    try {
      await supabase.auth.updateUser({ data: metaPatch });
    } catch {
      /* metadata opsiyonel */
    }
  }
}
