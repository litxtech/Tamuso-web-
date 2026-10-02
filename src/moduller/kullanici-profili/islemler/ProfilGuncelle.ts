import i18n from '../../../i18n';
import { supabase } from '../../../lib/supabase';
import { UlkeKodunaNormalizeEt } from '../../../ortak/ulke/UlkeKodunaNormalizeEt';

export type ProfilGuncelleGirdi = {
  display_name?: string;
  username?: string;
  bio?: string;
  phone_e164?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  country_code?: string | null;
  region_id?: string | null;
  language?: string;
};

function kullaniciAdiNormalize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

function telefonNormalize(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '').trim();
  if (!digits) return null;
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0') && digits.length >= 10) return `+90${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith('5')) return `+90${digits}`;
  return digits.startsWith('90') ? `+${digits}` : `+${digits}`;
}

function yasHesapla(isoDate: string): number {
  const d = new Date(isoDate + 'T12:00:00');
  const now = new Date();
  let yas = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) yas -= 1;
  return yas;
}

/**
 * Kendi profil alanlarini gunceller (RPC).
 */
export async function ProfilGuncelle(
  girdi: ProfilGuncelleGirdi,
): Promise<
  | { ok: true; cooldown_message?: string | null }
  | { ok: false; hata: string }
> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };

  let displayName = girdi.display_name?.trim();
  if (displayName !== undefined) {
    if (displayName.length < 2) {
      return { ok: false, hata: i18n.t('profilDuzenle.adSoyadMin') };
    }
    if (displayName.length > 60) {
      return { ok: false, hata: i18n.t('profilDuzenle.adSoyadUzun') };
    }
  }

  let username: string | undefined;
  if (girdi.username !== undefined && girdi.username.trim()) {
    username = kullaniciAdiNormalize(girdi.username);
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return {
        ok: false,
        hata: i18n.t('profilDuzenle.kullaniciAdiKural'),
      };
    }
  }

  let bio: string | undefined;
  if (girdi.bio !== undefined) {
    bio = girdi.bio.trim();
    if (bio.length > 280) {
      return { ok: false, hata: i18n.t('profilDuzenle.hakkindaMax') };
    }
  }

  let phone: string | null | undefined = undefined;
  let clearPhone = false;
  if (girdi.phone_e164 !== undefined) {
    if (girdi.phone_e164 === null || !girdi.phone_e164.trim()) {
      phone = null;
      clearPhone = true;
    } else {
      phone = telefonNormalize(girdi.phone_e164);
      if (!phone || phone.length < 10 || phone.length > 20) {
        return { ok: false, hata: i18n.t('profilDuzenle.telefonOrnek') };
      }
    }
  }

  let gender: string | null | undefined = undefined;
  if (girdi.gender !== undefined) {
    if (girdi.gender === null || girdi.gender === '') {
      gender = null;
    } else {
      gender = girdi.gender;
      if (!['female', 'male', 'other', 'prefer_not'].includes(gender)) {
        return { ok: false, hata: i18n.t('profilDuzenle.gecersizCinsiyet') };
      }
    }
  }

  let birthDate: string | null | undefined = undefined;
  let clearBirth = false;
  if (girdi.birth_date !== undefined) {
    if (girdi.birth_date === null || !girdi.birth_date.trim()) {
      birthDate = null;
      clearBirth = true;
    } else {
      birthDate = girdi.birth_date.trim().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        return { ok: false, hata: i18n.t('profilDuzenle.dogumYyyyAaGg') };
      }
      if (yasHesapla(birthDate) < 18) {
        return { ok: false, hata: i18n.t('profilDuzenle.yasHint') };
      }
    }
  }

  let countryCode: string | null | undefined = undefined;
  if (girdi.country_code !== undefined) {
    if (girdi.country_code === null || !String(girdi.country_code).trim()) {
      countryCode = null;
    } else {
      countryCode = UlkeKodunaNormalizeEt(girdi.country_code);
      if (!countryCode) {
        return {
          ok: false,
          hata: i18n.t('profilDuzenle.ulkeGecersiz'),
        };
      }
    }
  }

  let regionId: string | null | undefined = undefined;
  let clearRegion = false;
  if (girdi.region_id !== undefined) {
    if (girdi.region_id === null || !girdi.region_id) {
      regionId = null;
      clearRegion = true;
    } else {
      regionId = girdi.region_id;
    }
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc('profil_guncelle', {
    p_display_name: displayName ?? null,
    p_username: username ?? null,
    p_bio: bio ?? null,
    p_phone_e164: clearPhone ? null : (phone ?? null),
    p_clear_phone: clearPhone,
    p_gender: gender ?? null,
    p_birth_date: clearBirth ? null : (birthDate ?? null),
    p_clear_birth_date: clearBirth,
    p_country_code: countryCode ?? null,
    p_region_id: clearRegion ? null : (regionId ?? null),
    p_clear_region: clearRegion,
  });

  if (rpcError) {
    const msg = rpcError.message;
    if (msg.includes('18')) return { ok: false, hata: i18n.t('profilDuzenle.yasHint') };
    if (
      msg.includes('cooldown') ||
      msg.includes('bekleme') ||
      msg.includes('ülke değiş') ||
      msg.includes('ulke degis')
    ) {
      return {
        ok: false,
        hata: i18n.t('ulkeLigi.ulkeDegisimCooldown', { mesaj: msg }),
      };
    }
    if (msg.includes('ulke') || msg.includes('ülke')) {
      return { ok: false, hata: i18n.t('profilDuzenle.ulkeSecilemez') };
    }
    if (msg.includes('unique') || rpcError.code === '23505') {
      return {
        ok: false,
        hata: i18n.t('profilDuzenle.kullaniciAdiVeyaTelefonAlinmis'),
      };
    }
    return { ok: false, hata: msg };
  }
  if (!rpcData) return { ok: false, hata: i18n.t('profilDuzenle.profilGuncellenemedi') };
  const root =
    rpcData && typeof rpcData === 'object'
      ? (rpcData as Record<string, unknown>)
      : {};
  if (root.ok === false) {
    const errMsg =
      typeof root.error === 'string'
        ? root.error
        : typeof root.message === 'string'
          ? root.message
          : i18n.t('profilDuzenle.profilGuncellenemedi');
    if (
      errMsg.includes('cooldown') ||
      errMsg.includes('bekleme') ||
      typeof root.cooldown_until === 'string'
    ) {
      return {
        ok: false,
        hata: i18n.t('ulkeLigi.ulkeDegisimCooldown', { mesaj: errMsg }),
      };
    }
    return { ok: false, hata: errMsg };
  }
  const cooldownMsg =
    typeof root.cooldown_message === 'string'
      ? root.cooldown_message
      : typeof root.country_cooldown_message === 'string'
        ? root.country_cooldown_message
        : null;
  return { ok: true, cooldown_message: cooldownMsg };
}

export async function EpostaGuncelle(
  email: string,
): Promise<{ ok: true; mesaj: string } | { ok: false; hata: string }> {
  const temiz = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(temiz)) {
    return { ok: false, hata: i18n.t('profilDuzenle.epostaGecerli') };
  }
  const { error } = await supabase.auth.updateUser({ email: temiz });
  if (error) return { ok: false, hata: error.message };
  return {
    ok: true,
    mesaj: i18n.t('profilDuzenle.epostaOnayLink'),
  };
}
