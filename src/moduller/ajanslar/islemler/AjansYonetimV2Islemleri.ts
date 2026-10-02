import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

function rpcHata(error: { message?: string } | null): never {
  throw new Error(error?.message ?? i18n.t('ajans.islemBasarisiz'));
}

export type AjansIzinler = {
  role: string;
  permissions: string[];
};

export type AjansDashboardKpi = {
  agency: {
    id: string;
    agency_public_id: string;
    name: string;
    username: string | null;
    logo_url: string | null;
    banner_url: string | null;
    level_code: string | null;
    is_verified: boolean;
    host_count: number;
    status: string;
    owner_id: string;
    is_coin_distributor: boolean;
    slogan: string | null;
  };
  uyeler: number;
  cevrimici: number;
  canli_yayinda: number;
  ses_odasinda: number;
  bekleyen_basvuru: number;
  bu_ay_yayin_saniye: number;
  bu_ay_ses_saniye: number;
  bu_ay_platform_aktivite_saniye: number;
};

export type AjansCanliOperasyon = {
  cevrimici: Array<{
    user_id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    last_seen_at: string;
  }>;
  canli_yayinlar: Array<{
    session_id: string;
    user_id: string;
    title: string;
    viewer_count: number;
    started_at: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }>;
  ses_odalari: Array<{
    room_id: string;
    user_id: string;
    title: string;
    listener_count: number;
    created_at: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }>;
  yaklasan_programlar: Array<{
    id: string;
    title: string;
    starts_at: string;
    kind: string;
    host_id: string | null;
  }>;
  ozet: { cevrimici: number; canli: number; ses: number };
};

export type AjansBugunOzet = {
  yeni_basvuru: number;
  planlanan_yayin: number;
  acik_destek: number;
  okunmamis_bildirim: number;
  maddeler: Array<{
    key: string;
    label: string;
    count: number;
    href: string;
  }>;
};

export type AjansUyari = {
  code: string;
  severity: string;
  title: string;
  body: string;
  href?: string;
  user_id?: string;
};

export async function AjansIzinlerim(agencyId: string): Promise<AjansIzinler> {
  const { data, error } = await supabase.rpc('ajans_izinlerim', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  const d = data as AjansIzinler;
  return {
    role: d?.role ?? 'none',
    permissions: Array.isArray(d?.permissions) ? d.permissions : [],
  };
}

export function AjansIzinVar(
  izinler: AjansIzinler | null | undefined,
  code: string,
): boolean {
  if (!izinler) return false;
  if (izinler.role === 'OWNER') return true;
  return izinler.permissions.includes(code);
}

export async function AjansDashboardKpiGetir(
  agencyId: string,
): Promise<AjansDashboardKpi> {
  const { data, error } = await supabase.rpc('ajans_dashboard_kpi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return data as AjansDashboardKpi;
}

export async function AjansCanliOperasyonGetir(
  agencyId: string,
): Promise<AjansCanliOperasyon> {
  const { data, error } = await supabase.rpc('ajans_canli_operasyon', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  const d = data as AjansCanliOperasyon;
  return {
    cevrimici: d?.cevrimici ?? [],
    canli_yayinlar: d?.canli_yayinlar ?? [],
    ses_odalari: d?.ses_odalari ?? [],
    yaklasan_programlar: d?.yaklasan_programlar ?? [],
    ozet: d?.ozet ?? { cevrimici: 0, canli: 0, ses: 0 },
  };
}

export async function AjansBugunOzetGetir(
  agencyId: string,
): Promise<AjansBugunOzet> {
  const { data, error } = await supabase.rpc('ajans_bugun_ozet', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  const d = data as AjansBugunOzet;
  return {
    yeni_basvuru: d?.yeni_basvuru ?? 0,
    planlanan_yayin: d?.planlanan_yayin ?? 0,
    acik_destek: d?.acik_destek ?? 0,
    okunmamis_bildirim: d?.okunmamis_bildirim ?? 0,
    maddeler: d?.maddeler ?? [],
  };
}

export async function AjansUyariMotoruGetir(
  agencyId: string,
): Promise<AjansUyari[]> {
  const { data, error } = await supabase.rpc('ajans_uyari_motoru', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  const d = data as { uyarilar?: AjansUyari[] };
  return d?.uyarilar ?? [];
}

export async function AjansUyeDetayGetir(
  agencyId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('ajans_uye_detay', {
    p_agency_id: agencyId,
    p_user_id: userId,
  });
  if (error) rpcHata(error);
  return (data as Record<string, unknown>) ?? {};
}

export async function AjansCrmGuncelle(input: {
  agencyId: string;
  userId: string;
  agencyStatus?: string;
  tags?: string[];
  notes?: string;
  assignedManagerId?: string | null;
  mentorId?: string | null;
  onboardingStage?: string;
  clearManager?: boolean;
  clearMentor?: boolean;
}): Promise<{ ok: boolean; hata?: string }> {
  const { error } = await supabase.rpc('ajans_crm_guncelle', {
    p_agency_id: input.agencyId,
    p_user_id: input.userId,
    p_agency_status: input.agencyStatus ?? null,
    p_tags: input.tags ?? null,
    p_notes: input.notes ?? null,
    p_assigned_manager_id: input.assignedManagerId ?? null,
    p_mentor_id: input.mentorId ?? null,
    p_onboarding_stage: input.onboardingStage ?? null,
    p_clear_manager: input.clearManager ?? false,
    p_clear_mentor: input.clearMentor ?? false,
    p_clear_follow_up: false,
  });
  if (error) return { ok: false, hata: error.message };
  return { ok: true };
}

export async function AjansDavetOlustur(input: {
  agencyId: string;
  maxUses?: number | null;
  expiresAt?: string | null;
  label?: string;
}): Promise<{ ok: boolean; invite_code?: string; id?: string; hata?: string }> {
  const { data, error } = await supabase.rpc('ajans_davet_olustur', {
    p_agency_id: input.agencyId,
    p_max_uses: input.maxUses ?? null,
    p_expires_at: input.expiresAt ?? null,
    p_label: input.label ?? null,
  });
  if (error) return { ok: false, hata: error.message };
  const d = data as { ok?: boolean; invite_code?: string; id?: string };
  return { ok: true, invite_code: d?.invite_code, id: d?.id };
}

export async function AjansDavetListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_davet_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansDavetIptal(inviteId: string) {
  const { error } = await supabase.rpc('ajans_davet_iptal', {
    p_invite_id: inviteId,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AjansYoneticiAta(input: {
  agencyId: string;
  username: string;
}) {
  const { error } = await supabase.rpc('ajans_yonetici_ata', {
    p_agency_id: input.agencyId,
    p_username: input.username.trim(),
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AjansYoneticiIptal(input: {
  agencyId: string;
  userId: string;
}) {
  const { error } = await supabase.rpc('ajans_yonetici_iptal', {
    p_agency_id: input.agencyId,
    p_user_id: input.userId,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AjansStaffAta(input: {
  agencyId: string;
  userId: string;
  roleCode: string;
}) {
  const { error } = await supabase.rpc('ajans_staff_ata', {
    p_agency_id: input.agencyId,
    p_user_id: input.userId,
    p_role_code: input.roleCode,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AjansStaffYetkiAyarla(input: {
  agencyId: string;
  userId: string;
  permission: string;
  granted: boolean;
}) {
  const { error } = await supabase.rpc('ajans_staff_yetki_ayarla', {
    p_agency_id: input.agencyId,
    p_user_id: input.userId,
    p_permission: input.permission,
    p_granted: input.granted,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AjansStaffListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_staff_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansAuditListesi(agencyId: string, limit = 50) {
  const { data, error } = await supabase.rpc('ajans_audit_listesi', {
    p_agency_id: agencyId,
    p_limit: limit,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansEkipListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_ekip_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansEkipOlustur(input: {
  agencyId: string;
  name: string;
  color?: string;
  icon?: string;
  managerId?: string;
}) {
  const { data, error } = await supabase.rpc('ajans_ekip_olustur', {
    p_agency_id: input.agencyId,
    p_name: input.name,
    p_color: input.color ?? '#7C5CFF',
    p_icon: input.icon ?? 'people',
    p_manager_id: input.managerId ?? null,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export async function AjansEkipUyeEkle(teamId: string, userId: string) {
  const { error } = await supabase.rpc('ajans_ekip_uye_ekle', {
    p_team_id: teamId,
    p_user_id: userId,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AjansProgramListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_program_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansProgramOlustur(input: {
  agencyId: string;
  title: string;
  kind: string;
  startsAt: string;
  endsAt?: string;
  hostId?: string;
  note?: string;
}) {
  const { data, error } = await supabase.rpc('ajans_program_olustur', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_kind: input.kind,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt ?? null,
    p_host_id: input.hostId ?? null,
    p_note: input.note ?? null,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export async function AjansEtkinlikListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_etkinlik_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansEtkinlikOlustur(input: {
  agencyId: string;
  title: string;
  description?: string;
  startsAt: string;
  kind?: string;
  status?: string;
}) {
  const { data, error } = await supabase.rpc('ajans_etkinlik_olustur', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_description: input.description ?? '',
    p_starts_at: input.startsAt,
    p_kind: input.kind ?? 'room',
    p_status: input.status ?? 'SCHEDULED',
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export async function AjansDuyuruListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_duyuru_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansDuyuruOlustur(input: {
  agencyId: string;
  title: string;
  body: string;
  audience?: string;
  sendPush?: boolean;
}) {
  const { data, error } = await supabase.rpc('ajans_duyuru_olustur', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_body: input.body,
    p_audience: input.audience ?? 'all',
    p_send_push: input.sendPush ?? false,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export async function AjansGorevListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_gorev_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansGorevOlustur(input: {
  agencyId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  verificationType?: string;
  verificationTarget?: number;
}) {
  const { data, error } = await supabase.rpc('ajans_gorev_olustur', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_description: input.description ?? '',
    p_assigned_to: input.assignedTo ?? null,
    p_verification_type: input.verificationType ?? 'manual',
    p_verification_target: input.verificationTarget ?? 0,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export async function AjansHedefListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_hedef_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansHedefOlustur(input: {
  agencyId: string;
  title: string;
  metric: string;
  targetValue: number;
}) {
  const { data, error } = await supabase.rpc('ajans_hedef_olustur', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_metric: input.metric,
    p_target_value: input.targetValue,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export async function AjansOzelOdaKur(input: {
  agencyId: string;
  title: string;
  hostId?: string;
}) {
  const { data, error } = await supabase.rpc('ajans_ozel_oda_kur', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_host_id: input.hostId ?? null,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, room_id: (data as { room_id?: string })?.room_id };
}

export async function AjansAnalitikGetir(
  agencyId: string,
  from?: string,
  to?: string,
) {
  const { data, error } = await supabase.rpc('ajans_analitik', {
    p_agency_id: agencyId,
    p_from: from ?? null,
    p_to: to ?? null,
  });
  if (error) rpcHata(error);
  return data as Record<string, unknown>;
}

export async function AjansSeviyeProgressGetir(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_seviye_progress', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return data as Record<string, unknown>;
}

export async function AjansAkademiListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_akademi_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansAkademiEkle(input: {
  agencyId: string;
  category: string;
  title: string;
  body?: string;
}) {
  const { data, error } = await supabase.rpc('ajans_akademi_ekle', {
    p_agency_id: input.agencyId,
    p_category: input.category,
    p_title: input.title,
    p_body: input.body ?? '',
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export async function AjansFormGetir(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_form_getir', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return data as { form: unknown; fields: Array<Record<string, unknown>> };
}

export async function AjansFormKaydet(input: {
  agencyId: string;
  title: string;
  fields: Array<Record<string, unknown>>;
}) {
  const { error } = await supabase.rpc('ajans_form_kaydet', {
    p_agency_id: input.agencyId,
    p_title: input.title,
    p_fields: input.fields,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AjansDestekListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_destek_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansDestekOlustur(input: {
  agencyId: string;
  subject: string;
  body: string;
}) {
  const { data, error } = await supabase.rpc('ajans_destek_olustur', {
    p_agency_id: input.agencyId,
    p_subject: input.subject,
    p_body: input.body,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export async function AjansGuvenlikListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_guvenlik_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansGuvenlikAck(eventId: string) {
  const { error } = await supabase.rpc('ajans_guvenlik_ack', {
    p_event_id: eventId,
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const };
}

export async function AjansKanalHazirla(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_kanal_hazirla', {
    p_agency_id: agencyId,
  });
  if (error) return { ok: false as const, hata: error.message, kanallar: [] as Array<Record<string, unknown>> };
  return { ok: true as const, kanallar: (data as Array<Record<string, unknown>>) ?? [] };
}

export async function AjansKanalListesi(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_kanal_listesi', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return (data as Array<Record<string, unknown>>) ?? [];
}

export async function AjansDavetAnalitik(agencyId: string) {
  const { data, error } = await supabase.rpc('ajans_davet_analitik', {
    p_agency_id: agencyId,
  });
  if (error) rpcHata(error);
  return data as Record<string, unknown>;
}

export async function AjansOdulTanimla(input: {
  agencyId: string;
  rewardType: string;
  title: string;
  description?: string;
}) {
  const { data, error } = await supabase.rpc('ajans_odul_tanimla', {
    p_agency_id: input.agencyId,
    p_reward_type: input.rewardType,
    p_title: input.title,
    p_description: input.description ?? '',
  });
  if (error) return { ok: false as const, hata: error.message };
  return { ok: true as const, id: (data as { id?: string })?.id };
}

export function saniyeSaatMetni(saniye: number): string {
  const s = Math.max(0, Math.floor(saniye || 0));
  const sa = Math.floor(s / 3600);
  const dk = Math.floor((s % 3600) / 60);
  if (sa <= 0 && dk <= 0) return i18n.t('ajans.saKisa', { n: 0 });
  if (sa <= 0) return i18n.t('ajans.dkSadece', { dk });
  return i18n.t('ajans.saDkKisa', { sa, dk });
}
