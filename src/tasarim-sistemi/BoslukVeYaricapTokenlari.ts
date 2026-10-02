import { temaKodunuAl, temaAcikMi } from './tema/TemaDurumu';

export const BoslukTokenlari = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Normal ekranların yatay gutter'ı.
 * Header, tab rayı ve sayfa içeriği bunu paylaşır.
 * Safe area yatay inset ayrıca Screen / safe-area tarafından uygulanır;
 * bu değer onun yerine geçmez.
 */
export const screenPaddingHorizontal = BoslukTokenlari.lg;

/**
 * Normal stack sayfa başlığı — tek kaynak.
 * Üst safe area Screen edges=['top'] ile bir kez uygulanır; burada inset yok.
 * Negatif margin / letterSpacing yok: başlık x < 0 bölgesine taşmasın.
 */
export const HeaderTokenlari = {
  horizontal: screenPaddingHorizontal,
  paddingTop: BoslukTokenlari.xs,
  paddingBottom: BoslukTokenlari.md,
  minHeight: 44,
  touchTarget: 44,
  iconSize: 24,
  backHitSlop: 8,
  /**
   * 0 kalmalı. Eski -4 "optik nudge" geri kontrolünü gutter dışına çekip
   * başlık kolonunun layout origin'ini ekranın soluna kaydırıyordu.
   */
  backOpticalNudge: 0,
  titleGapAfterBack: BoslukTokenlari.sm,
  titleSubtitleGap: 2,
  titleSize: 20,
  titleLineHeight: 26,
  subtitleSize: 13,
  subtitleLineHeight: 18,
  endBalance: 0,
  contentGap: BoslukTokenlari.sm,
  compactTitleSize: 17,
  compactTitleLineHeight: 22,
} as const;

export const YaricapTokenlari = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

const GolgeKoyu = {
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

const GolgeAcik = {
  soft: {
    shadowColor: '#1C1228',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  card: {
    shadowColor: '#1C1228',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

type GolgeSet = typeof GolgeKoyu;

/** Aktif gorunume gore kart golgesi — acik temada kartlar zeminden ayrilir. */
export const GolgeTokenlari: GolgeSet = new Proxy(GolgeKoyu, {
  get(_hedef, prop: string | symbol) {
    const set = temaAcikMi(temaKodunuAl()) ? GolgeAcik : GolgeKoyu;
    return set[prop as keyof GolgeSet];
  },
}) as GolgeSet;

export const AnimasyonTokenlari = {
  hizli: 160,
  normal: 240,
  yavas: 360,
  giftComboTimeoutMsVarsayilan: 3000,
} as const;
