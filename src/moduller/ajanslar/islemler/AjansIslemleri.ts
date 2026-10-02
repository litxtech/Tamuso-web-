import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { OzellikBayragiAktifMiSunucu } from '../../ozellik-bayraklari/okuma/OzellikBayragiAktifMiSunucu';
import { UlkeKodunaNormalizeEt } from '../../../ortak/ulke/UlkeKodunaNormalizeEt';

export async function AjansBasvurusuOlustur(input: {
  agencyName: string;
  country?: string;
  email?: string;
  phone?: string;
  experience?: string;
  expectedHosts?: number;
  description?: string;
  agencyType?: 'INDIVIDUAL' | 'COMPANY';
  contactFirstName?: string;
  contactLastName?: string;
  whatsapp?: string;
  city?: string;
  address?: string;
  website?: string;
  whyTamuso?: string;
  existingNetwork?: string;
  languages?: string[];
  targetCountries?: string[];
  referralCode?: string;
  socialLinks?: Record<string, string>;
  policyVersionIds?: string[];
  idempotencyKey?: string;
}): Promise<{ ok: boolean; hata?: string; id?: string; status?: string }> {
  if (!(await OzellikBayragiAktifMiSunucu('agency_enabled'))) {
    return { ok: false, hata: i18n.t('ajans.ozellikKapali') };
  }
  const countryRaw = input.country?.trim() ?? '';
  const country = UlkeKodunaNormalizeEt(countryRaw) ?? (countryRaw || null);

  const v2 = await OzellikBayragiAktifMiSunucu('agency_verification_v2_enabled');
  if (v2) {
    const { data, error } = await supabase.rpc('submit_agency_application', {
      p_agency_name: input.agencyName,
      p_agency_type: input.agencyType ?? 'INDIVIDUAL',
      p_contact_first_name: input.contactFirstName ?? null,
      p_contact_last_name: input.contactLastName ?? null,
      p_country: country,
      p_city: input.city ?? null,
      p_address: input.address ?? null,
      p_email: input.email ?? null,
      p_phone: input.phone ?? null,
      p_whatsapp: input.whatsapp ?? null,
      p_website: input.website ?? null,
      p_social_links: input.socialLinks ?? {},
      p_experience: input.experience ?? null,
      p_expected_hosts: input.expectedHosts ?? null,
      p_description: input.description ?? null,
      p_why_tamuso: input.whyTamuso ?? null,
      p_existing_network: input.existingNetwork ?? null,
      p_languages: input.languages ?? [],
      p_target_countries: input.targetCountries ?? [],
      p_referral_code: input.referralCode ?? null,
      p_policy_version_ids: input.policyVersionIds ?? null,
      p_idempotency_key: input.idempotencyKey ?? null,
    });
    if (error) return { ok: false, hata: error.message };
    const row = data as { ok?: boolean; id?: string; status?: string };
    return { ok: true, id: row?.id, status: row?.status };
  }

  const { error } = await supabase.rpc('ajans_basvurusu_olustur', {
    p_agency_name: input.agencyName,
    p_country: country,
    p_email: input.email ?? null,
    p_phone: input.phone ?? null,
    p_experience: input.experience ?? null,
    p_expected_hosts: input.expectedHosts ?? null,
    p_description: input.description ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AjansBasvuruDurumumGetir() {
  const { data, error } = await supabase.rpc('my_agency_application_status');
  if (error) throw error;
  return data;
}

export async function AjansDogrulamaMerkeziGetir(agencyId: string) {
  const { data, error } = await supabase.rpc('agency_verification_center_get', {
    p_agency_id: agencyId,
  });
  if (error) throw error;
  return data as {
    profile: {
      id: string;
      overall_status: string;
      progress_pct: number;
      identity_verified: boolean;
      address_verified: boolean;
      company_verified: boolean;
      authorized_person_verified: boolean;
      extra_docs_reviewed: boolean;
      payment_account_verified: boolean;
      contract_accepted: boolean;
      risk_level: string;
      row_version: number;
    } | null;
    documents: Array<{
      id: string;
      verification_type: string;
      document_type: string;
      status: string;
      submitted_at: string;
      expires_at: string | null;
      user_message: string | null;
      rejection_reason_code: string | null;
    }>;
  };
}

export async function AjansBelgeUploadSessionOlustur(input: {
  subjectType: 'USER' | 'AGENCY' | 'APPLICATION';
  subjectId: string;
  verificationType: string;
  documentType: string;
}) {
  const { data, error } = await supabase.rpc('create_document_upload_session', {
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_verification_type: input.verificationType,
    p_document_type: input.documentType,
  });
  if (error) throw error;
  return data as {
    ok: boolean;
    session_id: string;
    bucket: string;
    storage_object_key: string;
  };
}

/** Doğru sıra: session → storage upload → submit metadata (URL/belge içeriği loglanmaz) */
export async function AjansBelgeYukleVeGonder(input: {
  subjectType: 'USER' | 'AGENCY' | 'APPLICATION';
  subjectId: string;
  verificationType: string;
  documentType: string;
  localUri: string;
  mimeType: string;
  fileSizeBytes: number;
  meta?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; document_id?: string; hata?: string }> {
  try {
    const session = await AjansBelgeUploadSessionOlustur({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      verificationType: input.verificationType,
      documentType: input.documentType,
    });

    const res = await fetch(input.localUri);
    const blob = await res.blob();
    const { error: upErr } = await supabase.storage
      .from(session.bucket)
      .upload(session.storage_object_key, blob, {
        contentType: input.mimeType,
        upsert: false,
      });
    if (upErr) return { ok: false, hata: upErr.message };

    const { data, error } = await supabase.rpc('submit_verification_document', {
      p_session_id: session.session_id,
      p_mime_type: input.mimeType,
      p_file_size_bytes: input.fileSizeBytes,
      p_meta: input.meta ?? {},
      p_idempotency_key: input.idempotencyKey ?? null,
    });
    if (error) return { ok: false, hata: error.message };
    const row = data as { ok?: boolean; document_id?: string };
    return { ok: true, document_id: row?.document_id };
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : 'Yükleme başarısız' };
  }
}

export async function AjansPolitikaKabul(input: {
  policyVersionId: string;
  agencyId?: string;
  locale?: string;
  source?: string;
  idempotencyKey?: string;
}) {
  const { data, error } = await supabase.rpc('accept_policy_version', {
    p_policy_version_id: input.policyVersionId,
    p_agency_id: input.agencyId ?? null,
    p_locale: input.locale ?? null,
    p_acceptance_source: input.source ?? 'agency_app',
    p_idempotency_key: input.idempotencyKey ?? null,
  });
  if (error) throw error;
  return data;
}

export async function AjansCoinTransfer(input: {
  agencyId: string;
  toUserId: string;
  coins: number;
  idempotencyKey: string;
}): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('ajans_coin_transfer', {
    p_agency_id: input.agencyId,
    p_to_user_id: input.toUserId,
    p_coins: input.coins,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}
