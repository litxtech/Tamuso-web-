/** Hikaye UI / medya sabitleri — süre ve gizlilik sunucuda doğrulanır */

export const HIKAYE_BUCKET = 'story-media';

/** Tepsi satırı hedef yüksekliği (avatar + etiket) */
export const HIKAYE_TEPSI_YUKSEKLIK = 96;
export const HIKAYE_TEPSI_AVATAR = 64;
export const HIKAYE_TEPSI_HALKA = 72;

export const HIKAYE_GOSEL_SURE_MS = 5_000;
export const HIKAYE_METIN_SURE_MS = 5_000;
/** Metin/görsel + müzik hikayesi — Instagram gibi 15 sn */
export const HIKAYE_MUZIK_KLIP_MS = 15_000;
/**
 * @deprecated Süre sınırı kalktı — 1080p sıkıştırma ile limitsiz.
 * Kamera pratik tavanı için VideoPaylasimSabitleri.VIDEO_KAMERA_MAX_SN kullan.
 */
export { VIDEO_KAMERA_MAX_SN as HIKAYE_VIDEO_MAX_SN } from '../../ortak/medya/VideoPaylasimSabitleri';
/** Sıkıştırma sonrası güvenlik tavanı */
export { VIDEO_SIKISTIRMA_SONRASI_MAX_BYTES as HIKAYE_VIDEO_MAX_BYTES } from '../../ortak/medya/VideoPaylasimSabitleri';
export const HIKAYE_CAPTION_MAX = 220;

/** Görülmemiş halka — Tamuso pink/purple premium */
export const HIKAYE_GRADIENT_GORULMEDI = [
  '#E84091',
  '#C43BFF',
  '#8B5CF6',
  '#E84091',
] as const;

export const HIKAYE_GRADIENT_GORULDU = [
  '#5A5A5A',
  '#7A7A7A',
  '#5A5A5A',
] as const;

/** Sunucu `story_reactions.emoji` CHECK ile birebir */
export const HIKAYE_TEPKI_ANAHTARLARI = [
  'heart',
  'fire',
  'laugh',
  'clap',
  'heart_eyes',
] as const;

export type HikayeTepkiAnahtari = (typeof HIKAYE_TEPKI_ANAHTARLARI)[number];

export const HIKAYE_TEPKI_GORUNUM: Record<HikayeTepkiAnahtari, string> = {
  heart: '❤️',
  fire: '🔥',
  laugh: '😂',
  clap: '👏',
  heart_eyes: '😍',
};

/** @deprecated — UI için HIKAYE_TEPKI_ANAHTARLARI kullan */
export const HIKAYE_TEPKI_EMOJILER = [
  '❤️',
  '🔥',
  '😂',
  '👏',
  '😍',
] as const;

export const HIKAYE_METIN_ARKAPLANLAR = [
  '#1A0B14',
  '#0D1B2A',
  '#1B4332',
  '#3D0C11',
  '#2B1B4D',
  '#1C1917',
] as const;

/** Görsel efektler — null = efektsiz paylaşım */
export type HikayeEfektId =
  | 'none'
  | 'warm'
  | 'cool'
  | 'noir'
  | 'pink'
  | 'vivid'
  | 'fade';

export const HIKAYE_EFEKTLER: {
  id: HikayeEfektId;
  labelKey: string;
  /** Overlay rengi; none → şeffaf */
  tint: string | null;
}[] = [
  { id: 'none', labelKey: 'hikaye.efektYok', tint: null },
  { id: 'warm', labelKey: 'hikaye.efektSicak', tint: 'rgba(255,140,60,0.28)' },
  { id: 'cool', labelKey: 'hikaye.efektSoguk', tint: 'rgba(60,120,255,0.28)' },
  { id: 'noir', labelKey: 'hikaye.efektNoir', tint: 'rgba(0,0,0,0.45)' },
  { id: 'pink', labelKey: 'hikaye.efektPembe', tint: 'rgba(232,64,145,0.32)' },
  { id: 'vivid', labelKey: 'hikaye.efektCanli', tint: 'rgba(196,59,255,0.25)' },
  { id: 'fade', labelKey: 'hikaye.efektSoluk', tint: 'rgba(255,255,255,0.22)' },
];

export const HIKAYE_METIN_RENKLER = [
  '#FFFFFF',
  '#000000',
  '#E84091',
  '#C43BFF',
  '#F0B429',
  '#3DCFB0',
  '#FF6B6B',
  '#4ECDC4',
] as const;

export const HIKAYE_OZELLIK_BAYRAGI = 'stories_enabled' as const;
