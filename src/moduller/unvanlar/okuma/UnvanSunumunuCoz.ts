import { UnvanTasariminiDogrula } from '../dogrulama/UnvanTasarimZod';
import { UnvanKatalogCache } from '../onbellek/UnvanKatalogCache';
import type { TitlePresentationModel, UnvanKatalogKaydi } from '../tipler';

function lokalizeAd(kayit: UnvanKatalogKaydi, locale?: string | null): string {
  const loc = (locale ?? '').trim().toLowerCase();
  if (loc) {
    const exact = kayit.name_i18n?.[loc];
    if (exact?.trim()) return exact.trim();
    const short = loc.split(/[-_]/)[0];
    const shortHit = kayit.name_i18n?.[short];
    if (shortHit?.trim()) return shortHit.trim();
  }
  return kayit.name?.trim() || kayit.slug || 'Ünvan';
}

/** Katalog kaydından sunum modeli */
export function UnvanSunumunuKayittanCoz(
  kayit: UnvanKatalogKaydi,
  locale?: string | null,
): TitlePresentationModel {
  return {
    id: kayit.id,
    slug: kayit.slug,
    label: lokalizeAd(kayit, locale),
    design: UnvanTasariminiDogrula(kayit.design),
    version: kayit.version,
    priority: kayit.priority,
  };
}

/** @deprecated alias — UnvanSunumunuKayittanCoz */
export const UnvanKayittanSunum = UnvanSunumunuKayittanCoz;

/**
 * Title id → TitlePresentationModel.
 * Cache miss'te null (çağıran catalog yüklemeli).
 */
export function UnvanSunumunuCoz(
  titleId: string | null | undefined,
  locale?: string | null,
): TitlePresentationModel | null {
  if (!titleId) return null;
  const kayit = UnvanKatalogCache.al(titleId);
  if (!kayit) return null;
  return UnvanSunumunuKayittanCoz(kayit, locale);
}

/** Ham design + ad ile (admin önizleme) */
export function UnvanSunumunuHamdanCoz(args: {
  id?: string;
  slug?: string;
  name: string;
  name_i18n?: Record<string, string>;
  design: unknown;
  version?: number;
  priority?: number;
  locale?: string | null;
}): TitlePresentationModel {
  const kayit: UnvanKatalogKaydi = {
    id: args.id ?? 'preview',
    slug: args.slug ?? 'preview',
    name: args.name,
    name_i18n: args.name_i18n ?? {},
    design: UnvanTasariminiDogrula(args.design),
    version: args.version ?? 0,
    priority: args.priority ?? 0,
  };
  return UnvanSunumunuKayittanCoz(kayit, args.locale);
}
