import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type BankaHesabi = {
  user_id: string;
  account_holder: string;
  bank_name: string;
  iban: string;
  updated_at: string;
};

function ibanNormalize(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

function ibanGecerliMi(iban: string): boolean {
  if (iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  // TR IBAN: TR + 24 karakter
  if (iban.startsWith('TR') && iban.length !== 26) return false;
  return true;
}

export async function BankaHesabiGetir(): Promise<BankaHesabi | null> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('user_bank_accounts')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return (data as BankaHesabi | null) ?? null;
}

export async function BankaHesabiKaydet(input: {
  account_holder: string;
  bank_name: string;
  iban: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };

  const holder = input.account_holder.trim();
  const bank = input.bank_name.trim();
  const iban = ibanNormalize(input.iban);

  if (holder.length < 2) return { ok: false, hata: i18n.t('profilDuzenle.hesapSahibiGerekli') };
  if (bank.length < 2) return { ok: false, hata: i18n.t('profilDuzenle.bankaAdiGerekli') };
  if (!ibanGecerliMi(iban)) {
    return { ok: false, hata: i18n.t('profilDuzenle.ibanGecerli') };
  }

  const { error } = await supabase.from('user_bank_accounts').upsert(
    {
      user_id: uid,
      account_holder: holder,
      bank_name: bank,
      iban,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    if (error.code === '23505') {
      return { ok: false, hata: i18n.t('profilDuzenle.ibanBaskaHesap') };
    }
    if (error.message.includes('user_bank_accounts') || error.code === '42P01') {
      return { ok: false, hata: i18n.t('profilDuzenle.bankaTablosuYok') };
    }
    return { ok: false, hata: error.message };
  }
  return { ok: true };
}
