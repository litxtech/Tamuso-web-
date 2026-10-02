/** Başvuru / belge durumlarının Türkçe etiketleri (admin + kullanıcı UI). */

export const BASVURU_DURUM_ETIKET: Record<string, string> = {
  pending: 'Gönderildi',
  under_review: 'İnceleniyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  suspended: 'Askıya alındı',
  DRAFT: 'Taslak',
  SUBMITTED: 'Gönderildi',
  UNDER_REVIEW: 'İnceleniyor',
  MORE_INFORMATION_REQUIRED: 'Ek bilgi gerekli',
  PRE_APPROVED: 'Ön onay',
  VERIFICATION_REQUIRED: 'Doğrulama gerekli',
  VERIFICATION_IN_REVIEW: 'Doğrulama inceleniyor',
  VERIFIED: 'Doğrulandı',
  APPROVED: 'Onaylandı',
  ACTIVE: 'Aktif',
  REJECTED: 'Reddedildi',
  SUSPENDED: 'Askıya alındı',
  REVOKED: 'İptal edildi',
  EXPIRED: 'Süresi doldu',
};

export const BELGE_DURUM_ETIKET: Record<string, string> = {
  NOT_SUBMITTED: 'Gönderilmedi',
  SUBMITTED: 'Gönderildi',
  UNDER_REVIEW: 'İnceleniyor',
  VERIFIED: 'Doğrulandı',
  REJECTED: 'Reddedildi',
  EXPIRED: 'Süresi doldu',
  RESUBMISSION_REQUIRED: 'Yeniden gönderilmeli',
  EXPIRING_SOON: 'Süresi dolmak üzere',
};

export const PROFIL_DURUM_ETIKET: Record<string, string> = {
  NOT_STARTED: 'Başlamadı',
  IN_PROGRESS: 'Devam ediyor',
  IN_REVIEW: 'İncelemede',
  VERIFIED: 'Doğrulandı',
  REJECTED: 'Reddedildi',
  REVERIFICATION_REQUIRED: 'Yeniden doğrulama gerekli',
  SUSPENDED: 'Askıda',
  REVOKED: 'İptal',
  LEGACY_ACTIVE: 'Legacy aktif',
  LEGACY_VERIFIED: 'Legacy doğrulanmış',
  LEGACY_UNVERIFIED: 'Legacy doğrulanmamış',
  FINANCIAL_REVERIFICATION_REQUIRED: 'Finansal yeniden doğrulama',
  EXPIRING_SOON: 'Süresi dolmak üzere',
};

export function BasvuruDurumEtiket(status: string | null | undefined): string {
  if (!status) return '—';
  return BASVURU_DURUM_ETIKET[status] ?? status;
}

export function BelgeDurumEtiket(status: string | null | undefined): string {
  if (!status) return '—';
  return BELGE_DURUM_ETIKET[status] ?? status;
}
