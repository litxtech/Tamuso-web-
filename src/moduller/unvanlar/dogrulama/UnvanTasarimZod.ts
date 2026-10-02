import { z } from 'zod';
import type { UnvanDesign } from '../tipler';
import {
  UNVAN_ANIMATIONS,
  UNVAN_BG_TYPES,
  UNVAN_FONT_WEIGHTS,
  UNVAN_GLOW,
  UNVAN_GRADIENT_DIRS,
  UNVAN_ICON_POSITIONS,
  UNVAN_ICON_TYPES,
  UNVAN_SHAPES,
  UNVAN_SIZES,
} from '../tipler';

const hexOrRgba = z
  .string()
  .regex(
    /^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{8}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\))$/,
  )
  .optional()
  .nullable();

export const UnvanTasarimZod = z.object({
  shape: z.enum(UNVAN_SHAPES).default('SOFT_PILL'),
  backgroundType: z.enum(UNVAN_BG_TYPES).default('SOLID'),
  backgroundColor: z.string().default('#7C3AED'),
  backgroundColor2: hexOrRgba,
  backgroundColor3: hexOrRgba,
  gradientDirection: z.enum(UNVAN_GRADIENT_DIRS).default('LEFT_RIGHT'),
  textColor: z.string().default('#FFFFFF'),
  borderEnabled: z.boolean().default(false),
  borderColor: z.string().default('#FFFFFF'),
  borderWidth: z.number().min(0).max(3).default(1),
  borderOpacity: z.number().min(0).max(1).default(1),
  cornerRadius: z.number().min(0).max(24).nullable().optional(),
  glowEnabled: z.boolean().default(false),
  glowColor: z.string().default('#A78BFA'),
  glowIntensity: z.enum(UNVAN_GLOW).default('off'),
  animationType: z.enum(UNVAN_ANIMATIONS).default('NONE'),
  fontWeight: z.enum(UNVAN_FONT_WEIGHTS).default('semibold'),
  iconType: z.enum(UNVAN_ICON_TYPES).default('library'),
  iconValue: z.string().max(256).default(''),
  iconPosition: z.enum(UNVAN_ICON_POSITIONS).default('LEFT'),
  size: z.enum(UNVAN_SIZES).default('NORMAL'),
  paddingH: z.number().min(4).max(16).default(8),
  paddingV: z.number().min(1).max(8).default(3),
});

export const UNVAN_TASARIM_VARSAYILAN: UnvanDesign = {
  shape: 'SOFT_PILL',
  backgroundType: 'SOLID',
  backgroundColor: '#7C3AED',
  backgroundColor2: null,
  backgroundColor3: null,
  gradientDirection: 'LEFT_RIGHT',
  textColor: '#FFFFFF',
  borderEnabled: false,
  borderColor: '#FFFFFF',
  borderWidth: 1,
  borderOpacity: 1,
  cornerRadius: null,
  glowEnabled: false,
  glowColor: '#A78BFA',
  glowIntensity: 'off',
  animationType: 'NONE',
  fontWeight: 'semibold',
  iconType: 'library',
  iconValue: 'star',
  iconPosition: 'LEFT',
  size: 'NORMAL',
  paddingH: 8,
  paddingV: 3,
};

/** Bozuk server config UI'ı çökertmesin */
export function UnvanTasariminiDogrula(
  raw: unknown,
): UnvanDesign {
  try {
    const parsed = UnvanTasarimZod.safeParse(raw ?? {});
    if (!parsed.success) return { ...UNVAN_TASARIM_VARSAYILAN };
    const d = parsed.data;
    return {
      shape: d.shape,
      backgroundType: d.backgroundType,
      backgroundColor: d.backgroundColor || UNVAN_TASARIM_VARSAYILAN.backgroundColor,
      backgroundColor2: d.backgroundColor2 ?? null,
      backgroundColor3: d.backgroundColor3 ?? null,
      gradientDirection: d.gradientDirection,
      textColor: d.textColor || '#FFFFFF',
      borderEnabled: d.borderEnabled,
      borderColor: d.borderColor,
      borderWidth: d.borderWidth,
      borderOpacity: d.borderOpacity,
      cornerRadius: d.cornerRadius ?? null,
      glowEnabled: d.glowEnabled && d.glowIntensity !== 'off',
      glowColor: d.glowColor,
      glowIntensity: d.glowIntensity,
      animationType: d.animationType,
      fontWeight: d.fontWeight,
      iconType: d.iconType,
      iconValue: d.iconValue ?? '',
      iconPosition: d.iconPosition,
      size: d.size,
      paddingH: d.paddingH,
      paddingV: d.paddingV,
    };
  } catch {
    return { ...UNVAN_TASARIM_VARSAYILAN };
  }
}
