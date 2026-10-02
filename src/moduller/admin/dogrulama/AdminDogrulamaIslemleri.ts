import { supabase } from '../../../lib/supabase';

export type AdminDogrulamaDashboard = {
  pending_applications: number;
  today: number;
  in_review: number;
  awaiting_docs: number;
  manual_review: number;
  verified: number;
  rejected: number;
  expiring_docs: number;
  high_risk: number;
  pending_kyc: number;
};

export type AdminBasvuruKuyrukSatir = {
  id: string;
  agency_name: string;
  agency_type?: string | null;
  status: string;
  country?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  risk_level?: string | null;
  created_at: string;
  row_version?: number;
  assigned_reviewer_id?: string | null;
  applicant_id: string;
  applicant_name?: string | null;
  applicant_public_id?: string | null;
};

export type AdminKycKuyrukSatir = {
  id: string;
  user_id: string;
  status: string;
  doc_type: string;
  created_at: string;
  display_name?: string | null;
  public_user_id?: string | null;
};

export async function AdminDogrulamaDashboardGetir(): Promise<AdminDogrulamaDashboard> {
  const { data, error } = await supabase.rpc('admin_verification_dashboard');
  if (error) throw error;
  return data as AdminDogrulamaDashboard;
}

export async function AdminDogrulamaKuyrukGetir(input?: {
  kind?: 'agency' | 'user_kyc';
  limit?: number;
  status?: string | null;
  country?: string | null;
  agencyType?: string | null;
}): Promise<AdminBasvuruKuyrukSatir[] | AdminKycKuyrukSatir[]> {
  const { data, error } = await supabase.rpc('admin_verification_queue', {
    p_kind: input?.kind ?? 'agency',
    p_limit: input?.limit ?? 40,
    p_status: input?.status ?? null,
    p_country: input?.country ?? null,
    p_agency_type: input?.agencyType ?? null,
  });
  if (error) throw error;
  return (data ?? []) as AdminBasvuruKuyrukSatir[];
}

export async function AdminBasvuruGecis(input: {
  applicationId: string;
  newStatus: string;
  rowVersion: number;
  note?: string;
  userMessage?: string;
  assignSelf?: boolean;
}): Promise<{ ok: boolean; status?: string; row_version?: number }> {
  const { data, error } = await supabase.rpc('admin_agency_application_transition', {
    p_application_id: input.applicationId,
    p_new_status: input.newStatus,
    p_row_version: input.rowVersion,
    p_note: input.note ?? null,
    p_user_message: input.userMessage ?? null,
    p_assign_self: input.assignSelf ?? true,
  });
  if (error) throw error;
  return data as { ok: boolean; status?: string; row_version?: number };
}

export async function AdminBelgeIncele(input: {
  documentId: string;
  decision: 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
  rejectionReasonCode?: string;
  userMessage?: string;
  internalNote?: string;
  idempotencyKey?: string;
}): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.rpc('review_verification_document', {
    p_document_id: input.documentId,
    p_decision: input.decision,
    p_rejection_reason_code: input.rejectionReasonCode ?? null,
    p_user_message: input.userMessage ?? null,
    p_internal_note: input.internalNote ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
  });
  if (error) throw error;
  return data as { ok: boolean };
}

export async function AdminBilesenOnayla(input: {
  profileId: string;
  identity?: boolean;
  address?: boolean;
  company?: boolean;
  authorizedPerson?: boolean;
  extraDocs?: boolean;
  paymentAccount?: boolean;
  contract?: boolean;
  rowVersion?: number;
}): Promise<{ ok: boolean; overall_status?: string; progress_pct?: number }> {
  const { data, error } = await supabase.rpc('approve_agency_verification_components', {
    p_profile_id: input.profileId,
    p_identity: input.identity ?? null,
    p_address: input.address ?? null,
    p_company: input.company ?? null,
    p_authorized_person: input.authorizedPerson ?? null,
    p_extra_docs: input.extraDocs ?? null,
    p_payment_account: input.paymentAccount ?? null,
    p_contract: input.contract ?? null,
    p_row_version: input.rowVersion ?? null,
  });
  if (error) throw error;
  return data as { ok: boolean; overall_status?: string; progress_pct?: number };
}

export async function AdminManuelOverride(input: {
  subjectType: string;
  subjectId: string;
  newStatus: string;
  reason: string;
  internalNote: string;
  idempotencyKey?: string;
}): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.rpc('manual_verification_override', {
    p_subject_type: input.subjectType,
    p_subject_id: input.subjectId,
    p_new_status: input.newStatus,
    p_reason: input.reason,
    p_internal_note: input.internalNote,
    p_idempotency_key: input.idempotencyKey ?? null,
  });
  if (error) throw error;
  return data as { ok: boolean };
}

export async function AdminKullaniciDogrulamaAksiyon(input: {
  userId: string;
  action:
    | 'REQUEST_VERIFICATION'
    | 'VERIFY'
    | 'REJECT'
    | 'REQUEST_NEW_DOCUMENT'
    | 'SUSPEND_VERIFICATION'
    | 'REVOKE_VERIFICATION';
  note?: string;
  reason?: string;
}): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.rpc('admin_user_verification_action', {
    p_user_id: input.userId,
    p_action: input.action,
    p_note: input.note ?? null,
    p_reason: input.reason ?? null,
  });
  if (error) throw error;
  return data as { ok: boolean };
}

/** Belge görüntüleme: audit + path; signed URL client'ta oluşturulur (URL loglanmaz). */
export async function AdminBelgeGoruntulePath(
  documentId: string,
): Promise<{ bucket: string; path: string } | null> {
  const { data, error } = await supabase.rpc('log_verification_document_view', {
    p_document_id: documentId,
  });
  if (error) throw error;
  const row = data as { ok?: boolean; bucket?: string; path?: string };
  if (!row?.bucket || !row?.path) return null;
  const { data: signed, error: sErr } = await supabase.storage
    .from(row.bucket)
    .createSignedUrl(row.path, 600);
  if (sErr) throw sErr;
  return { bucket: row.bucket, path: signed.signedUrl };
}

export async function AdminBasvuruBelgeleriGetir(applicationId: string) {
  const { data, error } = await supabase
    .from('verification_documents')
    .select(
      'id, verification_type, document_type, status, submitted_at, expires_at, user_message, rejection_reason_code, holder_first_name, holder_last_name, issuing_country, document_number_masked',
    )
    .eq('subject_type', 'APPLICATION')
    .eq('subject_id', applicationId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function AdminBasvuruProfilGetir(applicationId: string) {
  const { data, error } = await supabase
    .from('agency_verification_profiles')
    .select('*')
    .eq('subject_type', 'APPLICATION')
    .eq('subject_id', applicationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function AdminBasvuruDetayGetir(applicationId: string) {
  const { data, error } = await supabase
    .from('agency_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export const RED_NEDENLERI: { code: string; label: string }[] = [
  { code: 'UNREADABLE', label: 'Belge okunamıyor' },
  { code: 'INCOMPLETE', label: 'Belge eksik' },
  { code: 'EXPIRED', label: 'Belge süresi geçmiş' },
  { code: 'MISMATCH', label: 'Bilgiler eşleşmiyor' },
  { code: 'WRONG_TYPE', label: 'Yanlış belge türü' },
  { code: 'PARTIAL_VISIBLE', label: 'Belgenin tamamı görünmüyor' },
  { code: 'RESUBMIT', label: 'Yeniden yükleme gerekli' },
  { code: 'UNVERIFIABLE', label: 'Doğrulanamadı' },
  { code: 'OTHER', label: 'Diğer' },
];
