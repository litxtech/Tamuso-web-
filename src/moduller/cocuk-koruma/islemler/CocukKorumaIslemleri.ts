import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { GuvenlikOlayiKaydet } from '../../guvenlik/olaylar/GuvenlikOlayiKaydet';
import { ManuelCikisYap } from '../../kimlik-dogrulama/oturum/ManuelCikisYap';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type CocukKorumaKarar = 'approved' | 'declined';

export type CocukKorumaDurumSonuc = {
  ok: boolean;
  gerekli: boolean;
  status?: CocukKorumaKarar | null;
  kod?: string;
};

export type CocukKorumaKayit = {
  id: string;
  user_id: string;
  decision: CocukKorumaKarar;
  decided_at: string;
  display_name_snapshot?: string | null;
  username_snapshot?: string | null;
  public_user_id_snapshot?: string | null;
  locale?: string | null;
  app_version?: string | null;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  deleted_at?: string | null;
  banned_at?: string | null;
};

export type CocukKorumaAdminListe = {
  ok: boolean;
  approved_count: number;
  declined_count: number;
  rows: CocukKorumaKayit[];
};

function metaLocale(): string {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().locale ||
      Platform.OS ||
      'unknown'
    );
  } catch {
    return Platform.OS;
  }
}

function metaAppVersion(): string | null {
  const v =
    Constants.expoConfig?.version ??
    (Constants as { nativeAppVersion?: string }).nativeAppVersion ??
    null;
  return v ? String(v) : null;
}

export async function CocukKorumaOnayDurumuGetir(): Promise<CocukKorumaDurumSonuc> {
  const { data, error } = await supabase.rpc('cocuk_koruma_onay_durumu');
  if (error) {
    return { ok: false, gerekli: false, kod: error.message };
  }
  const row = (data ?? {}) as {
    ok?: boolean;
    gerekli?: boolean;
    status?: CocukKorumaKarar | null;
    kod?: string;
  };
  return {
    ok: row.ok !== false,
    gerekli: row.gerekli === true,
    status: row.status ?? null,
    kod: row.kod,
  };
}

export async function CocukKorumaOnayla(): Promise<
  { ok: true; kod: string } | { ok: false; hata: string }
> {
  const { data, error } = await supabase.rpc('cocuk_koruma_onayla', {
    p_locale: metaLocale(),
    p_app_version: metaAppVersion(),
  });
  if (error) return { ok: false, hata: error.message };
  const row = (data ?? {}) as { ok?: boolean; kod?: string };
  if (row.ok === false) {
    return { ok: false, hata: row.kod ?? 'Onay kaydedilemedi' };
  }
  void GuvenlikOlayiKaydet('child_protection_approved', {
    kod: row.kod ?? 'approved',
  });
  return { ok: true, kod: row.kod ?? 'approved' };
}

/**
 * 18 yaş altı beyanı → kayıt + soft delete + lokal oturum kapat.
 * Çağıran taraf lobi/login'e yönlendirir.
 */
export async function CocukKorumaReddetVeHesapKapat(): Promise<
  { ok: true; kod: string } | { ok: false; hata: string }
> {
  const { data, error } = await supabase.rpc('cocuk_koruma_reddet', {
    p_locale: metaLocale(),
    p_app_version: metaAppVersion(),
  });
  if (error) return { ok: false, hata: error.message };
  const row = (data ?? {}) as { ok?: boolean; kod?: string };
  if (row.ok === false) {
    return { ok: false, hata: row.kod ?? i18n.t('ortak.islemBasarisiz') };
  }

  void GuvenlikOlayiKaydet('child_protection_declined', {
    kod: row.kod ?? 'declined',
    action: 'account_close',
  });

  try {
    await ManuelCikisYap('account_deleted');
  } catch {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* session zaten düşmüş olabilir */
    }
  }

  return { ok: true, kod: row.kod ?? 'declined' };
}

export async function AdminCocukKorumaListesi(
  decision?: CocukKorumaKarar | null,
  limit = 200,
): Promise<CocukKorumaAdminListe> {
  const { data, error } = await supabase.rpc('admin_cocuk_koruma_listesi', {
    p_decision: decision ?? null,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as Partial<CocukKorumaAdminListe>;
  return {
    ok: row.ok !== false,
    approved_count: Number(row.approved_count ?? 0),
    declined_count: Number(row.declined_count ?? 0),
    rows: Array.isArray(row.rows) ? (row.rows as CocukKorumaKayit[]) : [],
  };
}
