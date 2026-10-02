/** Dinamik ünvan (title badge) — sunum katmanı; RBAC/yetki DEĞİLDİR. */

export const UNVAN_SHAPES = [
  'PILL',
  'SOFT_PILL',
  'ROUNDED_RECT',
  'COMPACT',
  'CAPSULE',
  'CUT_CORNER',
  'DIAMOND_EDGE',
  'HEX',
  'MINIMAL',
  'OUTLINE',
] as const;
export type UnvanShape = (typeof UNVAN_SHAPES)[number];

export const UNVAN_BG_TYPES = [
  'SOLID',
  'LINEAR_GRADIENT',
  'SUBTLE_GRADIENT',
  'TRANSPARENT',
  'GLASS',
] as const;
export type UnvanBgType = (typeof UNVAN_BG_TYPES)[number];

export const UNVAN_GRADIENT_DIRS = [
  'LEFT_RIGHT',
  'RIGHT_LEFT',
  'TOP_BOTTOM',
  'DIAGONAL',
] as const;
export type UnvanGradientDir = (typeof UNVAN_GRADIENT_DIRS)[number];

export const UNVAN_ANIMATIONS = [
  'NONE',
  'SHIMMER',
  'SOFT_GLOW',
  'GRADIENT_SHIFT',
  'SPARKLE',
] as const;
export type UnvanAnimation = (typeof UNVAN_ANIMATIONS)[number];

export const UNVAN_SIZES = ['COMPACT', 'NORMAL', 'PROMINENT'] as const;
export type UnvanSize = (typeof UNVAN_SIZES)[number];

export const UNVAN_ICON_TYPES = ['library', 'emoji', 'custom', 'none'] as const;
export type UnvanIconType = (typeof UNVAN_ICON_TYPES)[number];

export const UNVAN_ICON_POSITIONS = ['LEFT', 'RIGHT'] as const;
export type UnvanIconPosition = (typeof UNVAN_ICON_POSITIONS)[number];

export const UNVAN_FONT_WEIGHTS = ['medium', 'semibold', 'bold'] as const;
export type UnvanFontWeight = (typeof UNVAN_FONT_WEIGHTS)[number];

export const UNVAN_GLOW = ['off', 'soft', 'medium', 'strong'] as const;
export type UnvanGlow = (typeof UNVAN_GLOW)[number];

export type UnvanDesign = {
  shape: UnvanShape;
  backgroundType: UnvanBgType;
  backgroundColor: string;
  backgroundColor2?: string | null;
  backgroundColor3?: string | null;
  gradientDirection: UnvanGradientDir;
  textColor: string;
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  borderOpacity: number;
  cornerRadius?: number | null;
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: UnvanGlow;
  animationType: UnvanAnimation;
  fontWeight: UnvanFontWeight;
  iconType: UnvanIconType;
  iconValue: string;
  iconPosition: UnvanIconPosition;
  size: UnvanSize;
  paddingH: number;
  paddingV: number;
};

/** Client'a verilen normalize sunum modeli — ham DB satırı değil */
export type TitlePresentationModel = {
  id: string;
  slug: string;
  label: string;
  design: UnvanDesign;
  version: number;
  priority: number;
};

export type UnvanKatalogKaydi = {
  id: string;
  slug: string;
  name: string;
  name_i18n: Record<string, string>;
  design: UnvanDesign | Record<string, unknown>;
  version: number;
  priority: number;
  updated_at?: string;
};

export type UnvanKayit = UnvanKatalogKaydi & {
  description?: string | null;
  is_active: boolean;
  archived_at?: string | null;
  selection_locked: boolean;
  created_at?: string;
  updated_at?: string;
  active_user_count?: number;
  total_assignment_count?: number;
  metadata?: Record<string, unknown>;
};

export type UnvanAtama = {
  assignment_id: string;
  title_id: string;
  assigned_at: string;
  starts_at: string;
  expires_at: string | null;
  selection_locked: boolean;
  assignment_source: string;
  name: string;
  slug: string;
  name_i18n?: Record<string, string>;
  design: UnvanDesign | Record<string, unknown>;
  priority: number;
  version: number;
  currently_valid: boolean;
  expired?: boolean;
};

export type UnvanAdminKaydetGirdi = {
  id?: string | null;
  slug?: string | null;
  name: string;
  description?: string | null;
  name_i18n?: Record<string, string> | null;
  design: UnvanDesign | Record<string, unknown>;
  is_active?: boolean;
  selection_locked?: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
};

export type UnvanAtaGirdi = {
  userId: string;
  titleId: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  setSelected?: boolean;
  selectionLocked?: boolean;
  reason?: string | null;
  notifyUser?: boolean;
  assignmentSource?: string;
};
