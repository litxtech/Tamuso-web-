import { RenkTokenlari } from '../../../tasarim-sistemi/RenkTokenlari';

export function AdminDurumEtiket(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Aktif';
    case 'SUSPENDED':
      return 'Askıda';
    case 'DISABLED':
      return 'Pasif';
    default:
      return status;
  }
}

export function AdminDurumRenk(status: string): string {
  if (status === 'ACTIVE') return RenkTokenlari.mint;
  if (status === 'SUSPENDED') return RenkTokenlari.warning;
  return RenkTokenlari.danger;
}

export function AdminDurumAciklama(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Panele giriş yapabilir';
    case 'SUSPENDED':
      return 'Hesap durdu, giriş kapalı';
    case 'DISABLED':
      return 'Kalıcı olarak kapatıldı';
    default:
      return '';
  }
}

const KATEGORI_TR: Record<string, string> = {
  ADMIN_MANAGEMENT: 'Admin yönetimi',
  DASHBOARD: 'Özet',
  APP_SETTINGS: 'Uygulama ayarları',
  USERS: 'Kullanıcılar',
  DIRECTORY: 'Rehber',
  FINANCE: 'Finans',
  PAYOUTS: 'Çekim / ödeme',
  COINS: 'Coin',
  WALLET: 'Cüzdan',
  IAP: 'Satın alma',
  AGENCIES: 'Ajanslar',
  VERIFICATION: 'Doğrulama / KYC',
  MODERATION: 'Moderasyon',
  LIVE: 'Canlı / odalar',
  SECURITY: 'Güvenlik',
  SUPPORT: 'Destek',
  STORIES: 'Hikâyeler',
  CONTENT: 'İçerik',
  GAMES: 'Oyunlar',
  CREATOR_STUDIO: 'Creator Studio',
  ECONOMY: 'Ekonomi',
  FEATURE_FLAGS: 'Özellik bayrakları',
  NOTIFICATIONS: 'Bildirimler',
  ANALYTICS: 'Analitik',
  SYSTEM_SETTINGS: 'Sistem',
  LEGACY: 'Diğer',
  OTHER: 'Diğer',
};

export function AdminKategoriEtiket(cat: string): string {
  return KATEGORI_TR[cat] ?? cat.replace(/_/g, ' ');
}

export function AdminRiskEtiket(risk: string): string {
  switch (risk) {
    case 'LOW':
      return 'Düşük';
    case 'MEDIUM':
      return 'Orta';
    case 'HIGH':
      return 'Yüksek';
    case 'CRITICAL':
      return 'Kritik';
    default:
      return risk;
  }
}

export function AdminRiskRenk(risk: string): string {
  switch (risk) {
    case 'LOW':
      return RenkTokenlari.mint;
    case 'MEDIUM':
      return RenkTokenlari.warning;
    case 'HIGH':
      return RenkTokenlari.accent;
    case 'CRITICAL':
      return RenkTokenlari.danger;
    default:
      return RenkTokenlari.textDim;
  }
}

export function AdminGoreliZaman(iso?: string | null): string {
  if (!iso) return 'Hiç giriş yok';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const sn = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sn < 60) return 'Az önce';
  if (sn < 3600) return `${Math.floor(sn / 60)} dk önce`;
  if (sn < 86400) return `${Math.floor(sn / 3600)} sa önce`;
  if (sn < 86400 * 7) return `${Math.floor(sn / 86400)} gün önce`;
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function AdminBasHarf(ad: string): string {
  return (ad.trim() || '?').charAt(0).toLocaleUpperCase('tr-TR');
}
