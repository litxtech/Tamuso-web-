import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { DepoyaMedyaYukle } from '../../../ortak/medya/DepoyaMedyaYukle';

export type KycDocType =
  | 'id_card'
  | 'passport'
  | 'drivers_license'
  | 'temporary_id';

export type KycBasvuruInput = {
  docType: KycDocType;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  hometown?: string;
  phone?: string;
  email?: string;
  country?: string;
  nationality?: string;
  docFrontUri: string;
  docBackUri?: string | null;
  selfieUri: string;
  livenessPassed: boolean;
  livenessMeta?: Record<string, unknown>;
};

async function kycYukle(
  userId: string,
  uri: string,
  etiket: string,
): Promise<string> {
  const path = `${userId}/${etiket}-${Date.now()}.jpg`;
  const up = await DepoyaMedyaYukle(supabase, {
    bucket: 'kyc-docs',
    path,
    uri,
    mime: 'image/jpeg',
    tur: 'image',
  });
  if (!up.ok) throw new Error(up.hata ?? i18n.t('kyc.yuklemeBasarisiz'));
  return path;
}

export async function KycBasvuruGonder(
  input: KycBasvuruInput,
): Promise<{ ok: true } | { ok: false; hata: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { ok: false, hata: i18n.t('ortak.oturumYok') };

  try {
    if (!input.livenessPassed) {
      return { ok: false, hata: i18n.t('kyc.canlilikTamamlanmali') };
    }
    if (input.docType === 'temporary_id' && !input.docBackUri) {
      return { ok: false, hata: i18n.t('kyc.geciciArkaZorunlu') };
    }
    if (
      (input.docType === 'id_card' || input.docType === 'drivers_license') &&
      !input.docBackUri
    ) {
      return { ok: false, hata: i18n.t('kyc.kimlikArkaZorunlu') };
    }

    const front = await kycYukle(uid, input.docFrontUri, 'front');
    const back = input.docBackUri
      ? await kycYukle(uid, input.docBackUri, 'back')
      : null;
    const selfie = await kycYukle(uid, input.selfieUri, 'selfie');

    const { error } = await supabase.rpc('kyc_basvuru_gonder', {
      p_doc_type: input.docType,
      p_first_name: input.firstName.trim(),
      p_last_name: input.lastName.trim(),
      p_birth_date: input.birthDate,
      p_hometown: input.hometown ?? null,
      p_phone: input.phone ?? null,
      p_email: input.email ?? null,
      p_country: input.country ?? null,
      p_nationality: input.nationality ?? null,
      p_doc_front_path: front,
      p_doc_back_path: back,
      p_selfie_path: selfie,
      p_liveness_passed: true,
      p_liveness_meta: input.livenessMeta ?? {},
    });
    if (error) {
      if (/18\+/i.test(error.message)) {
        return { ok: false, hata: i18n.t('kyc.yas18') };
      }
      if (/pending/i.test(error.message)) {
        return { ok: false, hata: i18n.t('kyc.bekleyenBasvuru') };
      }
      return { ok: false, hata: error.message };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      hata: e instanceof Error ? e.message : i18n.t('kyc.kycGonderilemedi'),
    };
  }
}

export async function KycSonBasvuruGetir() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data } = await supabase
    .from('kyc_applications')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
