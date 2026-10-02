import type { TFunction } from 'i18next';
import type { CeviriAnahtari } from '../../../i18n/useCeviri';

type T = TFunction | ((key: CeviriAnahtari, opts?: Record<string, unknown>) => string);

function tr(t: T, key: CeviriAnahtari, opts?: Record<string, unknown>): string {
  return String(t(key as never, opts as never));
}

/** Bugün özeti — RPC `key` → çevrilmiş etiket (RPC label TR sabittir) */
export function AjansBugunEtiket(key: string, t: T): string {
  switch (key) {
    case 'basvurular':
      return tr(t, 'ajans.bugunBasvuru');
    case 'program':
      return tr(t, 'ajans.bugunProgram');
    case 'destek':
      return tr(t, 'ajans.bugunDestek');
    case 'bildirim':
      return tr(t, 'ajans.bugunBildirim');
    default:
      return key;
  }
}

/** Uyarı motoru başlığı — RPC `code` */
export function AjansUyariBaslik(code: string, t: T): string {
  switch (code) {
    case 'inactive_host':
      return tr(t, 'ajans.uyariPasifHost');
    case 'stale_application':
      return tr(t, 'ajans.uyariBekleyenBasvuru');
    case 'open_support':
      return tr(t, 'ajans.uyariAcikDestek');
    case 'security_event':
      return tr(t, 'ajans.uyariGuvenlikOlayi');
    case 'missed_schedule':
    case 'program_missed':
      return tr(t, 'ajans.uyariProgramBaslamadi');
    default:
      return code;
  }
}

/**
 * Uyarı gövdesi — bilinen TR kalıplarını çevir; kullanıcı içeriği (konu/başlık) olduğu gibi bırak.
 */
export function AjansUyariGovde(code: string, body: string, t: T): string {
  const b = (body ?? '').trim();
  if (code === 'inactive_host') {
    const m = b.match(/^(.+?)\s+5\+\s*gündür aktif değil$/i);
    return tr(t, 'ajans.uyariPasifHostBody', {
      name: m?.[1]?.trim() || b || 'Host',
    });
  }
  if (code === 'stale_application') {
    const m = b.match(/^(.+?)\s+başvurusu\s+48s\+?\s*bekliyor$/i);
    return tr(t, 'ajans.uyariBekleyenBasvuruBody', {
      name: m?.[1]?.trim() || b || '—',
    });
  }
  return b || '—';
}

/** Seviye eksikleri — RPC TR stringlerini çevir */
export function AjansEksikCevir(raw: string, t: T): string {
  const s = (raw ?? '').trim();
  const host = s.match(/^(\d+)\s+aktif host$/i);
  if (host) return tr(t, 'ajans.eksikHost', { n: host[1] });
  const yayin = s.match(/^([\d.,]+)\s+saat yayın$/i);
  if (yayin) return tr(t, 'ajans.eksikYayin', { n: yayin[1] });
  const ses = s.match(/^([\d.,]+)\s+saat ses odası$/i);
  if (ses) return tr(t, 'ajans.eksikSes', { n: ses[1] });
  return s;
}

export function AjansCrmDurumEtiket(status: string, t: T): string {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return tr(t, 'ajans.crmActive');
    case 'trial':
      return tr(t, 'ajans.crmTrial');
    case 'leave':
      return tr(t, 'ajans.crmLeave');
    case 'suspended':
      return tr(t, 'ajans.crmSuspended');
    default:
      return status || '—';
  }
}

export function AjansRolEtiket(role: string, t: T): string {
  switch ((role ?? '').toUpperCase()) {
    case 'OWNER':
      return tr(t, 'ajans.rolOwner');
    case 'MEMBER':
      return tr(t, 'ajans.rolMember');
    case 'HOST':
      return tr(t, 'ajans.rolHost');
    case 'HOST_MANAGER':
      return tr(t, 'ajans.rolHostManager');
    case 'MANAGER':
      return tr(t, 'ajans.yoneticiRol');
    case 'MODERATOR':
      return tr(t, 'ajans.rolModerator');
    case 'STAFF':
      return tr(t, 'ajans.rolStaff');
    default:
      return role || '—';
  }
}

export function AjansHostBasvuruDurum(status: string, t: T): string {
  switch ((status ?? '').toLowerCase()) {
    case 'agency_review':
    case 'pending':
    case 'submitted':
      return tr(t, 'ajans.durumInceleniyor');
    case 'approved':
    case 'accepted':
      return tr(t, 'ajans.durumOnaylandi');
    case 'rejected':
    case 'denied':
      return tr(t, 'ajans.durumReddedildi');
    case 'active':
      return tr(t, 'ajans.durumAktif');
    default:
      return status || '—';
  }
}

export function AjansKayitDurum(status: string, t: T): string {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
    case 'open':
      return tr(t, 'ajans.durumAktif');
    case 'pending':
    case 'scheduled':
    case 'in_progress':
      return tr(t, 'ajans.durumInceleniyor');
    case 'completed':
    case 'done':
    case 'closed':
      return tr(t, 'ajans.durumTamamlandi');
    case 'cancelled':
    case 'canceled':
    case 'revoked':
    case 'expired':
      return tr(t, 'ajans.durumIptal');
    case 'rejected':
      return tr(t, 'ajans.durumReddedildi');
    default:
      return status || '—';
  }
}

export function AjansTurEtiket(kind: string, t: T): string {
  switch ((kind ?? '').toLowerCase()) {
    case 'live':
    case 'stream':
    case 'broadcast':
      return tr(t, 'ajans.turCanli');
    case 'voice':
    case 'room':
    case 'ses':
      return tr(t, 'ajans.turSes');
    case 'event':
      return tr(t, 'ajans.turEtkinlik');
    case 'auto':
      return tr(t, 'ajans.turOtomatik');
    case 'manual':
      return tr(t, 'ajans.turManuel');
    default:
      return kind || '—';
  }
}
