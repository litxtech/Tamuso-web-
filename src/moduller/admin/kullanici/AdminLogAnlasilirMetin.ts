import {
  KillSwitchMetni,
  OzellikBayragiMetni,
} from '../ozellikler/AdminOzellikEtiketleri';

function sayi(summary: string): string | null {
  return summary.match(/[+-]?\d[\d.,]*/)?.[0] ?? null;
}

function kuyruk(summary: string): string {
  const i = summary.lastIndexOf(':');
  return i >= 0 ? summary.slice(i + 1).trim() : '';
}

function acikMi(summary: string): boolean | null {
  if (/(^|[^a-z])true([^a-z]|$)/i.test(summary)) return true;
  if (/(^|[^a-z])false([^a-z]|$)/i.test(summary)) return false;
  return null;
}

/** Yönetim logunu kısa Türkçe cümleye çevirir. Zaten çevrilmiş metni olduğu gibi bırakır. */
export function AdminLogAnlasilirMetin(action: string, summary: string): string {
  const a = (action ?? '').toLowerCase();
  const s = (summary ?? '').trim();
  const n = sayi(s);
  const tail = kuyruk(s);
  const on = acikMi(s);

  switch (a) {
    case 'wallet_topup':
      return n ? `Cüzdana ${n} coin yüklendi` : s || 'Cüzdana coin yüklendi';
    case 'agency_coin_topup':
      return n ? `Ajans cüzdanına ${n} coin eklendi` : s || 'Ajans cüzdanına coin eklendi';
    case 'agency_distributor':
      if (on === null) return s;
      return on ? 'Ajans dağıtıcı yetkisi açıldı' : 'Ajans dağıtıcı yetkisi kapatıldı';
    case 'agency_approve':
      return 'Ajans başvurusu onaylandı';
    case 'agency_close':
      return 'Ajans kapatıldı';
    case 'agency_limits':
      return 'Ajans limitleri güncellendi';
    case 'agency_commission':
      if (s.startsWith('Ajans komisyon')) return s;
      return tail
        ? `Ajans komisyon oranları güncellendi (${tail})`
        : 'Ajans komisyon oranları güncellendi';
    case 'agency_earnings_penalty':
      return 'Ajans kazancına ceza uygulandı';
    case 'admin_grant':
      return 'Yönetici yetkisi verildi';
    case 'warning':
      return tail ? `İhtar verildi: ${tail}` : 'İhtar verildi';
    case 'warning_clear':
      return 'İhtar kaldırıldı';
    case 'delete':
      return 'Hesap yönetici tarafından silindi';
    case 'unban':
      return 'Ban kaldırıldı';
    case 'kyc_delete':
      return 'Kimlik onayı silindi';
    case 'room_moderation':
      return tail
        ? `Ses odası kapatıldı ve yaptırım uygulandı: ${tail}`
        : 'Ses odası kapatıldı ve yaptırım uygulandı';
    case 'report_reviewing':
    case 'report_reviewed':
      return 'Rapor incelemeye alındı';
    case 'purchase_dispute_rejected':
      return 'Satın alma itirazı reddedildi';
    case 'purchase_dispute_approved':
      return 'Satın alma itirazı kabul edildi';
    case 'sample_users_seed':
      return n ? `${n} örnek kullanıcı eklendi` : s;
    case 'sample_users_purge':
      return n ? `${n} örnek kullanıcı silindi` : s;
    case 'ai_music_adjust':
      return n ? `AI müzik süresi ${n} saniye olarak ayarlandı` : s;
    case 'city_election_start':
      return s ? `Şehir lider seçimi başlatıldı: ${s.replace(/^şehir lider seçimi başlatıldı:\s*/i, '')}` : 'Şehir lider seçimi başlatıldı';
    case 'feature_flag': {
      const key = s.match(/\b([a-z][a-z0-9_]*_enabled)\b/i)?.[1];
      if (!key || on === null) return s;
      const ad = OzellikBayragiMetni(key).baslik;
      return on ? `Özellik açıldı: ${ad}` : `Özellik kapatıldı: ${ad}`;
    }
    case 'kill_switch': {
      const key = s.match(/\b(kill_[a-z0-9_]+)\b/i)?.[1];
      if (!key || on === null) return s;
      const ad = KillSwitchMetni(key).baslik;
      return on ? `Acil durdurma açıldı: ${ad}` : `Acil durdurma kapatıldı: ${ad}`;
    }
    default:
      return s
        .replace(/\breviewing\b/gi, 'inceleniyor')
        .replace(/\brejected\b/gi, 'reddedildi')
        .replace(/\bapproved\b/gi, 'onaylandı')
        .replace(/\bpending\b/gi, 'bekliyor')
        .replace(/yukleme/g, 'yükleme')
        .replace(/kaldirildi/g, 'kaldırıldı')
        .replace(/kapatildi/g, 'kapatıldı')
        .replace(/onaylandi/g, 'onaylandı')
        .replace(/guncellendi/g, 'güncellendi')
        .replace(/tarafindan/g, 'tarafından')
        .replace(/basvurusu/g, 'başvurusu')
        .replace(/odasi/g, 'odası');
  }
}
