import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export type MahkemeKurSonuc =
  | { ok: true; disputeId: string; threadId: string; already: boolean }
  | { ok: false; hata: string };

export async function TakasMahkemeKur(input: {
  offerId: string;
  reason: string;
}): Promise<MahkemeKurSonuc> {
  const { data, error } = await supabase.rpc('takas_mahkeme_kur', {
    p_offer_id: input.offerId,
    p_reason: input.reason.trim(),
  });
  if (error) {
    if (/yargic/i.test(error.message) || /yargıç/i.test(error.message)) {
      return {
        ok: false,
        hata: i18n.t('takas.yargicAtanmamis'),
      };
    }
    if (/gerekçe|gerekce|10 karakter/i.test(error.message)) {
      return { ok: false, hata: i18n.t('takas.mahkemeGerekceMin') };
    }
    if (/Forbidden/i.test(error.message)) {
      return { ok: false, hata: i18n.t('takas.mahkemeYetkiYok') };
    }
    return { ok: false, hata: error.message };
  }
  const row = data as {
    ok?: boolean;
    dispute_id?: string;
    thread_id?: string;
    already?: boolean;
  };
  if (!row?.thread_id || !row?.dispute_id) {
    return { ok: false, hata: i18n.t('takas.mahkemeOlusturulamadi') };
  }
  return {
    ok: true,
    disputeId: row.dispute_id,
    threadId: row.thread_id,
    already: !!row.already,
  };
}

export async function TakasMahkemeKaraAc(input: {
  disputeId: string;
  targetUserId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('takas_mahkeme_kara_ac', {
    p_dispute_id: input.disputeId,
    p_target_user_id: input.targetUserId,
    p_reason: input.reason.trim(),
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function TakasMahkemeKapat(input: {
  disputeId: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { error } = await supabase.rpc('takas_mahkeme_kapat', {
    p_dispute_id: input.disputeId,
    p_note: input.note ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export type PlatformResmiHesap = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  public_user_id: string | null;
  is_platform_official: boolean;
  is_platform_yargic: boolean;
  is_verified: boolean;
};

export async function PlatformResmiHesaplariListele(): Promise<
  PlatformResmiHesap[]
> {
  const { data, error } = await supabase.rpc('platform_resmi_hesaplari_listele');
  if (error || !data) return [];
  return (data as PlatformResmiHesap[]) ?? [];
}
